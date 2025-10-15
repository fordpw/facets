import { Router } from 'express';
import {
  getClaimsSummaryReport,
  getProviderPerformanceReport,
  getMemberEnrollmentReport,
  getFinancialSummaryReport,
  getUtilizationAnalytics,
} from '../controllers/reportsController';
import {
  getExecutiveDashboard,
  getOperationalDashboard,
  getFinancialDashboard,
} from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Dashboard endpoints
router.get('/dashboard/executive', getExecutiveDashboard);
router.get('/dashboard/operational', getOperationalDashboard);
router.get('/dashboard/financial', getFinancialDashboard);

// Analytics and Reports endpoints
router.get('/claims-summary', getClaimsSummaryReport);
router.get('/provider-performance', getProviderPerformanceReport);
router.get('/member-enrollment', getMemberEnrollmentReport);
router.get('/financial-summary', getFinancialSummaryReport);
router.get('/utilization', getUtilizationAnalytics);

export default router;