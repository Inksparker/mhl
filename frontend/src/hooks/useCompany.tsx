import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from './useAuth';
import { orgsApi, Company } from '../lib/api';

interface CompanyContextType {
  companies: Company[];
  selectedCompany: Company | null;
  selectCompany: (company: Company | null) => void;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadCompanies = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    orgsApi
      .listCompanies(user.orgId)
      .then((res) => {
        const list = res.data.companies || [];
        setCompanies(list);

        // If user has a companyId, auto-select that company
        if (user.companyId && !selectedCompany) {
          const match = list.find((c) => c.id === user.companyId);
          if (match) setSelectedCompany(match);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [user, selectedCompany]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const selectCompany = useCallback((company: Company | null) => {
    setSelectedCompany(company);
  }, []);

  return (
    <CompanyContext.Provider
      value={{ companies, selectedCompany, selectCompany, isLoading }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextType {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be used within CompanyProvider');
  return ctx;
}
