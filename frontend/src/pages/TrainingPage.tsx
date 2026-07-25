import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, ChevronDown, ChevronRight, CheckCircle2, Circle,
  Building2, Users, Folder, Database, Settings, HardDrive, Shield,
  FileText, Upload, Search, Tag, Download, Trash2, Plus, Edit3,
  ArrowRight
} from 'lucide-react';

interface Module {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  exercises: Exercise[];
}

interface Exercise {
  id: string;
  title: string;
  goal: string;
  steps: Step[];
}

interface Step {
  text: string;
  link?: { to: string; label: string };
}

const MODULES: Module[] = [
  {
    id: 'setup',
    title: 'Module 1: First-Time Setup',
    icon: <Building2 className="w-5 h-5" />,
    description: 'Create companies, add team members, and set storage quotas.',
    exercises: [
      {
        id: 'setup-companies',
        title: 'Create Companies',
        goal: 'Create companies for your business units.',
        steps: [
          { text: 'Go to the Companies page', link: { to: '/dashboard/companies', label: 'Open Companies →' } },
          { text: 'Click "Add Company" and create your first company (e.g., "Alpha Division")' },
          { text: 'Create at least two more companies for practice' },
        ],
      },
      {
        id: 'setup-users',
        title: 'Add Team Members',
        goal: 'Create users with different roles and company assignments.',
        steps: [
          { text: 'Go to the Users page', link: { to: '/dashboard/users', label: 'Open Users →' } },
          { text: 'Click "Add User"' },
          { text: 'Create a company_admin for each company you created' },
          { text: 'Create a member user assigned to one company' },
        ],
      },
      {
        id: 'setup-quotas',
        title: 'Set Storage Quotas',
        goal: 'Set organization and per-company storage limits.',
        steps: [
          { text: 'Go to Settings → Storage Quota section', link: { to: '/dashboard/settings', label: 'Open Settings →' } },
          { text: 'Set the Organization Total to 20 GB' },
          { text: 'Set per-company limits (e.g., 10 GB, 5 GB, 5 GB)' },
          { text: 'Observe the usage bar — it should be at 0%' },
        ],
      },
    ],
  },
  {
    id: 'files',
    title: 'Module 2: File Management',
    icon: <Folder className="w-5 h-5" />,
    description: 'Upload, organize, search, and manage files with folders and tags.',
    exercises: [
      {
        id: 'files-upload',
        title: 'Upload & Organize',
        goal: 'Upload files with folders and tags.',
        steps: [
          { text: 'Go to the Files page', link: { to: '/dashboard/files', label: 'Open Files →' } },
          { text: 'Drag & drop a file, or click the upload zone to browse' },
          { text: 'When uploading, type a folder name (e.g., "reports/2024")' },
          { text: 'Add comma-separated tags (e.g., "confidential, q4")' },
          { text: 'Upload at least 2 more files to different folders' },
        ],
      },
      {
        id: 'files-navigate',
        title: 'Navigate & Filter',
        goal: 'Use folder breadcrumbs, tag filtering, and search.',
        steps: [
          { text: 'Click a folder card to filter files within it' },
          { text: 'Use the breadcrumb trail (Root › folder) to navigate back' },
          { text: 'Click a tag on any file to filter by that tag' },
          { text: 'Click ✕ on the active tag to clear the filter' },
          { text: 'Type in the search bar to find files by name' },
        ],
      },
      {
        id: 'files-company',
        title: 'Company-Scoped Files',
        goal: 'Verify that files are isolated per company.',
        steps: [
          { text: 'Use the company dropdown in the top header' },
          { text: 'Select a specific company and upload a file' },
          { text: 'Switch to a different company — the file should not appear' },
          { text: 'Switch to "All Companies" — all files should be visible' },
        ],
      },
      {
        id: 'files-download',
        title: 'Download & Delete',
        goal: 'Download decrypted files and soft-delete.',
        steps: [
          { text: 'Hover over a file row to reveal action buttons' },
          { text: 'Click ⬇ to download — verify the file opens correctly' },
          { text: 'Click 🗑 on a different file — confirm deletion' },
          { text: 'Check that storage usage updates after deletion' },
        ],
      },
    ],
  },
  {
    id: 'records',
    title: 'Module 3: Data Records',
    icon: <Database className="w-5 h-5" />,
    description: 'Create data tables and perform full CRUD operations on records.',
    exercises: [
      {
        id: 'records-tables',
        title: 'Create Tables',
        goal: 'Create structured data tables.',
        steps: [
          { text: 'Go to Data Records', link: { to: '/dashboard/records', label: 'Open Records →' } },
          { text: 'Click "New Table" → name it "Clients" → Create' },
          { text: 'Create a second table named "Invoices"' },
        ],
      },
      {
        id: 'records-crud',
        title: 'CRUD Operations',
        goal: 'Create, read, update, and delete records.',
        steps: [
          { text: 'Select the "Clients" table from the left panel' },
          { text: 'Click "Add Record" → enter JSON data → Create' },
          { text: 'Example: {"name":"Acme Corp","email":"contact@acme.com"}' },
          { text: 'Add a second record with different data' },
          { text: 'Hover over a record → ✏️ → modify the JSON → Update' },
          { text: 'Hover over a record → 🗑 → confirm to delete' },
        ],
      },
    ],
  },
  {
    id: 'users',
    title: 'Module 4: User & Role Management',
    icon: <Users className="w-5 h-5" />,
    description: 'Promote users, reassign companies, and deactivate accounts.',
    exercises: [
      {
        id: 'users-promote',
        title: 'Promote a User',
        goal: 'Change a user\'s role.',
        steps: [
          { text: 'Go to Users', link: { to: '/dashboard/users', label: 'Open Users →' } },
          { text: 'Find a member user in the list' },
          { text: 'Hover → ✏️ → change role to company_admin → 💾 Save' },
          { text: 'Verify the role badge updates to the new color' },
        ],
      },
      {
        id: 'users-reassign',
        title: 'Reassign Company',
        goal: 'Move a user to a different company.',
        steps: [
          { text: 'Find a user in the list' },
          { text: 'Hover → ✏️ → select a different company → 💾 Save' },
          { text: 'Verify the company column updates' },
        ],
      },
      {
        id: 'users-deactivate',
        title: 'Deactivate a User',
        goal: 'Deactivate a user account.',
        steps: [
          { text: 'Find the user to deactivate' },
          { text: 'Hover → 🗑 → confirm the deactivation' },
          { text: 'The user disappears from the active list' },
        ],
      },
    ],
  },
  {
    id: 'quotas',
    title: 'Module 5: Quota Management',
    icon: <HardDrive className="w-5 h-5" />,
    description: 'Monitor and adjust storage quotas.',
    exercises: [
      {
        id: 'quotas-adjust',
        title: 'Adjust Quotas',
        goal: 'Change company and organization quotas.',
        steps: [
          { text: 'Go to Settings', link: { to: '/dashboard/settings', label: 'Open Settings →' } },
          { text: 'In Storage Quota, change a company\'s quota to a new value → Set' },
          { text: 'Change the Organization Total to a different value → Set Quota' },
          { text: 'Set a company quota to 0 — this means unlimited' },
        ],
      },
      {
        id: 'quotas-monitor',
        title: 'Monitor Usage',
        goal: 'Understand the usage bar colors.',
        steps: [
          { text: 'Upload several files to increase storage usage' },
          { text: 'Watch the usage bar in Settings' },
          { text: 'Blue = healthy (under 70%)' },
          { text: 'Amber = warning (70-90%)' },
          { text: 'Red = critical (over 90%)' },
        ],
      },
    ],
  },
  {
    id: 'security',
    title: 'Module 6: Security Verification',
    icon: <Shield className="w-5 h-5" />,
    description: 'Verify encryption and security features.',
    exercises: [
      {
        id: 'security-encrypt',
        title: 'Verify Encryption',
        goal: 'Confirm files are encrypted at rest.',
        steps: [
          { text: 'Upload a small text file (e.g., a .txt file)' },
          { text: 'Note the file size in the list (e.g., "18 B")' },
          { text: 'Download the file — it should be identical to the original' },
          { text: 'Files are encrypted with AES-256-GCM with unique per-file keys' },
        ],
      },
      {
        id: 'security-settings',
        title: 'Review Security Status',
        goal: 'Check that all protections are active.',
        steps: [
          { text: 'Go to Settings and scroll to the Security section' },
          { text: 'Verify: Encryption at Rest → Active ✅' },
          { text: 'Verify: JWT Authentication → Active ✅' },
          { text: 'All data is encrypted, all API calls are authenticated' },
        ],
      },
    ],
  },
];

const STORAGE_KEY = 'orgvault-training-progress';

export default function TrainingPage() {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['setup']));
  const [completed, setCompleted] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
  }, [completed]);

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleExercise = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalExercises = MODULES.reduce((sum, m) => sum + m.exercises.length, 0);
  const completedCount = [...completed].filter((id) =>
    MODULES.some((m) => m.exercises.some((e) => e.id === id))
  ).length;
  const progressPercent = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-vault-50">
            <GraduationCap className="w-6 h-6 text-vault-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Training</h1>
            <p className="text-sm text-gray-500">Hands-on exercises to master OrgVault</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-500">{completedCount} of {totalExercises} completed ({progressPercent}%)</span>
          </div>
          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-vault-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-4">
        {MODULES.map((mod) => {
          const modCompleted = mod.exercises.filter((e) => completed.has(e.id)).length;
          const modTotal = mod.exercises.length;
          const isExpanded = expandedModules.has(mod.id);

          return (
            <div key={mod.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Module header */}
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="p-2 rounded-lg bg-vault-50 text-vault-600">
                  {mod.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{mod.title}</h3>
                  <p className="text-sm text-gray-500">{mod.description}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-400">
                    {modCompleted}/{modTotal}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Exercises */}
              {isExpanded && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                  {mod.exercises.map((ex) => (
                    <div key={ex.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleExercise(ex.id)}
                          className="mt-0.5 flex-shrink-0"
                        >
                          {completed.has(ex.id) ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300 hover:text-vault-400" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-medium ${completed.has(ex.id) ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {ex.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5 mb-3">
                            🎯 {ex.goal}
                          </p>
                          <div className="space-y-2">
                            {ex.steps.map((step, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-vault-100 text-vault-700 text-xs font-bold flex items-center justify-center mt-0.5">
                                  {i + 1}
                                </span>
                                <span className="text-sm text-gray-600">
                                  {step.text}
                                  {step.link && (
                                    <Link
                                      to={step.link.to}
                                      className="inline-flex items-center gap-1 ml-2 text-vault-600 hover:text-vault-800 font-medium text-xs"
                                    >
                                      {step.link.label} <ArrowRight className="w-3 h-3" />
                                    </Link>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion message */}
      {progressPercent === 100 && (
        <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-xl text-center">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
          <h3 className="font-semibold text-green-800">Training Complete! 🎉</h3>
          <p className="text-sm text-green-600 mt-1">
            You've completed all training modules. You're ready to manage OrgVault.
          </p>
        </div>
      )}
    </div>
  );
}
