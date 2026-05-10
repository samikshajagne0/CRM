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

export default function ContactForm({ onSuccess, onCancel, initialData }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => {
    const names = (initialData?.full_name || '').split(' ');
    const firstName = names[0] || '';
    const lastName = names.slice(1).join(' ') || '';
    
    // Ensure last_contact is in YYYY-MM-DD format for the date input
    let lastContact = initialData?.last_contact || '';
    if (lastContact && lastContact.includes('T')) {
      lastContact = lastContact.split('T')[0];
    }

    return {
      first_name: firstName,
      last_name: lastName,
      title: '',
      department: '',
      email: '',
      phone: '',
      mobile: '',
      linkedin: '',
      account_id: '',
      decision_maker: false,
      last_contact: lastContact,
      notes: '',
      ...initialData
    };
  });

  // Fetch Accounts for dropdown
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await apiClient.get('/accounts')).data
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      // Prepare data for backend (combine names)
      const payload = {
        ...data,
        full_name: `${data.first_name} ${data.last_name}`.trim()
      };
      
      if (initialData?.id) {
        return apiClient.put(`/contacts/${initialData.id}`, payload);
      }
      return apiClient.post('/contacts', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      onSuccess?.();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name) return alert('First and Last names are required');
    mutation.mutate(form);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const inputClass = "w-full bg-white text-black border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <div className="grid grid-cols-1 gap-1">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="First Name">
            <input name="first_name" value={form.first_name} onChange={handleChange} className={inputClass} required />
          </FormField>
          <FormField label="Last Name">
            <input name="last_name" value={form.last_name} onChange={handleChange} className={inputClass} required />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Job Title">
            <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. CEO" className={inputClass} />
          </FormField>
          <FormField label="Department">
            <input name="department" value={form.department} onChange={handleChange} placeholder="e.g. IT" className={inputClass} />
          </FormField>
        </div>

        <FormField label="Account">
          <select name="account_id" value={form.account_id} onChange={handleChange} className={inputClass} required>
            <option value="">Select Account</option>
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.account_name}</option>)}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email">
            <input name="email" type="email" value={form.email} onChange={handleChange} className={inputClass} />
          </FormField>
          <FormField label="Mobile">
            <input name="mobile" value={form.mobile} onChange={handleChange} className={inputClass} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="LinkedIn URL">
            <input name="linkedin" value={form.linkedin} onChange={handleChange} placeholder="linkedin.com/in/..." className={inputClass} />
          </FormField>
          <FormField label="Last Contact Date">
            <input name="last_contact" type="date" value={form.last_contact} onChange={handleChange} className={inputClass} />
          </FormField>
        </div>

        <div className="flex items-center gap-2 px-1 mb-4 py-2">
          <input
            type="checkbox"
            name="decision_maker"
            id="decision_maker"
            checked={form.decision_maker}
            onChange={handleChange}
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <label htmlFor="decision_maker" className="text-[13px] font-semibold text-[var(--color-text-primary)] cursor-pointer">
            Is Decision Maker? (DM)
          </label>
        </div>

        <FormField label="Notes">
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            className={`${inputClass} min-h-[80px] py-3`}
            placeholder="Key talking points, preferred communication, etc..."
          />
        </FormField>
      </div>

      <div className="pt-6 mt-6 border-t border-[var(--color-border)] flex items-center justify-end gap-3 sticky bottom-0 bg-white pb-2">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : initialData?.id ? 'Update Contact' : 'Save Contact'}
        </Button>
      </div>
    </form>
  );
}
