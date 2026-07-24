import React, { useState, useCallback, useEffect, useRef, DragEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { filesApi, FileInfo } from '../lib/api';
import {
  Upload, File, Folder, Tag, Download, Trash2, Search,
  HardDrive, Cloud, Shield, LogOut, Menu, X, Database,
  Plus, ChevronRight, Home, LayoutDashboard
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// ─── Sidebar ─────────────────────────────────────────────────────────

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const links = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/files', icon: Folder, label: 'Files' },
    { to: '/records', icon: Database, label: 'Data Records' },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 h-16 border-b border-gray-200">
          <Shield className="w-6 h-6 text-vault-600" />
          <span className="text-lg font-bold text-gray-900">OrgVault</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-4 space-y-1">
          {links.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${location.pathname === to
                  ? 'bg-vault-50 text-vault-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-200">
          <div className="mb-2 px-3">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Dashboard Page ──────────────────────────────────────────────────

function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ files: 0, folders: 0, records: 0, synced: 0 });
  const [recentFiles, setRecentFiles] = useState<FileInfo[]>([]);

  useEffect(() => {
    if (!user) return;

    // Load stats
    filesApi.list(user.orgId, { limit: '5', sort: 'created_at', order: 'desc' })
      .then((res) => setRecentFiles(res.data.files))
      .catch(console.error);

    filesApi.folders(user.orgId)
      .then((res) => setStats((s) => ({ ...s, folders: res.data.folders.length })))
      .catch(console.error);

    // Get total count
    filesApi.list(user.orgId, { limit: '1' })
      .then((res) => setStats((s) => ({ ...s, files: res.data.total })))
      .catch(console.error);
  }, [user]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Files', value: stats.files, icon: File, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Folders', value: stats.folders, icon: Folder, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Synced to Cloud', value: stats.synced, icon: Cloud, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Local Storage', value: stats.files, icon: HardDrive, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{label}</span>
              <div className={`p-2 rounded-lg ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent Files */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Files</h2>
          <Link to="/files" className="text-sm text-vault-600 hover:text-vault-800 font-medium">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recentFiles.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No files uploaded yet</p>
              <Link to="/files" className="text-sm text-vault-600 hover:text-vault-800 mt-1 inline-block">
                Upload your first file
              </Link>
            </div>
          ) : (
            recentFiles.map((file) => (
              <div key={file.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <File className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.filename}</p>
                    <p className="text-xs text-gray-500">
                      {formatSize(file.original_size)} · {new Date(file.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {file.synced && <Cloud className="w-4 h-4 text-green-500" />}
                  {file.tags?.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Files Page ──────────────────────────────────────────────────────

function FilesPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(() => {
    if (!user) return;
    filesApi.list(user.orgId, {
      limit: '100',
      sort: 'created_at',
      order: 'desc',
      ...(search ? { search } : {}),
      ...(currentFolder ? { folder: currentFolder } : {}),
    })
      .then((res) => {
        setFiles(res.data.files);
        setTotal(res.data.total);
      })
      .catch(console.error);
  }, [user, search, currentFolder]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const handleUpload = async (fileList: FileList | File[]) => {
    if (!user) return;
    setIsUploading(true);
    const files = Array.from(fileList);

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      if (currentFolder) formData.append('folder', currentFolder);

      try {
        await filesApi.upload(user.orgId, formData);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }

    setIsUploading(false);
    loadFiles();
  };

  const handleDownload = async (file: FileInfo) => {
    if (!user) return;
    try {
      const res = await filesApi.download(user.orgId, file.id);
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleDelete = async (file: FileInfo) => {
    if (!user || !confirm(`Delete "${file.filename}"?`)) return;
    try {
      await filesApi.delete(user.orgId, file.id);
      loadFiles();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const onDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const onDragLeave = () => setIsDragOver(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Files</h1>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2 px-4 py-2 bg-vault-600 text-white rounded-lg hover:bg-vault-700 transition font-medium text-sm disabled:opacity-50"
        >
          {isUploading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          Upload
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search files..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Drop zone for upload */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`mb-4 border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
          ${isDragOver ? 'drop-zone-active border-vault-400' : 'border-gray-200 hover:border-gray-300'}`}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Drag & drop files here, or click to browse</p>
        <p className="text-xs text-gray-400 mt-1">Max file size: 500 MB</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => e.target.files && handleUpload(e.target.files)}
      />

      {/* File list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {files.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-400">
            <File className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{search ? 'No files match your search' : 'No files in this folder'}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Size</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Date</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50 group">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <File className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[200px] sm:max-w-xs">
                          {file.filename}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {file.synced && (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <Cloud className="w-3 h-3" /> Synced
                            </span>
                          )}
                          {file.tags?.map((tag) => (
                            <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500 hidden sm:table-cell">
                    {formatSize(file.original_size)}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500 hidden md:table-cell">
                    {new Date(file.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => handleDownload(file)} className="p-1.5 hover:bg-gray-100 rounded" title="Download">
                        <Download className="w-4 h-4 text-gray-500" />
                      </button>
                      <button onClick={() => handleDelete(file)} className="p-1.5 hover:bg-red-50 rounded" title="Delete">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {total > files.length && (
        <p className="text-xs text-gray-400 mt-2 text-right">
          Showing {files.length} of {total} files
        </p>
      )}
    </div>
  );
}

// ─── Records Page (Structured Data) ─────────────────────────────────

function RecordsPage() {
  const { user } = useAuth();
  const [tables, setTables] = useState<Array<{ id: string; name: string; slug: string; schema: any }>>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [records, setRecords] = useState<Array<{ id: string; data: any }>>([]);
  const [newTableName, setNewTableName] = useState('');
  const [showNewTable, setShowNewTable] = useState(false);

  const loadTables = useCallback(() => {
    if (!user) return;
    fetch(`/api/data/${user.orgId}/tables`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    })
      .then((res) => res.json())
      .then((data) => setTables(data.tables || []))
      .catch(console.error);
  }, [user]);

  useEffect(() => { loadTables(); }, [loadTables]);

  const loadRecords = useCallback((slug: string) => {
    if (!user) return;
    setSelectedTable(slug);
    fetch(`/api/data/${user.orgId}/tables/${slug}/records?decrypt=true&limit=50`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    })
      .then((res) => res.json())
      .then((data) => setRecords(data.records || []))
      .catch(console.error);
  }, [user]);

  const createTable = async () => {
    if (!user || !newTableName.trim()) return;
    try {
      await fetch(`/api/data/${user.orgId}/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ name: newTableName }),
      });
      setNewTableName('');
      setShowNewTable(false);
      loadTables();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Records</h1>
        <button
          onClick={() => setShowNewTable(true)}
          className="flex items-center gap-2 px-4 py-2 bg-vault-600 text-white rounded-lg hover:bg-vault-700 transition font-medium text-sm"
        >
          <Plus className="w-4 h-4" /> New Table
        </button>
      </div>

      {/* New table modal */}
      {showNewTable && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-xl">
          <h3 className="font-medium mb-3">Create Data Table</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              placeholder="Table name (e.g., invoices, contacts)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-transparent outline-none text-sm"
              onKeyDown={(e) => e.key === 'Enter' && createTable()}
            />
            <button
              onClick={createTable}
              className="px-4 py-2 bg-vault-600 text-white rounded-lg hover:bg-vault-700 text-sm font-medium"
            >
              Create
            </button>
            <button
              onClick={() => setShowNewTable(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Table list */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">Tables</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {tables.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">No tables yet</p>
              ) : (
                tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => loadRecords(table.slug)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                      ${selectedTable === table.slug
                        ? 'bg-vault-50 text-vault-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5" />
                      {table.name}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Records */}
        <div className="flex-1 min-w-0">
          {selectedTable ? (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-6 py-3 border-b border-gray-200">
                <h2 className="font-medium text-gray-900">
                  {tables.find((t) => t.slug === selectedTable)?.name} Records
                </h2>
              </div>
              {records.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No records in this table</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {records.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm text-gray-400 font-mono">
                            {record.id.substring(0, 8)}...
                          </td>
                          <td className="px-6 py-3">
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                              {JSON.stringify(record.data, null, 1)}
                            </pre>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-500 hidden sm:table-cell">
                            {new Date(record.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center text-gray-400">
              <Database className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a table to view its records</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Layout Wrapper ─────────────────────────────────────────────

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = window.location;

  // Determine which inner page to render based on path
  const renderPage = () => {
    if (pathname === '/files' || pathname === '/dashboard/files') return <FilesPage />;
    if (pathname === '/records' || pathname === '/dashboard/records') return <RecordsPage />;
    return <DashboardPage />;
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 hover:bg-gray-50 rounded-lg"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1" />
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
