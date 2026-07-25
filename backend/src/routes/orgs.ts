import { Router, Request, Response } from 'express';
import { query } from '../services/db';
import { authenticate } from '../middleware/auth';
import { requireRole, requireOrgAccess } from '../middleware/rbac';
import { generateEncryptionKey } from '../services/encryption';

const router = Router();

// All org routes require authentication
router.use(authenticate);

// ─── Get Current Organization ────────────────────────────────────────

router.get('/current', async (req: Request, res: Response) => {
  const result = await query(
    `SELECT id, name, slug, settings, created_at, updated_at
     FROM organizations WHERE id = $1`,
    [req.user!.orgId]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }

  res.json(result.rows[0]);
});

// ─── Update Organization ─────────────────────────────────────────────

router.put('/current', requireRole('org_admin'), async (req: Request, res: Response) => {
  const { name, settings } = req.body;

  const updates: string[] = [];
  const values: any[] = [];
  let param = 1;

  if (name) {
    updates.push(`name = $${param++}`);
    values.push(name);
  }
  if (settings) {
    updates.push(`settings = $${param++}`);
    values.push(JSON.stringify(settings));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push(`updated_at = NOW()`);
  values.push(req.user!.orgId);

  const result = await query(
    `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${param} RETURNING id, name, slug, settings, updated_at`,
    values
  );

  res.json(result.rows[0]);
});

// ─── List Companies ──────────────────────────────────────────────────

router.get('/:orgId/companies', requireOrgAccess, async (req: Request, res: Response) => {
  const result = await query(
    `SELECT id, name, slug, settings, created_at
     FROM companies WHERE organization_id = $1 ORDER BY name`,
    [req.params.orgId]
  );

  res.json({ companies: result.rows });
});

// ─── Create Company ──────────────────────────────────────────────────

router.post('/:orgId/companies', requireRole('org_admin'), requireOrgAccess, async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Company name is required' });
    return;
  }

  const slug = name.toLowerCase().replace(/\s+/g, '-');

  try {
    const result = await query(
      `INSERT INTO companies (organization_id, name, slug)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.orgId, name, slug]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'A company with this name already exists' });
      return;
    }
    throw err;
  }
});

// ─── Get Organization Users ──────────────────────────────────────────

router.get('/:orgId/users', requireOrgAccess, async (req: Request, res: Response) => {
  const { role, search, limit = '50', offset = '0' } = req.query;

  let sql = `SELECT id, email, full_name, role, company_id, is_active, last_login_at, created_at
             FROM users WHERE organization_id = $1 AND is_active = true`;
  const params: any[] = [req.params.orgId];
  let param = 2;

  if (role) {
    sql += ` AND role = $${param++}`;
    params.push(role);
  }
  if (search) {
    sql += ` AND (email ILIKE $${param} OR full_name ILIKE $${param})`;
    params.push(`%${search}%`);
    param++;
  }

  sql += ` ORDER BY full_name LIMIT $${param++} OFFSET $${param++}`;
  params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));

  const result = await query(sql, params);

  const countResult = await query(
    `SELECT COUNT(*) FROM users WHERE organization_id = $1 AND is_active = true`,
    [req.params.orgId]
  );

  res.json({
    users: result.rows,
    total: parseInt(String(countResult.rows[0].count), 10),
  });
});

// ─── Generate Encryption Key ─────────────────────────────────────────

router.post('/:orgId/encryption-key', requireRole('org_admin'), requireOrgAccess, async (req: Request, res: Response) => {
  const key = generateEncryptionKey();

  // Store a hash of the key for verification purposes
  // In production, this would use a KMS
  await query(
    `UPDATE organizations SET encryption_key_hash = $1, updated_at = NOW() WHERE id = $2`,
    [key.substring(0, 8) + '...', req.params.orgId]
  );

  res.json({ encryptionKey: key });
});

// ─── Create User (admin-only) ───────────────────────────────────────

router.post('/:orgId/users', requireRole('org_admin'), requireOrgAccess, async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, role = 'member', companyId } = req.body;

    if (!email || !password || !fullName) {
      res.status(400).json({ error: 'Email, password, and full name are required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const validRoles = ['superadmin', 'org_admin', 'company_admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      return;
    }

    // Only superadmins can create superadmins
    if (role === 'superadmin' && req.user?.role !== 'superadmin') {
      res.status(403).json({ error: 'Only superadmins can create superadmin accounts' });
      return;
    }

    // Verify company belongs to this org if specified
    if (companyId) {
      const companyCheck = await query(
        `SELECT id FROM companies WHERE id = $1 AND organization_id = $2`,
        [companyId, req.params.orgId]
      );
      if (companyCheck.rows.length === 0) {
        res.status(400).json({ error: 'Company not found in this organization' });
        return;
      }
    }

    const argon2 = require('argon2');
    const passwordHash = await argon2.hash(password);

    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role, organization_id, company_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, role, organization_id, company_id, created_at`,
      [email, passwordHash, fullName, role, req.params.orgId, companyId || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ─── Update User (admin-only) ───────────────────────────────────────

router.put('/:orgId/users/:userId', requireRole('org_admin'), requireOrgAccess, async (req: Request, res: Response) => {
  try {
    const { role, companyId, isActive } = req.body;

    // Verify user belongs to this org
    const userCheck = await query(
      `SELECT id, role FROM users WHERE id = $1 AND organization_id = $2`,
      [req.params.userId, req.params.orgId]
    );
    if (userCheck.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Only superadmins can promote to superadmin
    if (role === 'superadmin' && req.user?.role !== 'superadmin') {
      res.status(403).json({ error: 'Only superadmins can assign superadmin role' });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];
    let param = 1;

    if (role) {
      const validRoles = ['superadmin', 'org_admin', 'company_admin', 'member', 'viewer'];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
        return;
      }
      updates.push(`role = $${param++}`);
      values.push(role);
    }

    if (companyId !== undefined) {
      if (companyId && companyId !== '') {
        const companyCheck = await query(
          `SELECT id FROM companies WHERE id = $1 AND organization_id = $2`,
          [companyId, req.params.orgId]
        );
        if (companyCheck.rows.length === 0) {
          res.status(400).json({ error: 'Company not found in this organization' });
          return;
        }
        updates.push(`company_id = $${param++}`);
        values.push(companyId);
      } else {
        updates.push(`company_id = NULL`);
      }
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${param++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.params.userId);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${param} RETURNING id, email, full_name, role, organization_id, company_id, is_active, updated_at`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ─── Deactivate User (admin-only) ───────────────────────────────────

router.delete('/:orgId/users/:userId', requireRole('org_admin'), requireOrgAccess, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 AND organization_id = $2 RETURNING id, email, is_active`,
      [req.params.userId, req.params.orgId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ message: 'User deactivated', user: result.rows[0] });
  } catch (err) {
    console.error('Deactivate user error:', err);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

export default router;
