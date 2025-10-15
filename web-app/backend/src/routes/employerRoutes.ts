import { Router } from 'express';
import {
  getEmployers,
  getEmployer,
  createEmployer,
  getEmployerMembers,
} from '../controllers/employersController';
import { authenticate } from '../middleware/auth';
import { validateEmployer, validateEmployerCreate } from '../utils/validation';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /api/employers - Get all employers
router.get('/', getEmployers);

// GET /api/employers/:id - Get a specific employer
router.get('/:id', getEmployer);

// POST /api/employers - Create a new employer
router.post('/', validateEmployerCreate, createEmployer);

// GET /api/employers/:id/members - Get employer's members
router.get('/:id/members', getEmployerMembers);

export default router;