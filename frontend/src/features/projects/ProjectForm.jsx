import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import Button from '../../components/ui/Button';

function FormField({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function ProjectForm({ onSuccess, onCancel, initialData }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => {
    // Standardize dates for inputs
    const formatDateForInput = (d) => d ? d.split('T')[0] : '';
    
    return {
      project_name: '',
      account_id: '',
      opportunity_id: '',
      status: 'Not Started',
      health: 'On Track',
      entity: 'Astura Global Pvt Ltd',
      contract_value: 0,
      invoiced: 0,
      received: 0,
      total_milestones: 0,
      completed_milestones: 0,
      next_milestone: '',
      notes: '',
      project_manager_id: null,
      ...initialData,
      start_date: formatDateForInput(initialData?.start_date || new Date().toISOString()),
      end_date: formatDateForInput(initialData?.end_date || '')
    };
  });

  // Fetch LOV options
  const { data: statuses = [] } = useQuery({ queryKey: ['lov', 'project_status'], queryFn: async () => (await apiClient.get('/lov/project_status')).data });
  const { data: healths = [] } = useQuery({ queryKey: ['lov', 'project_health'], queryFn: async () => (await apiClient.get('/lov/project_health')).data });
  const { data: entities = [] } = useQuery({ queryKey: ['lov', 'entity'], queryFn: async () => (await apiClient.get('/lov/entity')).data });
  
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: async () => (await apiClient.get('/accounts')).data });
  const { data: opportunities = [] } = useQuery({ queryKey: ['opportunities'], queryFn: async () => (await apiClient.get('/opportunities')).data });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: async () => (await apiClient.get('/users')).data });

  const mutation = useMutation({
    mutationFn: (data) => {
      // Sanitize payload: convert empty strings to null for database compatibility
      const payload = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
      );

      if (initialData?.id) return apiClient.put(`/projects/${initialData.id}`, payload);
      return apiClient.post('/projects', payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'], exact: false });
      onSuccess?.();
    },
    onError: (err) => {
      const msg = err.response?.data?.error || err.message;
      alert(`Error saving project: ${msg}`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.project_name || !form.account_id) {
      return alert('Project Name and Account are required fields.');
    }
    mutation.mutate(form);
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm(p => ({ ...p, [name]: type === 'number' ? (parseFloat(value) || 0) : value }));
  };

  const inputClass = "w-full bg-white text-black border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all";

  // Auto-calculated fields (displayed only)
  const pending = (form.invoiced - form.received).toFixed(2);
  const completionPct = form.total_milestones > 0 
    ? Math.round((form.completed_milestones / form.total_milestones) * 100) 
    : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <div className="grid grid-cols-1 gap-1">
        <FormField label="Project Name">
          <input name="project_name" value={form.project_name} onChange={handleChange} className={inputClass} required />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Account">
            <select name="account_id" value={form.account_id} onChange={handleChange} className={inputClass} required>
              <option value="">Select Account</option>
              {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.account_name}</option>)}
            </select>
          </FormField>
          <FormField label="Manager">
            <select name="project_manager_id" value={form.project_manager_id} onChange={handleChange} className={inputClass}>
              <option value="">Select PM</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Status">
            <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
              {statuses.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </FormField>
          <FormField label="Health">
            <select name="health" value={form.health} onChange={handleChange} className={inputClass}>
              {healths.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </FormField>
        </div>

        {/* ── Financial Tracker ───────────────────────────────── */}
        <div className="p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300 mb-4">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Financial Tracker</h3>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Contract">
              <input type="number" name="contract_value" value={form.contract_value} onChange={handleChange} className={inputClass} />
            </FormField>
            <FormField label="Invoiced">
              <input type="number" name="invoiced" value={form.invoiced} onChange={handleChange} className={inputClass} />
            </FormField>
            <FormField label="Received">
              <input type="number" name="received" value={form.received} onChange={handleChange} className={inputClass} />
            </FormField>
          </div>
          <div className="mt-2 text-[11px] text-gray-500 flex justify-between px-1">
            <span>Pending Balance: <strong className="text-red-500">₹{pending}</strong></span>
          </div>
        </div>

        {/* ── Milestone Tracker ──────────────────────────────── */}
        <div className="p-3 bg-indigo-50/50 rounded-xl border border-dashed border-indigo-200 mb-4">
          <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">Milestones & Progress</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Total">
              <input type="number" name="total_milestones" value={form.total_milestones} onChange={handleChange} className={inputClass} />
            </FormField>
            <FormField label="Completed">
              <input type="number" name="completed_milestones" value={form.completed_milestones} onChange={handleChange} className={inputClass} />
            </FormField>
          </div>
          <div className="mt-3">
            <FormField label="Next Milestone">
              <input name="next_milestone" value={form.next_milestone} onChange={handleChange} placeholder="e.g. UAT Signoff" className={inputClass} />
            </FormField>
          </div>
          <div className="mt-2 text-[11px] text-indigo-600 font-medium px-1">
            Overall Completion: {completionPct}%
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start Date">
            <input type="date" name="start_date" value={form.start_date} onChange={handleChange} className={inputClass} />
          </FormField>
          <FormField label="End Date">
            <input type="date" name="end_date" value={form.end_date} onChange={handleChange} className={inputClass} />
          </FormField>
        </div>

        <FormField label="Internal Notes">
          <textarea name="notes" value={form.notes} onChange={handleChange} className={`${inputClass} min-h-[60px]`} />
        </FormField>
      </div>

      <div className="pt-4 mt-4 border-t border-[var(--color-border)] flex items-center justify-end gap-3 sticky bottom-0 bg-white">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : initialData?.id ? 'Update Project' : 'Launch Project'}
        </Button>
      </div>
    </form>
  );
}
