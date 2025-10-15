import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { logger, auditLog } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    roles: string[];
    permissions: string[];
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'healthcare-secret') as any;
    
    // Get user details from database
    const userResult = await query(`
      SELECT 
        u.user_id,
        u.username,
        u.first_name,
        u.last_name,
        u.email,
        u.department,
        u.is_active,
        array_agg(DISTINCT r.role_name) as roles,
        array_agg(DISTINCT p.permission_name) as permissions
      FROM app_users u
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id AND ur.is_active = true
      LEFT JOIN roles r ON ur.role_id = r.role_id
      LEFT JOIN role_permissions rp ON r.role_id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.permission_id
      WHERE u.user_id = $1 AND u.is_active = true
      GROUP BY u.user_id, u.username, u.first_name, u.last_name, u.email, u.department, u.is_active
    `, [decoded.userId]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = userResult.rows[0];
    req.user = {
      userId: user.user_id,
      username: user.username,
      roles: user.roles.filter((r: string) => r !== null),
      permissions: user.permissions.filter((p: string) => p !== null)
    };

    // Update last activity
    await query(
      'UPDATE app_users SET last_activity = CURRENT_TIMESTAMP WHERE user_id = $1',
      [user.user_id]
    );

    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    auditLog('AUTHENTICATION_FAILED', undefined, { 
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      error: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export const requirePermission = (requiredPermission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.permissions.includes(requiredPermission)) {
      auditLog('PERMISSION_DENIED', req.user.userId, {
        requiredPermission,
        userPermissions: req.user.permissions,
        resource: req.path
      });
      
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: requiredPermission 
      });
    }

    next();
  };
};

export const requireRole = (requiredRoles: string | string[]) => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasRole = roles.some(role => req.user!.roles.includes(role));
    
    if (!hasRole) {
      auditLog('ROLE_ACCESS_DENIED', req.user.userId, {
        requiredRoles: roles,
        userRoles: req.user.roles,
        resource: req.path
      });
      
      return res.status(403).json({ 
        error: 'Insufficient role permissions',
        required: roles 
      });
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    await authenticateToken(req, res, next);
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};