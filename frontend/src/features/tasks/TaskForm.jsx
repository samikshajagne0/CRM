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

export default function TaskForm({ onSuccess, onCancel, initialData }) {
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: async () => (await apiClient.get('/auth/me')).data });

  const [form, setForm] = useState(() => {
    const formatDate = (d) => d ? d.split('T')[0] : '';
    return {
      task: '',
      related_module: 'Account',
      related_id: '',
      account_id: '',
      due_date: formatDate(new Date(Date.now() + 86400000).toISOString()), // Default tomorrow
      priority: 'Medium',
      status: 'Not Started',
      assigned_to_id: '',
      created_by_id: '',
      notes: '',
      ...initialData,
      due_date: formatDate(initialData?.due_date || new Date(Date.now() + 86400000).toISOString()),
      assigned_to_id: initialData?.assigned_to_id || me?.id || '',
      created_by_id: initialData?.created_by_id || me?.id || ''
    };
  });

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: async () => (await apiClient.get('/accounts')).data });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: async () => (await apiClient.get('/users')).data });
  
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
      if (initialData?.id) return apiClient.put(`/tasks/${initialData.id}`, payload);
      return apiClient.post('/tasks', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onSuccess?.();
    },
    onError: (err) => alert(`Error saving task: ${err.response?.data?.error || err.message}`)
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  };

  const inputClass = "w-full bg-white text-black border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all";

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-1">
      <FormField label="Task Description">
        <textarea name="task" value={form.task} onChange={handleChange} className={`${inputClass} min-h-[60px]`} placeholder="What needs to be done?" required />
      </FormField>

      <div className="grid grid-cols-2 gap-4 mt-2">
        <FormField label="Due Date">
          <input type="date" name="due_date" value={form.due_date} onChange={handleChange} className={inputClass} required />
        </FormField>
        <FormField label="Priority">
          <select name="priority" value={form.priority} onChange={handleChange} className={inputClass}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Status">
          <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Deferred">Deferred</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </FormField>
        <FormField label="Assigned To">
          <select name="assigned_to_id" value={form.assigned_to_id} onChange={handleChange} className={inputClass} required>
            <option value="">Select Assignee</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </FormField>
      </div>

      {/* ── Polymorphic Linking ─────────────────────────────── */}
      <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300 mb-6 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Link To Module">
            <select name="related_module" value={form.related_module} onChange={handleChange} className={inputClass}>
              <option value="Account">Account</option>
              <option value="Opportunity">Opportunity</option>
              <option value="Project">Project</option>
            </select>
          </FormField>
          
          <FormField label="Related Record">
            <select name="related_id" value={form.related_id} onChange={handleChange} className={inputClass}>
              <option value="">Direct to Account</option>
              {form.related_module === 'Opportunity' && opps.map(o => <option key={o.id} value={o.id}>{o.opportunity_name}</option>)}
              {form.related_module === 'Project' && projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
              {form.related_module === 'Account' && accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
            </select>
          </FormField>
        </div>
        
        <FormField label="Parent Account">
          <select name="account_id" value={form.account_id} onChange={handleChange} className={inputClass}>
            <option value="">Select Account (Optional)</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
          </select>
        </FormField>
      </div>

      <FormField label="Additional Notes">
        <textarea name="notes" value={form.notes} onChange={handleChange} className={`${inputClass} min-h-[80px]`} />
      </FormField>

      <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-gray-100">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" loading={mutation.isPending}>
          {initialData?.id ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
}
