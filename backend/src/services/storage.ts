import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { config } from '../config';
import { encrypt, decrypt } from './encryption';

// ─── S3 Client (lazy) ────────────────────────────────────────────────

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: config.storage.s3.endpoint,
      region: config.storage.s3.region,
      credentials: {
        accessKeyId: config.storage.s3.accessKey,
        secretAccessKey: config.storage.s3.secretKey,
      },
      forcePathStyle: config.storage.s3.endpoint.includes('localhost') || config.storage.s3.endpoint.includes('minio'),
    });
  }
  return s3Client;
}

// ─── Path Helpers ────────────────────────────────────────────────────

function localPath(orgId: string, fileId: string): string {
  return path.join(config.storage.localPath, orgId, fileId);
}

async function ensureDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

// ─── Core Storage Operations ─────────────────────────────────────────

/**
 * Store a file locally with AES-256-GCM encryption.
 * Returns metadata about the stored file.
 */
export async function storeLocal(
  orgId: string,
  fileId: string,
  data: Buffer,
  filename: string,
  mimeType: string
): Promise<{
  localPath: string;
  encryptedSize: number;
  originalSize: number;
  checksum: string;
}> {
  const filePath = localPath(orgId, fileId);
  await ensureDir(filePath);

  // Compute checksum before encryption
  const checksum = crypto.createHash('sha256').update(data).digest('hex');

  // Encrypt the data
  const { encrypted } = encrypt(data);

  // Also store metadata (unencrypted, for listing)
  const meta = {
    filename,
    mimeType,
    originalSize: data.length,
    checksum,
    encryptedAt: new Date().toISOString(),
  };
  await fs.writeFile(filePath + '.meta.json', JSON.stringify(meta));

  // Write encrypted data
  await fs.writeFile(filePath, encrypted);

  return {
    localPath: filePath,
    encryptedSize: encrypted.length,
    originalSize: data.length,
    checksum,
  };
}

/**
 * Retrieve and decrypt a file from local storage.
 */
export async function retrieveLocal(orgId: string, fileId: string): Promise<{
  data: Buffer;
  filename: string;
  mimeType: string;
  checksum: string;
}> {
  const filePath = localPath(orgId, fileId);
  const metaPath = filePath + '.meta.json';

  const [encrypted, metaRaw] = await Promise.all([
    fs.readFile(filePath),
    fs.readFile(metaPath, 'utf-8'),
  ]);

  const meta = JSON.parse(metaRaw);
  const data = decrypt(encrypted);

  // Verify integrity
  const checksum = crypto.createHash('sha256').update(data).digest('hex');
  if (checksum !== meta.checksum) {
    throw new Error(`Checksum mismatch for file ${fileId}: expected ${meta.checksum}, got ${checksum}`);
  }

  return {
    data,
    filename: meta.filename,
    mimeType: meta.mimeType,
    checksum,
  };
}

/**
 * Delete a file from local storage.
 */
export async function deleteLocal(orgId: string, fileId: string): Promise<void> {
  const filePath = localPath(orgId, fileId);
  await Promise.allSettled([
    fs.unlink(filePath),
    fs.unlink(filePath + '.meta.json'),
  ]);
}

/**
 * Check if a file exists locally.
 */
export async function existsLocal(orgId: string, fileId: string): Promise<boolean> {
  try {
    await fs.access(localPath(orgId, fileId));
    return true;
  } catch {
    return false;
  }
}

// ─── Cloud Storage (S3-compatible) ───────────────────────────────────

/**
 * Upload encrypted file to S3-compatible cloud storage.
 */
export async function uploadToCloud(
  orgId: string,
  fileId: string,
  data: Buffer,
  filename: string,
  mimeType: string
): Promise<{ key: string; etag?: string }> {
  const s3 = getS3Client();
  const key = `${orgId}/${fileId}`;

  const { encrypted } = encrypt(data);

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: config.storage.s3.bucket,
      Key: key,
      Body: encrypted,
      ContentType: 'application/octet-stream',
      Metadata: {
        filename: encodeURIComponent(filename),
        mimetype: mimeType,
        'original-size': String(data.length),
        'encrypted-at': new Date().toISOString(),
      },
    },
  });

  const result = await upload.done();
  return { key, etag: result.ETag };
}

/**
 * Download and decrypt a file from cloud storage.
 */
export async function downloadFromCloud(orgId: string, fileId: string): Promise<{
  data: Buffer;
  filename: string;
  mimeType: string;
}> {
  const s3 = getS3Client();
  const key = `${orgId}/${fileId}`;

  const response = await s3.send(
    new GetObjectCommand({
      Bucket: config.storage.s3.bucket,
      Key: key,
    })
  );

  if (!response.Body) {
    throw new Error(`File not found in cloud: ${key}`);
  }

  // Convert stream to buffer
  const chunks: Buffer[] = [];
  for await (const chunk of response.Body as AsyncIterable<Buffer>) {
    chunks.push(chunk);
  }
  const encrypted = Buffer.concat(chunks);

  const data = decrypt(encrypted);

  return {
    data,
    filename: response.Metadata?.filename
      ? decodeURIComponent(response.Metadata.filename)
      : fileId,
    mimeType: response.Metadata?.mimetype || 'application/octet-stream',
  };
}

/**
 * Delete a file from cloud storage.
 */
export async function deleteFromCloud(orgId: string, fileId: string): Promise<void> {
  const s3 = getS3Client();
  await s3.send(
    new DeleteObjectCommand({
      Bucket: config.storage.s3.bucket,
      Key: `${orgId}/${fileId}`,
    })
  );
}

/**
 * Check if a file exists in cloud storage.
 */
export async function existsInCloud(orgId: string, fileId: string): Promise<boolean> {
  const s3 = getS3Client();
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: config.storage.s3.bucket,
        Key: `${orgId}/${fileId}`,
      })
    );
    return true;
  } catch {
    return false;
  }
}

// ─── Hybrid Operations ───────────────────────────────────────────────

export interface StorageResult {
  localPath: string;
  cloudKey?: string;
  encryptedSize: number;
  originalSize: number;
  checksum: string;
  synced: boolean;
}

/**
 * Store a file in both local and cloud storage (if sync enabled).
 */
export async function storeHybrid(
  orgId: string,
  fileId: string,
  data: Buffer,
  filename: string,
  mimeType: string
): Promise<StorageResult> {
  // Always store locally first
  const localResult = await storeLocal(orgId, fileId, data, filename, mimeType);

  let cloudKey: string | undefined;
  let synced = false;

  // Upload to cloud if sync is enabled
  if (config.sync.enabled) {
    try {
      const cloudResult = await uploadToCloud(orgId, fileId, data, filename, mimeType);
      cloudKey = cloudResult.key;
      synced = true;
    } catch (err) {
      console.error(`Cloud sync failed for ${fileId}, stored locally only:`, err);
    }
  }

  return {
    localPath: localResult.localPath,
    cloudKey,
    encryptedSize: localResult.encryptedSize,
    originalSize: localResult.originalSize,
    checksum: localResult.checksum,
    synced,
  };
}

/**
 * Retrieve a file - tries local first, falls back to cloud.
 */
export async function retrieveHybrid(orgId: string, fileId: string): Promise<{
  data: Buffer;
  filename: string;
  mimeType: string;
  source: 'local' | 'cloud';
}> {
  // Try local first
  if (await existsLocal(orgId, fileId)) {
    const result = await retrieveLocal(orgId, fileId);
    return { ...result, source: 'local' };
  }

  // Fall back to cloud
  if (config.sync.enabled) {
    const result = await downloadFromCloud(orgId, fileId);

    // Cache locally for future access
    await storeLocal(orgId, fileId, result.data, result.filename, result.mimeType);

    return { ...result, source: 'cloud' };
  }

  throw new Error(`File not found: ${fileId}`);
}

/**
 * Delete a file from both local and cloud storage.
 */
export async function deleteHybrid(orgId: string, fileId: string): Promise<void> {
  const results = await Promise.allSettled([
    deleteLocal(orgId, fileId),
    config.sync.enabled ? deleteFromCloud(orgId, fileId) : Promise.resolve(),
  ]);

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    console.error('Some deletions failed:', failures);
  }
}

/**
 * List files stored locally for an organization.
 */
export async function listLocalFiles(orgId: string): Promise<
  Array<{
    fileId: string;
    filename: string;
    mimeType: string;
    originalSize: number;
    encryptedAt: string;
  }>
> {
  const dir = path.join(config.storage.localPath, orgId);
  try {
    const entries = await fs.readdir(dir);
    const metaFiles = entries.filter((e) => e.endsWith('.meta.json'));

    const files = await Promise.all(
      metaFiles.map(async (metaFile) => {
        const fileId = metaFile.replace('.meta.json', '');
        const metaRaw = await fs.readFile(path.join(dir, metaFile), 'utf-8');
        const meta = JSON.parse(metaRaw);
        return { fileId, ...meta };
      })
    );

    return files;
  } catch {
    return [];
  }
}
