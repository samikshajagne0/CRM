import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import SlideOver from '../components/ui/SlideOver';
import ContactForm from '../features/contacts/ContactForm';
import { formatLabel } from '../lib/formatters';

async function fetchContacts() {
  const { data } = await apiClient.get('/contacts');
  return data;
}

export default function Contacts() {
  const [filters, setFilters] = useState({ search: '', account_id: '', decision_maker: '' });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  const { data: contacts = [], isLoading, isError } = useQuery({
    queryKey: ['contacts', filters],
    queryFn: async () => {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      const { data } = await apiClient.get(`/contacts?${params}`);
      return data;
    },
  });

  // Fetch Accounts for filter
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await apiClient.get('/accounts')).data
  });

  const handleEdit = (con) => {
    setSelectedContact(con);
    setIsDrawerOpen(true);
  };

  const handleCreate = () => {
    setSelectedContact(null);
    setIsDrawerOpen(true);
  };

  const columns = [
    { 
      key: 'name', 
      label: 'Name', 
      render: (con) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[12px] font-bold text-indigo-600 shadow-sm flex-shrink-0">
            {con.full_name?.split(' ').map(n => n[0]).join('') || '??'}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--color-text-primary)] group-hover:text-indigo-600 transition-colors">
                {con.full_name}
              </span>
              {con.decision_maker && (
                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[9px] font-bold rounded uppercase tracking-wider border border-yellow-200">
                  DM
                </span>
              )}
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)]">{con.title || 'No Title'}</span>
          </div>
        </div>
      )
    },
    { 
      key: 'account_name', 
      label: 'Parent Account',
      render: (con) => (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center text-[9px] text-gray-500 border border-gray-200">
            🏢
          </div>
          <span className="text-[13px] font-medium text-gray-700">{con.account_name || 'Individual'}</span>
        </div>
      )
    },
    { 
      key: 'contact_info', 
      label: 'Contact Details',
      render: (con) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)]">
            <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {con.email || '—'}
          </div>
          {con.mobile && (
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)]">
              <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {con.mobile}
            </div>
          )}
        </div>
      )
    },
    { 
      key: 'department', 
      label: 'Department',
      render: (con) => <span className="text-[12px] text-gray-600">{con.department || '—'}</span>
    },
    { 
      key: 'last_contact', 
      label: 'Last Interaction',
      render: (con) => (
        <div className="flex flex-col">
          <span className="text-[12px] font-medium">{con.last_contact ? formatLabel(con.last_contact) : 'No history'}</span>
          {con.last_contact && <span className="text-[10px] text-green-600">Tracked</span>}
        </div>
      )
    },
    {
      key: 'actions',
      label: '',
      render: (con) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(con)}>Manage</Button>
        </div>
      )
    }
  ];

  if (isError) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-500">Error loading contacts. Please check your connection.</p>
        <Button variant="ghost" onClick={() => window.location.reload()} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">Contacts</h1>
          <p className="text-[13px] text-[var(--color-text-muted)]">Key stakeholders and decision makers within accounts</p>
        </div>
        <Button variant="primary" onClick={handleCreate}>+ New Contact</Button>
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="bg-white border border-[var(--color-border)] rounded-xl mb-6 p-3 flex items-center gap-3 flex-wrap shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            className="w-full bg-gray-50 border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-indigo-100"
            value={filters.search}
            onChange={(e) => setFilters(p => ({ ...p, search: e.target.value }))}
          />
        </div>
        <select 
          className="bg-gray-50 border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[12px] outline-none min-w-[160px]"
          value={filters.account_id}
          onChange={(e) => setFilters(p => ({ ...p, account_id: e.target.value }))}
        >
          <option value="">All Accounts</option>
          {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.account_name}</option>)}
        </select>
        <select 
          className="bg-gray-50 border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[12px] outline-none min-w-[160px]"
          value={filters.decision_maker}
          onChange={(e) => setFilters(p => ({ ...p, decision_maker: e.target.value }))}
        >
          <option value="">DM Status (All)</option>
          <option value="true">Decision Makers Only</option>
          <option value="false">Non-DM Only</option>
        </select>
        {(filters.search || filters.account_id || filters.decision_maker) && (
          <button 
            onClick={() => setFilters({ search: '', account_id: '', decision_maker: '' })}
            className="text-[12px] text-red-500 hover:underline font-medium ml-auto"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <DataTable
          columns={columns}
          data={contacts}
          loading={isLoading}
          onRowClick={handleEdit}
        />
      </div>

      <SlideOver 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        title={selectedContact ? "Edit Stakeholder" : "Add New Contact"}
      >
        <ContactForm 
          key={selectedContact?.id || 'new'}
          initialData={selectedContact}
          onSuccess={() => setIsDrawerOpen(false)} 
          onCancel={() => setIsDrawerOpen(false)} 
        />
      </SlideOver>
    </div>
  );
}
