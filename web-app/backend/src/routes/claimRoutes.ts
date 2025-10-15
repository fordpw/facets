import { Router } from 'express';
import {
  getClaims,
  getClaim,
  createClaim,
  updateClaim,
  processClaim,
  getClaimStatistics,
} from '../controllers/claimsController';
import { authenticate } from '../middleware/auth';
import { validateClaim, validateClaimUpdate, validateClaimProcess } from '../utils/validation';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /api/claims - Get all claims with filtering and pagination
router.get('/', getClaims);

// GET /api/claims/statistics - Get claim statistics (must come before /:id route)
router.get('/statistics', getClaimStatistics);

// GET /api/claims/:id - Get a specific claim
router.get('/:id', getClaim);

// POST /api/claims - Create a new claim
router.post('/', validateClaim, createClaim);

// PUT /api/claims/:id - Update a claim
router.put('/:id', validateClaimUpdate, updateClaim);

// POST /api/claims/:id/process - Process a claim (update status, amounts)
router.post('/:id/process', validateClaimProcess, processClaim);

export default router;