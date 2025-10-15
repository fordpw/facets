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

// Get executive dashboard summary
export const getExecutiveDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { period = '30' } = req.query as any; // Default to 30 days

  // Get overall metrics for the specified period
  const metricsQuery = `
    SELECT 
      -- Member metrics
      (SELECT COUNT(*) FROM members WHERE is_active = true) as active_members,
      (SELECT COUNT(*) FROM member_enrollments 
       WHERE effective_date >= NOW() - INTERVAL '${period} days' 
       AND termination_date IS NULL) as new_enrollments,
      
      -- Claims metrics
      (SELECT COUNT(*) FROM claims 
       WHERE submission_date >= NOW() - INTERVAL '${period} days') as total_claims,
      (SELECT COUNT(*) FROM claims 
       WHERE claim_status = 'PAID' 
       AND submission_date >= NOW() - INTERVAL '${period} days') as paid_claims,
      (SELECT COUNT(*) FROM claims 
       WHERE claim_status = 'DENIED' 
       AND submission_date >= NOW() - INTERVAL '${period} days') as denied_claims,
      (SELECT COUNT(*) FROM claims 
       WHERE claim_status IN ('RECEIVED', 'PROCESSING', 'PENDED') 
       AND submission_date >= NOW() - INTERVAL '${period} days') as pending_claims,
      
      -- Financial metrics
      (SELECT COALESCE(SUM(total_charge_amount), 0) FROM claims 
       WHERE service_date >= NOW() - INTERVAL '${period} days') as total_charges,
      (SELECT COALESCE(SUM(paid_amount), 0) FROM claims 
       WHERE service_date >= NOW() - INTERVAL '${period} days') as total_payments,
      (SELECT COALESCE(AVG(total_charge_amount), 0) FROM claims 
       WHERE service_date >= NOW() - INTERVAL '${period} days') as avg_claim_amount,
      
      -- Provider metrics
      (SELECT COUNT(DISTINCT provider_id) FROM claims 
       WHERE service_date >= NOW() - INTERVAL '${period} days') as active_providers
  `;

  const metricsResult = await query(metricsQuery);
  const metrics = metricsResult.rows[0];

  // Get claims trend over the last 7 periods (e.g., 7 days, 7 weeks, etc.)
  const trendQuery = `
    SELECT 
      DATE_TRUNC('day', service_date) as period,
      COUNT(*) as claim_count,
      COALESCE(SUM(paid_amount), 0) as total_paid
    FROM claims
    WHERE service_date >= NOW() - INTERVAL '7 days'
    GROUP BY DATE_TRUNC('day', service_date)
    ORDER BY period DESC
  `;

  const trendResult = await query(trendQuery);

  // Get top 5 plans by claims volume
  const topPlansQuery = `
    SELECT 
      hp.plan_name,
      hp.plan_code,
      COUNT(c.id) as claim_count,
      COALESCE(SUM(c.paid_amount), 0) as total_paid
    FROM claims c
    JOIN member_enrollments me ON c.member_id = me.member_id
    JOIN health_plans hp ON me.health_plan_id = hp.health_plan_id
    WHERE c.service_date >= NOW() - INTERVAL '${period} days'
    GROUP BY hp.health_plan_id, hp.plan_name, hp.plan_code
    ORDER BY claim_count DESC
    LIMIT 5
  `;

  const topPlansResult = await query(topPlansQuery);

  // Get claim status distribution
  const statusDistributionQuery = `
    SELECT 
      claim_status,
      COUNT(*) as count,
      COALESCE(SUM(total_charge_amount), 0) as total_amount
    FROM claims
    WHERE submission_date >= NOW() - INTERVAL '${period} days'
    GROUP BY claim_status
    ORDER BY count DESC
  `;

  const statusDistributionResult = await query(statusDistributionQuery);

  // Calculate key performance indicators
  const totalClaims = parseInt(metrics.total_claims) || 0;
  const processingRate = totalClaims > 0 ? 
    ((parseInt(metrics.paid_claims) + parseInt(metrics.denied_claims)) / totalClaims * 100).toFixed(2) : 0;
  
  const paymentRatio = parseFloat(metrics.total_charges) > 0 ? 
    (parseFloat(metrics.total_payments) / parseFloat(metrics.total_charges) * 100).toFixed(2) : 0;

  auditLogger.info('Executive dashboard accessed', {
    userId: req.user?.userId,
    period,
    action: 'EXECUTIVE_DASHBOARD',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: {
      summary: {
        activeMembers: parseInt(metrics.active_members),
        newEnrollments: parseInt(metrics.new_enrollments),
        totalClaims: parseInt(metrics.total_claims),
        paidClaims: parseInt(metrics.paid_claims),
        deniedClaims: parseInt(metrics.denied_claims),
        pendingClaims: parseInt(metrics.pending_claims),
        totalCharges: parseFloat(metrics.total_charges),
        totalPayments: parseFloat(metrics.total_payments),
        avgClaimAmount: parseFloat(metrics.avg_claim_amount),
        activeProviders: parseInt(metrics.active_providers),
        processingRate: parseFloat(processingRate),
        paymentRatio: parseFloat(paymentRatio),
      },
      claimsTrend: trendResult.rows.map(row => ({
        period: row.period,
        claimCount: parseInt(row.claim_count),
        totalPaid: parseFloat(row.total_paid),
      })),
      topPlans: topPlansResult.rows.map(row => ({
        planName: row.plan_name,
        planCode: row.plan_code,
        claimCount: parseInt(row.claim_count),
        totalPaid: parseFloat(row.total_paid),
      })),
      claimStatusDistribution: statusDistributionResult.rows.map(row => ({
        status: row.claim_status,
        count: parseInt(row.count),
        totalAmount: parseFloat(row.total_amount),
        percentage: totalClaims > 0 ? (parseInt(row.count) / totalClaims * 100).toFixed(2) : 0,
      })),
      period: `${period} days`,
      generatedAt: new Date().toISOString(),
    },
  });
});

// Get operational dashboard for daily operations
export const getOperationalDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Get today's metrics
  const todayMetricsQuery = `
    SELECT 
      -- Today's claims
      (SELECT COUNT(*) FROM claims WHERE DATE(submission_date) = CURRENT_DATE) as todays_claims,
      (SELECT COUNT(*) FROM claims 
       WHERE claim_status IN ('RECEIVED', 'PROCESSING') 
       AND DATE(submission_date) = CURRENT_DATE) as todays_pending,
      (SELECT COUNT(*) FROM claims 
       WHERE claim_status = 'PAID' 
       AND DATE(updated_at) = CURRENT_DATE) as todays_processed,
      
      -- Claims requiring attention
      (SELECT COUNT(*) FROM claims 
       WHERE claim_status = 'PENDED' 
       AND submission_date < NOW() - INTERVAL '3 days') as overdue_pended,
      (SELECT COUNT(*) FROM claims 
       WHERE claim_status = 'PROCESSING' 
       AND submission_date < NOW() - INTERVAL '7 days') as overdue_processing,
       
      -- Member activities
      (SELECT COUNT(*) FROM members WHERE DATE(created_at) = CURRENT_DATE) as new_members_today,
      (SELECT COUNT(*) FROM member_enrollments 
       WHERE DATE(effective_date) = CURRENT_DATE) as new_enrollments_today
  `;

  const todayMetricsResult = await query(todayMetricsQuery);
  const todayMetrics = todayMetricsResult.rows[0];

  // Get claims by hour for today (for workload distribution)
  const hourlyClaimsQuery = `
    SELECT 
      EXTRACT(HOUR FROM submission_date) as hour,
      COUNT(*) as claim_count
    FROM claims
    WHERE DATE(submission_date) = CURRENT_DATE
    GROUP BY EXTRACT(HOUR FROM submission_date)
    ORDER BY hour
  `;

  const hourlyClaimsResult = await query(hourlyClaimsQuery);

  // Get claims aging analysis
  const agingAnalysisQuery = `
    SELECT 
      CASE 
        WHEN submission_date >= NOW() - INTERVAL '1 day' THEN '0-1 days'
        WHEN submission_date >= NOW() - INTERVAL '3 days' THEN '1-3 days'
        WHEN submission_date >= NOW() - INTERVAL '7 days' THEN '3-7 days'
        WHEN submission_date >= NOW() - INTERVAL '14 days' THEN '7-14 days'
        WHEN submission_date >= NOW() - INTERVAL '30 days' THEN '14-30 days'
        ELSE '30+ days'
      END as age_bucket,
      COUNT(*) as claim_count,
      claim_status
    FROM claims
    WHERE claim_status IN ('RECEIVED', 'PROCESSING', 'PENDED')
    GROUP BY age_bucket, claim_status
    ORDER BY 
      CASE age_bucket
        WHEN '0-1 days' THEN 1
        WHEN '1-3 days' THEN 2
        WHEN '3-7 days' THEN 3
        WHEN '7-14 days' THEN 4
        WHEN '14-30 days' THEN 5
        ELSE 6
      END,
      claim_status
  `;

  const agingAnalysisResult = await query(agingAnalysisQuery);

  // Get provider alerts (providers with high denial rates)
  const providerAlertsQuery = `
    SELECT 
      c.provider_id,
      COALESCE(p.first_name || ' ' || p.last_name, po.org_name) as provider_name,
      COUNT(*) as total_claims,
      COUNT(CASE WHEN c.claim_status = 'DENIED' THEN 1 END) as denied_claims,
      ROUND((COUNT(CASE WHEN c.claim_status = 'DENIED' THEN 1 END)::DECIMAL / COUNT(*) * 100), 2) as denial_rate
    FROM claims c
    LEFT JOIN providers p ON c.provider_id::text = p.provider_id::text
    LEFT JOIN provider_organizations po ON c.provider_id::text = po.provider_org_id::text
    WHERE c.submission_date >= NOW() - INTERVAL '30 days'
    GROUP BY c.provider_id, provider_name
    HAVING COUNT(*) >= 10 AND 
           (COUNT(CASE WHEN c.claim_status = 'DENIED' THEN 1 END)::DECIMAL / COUNT(*) * 100) > 15
    ORDER BY denial_rate DESC
    LIMIT 10
  `;

  const providerAlertsResult = await query(providerAlertsQuery);

  auditLogger.info('Operational dashboard accessed', {
    userId: req.user?.userId,
    action: 'OPERATIONAL_DASHBOARD',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: {
      todaysSummary: {
        todaysClaims: parseInt(todayMetrics.todays_claims),
        todaysPending: parseInt(todayMetrics.todays_pending),
        todaysProcessed: parseInt(todayMetrics.todays_processed),
        overduePended: parseInt(todayMetrics.overdue_pended),
        overdueProcessing: parseInt(todayMetrics.overdue_processing),
        newMembersToday: parseInt(todayMetrics.new_members_today),
        newEnrollmentsToday: parseInt(todayMetrics.new_enrollments_today),
      },
      hourlyClaims: hourlyClaimsResult.rows.map(row => ({
        hour: parseInt(row.hour),
        claimCount: parseInt(row.claim_count),
      })),
      claimsAging: agingAnalysisResult.rows.map(row => ({
        ageBucket: row.age_bucket,
        claimStatus: row.claim_status,
        count: parseInt(row.claim_count),
      })),
      providerAlerts: providerAlertsResult.rows.map(row => ({
        providerId: row.provider_id,
        providerName: row.provider_name || 'Unknown Provider',
        totalClaims: parseInt(row.total_claims),
        deniedClaims: parseInt(row.denied_claims),
        denialRate: parseFloat(row.denial_rate),
      })),
      generatedAt: new Date().toISOString(),
    },
  });
});

// Get financial dashboard
export const getFinancialDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { period = '30' } = req.query as any;

  // Get financial summary metrics
  const financialSummaryQuery = `
    SELECT 
      COALESCE(SUM(total_charge_amount), 0) as total_charges,
      COALESCE(SUM(allowed_amount), 0) as total_allowed,
      COALESCE(SUM(paid_amount), 0) as total_paid,
      COALESCE(SUM(deductible_amount), 0) as total_deductible,
      COALESCE(SUM(coinsurance_amount), 0) as total_coinsurance,
      COALESCE(SUM(copay_amount), 0) as total_copay,
      COUNT(*) as total_claims,
      COUNT(CASE WHEN claim_status = 'PAID' THEN 1 END) as paid_claims_count
    FROM claims
    WHERE service_date >= NOW() - INTERVAL '${period} days'
  `;

  const financialSummaryResult = await query(financialSummaryQuery);
  const summary = financialSummaryResult.rows[0];

  // Get monthly financial trend
  const monthlyTrendQuery = `
    SELECT 
      DATE_TRUNC('month', service_date) as month,
      COALESCE(SUM(total_charge_amount), 0) as charges,
      COALESCE(SUM(paid_amount), 0) as payments,
      COUNT(*) as claim_count
    FROM claims
    WHERE service_date >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', service_date)
    ORDER BY month DESC
    LIMIT 12
  `;

  const monthlyTrendResult = await query(monthlyTrendQuery);

  // Get cost per member analysis
  const costPerMemberQuery = `
    SELECT 
      hp.plan_name,
      COUNT(DISTINCT me.member_id) as member_count,
      COALESCE(SUM(c.paid_amount), 0) as total_cost,
      COALESCE(SUM(c.paid_amount) / NULLIF(COUNT(DISTINCT me.member_id), 0), 0) as cost_per_member
    FROM member_enrollments me
    JOIN health_plans hp ON me.health_plan_id = hp.health_plan_id
    LEFT JOIN claims c ON me.member_id = c.member_id 
                     AND c.service_date >= NOW() - INTERVAL '${period} days'
    WHERE me.termination_date IS NULL
    GROUP BY hp.health_plan_id, hp.plan_name
    ORDER BY cost_per_member DESC
  `;

  const costPerMemberResult = await query(costPerMemberQuery);

  // Calculate key financial ratios
  const totalCharges = parseFloat(summary.total_charges);
  const totalPaid = parseFloat(summary.total_paid);
  const totalAllowed = parseFloat(summary.total_allowed);
  
  const allowedRatio = totalCharges > 0 ? (totalAllowed / totalCharges * 100).toFixed(2) : 0;
  const paymentRatio = totalAllowed > 0 ? (totalPaid / totalAllowed * 100).toFixed(2) : 0;
  const averageClaimValue = summary.total_claims > 0 ? (totalPaid / parseInt(summary.total_claims)).toFixed(2) : 0;

  res.json({
    success: true,
    data: {
      summary: {
        totalCharges: totalCharges,
        totalAllowed: totalAllowed,
        totalPaid: totalPaid,
        totalDeductible: parseFloat(summary.total_deductible),
        totalCoinsurance: parseFloat(summary.total_coinsurance),
        totalCopay: parseFloat(summary.total_copay),
        totalClaims: parseInt(summary.total_claims),
        paidClaimsCount: parseInt(summary.paid_claims_count),
        allowedRatio: parseFloat(allowedRatio),
        paymentRatio: parseFloat(paymentRatio),
        averageClaimValue: parseFloat(averageClaimValue),
        totalAdjustments: totalCharges - totalAllowed,
      },
      monthlyTrend: monthlyTrendResult.rows.map(row => ({
        month: row.month,
        charges: parseFloat(row.charges),
        payments: parseFloat(row.payments),
        claimCount: parseInt(row.claim_count),
      })),
      costPerMember: costPerMemberResult.rows.map(row => ({
        planName: row.plan_name,
        memberCount: parseInt(row.member_count),
        totalCost: parseFloat(row.total_cost),
        costPerMember: parseFloat(row.cost_per_member),
      })),
      period: `${period} days`,
      generatedAt: new Date().toISOString(),
    },
  });
});

export default {
  getExecutiveDashboard,
  getOperationalDashboard,
  getFinancialDashboard,
};