import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import SlideOver from '../components/ui/SlideOver';
import AccountForm from '../features/accounts/AccountForm';
import { formatLabel } from '../lib/formatters';

async function fetchAccounts() {
  const { data } = await apiClient.get('/accounts');
  return data;
}

export default function Accounts() {
  const [filters, setFilters] = useState({ search: '', type: '', industry: '' });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const { data: accounts = [], isLoading, isError } = useQuery({
    queryKey: ['accounts', filters],
    queryFn: async () => {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      const { data } = await apiClient.get(`/accounts?${params}`);
      return data;
    },
  });

  // LOVs for filters
  const { data: accountTypes = [] } = useQuery({ queryKey: ['lov', 'account_type'], queryFn: async () => (await apiClient.get('/lov/account_type')).data });
  const { data: industries = [] } = useQuery({ queryKey: ['lov', 'industry'], queryFn: async () => (await apiClient.get('/lov/industry')).data });

  const handleCreate = () => {
    setSelectedAccount(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (acc) => {
    setSelectedAccount(acc);
    setIsDrawerOpen(true);
  };

  const columns = [
    {
      key: 'account_name',
      label: 'Company Name',
      render: (acc) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[var(--color-text-primary)] group-hover:text-indigo-600 transition-colors">
            {acc.account_name}
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.826a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {acc.website || 'No website'}
          </span>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Type',
      render: (acc) => <Badge label={acc.type} variant={acc.type === 'Customer' ? 'active' : 'default'} />
    },
    {
      key: 'industry',
      label: 'Industry',
      render: (acc) => <span className="text-[12px]">{acc.industry}</span>
    },
    {
      key: 'owner',
      label: 'Account Owner',
      render: (acc) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 border border-gray-200">
            {acc.owner_name?.split(' ').map(n => n[0]).join('') || '??'}
          </div>
          <span className="text-[13px]">{acc.owner_name || 'Unassigned'}</span>
        </div>
      )
    },
    {
      key: 'location',
      label: 'Location',
      render: (acc) => (
        <span className="text-[12px] text-[var(--color-text-secondary)]">
          {[acc.city, acc.country].filter(Boolean).join(', ') || '—'}
        </span>
      )
    },
    {
      key: 'active',
      label: 'Status',
      render: (acc) => <Badge label={acc.active ? 'Active' : 'Inactive'} variant={acc.active ? 'active' : 'inactive'} />
    },
    {
      key: 'actions',
      label: '',
      render: (acc) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(acc)}>
            View Details
          </Button>
        </div>
      )
    }
  ];

  if (isError) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-500">Error loading accounts. Please check your connection.</p>
        <Button variant="ghost" onClick={() => window.location.reload()} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">Accounts</h1>
          <p className="text-[13px] text-[var(--color-text-muted)]">Master record for client and prospect companies</p>
        </div>
        <Button variant="primary" onClick={handleCreate}>+ New Account</Button>
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="bg-white border border-[var(--color-border)] rounded-xl mb-6 p-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search accounts..." 
            className="w-full bg-gray-50 border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-indigo-100"
            value={filters.search}
            onChange={(e) => setFilters(p => ({ ...p, search: e.target.value }))}
          />
        </div>
        <select 
          className="bg-gray-50 border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[12px] outline-none min-w-[140px]"
          value={filters.type}
          onChange={(e) => setFilters(p => ({ ...p, type: e.target.value }))}
        >
          <option value="">All Types</option>
          {accountTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select 
          className="bg-gray-50 border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[12px] outline-none min-w-[140px]"
          value={filters.industry}
          onChange={(e) => setFilters(p => ({ ...p, industry: e.target.value }))}
        >
          <option value="">All Industries</option>
          {industries.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
        </select>
        {(filters.search || filters.type || filters.industry) && (
          <button 
            onClick={() => setFilters({ search: '', type: '', industry: '' })}
            className="text-[12px] text-red-500 hover:underline font-medium ml-auto"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <DataTable
          columns={columns}
          data={accounts}
          loading={isLoading}
          onRowClick={handleEdit}
        />
      </div>

      <SlideOver
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedAccount ? "Account Details" : "Create New Account"}
      >
        <AccountForm 
          key={selectedAccount?.id || 'new'}
          initialData={selectedAccount}
          onSuccess={() => setIsDrawerOpen(false)} 
          onCancel={() => setIsDrawerOpen(false)} 
        />
      </SlideOver>
    </div>
  );
}
