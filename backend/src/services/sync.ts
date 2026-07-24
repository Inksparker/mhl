import { config } from '../config';
import { listLocalFiles, existsInCloud, uploadToCloud, downloadFromCloud, storeLocal, retrieveLocal } from './storage';

interface SyncJob {
  id: string;
  orgId: string;
  fileId: string;
  direction: 'upload' | 'download';
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

const syncQueue: SyncJob[] = [];
let syncInterval: NodeJS.Timeout | null = null;

/**
 * Queue a file for sync to cloud.
 */
export function queueUpload(orgId: string, fileId: string): void {
  syncQueue.push({
    id: `${orgId}/${fileId}`,
    orgId,
    fileId,
    direction: 'upload',
    status: 'pending',
  });
}

/**
 * Queue a file for sync from cloud.
 */
export function queueDownload(orgId: string, fileId: string): void {
  syncQueue.push({
    id: `${orgId}/${fileId}`,
    orgId,
    fileId,
    direction: 'download',
    status: 'pending',
  });
}

/**
 * Process the sync queue.
 */
async function processSyncQueue(): Promise<void> {
  const pending = syncQueue.filter((j) => j.status === 'pending');

  for (const job of pending) {
    job.status = 'running';
    job.startedAt = new Date().toISOString();

    try {
      if (job.direction === 'upload') {
        const local = await retrieveLocal(job.orgId, job.fileId);
        await uploadToCloud(job.orgId, job.fileId, local.data, local.filename, local.mimeType);
      } else {
        const cloud = await downloadFromCloud(job.orgId, job.fileId);
        await storeLocal(job.orgId, job.fileId, cloud.data, cloud.filename, cloud.mimeType);
      }
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
    } catch (err: any) {
      job.status = 'failed';
      job.error = err.message;
    }
  }

  // Clean up completed jobs older than 1 hour
  const now = Date.now();
  const filtered = syncQueue.filter((j) => {
    if (j.status === 'completed' || j.status === 'failed') {
      return j.completedAt ? now - new Date(j.completedAt).getTime() < 3600000 : false;
    }
    return true;
  });
  syncQueue.length = 0;
  syncQueue.push(...filtered);
}

/**
 * Full bidirectional sync: upload all local files not in cloud,
 * download all cloud files not locally.
 */
export async function fullSync(orgId: string): Promise<{
  uploaded: number;
  downloaded: number;
  errors: string[];
}> {
  const result = { uploaded: 0, downloaded: 0, errors: [] as string[] };

  // Get local files
  const localFiles = await listLocalFiles(orgId);
  const localIds = new Set(localFiles.map((f) => f.fileId));

  // Upload local-only files to cloud
  for (const file of localFiles) {
    try {
      const exists = await existsInCloud(orgId, file.fileId);
      if (!exists) {
        const local = await retrieveLocal(orgId, file.fileId);
        await uploadToCloud(orgId, file.fileId, local.data, local.filename, local.mimeType);
        result.uploaded++;
      }
    } catch (err: any) {
      result.errors.push(`Upload ${file.fileId}: ${err.message}`);
    }
  }

  // TODO: Download cloud-only files — requires listing S3 objects
  // This is a simplified version; a full implementation would paginate S3 ListObjectsV2

  return result;
}

/**
 * Start the periodic sync service.
 */
export function startSyncService(): void {
  if (!config.sync.enabled) {
    console.log('[Sync] Sync service disabled');
    return;
  }

  console.log(`[Sync] Starting sync service (interval: ${config.sync.intervalSeconds}s)`);

  // Process immediately on start
  processSyncQueue().catch(console.error);

  // Then periodically
  syncInterval = setInterval(() => {
    processSyncQueue().catch(console.error);
  }, config.sync.intervalSeconds * 1000);
}

/**
 * Stop the sync service.
 */
export function stopSyncService(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[Sync] Sync service stopped');
  }
}

/**
 * Get sync status for monitoring.
 */
export function getSyncStatus(): {
  queueLength: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  jobs: SyncJob[];
} {
  return {
    queueLength: syncQueue.length,
    pending: syncQueue.filter((j) => j.status === 'pending').length,
    running: syncQueue.filter((j) => j.status === 'running').length,
    completed: syncQueue.filter((j) => j.status === 'completed').length,
    failed: syncQueue.filter((j) => j.status === 'failed').length,
    jobs: syncQueue,
  };
}
