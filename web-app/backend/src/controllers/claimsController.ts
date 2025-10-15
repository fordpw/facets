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

interface Claim {
  id: string;
  claimNumber: string;
  memberId: string;
  providerId: string;
  serviceDate: Date;
  submissionDate: Date;
  claimStatus: string;
  claimType: string;
  totalChargeAmount: number;
  allowedAmount: number;
  paidAmount: number;
  deductibleAmount: number;
  coinsuranceAmount: number;
  copayAmount: number;
  denialReason?: string;
  diagnosisCodes: string[];
  procedureCodes: string[];
  placeOfService: string;
  createdAt: Date;
  updatedAt: Date;
}

// Get all claims with advanced filtering and pagination
export const getClaims = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'serviceDate',
    sortOrder = 'desc',
    claimNumber,
    memberId,
    providerId,
    status,
    claimType,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    placeOfService,
  } = req.query as any;

  const offset = (page - 1) * limit;
  const orderBy = `${sortBy} ${sortOrder.toUpperCase()}`;

  // Build dynamic WHERE clause
  const conditions: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (claimNumber) {
    conditions.push(`c.claim_number ILIKE $${++paramCount}`);
    params.push(`%${claimNumber}%`);
  }

  if (memberId) {
    conditions.push(`c.member_id ILIKE $${++paramCount}`);
    params.push(`%${memberId}%`);
  }

  if (providerId) {
    conditions.push(`c.provider_id = $${++paramCount}`);
    params.push(providerId);
  }

  if (status) {
    conditions.push(`c.claim_status = $${++paramCount}`);
    params.push(status);
  }

  if (claimType) {
    conditions.push(`c.claim_type = $${++paramCount}`);
    params.push(claimType);
  }

  if (dateFrom) {
    conditions.push(`c.service_date >= $${++paramCount}`);
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push(`c.service_date <= $${++paramCount}`);
    params.push(dateTo);
  }

  if (minAmount) {
    conditions.push(`c.total_charge_amount >= $${++paramCount}`);
    params.push(minAmount);
  }

  if (maxAmount) {
    conditions.push(`c.total_charge_amount <= $${++paramCount}`);
    params.push(maxAmount);
  }

  if (placeOfService) {
    conditions.push(`c.place_of_service = $${++paramCount}`);
    params.push(placeOfService);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count for pagination
  const countQuery = `
    SELECT COUNT(*) as total
    FROM claims c
    ${whereClause}
  `;

  const countResult = await query(countQuery, params);
  const total = parseInt(countResult.rows[0].total);

  // Get claims with member and provider information
  const claimsQuery = `
    SELECT 
      c.*,
      m.first_name as member_first_name,
      m.last_name as member_last_name,
      m.member_number,
      COALESCE(p.first_name, po.org_name) as provider_name,
      p.last_name as provider_last_name,
      p.npi as provider_npi,
      po.org_name as provider_organization
    FROM claims c
    LEFT JOIN members m ON c.member_id = m.member_id
    LEFT JOIN providers p ON c.provider_id::text = p.provider_id::text
    LEFT JOIN provider_organizations po ON c.provider_id::text = po.provider_org_id::text
    ${whereClause}
    ORDER BY c.${orderBy}
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `;

  params.push(limit, offset);
  const result = await query(claimsQuery, params);

  // Transform the data
  const claims = result.rows.map((row: any) => ({
    ...row,
    serviceDate: row.service_date,
    submissionDate: row.submission_date,
    claimStatus: row.claim_status,
    claimType: row.claim_type,
    totalChargeAmount: parseFloat(row.total_charge_amount),
    allowedAmount: parseFloat(row.allowed_amount || 0),
    paidAmount: parseFloat(row.paid_amount || 0),
    deductibleAmount: parseFloat(row.deductible_amount || 0),
    coinsuranceAmount: parseFloat(row.coinsurance_amount || 0),
    copayAmount: parseFloat(row.copay_amount || 0),
    denialReason: row.denial_reason,
    diagnosisCodes: row.diagnosis_codes || [],
    procedureCodes: row.procedure_codes || [],
    placeOfService: row.place_of_service,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    claimNumber: row.claim_number,
    providerId: row.provider_id,
    memberId: row.member_id,
  }));

  // Log claims access for HIPAA compliance
  auditLogger.info('Claims search performed', {
    userId: req.user?.userId,
    searchParams: { claimNumber, memberId, providerId, status, claimType },
    resultCount: claims.length,
    action: 'CLAIMS_SEARCH',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: {
      claims,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// Get a single claim by ID
export const getClaim = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const claimQuery = `
    SELECT 
      c.*,
      m.first_name as member_first_name,
      m.last_name as member_last_name,
      m.member_number,
      m.date_of_birth as member_dob,
      COALESCE(p.first_name, po.org_name) as provider_name,
      p.last_name as provider_last_name,
      p.npi as provider_npi,
      po.org_name as provider_organization,
      pl.plan_name,
      pl.plan_type
    FROM claims c
    LEFT JOIN members m ON c.member_id = m.member_id
    LEFT JOIN providers p ON c.provider_id::text = p.provider_id::text
    LEFT JOIN provider_organizations po ON c.provider_id::text = po.provider_org_id::text
    LEFT JOIN member_enrollments me ON m.member_id = me.member_id AND me.termination_date IS NULL
    LEFT JOIN health_plans pl ON me.health_plan_id = pl.health_plan_id
    WHERE c.id = $1
  `;

  const result = await query(claimQuery, [id]);

  if (result.rows.length === 0) {
    throw new HealthcareAPIError('Claim not found', 404);
  }

  const row = result.rows[0];
  const claim = {
    ...row,
    serviceDate: row.service_date,
    submissionDate: row.submission_date,
    claimStatus: row.claim_status,
    claimType: row.claim_type,
    totalChargeAmount: parseFloat(row.total_charge_amount),
    allowedAmount: parseFloat(row.allowed_amount || 0),
    paidAmount: parseFloat(row.paid_amount || 0),
    deductibleAmount: parseFloat(row.deductible_amount || 0),
    coinsuranceAmount: parseFloat(row.coinsurance_amount || 0),
    copayAmount: parseFloat(row.copay_amount || 0),
    denialReason: row.denial_reason,
    diagnosisCodes: row.diagnosis_codes || [],
    procedureCodes: row.procedure_codes || [],
    placeOfService: row.place_of_service,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  // Log claim access for HIPAA compliance
  auditLogger.info('Claim record accessed', {
    userId: req.user?.userId,
    claimId: id,
    claimNumber: claim.claim_number,
    memberId: claim.member_id,
    action: 'CLAIM_VIEW',
    phiAccessed: true,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: { claim },
  });
});

// Create a new claim
export const createClaim = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const claimData = req.body;

  // Generate claim number if not provided
  const claimNumber = claimData.claimNumber || `CLM${Date.now()}${Math.floor(Math.random() * 1000)}`;

  // Validate member exists
  const memberExists = await query(
    'SELECT member_id FROM members WHERE member_id = $1 AND is_active = true',
    [claimData.memberId]
  );

  if (memberExists.rows.length === 0) {
    throw new HealthcareAPIError('Invalid or inactive member ID', 400);
  }

  // Validate provider exists
  const providerExists = await query(`
    SELECT provider_id FROM providers WHERE provider_id = $1 AND is_active = true
    UNION
    SELECT provider_org_id as provider_id FROM provider_organizations WHERE provider_org_id = $1 AND is_active = true
  `, [claimData.providerId]);

  if (providerExists.rows.length === 0) {
    throw new HealthcareAPIError('Invalid or inactive provider ID', 400);
  }

  // Insert new claim
  const insertQuery = `
    INSERT INTO claims (
      claim_number, member_id, provider_id, service_date, submission_date,
      claim_status, claim_type, total_charge_amount, allowed_amount, paid_amount,
      deductible_amount, coinsurance_amount, copay_amount, denial_reason,
      diagnosis_codes, procedure_codes, place_of_service
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
    ) RETURNING *
  `;

  const result = await query(insertQuery, [
    claimNumber,
    claimData.memberId,
    claimData.providerId,
    claimData.serviceDate,
    claimData.submissionDate || new Date(),
    claimData.claimStatus || 'RECEIVED',
    claimData.claimType,
    claimData.totalChargeAmount,
    claimData.allowedAmount || 0,
    claimData.paidAmount || 0,
    claimData.deductibleAmount || 0,
    claimData.coinsuranceAmount || 0,
    claimData.copayAmount || 0,
    claimData.denialReason || null,
    JSON.stringify(claimData.diagnosisCodes || []),
    JSON.stringify(claimData.procedureCodes || []),
    claimData.placeOfService,
  ]);

  const newClaim = result.rows[0];

  // Log claim creation for audit
  auditLogger.info('New claim created', {
    userId: req.user?.userId,
    claimId: newClaim.id,
    claimNumber: newClaim.claim_number,
    memberId: newClaim.member_id,
    providerId: newClaim.provider_id,
    action: 'CLAIM_CREATE',
    phiAccessed: true,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(201).json({
    success: true,
    data: { claim: newClaim },
    message: 'Claim created successfully',
  });
});

// Update claim status or other details
export const updateClaim = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  // Check if claim exists
  const existingClaim = await query('SELECT * FROM claims WHERE id = $1', [id]);
  
  if (existingClaim.rows.length === 0) {
    throw new HealthcareAPIError('Claim not found', 404);
  }

  // Build dynamic update query
  const updateFields: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  const allowedUpdates = [
    'claimStatus', 'allowedAmount', 'paidAmount', 'deductibleAmount',
    'coinsuranceAmount', 'copayAmount', 'denialReason', 'diagnosisCodes', 'procedureCodes'
  ];

  Object.keys(updateData).forEach(key => {
    if (allowedUpdates.includes(key) && updateData[key] !== undefined) {
      switch (key) {
        case 'claimStatus':
          updateFields.push(`claim_status = $${++paramCount}`);
          params.push(updateData[key]);
          break;
        case 'allowedAmount':
          updateFields.push(`allowed_amount = $${++paramCount}`);
          params.push(updateData[key]);
          break;
        case 'paidAmount':
          updateFields.push(`paid_amount = $${++paramCount}`);
          params.push(updateData[key]);
          break;
        case 'deductibleAmount':
          updateFields.push(`deductible_amount = $${++paramCount}`);
          params.push(updateData[key]);
          break;
        case 'coinsuranceAmount':
          updateFields.push(`coinsurance_amount = $${++paramCount}`);
          params.push(updateData[key]);
          break;
        case 'copayAmount':
          updateFields.push(`copay_amount = $${++paramCount}`);
          params.push(updateData[key]);
          break;
        case 'denialReason':
          updateFields.push(`denial_reason = $${++paramCount}`);
          params.push(updateData[key]);
          break;
        case 'diagnosisCodes':
          updateFields.push(`diagnosis_codes = $${++paramCount}`);
          params.push(JSON.stringify(updateData[key]));
          break;
        case 'procedureCodes':
          updateFields.push(`procedure_codes = $${++paramCount}`);
          params.push(JSON.stringify(updateData[key]));
          break;
      }
    }
  });

  if (updateFields.length === 0) {
    throw new HealthcareAPIError('No valid update fields provided', 400);
  }

  // Add updated_at field
  updateFields.push(`updated_at = NOW()`);
  params.push(id);

  const updateQuery = `
    UPDATE claims 
    SET ${updateFields.join(', ')}
    WHERE id = $${++paramCount}
    RETURNING *
  `;

  const result = await query(updateQuery, params);
  const updatedClaim = result.rows[0];

  // Log claim update for audit
  auditLogger.info('Claim record updated', {
    userId: req.user?.userId,
    claimId: id,
    claimNumber: updatedClaim.claim_number,
    updatedFields: Object.keys(updateData),
    action: 'CLAIM_UPDATE',
    phiAccessed: true,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: { claim: updatedClaim },
    message: 'Claim updated successfully',
  });
});

// Process claim (update status to PROCESSED or PAID)
export const processClaim = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, allowedAmount, paidAmount, denialReason } = req.body;

  // Validate status
  const validStatuses = ['PROCESSED', 'PAID', 'DENIED', 'PENDED'];
  if (!validStatuses.includes(status)) {
    throw new HealthcareAPIError('Invalid claim status', 400);
  }

  // Check if claim exists and is in processable status
  const existingClaim = await query(
    'SELECT * FROM claims WHERE id = $1 AND claim_status IN (\'RECEIVED\', \'PROCESSING\', \'PENDED\')',
    [id]
  );
  
  if (existingClaim.rows.length === 0) {
    throw new HealthcareAPIError('Claim not found or cannot be processed', 404);
  }

  // Update claim with processing results
  const updateQuery = `
    UPDATE claims 
    SET 
      claim_status = $1,
      allowed_amount = COALESCE($2, allowed_amount),
      paid_amount = COALESCE($3, paid_amount),
      denial_reason = $4,
      updated_at = NOW()
    WHERE id = $5
    RETURNING *
  `;

  const result = await query(updateQuery, [status, allowedAmount, paidAmount, denialReason, id]);
  const processedClaim = result.rows[0];

  // Log claim processing for audit
  auditLogger.info('Claim processed', {
    userId: req.user?.userId,
    claimId: id,
    claimNumber: processedClaim.claim_number,
    newStatus: status,
    action: 'CLAIM_PROCESS',
    phiAccessed: true,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: { claim: processedClaim },
    message: 'Claim processed successfully',
  });
});

// Get claim statistics summary
export const getClaimStatistics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { dateFrom, dateTo, providerId, memberId } = req.query as any;
  
  const conditions: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (dateFrom) {
    conditions.push(`service_date >= $${++paramCount}`);
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push(`service_date <= $${++paramCount}`);
    params.push(dateTo);
  }

  if (providerId) {
    conditions.push(`provider_id = $${++paramCount}`);
    params.push(providerId);
  }

  if (memberId) {
    conditions.push(`member_id = $${++paramCount}`);
    params.push(memberId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const statsQuery = `
    SELECT 
      COUNT(*) as total_claims,
      COUNT(CASE WHEN claim_status = 'PAID' THEN 1 END) as paid_claims,
      COUNT(CASE WHEN claim_status = 'DENIED' THEN 1 END) as denied_claims,
      COUNT(CASE WHEN claim_status = 'PENDED' THEN 1 END) as pended_claims,
      COALESCE(SUM(total_charge_amount), 0) as total_charges,
      COALESCE(SUM(allowed_amount), 0) as total_allowed,
      COALESCE(SUM(paid_amount), 0) as total_paid,
      COALESCE(AVG(total_charge_amount), 0) as avg_charge_amount,
      COALESCE(AVG(paid_amount), 0) as avg_paid_amount
    FROM claims
    ${whereClause}
  `;

  const result = await query(statsQuery, params);
  const stats = result.rows[0];

  // Calculate additional metrics
  const processingRate = stats.total_claims > 0 ? 
    ((parseInt(stats.paid_claims) + parseInt(stats.denied_claims)) / parseInt(stats.total_claims) * 100).toFixed(2) : 0;
  
  const paymentRate = stats.total_claims > 0 ? 
    (parseInt(stats.paid_claims) / parseInt(stats.total_claims) * 100).toFixed(2) : 0;

  res.json({
    success: true,
    data: {
      totalClaims: parseInt(stats.total_claims),
      paidClaims: parseInt(stats.paid_claims),
      deniedClaims: parseInt(stats.denied_claims),
      pendedClaims: parseInt(stats.pended_claims),
      totalCharges: parseFloat(stats.total_charges),
      totalAllowed: parseFloat(stats.total_allowed),
      totalPaid: parseFloat(stats.total_paid),
      avgChargeAmount: parseFloat(stats.avg_charge_amount),
      avgPaidAmount: parseFloat(stats.avg_paid_amount),
      processingRate: parseFloat(processingRate),
      paymentRate: parseFloat(paymentRate),
    },
  });
});

export default {
  getClaims,
  getClaim,
  createClaim,
  updateClaim,
  processClaim,
  getClaimStatistics,
};