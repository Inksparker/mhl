import { useState, useCallback, useEffect, useRef, DragEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../hooks/useCompany';
import { filesApi, FileInfo } from '../lib/api';
import { useToast } from '../components/Toast';
import {
  Upload, File, Folder, Download, Trash2, Search,
  Cloud, ChevronRight, Home, Tag, X, Loader2
} from 'lucide-react';

export default function FilesPage() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { addToast } = useToast();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [folders, setFolders] = useState<Array<{ folder: string; file_count: number }>>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(() => {
    if (!user) return;
    setIsLoading(true);

    const params: Record<string, string> = {
      limit: '100',
      sort: 'created_at',
      order: 'desc',
    };
    if (search) params.search = search;
    if (currentFolder) params.folder = currentFolder;
    if (selectedTag) params.tag = selectedTag;
    if (selectedCompany) params.companyId = selectedCompany.id;

    Promise.all([
      filesApi.list(user.orgId, params),
      filesApi.folders(user.orgId, selectedCompany?.id),
    ])
      .then(([filesRes, foldersRes]) => {
        setFiles(filesRes.data.files);
        setTotal(filesRes.data.total);
        setFolders(foldersRes.data.folders || []);
      })
      .catch((err) => {
        addToast('error', 'Failed to load files');
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, [user, search, currentFolder, selectedTag, selectedCompany, addToast]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async (fileList: FileList | File[]) => {
    if (!user) return;
    setIsUploading(true);
    const files = Array.from(fileList);
    let success = 0;
    let failed = 0;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      if (currentFolder) formData.append('folder', currentFolder);

      try {
        await filesApi.upload(user.orgId, formData);
        success++;
      } catch (err) {
        failed++;
        console.error('Upload failed:', err);
      }
    }

    setIsUploading(false);
    if (success > 0) addToast('success', `Uploaded ${success} file${success > 1 ? 's' : ''} successfully`);
    if (failed > 0) addToast('error', `Failed to upload ${failed} file${failed > 1 ? 's' : ''}`);
    loadFiles();
  };

  const handleDownload = async (file: FileInfo) => {
    if (!user) return;
    try {
      addToast('info', `Downloading ${file.filename}...`);
      const res = await filesApi.download(user.orgId, file.id);
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      addToast('error', `Failed to download ${file.filename}`);
      console.error('Download failed:', err);
    }
  };

  const handleDelete = async (file: FileInfo) => {
    if (!user || !confirm(`Delete "${file.filename}"?`)) return;
    try {
      await filesApi.delete(user.orgId, file.id);
      addToast('success', `Deleted ${file.filename}`);
      loadFiles();
    } catch (err) {
      addToast('error', `Failed to delete ${file.filename}`);
      console.error('Delete failed:', err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const onDragLeave = () => setIsDragOver(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
  };

  const navigateToFolder = (folder: string | null) => {
    setCurrentFolder(folder);
    setSearch('');
    setSelectedTag(null);
  };

  const folderParts = currentFolder ? currentFolder.split('/') : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Files</h1>
          <p className="text-sm text-gray-500 mt-1">{total} file{total !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2 px-4 py-2 bg-vault-600 text-white rounded-lg hover:bg-vault-700 transition font-medium text-sm disabled:opacity-50 shadow-sm"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" /> Upload
            </>
          )}
        </button>
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-transparent outline-none text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
        {selectedTag && (
          <span className="inline-flex items-center gap-1 px-3 py-2 bg-vault-50 text-vault-700 rounded-lg text-sm font-medium">
            <Tag className="w-3.5 h-3.5" />
            {selectedTag}
            <button onClick={() => setSelectedTag(null)} className="ml-1 hover:bg-vault-100 rounded p-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </div>

      {/* Folder breadcrumbs */}
      {currentFolder && (
        <div className="flex items-center gap-2 mb-4 text-sm">
          <button
            onClick={() => navigateToFolder(null)}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-900"
          >
            <Home className="w-3.5 h-3.5" /> Root
          </button>
          {folderParts.map((part, i) => (
            <span key={i} className="flex items-center gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              {i === folderParts.length - 1 ? (
                <span className="text-gray-900 font-medium">{part}</span>
              ) : (
                <button
                  onClick={() => navigateToFolder(folderParts.slice(0, i + 1).join('/'))}
                  className="text-gray-500 hover:text-gray-900"
                >
                  {part}
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Subfolders grid */}
      {folders.length > 0 && !search && !currentFolder && (
        <div className="mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {folders.map(({ folder, file_count }) => (
              <button
                key={folder}
                onClick={() => navigateToFolder(folder)}
                className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-vault-300 hover:bg-vault-50 transition-colors text-left"
              >
                <Folder className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-gray-700 truncate block">{folder}</span>
                  <span className="text-xs text-gray-400">{file_count} file{file_count !== 1 ? 's' : ''}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`mb-4 border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
          ${isDragOver
            ? 'drop-zone-active border-vault-500 bg-vault-50 scale-[1.01]'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-vault-500 animate-spin mb-2" />
            <p className="text-sm text-gray-500">Uploading files...</p>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Drag & drop files here, or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">Max file size: 500 MB</p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => e.target.files && handleUpload(e.target.files)}
      />

      {/* File list */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {files.length === 0 ? (
            <div className="px-6 py-16 text-center text-gray-400">
              <File className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">
                {search || selectedTag
                  ? 'No files match your filters'
                  : currentFolder
                  ? 'This folder is empty'
                  : 'No files uploaded yet'}
              </p>
              <p className="text-xs mt-1">
                {!search && !selectedTag && 'Upload files using the button above or drag & drop'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Size</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50 group transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-1.5 rounded bg-blue-50 flex-shrink-0">
                          <File className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="min-w-0">
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
                              <button
                                key={tag}
                                onClick={() => setSelectedTag(tag)}
                                className="px-1.5 py-0.5 bg-gray-100 hover:bg-vault-100 text-gray-500 hover:text-vault-700 rounded text-xs transition-colors"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 hidden sm:table-cell">
                      {formatSize(file.original_size)}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 hidden md:table-cell">
                      {new Date(file.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: file.created_at.startsWith(new Date().getFullYear().toString()) ? undefined : 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg"
                          title="Download"
                        >
                          <Download className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(file)}
                          className="p-1.5 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
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
      )}
      {total > files.length && (
        <p className="text-xs text-gray-400 mt-2 text-right">
          Showing {files.length} of {total} files
        </p>
      )}
    </div>
  );
}
