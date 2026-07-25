import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useCompany } from '../hooks/useCompany';
import { Menu, Building2, ChevronDown, Check } from 'lucide-react';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { companies, selectedCompany, selectCompany, isLoading } = useCompany();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 hover:bg-gray-50 rounded-lg"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex-1" />

          {/* Company Selector */}
          {companies.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                <span className="max-w-[140px] truncate">
                  {selectedCompany ? selectedCompany.name : 'All Companies'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                    <button
                      onClick={() => { selectCompany(null); setDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-gray-50 transition-colors ${
                        !selectedCompany ? 'bg-vault-50 text-vault-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5" />
                        All Companies
                      </span>
                      {!selectedCompany && <Check className="w-4 h-4 text-vault-600" />}
                    </button>
                    <div className="border-t border-gray-100" />
                    {companies.map((company) => (
                      <button
                        key={company.id}
                        onClick={() => { selectCompany(company); setDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-gray-50 transition-colors ${
                          selectedCompany?.id === company.id ? 'bg-vault-50 text-vault-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        <span className="truncate">{company.name}</span>
                        {selectedCompany?.id === company.id && <Check className="w-4 h-4 text-vault-600 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </header>

        {/* Page content - renders child route */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
