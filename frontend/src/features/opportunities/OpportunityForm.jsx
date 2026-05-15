import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import Button from '../../components/ui/Button';
import ActivityTimeline from '../activities/ActivityTimeline';

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

export default function OpportunityForm({ onSuccess, onCancel, initialData }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [form, setForm] = useState({
    opportunity_name: '',
    account_id: '',
    value: '',
    currency: 'INR',
    stage: 'Lead',
    probability: 10,
    expected_close: '',
    owner_id: '',
    contact_id: '',
    source: 'Direct',
    notes: '',
    ...initialData
  });

  // Fetch full details
  const { data: fullOpp, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['opportunity', initialData?.id],
    queryFn: async () => (await apiClient.get(`/opportunities/${initialData.id}`)).data,
    enabled: !!initialData?.id
  });

  useEffect(() => {
    if (fullOpp) setForm(p => ({ ...p, ...fullOpp }));
  }, [fullOpp]);

  // Fetch LOV options
  const { data: stages = [] } = useQuery({ 
    queryKey: ['lov', 'opportunity_stage'], 
    queryFn: async () => (await apiClient.get('/lov/opportunity_stage')).data 
  });
  const { data: sources = [] } = useQuery({ 
    queryKey: ['lov', 'lead_source'], 
    queryFn: async () => (await apiClient.get('/lov/lead_source')).data 
  });
  const { data: currencies = [] } = useQuery({ 
    queryKey: ['lov', 'currency'], 
    queryFn: async () => (await apiClient.get('/lov/currency')).data 
  });
  
  // Fetch Accounts for dropdown
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await apiClient.get('/accounts')).data
  });

  // Fetch Contacts for dropdown (filtered by account)
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => (await apiClient.get('/contacts')).data
  });

  // Fetch Users for Owner dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await apiClient.get('/users')).data
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      if (initialData?.id) {
        return apiClient.put(`/opportunities/${initialData.id}`, data);
      }
      return apiClient.post('/opportunities', data);
    }
  });

  const validateForm = () => {
    if (!form.opportunity_name?.trim()) return 'Opportunity Name is required.';
    if (!form.account_id) return 'Please select an Account.';
    if (!form.owner_id) return 'Please select an Owner.';
    if (!form.expected_close) return 'Expected Close date is required.';
    
    const val = parseFloat(form.value);
    if (form.value && (isNaN(val) || val < 0)) return 'Value must be a positive number.';
    
    const prob = parseInt(form.probability);
    if (isNaN(prob) || prob < 0 || prob > 100) return 'Probability must be between 0 and 100.';
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const error = validateForm();
    if (error) return alert(error);

    try {
      await mutation.mutateAsync(form);
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      alert(`Opportunity ${initialData?.id ? 'updated' : 'saved'} successfully!`);
      onSuccess?.();
    } catch (err) {
      alert(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => {
      const updated = { ...p, [name]: value };
      // Auto-set probability based on stage if it's a stage change
      if (name === 'stage') {
        const stageProbabilities = {
          'Lead': 10, 'Qualified': 25, 'Proposal': 50, 'Demo': 60,
          'Negotiation': 75, 'Verbal Approval': 90, 'Won': 100, 'Lost': 0, 'On Hold': 0
        };
        updated.probability = stageProbabilities[value] ?? p.probability;
      }
      return updated;
    });
  };

  const inputClass = "w-full bg-white text-black border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all";

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'activities', label: 'Activities', count: fullOpp?.activities?.length }
  ];

  if (isDetailsLoading) return <div className="p-10 text-center animate-pulse text-gray-400">Loading opportunity...</div>;

  return (
    <div className="flex flex-col h-full -mx-6 -mt-6">
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
        <FormField label="Opportunity Name">
          <input
            name="opportunity_name"
            value={form.opportunity_name}
            onChange={handleChange}
            placeholder="e.g. 500 Licenses for Acme"
            className={inputClass}
            required
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Account">
            <select name="account_id" value={form.account_id} onChange={handleChange} className={inputClass} required>
              <option value="">Select Account</option>
              {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.account_name}</option>)}
            </select>
          </FormField>
          <FormField label="Primary Contact">
            <select name="contact_id" value={form.contact_id} onChange={handleChange} className={inputClass}>
              <option value="">Select Contact</option>
              {contacts.filter(c => !form.account_id || c.account_id == form.account_id).map(c => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Value">
            <input type="number" name="value" value={form.value} onChange={handleChange} className={inputClass} />
          </FormField>
          <FormField label="Currency">
            <select name="currency" value={form.currency} onChange={handleChange} className={inputClass}>
              {currencies.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Stage">
            <select name="stage" value={form.stage} onChange={handleChange} className={inputClass}>
              {stages.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </FormField>
          <FormField label="Probability (%)">
            <input type="number" name="probability" value={form.probability} onChange={handleChange} className={inputClass} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Expected Close">
            <input type="date" name="expected_close" value={form.expected_close} onChange={handleChange} className={inputClass} />
          </FormField>
          <FormField label="Lead Source">
            <select name="source" value={form.source} onChange={handleChange} className={inputClass}>
              {sources.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </FormField>
        </div>

        <FormField label="Owner">
          <select name="owner_id" value={form.owner_id} onChange={handleChange} className={inputClass} required>
            <option value="">Select Owner</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </FormField>

        <FormField label="Notes">
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            className={`${inputClass} min-h-[100px] py-3`}
            placeholder="Next steps, pain points, etc..."
          />
        </FormField>
      </div>

            <div className="pt-6 mt-6 border-t border-[var(--color-border)] flex items-center justify-end gap-3 sticky bottom-0 bg-white pb-2">
              <Button variant="ghost" type="button" onClick={onCancel} disabled={mutation.isPending}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : initialData?.id ? 'Update Opportunity' : 'Save Opportunity'}
              </Button>
            </div>
          </form>
        )}

        {activeTab === 'activities' && (
          <ActivityTimeline activities={fullOpp?.activities || []} />
        )}
      </div>
    </div>
  );
}
