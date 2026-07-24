import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { orgsApi } from '../lib/api';
import { useToast } from '../components/Toast';
import { Shield, Save, Globe, Key, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    orgsApi
      .getCurrent()
      .then((res) => {
        setName(res.data.organization?.name || '');
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your organization profile and preferences</p>
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
