import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../hooks/useCompany';
import { orgsApi } from '../lib/api';
import { useToast } from '../components/Toast';
import { Shield, Save, Globe, HardDrive, Building2, AlertTriangle } from 'lucide-react';

const GB = 1024 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes === 0) return 'Unlimited';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < GB) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / GB).toFixed(1)} GB`;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { companies } = useCompany();
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Quota state
  const [orgQuotaBytes, setOrgQuotaBytes] = useState(0);
  const [orgUsedBytes, setOrgUsedBytes] = useState(0);
  const [orgQuotaInput, setOrgQuotaInput] = useState('');
  const [isSavingQuota, setIsSavingQuota] = useState(false);
  const [companyQuotas, setCompanyQuotas] = useState<Record<string, { input: string; saving: boolean }>>({});

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    Promise.all([
      orgsApi.getCurrent(),
      orgsApi.getQuota(user.orgId),
    ])
      .then(([orgRes, quotaRes]) => {
        setName(orgRes.data.organization?.name || '');
        setOrgQuotaBytes(quotaRes.data.orgQuotaBytes);
        setOrgUsedBytes(quotaRes.data.orgUsedBytes);
        setOrgQuotaInput(String(Math.round(quotaRes.data.orgQuotaBytes / GB)));
      })
      .catch(() => {
        addToast('error', 'Failed to load settings');
      })
      .finally(() => setIsLoading(false));
  }, [user, addToast]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await orgsApi.update({ name: name.trim() });
      addToast('success', 'Settings saved');
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOrgQuota = async () => {
    if (!user) return;
    const gb = parseFloat(orgQuotaInput);
    if (isNaN(gb) || gb < 0) {
      addToast('error', 'Enter a valid number of GB');
      return;
    }
    setIsSavingQuota(true);
    try {
      await orgsApi.setOrgQuota(user.orgId, Math.round(gb * GB));
      setOrgQuotaBytes(Math.round(gb * GB));
      addToast('success', `Organization quota set to ${gb} GB`);
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed to update quota');
    } finally {
      setIsSavingQuota(false);
    }
  };

  const handleSaveCompanyQuota = async (companyId: string) => {
    if (!user) return;
    const input = companyQuotas[companyId]?.input || '0';
    const gb = parseFloat(input);
    if (isNaN(gb) || gb < 0) {
      addToast('error', 'Enter a valid number of GB');
      return;
    }
    setCompanyQuotas((prev) => ({ ...prev, [companyId]: { ...prev[companyId], saving: true } }));
    try {
      await orgsApi.setCompanyQuota(user.orgId, companyId, gb === 0 ? 0 : Math.round(gb * GB));
      addToast('success', `Company quota set to ${gb === 0 ? 'unlimited' : gb + ' GB'}`);
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed to update company quota');
    } finally {
      setCompanyQuotas((prev) => ({ ...prev, [companyId]: { ...prev[companyId], saving: false } }));
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const orgUsedPercent = orgQuotaBytes > 0 ? Math.min(100, (orgUsedBytes / orgQuotaBytes) * 100) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your organization profile, storage quotas, and preferences</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* General */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-vault-50">
              <Globe className="w-5 h-5 text-vault-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">General</h2>
              <p className="text-sm text-gray-500">Basic organization information</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization ID</label>
              <input
                type="text"
                value={user?.orgId || ''}
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 font-mono text-sm cursor-not-allowed"
              />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-vault-600 text-white rounded-lg hover:bg-vault-700 font-medium text-sm disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Storage Quota */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-50">
              <HardDrive className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Storage Quota</h2>
              <p className="text-sm text-gray-500">Manage storage limits for the organization and companies</p>
            </div>
          </div>

          {/* Org quota */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Organization Total</span>
              <span className="text-sm text-gray-500">
                {formatBytes(orgUsedBytes)} of {orgQuotaBytes > 0 ? formatBytes(orgQuotaBytes) : 'Unlimited'}
              </span>
            </div>
            {/* Usage bar */}
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all ${orgUsedPercent > 90 ? 'bg-red-500' : orgUsedPercent > 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
                style={{ width: `${orgUsedPercent}%` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={orgQuotaInput}
                onChange={(e) => setOrgQuotaInput(e.target.value)}
                min="0"
                step="1"
                className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-transparent outline-none text-sm"
              />
              <span className="text-sm text-gray-500">GB (0 = unlimited)</span>
              <button
                onClick={handleSaveOrgQuota}
                disabled={isSavingQuota}
                className="ml-auto px-3 py-1.5 bg-vault-600 text-white rounded-lg hover:bg-vault-700 text-sm font-medium disabled:opacity-50"
              >
                {isSavingQuota ? 'Saving...' : 'Set Quota'}
              </button>
            </div>
          </div>

          {/* Company quotas */}
          {companies.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Company Quotas</h3>
              <div className="space-y-2">
                {companies.map((company) => {
                  const cq = companyQuotas[company.id] || { input: '0', saving: false };
                  return (
                    <div key={company.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 flex-1">{company.name}</span>
                      <input
                        type="number"
                        value={cq.input}
                        onChange={(e) =>
                          setCompanyQuotas((prev) => ({
                            ...prev,
                            [company.id]: { ...prev[company.id], input: e.target.value },
                          }))
                        }
                        min="0"
                        step="0.1"
                        placeholder="0"
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-vault-500 outline-none"
                      />
                      <span className="text-xs text-gray-400">GB</span>
                      <button
                        onClick={() => handleSaveCompanyQuota(company.id)}
                        disabled={cq.saving}
                        className="px-2.5 py-1 bg-vault-600 text-white rounded hover:bg-vault-700 text-xs font-medium disabled:opacity-50"
                      >
                        {cq.saving ? '...' : 'Set'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Security */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-50">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Security</h2>
              <p className="text-sm text-gray-500">Encryption and access control</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Encryption at Rest</p>
                <p className="text-xs text-gray-500">Files are encrypted with AES-256-GCM</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <Shield className="w-3 h-3" /> Active
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-700">JWT Authentication</p>
                <p className="text-xs text-gray-500">24h access tokens with refresh rotation</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <Shield className="w-3 h-3" /> Active
              </span>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-red-50">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-semibold text-red-700">Danger Zone</h2>
              <p className="text-sm text-red-500">Irreversible actions</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-700">Delete Organization</p>
              <p className="text-xs text-gray-500">Permanently delete all data, files, and records</p>
            </div>
            <button
              disabled
              className="px-4 py-2 border border-red-200 text-red-500 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
