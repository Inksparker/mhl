import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  GraduationCap, ChevronDown, ChevronRight, CheckCircle2, Circle,
  Building2, Users, Folder, Database, Settings, HardDrive, Shield,
  ArrowRight, UserCog, Eye, User
} from 'lucide-react';

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

interface Module {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  roles: string[];
  exercises: Exercise[];
}

const ALL_MODULES: Module[] = [
  // ─── COMPANY USER TRAINING (member, viewer, company_admin) ─────
  {
    id: 'user-basics',
    title: 'Getting Around OrgVault',
    icon: <User className="w-5 h-5" />,
    description: 'Learn the basics: navigation, dashboard, and switching companies.',
    roles: ['member', 'viewer', 'company_admin'],
    exercises: [
      {
        id: 'user-nav',
        title: 'Navigate the App',
        goal: 'Learn the sidebar and company selector.',
        steps: [
          { text: 'Use the left sidebar to move between Dashboard, Files, and Data Records' },
          { text: 'Go to the Dashboard', link: { to: '/dashboard', label: 'Open Dashboard →' } },
          { text: 'Check the stats cards — they show your company\'s files and storage' },
          { text: 'Use the company dropdown in the top header to switch views (if you have access to multiple companies)' },
        ],
      },
      {
        id: 'user-dash',
        title: 'Understand Your Dashboard',
        goal: 'Read the dashboard stats and recent files.',
        steps: [
          { text: 'Look at the four stats cards: Total Files, Folders, Storage Used, Synced' },
          { text: 'Check the Recent Files list — these are your latest uploads' },
          { text: 'Click "View all →" to jump to the Files page' },
        ],
      },
    ],
  },
  {
    id: 'user-files',
    title: 'Working with Files',
    icon: <Folder className="w-5 h-5" />,
    description: 'Upload, organize, and manage your company\'s files.',
    roles: ['member', 'company_admin'],
    exercises: [
      {
        id: 'user-upload',
        title: 'Upload Files',
        goal: 'Upload files with folder and tag organization.',
        steps: [
          { text: 'Go to Files', link: { to: '/dashboard/files', label: 'Open Files →' } },
          { text: 'Drag a file into the upload zone, or click to browse' },
          { text: 'Type a folder name (e.g., "reports") and tags (e.g., "important, draft")' },
          { text: 'Upload a few files to practice' },
        ],
      },
      {
        id: 'user-navigate',
        title: 'Find Your Files',
        goal: 'Use folders, tags, and search to find files.',
        steps: [
          { text: 'Click a folder card to see files inside it' },
          { text: 'Use the breadcrumb at the top to go back to Root' },
          { text: 'Click a tag on any file to filter by that tag' },
          { text: 'Use the search bar to find files by name' },
        ],
      },
      {
        id: 'user-download',
        title: 'Download & Delete',
        goal: 'Download files and delete ones you no longer need.',
        steps: [
          { text: 'Hover over a file row → click ⬇ to download' },
          { text: 'Verify the downloaded file opens correctly' },
          { text: 'Hover over a file → click 🗑 to delete (only delete your own test files)' },
          { text: 'Remember: deleted files free up storage space' },
        ],
      },
    ],
  },
  {
    id: 'user-records',
    title: 'Data Records Basics',
    icon: <Database className="w-5 h-5" />,
    description: 'Work with structured data in tables.',
    roles: ['member', 'company_admin'],
    exercises: [
      {
        id: 'user-records-add',
        title: 'Add & Edit Records',
        goal: 'Create and modify records in a table.',
        steps: [
          { text: 'Go to Data Records', link: { to: '/dashboard/records', label: 'Open Records →' } },
          { text: 'Select a table from the left panel (ask your admin to create one if empty)' },
          { text: 'Click "Add Record" → enter JSON data → Create' },
          { text: 'Hover over an existing record → ✏️ → edit → Update' },
          { text: 'Use 📋 to copy record data when needed' },
        ],
      },
    ],
  },
  {
    id: 'user-viewer',
    title: 'Viewing Files & Records',
    icon: <Eye className="w-5 h-5" />,
    description: 'For viewer role: browse and download files and records.',
    roles: ['viewer'],
    exercises: [
      {
        id: 'viewer-browse',
        title: 'Browse & Download',
        goal: 'Find files and download them.',
        steps: [
          { text: 'Go to Files and browse folders', link: { to: '/dashboard/files', label: 'Open Files →' } },
          { text: 'Use the search bar or tags to find specific files' },
          { text: 'Hover over a file → click ⬇ to download' },
        ],
      },
      {
        id: 'viewer-records',
        title: 'View Data Records',
        goal: 'Browse structured data.',
        steps: [
          { text: 'Go to Data Records and select a table', link: { to: '/dashboard/records', label: 'Open Records →' } },
          { text: 'Browse records and use 📋 to copy data you need' },
          { text: 'Use the search bar to find specific records' },
        ],
      },
    ],
  },

  // ─── COMPANY ADMIN TRAINING ────────────────────────────────────
  {
    id: 'admin-company',
    title: 'Managing Your Company',
    icon: <Building2 className="w-5 h-5" />,
    description: 'Oversee files, records, and users within your company.',
    roles: ['company_admin'],
    exercises: [
      {
        id: 'admin-overview',
        title: 'Company Overview',
        goal: 'Monitor your company\'s storage and activity.',
        steps: [
          { text: 'Go to the Dashboard — stats are scoped to your company' },
          { text: 'Check storage usage against your company\'s quota' },
          { text: 'Use the company dropdown to confirm you\'re viewing your company' },
        ],
      },
      {
        id: 'admin-files',
        title: 'Manage Company Files',
        goal: 'Organize and maintain your company\'s file storage.',
        steps: [
          { text: 'Go to Files', link: { to: '/dashboard/files', label: 'Open Files →' } },
          { text: 'Create a folder structure (e.g., invoices/, reports/, contracts/)' },
          { text: 'Upload files and tag them for easy retrieval' },
          { text: 'Delete outdated files to manage storage quota' },
        ],
      },
      {
        id: 'admin-records',
        title: 'Manage Data Tables',
        goal: 'Create and manage data tables for your team.',
        steps: [
          { text: 'Go to Data Records', link: { to: '/dashboard/records', label: 'Open Records →' } },
          { text: 'Click "New Table" to create tables your team needs' },
          { text: 'Add initial records as templates for your team' },
          { text: 'Delete unused tables to keep things clean' },
        ],
      },
      {
        id: 'admin-team',
        title: 'Understand Your Team',
        goal: 'Know how your team members are set up.',
        steps: [
          { text: 'Go to Users', link: { to: '/dashboard/users', label: 'Open Users →' } },
          { text: 'Find users assigned to your company' },
          { text: 'Note: Only org_admins can change roles. Contact them if a team member needs a different role.' },
        ],
      },
    ],
  },

  // ─── ORG ADMIN / SUPERADMIN TRAINING ──────────────────────────
  {
    id: 'org-setup',
    title: 'Organization Setup',
    icon: <Building2 className="w-5 h-5" />,
    description: 'Create companies, add team members, and set storage quotas.',
    roles: ['superadmin', 'org_admin'],
    exercises: [
      {
        id: 'org-companies',
        title: 'Create Companies',
        goal: 'Set up company sub-tenants.',
        steps: [
          { text: 'Go to Companies', link: { to: '/dashboard/companies', label: 'Open Companies →' } },
          { text: 'Click "Add Company" and create companies for your business units' },
          { text: 'Companies isolate data — files in one company are hidden from another' },
        ],
      },
      {
        id: 'org-users',
        title: 'Add Team Members',
        goal: 'Create users with roles and company assignments.',
        steps: [
          { text: 'Go to Users', link: { to: '/dashboard/users', label: 'Open Users →' } },
          { text: 'Click "Add User" → fill in name, email, password' },
          { text: 'Select a role: company_admin manages one company, member uploads files, viewer reads only' },
          { text: 'Assign to a company so they only see that company\'s data' },
        ],
      },
      {
        id: 'org-quotas',
        title: 'Set Storage Quotas',
        goal: 'Allocate storage across the organization.',
        steps: [
          { text: 'Go to Settings → Storage Quota', link: { to: '/dashboard/settings', label: 'Open Settings →' } },
          { text: 'Set the Organization Total (default: 10 GB). 0 = unlimited.' },
          { text: 'Set per-company limits to control how much each unit can use' },
          { text: 'Monitor the usage bar — blue is healthy, amber is warning, red is critical' },
        ],
      },
    ],
  },
  {
    id: 'org-users-mgmt',
    title: 'User & Role Management',
    icon: <UserCog className="w-5 h-5" />,
    description: 'Promote users, reassign companies, and manage access.',
    roles: ['superadmin', 'org_admin'],
    exercises: [
      {
        id: 'org-promote',
        title: 'Change Roles',
        goal: 'Promote or change a user\'s role.',
        steps: [
          { text: 'Go to Users and find the person', link: { to: '/dashboard/users', label: 'Open Users →' } },
          { text: 'Hover → ✏️ → select new role → 💾 Save' },
          { text: 'Only superadmins can create other superadmins' },
        ],
      },
      {
        id: 'org-reassign',
        title: 'Reassign Companies',
        goal: 'Move users between companies.',
        steps: [
          { text: 'Find the user → ✏️ → change company → 💾 Save' },
          { text: 'The user will now see only their new company\'s files and records' },
        ],
      },
      {
        id: 'org-deactivate',
        title: 'Deactivate Users',
        goal: 'Remove access for departed team members.',
        steps: [
          { text: 'Find the user → hover → 🗑 → confirm' },
          { text: 'They can no longer log in. Their files and records are preserved.' },
        ],
      },
    ],
  },
  {
    id: 'org-quota-mgmt',
    title: 'Quota Monitoring',
    icon: <HardDrive className="w-5 h-5" />,
    description: 'Monitor and adjust storage limits.',
    roles: ['superadmin', 'org_admin'],
    exercises: [
      {
        id: 'org-quota-adjust',
        title: 'Adjust Quotas',
        goal: 'Respond to storage needs.',
        steps: [
          { text: 'Go to Settings → Storage Quota', link: { to: '/dashboard/settings', label: 'Open Settings →' } },
          { text: 'Increase a company\'s quota when they need more space' },
          { text: 'Increase the org quota if total usage approaches the limit' },
          { text: 'The usage bar turns amber at 70% and red at 90% — act before it\'s critical' },
        ],
      },
    ],
  },
  {
    id: 'org-security',
    title: 'Security Verification',
    icon: <Shield className="w-5 h-5" />,
    description: 'Verify encryption and security features.',
    roles: ['superadmin', 'org_admin'],
    exercises: [
      {
        id: 'org-encrypt',
        title: 'Verify Encryption',
        goal: 'Confirm files are encrypted.',
        steps: [
          { text: 'Upload a small text file to Files' },
          { text: 'Note the encrypted size is larger than the original (encryption overhead)' },
          { text: 'Download the file — it should be identical to the original' },
          { text: 'All files are encrypted with AES-256-GCM with unique per-file keys' },
        ],
      },
      {
        id: 'org-security-review',
        title: 'Review Protections',
        goal: 'Check active security features.',
        steps: [
          { text: 'Go to Settings and scroll to Security section' },
          { text: 'Verify: Encryption at Rest ✅ Active' },
          { text: 'Verify: JWT Authentication ✅ Active (24h tokens with rotation)' },
        ],
      },
    ],
  },
];

const STORAGE_KEY = 'orgvault-training-progress';

export default function TrainingPage() {
  const { user } = useAuth();
  const userRole = user?.role || 'viewer';

  // Filter modules by user role
  const modules = ALL_MODULES.filter((m) => m.roles.includes(userRole));

  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    if (modules.length > 0) return new Set([modules[0].id]);
    return new Set();
  });
  const [completed, setCompleted] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Reset expanded when role/modules change
  useEffect(() => {
    if (modules.length > 0 && expandedModules.size === 0) {
      setExpandedModules(new Set([modules[0].id]));
    }
  }, [userRole]);

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

  const totalExercises = modules.reduce((sum, m) => sum + m.exercises.length, 0);
  const completedCount = [...completed].filter((id) =>
    modules.some((m) => m.exercises.some((e) => e.id === id))
  ).length;
  const progressPercent = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;

  const roleLabel: Record<string, string> = {
    superadmin: 'Super Admin',
    org_admin: 'Organization Admin',
    company_admin: 'Company Admin',
    member: 'Team Member',
    viewer: 'Viewer',
  };

  const roleDescription: Record<string, string> = {
    superadmin: 'Full system access — manage organizations, users, and quotas.',
    org_admin: 'Manage your organization — companies, users, and settings.',
    company_admin: 'Manage your company — oversee files, records, and team members.',
    member: 'Upload and manage files and data records within your company.',
    viewer: 'View and download files and records — read-only access.',
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-amber-50">
            <GraduationCap className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Training</h1>
            <p className="text-sm text-gray-500">Role-based learning for {roleLabel[userRole] || userRole}</p>
          </div>
        </div>

        {/* Role badge */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mt-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-50 flex-shrink-0">
              {userRole === 'superadmin' || userRole === 'org_admin' ? (
                <UserCog className="w-5 h-5 text-amber-600" />
              ) : userRole === 'company_admin' ? (
                <Building2 className="w-5 h-5 text-amber-600" />
              ) : userRole === 'viewer' ? (
                <Eye className="w-5 h-5 text-amber-600" />
              ) : (
                <User className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">
                Training for: <span className="text-amber-700">{roleLabel[userRole]}</span>
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">{roleDescription[userRole]}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-2xl font-bold text-gray-900">{progressPercent}%</span>
              <p className="text-xs text-gray-400">{completedCount}/{totalExercises} done</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Modules */}
      {modules.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center text-gray-400">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No training modules for your role yet</p>
          <p className="text-xs mt-1">Contact your administrator if you need access to more features</p>
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map((mod) => {
            const modCompleted = mod.exercises.filter((e) => completed.has(e.id)).length;
            const modTotal = mod.exercises.length;
            const isExpanded = expandedModules.has(mod.id);

            return (
              <div key={mod.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className={`p-2 rounded-lg ${mod.roles.includes('superadmin') ? 'bg-vault-50 text-vault-600' : 'bg-amber-50 text-amber-600'}`}>
                    {mod.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{mod.title}</h3>
                    <p className="text-sm text-gray-500">{mod.description}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs font-medium ${modCompleted === modTotal ? 'text-green-600' : 'text-gray-400'}`}>
                      {modCompleted}/{modTotal}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

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
                              <Circle className="w-5 h-5 text-gray-300 hover:text-amber-400" />
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
                                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center mt-0.5">
                                    {i + 1}
                                  </span>
                                  <span className="text-sm text-gray-600">
                                    {step.text}
                                    {step.link && (
                                      <Link
                                        to={step.link.to}
                                        className="inline-flex items-center gap-1 ml-2 text-amber-600 hover:text-amber-800 font-medium text-xs"
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
      )}

      {/* Completion */}
      {progressPercent === 100 && totalExercises > 0 && (
        <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-xl text-center">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
          <h3 className="font-semibold text-green-800">Training Complete! 🎉</h3>
          <p className="text-sm text-green-600 mt-1">
            You've mastered the {roleLabel[userRole]} role. Ready to use OrgVault confidently.
          </p>
        </div>
      )}
    </div>
  );
}
