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

interface Member {
  id: number;
  memberId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  ssn?: string;
  email?: string;
  phone?: string;
  address: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  effectiveDate: Date;
  terminationDate?: Date;
  planId: number;
  employerId?: number;
  relationshipCode: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// Get all members with pagination and filtering
export const getMembers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    memberId,
    firstName,
    lastName,
    dateOfBirth,
    ssn,
    planId,
    status = 'ACTIVE',
  } = req.query as any;

  const offset = (page - 1) * limit;
  const orderBy = `${sortBy} ${sortOrder.toUpperCase()}`;

  // Build dynamic WHERE clause
  const conditions: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (memberId) {
    conditions.push(`m.member_id ILIKE $${++paramCount}`);
    params.push(`%${memberId}%`);
  }

  if (firstName) {
    conditions.push(`m.first_name ILIKE $${++paramCount}`);
    params.push(`%${firstName}%`);
  }

  if (lastName) {
    conditions.push(`m.last_name ILIKE $${++paramCount}`);
    params.push(`%${lastName}%`);
  }

  if (dateOfBirth) {
    conditions.push(`m.date_of_birth = $${++paramCount}`);
    params.push(dateOfBirth);
  }

  if (ssn && req.user?.role === 'ADMIN') {
    // Only admins can search by SSN
    conditions.push(`m.ssn = $${++paramCount}`);
    params.push(ssn);
  }

  if (planId) {
    conditions.push(`m.plan_id = $${++paramCount}`);
    params.push(planId);
  }

  if (status) {
    conditions.push(`m.status = $${++paramCount}`);
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count for pagination
  const countQuery = `
    SELECT COUNT(*) as total
    FROM members m
    ${whereClause}
  `;

  const countResult = await query(countQuery, params);
  const total = parseInt(countResult.rows[0].total);

  // Get members with plan and employer information
  const membersQuery = `
    SELECT 
      m.*,
      p.plan_name,
      p.plan_type,
      e.employer_name
    FROM members m
    LEFT JOIN insurance_plans p ON m.plan_id = p.id
    LEFT JOIN employers e ON m.employer_id = e.id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `;

  params.push(limit, offset);
  const result = await query(membersQuery, params);

  // Transform the data to match interface
  const members = result.rows.map((row: any) => ({
    ...row,
    address: {
      street1: row.address_line_1,
      street2: row.address_line_2,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
    },
    dateOfBirth: row.date_of_birth,
    effectiveDate: row.effective_date,
    terminationDate: row.termination_date,
    relationshipCode: row.relationship_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Remove raw address fields
    address_line_1: undefined,
    address_line_2: undefined,
    city: undefined,
    state: undefined,
    zip_code: undefined,
    date_of_birth: undefined,
    effective_date: undefined,
    termination_date: undefined,
    relationship_code: undefined,
    created_at: undefined,
    updated_at: undefined,
  }));

  // Log member access for HIPAA compliance
  auditLogger.info('Member search performed', {
    userId: req.user?.userId,
    searchParams: { memberId, firstName, lastName, planId, status },
    resultCount: members.length,
    action: 'MEMBER_SEARCH',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: {
      members,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// Get a single member by ID
export const getMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const memberQuery = `
    SELECT 
      m.*,
      p.plan_name,
      p.plan_type,
      p.deductible,
      p.coinsurance_percentage,
      p.out_of_pocket_max,
      e.employer_name,
      e.group_number
    FROM members m
    LEFT JOIN insurance_plans p ON m.plan_id = p.id
    LEFT JOIN employers e ON m.employer_id = e.id
    WHERE m.id = $1
  `;

  const result = await query(memberQuery, [id]);

  if (result.rows.length === 0) {
    throw new HealthcareAPIError('Member not found', 404);
  }

  const row = result.rows[0];
  const member = {
    ...row,
    address: {
      street1: row.address_line_1,
      street2: row.address_line_2,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
    },
    dateOfBirth: row.date_of_birth,
    effectiveDate: row.effective_date,
    terminationDate: row.termination_date,
    relationshipCode: row.relationship_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  // Remove raw address fields from response
  delete member.address_line_1;
  delete member.address_line_2;
  delete member.city;
  delete member.state;
  delete member.zip_code;
  delete member.date_of_birth;
  delete member.effective_date;
  delete member.termination_date;
  delete member.relationship_code;
  delete member.created_at;
  delete member.updated_at;

  // Log member access for HIPAA compliance
  auditLogger.info('Member record accessed', {
    userId: req.user?.userId,
    memberId: member.member_id,
    memberRecordId: id,
    action: 'MEMBER_VIEW',
    phiAccessed: true,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: { member },
  });
});

// Create a new member
export const createMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const memberData = req.body;

  // Check if member ID already exists
  const existingMember = await query(
    'SELECT id FROM members WHERE member_id = $1',
    [memberData.memberId]
  );

  if (existingMember.rows.length > 0) {
    throw new HealthcareAPIError('Member ID already exists', 409);
  }

  // Validate plan exists
  const planExists = await query(
    'SELECT id FROM insurance_plans WHERE id = $1',
    [memberData.planId]
  );

  if (planExists.rows.length === 0) {
    throw new HealthcareAPIError('Invalid plan ID', 400);
  }

  // Insert new member
  const insertQuery = `
    INSERT INTO members (
      member_id, first_name, last_name, date_of_birth, gender, ssn,
      email, phone, address_line_1, address_line_2, city, state, zip_code,
      effective_date, termination_date, plan_id, employer_id, relationship_code, status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
    ) RETURNING *
  `;

  const result = await query(insertQuery, [
    memberData.memberId,
    memberData.firstName,
    memberData.lastName,
    memberData.dateOfBirth,
    memberData.gender,
    memberData.ssn,
    memberData.email,
    memberData.phone,
    memberData.address?.street1,
    memberData.address?.street2 || null,
    memberData.address?.city,
    memberData.address?.state,
    memberData.address?.zipCode,
    memberData.effectiveDate,
    memberData.terminationDate || null,
    memberData.planId,
    memberData.employerId || null,
    memberData.relationshipCode || 'SELF',
    'ACTIVE',
  ]);

  const newMember = result.rows[0];

  // Log member creation for audit
  auditLogger.info('New member created', {
    userId: req.user?.userId,
    memberId: newMember.member_id,
    memberRecordId: newMember.id,
    action: 'MEMBER_CREATE',
    phiAccessed: true,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(201).json({
    success: true,
    data: { 
      member: {
        ...newMember,
        address: {
          street1: newMember.address_line_1,
          street2: newMember.address_line_2,
          city: newMember.city,
          state: newMember.state,
          zipCode: newMember.zip_code,
        },
      },
    },
    message: 'Member created successfully',
  });
});

// Update a member
export const updateMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  // Check if member exists
  const existingMember = await query('SELECT * FROM members WHERE id = $1', [id]);
  
  if (existingMember.rows.length === 0) {
    throw new HealthcareAPIError('Member not found', 404);
  }

  // Build dynamic update query
  const updateFields: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (updateData.firstName) {
    updateFields.push(`first_name = $${++paramCount}`);
    params.push(updateData.firstName);
  }

  if (updateData.lastName) {
    updateFields.push(`last_name = $${++paramCount}`);
    params.push(updateData.lastName);
  }

  if (updateData.email) {
    updateFields.push(`email = $${++paramCount}`);
    params.push(updateData.email);
  }

  if (updateData.phone) {
    updateFields.push(`phone = $${++paramCount}`);
    params.push(updateData.phone);
  }

  if (updateData.address) {
    if (updateData.address.street1) {
      updateFields.push(`address_line_1 = $${++paramCount}`);
      params.push(updateData.address.street1);
    }

    if (updateData.address.street2 !== undefined) {
      updateFields.push(`address_line_2 = $${++paramCount}`);
      params.push(updateData.address.street2);
    }

    if (updateData.address.city) {
      updateFields.push(`city = $${++paramCount}`);
      params.push(updateData.address.city);
    }

    if (updateData.address.state) {
      updateFields.push(`state = $${++paramCount}`);
      params.push(updateData.address.state);
    }

    if (updateData.address.zipCode) {
      updateFields.push(`zip_code = $${++paramCount}`);
      params.push(updateData.address.zipCode);
    }
  }

  if (updateData.terminationDate !== undefined) {
    updateFields.push(`termination_date = $${++paramCount}`);
    params.push(updateData.terminationDate);
  }

  if (updateData.planId) {
    // Validate plan exists
    const planExists = await query('SELECT id FROM insurance_plans WHERE id = $1', [updateData.planId]);
    if (planExists.rows.length === 0) {
      throw new HealthcareAPIError('Invalid plan ID', 400);
    }
    updateFields.push(`plan_id = $${++paramCount}`);
    params.push(updateData.planId);
  }

  if (updateData.employerId !== undefined) {
    updateFields.push(`employer_id = $${++paramCount}`);
    params.push(updateData.employerId);
  }

  if (updateFields.length === 0) {
    throw new HealthcareAPIError('No valid update fields provided', 400);
  }

  // Add updated_at field
  updateFields.push(`updated_at = NOW()`);
  params.push(id); // Add ID for WHERE clause

  const updateQuery = `
    UPDATE members 
    SET ${updateFields.join(', ')}
    WHERE id = $${++paramCount}
    RETURNING *
  `;

  const result = await query(updateQuery, params);
  const updatedMember = result.rows[0];

  // Log member update for audit
  auditLogger.info('Member record updated', {
    userId: req.user?.userId,
    memberId: updatedMember.member_id,
    memberRecordId: id,
    updatedFields: Object.keys(updateData),
    action: 'MEMBER_UPDATE',
    phiAccessed: true,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: {
      member: {
        ...updatedMember,
        address: {
          street1: updatedMember.address_line_1,
          street2: updatedMember.address_line_2,
          city: updatedMember.city,
          state: updatedMember.state,
          zipCode: updatedMember.zip_code,
        },
      },
    },
    message: 'Member updated successfully',
  });
});

// Delete a member (soft delete - change status to TERMINATED)
export const deleteMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Check if member exists
  const existingMember = await query('SELECT * FROM members WHERE id = $1', [id]);
  
  if (existingMember.rows.length === 0) {
    throw new HealthcareAPIError('Member not found', 404);
  }

  // Soft delete - update status to TERMINATED
  const result = await query(`
    UPDATE members 
    SET status = 'TERMINATED', termination_date = NOW(), updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [id]);

  const terminatedMember = result.rows[0];

  // Log member termination for audit
  auditLogger.info('Member record terminated', {
    userId: req.user?.userId,
    memberId: terminatedMember.member_id,
    memberRecordId: id,
    action: 'MEMBER_TERMINATE',
    phiAccessed: true,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    message: 'Member terminated successfully',
  });
});

// Get member claims history
export const getMemberClaims = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query as any;

  // Check if member exists
  const memberExists = await query('SELECT member_id FROM members WHERE id = $1', [id]);
  
  if (memberExists.rows.length === 0) {
    throw new HealthcareAPIError('Member not found', 404);
  }

  const offset = (page - 1) * limit;

  // Get member's claims
  const claimsQuery = `
    SELECT 
      c.*,
      p.first_name as provider_first_name,
      p.last_name as provider_last_name,
      p.organization_name as provider_organization
    FROM claims c
    LEFT JOIN providers p ON c.provider_id = p.id
    WHERE c.member_id = (SELECT member_id FROM members WHERE id = $1)
    ORDER BY c.service_date DESC
    LIMIT $2 OFFSET $3
  `;

  const result = await query(claimsQuery, [id, limit, offset]);

  // Log member claims access
  auditLogger.info('Member claims accessed', {
    userId: req.user?.userId,
    memberRecordId: id,
    memberId: memberExists.rows[0].member_id,
    action: 'MEMBER_CLAIMS_VIEW',
    phiAccessed: true,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: {
      claims: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rowCount || 0,
      },
    },
  });
});

export default {
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
  getMemberClaims,
};