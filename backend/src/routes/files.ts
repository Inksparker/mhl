import { Router, Request, Response } from 'express';
import multer from 'multer';
import { query } from '../services/db';
import { authenticate } from '../middleware/auth';
import { requireOrgAccess } from '../middleware/rbac';
import { storeHybrid, retrieveHybrid, deleteHybrid, listLocalFiles } from '../services/storage';
import { queueUpload } from '../services/sync';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB max

router.use(authenticate);

// ─── Upload File ─────────────────────────────────────────────────────

router.post(
  '/:orgId/files',
  requireOrgAccess,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      const { tags, folder } = req.body;
      const tagArray = tags ? tags.split(',').map((t: string) => t.trim()) : [];

      // Store file (local + cloud)
      const fileId = require('uuid').v4();
      const storageResult = await storeHybrid(
        req.params.orgId,
        fileId,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      // Save metadata to DB
      const dbResult = await query(
        `INSERT INTO files (id, organization_id, company_id, uploaded_by, filename, mime_type,
           original_size, encrypted_size, checksum, local_path, cloud_key, synced, tags, folder)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id, filename, mime_type, original_size, encrypted_size, synced, tags, folder, created_at`,
        [
          fileId,
          req.params.orgId,
          req.user?.companyId || null,
          req.user!.userId,
          req.file.originalname,
          req.file.mimetype,
          storageResult.originalSize,
          storageResult.encryptedSize,
          storageResult.checksum,
          storageResult.localPath,
          storageResult.cloudKey || null,
          storageResult.synced,
          tagArray,
          folder || null,
        ]
      );

      // If not synced, queue for later sync
      if (!storageResult.synced && storageResult.cloudKey === undefined) {
        queueUpload(req.params.orgId, fileId);
      }

      res.status(201).json(dbResult.rows[0]);
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'File upload failed' });
    }
  }
);

// ─── Download File ───────────────────────────────────────────────────

router.get('/:orgId/files/:fileId', requireOrgAccess, async (req: Request, res: Response) => {
  try {
    // Get metadata from DB
    const metaResult = await query(
      `SELECT filename, mime_type FROM files WHERE id = $1 AND organization_id = $2 AND is_deleted = false`,
      [req.params.fileId, req.params.orgId]
    );

    if (metaResult.rows.length === 0) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const file = await retrieveHybrid(req.params.orgId, req.params.fileId);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Content-Length', file.data.length);
    res.setHeader('X-File-Source', file.source);
    res.send(file.data);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'File download failed' });
  }
});

// ─── Get File Info ───────────────────────────────────────────────────

router.get('/:orgId/files/:fileId/info', requireOrgAccess, async (req: Request, res: Response) => {
  const result = await query(
    `SELECT id, filename, mime_type, original_size, encrypted_size, checksum,
            synced, tags, folder, is_deleted, created_at, updated_at
     FROM files WHERE id = $1 AND organization_id = $2 AND is_deleted = false`,
    [req.params.fileId, req.params.orgId]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  res.json(result.rows[0]);
});

// ─── List Files ──────────────────────────────────────────────────────

router.get('/:orgId/files', requireOrgAccess, async (req: Request, res: Response) => {
  const { folder, tag, search, limit = '50', offset = '0', sort = 'created_at', order = 'desc' } = req.query;

  let sql = `SELECT id, filename, mime_type, original_size, encrypted_size, synced, tags, folder, created_at
             FROM files WHERE organization_id = $1 AND is_deleted = false`;
  const params: any[] = [req.params.orgId];
  let param = 2;

  if (req.user?.companyId) {
    sql += ` AND company_id = $${param++}`;
    params.push(req.user.companyId);
  }

  if (folder) {
    sql += ` AND folder = $${param++}`;
    params.push(folder);
  }

  if (tag) {
    sql += ` AND $${param++} = ANY(tags)`;
    params.push(tag);
  }

  if (search) {
    sql += ` AND filename ILIKE $${param++}`;
    params.push(`%${search}%`);
  }

  // Whitelist sort column
  const allowedSorts = ['created_at', 'filename', 'original_size'];
  const sortCol = allowedSorts.includes(sort as string) ? sort : 'created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  sql += ` ORDER BY ${sortCol} ${sortOrder} LIMIT $${param++} OFFSET $${param++}`;
  params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));

  const result = await query(sql, params);

  // Get total count
  let countSql = `SELECT COUNT(*) FROM files WHERE organization_id = $1 AND is_deleted = false`;
  const countParams: any[] = [req.params.orgId];

  if (req.user?.companyId) {
    countSql += ` AND company_id = $2`;
    countParams.push(req.user.companyId);
  }

  const countResult = await query(countSql, countParams);

  res.json({
    files: result.rows,
    total: parseInt(String(countResult.rows[0].count), 10),
  });
});

// ─── Delete File (soft delete) ───────────────────────────────────────

router.delete('/:orgId/files/:fileId', requireOrgAccess, async (req: Request, res: Response) => {
  // Soft delete in DB
  await query(
    `UPDATE files SET is_deleted = true, updated_at = NOW() WHERE id = $1 AND organization_id = $2`,
    [req.params.fileId, req.params.orgId]
  );

  // Delete actual files
  await deleteHybrid(req.params.orgId, req.params.fileId);

  res.json({ message: 'File deleted' });
});

// ─── List Folders ────────────────────────────────────────────────────

router.get('/:orgId/folders', requireOrgAccess, async (req: Request, res: Response) => {
  const result = await query(
    `SELECT DISTINCT folder, COUNT(*) as file_count
     FROM files
     WHERE organization_id = $1 AND is_deleted = false AND folder IS NOT NULL
     GROUP BY folder ORDER BY folder`,
    [req.params.orgId]
  );

  res.json({ folders: result.rows });
});

// ─── List Tags ───────────────────────────────────────────────────────

router.get('/:orgId/tags', requireOrgAccess, async (req: Request, res: Response) => {
  const result = await query(
    `SELECT DISTINCT unnest(tags) as tag, COUNT(*) as file_count
     FROM files
     WHERE organization_id = $1 AND is_deleted = false AND tags IS NOT NULL
     GROUP BY tag ORDER BY tag`,
    [req.params.orgId]
  );

  res.json({ tags: result.rows });
});

export default router;
