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

// Get claims summary report
export const getClaimsSummaryReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    dateFrom,
    dateTo,
    groupBy = 'month',
    planId,
    providerId,
  } = req.query as any;

  const conditions: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (dateFrom) {
    conditions.push(`c.service_date >= $${++paramCount}`);
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push(`c.service_date <= $${++paramCount}`);
    params.push(dateTo);
  }

  if (planId) {
    conditions.push(`me.health_plan_id = $${++paramCount}`);
    params.push(planId);
  }

  if (providerId) {
    conditions.push(`c.provider_id = $${++paramCount}`);
    params.push(providerId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Determine grouping based on groupBy parameter
  let dateGrouping: string;
  switch (groupBy) {
    case 'day':
      dateGrouping = 'DATE(c.service_date)';
      break;
    case 'week':
      dateGrouping = 'DATE_TRUNC(\'week\', c.service_date)';
      break;
    case 'month':
      dateGrouping = 'DATE_TRUNC(\'month\', c.service_date)';
      break;
    case 'year':
      dateGrouping = 'DATE_TRUNC(\'year\', c.service_date)';
      break;
    default:
      dateGrouping = 'DATE_TRUNC(\'month\', c.service_date)';
  }

  const summaryQuery = `
    SELECT 
      ${dateGrouping} as period,
      COUNT(*) as total_claims,
      COUNT(CASE WHEN c.claim_status = 'RECEIVED' THEN 1 END) as received_claims,
      COUNT(CASE WHEN c.claim_status = 'PROCESSING' THEN 1 END) as processing_claims,
      COUNT(CASE WHEN c.claim_status = 'PAID' THEN 1 END) as paid_claims,
      COUNT(CASE WHEN c.claim_status = 'DENIED' THEN 1 END) as denied_claims,
      COUNT(CASE WHEN c.claim_status = 'PENDED' THEN 1 END) as pended_claims,
      COALESCE(SUM(c.total_charge_amount), 0) as total_charges,
      COALESCE(SUM(c.allowed_amount), 0) as total_allowed,
      COALESCE(SUM(c.paid_amount), 0) as total_paid,
      COALESCE(AVG(c.total_charge_amount), 0) as avg_charge_amount,
      COALESCE(AVG(c.paid_amount), 0) as avg_paid_amount
    FROM claims c
    LEFT JOIN member_enrollments me ON c.member_id = me.member_id
    ${whereClause}
    GROUP BY ${dateGrouping}
    ORDER BY period DESC
  `;

  const result = await query(summaryQuery, params);

  // Transform the data
  const summaryData = result.rows.map(row => ({
    period: row.period,
    totalClaims: parseInt(row.total_claims),
    receivedClaims: parseInt(row.received_claims),
    processingClaims: parseInt(row.processing_claims),
    paidClaims: parseInt(row.paid_claims),
    deniedClaims: parseInt(row.denied_claims),
    pendedClaims: parseInt(row.pended_claims),
    totalCharges: parseFloat(row.total_charges),
    totalAllowed: parseFloat(row.total_allowed),
    totalPaid: parseFloat(row.total_paid),
    avgChargeAmount: parseFloat(row.avg_charge_amount),
    avgPaidAmount: parseFloat(row.avg_paid_amount),
    processingRate: row.total_claims > 0 ? 
      ((parseInt(row.paid_claims) + parseInt(row.denied_claims)) / parseInt(row.total_claims) * 100).toFixed(2) : 0,
    paymentRatio: row.total_charges > 0 ? 
      (parseFloat(row.total_paid) / parseFloat(row.total_charges) * 100).toFixed(2) : 0,
  }));

  auditLogger.info('Claims summary report generated', {
    userId: req.user?.userId,
    dateRange: { dateFrom, dateTo },
    groupBy,
    action: 'CLAIMS_SUMMARY_REPORT',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: {
      summary: summaryData,
      filters: { dateFrom, dateTo, groupBy, planId, providerId },
    },
  });
});

// Get provider performance report
export const getProviderPerformanceReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    dateFrom,
    dateTo,
    limit = 20,
    sortBy = 'total_claims',
    sortOrder = 'desc',
  } = req.query as any;

  const conditions: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (dateFrom) {
    conditions.push(`c.service_date >= $${++paramCount}`);
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push(`c.service_date <= $${++paramCount}`);
    params.push(dateTo);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const performanceQuery = `
    SELECT 
      c.provider_id,
      COALESCE(p.first_name || ' ' || p.last_name, po.org_name) as provider_name,
      p.npi as provider_npi,
      COUNT(*) as total_claims,
      COUNT(CASE WHEN c.claim_status = 'PAID' THEN 1 END) as paid_claims,
      COUNT(CASE WHEN c.claim_status = 'DENIED' THEN 1 END) as denied_claims,
      COALESCE(SUM(c.total_charge_amount), 0) as total_charges,
      COALESCE(SUM(c.paid_amount), 0) as total_paid,
      COALESCE(AVG(c.total_charge_amount), 0) as avg_charge_amount,
      COALESCE(AVG(c.paid_amount), 0) as avg_paid_amount,
      ROUND(
        CASE 
          WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN c.claim_status = 'PAID' THEN 1 END)::DECIMAL / COUNT(*) * 100)
          ELSE 0 
        END, 2
      ) as payment_rate,
      ROUND(
        CASE 
          WHEN SUM(c.total_charge_amount) > 0 THEN (SUM(c.paid_amount)::DECIMAL / SUM(c.total_charge_amount) * 100)
          ELSE 0 
        END, 2
      ) as payment_ratio,
      AVG(EXTRACT(DAYS FROM (c.updated_at - c.submission_date))) as avg_processing_days
    FROM claims c
    LEFT JOIN providers p ON c.provider_id::text = p.provider_id::text
    LEFT JOIN provider_organizations po ON c.provider_id::text = po.provider_org_id::text
    ${whereClause}
    GROUP BY c.provider_id, provider_name, p.npi
    HAVING COUNT(*) >= 1
    ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
    LIMIT $${++paramCount}
  `;

  params.push(limit);
  const result = await query(performanceQuery, params);

  const performanceData = result.rows.map(row => ({
    providerId: row.provider_id,
    providerName: row.provider_name || 'Unknown Provider',
    providerNpi: row.provider_npi,
    totalClaims: parseInt(row.total_claims),
    paidClaims: parseInt(row.paid_claims),
    deniedClaims: parseInt(row.denied_claims),
    totalCharges: parseFloat(row.total_charges),
    totalPaid: parseFloat(row.total_paid),
    avgChargeAmount: parseFloat(row.avg_charge_amount),
    avgPaidAmount: parseFloat(row.avg_paid_amount),
    paymentRate: parseFloat(row.payment_rate),
    paymentRatio: parseFloat(row.payment_ratio),
    avgProcessingDays: parseFloat(row.avg_processing_days || 0),
  }));

  auditLogger.info('Provider performance report generated', {
    userId: req.user?.userId,
    dateRange: { dateFrom, dateTo },
    action: 'PROVIDER_PERFORMANCE_REPORT',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: {
      providers: performanceData,
      filters: { dateFrom, dateTo, sortBy, sortOrder },
    },
  });
});

// Get member enrollment report
export const getMemberEnrollmentReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    dateFrom,
    dateTo,
    groupBy = 'month',
    planId,
  } = req.query as any;

  const conditions: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (dateFrom) {
    conditions.push(`me.effective_date >= $${++paramCount}`);
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push(`me.effective_date <= $${++paramCount}`);
    params.push(dateTo);
  }

  if (planId) {
    conditions.push(`me.health_plan_id = $${++paramCount}`);
    params.push(planId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  let dateGrouping: string;
  switch (groupBy) {
    case 'month':
      dateGrouping = 'DATE_TRUNC(\'month\', me.effective_date)';
      break;
    case 'quarter':
      dateGrouping = 'DATE_TRUNC(\'quarter\', me.effective_date)';
      break;
    case 'year':
      dateGrouping = 'DATE_TRUNC(\'year\', me.effective_date)';
      break;
    default:
      dateGrouping = 'DATE_TRUNC(\'month\', me.effective_date)';
  }

  const enrollmentQuery = `
    SELECT 
      ${dateGrouping} as period,
      hp.plan_code,
      hp.plan_name,
      COUNT(*) as new_enrollments,
      COUNT(CASE WHEN me.relationship_code = 'SELF' THEN 1 END) as primary_enrollments,
      COUNT(CASE WHEN me.relationship_code != 'SELF' THEN 1 END) as dependent_enrollments,
      COUNT(CASE WHEN me.termination_date IS NOT NULL THEN 1 END) as terminated_enrollments
    FROM member_enrollments me
    JOIN health_plans hp ON me.health_plan_id = hp.health_plan_id
    ${whereClause}
    GROUP BY ${dateGrouping}, hp.plan_code, hp.plan_name
    ORDER BY period DESC, hp.plan_name
  `;

  const result = await query(enrollmentQuery, params);

  const enrollmentData = result.rows.map(row => ({
    period: row.period,
    planCode: row.plan_code,
    planName: row.plan_name,
    newEnrollments: parseInt(row.new_enrollments),
    primaryEnrollments: parseInt(row.primary_enrollments),
    dependentEnrollments: parseInt(row.dependent_enrollments),
    terminatedEnrollments: parseInt(row.terminated_enrollments),
    netEnrollmentChange: parseInt(row.new_enrollments) - parseInt(row.terminated_enrollments),
  }));

  auditLogger.info('Member enrollment report generated', {
    userId: req.user?.userId,
    dateRange: { dateFrom, dateTo },
    groupBy,
    action: 'ENROLLMENT_REPORT',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: {
      enrollments: enrollmentData,
      filters: { dateFrom, dateTo, groupBy, planId },
    },
  });
});

// Get financial summary report
export const getFinancialSummaryReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    dateFrom,
    dateTo,
    planId,
  } = req.query as any;

  const conditions: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (dateFrom) {
    conditions.push(`c.service_date >= $${++paramCount}`);
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push(`c.service_date <= $${++paramCount}`);
    params.push(dateTo);
  }

  if (planId) {
    conditions.push(`me.health_plan_id = $${++paramCount}`);
    params.push(planId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get overall financial metrics
  const financialQuery = `
    SELECT 
      hp.plan_code,
      hp.plan_name,
      COUNT(DISTINCT c.id) as total_claims,
      COALESCE(SUM(c.total_charge_amount), 0) as gross_charges,
      COALESCE(SUM(c.allowed_amount), 0) as total_allowed,
      COALESCE(SUM(c.paid_amount), 0) as total_paid,
      COALESCE(SUM(c.deductible_amount), 0) as total_deductible,
      COALESCE(SUM(c.coinsurance_amount), 0) as total_coinsurance,
      COALESCE(SUM(c.copay_amount), 0) as total_copay,
      COALESCE(SUM(c.total_charge_amount - c.allowed_amount), 0) as total_adjustments,
      COALESCE(AVG(c.total_charge_amount), 0) as avg_charge_per_claim,
      COALESCE(AVG(c.paid_amount), 0) as avg_payment_per_claim
    FROM claims c
    JOIN member_enrollments me ON c.member_id = me.member_id
    JOIN health_plans hp ON me.health_plan_id = hp.health_plan_id
    ${whereClause}
    GROUP BY hp.health_plan_id, hp.plan_code, hp.plan_name
    ORDER BY total_paid DESC
  `;

  const result = await query(financialQuery, params);

  // Get top diagnosis codes by cost
  const diagnosisQuery = `
    SELECT 
      jsonb_array_elements_text(c.diagnosis_codes::jsonb) as diagnosis_code,
      COUNT(*) as claim_count,
      COALESCE(SUM(c.paid_amount), 0) as total_cost
    FROM claims c
    JOIN member_enrollments me ON c.member_id = me.member_id
    ${whereClause}
    AND jsonb_array_length(c.diagnosis_codes::jsonb) > 0
    GROUP BY diagnosis_code
    ORDER BY total_cost DESC
    LIMIT 10
  `;

  const diagnosisResult = await query(diagnosisQuery, params);

  // Get top procedure codes by volume
  const procedureQuery = `
    SELECT 
      jsonb_array_elements_text(c.procedure_codes::jsonb) as procedure_code,
      COUNT(*) as procedure_count,
      COALESCE(SUM(c.paid_amount), 0) as total_cost
    FROM claims c
    JOIN member_enrollments me ON c.member_id = me.member_id
    ${whereClause}
    AND jsonb_array_length(c.procedure_codes::jsonb) > 0
    GROUP BY procedure_code
    ORDER BY procedure_count DESC
    LIMIT 10
  `;

  const procedureResult = await query(procedureQuery, params);

  const financialData = result.rows.map(row => ({
    planCode: row.plan_code,
    planName: row.plan_name,
    totalClaims: parseInt(row.total_claims),
    grossCharges: parseFloat(row.gross_charges),
    totalAllowed: parseFloat(row.total_allowed),
    totalPaid: parseFloat(row.total_paid),
    totalDeductible: parseFloat(row.total_deductible),
    totalCoinsurance: parseFloat(row.total_coinsurance),
    totalCopay: parseFloat(row.total_copay),
    totalAdjustments: parseFloat(row.total_adjustments),
    avgChargePerClaim: parseFloat(row.avg_charge_per_claim),
    avgPaymentPerClaim: parseFloat(row.avg_payment_per_claim),
    allowedRatio: row.gross_charges > 0 ? 
      (parseFloat(row.total_allowed) / parseFloat(row.gross_charges) * 100).toFixed(2) : 0,
    paidRatio: row.total_allowed > 0 ? 
      (parseFloat(row.total_paid) / parseFloat(row.total_allowed) * 100).toFixed(2) : 0,
  }));

  auditLogger.info('Financial summary report generated', {
    userId: req.user?.userId,
    dateRange: { dateFrom, dateTo },
    action: 'FINANCIAL_SUMMARY_REPORT',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: {
      financialSummary: financialData,
      topDiagnoses: diagnosisResult.rows.map(row => ({
        diagnosisCode: row.diagnosis_code,
        claimCount: parseInt(row.claim_count),
        totalCost: parseFloat(row.total_cost),
      })),
      topProcedures: procedureResult.rows.map(row => ({
        procedureCode: row.procedure_code,
        procedureCount: parseInt(row.procedure_count),
        totalCost: parseFloat(row.total_cost),
      })),
      filters: { dateFrom, dateTo, planId },
    },
  });
});

// Get utilization analytics
export const getUtilizationAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    dateFrom,
    dateTo,
    planId,
  } = req.query as any;

  const conditions: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (dateFrom) {
    conditions.push(`c.service_date >= $${++paramCount}`);
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push(`c.service_date <= $${++paramCount}`);
    params.push(dateTo);
  }

  if (planId) {
    conditions.push(`me.health_plan_id = $${++paramCount}`);
    params.push(planId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get utilization by place of service
  const utilizationQuery = `
    SELECT 
      c.place_of_service,
      COUNT(*) as service_count,
      COUNT(DISTINCT c.member_id) as unique_members,
      COALESCE(SUM(c.paid_amount), 0) as total_cost,
      COALESCE(AVG(c.paid_amount), 0) as avg_cost_per_service
    FROM claims c
    JOIN member_enrollments me ON c.member_id = me.member_id
    ${whereClause}
    GROUP BY c.place_of_service
    ORDER BY service_count DESC
  `;

  const utilizationResult = await query(utilizationQuery, params);

  // Get member utilization patterns
  const memberUtilizationQuery = `
    SELECT 
      CASE 
        WHEN claim_count = 1 THEN '1 claim'
        WHEN claim_count BETWEEN 2 AND 5 THEN '2-5 claims'
        WHEN claim_count BETWEEN 6 AND 10 THEN '6-10 claims'
        WHEN claim_count BETWEEN 11 AND 20 THEN '11-20 claims'
        ELSE '20+ claims'
      END as utilization_band,
      COUNT(*) as member_count,
      COALESCE(AVG(total_cost), 0) as avg_cost_per_member
    FROM (
      SELECT 
        c.member_id,
        COUNT(*) as claim_count,
        SUM(c.paid_amount) as total_cost
      FROM claims c
      JOIN member_enrollments me ON c.member_id = me.member_id
      ${whereClause}
      GROUP BY c.member_id
    ) member_claims
    GROUP BY utilization_band
    ORDER BY 
      CASE utilization_band
        WHEN '1 claim' THEN 1
        WHEN '2-5 claims' THEN 2
        WHEN '6-10 claims' THEN 3
        WHEN '11-20 claims' THEN 4
        ELSE 5
      END
  `;

  const memberUtilizationResult = await query(memberUtilizationQuery, params);

  res.json({
    success: true,
    data: {
      utilizationByService: utilizationResult.rows.map(row => ({
        placeOfService: row.place_of_service || 'Unknown',
        serviceCount: parseInt(row.service_count),
        uniqueMembers: parseInt(row.unique_members),
        totalCost: parseFloat(row.total_cost),
        avgCostPerService: parseFloat(row.avg_cost_per_service),
      })),
      memberUtilizationPatterns: memberUtilizationResult.rows.map(row => ({
        utilizationBand: row.utilization_band,
        memberCount: parseInt(row.member_count),
        avgCostPerMember: parseFloat(row.avg_cost_per_member),
      })),
      filters: { dateFrom, dateTo, planId },
    },
  });
});

export default {
  getClaimsSummaryReport,
  getProviderPerformanceReport,
  getMemberEnrollmentReport,
  getFinancialSummaryReport,
  getUtilizationAnalytics,
};