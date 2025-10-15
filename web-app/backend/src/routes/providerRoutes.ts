import { Router } from 'express';
import providerController from '../controllers/providerController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateQuery, validateParams, providerSchemas, baseSchemas } from '../utils/validation';
import Joi from 'joi';

const router = Router();

// Parameter validation schema
const providerParamSchema = Joi.object({
  id: baseSchemas.id.required(),
});

// All routes require authentication
router.use(authenticate);

// GET /api/providers - Get all providers with search/filtering
router.get(
  '/',
  validateQuery(providerSchemas.search),
  authorize(['ADMIN', 'ANALYST', 'USER']),
  providerController.getProviders
);

// GET /api/providers/:id - Get single provider
router.get(
  '/:id',
  validateParams(providerParamSchema),
  authorize(['ADMIN', 'ANALYST', 'USER', 'PROVIDER']),
  providerController.getProvider
);

// POST /api/providers - Create new provider (Admin only)
router.post(
  '/',
  validate(providerSchemas.create),
  authorize(['ADMIN']),
  providerController.createProvider
);

// PUT /api/providers/:id - Update provider
router.put(
  '/:id',
  validateParams(providerParamSchema),
  validate(providerSchemas.update),
  authorize(['ADMIN', 'PROVIDER']), // Providers can update their own info
  providerController.updateProvider
);

// DELETE /api/providers/:id - Soft delete provider (Admin only)
router.delete(
  '/:id',
  validateParams(providerParamSchema),
  authorize(['ADMIN']),
  providerController.deleteProvider
);

// GET /api/providers/:id/claims - Get provider's claims history
router.get(
  '/:id/claims',
  validateParams(providerParamSchema),
  validateQuery(Joi.object({
    page: baseSchemas.pagination.page,
    limit: baseSchemas.pagination.limit,
    status: Joi.string().valid('SUBMITTED', 'PENDING', 'APPROVED', 'DENIED', 'PAID'),
    dateFrom: baseSchemas.date,
    dateTo: baseSchemas.date,
  })),
  authorize(['ADMIN', 'ANALYST', 'PROVIDER']),
  providerController.getProviderClaims
);

// GET /api/providers/:id/statistics - Get provider performance statistics
router.get(
  '/:id/statistics',
  validateParams(providerParamSchema),
  validateQuery(Joi.object({
    months: Joi.number().integer().min(1).max(60).default(12),
  })),
  authorize(['ADMIN', 'ANALYST', 'PROVIDER']),
  providerController.getProviderStats
);

export default router;