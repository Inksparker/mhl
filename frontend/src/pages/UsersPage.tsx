import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../hooks/useCompany';
import { orgsApi, OrgUser } from '../lib/api';
import { useToast } from '../components/Toast';
import {
  Users, Shield, Mail, Plus, Edit3, Trash2, X, Save, Loader2,
  Building2, ChevronDown
} from 'lucide-react';

const ROLES = ['superadmin', 'org_admin', 'company_admin', 'member', 'viewer'] as const;

const roleBadge: Record<string, string> = {
  superadmin: 'bg-red-100 text-red-700',
  org_admin: 'bg-purple-100 text-purple-700',
  company_admin: 'bg-blue-100 text-blue-700',
  member: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-700',
};

export default function UsersPage() {
  const { user } = useAuth();
  const { companies } = useCompany();
  const { addToast } = useToast();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add user form
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', fullName: '', role: 'member', companyId: '' });
  const [isAdding, setIsAdding] = useState(false);

  // Edit user state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editCompanyId, setEditCompanyId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadUsers = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    orgsApi
      .listUsers(user.orgId, params)
      .then((res) => {
        setUsers(res.data.users || []);
        setTotal(res.data.total || 0);
      })
      .catch((err) => {
        addToast('error', 'Failed to load users');
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, [user, search, addToast]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsAdding(true);

    try {
      await orgsApi.createUser(user.orgId, {
        email: newUser.email,
        password: newUser.password,
        fullName: newUser.fullName,
        role: newUser.role,
        companyId: newUser.companyId || undefined,
      });
      addToast('success', `User ${newUser.email} created`);
      setShowAdd(false);
      setNewUser({ email: '', password: '', fullName: '', role: 'member', companyId: '' });
      loadUsers();
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed to create user');
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateUser = async (userId: string) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await orgsApi.updateUser(user.orgId, userId, {
        role: editRole,
        companyId: editCompanyId || null,
      });
      addToast('success', 'User updated');
      setEditingId(null);
      loadUsers();
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (u: OrgUser) => {
    if (!user) return;
    if (!confirm(`Deactivate ${u.email}? They will no longer be able to log in.`)) return;
    try {
      await orgsApi.deactivateUser(user.orgId, u.id);
      addToast('success', `User ${u.email} deactivated`);
      loadUsers();
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed to deactivate user');
    }
  };

  const startEdit = (u: OrgUser) => {
    setEditingId(u.id);
    setEditRole(u.role);
    setEditCompanyId(u.companyId || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRole('');
    setEditCompanyId('');
  };

  const canManageUsers = user?.role === 'superadmin' || user?.role === 'org_admin';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} user{total !== 1 ? 's' : ''} in your organization
          </p>
        </div>
        {canManageUsers && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-vault-600 text-white rounded-lg hover:bg-vault-700 transition font-medium text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      {/* Add User Form */}
      {showAdd && (
        <div className="mb-6 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Add New User</h3>
            <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text" required
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-transparent outline-none text-sm"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email" required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-transparent outline-none text-sm"
                  placeholder="user@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password" required minLength={8}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-transparent outline-none text-sm"
                  placeholder="Min. 8 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-transparent outline-none text-sm"
                >
                  {ROLES.filter(r => user?.role === 'superadmin' || r !== 'superadmin').map((r) => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Company (optional)</label>
                <select
                  value={newUser.companyId}
                  onChange={(e) => setNewUser({ ...newUser, companyId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-transparent outline-none text-sm"
                >
                  <option value="">No company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAdding}
                className="flex items-center gap-1.5 px-4 py-2 bg-vault-600 text-white rounded-lg hover:bg-vault-700 text-sm font-medium disabled:opacity-50"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isAdding ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name or email..."
          className="w-full sm:w-72 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-transparent outline-none text-sm"
        />
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">{search ? 'No users match your search' : 'No users found'}</p>
          <p className="text-xs mt-1">{!search && 'Add users using the button above'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Role</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Company</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Joined</th>
                {canManageUsers && <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${editingId === u.id ? 'bg-vault-50' : ''}`}>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-vault-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-vault-600">
                          {u.fullName?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.fullName}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{u.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 hidden sm:table-cell">
                    {editingId === u.id ? (
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-vault-500 outline-none"
                      >
                        {ROLES.filter(r => user?.role === 'superadmin' || r !== 'superadmin').map((r) => (
                          <option key={r} value={r}>{r.replace('_', ' ')}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge[u.role] || 'bg-gray-100 text-gray-700'}`}>
                        <Shield className="w-3 h-3" />
                        {u.role.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 hidden md:table-cell">
                    {editingId === u.id ? (
                      <select
                        value={editCompanyId}
                        onChange={(e) => setEditCompanyId(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-vault-500 outline-none max-w-[140px]"
                      >
                        <option value="">None</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-500">
                        {u.companyId ? companies.find((c) => c.id === u.companyId)?.name || u.companyId.substring(0, 8) : '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500 hidden lg:table-cell">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  {canManageUsers && (
                    <td className="px-6 py-3 text-right">
                      {editingId === u.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleUpdateUser(u.id)}
                            disabled={isSaving}
                            className="p-1.5 hover:bg-green-50 rounded-lg text-green-600"
                            title="Save"
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </button>
                          <button onClick={cancelEdit} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400" title="Cancel">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => startEdit(u)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleDeactivate(u)}
                            className="p-1.5 hover:bg-red-50 rounded-lg"
                            title="Deactivate"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
