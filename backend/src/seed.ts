/**
 * Seed script: Creates a superadmin user.
 *
 * Usage: Set env vars (DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY), then:
 *   npm run seed
 *
 * Or on Railway: railway shell → cd backend → npm run seed
 */
import argon2 from 'argon2';
import { pool } from './services/db';
import { config } from './config';

const SUPERADMIN = {
  email: process.env.SEED_EMAIL || 'superadmin@mhl.com',
  password: process.env.SEED_PASSWORD || 'SuperAdmin123!',
  fullName: process.env.SEED_NAME || 'Super Admin',
  orgName: process.env.SEED_ORG || 'MHL',
};

async function seed(): Promise<void> {
  console.log('🌱 Seeding superadmin...');

  try {
    // Check if user already exists
    const existing = await pool.query('SELECT id, role FROM users WHERE email = $1', [SUPERADMIN.email]);

    if (existing.rows.length > 0) {
      // Update role to superadmin
      await pool.query("UPDATE users SET role = 'superadmin' WHERE email = $1", [SUPERADMIN.email]);
      console.log(`✅ User ${SUPERADMIN.email} promoted to superadmin`);
    } else {
      // Create organization + superadmin user
      const passwordHash = await argon2.hash(SUPERADMIN.password);

      await pool.query(
        `WITH new_org AS (
           INSERT INTO organizations (name, slug) VALUES ($1, $2)
           ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
           RETURNING id
         ),
         new_user AS (
           INSERT INTO users (email, password_hash, full_name, role, organization_id)
           SELECT $3, $4, $5, 'superadmin', id FROM new_org
           RETURNING id, email, role
         )
         SELECT * FROM new_user`,
        [SUPERADMIN.orgName, SUPERADMIN.orgName.toLowerCase().replace(/\s+/g, '-'), SUPERADMIN.email, passwordHash, SUPERADMIN.fullName]
      );

      console.log(`✅ Superadmin created: ${SUPERADMIN.email} / ${SUPERADMIN.password}`);
    }
  } catch (err: any) {
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
