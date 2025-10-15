import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { logger } from '../utils/logger';

// Different rate limits for different endpoints
const rateLimiters = {
  // General API rate limiting
  general: new RateLimiterMemory({
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 60 seconds
  }),

  // Authentication endpoints (stricter)
  auth: new RateLimiterMemory({
    points: 5, // 5 attempts
    duration: 900, // Per 15 minutes
    blockDuration: 900, // Block for 15 minutes
  }),

  // Search endpoints (moderate)
  search: new RateLimiterMemory({
    points: 30, // 30 requests
    duration: 60, // Per minute
    blockDuration: 60,
  }),

  // Admin endpoints (stricter)
  admin: new RateLimiterMemory({
    points: 20, // 20 requests
    duration: 60, // Per minute
    blockDuration: 120, // Block for 2 minutes
  }),
};

// Get client identifier (IP + User ID if available)
function getClientId(req: any): string {
  const userId = req.user?.userId;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  return userId ? `user:${userId}` : `ip:${ip}`;
}

// Determine which rate limiter to use based on the route
function getRateLimiter(path: string): RateLimiterMemory {
  if (path.includes('/auth/')) {
    return rateLimiters.auth;
  } else if (path.includes('/admin/')) {
    return rateLimiters.admin;
  } else if (path.includes('/search') || path.includes('/members') || path.includes('/providers')) {
    return rateLimiters.search;
  }
  return rateLimiters.general;
}

export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const clientId = getClientId(req);
  const limiter = getRateLimiter(req.path);
  
  try {
    const resRateLimiter: RateLimiterRes = await limiter.consume(clientId);
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': limiter.points,
      'X-RateLimit-Remaining': resRateLimiter.remainingPoints,
      'X-RateLimit-Reset': new Date(Date.now() + resRateLimiter.msBeforeNext).toISOString(),
    });
    
    next();
  } catch (rejRes) {
    const error = rejRes as RateLimiterRes;
    
    // Log rate limit violations
    logger.warn('Rate limit exceeded:', {
      clientId,
      path: req.path,
      method: req.method,
      remainingPoints: error.remainingPoints,
      msBeforeNext: error.msBeforeNext,
      userAgent: req.get('User-Agent'),
    });
    
    // Set rate limit headers for blocked requests
    res.set({
      'X-RateLimit-Limit': limiter.points,
      'X-RateLimit-Remaining': error.remainingPoints || 0,
      'X-RateLimit-Reset': new Date(Date.now() + (error.msBeforeNext || 0)).toISOString(),
      'Retry-After': Math.round((error.msBeforeNext || 0) / 1000),
    });
    
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.round((error.msBeforeNext || 0) / 1000),
    });
  }
};

// Separate rate limiter for failed login attempts
export const loginRateLimiter = new RateLimiterMemory({
  points: 5, // 5 failed attempts
  duration: 900, // 15 minutes
  blockDuration: 900, // Block for 15 minutes
});

export const checkLoginRateLimit = async (identifier: string): Promise<void> => {
  try {
    await loginRateLimiter.consume(identifier);
  } catch (rejRes) {
    const error = rejRes as RateLimiterRes;
    throw new Error(`Too many failed login attempts. Try again in ${Math.round((error.msBeforeNext || 0) / 1000)} seconds.`);
  }
};

export const resetLoginRateLimit = async (identifier: string): Promise<void> => {
  await loginRateLimiter.delete(identifier);
};