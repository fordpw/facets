import { Router } from 'express';
import {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  getPlanMembers,
  getPlanStatistics,
} from '../controllers/plansController';
import { authenticate } from '../middleware/auth';
import { validatePlan, validatePlanUpdate } from '../utils/validation';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /api/plans - Get all insurance plans with filtering and pagination
router.get('/', getPlans);

// GET /api/plans/:id - Get a specific insurance plan
router.get('/:id', getPlan);

// POST /api/plans - Create a new insurance plan
router.post('/', validatePlan, createPlan);

// PUT /api/plans/:id - Update an insurance plan
router.put('/:id', validatePlanUpdate, updatePlan);

// GET /api/plans/:id/members - Get plan members
router.get('/:id/members', getPlanMembers);

// GET /api/plans/:id/statistics - Get plan statistics
router.get('/:id/statistics', getPlanStatistics);

export default router;