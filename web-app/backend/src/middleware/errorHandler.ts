import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { query } from '../config/database';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

// Custom error class
export class HealthcareAPIError extends Error implements AppError {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handling middleware
export const errorHandler = async (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { statusCode = 500, message } = error;

  // Log error details
  const errorDetails = {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  logger.error('API Error:', errorDetails);

  // Log to database for persistent error tracking
  try {
    await logErrorToDatabase(error, req, statusCode);
  } catch (dbError) {
    logger.error('Failed to log error to database:', dbError);
  }

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = formatValidationError(error);
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Invalid credentials';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    message = 'Resource already exists';
  } else if (error.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Invalid reference to related resource';
  } else if (error.code === '23502') { // PostgreSQL not null violation
    statusCode = 400;
    message = 'Required field is missing';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal server error occurred';
  }

  // Send error response
  const response: any = {
    error: {
      status: statusCode,
      message,
      timestamp: new Date().toISOString(),
    },
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
    response.error.details = errorDetails;
  }

  // Add request ID for tracking
  if (req.headers['x-request-id']) {
    response.error.requestId = req.headers['x-request-id'];
  }

  res.status(statusCode).json(response);
};

async function logErrorToDatabase(error: AppError, req: Request, statusCode: number) {
  const user = (req as any).user;
  
  try {
    await query(`
      INSERT INTO system_errors (
        error_type, severity_level, error_code, error_message,
        server_name, application_component, user_id, request_id,
        stack_trace, request_data, environment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      classifyErrorType(error),
      getSeverityLevel(statusCode),
      error.code || statusCode.toString(),
      error.message,
      process.env.SERVER_NAME || 'healthcare-api',
      getComponentFromPath(req.path),
      user?.userId,
      req.headers['x-request-id'] || null,
      error.stack,
      JSON.stringify({
        method: req.method,
        url: req.originalUrl,
        body: sanitizeRequestData(req.body),
        params: req.params,
        query: req.query,
        headers: sanitizeHeaders(req.headers),
      }),
      process.env.NODE_ENV || 'development'
    ]);
  } catch (dbError) {
    // Don't throw here to avoid infinite recursion
    logger.error('Database error logging failed:', dbError);
  }
}

function classifyErrorType(error: AppError): string {
  if (error.name === 'ValidationError') return 'VALIDATION_ERROR';
  if (error.name === 'UnauthorizedError') return 'AUTHENTICATION_ERROR';
  if (error.code?.startsWith('23')) return 'DATABASE_ERROR';
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) return 'CLIENT_ERROR';
  return 'SYSTEM_ERROR';
}

function getSeverityLevel(statusCode: number): string {
  if (statusCode >= 500) return 'HIGH';
  if (statusCode >= 400) return 'MEDIUM';
  return 'LOW';
}

function getComponentFromPath(path: string): string {
  const segments = path.split('/').filter(s => s);
  if (segments.length >= 2) {
    return `${segments[1]}`;
  }
  return 'unknown';
}

function formatValidationError(error: any): string {
  if (error.details && Array.isArray(error.details)) {
    return error.details.map((detail: any) => detail.message).join('; ');
  }
  return error.message || 'Validation failed';
}

function sanitizeRequestData(data: any): any {
  if (!data) return data;
  
  const sanitized = { ...data };
  const sensitiveFields = ['password', 'ssn', 'social_security_number', 'token', 'apiKey'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

function sanitizeHeaders(headers: any): any {
  const sanitized = { ...headers };
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

// Async error handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found handler
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new HealthcareAPIError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

export default errorHandler;