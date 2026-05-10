import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import SlideOver from '../components/ui/SlideOver';
import ActivityForm from '../features/activities/ActivityForm';
import { formatDate } from '../lib/formatters';

export default function Activities() {
  const [filters, setFilters] = useState({ type: '', owner_id: '', account_id: '' });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activities', filters],
    queryFn: async () => {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      const { data } = await apiClient.get(`/activities?${params}`);
      return data;
    },
  });

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: async () => (await apiClient.get('/users')).data });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: async () => (await apiClient.get('/accounts')).data });
  const { data: types = [] } = useQuery({ queryKey: ['lov', 'activity_type'], queryFn: async () => (await apiClient.get('/lov/activity_type')).data });

  const handleEdit = (act) => {
    setSelectedActivity(act);
    setIsDrawerOpen(true);
  };

  const columns = [
    { 
      key: 'date', 
      label: 'Date / Type', 
      render: (act) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{formatDate(act.date)}</span>
          <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">{act.type}</span>
        </div>
      )
    },
    { 
      key: 'subject', 
      label: 'Interaction', 
      render: (act) => (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900">{act.subject}</span>
          <span className="text-[11px] text-gray-500 truncate max-w-[250px]">{act.outcome || 'No outcome recorded'}</span>
        </div>
      )
    },
    { 
      key: 'linked', 
      label: 'Linked To', 
      render: (act) => (
        <div className="flex flex-col">
          <span className="text-[13px] font-medium text-gray-700">{act.account_name || 'N/A'}</span>
          <span className="text-[10px] text-gray-400">{act.related_module}: {act.related_id ? `#${act.related_id}` : 'Direct'}</span>
        </div>
      )
    },
    { 
      key: 'owner', 
      label: 'Owner', 
      render: (act) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
            {act.owner_name?.split(' ').map(n => n[0]).join('').slice(0,2)}
          </div>
          <span className="text-[13px] text-gray-600">{act.owner_name}</span>
        </div>
      )
    },
    {
      key: 'actions',
      label: '',
      render: (act) => <Button variant="ghost" size="sm" onClick={() => handleEdit(act)}>View</Button>
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">Activities</h1>
          <p className="text-[13px] text-[var(--color-text-muted)]">Central log of all client interactions and follow-ups</p>
        </div>
        <Button variant="primary" onClick={() => { setSelectedActivity(null); setIsDrawerOpen(true); }}>+ Log Activity</Button>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select 
          className="bg-white border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none min-w-[150px] shadow-sm"
          value={filters.type}
          onChange={(e) => setFilters(p => ({ ...p, type: e.target.value }))}
        >
          <option value="">All Types</option>
          {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select 
          className="bg-white border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none min-w-[180px] shadow-sm"
          value={filters.owner_id}
          onChange={(e) => setFilters(p => ({ ...p, owner_id: e.target.value }))}
        >
          <option value="">All Owners</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select 
          className="bg-white border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none min-w-[200px] shadow-sm"
          value={filters.account_id}
          onChange={(e) => setFilters(p => ({ ...p, account_id: e.target.value }))}
        >
          <option value="">All Clients</option>
          {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.account_name}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-hidden">
        <DataTable
          columns={columns}
          data={activities}
          loading={isLoading}
        />
      </div>

      <SlideOver 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        title={selectedActivity ? "Activity Details" : "Log Interaction"}
      >
        <ActivityForm 
          key={selectedActivity?.id || 'new'}
          initialData={selectedActivity}
          onSuccess={() => setIsDrawerOpen(false)} 
          onCancel={() => setIsDrawerOpen(false)} 
        />
      </SlideOver>
    </div>
  );
}
