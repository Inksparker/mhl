import { useAuth } from '../hooks/useAuth';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Shield, LogOut, Menu, X, Home, Folder, Database,
  Settings, Building2, Users, GraduationCap
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const managementLinks = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/dashboard/files', icon: Folder, label: 'Files' },
    { to: '/dashboard/records', icon: Database, label: 'Data Records' },
    { to: '/dashboard/companies', icon: Building2, label: 'Companies' },
    { to: '/dashboard/company-training', icon: GraduationCap, label: 'Company Training' },
    { to: '/dashboard/users', icon: Users, label: 'Users' },
    { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  const learningLinks = [
    { to: '/dashboard/training', icon: GraduationCap, label: 'Training' },
  ];

  const isActive = (to: string) => {
    if (to === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(to);
  };

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
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Management section */}
          {managementLinks.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive(to)
                  ? 'bg-vault-50 text-vault-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}

          {/* Learning section divider */}
          <div className="pt-4 mt-4 border-t border-gray-100">
            <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Learning
            </p>
            {learningLinks.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive(to)
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
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
