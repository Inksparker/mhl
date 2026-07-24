import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { filesApi, FileInfo } from '../lib/api';
import { useToast } from '../components/Toast';
import { File, Folder, Cloud, HardDrive, Upload, ArrowRight, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [stats, setStats] = useState({ files: 0, folders: 0, synced: 0, totalSize: 0 });
  const [recentFiles, setRecentFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    Promise.all([
      filesApi.list(user.orgId, { limit: '5', sort: 'created_at', order: 'desc' }),
      filesApi.folders(user.orgId),
      filesApi.list(user.orgId, { limit: '1' }),
    ])
      .then(([recentRes, foldersRes, totalRes]) => {
        setRecentFiles(recentRes.data.files);

        // Count synced files
        const synced = recentRes.data.files.filter((f) => f.synced).length;

        // Calculate total size
        const totalSize = recentRes.data.files.reduce((sum, f) => sum + f.original_size, 0);

        setStats({
          files: totalRes.data.total,
          folders: foldersRes.data.folders?.length || 0,
          synced,
          totalSize,
        });
      })
      .catch((err) => {
        addToast('error', 'Failed to load dashboard data');
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, [user, addToast]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  if (isLoading) {
    return (
      <div>
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-3" />
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {user?.fullName?.split(' ')[0]}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Total Files',
            value: stats.files,
            icon: File,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            label: 'Folders',
            value: stats.folders,
            icon: Folder,
            color: 'text-yellow-600',
            bg: 'bg-yellow-50',
          },
          {
            label: 'Storage Used',
            value: formatSize(stats.totalSize),
            icon: HardDrive,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
          },
          {
            label: 'Synced to Cloud',
            value: stats.synced,
            icon: Cloud,
            color: 'text-green-600',
            bg: 'bg-green-50',
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
          >
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
          <div>
            <h2 className="font-semibold text-gray-900">Recent Files</h2>
            <p className="text-xs text-gray-500 mt-0.5">Your most recently uploaded files</p>
          </div>
          <Link
            to="/dashboard/files"
            className="flex items-center gap-1 text-sm text-vault-600 hover:text-vault-800 font-medium"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recentFiles.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              <Upload className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No files uploaded yet</p>
              <p className="text-xs mt-1">Drag & drop files or use the Files page to get started</p>
              <Link
                to="/dashboard/files"
                className="mt-3 inline-flex items-center gap-1 text-sm text-vault-600 hover:text-vault-800 font-medium"
              >
                Go to Files <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            recentFiles.map((file) => (
              <div
                key={file.id}
                className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 rounded bg-blue-50 flex-shrink-0">
                    <File className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.filename}</p>
                    <p className="text-xs text-gray-500">
                      {formatSize(file.original_size)} ·{' '}
                      {new Date(file.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  {file.synced && (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      <Cloud className="w-3 h-3" /> Synced
                    </span>
                  )}
                  {file.tags?.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                  {file.tags && file.tags.length > 2 && (
                    <span className="text-xs text-gray-400">+{file.tags.length - 2}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
