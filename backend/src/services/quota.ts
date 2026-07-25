import { query } from './db';

export interface QuotaInfo {
  orgQuotaBytes: number;
  orgUsedBytes: number;
  companyQuotaBytes: number | null;
  companyUsedBytes: number;
}

/**
 * Get storage quota info for an org and optionally a company.
 */
export async function getQuota(orgId: string, companyId?: string): Promise<QuotaInfo> {
  const orgResult = await query(
    `SELECT storage_quota_bytes, storage_used_bytes FROM organizations WHERE id = $1`,
    [orgId]
  );

  const orgRow = orgResult.rows[0] as Record<string, any> | undefined;
  const quota: QuotaInfo = {
    orgQuotaBytes: Number(orgRow?.storage_quota_bytes) || 0,
    orgUsedBytes: Number(orgRow?.storage_used_bytes) || 0,
    companyQuotaBytes: null,
    companyUsedBytes: 0,
  };

  if (companyId) {
    const companyResult = await query(
      `SELECT storage_quota_bytes, storage_used_bytes FROM companies WHERE id = $1 AND organization_id = $2`,
      [companyId, orgId]
    );
    const companyRow = companyResult.rows[0] as Record<string, any> | undefined;
    if (companyRow) {
      quota.companyQuotaBytes = companyRow.storage_quota_bytes ? Number(companyRow.storage_quota_bytes) : null;
      quota.companyUsedBytes = Number(companyRow.storage_used_bytes) || 0;
    }
  }

  return quota;
}

/**
 * Check if uploading `size` bytes would exceed quota.
 * Returns { allowed: boolean, reason?: string }
 */
export async function checkQuota(
  orgId: string,
  size: number,
  companyId?: string
): Promise<{ allowed: boolean; reason?: string }> {
  const quota = await getQuota(orgId, companyId);

  // Check org quota
  if (quota.orgQuotaBytes > 0 && quota.orgUsedBytes + size > quota.orgQuotaBytes) {
    const usedGB = (quota.orgUsedBytes / (1024 ** 3)).toFixed(1);
    const totalGB = (quota.orgQuotaBytes / (1024 ** 3)).toFixed(1);
    return { allowed: false, reason: `Organization storage full (${usedGB}GB of ${totalGB}GB used)` };
  }

  // Check company quota (if set)
  if (quota.companyQuotaBytes !== null && quota.companyQuotaBytes > 0 && quota.companyUsedBytes + size > quota.companyQuotaBytes) {
    const usedGB = (quota.companyUsedBytes / (1024 ** 3)).toFixed(1);
    const totalGB = (quota.companyQuotaBytes / (1024 ** 3)).toFixed(1);
    return { allowed: false, reason: `Company storage full (${usedGB}GB of ${totalGB}GB used)` };
  }

  return { allowed: true };
}

/**
 * Track storage usage after a file upload.
 */
export async function trackUsage(orgId: string, size: number, companyId?: string): Promise<void> {
  await query(
    `UPDATE organizations SET storage_used_bytes = storage_used_bytes + $1, updated_at = NOW() WHERE id = $2`,
    [size, orgId]
  );

  if (companyId) {
    await query(
      `UPDATE companies SET storage_used_bytes = storage_used_bytes + $1, updated_at = NOW() WHERE id = $2`,
      [size, companyId]
    );
  }
}

/**
 * Track storage freed after a file deletion.
 */
export async function trackFree(orgId: string, size: number, companyId?: string): Promise<void> {
  await query(
    `UPDATE organizations SET storage_used_bytes = GREATEST(0, storage_used_bytes - $1), updated_at = NOW() WHERE id = $2`,
    [size, orgId]
  );

  if (companyId) {
    await query(
      `UPDATE companies SET storage_used_bytes = GREATEST(0, storage_used_bytes - $1), updated_at = NOW() WHERE id = $2`,
      [size, companyId]
    );
  }
}

/**
 * Set an organization's storage quota (superadmin only).
 */
export async function setOrgQuota(orgId: string, quotaBytes: number): Promise<void> {
  await query(
    `UPDATE organizations SET storage_quota_bytes = $1, updated_at = NOW() WHERE id = $2`,
    [quotaBytes, orgId]
  );
}

/**
 * Set a company's storage quota (org_admin+).
 */
export async function setCompanyQuota(orgId: string, companyId: string, quotaBytes: number): Promise<void> {
  await query(
    `UPDATE companies SET storage_quota_bytes = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`,
    [quotaBytes, companyId, orgId]
  );
}
