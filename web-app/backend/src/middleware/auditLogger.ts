import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from './auth';

interface AuditData {
  userId?: string;
  username?: string;
  sessionId?: string;
  clientIp: string;
  userAgent?: string;
  actionType: string;
  resourceType: string;
  resourceId?: string;
  tableName?: string;
  primaryKeyValue?: string;
  oldValue?: string;
  newValue?: string;
  businessJustification?: string;
  containsPhi?: boolean;
  phiElements?: string[];
  applicationName: string;
  moduleName?: string;
  functionName?: string;
  sqlStatement?: string;
  hipaaCompliant: boolean;
}

// HIPAA-compliant audit logging middleware
export const auditLogger = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  
  // Store original response methods to capture response data
  const originalSend = res.send;
  const originalJson = res.json;
  let responseBody: any;
  let statusCode: number;

  // Override response methods to capture data
  res.send = function(body: any) {
    responseBody = body;
    statusCode = res.statusCode;
    return originalSend.call(this, body);
  };

  res.json = function(body: any) {
    responseBody = body;
    statusCode = res.statusCode;
    return originalJson.call(this, body);
  };

  // Continue with the request
  next();

  // Log after response is sent
  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      
      // Determine if this request should be audited
      if (shouldAuditRequest(req)) {
        await logAuditEvent(req, res, {
          duration,
          statusCode,
          responseBody
        });
      }
      
      // Log PHI access if applicable
      if (containsPHI(req)) {
        await logPHIAccess(req, res);
      }

    } catch (error) {
      logger.error('Audit logging failed:', error);
    }
  });
};

function shouldAuditRequest(req: AuthenticatedRequest): boolean {
  // Always audit authenticated requests
  if (req.user) return true;
  
  // Audit authentication attempts
  if (req.path.includes('/auth/')) return true;
  
  // Audit admin actions
  if (req.path.includes('/admin/')) return true;
  
  // Audit data modifications
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return true;
  
  // Audit sensitive data access
  const sensitiveEndpoints = ['/members/', '/claims/', '/providers/'];
  return sensitiveEndpoints.some(endpoint => req.path.includes(endpoint));
}

function containsPHI(req: AuthenticatedRequest): boolean {
  // Check if request accesses PHI data
  const phiEndpoints = ['/members', '/claims'];
  return phiEndpoints.some(endpoint => req.path.includes(endpoint));
}

async function logAuditEvent(
  req: AuthenticatedRequest,
  res: Response,
  metadata: { duration: number; statusCode: number; responseBody: any }
): Promise<void> {
  const auditData: Partial<AuditData> = {
    userId: req.user?.userId,
    username: req.user?.username,
    clientIp: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent'),
    actionType: getActionType(req.method, req.path),
    resourceType: getResourceType(req.path),
    resourceId: getResourceId(req),
    applicationName: 'healthcare-web-app',
    moduleName: getModuleName(req.path),
    functionName: getFunctionName(req.path),
    containsPhi: containsPHI(req),
    hipaaCompliant: true
  };

  try {
    await query(`
      INSERT INTO audit_log (
        user_id, username, client_ip, user_agent, action_type, 
        resource_type, resource_id, application_name, module_name, 
        function_name, contains_phi, hipaa_compliant, business_justification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      auditData.userId,
      auditData.username,
      auditData.clientIp,
      auditData.userAgent,
      auditData.actionType,
      auditData.resourceType,
      auditData.resourceId,
      auditData.applicationName,
      auditData.moduleName,
      auditData.functionName,
      auditData.containsPhi,
      auditData.hipaaCompliant,
      req.body?.businessJustification || `${req.method} request to ${req.path}`
    ]);

  } catch (error) {
    logger.error('Failed to insert audit log:', error);
  }
}

async function logPHIAccess(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) return;

  try {
    const phiElements = getPHIElements(req.path, req.body);
    const memberId = getMemberIdFromRequest(req);

    await query(`
      INSERT INTO phi_access_log (
        user_id, username, user_role, member_id, phi_type, phi_elements,
        access_reason, access_method, minimum_necessary, source_system,
        client_ip, session_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      req.user.userId,
      req.user.username,
      req.user.roles[0] || 'User', // Primary role
      memberId,
      getPHIType(req.path),
      phiElements,
      req.body?.accessReason || 'API access',
      'API',
      true, // Assume minimum necessary unless specified
      'healthcare-web-app',
      req.ip,
      req.sessionID || 'web-session'
    ]);

  } catch (error) {
    logger.error('Failed to log PHI access:', error);
  }
}

function getActionType(method: string, path: string): string {
  const methodMap: { [key: string]: string } = {
    'GET': 'SELECT',
    'POST': 'INSERT',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE'
  };

  if (path.includes('/auth/login')) return 'LOGIN';
  if (path.includes('/auth/logout')) return 'LOGOUT';
  
  return methodMap[method] || 'ACCESS';
}

function getResourceType(path: string): string {
  if (path.includes('/members')) return 'MEMBER';
  if (path.includes('/claims')) return 'CLAIM';
  if (path.includes('/providers')) return 'PROVIDER';
  if (path.includes('/users') || path.includes('/auth')) return 'USER';
  if (path.includes('/admin')) return 'SYSTEM';
  return 'UNKNOWN';
}

function getResourceId(req: AuthenticatedRequest): string | undefined {
  // Extract ID from path parameters
  const matches = req.path.match(/\/([0-9a-f-]{36}|\d+)(?:\/|$)/i);
  return matches ? matches[1] : undefined;
}

function getModuleName(path: string): string {
  const segments = path.split('/').filter(s => s);
  return segments[1] || 'api'; // Second segment after 'api'
}

function getFunctionName(path: string): string {
  const segments = path.split('/').filter(s => s);
  return segments[2] || 'index'; // Third segment
}

function getPHIElements(path: string, body: any): string[] {
  const elements: string[] = [];
  
  if (path.includes('/members')) {
    elements.push('DEMOGRAPHIC', 'CONTACT', 'IDENTIFICATION');
    if (body && (body.ssn || body.social_security_number)) {
      elements.push('SSN');
    }
  }
  
  if (path.includes('/claims')) {
    elements.push('MEDICAL', 'FINANCIAL');
  }
  
  return elements;
}

function getPHIType(path: string): string {
  if (path.includes('/members')) return 'DEMOGRAPHIC';
  if (path.includes('/claims')) return 'MEDICAL';
  return 'GENERAL';
}

function getMemberIdFromRequest(req: AuthenticatedRequest): string | undefined {
  // Try to extract member ID from various sources
  if (req.params?.memberId) return req.params.memberId;
  if (req.body?.memberId) return req.body.memberId;
  if (req.query?.memberId) return req.query.memberId as string;
  
  // Extract from path if it's a member-related endpoint
  if (req.path.includes('/members/')) {
    const matches = req.path.match(/\/members\/([0-9a-f-]{36})/i);
    return matches ? matches[1] : undefined;
  }
  
  return undefined;
}

export default auditLogger;