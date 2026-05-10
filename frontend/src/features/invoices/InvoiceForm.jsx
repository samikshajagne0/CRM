import React, { useState, useEffect } from 'react';
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

export default function InvoiceForm({ onSuccess, onCancel, initialData }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => {
    const formatDate = (d) => d ? d.split('T')[0] : '';
    return {
      date: formatDate(new Date().toISOString()),
      due_date: formatDate(new Date(Date.now() + 15 * 86400000).toISOString()), // default 15 days
      account_id: '',
      entity: 'Astura Global Pvt Ltd',
      project_id: '',
      opportunity_id: '',
      description: '',
      amount: 0,
      gst_rate: 18,
      currency: 'INR',
      status: 'Draft',
      payment_date: '',
      received: 0,
      tds: 0,
      payment_mode: '',
      notes: '',
      ...initialData,
      date: formatDate(initialData?.date || new Date().toISOString()),
      due_date: formatDate(initialData?.due_date || new Date(Date.now() + 15 * 86400000).toISOString()),
      payment_date: formatDate(initialData?.payment_date)
    };
  });

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: async () => (await apiClient.get('/accounts')).data });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: async () => (await apiClient.get('/projects')).data });
  const { data: statuses = [] } = useQuery({ queryKey: ['lov', 'invoice_status'], queryFn: async () => (await apiClient.get('/lov/invoice_status')).data });
  const { data: modes = [] } = useQuery({ queryKey: ['lov', 'payment_mode'], queryFn: async () => (await apiClient.get('/lov/payment_mode')).data });

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === '' ? null : v]));
      if (initialData?.id) return apiClient.put(`/invoices/${initialData.id}`, payload);
      return apiClient.post('/invoices', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onSuccess?.();
    },
    onError: (err) => alert(`Error saving invoice: ${err.response?.data?.error || err.message}`)
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm(p => ({ ...p, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const gst_amt = (form.amount * form.gst_rate) / 100;
  const total_amt = form.amount + gst_amt;
  const net_received = form.received - form.tds;

  const inputClass = "w-full bg-white text-black border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all";

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-1">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Invoice Date">
          <input type="date" name="date" value={form.date} onChange={handleChange} className={inputClass} required />
        </FormField>
        <FormField label="Due Date">
          <input type="date" name="due_date" value={form.due_date} onChange={handleChange} className={inputClass} required />
        </FormField>
      </div>

      <FormField label="Client (Account)">
        <select name="account_id" value={form.account_id} onChange={handleChange} className={inputClass} required>
          <option value="">Select Account</option>
          {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.account_name}</option>)}
        </select>
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Project (Optional)">
          <select name="project_id" value={form.project_id} onChange={handleChange} className={inputClass}>
            <option value="">Select Project</option>
            {projects.filter(p => !form.account_id || p.account_id == form.account_id).map(p => (
              <option key={p.id} value={p.id}>{p.project_name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Status">
          <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
            {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </FormField>
      </div>

      <FormField label="Description">
        <input name="description" value={form.description} onChange={handleChange} className={inputClass} placeholder="e.g. Milestone 1 Payment" />
      </FormField>

      {/* ── Financials ────────────────────────────────────────── */}
      <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <FormField label="Base Amount">
            <input type="number" name="amount" value={form.amount} onChange={handleChange} className={inputClass} />
          </FormField>
          <FormField label="GST Rate (%)">
            <input type="number" name="gst_rate" value={form.gst_rate} onChange={handleChange} className={inputClass} />
          </FormField>
        </div>
        <div className="flex justify-between items-center text-[13px] px-1 border-t border-gray-200 pt-3 mt-2">
          <span className="text-gray-500 font-medium">Total Amount (Incl. GST):</span>
          <span className="font-bold text-gray-900 text-[15px]">₹{total_amt.toLocaleString()}</span>
        </div>
      </div>

      {/* ── Payments ──────────────────────────────────────────── */}
      {form.status !== 'Draft' && (
        <div className="p-4 bg-green-50/50 rounded-2xl border border-dashed border-green-200 mb-6">
          <h3 className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-4">Payment Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Received Amount">
              <input type="number" name="received" value={form.received} onChange={handleChange} className={inputClass} />
            </FormField>
            <FormField label="TDS Deduction">
              <input type="number" name="tds" value={form.tds} onChange={handleChange} className={inputClass} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <FormField label="Payment Date">
              <input type="date" name="payment_date" value={form.payment_date} onChange={handleChange} className={inputClass} />
            </FormField>
            <FormField label="Mode">
              <select name="payment_mode" value={form.payment_mode} onChange={handleChange} className={inputClass}>
                <option value="">Select Mode</option>
                {modes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </FormField>
          </div>
          <div className="flex justify-between items-center text-[12px] px-1 mt-3 text-green-700">
            <span>Net Inflow (Received - TDS):</span>
            <span className="font-bold">₹{net_received.toLocaleString()}</span>
          </div>
        </div>
      )}

      <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-gray-100">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={mutation.isPending}>
          {initialData?.id ? 'Update Invoice' : 'Generate Invoice'}
        </Button>
      </div>
    </form>
  );
}
