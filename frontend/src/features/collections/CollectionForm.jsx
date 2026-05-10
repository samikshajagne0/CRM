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

export default function CollectionForm({ onSuccess, onCancel, initialData }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => {
    const formatDate = (d) => d ? d.split('T')[0] : '';
    return {
      invoice_id: '',
      account_id: '',
      entity: 'Astura Global Pvt Ltd',
      amount: 0,
      due_date: formatDate(new Date().toISOString()),
      last_reminder: '',
      reminder_count: 0,
      next_action: '',
      next_action_date: '',
      contact_id: '',
      email: '',
      escalation: 'None',
      response: '',
      status: 'Pending',
      notes: '',
      ...initialData,
      due_date: formatDate(initialData?.due_date || new Date().toISOString()),
      last_reminder: formatDate(initialData?.last_reminder),
      next_action_date: formatDate(initialData?.next_action_date)
    };
  });

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: async () => (await apiClient.get('/accounts')).data });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: async () => (await apiClient.get('/invoices')).data });
  const { data: contacts = [] } = useQuery({ queryKey: ['contacts'], queryFn: async () => (await apiClient.get('/contacts')).data });

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === '' ? null : v]));
      if (initialData?.id) return apiClient.put(`/collections/${initialData.id}`, payload);
      return apiClient.post('/collections', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      onSuccess?.();
    },
    onError: (err) => alert(`Error saving collection record: ${err.response?.data?.error || err.message}`)
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm(p => ({ ...p, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const inputClass = "w-full bg-white text-black border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all";

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-1">
      <FormField label="Linked Invoice">
        <select name="invoice_id" value={form.invoice_id} onChange={handleChange} className={inputClass} required>
          <option value="">Select Invoice</option>
          {invoices.map(i => <option key={i.id} value={i.id}>{i.invoice_no} (₹{i.total}) - {i.account_name}</option>)}
        </select>
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Outstanding Amount">
          <input type="number" name="amount" value={form.amount} onChange={handleChange} className={inputClass} required />
        </FormField>
        <FormField label="Original Due Date">
          <input type="date" name="due_date" value={form.due_date} onChange={handleChange} className={inputClass} required />
        </FormField>
      </div>

      <div className="p-4 bg-orange-50/50 rounded-2xl border border-dashed border-orange-200 mb-6 mt-4">
        <h3 className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-4">Follow-up Tracking</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Last Reminder">
            <input type="date" name="last_reminder" value={form.last_reminder} onChange={handleChange} className={inputClass} />
          </FormField>
          <FormField label="Reminder Count">
            <input type="number" name="reminder_count" value={form.reminder_count} onChange={handleChange} className={inputClass} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <FormField label="Escalation Level">
            <select name="escalation" value={form.escalation} onChange={handleChange} className={inputClass}>
              <option value="None">None</option>
              <option value="L1">L1 (Team)</option>
              <option value="L2">L2 (Manager)</option>
              <option value="CFO">CFO Level</option>
              <option value="Legal">Legal</option>
            </select>
          </FormField>
          <FormField label="Status">
            <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
              <option value="Pending">Pending</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Cleared">Cleared</option>
              <option value="Written Off">Written Off</option>
            </select>
          </FormField>
        </div>
      </div>

      <FormField label="Next Action">
        <input name="next_action" value={form.next_action} onChange={handleChange} className={inputClass} placeholder="e.g. Call CFO for approval" />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Next Action Date">
          <input type="date" name="next_action_date" value={form.next_action_date} onChange={handleChange} className={inputClass} />
        </FormField>
        <FormField label="Contact Person">
          <select name="contact_id" value={form.contact_id} onChange={handleChange} className={inputClass}>
            <option value="">Select Contact</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </FormField>
      </div>

      <FormField label="Client Response">
        <textarea name="response" value={form.response} onChange={handleChange} className={`${inputClass} min-h-[80px]`} placeholder="What did the client say?" />
      </FormField>

      <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-gray-100">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={mutation.isPending}>
          {initialData?.id ? 'Update Record' : 'Save Record'}
        </Button>
      </div>
    </form>
  );
}
