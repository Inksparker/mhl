import { Request, Response, NextFunction } from 'express';

type Role = 'superadmin' | 'org_admin' | 'company_admin' | 'member' | 'viewer';

const ROLE_HIERARCHY: Record<Role, number> = {
  superadmin: 100,
  org_admin: 80,
  company_admin: 60,
  member: 40,
  viewer: 20,
};

/**
 * Require a minimum role level.
 */
export function requireRole(minRole: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.user.role as Role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole];

    if (userLevel < requiredLevel) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: minRole,
        current: req.user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Restrict access to the user's own organization.
 * Ensures orgId in token matches the requested orgId.
 */
export function requireOrgAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const requestedOrgId = req.params.orgId || req.body.orgId || req.query.orgId;

  // Superadmins can access any org
  if (req.user.role === 'superadmin') {
    next();
    return;
  }

  if (requestedOrgId && req.user.orgId !== requestedOrgId) {
    res.status(403).json({ error: 'Access denied to this organization' });
    return;
  }

  next();
}

/**
 * Require MFA for sensitive operations (placeholder).
 */
export function requireMfa(req: Request, res: Response, next: NextFunction): void {
  // This would check a custom claim in the JWT or a session flag.
  // For now, it's a no-op that can be extended.
  next();
}

/**
 * Audit log middleware - logs all mutating requests.
 */
export function auditLog(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Capture response
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    res.locals.responseBody = body;
    return originalJson(body);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

    if (isMutating && req.user) {
      // Log to audit - non-blocking
      const { query } = require('../services/db');
      query(
        `INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          req.user.orgId,
          req.user.userId,
          `${req.method} ${req.path}`,
          req.baseUrl.split('/')[2] || 'unknown',
          req.params.id || null,
          JSON.stringify({
            statusCode: res.statusCode,
            duration,
            params: req.params,
            query: req.query,
          }),
          req.ip,
          req.get('user-agent') || null,
        ]
      ).catch((err: Error) => console.error('Audit log error:', err));
    }
  });

  next();
}
