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

export default function PaymentForm({ onSuccess, onCancel, initialData }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => {
    const formatDate = (d) => d ? d.split('T')[0] : '';
    return {
      account_id: '',
      entity: 'Astura Global Pvt Ltd',
      project_id: '',
      milestone: '',
      expected_amount: 0,
      expected_date: formatDate(new Date().toISOString()),
      invoice_raised: false,
      invoice_id: '',
      invoice_date: '',
      received: false,
      amount_received: 0,
      status: 'Upcoming',
      notes: '',
      ...initialData,
      expected_date: formatDate(initialData?.expected_date || new Date().toISOString()),
      invoice_date: formatDate(initialData?.invoice_date),
    };
  });

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: async () => (await apiClient.get('/accounts')).data });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: async () => (await apiClient.get('/projects')).data });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: async () => (await apiClient.get('/invoices')).data });
  const { data: statuses = [] } = useQuery({ queryKey: ['lov', 'payment_schedule_status'], queryFn: async () => (await apiClient.get('/lov/payment_schedule_status')).data });

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === '' ? null : v]));
      if (initialData?.id) return apiClient.put(`/payment-schedule/${initialData.id}`, payload);
      return apiClient.post('/payment-schedule', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedule'] });
      onSuccess?.();
    },
    onError: (err) => alert(`Error saving payment milestone: ${err.response?.data?.error || err.message}`)
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ 
      ...p, 
      [name]: type === 'number' ? parseFloat(value) || 0 : type === 'checkbox' ? checked : value 
    }));
  };

  const inputClass = "w-full bg-white text-black border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all";

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-1">
      <FormField label="Milestone Description">
        <input name="milestone" value={form.milestone} onChange={handleChange} className={inputClass} placeholder="e.g. Phase 1 Go-Live" required />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Account">
          <select name="account_id" value={form.account_id} onChange={handleChange} className={inputClass} required>
            <option value="">Select Account</option>
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.account_name}</option>)}
          </select>
        </FormField>
        <FormField label="Project">
          <select name="project_id" value={form.project_id} onChange={handleChange} className={inputClass}>
            <option value="">Select Project</option>
            {projects.filter(p => !form.account_id || p.account_id == form.account_id).map(p => (
              <option key={p.id} value={p.id}>{p.project_name}</option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Expected Amount">
          <input type="number" name="expected_amount" value={form.expected_amount} onChange={handleChange} className={inputClass} required />
        </FormField>
        <FormField label="Expected Date">
          <input type="date" name="expected_date" value={form.expected_date} onChange={handleChange} className={inputClass} required />
        </FormField>
      </div>

      <div className="p-4 bg-indigo-50/50 rounded-2xl border border-dashed border-indigo-200 mb-6 mt-4">
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="invoice_raised" checked={form.invoice_raised} onChange={handleChange} className="w-4 h-4 rounded text-indigo-600" />
            <span className="text-[12px] font-medium text-indigo-700">Invoice Raised?</span>
          </label>
        </div>
        
        {form.invoice_raised && (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
            <FormField label="Linked Invoice">
              <select name="invoice_id" value={form.invoice_id} onChange={handleChange} className={inputClass}>
                <option value="">Select Invoice</option>
                {invoices.filter(i => !form.account_id || i.account_id == form.account_id).map(i => (
                  <option key={i.id} value={i.id}>{i.invoice_no} (₹{i.total})</option>
                ))}
              </select>
            </FormField>
            <FormField label="Invoice Date">
              <input type="date" name="invoice_date" value={form.invoice_date} onChange={handleChange} className={inputClass} />
            </FormField>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Amount Received">
          <input type="number" name="amount_received" value={form.amount_received} onChange={handleChange} className={inputClass} />
        </FormField>
        <FormField label="Status">
          <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
            {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </FormField>
      </div>

      <FormField label="Notes">
        <textarea name="notes" value={form.notes} onChange={handleChange} className={`${inputClass} min-h-[80px]`} />
      </FormField>

      <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-gray-100">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={mutation.isPending}>
          {initialData?.id ? 'Update Milestone' : 'Add Milestone'}
        </Button>
      </div>
    </form>
  );
}
