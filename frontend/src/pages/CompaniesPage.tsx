import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { orgsApi, Company } from '../lib/api';
import { useToast } from '../components/Toast';
import { Plus, Building2, X } from 'lucide-react';

export default function CompaniesPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');

  const loadCompanies = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    orgsApi
      .listCompanies(user.orgId)
      .then((res) => setCompanies(res.data.companies || []))
      .catch((err) => {
        addToast('error', 'Failed to load companies');
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, [user, addToast]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const createCompany = async () => {
    if (!user || !newName.trim()) return;
    try {
      await orgsApi.createCompany(user.orgId, { name: newName.trim() });
      addToast('success', `Company "${newName}" created`);
      setNewName('');
      setShowNew(false);
      loadCompanies();
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed to create company');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage companies within your organization
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-vault-600 text-white rounded-lg hover:bg-vault-700 transition font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Company
        </button>
      </div>

      {showNew && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Add Company</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Company name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-transparent outline-none text-sm"
              onKeyDown={(e) => e.key === 'Enter' && createCompany()}
              autoFocus
            />
            <button
              onClick={createCompany}
              disabled={!newName.trim()}
              className="px-4 py-2 bg-vault-600 text-white rounded-lg hover:bg-vault-700 text-sm font-medium disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNew(false);
                setNewName('');
              }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No companies yet</p>
          <p className="text-xs mt-1">Add companies to organize users and data</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Created</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-50">
                        <Building2 className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{company.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                    {new Date(company.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs text-gray-400 font-mono">
                      {company.id.substring(0, 8)}...
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
