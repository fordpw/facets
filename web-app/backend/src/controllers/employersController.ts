import { Request, Response } from 'express';
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

// Get all employers with filtering and pagination
export const getEmployers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'companyName',
    sortOrder = 'asc',
    companyName,
    groupNumber,
    isActive = 'all',
  } = req.query as any;

  const offset = (page - 1) * limit;
  const orderBy = `${sortBy === 'companyName' ? 'company_name' : sortBy} ${sortOrder.toUpperCase()}`;

  const conditions: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (companyName) {
    conditions.push(`company_name ILIKE $${++paramCount}`);
    params.push(`%${companyName}%`);
  }

  if (groupNumber) {
    conditions.push(`group_number ILIKE $${++paramCount}`);
    params.push(`%${groupNumber}%`);
  }

  if (isActive !== 'all') {
    conditions.push(`is_active = $${++paramCount}`);
    params.push(isActive === 'true');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM employers ${whereClause}`;
  const countResult = await query(countQuery, params);
  const total = parseInt(countResult.rows[0].total);

  // Get employers with enrollment counts
  const employersQuery = `
    SELECT 
      e.*,
      COUNT(me.enrollment_id) as active_enrollments
    FROM employers e
    LEFT JOIN member_enrollments me ON e.employer_id = me.employer_id AND me.termination_date IS NULL
    ${whereClause}
    GROUP BY e.employer_id
    ORDER BY ${orderBy}
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `;

  params.push(limit, offset);
  const result = await query(employersQuery, params);

  const employers = result.rows.map(row => ({
    id: row.employer_id,
    companyName: row.company_name,
    groupNumber: row.group_number,
    taxId: row.tax_id,
    address: {
      street1: row.address_line1,
      street2: row.address_line2,
      city: row.city,
      state: row.state_code,
      zipCode: row.zip_code,
    },
    phone: row.phone,
    email: row.email,
    contactPerson: row.contact_person,
    isActive: row.is_active,
    effectiveDate: row.effective_date,
    terminationDate: row.termination_date,
    activeEnrollments: parseInt(row.active_enrollments),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  res.json({
    success: true,
    data: {
      employers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// Get single employer by ID
export const getEmployer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const employerQuery = `
    SELECT 
      e.*,
      COUNT(DISTINCT me.enrollment_id) as total_enrollments,
      COUNT(DISTINCT CASE WHEN me.termination_date IS NULL THEN me.enrollment_id END) as active_enrollments
    FROM employers e
    LEFT JOIN member_enrollments me ON e.employer_id = me.employer_id
    WHERE e.employer_id = $1
    GROUP BY e.employer_id
  `;

  const result = await query(employerQuery, [id]);

  if (result.rows.length === 0) {
    throw new HealthcareAPIError('Employer not found', 404);
  }

  const row = result.rows[0];
  const employer = {
    id: row.employer_id,
    companyName: row.company_name,
    groupNumber: row.group_number,
    taxId: row.tax_id,
    address: {
      street1: row.address_line1,
      street2: row.address_line2,
      city: row.city,
      state: row.state_code,
      zipCode: row.zip_code,
    },
    phone: row.phone,
    email: row.email,
    contactPerson: row.contact_person,
    isActive: row.is_active,
    effectiveDate: row.effective_date,
    terminationDate: row.termination_date,
    totalEnrollments: parseInt(row.total_enrollments),
    activeEnrollments: parseInt(row.active_enrollments),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  res.json({
    success: true,
    data: { employer },
  });
});

// Create new employer
export const createEmployer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const employerData = req.body;

  // Check if group number already exists
  const existingEmployer = await query(
    'SELECT employer_id FROM employers WHERE group_number = $1',
    [employerData.groupNumber]
  );

  if (existingEmployer.rows.length > 0) {
    throw new HealthcareAPIError('Group number already exists', 409);
  }

  const insertQuery = `
    INSERT INTO employers (
      company_name, group_number, tax_id, address_line1, address_line2,
      city, state_code, zip_code, phone, email, contact_person,
      effective_date, is_active
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
    ) RETURNING *
  `;

  const result = await query(insertQuery, [
    employerData.companyName,
    employerData.groupNumber,
    employerData.taxId,
    employerData.address?.street1,
    employerData.address?.street2 || null,
    employerData.address?.city,
    employerData.address?.state,
    employerData.address?.zipCode,
    employerData.phone,
    employerData.email,
    employerData.contactPerson,
    employerData.effectiveDate,
    employerData.isActive !== false,
  ]);

  const newEmployer = result.rows[0];

  auditLogger.info('Employer created', {
    userId: req.user?.userId,
    employerId: newEmployer.employer_id,
    companyName: newEmployer.company_name,
    action: 'EMPLOYER_CREATE',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(201).json({
    success: true,
    data: { employer: newEmployer },
    message: 'Employer created successfully',
  });
});

// Get employer members
export const getEmployerMembers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { page = 1, limit = 20, status = 'ACTIVE' } = req.query as any;

  const employerExists = await query('SELECT company_name FROM employers WHERE employer_id = $1', [id]);
  
  if (employerExists.rows.length === 0) {
    throw new HealthcareAPIError('Employer not found', 404);
  }

  const offset = (page - 1) * limit;
  let statusCondition = '';

  if (status !== 'ALL') {
    statusCondition = status === 'ACTIVE' ? 'AND me.termination_date IS NULL' : 'AND me.termination_date IS NOT NULL';
  }

  const membersQuery = `
    SELECT 
      m.member_id,
      m.member_number,
      m.first_name,
      m.last_name,
      m.date_of_birth,
      me.relationship_code,
      me.effective_date,
      me.termination_date,
      hp.plan_name
    FROM member_enrollments me
    JOIN members m ON me.member_id = m.member_id
    JOIN health_plans hp ON me.health_plan_id = hp.health_plan_id
    WHERE me.employer_id = $1
    ${statusCondition}
    ORDER BY m.last_name, m.first_name
    LIMIT $2 OFFSET $3
  `;

  const result = await query(membersQuery, [id, limit, offset]);

  res.json({
    success: true,
    data: {
      members: result.rows.map(row => ({
        memberId: row.member_id,
        memberNumber: row.member_number,
        firstName: row.first_name,
        lastName: row.last_name,
        dateOfBirth: row.date_of_birth,
        relationshipCode: row.relationship_code,
        effectiveDate: row.effective_date,
        terminationDate: row.termination_date,
        planName: row.plan_name,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rowCount || 0,
      },
    },
  });
});

export default {
  getEmployers,
  getEmployer,
  createEmployer,
  getEmployerMembers,
};