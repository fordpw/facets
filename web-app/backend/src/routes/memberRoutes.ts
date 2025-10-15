import { Router } from 'express';
import memberController from '../controllers/memberController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateQuery, validateParams, memberSchemas, baseSchemas } from '../utils/validation';
import Joi from 'joi';

const router = Router();

// Parameter validation schema
const memberParamSchema = Joi.object({
  id: baseSchemas.id.required(),
});

// All routes require authentication
router.use(authenticate);

// GET /api/members - Get all members with search/filtering
router.get(
  '/',
  validateQuery(memberSchemas.search),
  authorize(['ADMIN', 'ANALYST', 'USER']),
  memberController.getMembers
);

// GET /api/members/:id - Get single member
router.get(
  '/:id',
  validateParams(memberParamSchema),
  authorize(['ADMIN', 'ANALYST', 'USER']),
  memberController.getMember
);

// POST /api/members - Create new member (Admin only)
router.post(
  '/',
  validate(memberSchemas.create),
  authorize(['ADMIN']),
  memberController.createMember
);

// PUT /api/members/:id - Update member (Admin only)
router.put(
  '/:id',
  validateParams(memberParamSchema),
  validate(memberSchemas.update),
  authorize(['ADMIN']),
  memberController.updateMember
);

// DELETE /api/members/:id - Soft delete member (Admin only)
router.delete(
  '/:id',
  validateParams(memberParamSchema),
  authorize(['ADMIN']),
  memberController.deleteMember
);

// GET /api/members/:id/claims - Get member's claims history
router.get(
  '/:id/claims',
  validateParams(memberParamSchema),
  validateQuery(Joi.object({
    page: baseSchemas.pagination.page,
    limit: baseSchemas.pagination.limit,
  })),
  authorize(['ADMIN', 'ANALYST', 'USER']),
  memberController.getMemberClaims
);

export default router;