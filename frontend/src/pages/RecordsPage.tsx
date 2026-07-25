import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../hooks/useCompany';
import { recordsApi, DataTable, DataRecord } from '../lib/api';
import { useToast } from '../components/Toast';
import {
  Plus, Database, Search, Trash2, Edit3, Save, X,
  ChevronDown, Loader2, FileJson, Copy
} from 'lucide-react';

export default function RecordsPage() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { addToast } = useToast();
  const [tables, setTables] = useState<DataTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [newTableName, setNewTableName] = useState('');
  const [showNewTable, setShowNewTable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);

  // CRUD state
  const [showNewRecord, setShowNewRecord] = useState(false);
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [recordForm, setRecordForm] = useState('');
  const [recordSearch, setRecordSearch] = useState('');

  const newTableInputRef = useRef<HTMLInputElement>(null);

  // Load tables
  const loadTables = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    recordsApi
      .listTables(user.orgId, selectedCompany?.id)
      .then((res) => setTables(res.data.tables || []))
      .catch((err) => {
        addToast('error', 'Failed to load tables');
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, [user, addToast]);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  useEffect(() => {
    if (showNewTable && newTableInputRef.current) {
      newTableInputRef.current.focus();
    }
  }, [showNewTable]);

  // Load records for selected table
  const loadRecords = useCallback(
    (slug: string) => {
      if (!user) return;
      setSelectedTable(slug);
      setIsRecordsLoading(true);
      recordsApi
        .listRecords(user.orgId, slug, { decrypt: 'true', limit: '100', ...(selectedCompany ? { companyId: selectedCompany.id } : {}) })
        .then((res) => {
          setRecords(res.data.records || []);
          setTotal(res.data.total || 0);
        })
        .catch((err) => {
          addToast('error', 'Failed to load records');
          console.error(err);
        })
        .finally(() => setIsRecordsLoading(false));
    },
    [user, selectedCompany, addToast]
  );

  // Create table
  const createTable = async () => {
    if (!user || !newTableName.trim()) return;
    try {
      await recordsApi.createTable(user.orgId, { name: newTableName.trim() });
      addToast('success', `Table "${newTableName}" created`);
      setNewTableName('');
      setShowNewTable(false);
      loadTables();
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed to create table');
    }
  };

  // Create record
  const createRecord = async () => {
    if (!user || !selectedTable || !recordForm.trim()) return;
    try {
      const data = JSON.parse(recordForm);
      await recordsApi.createRecord(user.orgId, selectedTable, { data });
      addToast('success', 'Record created');
      setShowNewRecord(false);
      setRecordForm('');
      loadRecords(selectedTable);
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        addToast('error', 'Invalid JSON format');
      } else {
        addToast('error', err.response?.data?.error || 'Failed to create record');
      }
    }
  };

  // Update record
  const updateRecord = async (recordId: string) => {
    if (!user || !selectedTable || !recordForm.trim()) return;
    try {
      const data = JSON.parse(recordForm);
      await recordsApi.updateRecord(user.orgId, selectedTable, recordId, { data });
      addToast('success', 'Record updated');
      setEditingRecord(null);
      setRecordForm('');
      loadRecords(selectedTable);
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        addToast('error', 'Invalid JSON format');
      } else {
        addToast('error', err.response?.data?.error || 'Failed to update record');
      }
    }
  };

  // Delete record
  const deleteRecord = async (recordId: string) => {
    if (!user || !selectedTable) return;
    if (!confirm('Delete this record? This cannot be undone.')) return;
    try {
      await recordsApi.deleteRecord(user.orgId, selectedTable, recordId);
      addToast('success', 'Record deleted');
      loadRecords(selectedTable);
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed to delete record');
    }
  };

  // Delete table
  const deleteTable = async (tableSlug: string, tableName: string) => {
    if (!user) return;
    if (!confirm(`Delete table "${tableName}" and all its records? This cannot be undone.`)) return;
    try {
      // Use query endpoint to delete table (backend may not have dedicated endpoint)
      await recordsApi.queryRecords(user.orgId, {
        action: 'drop_table',
        table: tableSlug,
      });
      addToast('success', `Table "${tableName}" deleted`);
      if (selectedTable === tableSlug) {
        setSelectedTable(null);
        setRecords([]);
      }
      loadTables();
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed to delete table');
    }
  };

  const startEdit = (record: DataRecord) => {
    setEditingRecord(record.id);
    setRecordForm(JSON.stringify(record.data, null, 2));
  };

  const cancelForm = () => {
    setShowNewRecord(false);
    setEditingRecord(null);
    setRecordForm('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      addToast('info', 'Copied to clipboard');
    });
  };

  // Filter records by search
  const filteredRecords = recordSearch
    ? records.filter((r) => JSON.stringify(r.data).toLowerCase().includes(recordSearch.toLowerCase()))
    : records;

  const selectedTableObj = tables.find((t) => t.slug === selectedTable);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Records</h1>
          <p className="text-sm text-gray-500 mt-1">
            {tables.length} table{tables.length !== 1 ? 's' : ''} · Structured data storage
          </p>
        </div>
        <button
          onClick={() => setShowNewTable(true)}
          className="flex items-center gap-2 px-4 py-2 bg-vault-600 text-white rounded-lg hover:bg-vault-700 transition font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Table
        </button>
      </div>

      {/* New table form */}
      {showNewTable && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Create Data Table</h3>
          <div className="flex gap-2">
            <input
              ref={newTableInputRef}
              type="text"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              placeholder="Table name (e.g., invoices, contacts)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-transparent outline-none text-sm"
              onKeyDown={(e) => e.key === 'Enter' && createTable()}
            />
            <button
              onClick={createTable}
              disabled={!newTableName.trim()}
              className="px-4 py-2 bg-vault-600 text-white rounded-lg hover:bg-vault-700 text-sm font-medium disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewTable(false);
                setNewTableName('');
              }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Table list sidebar */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-6">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tables</h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              ) : tables.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No tables yet</p>
                </div>
              ) : (
                tables.map((table) => (
                  <div
                    key={table.id}
                    className={`group flex items-center justify-between transition-colors ${
                      selectedTable === table.slug ? 'bg-vault-50' : ''
                    }`}
                  >
                    <button
                      onClick={() => loadRecords(table.slug)}
                      className={`flex-1 text-left px-4 py-2.5 text-sm transition-colors
                        ${selectedTable === table.slug
                          ? 'text-vault-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{table.name}</span>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTable(table.slug, table.name);
                      }}
                      className="p-1.5 mr-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete table"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Records panel */}
        <div className="flex-1 min-w-0">
          {selectedTable ? (
            <>
              {/* Records header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-gray-900">
                    {selectedTableObj?.name}
                  </h2>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {total} record{total !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={recordSearch}
                      onChange={(e) => setRecordSearch(e.target.value)}
                      placeholder="Search records..."
                      className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-transparent outline-none text-sm w-48"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setShowNewRecord(true);
                      setEditingRecord(null);
                      setRecordForm('{\n  \n}');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-vault-600 text-white rounded-lg hover:bg-vault-700 text-sm font-medium transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Record
                  </button>
                </div>
              </div>

              {/* New/Edit record form */}
              {(showNewRecord || editingRecord) && (
                <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">
                      {editingRecord ? 'Edit Record' : 'New Record'}
                    </h3>
                    <button onClick={cancelForm} className="p-1 hover:bg-gray-100 rounded">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <textarea
                    value={recordForm}
                    onChange={(e) => setRecordForm(e.target.value)}
                    className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-transparent outline-none text-sm font-mono resize-y"
                    placeholder='{"key": "value"}'
                  />
                  <div className="flex items-center justify-between mt-3">
                    <button
                      onClick={() => copyToClipboard(recordForm)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                    <div className="flex gap-2">
                      <button onClick={cancelForm} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                        Cancel
                      </button>
                      <button
                        onClick={() =>
                          editingRecord ? updateRecord(editingRecord) : createRecord()
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-vault-600 text-white rounded-lg hover:bg-vault-700 text-sm font-medium"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {editingRecord ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Records list */}
              {isRecordsLoading ? (
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="divide-y divide-gray-100">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="px-6 py-4 flex items-center gap-4">
                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                        <div className="flex-1 h-12 bg-gray-100 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200">
                  {filteredRecords.length === 0 ? (
                    <div className="px-6 py-16 text-center text-gray-400">
                      <FileJson className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="text-sm font-medium">
                        {recordSearch
                          ? 'No records match your search'
                          : 'No records in this table'}
                      </p>
                      {!recordSearch && (
                        <button
                          onClick={() => {
                            setShowNewRecord(true);
                            setEditingRecord(null);
                            setRecordForm('{\n  \n}');
                          }}
                          className="mt-3 text-sm text-vault-600 hover:text-vault-800 font-medium"
                        >
                          Add your first record
                        </button>
                      )}
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-32">ID</th>
                          <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                          <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredRecords.map((record) => (
                          <tr
                            key={record.id}
                            className={`hover:bg-gray-50 group transition-colors ${
                              editingRecord === record.id ? 'bg-vault-50' : ''
                            }`}
                          >
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">
                                  {record.id.substring(0, 8)}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(record.id)}
                                  className="opacity-0 group-hover:opacity-100 transition"
                                >
                                  <Copy className="w-3 h-3 text-gray-300 hover:text-gray-500" />
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans max-h-32 overflow-y-auto">
                                {JSON.stringify(record.data, null, 1)}
                              </pre>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition">
                                <button
                                  onClick={() => startEdit(record)}
                                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                                  title="Edit"
                                >
                                  <Edit3 className="w-4 h-4 text-gray-500" />
                                </button>
                                <button
                                  onClick={() => copyToClipboard(JSON.stringify(record.data, null, 2))}
                                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                                  title="Copy data"
                                >
                                  <Copy className="w-4 h-4 text-gray-400" />
                                </button>
                                <button
                                  onClick={() => deleteRecord(record.id)}
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
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 px-6 py-24 text-center text-gray-400">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Select a table to view its records</p>
              <p className="text-xs mt-1">Or create a new table to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
