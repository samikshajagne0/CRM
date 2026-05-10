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

export default function QuarterlyForm({ onSuccess, onCancel, initialData }) {
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: async () => (await apiClient.get('/auth/me')).data });

  const [form, setForm] = useState(() => {
    // Determine current month in YYYY-MM format
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    return {
      month: currentMonth,
      account_id: '',
      offering: '',
      planned_meeting: '',
      remark_1: '',
      remark_2: '',
      remark_3: '',
      owner_id: '',
      entity: 'Astura Global Pvt Ltd',
      ...initialData,
      owner_id: initialData?.owner_id || me?.id || ''
    };
  });

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: async () => (await apiClient.get('/accounts')).data });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: async () => (await apiClient.get('/users')).data });

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === '' ? null : v]));
      if (initialData?.id) return apiClient.put(`/quarterly-tracking/${initialData.id}`, payload);
      return apiClient.post('/quarterly-tracking', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quarterly-tracking'] });
      onSuccess?.();
    },
    onError: (err) => alert(`Error saving record: ${err.response?.data?.error || err.message}`)
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  };

  const inputClass = "w-full bg-white text-black border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all";

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-1">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Tracking Month">
          <input type="month" name="month" value={form.month} onChange={handleChange} className={inputClass} required />
        </FormField>
        <FormField label="Owner">
          <select name="owner_id" value={form.owner_id} onChange={handleChange} className={inputClass} required>
            <option value="">Select Owner</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </FormField>
      </div>

      <FormField label="Client (Account)">
        <select name="account_id" value={form.account_id} onChange={handleChange} className={inputClass} required>
          <option value="">Select Account</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
        </select>
      </FormField>

      <FormField label="Offering / Scope">
        <input name="offering" value={form.offering} onChange={handleChange} className={inputClass} placeholder="What are we pitching or delivering?" />
      </FormField>

      <FormField label="Planned Meeting">
        <input name="planned_meeting" value={form.planned_meeting} onChange={handleChange} className={inputClass} placeholder="When is the next sync?" />
      </FormField>

      <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300 mt-4 mb-4">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Tracking Remarks</h3>
        
        <FormField label="Remark 1 (e.g. Sales Update)">
          <textarea name="remark_1" value={form.remark_1} onChange={handleChange} className={`${inputClass} min-h-[60px]`} />
        </FormField>
        
        <FormField label="Remark 2 (e.g. Delivery Update)">
          <textarea name="remark_2" value={form.remark_2} onChange={handleChange} className={`${inputClass} min-h-[60px]`} />
        </FormField>
        
        <FormField label="Remark 3 (e.g. Finance/Legal)">
          <textarea name="remark_3" value={form.remark_3} onChange={handleChange} className={`${inputClass} min-h-[60px]`} />
        </FormField>
      </div>

      <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-gray-100">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={mutation.isPending}>
          {initialData?.id ? 'Update Record' : 'Save Record'}
        </Button>
      </div>
    </form>
  );
}
