import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import ActivityTimeline from '../activities/ActivityTimeline';
import { formatCurrency, formatDate } from '../../lib/formatters';

// Helper component for form rows
function FormField({ label, children, error }) {
  return (
    <div className="mb-4">
      <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      {children}
      {error && <div className="text-[10px] font-medium text-red-500 mt-1 animate-fade-in">{error}</div>}
    </div>
  );
}

export default function AccountForm({ onSuccess, onCancel, initialData }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [form, setForm] = React.useState({
    account_name: '',
    type: 'Prospect',
    industry: 'Other',
    entity: 'Astura Global Pvt Ltd',
    relationship_owner_id: '',
    website: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'India',
    notes: '',
    active: true,
    ...initialData
  });

  // Fetch full account details including linked items
  const { data: fullAccount, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['account', initialData?.id],
    queryFn: async () => (await apiClient.get(`/accounts/${initialData.id}`)).data,
    enabled: !!initialData?.id
  });

  // Sync form when full details load
  React.useEffect(() => {
    if (fullAccount) {
      setForm(p => ({ ...p, ...fullAccount }));
    }
  }, [fullAccount]);

  // Fetch LOV options
  const { data: industries = [] } = useQuery({ queryKey: ['lov', 'industry'], queryFn: async () => (await apiClient.get('/lov/industry')).data });
  const { data: accountTypes = [] } = useQuery({ queryKey: ['lov', 'account_type'], queryFn: async () => (await apiClient.get('/lov/account_type')).data });
  const { data: entities = [] } = useQuery({ queryKey: ['lov', 'entity'], queryFn: async () => (await apiClient.get('/lov/entity')).data });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: async () => (await apiClient.get('/users')).data });

  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: (data) => {
      if (initialData?.id) return apiClient.put(`/accounts/${initialData.id}`, data);
      return apiClient.post('/accounts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      onSuccess?.();
    }
  });

  const validateForm = () => {
    const e = {};
    if (!form.account_name?.trim()) e.account_name = 'Account Name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Invalid email address';
    }
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await mutation.mutateAsync(form);
      alert('Account saved successfully!');
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || 'Failed to save account');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const inputClass = "w-full bg-white text-black border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-400";
  const errorInputClass = "border-red-400 focus:border-red-500 focus:ring-red-100";

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'contacts', label: 'Contacts', count: fullAccount?.contacts?.length },
    { id: 'opportunities', label: 'Deals', count: fullAccount?.opportunities?.length },
    { id: 'projects', label: 'Projects', count: fullAccount?.projects?.length },
    { id: 'invoices', label: 'Billing', count: fullAccount?.invoices?.length },
    { id: 'activities', label: 'Activities', count: fullAccount?.activities?.length },
  ];

  if (isDetailsLoading) return <div className="p-10 text-center animate-pulse text-gray-400">Loading master record...</div>;

  return (
    <div className="flex flex-col h-full -mx-6 -mt-6">
      {/* ── Tabs Navigation ──────────────────────────────────── */}
      {initialData?.id && (
        <div className="flex items-center gap-1 border-b border-[var(--color-border)] bg-gray-50 px-6 pt-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-3 text-[12px] font-medium transition-all relative
                ${activeTab === tab.id ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}
              `}
            >
              {tab.label}
              {tab.count > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-full text-[10px]">{tab.count}</span>}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'profile' && (
          <form onSubmit={handleSubmit} className="space-y-1">
            <div className="grid grid-cols-1 gap-1">
              <FormField label="Account Name" error={errors.account_name}>
                <input name="account_name" value={form.account_name} onChange={handleChange} className={`${inputClass} ${errors.account_name ? 'border-red-400' : ''}`} />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Type">
                  <select name="type" value={form.type} onChange={handleChange} className={inputClass}>
                    {accountTypes.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </FormField>
                <FormField label="Industry">
                  <select name="industry" value={form.industry} onChange={handleChange} className={inputClass}>
                    {industries.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Entity">
                  <select name="entity" value={form.entity} onChange={handleChange} className={inputClass}>
                    {entities.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </FormField>
                <FormField label="Relationship Owner">
                  <select name="relationship_owner_id" value={form.relationship_owner_id} onChange={handleChange} className={inputClass}>
                    <option value="">Select Owner</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </FormField>
              </div>

              <FormField label="Website">
                <input name="website" value={form.website} onChange={handleChange} placeholder="https://" className={inputClass} />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Email" error={errors.email}>
                  <input name="email" type="email" value={form.email} onChange={handleChange} className={`${inputClass} ${errors.email ? 'border-red-400' : ''}`} />
                </FormField>
                <FormField label="Phone">
                  <input name="phone" value={form.phone} onChange={handleChange} className={inputClass} />
                </FormField>
              </div>

              <FormField label="Address">
                <textarea name="address" value={form.address} onChange={handleChange} className={`${inputClass} min-h-[60px]`} />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="City">
                  <input name="city" value={form.city} onChange={handleChange} className={inputClass} />
                </FormField>
                <FormField label="Country">
                  <input name="country" value={form.country} onChange={handleChange} className={inputClass} />
                </FormField>
              </div>

              <div className="flex items-center gap-2 px-1 mb-4 py-2">
                <input type="checkbox" name="active" id="active" checked={form.active} onChange={handleChange} className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="active" className="text-[13px] font-medium text-[var(--color-text-primary)] cursor-pointer">Account is Active</label>
              </div>

              <FormField label="Notes">
                <textarea name="notes" value={form.notes} onChange={handleChange} className={`${inputClass} min-h-[80px]`} />
              </FormField>
            </div>

            <div className="pt-6 mt-6 border-t border-[var(--color-border)] flex items-center justify-end gap-3 sticky bottom-0 bg-white">
              <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : initialData?.id ? 'Update Account' : 'Save Account'}
              </Button>
            </div>
          </form>
        )}

        {activeTab === 'contacts' && (
          <div className="space-y-4">
            <DataTable
              columns={[
                { key: 'full_name', label: 'Name', render: (c) => <span className="font-medium">{c.full_name}</span> },
                { key: 'title', label: 'Title' },
                { key: 'email', label: 'Email' },
                { key: 'decision_maker', label: 'DM', render: (c) => c.decision_maker ? '✅' : '—' }
              ]}
              data={fullAccount?.contacts || []}
              emptyText="No contacts linked to this account."
            />
          </div>
        )}

        {activeTab === 'opportunities' && (
          <div className="space-y-4">
            <DataTable
              columns={[
                { key: 'opportunity_name', label: 'Deal Name', render: (o) => <span className="font-medium">{o.opportunity_name}</span> },
                { key: 'value', label: 'Value', render: (o) => formatCurrency(o.value, o.currency) },
                { key: 'stage', label: 'Stage', render: (o) => <Badge label={o.stage} /> },
                { key: 'expected_close', label: 'Exp. Close', render: (o) => formatDate(o.expected_close) }
              ]}
              data={fullAccount?.opportunities || []}
              emptyText="No active opportunities for this account."
            />
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-4">
            <DataTable
              columns={[
                { key: 'project_name', label: 'Project Name', render: (p) => <span className="font-medium">{p.project_name}</span> },
                { key: 'status', label: 'Status', render: (p) => <Badge label={p.status} /> },
                { key: 'health', label: 'Health', render: (p) => <Badge label={p.health} /> },
                { key: 'end_date', label: 'Delivery', render: (p) => formatDate(p.end_date) }
              ]}
              data={fullAccount?.projects || []}
              emptyText="No projects associated with this account."
            />
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <DataTable
              columns={[
                { key: 'invoice_no', label: 'Invoice #', render: (i) => <span className="font-medium">{i.invoice_no}</span> },
                { key: 'total', label: 'Amount', render: (i) => formatCurrency(i.total, i.currency) },
                { key: 'status', label: 'Status', render: (i) => <Badge label={i.status} /> },
                { key: 'due_date', label: 'Due Date', render: (i) => formatDate(i.due_date) }
              ]}
              data={fullAccount?.invoices || []}
              emptyText="No billing history found."
            />
          </div>
        )}

        {activeTab === 'activities' && (
          <ActivityTimeline activities={fullAccount?.activities || []} />
        )}
      </div>
    </div>
  );
}
