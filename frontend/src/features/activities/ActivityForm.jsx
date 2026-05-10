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

export default function ActivityForm({ onSuccess, onCancel, initialData }) {
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: async () => (await apiClient.get('/auth/me')).data });

  const [form, setForm] = useState(() => {
    const formatDate = (d) => d ? d.split('T')[0] : '';
    return {
      date: formatDate(new Date().toISOString()),
      type: 'Call',
      subject: '',
      related_module: 'Account',
      related_id: '',
      account_id: '',
      contact_id: '',
      owner_id: '',
      entity: 'Astura Global Pvt Ltd',
      outcome: '',
      next_steps: '',
      next_date: '',
      notes: '',
      ...initialData,
      date: formatDate(initialData?.date || new Date().toISOString()),
      next_date: formatDate(initialData?.next_date),
      owner_id: initialData?.owner_id || me?.id || ''
    };
  });

  // Fetch contextual data
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: async () => (await apiClient.get('/accounts')).data });
  const { data: contacts = [] } = useQuery({ queryKey: ['contacts'], queryFn: async () => (await apiClient.get('/contacts')).data });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: async () => (await apiClient.get('/users')).data });
  const { data: types = [] } = useQuery({ queryKey: ['lov', 'activity_type'], queryFn: async () => (await apiClient.get('/lov/activity_type')).data });
  
  // Specific related lists based on module
  const { data: opps = [] } = useQuery({ 
    queryKey: ['opportunities'], 
    enabled: form.related_module === 'Opportunity',
    queryFn: async () => (await apiClient.get('/opportunities')).data 
  });
  const { data: projects = [] } = useQuery({ 
    queryKey: ['projects'], 
    enabled: form.related_module === 'Project',
    queryFn: async () => (await apiClient.get('/projects')).data 
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === '' ? null : v]));
      if (initialData?.id) return apiClient.put(`/activities/${initialData.id}`, payload);
      return apiClient.post('/activities', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      // If it was an opportunity activity, refresh opportunities for last_activity date
      if (form.related_module === 'Opportunity') queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      onSuccess?.();
    },
    onError: (err) => alert(`Error logging activity: ${err.response?.data?.error || err.message}`)
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm(p => ({ ...p, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const inputClass = "w-full bg-white text-black border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all";

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-1">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Activity Date">
          <input type="date" name="date" value={form.date} onChange={handleChange} className={inputClass} required />
        </FormField>
        <FormField label="Type">
          <select name="type" value={form.type} onChange={handleChange} className={inputClass}>
            {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </FormField>
      </div>

      <FormField label="Subject / Purpose">
        <input name="subject" value={form.subject} onChange={handleChange} className={inputClass} placeholder="e.g. Discovery Call with CTO" required />
      </FormField>

      {/* ── Polymorphic Linking ─────────────────────────────── */}
      <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300 mb-6 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Link To Module">
            <select name="related_module" value={form.related_module} onChange={handleChange} className={inputClass}>
              <option value="Account">Account</option>
              <option value="Opportunity">Opportunity</option>
              <option value="Project">Project</option>
              <option value="Contact">Contact</option>
            </select>
          </FormField>
          
          <FormField label="Related Record">
            <select name="related_id" value={form.related_id} onChange={handleChange} className={inputClass}>
              <option value="">Direct to Account</option>
              {form.related_module === 'Opportunity' && opps.map(o => <option key={o.id} value={o.id}>{o.opportunity_name}</option>)}
              {form.related_module === 'Project' && projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
              {form.related_module === 'Contact' && contacts.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              {form.related_module === 'Account' && accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
            </select>
          </FormField>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-2">
          <FormField label="Parent Account">
            <select name="account_id" value={form.account_id} onChange={handleChange} className={inputClass} required>
              <option value="">Select Account</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
            </select>
          </FormField>
          <FormField label="Owner">
            <select name="owner_id" value={form.owner_id} onChange={handleChange} className={inputClass} required>
              <option value="">Select Owner</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </FormField>
        </div>
      </div>

      <FormField label="Outcome">
        <input name="outcome" value={form.outcome} onChange={handleChange} className={inputClass} placeholder="Key takeaway from this interaction" />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Next Steps">
          <input name="next_steps" value={form.next_steps} onChange={handleChange} className={inputClass} placeholder="What follows?" />
        </FormField>
        <FormField label="Follow-up Date">
          <input type="date" name="next_date" value={form.next_date} onChange={handleChange} className={inputClass} />
        </FormField>
      </div>

      <FormField label="Notes">
        <textarea name="notes" value={form.notes} onChange={handleChange} className={`${inputClass} min-h-[80px]`} />
      </FormField>

      <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-gray-100">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={mutation.isPending}>
          {initialData?.id ? 'Update Activity' : 'Log Activity'}
        </Button>
      </div>
    </form>
  );
}
