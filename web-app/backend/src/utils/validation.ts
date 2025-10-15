import Joi from 'joi';
import { HealthcareAPIError } from '../middleware/errorHandler';

// Healthcare-specific validation patterns
const PATTERNS = {
  SSN: /^\d{3}-?\d{2}-?\d{4}$/,
  NPI: /^[1-9]\d{9}$/,
  CLAIM_NUMBER: /^[A-Z0-9]{8,20}$/,
  MEMBER_ID: /^[A-Z0-9]{6,15}$/,
  PROVIDER_ID: /^[A-Z0-9]{6,12}$/,
  ICD10: /^[A-Z]\d{2}(\.\d{1,3})?$/,
  CPT: /^\d{5}$/,
  HCPCS: /^[A-Z]\d{4}$/,
  DRG: /^\d{3}$/,
  ZIP_CODE: /^\d{5}(-\d{4})?$/,
  PHONE: /^\+?1?[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

// Base validation schemas
export const baseSchemas = {
  id: Joi.number().integer().positive(),
  uuid: Joi.string().uuid(),
  memberId: Joi.string().pattern(PATTERNS.MEMBER_ID).required(),
  providerId: Joi.string().pattern(PATTERNS.PROVIDER_ID),
  npi: Joi.string().pattern(PATTERNS.NPI),
  ssn: Joi.string().pattern(PATTERNS.SSN),
  claimNumber: Joi.string().pattern(PATTERNS.CLAIM_NUMBER),
  icd10: Joi.string().pattern(PATTERNS.ICD10),
  cpt: Joi.string().pattern(PATTERNS.CPT),
  hcpcs: Joi.string().pattern(PATTERNS.HCPCS),
  drg: Joi.string().pattern(PATTERNS.DRG),
  zipCode: Joi.string().pattern(PATTERNS.ZIP_CODE),
  phone: Joi.string().pattern(PATTERNS.PHONE),
  email: Joi.string().pattern(PATTERNS.EMAIL),
  date: Joi.date().iso(),
  currency: Joi.number().precision(2).min(0),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name', 'id'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  },
};

// Member validation schemas
export const memberSchemas = {
  create: Joi.object({
    memberId: baseSchemas.memberId,
    firstName: Joi.string().min(1).max(100).required(),
    lastName: Joi.string().min(1).max(100).required(),
    dateOfBirth: baseSchemas.date.required(),
    gender: Joi.string().valid('M', 'F', 'U').required(),
    ssn: baseSchemas.ssn,
    email: baseSchemas.email,
    phone: baseSchemas.phone,
    address: Joi.object({
      street1: Joi.string().max(255).required(),
      street2: Joi.string().max(255).allow(''),
      city: Joi.string().max(100).required(),
      state: Joi.string().length(2).required(),
      zipCode: baseSchemas.zipCode.required(),
    }),
    effectiveDate: baseSchemas.date.required(),
    terminationDate: baseSchemas.date.allow(null),
    planId: baseSchemas.id.required(),
    employerId: baseSchemas.id,
    relationshipCode: Joi.string().valid('SELF', 'SPOUSE', 'CHILD', 'OTHER').default('SELF'),
  }),
  
  update: Joi.object({
    firstName: Joi.string().min(1).max(100),
    lastName: Joi.string().min(1).max(100),
    email: baseSchemas.email,
    phone: baseSchemas.phone,
    address: Joi.object({
      street1: Joi.string().max(255),
      street2: Joi.string().max(255).allow(''),
      city: Joi.string().max(100),
      state: Joi.string().length(2),
      zipCode: baseSchemas.zipCode,
    }),
    terminationDate: baseSchemas.date.allow(null),
    planId: baseSchemas.id,
    employerId: baseSchemas.id,
  }).min(1),
  
  search: Joi.object({
    memberId: Joi.string(),
    firstName: Joi.string(),
    lastName: Joi.string(),
    dateOfBirth: baseSchemas.date,
    ssn: Joi.string(),
    planId: baseSchemas.id,
    status: Joi.string().valid('ACTIVE', 'TERMINATED', 'SUSPENDED'),
    ...baseSchemas.pagination,
  }),
};

// Provider validation schemas
export const providerSchemas = {
  create: Joi.object({
    providerId: baseSchemas.providerId.required(),
    npi: baseSchemas.npi.required(),
    firstName: Joi.string().max(100),
    lastName: Joi.string().max(100).required(),
    organizationName: Joi.string().max(255),
    providerType: Joi.string().valid('INDIVIDUAL', 'ORGANIZATION').required(),
    specialty: Joi.string().max(100),
    email: baseSchemas.email,
    phone: baseSchemas.phone.required(),
    address: Joi.object({
      street1: Joi.string().max(255).required(),
      street2: Joi.string().max(255).allow(''),
      city: Joi.string().max(100).required(),
      state: Joi.string().length(2).required(),
      zipCode: baseSchemas.zipCode.required(),
    }).required(),
    licenseNumber: Joi.string().max(50),
    licenseState: Joi.string().length(2),
    contractEffectiveDate: baseSchemas.date.required(),
    contractTerminationDate: baseSchemas.date.allow(null),
  }),
  
  update: Joi.object({
    firstName: Joi.string().max(100),
    lastName: Joi.string().max(100),
    organizationName: Joi.string().max(255),
    specialty: Joi.string().max(100),
    email: baseSchemas.email,
    phone: baseSchemas.phone,
    address: Joi.object({
      street1: Joi.string().max(255),
      street2: Joi.string().max(255).allow(''),
      city: Joi.string().max(100),
      state: Joi.string().length(2),
      zipCode: baseSchemas.zipCode,
    }),
    licenseNumber: Joi.string().max(50),
    licenseState: Joi.string().length(2),
    contractTerminationDate: baseSchemas.date.allow(null),
  }).min(1),
  
  search: Joi.object({
    providerId: Joi.string(),
    npi: Joi.string(),
    name: Joi.string(),
    providerType: Joi.string().valid('INDIVIDUAL', 'ORGANIZATION'),
    specialty: Joi.string(),
    state: Joi.string().length(2),
    zipCode: Joi.string(),
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'TERMINATED'),
    ...baseSchemas.pagination,
  }),
};

// Claim validation schemas
export const claimSchemas = {
  create: Joi.object({
    claimNumber: baseSchemas.claimNumber.required(),
    memberId: baseSchemas.memberId.required(),
    providerId: baseSchemas.providerId.required(),
    serviceDate: baseSchemas.date.required(),
    submissionDate: baseSchemas.date.default(() => new Date()),
    claimType: Joi.string().valid('PROFESSIONAL', 'INSTITUTIONAL', 'DENTAL', 'PHARMACY', 'VISION').required(),
    totalAmount: baseSchemas.currency.required(),
    allowedAmount: baseSchemas.currency,
    paidAmount: baseSchemas.currency.default(0),
    deductibleAmount: baseSchemas.currency.default(0),
    coinsuranceAmount: baseSchemas.currency.default(0),
    copayAmount: baseSchemas.currency.default(0),
    primaryDiagnosis: baseSchemas.icd10.required(),
    secondaryDiagnoses: Joi.array().items(baseSchemas.icd10).max(10),
    procedures: Joi.array().items(
      Joi.object({
        code: Joi.alternatives().try(baseSchemas.cpt, baseSchemas.hcpcs).required(),
        modifier: Joi.string().max(10),
        units: Joi.number().integer().min(1).default(1),
        amount: baseSchemas.currency.required(),
      })
    ).min(1).required(),
    placeOfService: Joi.string().length(2).required(),
    authorizationNumber: Joi.string().max(50),
  }),
  
  update: Joi.object({
    status: Joi.string().valid('SUBMITTED', 'PENDING', 'APPROVED', 'DENIED', 'PAID'),
    allowedAmount: baseSchemas.currency,
    paidAmount: baseSchemas.currency,
    deductibleAmount: baseSchemas.currency,
    coinsuranceAmount: baseSchemas.currency,
    copayAmount: baseSchemas.currency,
    denialReason: Joi.string().max(500),
    processedDate: baseSchemas.date,
  }).min(1),
  
  search: Joi.object({
    claimNumber: Joi.string(),
    memberId: Joi.string(),
    providerId: Joi.string(),
    claimType: Joi.string().valid('PROFESSIONAL', 'INSTITUTIONAL', 'DENTAL', 'PHARMACY', 'VISION'),
    status: Joi.string().valid('SUBMITTED', 'PENDING', 'APPROVED', 'DENIED', 'PAID'),
    serviceDate: Joi.object({
      from: baseSchemas.date,
      to: baseSchemas.date,
    }),
    submissionDate: Joi.object({
      from: baseSchemas.date,
      to: baseSchemas.date,
    }),
    amountRange: Joi.object({
      min: baseSchemas.currency,
      max: baseSchemas.currency,
    }),
    primaryDiagnosis: Joi.string(),
    ...baseSchemas.pagination,
  }),
};

// Authentication validation schemas
export const authSchemas = {
  login: Joi.object({
    username: Joi.string().min(3).max(50).required(),
    password: Joi.string().min(8).required(),
    rememberMe: Joi.boolean().default(false),
  }),
  
  register: Joi.object({
    username: Joi.string().min(3).max(50).required(),
    email: baseSchemas.email.required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
    firstName: Joi.string().min(1).max(100).required(),
    lastName: Joi.string().min(1).max(100).required(),
    role: Joi.string().valid('USER', 'ADMIN', 'PROVIDER', 'ANALYST').default('USER'),
  }),
  
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
  }),
  
  resetPassword: Joi.object({
    email: baseSchemas.email.required(),
  }),
  
  confirmReset: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
  }),
};

// Insurance Plan validation schemas
export const planSchemas = {
  create: Joi.object({
    planCode: Joi.string().min(2).max(20).required(),
    planName: Joi.string().min(2).max(200).required(),
    planTypeId: baseSchemas.id.required(),
    taxId: Joi.string().max(20),
    npi: baseSchemas.npi,
    address: Joi.object({
      street1: Joi.string().max(255),
      street2: Joi.string().max(255).allow(''),
      city: Joi.string().max(100),
      state: Joi.string().length(2),
      zipCode: baseSchemas.zipCode,
    }),
    phone: baseSchemas.phone,
    email: baseSchemas.email,
    website: Joi.string().uri(),
    effectiveDate: baseSchemas.date.required(),
    terminationDate: baseSchemas.date.allow(null),
    isActive: Joi.boolean().default(true),
  }),
  
  update: Joi.object({
    planName: Joi.string().min(2).max(200),
    taxId: Joi.string().max(20).allow(null),
    npi: baseSchemas.npi.allow(null),
    address: Joi.object({
      street1: Joi.string().max(255),
      street2: Joi.string().max(255).allow(''),
      city: Joi.string().max(100),
      state: Joi.string().length(2),
      zipCode: baseSchemas.zipCode,
    }),
    phone: baseSchemas.phone.allow(null),
    email: baseSchemas.email.allow(null),
    website: Joi.string().uri().allow(null),
    terminationDate: baseSchemas.date.allow(null),
    isActive: Joi.boolean(),
  }).min(1),
};

// Employer validation schemas
export const employerSchemas = {
  create: Joi.object({
    companyName: Joi.string().min(2).max(200).required(),
    groupNumber: Joi.string().min(3).max(50).required(),
    taxId: Joi.string().max(20),
    address: Joi.object({
      street1: Joi.string().max(255),
      street2: Joi.string().max(255).allow(''),
      city: Joi.string().max(100),
      state: Joi.string().length(2),
      zipCode: baseSchemas.zipCode,
    }),
    phone: baseSchemas.phone,
    email: baseSchemas.email,
    contactPerson: Joi.string().max(200),
    effectiveDate: baseSchemas.date.required(),
    isActive: Joi.boolean().default(true),
  }),
};

// Updated claim validation schemas
export const updatedClaimSchemas = {
  create: Joi.object({
    claimNumber: Joi.string().min(8).max(50),
    memberId: Joi.string().required(),
    providerId: Joi.string().required(),
    serviceDate: baseSchemas.date.required(),
    submissionDate: baseSchemas.date.default(() => new Date()),
    claimType: Joi.string().valid('PROFESSIONAL', 'INSTITUTIONAL', 'DENTAL', 'PHARMACY', 'VISION').required(),
    totalChargeAmount: baseSchemas.currency.required(),
    allowedAmount: baseSchemas.currency.default(0),
    paidAmount: baseSchemas.currency.default(0),
    deductibleAmount: baseSchemas.currency.default(0),
    coinsuranceAmount: baseSchemas.currency.default(0),
    copayAmount: baseSchemas.currency.default(0),
    denialReason: Joi.string().max(500).allow(null),
    diagnosisCodes: Joi.array().items(Joi.string()).default([]),
    procedureCodes: Joi.array().items(Joi.string()).default([]),
    placeOfService: Joi.string().max(10).required(),
  }),
  
  update: Joi.object({
    claimStatus: Joi.string().valid('RECEIVED', 'PROCESSING', 'PAID', 'DENIED', 'PENDED'),
    allowedAmount: baseSchemas.currency,
    paidAmount: baseSchemas.currency,
    deductibleAmount: baseSchemas.currency,
    coinsuranceAmount: baseSchemas.currency,
    copayAmount: baseSchemas.currency,
    denialReason: Joi.string().max(500).allow(null),
    diagnosisCodes: Joi.array().items(Joi.string()),
    procedureCodes: Joi.array().items(Joi.string()),
  }).min(1),
  
  process: Joi.object({
    status: Joi.string().valid('PROCESSED', 'PAID', 'DENIED', 'PENDED').required(),
    allowedAmount: baseSchemas.currency,
    paidAmount: baseSchemas.currency,
    denialReason: Joi.string().max(500).when('status', {
      is: 'DENIED',
      then: Joi.required(),
      otherwise: Joi.allow(null),
    }),
  }),
};

// Analytics validation schemas
export const analyticsSchemas = {
  claimAnalytics: Joi.object({
    dateRange: Joi.object({
      startDate: baseSchemas.date.required(),
      endDate: baseSchemas.date.required(),
    }).required(),
    groupBy: Joi.string().valid('day', 'week', 'month', 'provider', 'diagnosis', 'member').default('month'),
    claimType: Joi.string().valid('PROFESSIONAL', 'INSTITUTIONAL', 'DENTAL', 'PHARMACY', 'VISION'),
    providerId: Joi.string(),
    memberId: Joi.string(),
    metrics: Joi.array().items(
      Joi.string().valid('totalClaims', 'totalAmount', 'avgAmount', 'paidAmount', 'deniedClaims')
    ).min(1).default(['totalClaims', 'totalAmount']),
  }),
  
  memberAnalytics: Joi.object({
    dateRange: Joi.object({
      startDate: baseSchemas.date.required(),
      endDate: baseSchemas.date.required(),
    }).required(),
    planId: baseSchemas.id,
    employerId: baseSchemas.id,
    ageRange: Joi.object({
      min: Joi.number().integer().min(0).max(120),
      max: Joi.number().integer().min(0).max(120),
    }),
    gender: Joi.string().valid('M', 'F', 'U'),
    metrics: Joi.array().items(
      Joi.string().valid('totalMembers', 'newEnrollments', 'terminations', 'utilization')
    ).min(1).default(['totalMembers']),
  }),
  
  fraudAnalytics: Joi.object({
    dateRange: Joi.object({
      startDate: baseSchemas.date.required(),
      endDate: baseSchemas.date.required(),
    }).required(),
    riskLevel: Joi.string().valid('LOW', 'MEDIUM', 'HIGH'),
    providerId: Joi.string(),
    flagTypes: Joi.array().items(
      Joi.string().valid('DUPLICATE_CLAIMS', 'EXCESSIVE_BILLING', 'UNUSUAL_PATTERNS', 'INVALID_CODES')
    ),
    ...baseSchemas.pagination,
  }),
};

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      const validationError = new HealthcareAPIError(
        `Validation failed: ${error.details.map(detail => detail.message).join('; ')}`,
        400
      );
      validationError.name = 'ValidationError';
      (validationError as any).details = error.details;
      return next(validationError);
    }
    
    req.body = value;
    next();
  };
};

// Query parameter validation
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      const validationError = new HealthcareAPIError(
        `Query validation failed: ${error.details.map(detail => detail.message).join('; ')}`,
        400
      );
      validationError.name = 'ValidationError';
      return next(validationError);
    }
    
    req.query = value;
    next();
  };
};

// Parameter validation
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
    });
    
    if (error) {
      const validationError = new HealthcareAPIError(
        `Parameter validation failed: ${error.details.map(detail => detail.message).join('; ')}`,
        400
      );
      validationError.name = 'ValidationError';
      return next(validationError);
    }
    
    req.params = value;
    next();
  };
};

// Healthcare-specific validation utilities
export const validateSSN = (ssn: string): boolean => {
  return PATTERNS.SSN.test(ssn) && !isInvalidSSN(ssn);
};

export const validateNPI = (npi: string): boolean => {
  if (!PATTERNS.NPI.test(npi)) return false;
  return validateNPIChecksum(npi);
};

export const validateICD10 = (code: string): boolean => {
  return PATTERNS.ICD10.test(code);
};

export const validateCPT = (code: string): boolean => {
  return PATTERNS.CPT.test(code);
};

// Helper functions
function isInvalidSSN(ssn: string): boolean {
  const cleaned = ssn.replace(/\D/g, '');
  const invalidSSNs = [
    '000000000', '111111111', '222222222', '333333333',
    '444444444', '555555555', '666666666', '777777777',
    '888888888', '999999999', '123456789'
  ];
  return invalidSSNs.includes(cleaned) || 
         cleaned.startsWith('000') || 
         cleaned.substring(3, 5) === '00' ||
         cleaned.substring(5) === '0000';
}

function validateNPIChecksum(npi: string): boolean {
  // Luhn algorithm for NPI validation
  const digits = npi.split('').map(Number);
  let sum = 0;
  let alternate = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits[i];
    
    if (alternate) {
      n *= 2;
      if (n > 9) n = (n % 10) + 1;
    }
    
    sum += n;
    alternate = !alternate;
  }
  
  return sum % 10 === 0;
}

// Validation middleware exports
export const validateMember = validate(memberSchemas.create);
export const validateMemberUpdate = validate(memberSchemas.update);
export const validateProvider = validate(providerSchemas.create);
export const validateProviderUpdate = validate(providerSchemas.update);
export const validateClaim = validate(updatedClaimSchemas.create);
export const validateClaimUpdate = validate(updatedClaimSchemas.update);
export const validateClaimProcess = validate(updatedClaimSchemas.process);
export const validatePlan = validate(planSchemas.create);
export const validatePlanUpdate = validate(planSchemas.update);
export const validateEmployer = validate(employerSchemas.create);
export const validateEmployerCreate = validate(employerSchemas.create);

export default {
  validate,
  validateQuery,
  validateParams,
  memberSchemas,
  providerSchemas,
  claimSchemas,
  updatedClaimSchemas,
  planSchemas,
  employerSchemas,
  authSchemas,
  analyticsSchemas,
  validateSSN,
  validateNPI,
  validateICD10,
  validateCPT,
  // Middleware exports
  validateMember,
  validateMemberUpdate,
  validateProvider,
  validateProviderUpdate,
  validateClaim,
  validateClaimUpdate,
  validateClaimProcess,
  validatePlan,
  validatePlanUpdate,
  validateEmployer,
  validateEmployerCreate,
};
