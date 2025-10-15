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

// Get all providers with pagination and filtering
export const getProviders = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    providerId,
    npi,
    name,
    providerType,
    specialty,
    state,
    zipCode,
    status = 'ACTIVE',
  } = req.query as any;

  const offset = (page - 1) * limit;
  const orderBy = `${sortBy} ${sortOrder.toUpperCase()}`;

  // Build dynamic WHERE clause
  const conditions: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (providerId) {
    conditions.push(`p.provider_id ILIKE $${++paramCount}`);
    params.push(`%${providerId}%`);
  }

  if (npi) {
    conditions.push(`p.npi = $${++paramCount}`);
    params.push(npi);
  }

  if (name) {
    conditions.push(`(p.first_name ILIKE $${++paramCount} OR p.last_name ILIKE $${++paramCount} OR p.organization_name ILIKE $${++paramCount})`);
    params.push(`%${name}%`, `%${name}%`, `%${name}%`);
    paramCount += 2; // We added 3 parameters but only incremented once above
  }

  if (providerType) {
    conditions.push(`p.provider_type = $${++paramCount}`);
    params.push(providerType);
  }

  if (specialty) {
    conditions.push(`p.specialty ILIKE $${++paramCount}`);
    params.push(`%${specialty}%`);
  }

  if (state) {
    conditions.push(`p.state = $${++paramCount}`);
    params.push(state);
  }

  if (zipCode) {
    conditions.push(`p.zip_code = $${++paramCount}`);
    params.push(zipCode);
  }

  if (status) {
    conditions.push(`p.status = $${++paramCount}`);
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count for pagination
  const countQuery = `
    SELECT COUNT(*) as total
    FROM providers p
    ${whereClause}
  `;

  const countResult = await query(countQuery, params);
  const total = parseInt(countResult.rows[0].total);

  // Get providers
  const providersQuery = `
    SELECT 
      p.*,
      COUNT(c.id) as total_claims,
      COALESCE(SUM(c.total_amount), 0) as total_billed,
      COALESCE(SUM(c.paid_amount), 0) as total_paid
    FROM providers p
    LEFT JOIN claims c ON p.provider_id = c.provider_id AND c.service_date >= CURRENT_DATE - INTERVAL '12 months'
    ${whereClause}
    GROUP BY p.id
    ORDER BY ${orderBy}
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `;

  params.push(limit, offset);
  const result = await query(providersQuery, params);

  // Transform the data
  const providers = result.rows.map((row: any) => ({
    ...row,
    address: {
      street1: row.address_line_1,
      street2: row.address_line_2,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
    },
    contractEffectiveDate: row.contract_effective_date,
    contractTerminationDate: row.contract_termination_date,
    licenseNumber: row.license_number,
    licenseState: row.license_state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totalClaims: parseInt(row.total_claims),
    totalBilled: parseFloat(row.total_billed),
    totalPaid: parseFloat(row.total_paid),
    // Remove raw fields
    address_line_1: undefined,
    address_line_2: undefined,
    city: undefined,
    state: undefined,
    zip_code: undefined,
    contract_effective_date: undefined,
    contract_termination_date: undefined,
    license_number: undefined,
    license_state: undefined,
    created_at: undefined,
    updated_at: undefined,
    total_claims: undefined,
    total_billed: undefined,
    total_paid: undefined,
  }));

  // Log provider access
  auditLogger.info('Provider search performed', {
    userId: req.user?.userId,
    searchParams: { providerId, npi, name, providerType, specialty, state, zipCode, status },
    resultCount: providers.length,
    action: 'PROVIDER_SEARCH',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: {
      providers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// Get a single provider by ID
export const getProvider = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const providerQuery = `
    SELECT 
      p.*,
      COUNT(c.id) as total_claims,
      COALESCE(SUM(c.total_amount), 0) as total_billed,
      COALESCE(SUM(c.paid_amount), 0) as total_paid,
      COUNT(DISTINCT c.member_id) as unique_patients,
      AVG(c.total_amount) as avg_claim_amount
    FROM providers p
    LEFT JOIN claims c ON p.provider_id = c.provider_id
    WHERE p.id = $1
    GROUP BY p.id
  `;

  const result = await query(providerQuery, [id]);

  if (result.rows.length === 0) {
    throw new HealthcareAPIError('Provider not found', 404);
  }

  const row = result.rows[0];
  const provider = {
    ...row,
    address: {
      street1: row.address_line_1,
      street2: row.address_line_2,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
    },
    contractEffectiveDate: row.contract_effective_date,
    contractTerminationDate: row.contract_termination_date,
    licenseNumber: row.license_number,
    licenseState: row.license_state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totalClaims: parseInt(row.total_claims),
    totalBilled: parseFloat(row.total_billed),
    totalPaid: parseFloat(row.total_paid),
    uniquePatients: parseInt(row.unique_patients),
    avgClaimAmount: parseFloat(row.avg_claim_amount) || 0,
  };

  // Remove raw fields from response
  delete provider.address_line_1;
  delete provider.address_line_2;
  delete provider.city;
  delete provider.state;
  delete provider.zip_code;
  delete provider.contract_effective_date;
  delete provider.contract_termination_date;
  delete provider.license_number;
  delete provider.license_state;
  delete provider.created_at;
  delete provider.updated_at;
  delete provider.total_claims;
  delete provider.total_billed;
  delete provider.total_paid;
  delete provider.unique_patients;
  delete provider.avg_claim_amount;

  // Log provider access
  auditLogger.info('Provider record accessed', {
    userId: req.user?.userId,
    providerId: provider.provider_id,
    providerRecordId: id,
    action: 'PROVIDER_VIEW',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: { provider },
  });
});

// Create a new provider
export const createProvider = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const providerData = req.body;

  // Check if provider ID already exists
  const existingProvider = await query(
    'SELECT id FROM providers WHERE provider_id = $1 OR npi = $2',
    [providerData.providerId, providerData.npi]
  );

  if (existingProvider.rows.length > 0) {
    throw new HealthcareAPIError('Provider ID or NPI already exists', 409);
  }

  // Insert new provider
  const insertQuery = `
    INSERT INTO providers (
      provider_id, npi, first_name, last_name, organization_name, provider_type,
      specialty, email, phone, address_line_1, address_line_2, city, state, zip_code,
      license_number, license_state, contract_effective_date, contract_termination_date, status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
    ) RETURNING *
  `;

  const result = await query(insertQuery, [
    providerData.providerId,
    providerData.npi,
    providerData.firstName || null,
    providerData.lastName,
    providerData.organizationName || null,
    providerData.providerType,
    providerData.specialty || null,
    providerData.email || null,
    providerData.phone,
    providerData.address?.street1,
    providerData.address?.street2 || null,
    providerData.address?.city,
    providerData.address?.state,
    providerData.address?.zipCode,
    providerData.licenseNumber || null,
    providerData.licenseState || null,
    providerData.contractEffectiveDate,
    providerData.contractTerminationDate || null,
    'ACTIVE',
  ]);

  const newProvider = result.rows[0];

  // Log provider creation
  auditLogger.info('New provider created', {
    userId: req.user?.userId,
    providerId: newProvider.provider_id,
    providerRecordId: newProvider.id,
    action: 'PROVIDER_CREATE',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(201).json({
    success: true,
    data: { 
      provider: {
        ...newProvider,
        address: {
          street1: newProvider.address_line_1,
          street2: newProvider.address_line_2,
          city: newProvider.city,
          state: newProvider.state,
          zipCode: newProvider.zip_code,
        },
      },
    },
    message: 'Provider created successfully',
  });
});

// Update a provider
export const updateProvider = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  // Check if provider exists
  const existingProvider = await query('SELECT * FROM providers WHERE id = $1', [id]);
  
  if (existingProvider.rows.length === 0) {
    throw new HealthcareAPIError('Provider not found', 404);
  }

  // Build dynamic update query
  const updateFields: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (updateData.firstName !== undefined) {
    updateFields.push(`first_name = $${++paramCount}`);
    params.push(updateData.firstName);
  }

  if (updateData.lastName) {
    updateFields.push(`last_name = $${++paramCount}`);
    params.push(updateData.lastName);
  }

  if (updateData.organizationName !== undefined) {
    updateFields.push(`organization_name = $${++paramCount}`);
    params.push(updateData.organizationName);
  }

  if (updateData.specialty) {
    updateFields.push(`specialty = $${++paramCount}`);
    params.push(updateData.specialty);
  }

  if (updateData.email !== undefined) {
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

  if (updateData.licenseNumber !== undefined) {
    updateFields.push(`license_number = $${++paramCount}`);
    params.push(updateData.licenseNumber);
  }

  if (updateData.licenseState !== undefined) {
    updateFields.push(`license_state = $${++paramCount}`);
    params.push(updateData.licenseState);
  }

  if (updateData.contractTerminationDate !== undefined) {
    updateFields.push(`contract_termination_date = $${++paramCount}`);
    params.push(updateData.contractTerminationDate);
  }

  if (updateFields.length === 0) {
    throw new HealthcareAPIError('No valid update fields provided', 400);
  }

  // Add updated_at field
  updateFields.push(`updated_at = NOW()`);
  params.push(id); // Add ID for WHERE clause

  const updateQuery = `
    UPDATE providers 
    SET ${updateFields.join(', ')}
    WHERE id = $${++paramCount}
    RETURNING *
  `;

  const result = await query(updateQuery, params);
  const updatedProvider = result.rows[0];

  // Log provider update
  auditLogger.info('Provider record updated', {
    userId: req.user?.userId,
    providerId: updatedProvider.provider_id,
    providerRecordId: id,
    updatedFields: Object.keys(updateData),
    action: 'PROVIDER_UPDATE',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: {
      provider: {
        ...updatedProvider,
        address: {
          street1: updatedProvider.address_line_1,
          street2: updatedProvider.address_line_2,
          city: updatedProvider.city,
          state: updatedProvider.state,
          zipCode: updatedProvider.zip_code,
        },
      },
    },
    message: 'Provider updated successfully',
  });
});

// Delete a provider (soft delete - change status to INACTIVE)
export const deleteProvider = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Check if provider exists
  const existingProvider = await query('SELECT * FROM providers WHERE id = $1', [id]);
  
  if (existingProvider.rows.length === 0) {
    throw new HealthcareAPIError('Provider not found', 404);
  }

  // Check if provider has active claims
  const activeClaims = await query(`
    SELECT COUNT(*) as count 
    FROM claims 
    WHERE provider_id = $1 AND status IN ('SUBMITTED', 'PENDING')
  `, [existingProvider.rows[0].provider_id]);

  if (parseInt(activeClaims.rows[0].count) > 0) {
    throw new HealthcareAPIError('Cannot delete provider with active claims', 400);
  }

  // Soft delete - update status to INACTIVE
  const result = await query(`
    UPDATE providers 
    SET status = 'INACTIVE', contract_termination_date = NOW(), updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [id]);

  const inactivatedProvider = result.rows[0];

  // Log provider deletion
  auditLogger.info('Provider record inactivated', {
    userId: req.user?.userId,
    providerId: inactivatedProvider.provider_id,
    providerRecordId: id,
    action: 'PROVIDER_INACTIVATE',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    message: 'Provider inactivated successfully',
  });
});

// Get provider claims history
export const getProviderClaims = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { 
    page = 1, 
    limit = 20,
    status,
    dateFrom,
    dateTo,
  } = req.query as any;

  // Check if provider exists
  const providerExists = await query('SELECT provider_id FROM providers WHERE id = $1', [id]);
  
  if (providerExists.rows.length === 0) {
    throw new HealthcareAPIError('Provider not found', 404);
  }

  const offset = (page - 1) * limit;

  // Build dynamic WHERE clause
  const conditions = [`c.provider_id = $1`];
  const params = [providerExists.rows[0].provider_id];
  let paramCount = 1;

  if (status) {
    conditions.push(`c.status = $${++paramCount}`);
    params.push(status);
  }

  if (dateFrom) {
    conditions.push(`c.service_date >= $${++paramCount}`);
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push(`c.service_date <= $${++paramCount}`);
    params.push(dateTo);
  }

  const whereClause = conditions.join(' AND ');

  // Get provider's claims with member information
  const claimsQuery = `
    SELECT 
      c.*,
      m.first_name as member_first_name,
      m.last_name as member_last_name,
      m.date_of_birth as member_dob
    FROM claims c
    LEFT JOIN members m ON c.member_id = m.member_id
    WHERE ${whereClause}
    ORDER BY c.service_date DESC
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `;

  params.push(limit, offset);
  const result = await query(claimsQuery, params);

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM claims c
    WHERE ${whereClause}
  `;
  
  const countResult = await query(countQuery, params.slice(0, -2)); // Remove limit and offset
  const total = parseInt(countResult.rows[0].total);

  // Log provider claims access
  auditLogger.info('Provider claims accessed', {
    userId: req.user?.userId,
    providerRecordId: id,
    providerId: providerExists.rows[0].provider_id,
    action: 'PROVIDER_CLAIMS_VIEW',
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
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// Get provider statistics
export const getProviderStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { months = 12 } = req.query as any;

  // Check if provider exists
  const providerExists = await query('SELECT provider_id FROM providers WHERE id = $1', [id]);
  
  if (providerExists.rows.length === 0) {
    throw new HealthcareAPIError('Provider not found', 404);
  }

  const providerId = providerExists.rows[0].provider_id;

  // Get comprehensive provider statistics
  const statsQuery = `
    WITH monthly_stats AS (
      SELECT 
        DATE_TRUNC('month', service_date) as month,
        COUNT(*) as claims_count,
        SUM(total_amount) as total_billed,
        SUM(paid_amount) as total_paid,
        COUNT(DISTINCT member_id) as unique_patients,
        AVG(total_amount) as avg_claim_amount
      FROM claims 
      WHERE provider_id = $1 
        AND service_date >= CURRENT_DATE - INTERVAL '${months} months'
      GROUP BY DATE_TRUNC('month', service_date)
      ORDER BY month DESC
    ),
    overall_stats AS (
      SELECT 
        COUNT(*) as total_claims,
        SUM(total_amount) as total_billed,
        SUM(paid_amount) as total_paid,
        COUNT(DISTINCT member_id) as total_patients,
        AVG(total_amount) as avg_claim_amount,
        COUNT(CASE WHEN status = 'DENIED' THEN 1 END) as denied_claims,
        COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_claims
      FROM claims 
      WHERE provider_id = $1 
        AND service_date >= CURRENT_DATE - INTERVAL '${months} months'
    ),
    top_diagnoses AS (
      SELECT 
        primary_diagnosis,
        COUNT(*) as frequency,
        SUM(total_amount) as total_amount
      FROM claims 
      WHERE provider_id = $1 
        AND service_date >= CURRENT_DATE - INTERVAL '${months} months'
      GROUP BY primary_diagnosis
      ORDER BY frequency DESC
      LIMIT 5
    )
    SELECT 
      (SELECT json_agg(monthly_stats) FROM monthly_stats) as monthly_data,
      (SELECT row_to_json(overall_stats) FROM overall_stats) as overall_stats,
      (SELECT json_agg(top_diagnoses) FROM top_diagnoses) as top_diagnoses
  `;

  const result = await query(statsQuery, [providerId]);
  const stats = result.rows[0];

  // Log provider stats access
  auditLogger.info('Provider statistics accessed', {
    userId: req.user?.userId,
    providerRecordId: id,
    providerId: providerId,
    action: 'PROVIDER_STATS_VIEW',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: {
      monthlyData: stats.monthly_data || [],
      overallStats: stats.overall_stats || {},
      topDiagnoses: stats.top_diagnoses || [],
    },
  });
});

export default {
  getProviders,
  getProvider,
  createProvider,
  updateProvider,
  deleteProvider,
  getProviderClaims,
  getProviderStats,
};