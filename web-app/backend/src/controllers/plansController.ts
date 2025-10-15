import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { HealthcareAPIError, asyncHandler } from '../middleware/errorHandler';
import { auditLogger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    role: string;
  };
}

interface InsurancePlan {
  id: string;
  planCode: string;
  planName: string;
  planType: string;
  deductible: number;
  coinsurancePercentage: number;
  outOfPocketMax: number;
  copayPrimaryCare: number;
  copaySpecialist: number;
  copayEmergency: number;
  effectiveDate: Date;
  terminationDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Get all insurance plans with filtering and pagination
export const getPlans = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'planName',
    sortOrder = 'asc',
    planCode,
    planName,
    planType,
    isActive = 'true',
  } = req.query as any;

  const offset = (page - 1) * limit;
  const orderBy = `${sortBy} ${sortOrder.toUpperCase()}`;

  // Build dynamic WHERE clause
  const conditions: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (planCode) {
    conditions.push(`hp.plan_code ILIKE $${++paramCount}`);
    params.push(`%${planCode}%`);
  }

  if (planName) {
    conditions.push(`hp.plan_name ILIKE $${++paramCount}`);
    params.push(`%${planName}%`);
  }

  if (planType) {
    conditions.push(`pt.plan_type_code = $${++paramCount}`);
    params.push(planType);
  }

  if (isActive !== 'all') {
    conditions.push(`hp.is_active = $${++paramCount}`);
    params.push(isActive === 'true');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count for pagination
  const countQuery = `
    SELECT COUNT(*) as total
    FROM health_plans hp
    LEFT JOIN plan_types pt ON hp.plan_type_id = pt.plan_type_id
    ${whereClause}
  `;

  const countResult = await query(countQuery, params);
  const total = parseInt(countResult.rows[0].total);

  // Get plans with type information
  const plansQuery = `
    SELECT 
      hp.health_plan_id as id,
      hp.plan_code,
      hp.plan_name,
      hp.tax_id,
      hp.npi,
      hp.address_line1,
      hp.address_line2,
      hp.city,
      hp.state_code,
      hp.zip_code,
      hp.phone,
      hp.email,
      hp.website,
      hp.is_active,
      hp.effective_date,
      hp.termination_date,
      hp.created_at,
      hp.updated_at,
      pt.plan_type_code as plan_type,
      pt.plan_type_name,
      COUNT(me.enrollment_id) as active_enrollments
    FROM health_plans hp
    LEFT JOIN plan_types pt ON hp.plan_type_id = pt.plan_type_id
    LEFT JOIN member_enrollments me ON hp.health_plan_id = me.health_plan_id AND me.termination_date IS NULL
    ${whereClause}
    GROUP BY hp.health_plan_id, pt.plan_type_code, pt.plan_type_name
    ORDER BY hp.${orderBy}
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `;

  params.push(limit, offset);
  const result = await query(plansQuery, params);

  // Transform the data
  const plans = result.rows.map((row: any) => ({
    id: row.id,
    planCode: row.plan_code,
    planName: row.plan_name,
    planType: row.plan_type,
    planTypeName: row.plan_type_name,
    taxId: row.tax_id,
    npi: row.npi,
    address: {
      street1: row.address_line1,
      street2: row.address_line2,
      city: row.city,
      state: row.state_code,
      zipCode: row.zip_code,
    },
    phone: row.phone,
    email: row.email,
    website: row.website,
    isActive: row.is_active,
    effectiveDate: row.effective_date,
    terminationDate: row.termination_date,
    activeEnrollments: parseInt(row.active_enrollments),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  // Log plans access
  auditLogger.info('Insurance plans search performed', {
    userId: req.user?.userId,
    searchParams: { planCode, planName, planType },
    resultCount: plans.length,
    action: 'PLANS_SEARCH',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: {
      plans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// Get a single insurance plan by ID
export const getPlan = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const planQuery = `
    SELECT 
      hp.*,
      pt.plan_type_code as plan_type,
      pt.plan_type_name,
      pt.description as plan_type_description,
      COUNT(DISTINCT me.enrollment_id) as total_enrollments,
      COUNT(DISTINCT CASE WHEN me.termination_date IS NULL THEN me.enrollment_id END) as active_enrollments
    FROM health_plans hp
    LEFT JOIN plan_types pt ON hp.plan_type_id = pt.plan_type_id
    LEFT JOIN member_enrollments me ON hp.health_plan_id = me.health_plan_id
    WHERE hp.health_plan_id = $1
    GROUP BY hp.health_plan_id, pt.plan_type_code, pt.plan_type_name, pt.description
  `;

  const result = await query(planQuery, [id]);

  if (result.rows.length === 0) {
    throw new HealthcareAPIError('Insurance plan not found', 404);
  }

  const row = result.rows[0];
  const plan = {
    id: row.health_plan_id,
    planCode: row.plan_code,
    planName: row.plan_name,
    planType: row.plan_type,
    planTypeName: row.plan_type_name,
    planTypeDescription: row.plan_type_description,
    taxId: row.tax_id,
    npi: row.npi,
    address: {
      street1: row.address_line1,
      street2: row.address_line2,
      city: row.city,
      state: row.state_code,
      zipCode: row.zip_code,
    },
    phone: row.phone,
    email: row.email,
    website: row.website,
    isActive: row.is_active,
    effectiveDate: row.effective_date,
    terminationDate: row.termination_date,
    totalEnrollments: parseInt(row.total_enrollments),
    activeEnrollments: parseInt(row.active_enrollments),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  // Log plan access
  auditLogger.info('Insurance plan accessed', {
    userId: req.user?.userId,
    planId: id,
    planCode: plan.planCode,
    action: 'PLAN_VIEW',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: { plan },
  });
});

// Create a new insurance plan
export const createPlan = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const planData = req.body;

  // Check if plan code already exists
  const existingPlan = await query(
    'SELECT health_plan_id FROM health_plans WHERE plan_code = $1',
    [planData.planCode]
  );

  if (existingPlan.rows.length > 0) {
    throw new HealthcareAPIError('Plan code already exists', 409);
  }

  // Validate plan type exists
  const planTypeExists = await query(
    'SELECT plan_type_id FROM plan_types WHERE plan_type_id = $1',
    [planData.planTypeId]
  );

  if (planTypeExists.rows.length === 0) {
    throw new HealthcareAPIError('Invalid plan type ID', 400);
  }

  // Insert new plan
  const insertQuery = `
    INSERT INTO health_plans (
      plan_code, plan_name, plan_type_id, tax_id, npi,
      address_line1, address_line2, city, state_code, zip_code,
      phone, email, website, effective_date, termination_date, is_active
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
    ) RETURNING *
  `;

  const result = await query(insertQuery, [
    planData.planCode,
    planData.planName,
    planData.planTypeId,
    planData.taxId,
    planData.npi,
    planData.address?.street1,
    planData.address?.street2 || null,
    planData.address?.city,
    planData.address?.state,
    planData.address?.zipCode,
    planData.phone,
    planData.email,
    planData.website,
    planData.effectiveDate,
    planData.terminationDate || null,
    planData.isActive !== false,
  ]);

  const newPlan = result.rows[0];

  // Log plan creation
  auditLogger.info('Insurance plan created', {
    userId: req.user?.userId,
    planId: newPlan.health_plan_id,
    planCode: newPlan.plan_code,
    action: 'PLAN_CREATE',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(201).json({
    success: true,
    data: { plan: newPlan },
    message: 'Insurance plan created successfully',
  });
});

// Update an insurance plan
export const updatePlan = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  // Check if plan exists
  const existingPlan = await query('SELECT * FROM health_plans WHERE health_plan_id = $1', [id]);
  
  if (existingPlan.rows.length === 0) {
    throw new HealthcareAPIError('Insurance plan not found', 404);
  }

  // Build dynamic update query
  const updateFields: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (updateData.planName) {
    updateFields.push(`plan_name = $${++paramCount}`);
    params.push(updateData.planName);
  }

  if (updateData.taxId !== undefined) {
    updateFields.push(`tax_id = $${++paramCount}`);
    params.push(updateData.taxId);
  }

  if (updateData.npi !== undefined) {
    updateFields.push(`npi = $${++paramCount}`);
    params.push(updateData.npi);
  }

  if (updateData.address) {
    if (updateData.address.street1 !== undefined) {
      updateFields.push(`address_line1 = $${++paramCount}`);
      params.push(updateData.address.street1);
    }

    if (updateData.address.street2 !== undefined) {
      updateFields.push(`address_line2 = $${++paramCount}`);
      params.push(updateData.address.street2);
    }

    if (updateData.address.city) {
      updateFields.push(`city = $${++paramCount}`);
      params.push(updateData.address.city);
    }

    if (updateData.address.state) {
      updateFields.push(`state_code = $${++paramCount}`);
      params.push(updateData.address.state);
    }

    if (updateData.address.zipCode) {
      updateFields.push(`zip_code = $${++paramCount}`);
      params.push(updateData.address.zipCode);
    }
  }

  if (updateData.phone !== undefined) {
    updateFields.push(`phone = $${++paramCount}`);
    params.push(updateData.phone);
  }

  if (updateData.email !== undefined) {
    updateFields.push(`email = $${++paramCount}`);
    params.push(updateData.email);
  }

  if (updateData.website !== undefined) {
    updateFields.push(`website = $${++paramCount}`);
    params.push(updateData.website);
  }

  if (updateData.terminationDate !== undefined) {
    updateFields.push(`termination_date = $${++paramCount}`);
    params.push(updateData.terminationDate);
  }

  if (updateData.isActive !== undefined) {
    updateFields.push(`is_active = $${++paramCount}`);
    params.push(updateData.isActive);
  }

  if (updateFields.length === 0) {
    throw new HealthcareAPIError('No valid update fields provided', 400);
  }

  // Add updated_at field
  updateFields.push(`updated_at = NOW()`);
  params.push(id);

  const updateQuery = `
    UPDATE health_plans 
    SET ${updateFields.join(', ')}
    WHERE health_plan_id = $${++paramCount}
    RETURNING *
  `;

  const result = await query(updateQuery, params);
  const updatedPlan = result.rows[0];

  // Log plan update
  auditLogger.info('Insurance plan updated', {
    userId: req.user?.userId,
    planId: id,
    planCode: updatedPlan.plan_code,
    updatedFields: Object.keys(updateData),
    action: 'PLAN_UPDATE',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: { plan: updatedPlan },
    message: 'Insurance plan updated successfully',
  });
});

// Get plan members
export const getPlanMembers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { page = 1, limit = 20, status = 'ACTIVE' } = req.query as any;

  // Check if plan exists
  const planExists = await query('SELECT plan_code FROM health_plans WHERE health_plan_id = $1', [id]);
  
  if (planExists.rows.length === 0) {
    throw new HealthcareAPIError('Insurance plan not found', 404);
  }

  const offset = (page - 1) * limit;

  // Build WHERE clause for member status
  let statusCondition = '';
  const params = [id];
  let paramCount = 1;

  if (status !== 'ALL') {
    statusCondition = `AND me.termination_date ${status === 'ACTIVE' ? 'IS NULL' : 'IS NOT NULL'}`;
  }

  // Get plan members
  const membersQuery = `
    SELECT 
      m.member_id,
      m.member_number,
      m.first_name,
      m.last_name,
      m.date_of_birth,
      m.gender,
      me.relationship_code,
      me.effective_date,
      me.termination_date,
      me.group_number
    FROM member_enrollments me
    JOIN members m ON me.member_id = m.member_id
    WHERE me.health_plan_id = $1
    ${statusCondition}
    ORDER BY m.last_name, m.first_name
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `;

  params.push(limit, offset);
  const result = await query(membersQuery, params);

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM member_enrollments me
    WHERE me.health_plan_id = $1
    ${statusCondition}
  `;

  const countResult = await query(countQuery, [id]);
  const total = parseInt(countResult.rows[0].total);

  // Log plan members access
  auditLogger.info('Plan members accessed', {
    userId: req.user?.userId,
    planId: id,
    planCode: planExists.rows[0].plan_code,
    action: 'PLAN_MEMBERS_VIEW',
    phiAccessed: true,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: {
      members: result.rows.map(row => ({
        ...row,
        dateOfBirth: row.date_of_birth,
        relationshipCode: row.relationship_code,
        effectiveDate: row.effective_date,
        terminationDate: row.termination_date,
        groupNumber: row.group_number,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// Get plan statistics
export const getPlanStatistics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { months = 12 } = req.query as any;

  // Check if plan exists
  const planExists = await query('SELECT plan_code FROM health_plans WHERE health_plan_id = $1', [id]);
  
  if (planExists.rows.length === 0) {
    throw new HealthcareAPIError('Insurance plan not found', 404);
  }

  // Get enrollment statistics
  const enrollmentStatsQuery = `
    SELECT 
      COUNT(DISTINCT me.enrollment_id) as total_enrollments,
      COUNT(DISTINCT CASE WHEN me.termination_date IS NULL THEN me.enrollment_id END) as active_enrollments,
      COUNT(DISTINCT CASE WHEN me.relationship_code = 'SELF' THEN me.enrollment_id END) as primary_members,
      COUNT(DISTINCT CASE WHEN me.relationship_code != 'SELF' THEN me.enrollment_id END) as dependents
    FROM member_enrollments me
    WHERE me.health_plan_id = $1
  `;

  const enrollmentResult = await query(enrollmentStatsQuery, [id]);
  const enrollmentStats = enrollmentResult.rows[0];

  // Get claims statistics for the specified period
  const claimsStatsQuery = `
    SELECT 
      COUNT(*) as total_claims,
      COUNT(CASE WHEN c.claim_status = 'PAID' THEN 1 END) as paid_claims,
      COALESCE(SUM(c.total_charge_amount), 0) as total_charges,
      COALESCE(SUM(c.paid_amount), 0) as total_paid,
      COALESCE(AVG(c.total_charge_amount), 0) as avg_claim_amount
    FROM claims c
    JOIN member_enrollments me ON c.member_id = me.member_id
    WHERE me.health_plan_id = $1
    AND c.service_date >= NOW() - INTERVAL '${months} months'
    AND me.termination_date IS NULL
  `;

  const claimsResult = await query(claimsStatsQuery, [id]);
  const claimsStats = claimsResult.rows[0];

  res.json({
    success: true,
    data: {
      enrollment: {
        totalEnrollments: parseInt(enrollmentStats.total_enrollments),
        activeEnrollments: parseInt(enrollmentStats.active_enrollments),
        primaryMembers: parseInt(enrollmentStats.primary_members),
        dependents: parseInt(enrollmentStats.dependents),
      },
      claims: {
        totalClaims: parseInt(claimsStats.total_claims),
        paidClaims: parseInt(claimsStats.paid_claims),
        totalCharges: parseFloat(claimsStats.total_charges),
        totalPaid: parseFloat(claimsStats.total_paid),
        avgClaimAmount: parseFloat(claimsStats.avg_claim_amount),
        paymentRatio: claimsStats.total_charges > 0 ? 
          (parseFloat(claimsStats.total_paid) / parseFloat(claimsStats.total_charges) * 100).toFixed(2) : 0,
      },
      period: `${months} months`,
    },
  });
});

export default {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  getPlanMembers,
  getPlanStatistics,
};