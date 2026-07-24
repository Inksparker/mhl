import { Router, Request, Response } from 'express';
import { query } from '../services/db';
import { authenticate } from '../middleware/auth';
import { requireOrgAccess } from '../middleware/rbac';
import { encryptJson, decryptJson } from '../services/encryption';

const router = Router();
router.use(authenticate);

// ─── Create Data Table ───────────────────────────────────────────────

router.post('/:orgId/tables', requireOrgAccess, async (req: Request, res: Response) => {
  const { name, schema } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Table name is required' });
    return;
  }

  const slug = name.toLowerCase().replace(/\s+/g, '_');

  try {
    const result = await query(
      `INSERT INTO data_tables (organization_id, company_id, name, slug, schema)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.orgId, req.user?.companyId || null, name, slug, JSON.stringify(schema || {})]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'A table with this name already exists' });
      return;
    }
    throw err;
  }
});

// ─── List Data Tables ────────────────────────────────────────────────

router.get('/:orgId/tables', requireOrgAccess, async (req: Request, res: Response) => {
  let sql = `SELECT id, name, slug, schema, created_at, updated_at
             FROM data_tables WHERE organization_id = $1`;
  const params: any[] = [req.params.orgId];

  if (req.user?.companyId) {
    sql += ` AND company_id = $2`;
    params.push(req.user.companyId);
  }

  sql += ` ORDER BY name`;

  const result = await query(sql, params);
  res.json({ tables: result.rows });
});

// ─── Create Record ───────────────────────────────────────────────────

router.post('/:orgId/tables/:tableSlug/records', requireOrgAccess, async (req: Request, res: Response) => {
  const { data, encrypt: shouldEncrypt = false } = req.body;

  if (!data || typeof data !== 'object') {
    res.status(400).json({ error: 'Record data is required' });
    return;
  }

  // Get table
  const tableResult = await query(
    `SELECT id FROM data_tables WHERE organization_id = $1 AND slug = $2`,
    [req.params.orgId, req.params.tableSlug]
  );

  if (tableResult.rows.length === 0) {
    res.status(404).json({ error: 'Table not found' });
    return;
  }

  const tableId = tableResult.rows[0].id;

  // Encrypt sensitive data if requested
  let encryptedData: string | null = null;
  if (shouldEncrypt) {
    encryptedData = encryptJson(data);
  }

  const result = await query(
    `INSERT INTO data_records (table_id, organization_id, created_by, data, encrypted_data)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, data, created_at`,
    [tableId, req.params.orgId, req.user!.userId, JSON.stringify(data), encryptedData]
  );

  res.status(201).json({
    ...result.rows[0],
    decrypted: shouldEncrypt ? data : undefined,
  });
});

// ─── List Records ────────────────────────────────────────────────────

router.get('/:orgId/tables/:tableSlug/records', requireOrgAccess, async (req: Request, res: Response) => {
  const { limit = '50', offset = '0', decrypt: shouldDecrypt = 'false' } = req.query;

  const tableResult = await query(
    `SELECT id FROM data_tables WHERE organization_id = $1 AND slug = $2`,
    [req.params.orgId, req.params.tableSlug]
  );

  if (tableResult.rows.length === 0) {
    res.status(404).json({ error: 'Table not found' });
    return;
  }

  const tableId = tableResult.rows[0].id;

  const result = await query(
    `SELECT id, data, encrypted_data, created_at, updated_at
     FROM data_records
     WHERE table_id = $1 AND is_deleted = false
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [tableId, parseInt(limit as string, 10), parseInt(offset as string, 10)]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM data_records WHERE table_id = $1 AND is_deleted = false`,
    [tableId]
  );

  // Decrypt records if requested
  const records = result.rows.map((row: any) => {
    const record: any = { ...row };
    if (shouldDecrypt === 'true' && row.encrypted_data) {
      try {
        record.data = decryptJson(row.encrypted_data);
      } catch {
        record.data = row.data;
      }
    }
    record.encrypted_data = row.encrypted_data ? '[encrypted]' : null;
    return record;
  });

  res.json({
    records,
    total: parseInt(countResult.rows[0].count, 10),
  });
});

// ─── Get Single Record ───────────────────────────────────────────────

router.get('/:orgId/tables/:tableSlug/records/:recordId', requireOrgAccess, async (req: Request, res: Response) => {
  const { decrypt: shouldDecrypt = 'true' } = req.query;

  const result = await query(
    `SELECT dr.id, dr.data, dr.encrypted_data, dr.created_at, dr.updated_at, dt.name as table_name
     FROM data_records dr
     JOIN data_tables dt ON dr.table_id = dt.id
     WHERE dr.id = $1 AND dr.organization_id = $2 AND dr.is_deleted = false`,
    [req.params.recordId, req.params.orgId]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }

  const row = result.rows[0];
  let data = row.data;

  if (shouldDecrypt === 'true' && row.encrypted_data) {
    try {
      data = decryptJson(row.encrypted_data);
    } catch {
      // Return stored data if decryption fails
    }
  }

  res.json({ ...row, data });
});

// ─── Update Record ───────────────────────────────────────────────────

router.put('/:orgId/tables/:tableSlug/records/:recordId', requireOrgAccess, async (req: Request, res: Response) => {
  const { data, encrypt: shouldEncrypt } = req.body;

  if (!data || typeof data !== 'object') {
    res.status(400).json({ error: 'Record data is required' });
    return;
  }

  const updates: string[] = [];
  const values: any[] = [];
  let param = 1;

  updates.push(`data = $${param++}`);
  values.push(JSON.stringify(data));

  if (shouldEncrypt) {
    updates.push(`encrypted_data = $${param++}`);
    values.push(encryptJson(data));
  }

  updates.push(`updated_at = NOW()`);
  values.push(req.params.recordId, req.params.orgId);

  const result = await query(
    `UPDATE data_records SET ${updates.join(', ')}
     WHERE id = $${param++} AND organization_id = $${param++} AND is_deleted = false
     RETURNING id, data, updated_at`,
    values
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }

  res.json(result.rows[0]);
});

// ─── Delete Record ───────────────────────────────────────────────────

router.delete('/:orgId/tables/:tableSlug/records/:recordId', requireOrgAccess, async (req: Request, res: Response) => {
  const result = await query(
    `UPDATE data_records SET is_deleted = true, updated_at = NOW()
     WHERE id = $1 AND organization_id = $2 AND is_deleted = false`,
    [req.params.recordId, req.params.orgId]
  );

  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }

  res.json({ message: 'Record deleted' });
});

// ─── Query Records (search across data) ──────────────────────────────

router.post('/:orgId/query', requireOrgAccess, async (req: Request, res: Response) => {
  const { tableSlug, filter, limit = '50', offset = '0' } = req.body;

  if (!tableSlug) {
    res.status(400).json({ error: 'tableSlug is required' });
    return;
  }

  // Get table ID
  const tableResult = await query(
    `SELECT id FROM data_tables WHERE organization_id = $1 AND slug = $2`,
    [req.params.orgId, tableSlug]
  );

  if (tableResult.rows.length === 0) {
    res.status(404).json({ error: 'Table not found' });
    return;
  }

  const tableId = tableResult.rows[0].id;

  // Build query with JSONB filtering
  let sql = `SELECT id, data, created_at, updated_at
             FROM data_records
             WHERE table_id = $1 AND is_deleted = false`;
  const params: any[] = [tableId];
  let param = 2;

  if (filter && typeof filter === 'object') {
    for (const [key, value] of Object.entries(filter)) {
      sql += ` AND data->>'${key}' = $${param++}`;
      params.push(value);
    }
  }

  sql += ` ORDER BY created_at DESC LIMIT $${param++} OFFSET $${param++}`;
  params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));

  const result = await query(sql, params);

  res.json({ records: result.rows });
});

export default router;
