import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../hooks/useCompany';
import {
  GraduationCap, ChevronDown, ChevronRight, CheckCircle2, Circle,
  Building2, Folder, Database, Upload, Search, Tag, Download, User,
  ArrowRight, Play, Clock, BookOpen, Shield, Lock, HardDrive, FileText
} from 'lucide-react';
import TrainingVideoPlayer, { Slide } from '../components/TrainingVideoPlayer';

interface Step {
  text: string;
  link?: { to: string; label: string };
}

interface Lesson {
  id: string;
  title: string;
  duration: string;
  icon: React.ReactNode;
  goal: string;
  videoUrl?: string;
  videoSlides?: Slide[];
  steps: Step[];
}

const COMPANY_LESSONS: Lesson[] = [
  {
    id: 'co-welcome',
    title: 'Welcome to Your Company Vault',
    duration: '2 min',
    icon: <Building2 className="w-4 h-4" />,
    goal: 'Understand what OrgVault is and how your company uses it.',
    steps: [
      { text: 'Your company uses OrgVault to securely store files and data' },
      { text: 'Everything you upload is encrypted with AES-256-GCM' },
      { text: 'Files you upload are visible to your entire company team' },
      { text: 'Only people in your company can see your company\'s files', link: { to: '/dashboard', label: 'Go to Dashboard →' } },
    ],
    videoSlides: [
      { icon: '🔐', text: 'Welcome to OrgVault — your company\'s secure storage platform', title: 'Welcome!', color: 'text-green-400' },
      { icon: '🏢', text: 'Your company uses OrgVault to securely store and share files with your team', title: 'Your Company Vault', color: 'text-blue-400' },
      { icon: '🔒', text: 'Every file is encrypted with AES-256-GCM — the same standard used by banks and governments', title: 'Bank-Grade Security', color: 'text-purple-400' },
      { icon: '👥', text: 'Only people in your company can see your files. Other companies in your org cannot access your data.', title: 'Team Access Only', color: 'text-yellow-400' },
      { icon: '✅', text: 'You\'re ready to get started! Follow the steps below to begin using OrgVault.', title: 'Ready to Go!', color: 'text-green-400' },
    ],
    videoUrl: '/training-videos/01-welcome.mp4',
  },
  {
    id: 'co-navigate',
    title: 'Navigating Your Workspace',
    duration: '3 min',
    icon: <User className="w-4 h-4" />,
    goal: 'Learn the sidebar, dashboard, and how to move around.',
    steps: [
      { text: 'The left sidebar has everything you need: Dashboard, Files, Data Records' },
      { text: 'Dashboard shows your company\'s stats at a glance', link: { to: '/dashboard', label: 'Open Dashboard →' } },
      { text: 'The company name in the header shows which company you\'re viewing' },
      { text: 'If you have access to multiple companies, use the dropdown to switch' },
    ],
    videoSlides: [
      { icon: '🧭', text: 'Let\'s learn how to navigate your OrgVault workspace', title: 'Navigation Guide', color: 'text-blue-400' },
      { icon: '📊', text: 'The Dashboard shows your company stats — files, storage used, and recent activity', title: 'Dashboard', color: 'text-green-400' },
      { icon: '📁', text: 'Files is where you upload, organize, and find your documents', title: 'Files Page', color: 'text-yellow-400' },
      { icon: '🗄️', text: 'Data Records lets you work with structured data in custom tables', title: 'Data Records', color: 'text-purple-400' },
      { icon: '🏢', text: 'Use the company dropdown in the header to switch between company views', title: 'Company Selector', color: 'text-blue-400' },
    ],
    videoUrl: '/training-videos/02-navigate.mp4',
  },
  {
    id: 'co-upload',
    title: 'Uploading Your First Files',
    duration: '5 min',
    icon: <Upload className="w-4 h-4" />,
    goal: 'Upload files with proper folders and tags.',
    steps: [
      { text: 'Go to the Files page', link: { to: '/dashboard/files', label: 'Open Files →' } },
      { text: 'Drag a file from your computer onto the dashed upload zone' },
      { text: 'Type a folder name like "invoices" or "reports/2024" to organize' },
      { text: 'Add comma-separated tags like "important, draft, client-x"' },
      { text: 'Upload a few test files to practice' },
    ],
    videoSlides: [
      { icon: '📤', text: 'Let\'s upload your first files to OrgVault', title: 'Uploading Files', color: 'text-blue-400' },
      { icon: '🖱️', text: 'Drag and drop files from your computer onto the upload zone, or click to browse', title: 'Drag & Drop', color: 'text-green-400' },
      { icon: '📂', text: 'Type a folder name like "invoices" or "reports/2024" to organize your files', title: 'Use Folders', color: 'text-yellow-400' },
      { icon: '🏷️', text: 'Add comma-separated tags like "important, draft, client-x" for quick filtering', title: 'Add Tags', color: 'text-purple-400' },
      { icon: '🔐', text: 'Your file is encrypted with AES-256 and stored securely', title: 'Encrypted!', color: 'text-green-400' },
    ],
    videoUrl: '/training-videos/03-upload.mp4',
  },
  {
    id: 'co-organize',
    title: 'Organizing with Folders & Tags',
    duration: '4 min',
    icon: <Folder className="w-4 h-4" />,
    goal: 'Keep your company files organized and easy to find.',
    steps: [
      { text: 'Click folder cards to see files inside each folder' },
      { text: 'Use the breadcrumb (Root › folder) to navigate back up' },
      { text: 'Click any tag on a file to filter by that tag' },
      { text: 'Click ✕ on the active tag to clear the filter' },
    ],
    videoSlides: [
      { icon: '📂', text: 'Folders and tags make finding files easy', title: 'Stay Organized', color: 'text-green-400' },
      { icon: '📁', text: 'Click any folder card to filter files within that folder', title: 'Folder Navigation', color: 'text-blue-400' },
      { icon: '🏷️', text: 'Tags are clickable — click a tag to see all files with that label', title: 'Tag Filtering', color: 'text-yellow-400' },
      { icon: '🔄', text: 'Use the breadcrumb trail to navigate back up through folders', title: 'Breadcrumb Trail', color: 'text-purple-400' },
    ],
    videoUrl: '/training-videos/04-organize.mp4',
  },
  {
    id: 'co-find',
    title: 'Finding Files Fast',
    duration: '3 min',
    icon: <Search className="w-4 h-4" />,
    goal: 'Use search, tags, and folders to locate any file quickly.',
    steps: [
      { text: 'Type in the search bar to find files by name', link: { to: '/dashboard/files', label: 'Try it →' } },
      { text: 'Combine search with folder filters for precise results' },
      { text: 'Tags help categorize files — click a tag to see all files with that tag' },
      { text: 'If you can\'t find a file, clear all filters and search again' },
    ],
    videoSlides: [
      { icon: '🔍', text: 'The search bar finds files by name instantly', title: 'Quick Search', color: 'text-blue-400' },
      { icon: '⌨️', text: 'Type any part of the filename — results update as you type', title: 'Live Results', color: 'text-green-400' },
      { icon: '🏷️', text: 'Combine search with tag filters for laser-precise results', title: 'Combine Filters', color: 'text-yellow-400' },
      { icon: '🧹', text: 'Can\'t find something? Clear all filters and try different search terms', title: 'Pro Tip', color: 'text-purple-400' },
    ],
    videoUrl: '/training-videos/05-search.mp4',
  },
  {
    id: 'co-download',
    title: 'Downloading & Deleting Files',
    duration: '2 min',
    icon: <Download className="w-4 h-4" />,
    goal: 'Download files to your computer and clean up old files.',
    steps: [
      { text: 'Hover over any file row to reveal action buttons' },
      { text: 'Click ⬇ to download — files are decrypted automatically' },
      { text: 'Click 🗑 to delete files you no longer need' },
      { text: 'Deleting files frees up storage for your company' },
    ],
    videoSlides: [
      { icon: '⬇️', text: 'Hover over any file to reveal download and delete buttons', title: 'File Actions', color: 'text-blue-400' },
      { icon: '📥', text: 'Click Download to get your file — it\'s automatically decrypted', title: 'Download Files', color: 'text-green-400' },
      { icon: '🗑️', text: 'Click Delete and confirm to remove files you no longer need', title: 'Delete Files', color: 'text-red-400' },
      { icon: '💾', text: 'Deleting files frees up storage — your company has a quota to manage', title: 'Frees Up Space', color: 'text-yellow-400' },
    ],
    videoUrl: '/training-videos/06-download.mp4',
  },
  {
    id: 'co-records',
    title: 'Working with Data Records',
    duration: '5 min',
    icon: <Database className="w-4 h-4" />,
    goal: 'Create and manage structured data in tables.',
    steps: [
      { text: 'Go to Data Records', link: { to: '/dashboard/records', label: 'Open Records →' } },
      { text: 'Select a table from the left panel to view its records' },
      { text: 'Click "Add Record" to create a new entry' },
      { text: 'Enter data in JSON format — use the example as a template' },
      { text: 'Hover over a record to edit ✏️ or delete 🗑' },
      { text: 'Use 📋 to copy record data when needed' },
    ],
    videoSlides: [
      { icon: '🗄️', text: 'Data Records is a flexible database for your company', title: 'Data Records', color: 'text-blue-400' },
      { icon: '➕', text: 'Click Add Record and enter data in JSON format — each record is flexible', title: 'Adding Records', color: 'text-green-400' },
      { icon: '✏️', text: 'Hover over any record to edit or delete it. Changes save instantly.', title: 'Edit & Delete', color: 'text-yellow-400' },
      { icon: '📋', text: 'Use the Copy button to duplicate records as templates for new entries', title: 'Copy & Reuse', color: 'text-purple-400' },
    ],
    videoUrl: '/training-videos/07-records.mp4',
  },
  {
    id: 'co-storage',
    title: 'Understanding Storage Limits',
    duration: '2 min',
    icon: <Clock className="w-4 h-4" />,
    goal: 'Know your storage quota and what happens when it fills up.',
    steps: [
      { text: 'Check your Dashboard for storage usage', link: { to: '/dashboard', label: 'Open Dashboard →' } },
      { text: 'Your company has a storage limit set by your admin' },
      { text: 'If you hit the limit, uploads will be blocked — delete old files to free space' },
      { text: 'Contact your company admin if you need more storage' },
    ],
    videoSlides: [
      { icon: '📊', text: 'Your company has a storage limit set by your administrator', title: 'Storage Limits', color: 'text-blue-400' },
      { icon: '📈', text: 'Check your Dashboard for current usage — the bar shows how full you are', title: 'Monitor Usage', color: 'text-yellow-400' },
      { icon: '🔵', text: 'Blue = healthy (under 70%). Keep an eye on it as it grows.', title: 'Healthy', color: 'text-blue-400' },
      { icon: '🟡', text: 'Amber = warning (70-90%). Time to clean up old files.', title: 'Getting Full', color: 'text-amber-400' },
      { icon: '🔴', text: 'Red = critical (over 90%). Uploads may be blocked soon!', title: 'Almost Full', color: 'text-red-400' },
    ],
    videoUrl: '/training-videos/08-storage.mp4',
  },
  {
    id: 'co-security',
    title: 'Keeping Data Secure',
    duration: '2 min',
    icon: <BookOpen className="w-4 h-4" />,
    goal: 'Understand the security protecting your company\'s data.',
    steps: [
      { text: 'Every file is encrypted before storage — only your company can access it' },
      { text: 'Your password is hashed with Argon2id — no one can see it' },
      { text: 'Your session lasts 24 hours, then you need to log in again' },
      { text: 'Never share your password. Log out when using shared computers.' },
    ],
    videoSlides: [
      { icon: '🔐', text: 'OrgVault protects your data with enterprise-grade security', title: 'Security First', color: 'text-green-400' },
      { icon: '🔒', text: 'AES-256-GCM encryption — every file is scrambled before storage', title: 'File Encryption', color: 'text-blue-400' },
      { icon: '🔑', text: 'Your password is hashed with Argon2id — no one can see it, not even admins', title: 'Password Protection', color: 'text-purple-400' },
      { icon: '⏰', text: 'Sessions last 24 hours with automatic token rotation', title: 'Session Security', color: 'text-yellow-400' },
      { icon: '✅', text: 'You\'re all set! Your data is safe and secure in OrgVault.', title: 'You\'re Protected!', color: 'text-green-400' },
    ],
    videoUrl: '/training-videos/09-security.mp4',
  },
];

const STORAGE_KEY = 'orgvault-company-training-progress';

export default function CompanyTrainingPage() {
  const { user } = useAuth();
  const { selectedCompany, companies } = useCompany();
  const companyName = selectedCompany?.name || null;

  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set(['co-welcome']));
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

  const toggleLesson = (id: string) => {
    setExpandedLessons((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleComplete = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalLessons = COMPANY_LESSONS.length;
  const completedCount = completed.size;
  const progressPercent = Math.round((completedCount / totalLessons) * 100);

  // No company selected
  if (companies.length > 0 && !companyName) {
    return (
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-50">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Company Training</h1>
              <p className="text-sm text-gray-500">Select a company to begin training</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <Building2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Select a Company First</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Use the company dropdown in the top-right header to select which company you want to train for.
            Each company has its own training progress.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
            <ArrowRight className="w-4 h-4" /> Look for the company selector ↑
          </div>
        </div>
      </div>
    );
  }

  // No companies exist yet
  if (companies.length === 0 && !companyName) {
    return (
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-50">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Company Training</h1>
              <p className="text-sm text-gray-500">Company-level onboarding</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <Building2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Companies Yet</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Your organization hasn't created any companies yet. Contact your administrator to set up company workspaces.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-green-50">
            <Building2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Company Training</h1>
            <p className="text-sm text-gray-500">{companyName} — Onboarding & Operations Guide</p>
          </div>
        </div>

        {/* Progress card */}
        <div className="bg-white rounded-xl border border-green-200 p-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">
                {companyName} Training Progress
              </span>
            </div>
            <span className="text-sm font-bold text-green-700">{progressPercent}% Complete</span>
          </div>
          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {completedCount} of {totalLessons} lessons completed
            {progressPercent === 100 && ' — 🎉 Fully onboarded!'}
          </p>
        </div>
      </div>

      {/* Company context banner */}
      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
        <Building2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800">{companyName}</p>
          <p className="text-xs text-green-600 mt-0.5">
            This training teaches your team how to use OrgVault within <strong>{companyName}</strong>.
            Complete all {totalLessons} lessons to master day-to-day operations.
          </p>
        </div>
      </div>

      {/* Lessons */}
      <div className="space-y-3">
        {COMPANY_LESSONS.map((lesson, i) => {
          const isExpanded = expandedLessons.has(lesson.id);
          const isCompleted = completed.has(lesson.id);

          return (
            <div
              key={lesson.id}
              className={`bg-white rounded-xl border overflow-hidden transition-all ${
                isCompleted ? 'border-green-200' : 'border-gray-200'
              }`}
            >
              <button
                onClick={() => toggleLesson(lesson.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                {/* Step number */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                    isCompleted
                      ? 'bg-green-100 text-green-700'
                      : 'bg-green-50 text-green-600'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </div>

                {/* Icon + Title */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-1.5 rounded bg-green-50 text-green-600 flex-shrink-0">
                    {lesson.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`text-sm font-semibold ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {lesson.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" /> {lesson.duration}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleComplete(lesson.id); }}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                      isCompleted
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600'
                    }`}
                  >
                    {isCompleted ? '✓ Done' : 'Mark done'}
                  </button>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Expanded steps */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
                  {/* Direct video link for testing */}
                  {lesson.videoUrl && (
                    <div className="mb-3">
                      <a
                        href={lesson.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition"
                      >
                        <Play className="w-4 h-4" /> Open Video in New Tab
                      </a>
                      <video
                        key={lesson.videoUrl}
                        src={lesson.videoUrl}
                        controls
                        autoPlay
                        muted
                        playsInline
                        loop
                        className="w-full mt-3 rounded-xl"
                        style={{ maxHeight: '360px', display: 'block', background: '#000' }}
                        preload="auto"
                      >
                        <p>Your browser cannot play this video.</p>
                      </video>
                    </div>
                  )}
                  {/* Fallback slideshow if no video */}
                  {!lesson.videoUrl && lesson.videoSlides ? (
                    <div className="mb-4">
                      <TrainingVideoPlayer
                        title={lesson.title}
                        slides={lesson.videoSlides}
                        autoPlay={false}
                      />
                    </div>
                  ) : (
                    <div className="mb-4 p-4 bg-white border border-dashed border-gray-300 rounded-lg text-center">
                      <Play className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Video tutorial coming soon</p>
                    </div>
                  )}
                  <p className="text-sm text-green-700 font-medium mb-3">
                    🎯 Goal: {lesson.goal}
                  </p>
                  <div className="space-y-2">
                    {lesson.steps.map((step, si) => (
                      <div key={si} className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center mt-0.5">
                          {si + 1}
                        </span>
                        <span className="text-sm text-gray-600">
                          {step.text}
                          {step.link && (
                            <Link
                              to={step.link.to}
                              className="inline-flex items-center gap-1 ml-2 text-green-600 hover:text-green-800 font-medium text-xs"
                            >
                              {step.link.label} <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion */}
      {progressPercent === 100 && (
        <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-xl text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-green-800">Company Training Complete! 🎉</h3>
          <p className="text-sm text-green-600 mt-1 max-w-md mx-auto">
            You've completed all {totalLessons} lessons for <strong>{companyName}</strong>.
            You're ready to manage files, records, and collaborate with your team.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link
              to="/dashboard/files"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition"
            >
              Go to Files
            </Link>
            <Link
              to="/dashboard/records"
              className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-lg hover:bg-green-50 text-sm font-medium transition"
            >
              Go to Records
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
