import { Router, Request, Response } from 'express';
import argon2 from 'argon2';
import { query } from '../services/db';
import { authenticate, generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth';

const router = Router();

// ─── Register ────────────────────────────────────────────────────────

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, orgName } = req.body;

    if (!email || !password || !fullName || !orgName) {
      res.status(400).json({ error: 'Missing required fields: email, password, fullName, orgName' });
      return;
    }

    if (password.length < 12) {
      res.status(400).json({ error: 'Password must be at least 12 characters' });
      return;
    }

    const passwordHash = await argon2.hash(password);

    // Create org + user in a transaction
    const result = await query(
      `WITH new_org AS (
         INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id
       ),
       new_user AS (
         INSERT INTO users (email, password_hash, full_name, role, organization_id)
         SELECT $3, $4, $5, 'org_admin', id FROM new_org
         RETURNING id, email, full_name, role, organization_id
       )
       SELECT * FROM new_user`,
      [orgName, orgName.toLowerCase().replace(/\s+/g, '-'), email, passwordHash, fullName]
    );

    const user = result.rows[0];

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      orgId: user.organization_id,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token
    await query(
      `UPDATE users SET refresh_token = $1, refresh_token_expires_at = NOW() + INTERVAL '7 days', last_login_at = NOW() WHERE id = $2`,
      [refreshToken, user.id]
    );

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        orgId: user.organization_id,
      },
    });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Login ───────────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const result = await query(
      `SELECT id, email, password_hash, full_name, role, organization_id, company_id, is_active
       FROM users WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      // Constant-time-ish delay to prevent user enumeration
      await argon2.verify('$argon2id$v=19$m=65536,t=3,p=4$fakehash$fakehash', 'fake');
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ error: 'Account is deactivated' });
      return;
    }

    const valid = await argon2.verify(user.password_hash, password);

    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      orgId: user.organization_id,
      companyId: user.company_id || undefined,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token
    await query(
      `UPDATE users SET refresh_token = $1, refresh_token_expires_at = NOW() + INTERVAL '7 days', last_login_at = NOW() WHERE id = $2`,
      [refreshToken, user.id]
    );

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        orgId: user.organization_id,
        companyId: user.company_id,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Refresh Token ───────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    let decoded: any;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    // Check token exists in DB
    const result = await query(
      `SELECT id, refresh_token, refresh_token_expires_at FROM users WHERE id = $1`,
      [decoded.userId]
    );

    const user = result.rows[0];

    if (!user || user.refresh_token !== refreshToken) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    if (new Date(user.refresh_token_expires_at) < new Date()) {
      res.status(401).json({ error: 'Refresh token expired' });
      return;
    }

    // Generate new tokens (rotation)
    const tokenPayload = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      orgId: decoded.orgId,
      companyId: decoded.companyId,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    await query(
      `UPDATE users SET refresh_token = $1, refresh_token_expires_at = NOW() + INTERVAL '7 days' WHERE id = $2`,
      [newRefreshToken, decoded.userId]
    );

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Logout ──────────────────────────────────────────────────────────

router.post('/logout', authenticate, async (req: Request, res: Response) => {
  await query(`UPDATE users SET refresh_token = NULL, refresh_token_expires_at = NULL WHERE id = $1`, [
    req.user!.userId,
  ]);
  res.json({ message: 'Logged out successfully' });
});

export default router;
