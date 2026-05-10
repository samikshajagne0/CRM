import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import SlideOver from '../components/ui/SlideOver';
import QuarterlyForm from '../features/quarterly/QuarterlyForm';

export default function QuarterlyTracking() {
  // Default to current month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const [filters, setFilters] = useState({ month: currentMonth, owner_id: '' });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['quarterly-tracking', filters],
    queryFn: async () => {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      const { data } = await apiClient.get(`/quarterly-tracking?${params}`);
      return data;
    },
  });

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: async () => (await apiClient.get('/users')).data });

  const handleEdit = (record) => {
    setSelectedRecord(record);
    setIsDrawerOpen(true);
  };

  const columns = [
    { 
      key: 'client_offering', 
      label: 'Client / Offering', 
      render: (r) => (
        <div className="flex flex-col min-w-[200px]">
          <span className="font-bold text-[13px] text-gray-900">{r.account_name || 'N/A'}</span>
          <span className="text-[11px] text-indigo-600 font-medium">{r.offering || 'No offering specified'}</span>
        </div>
      )
    },
    { 
      key: 'planned_meeting', 
      label: 'Planned Meeting', 
      render: (r) => <span className="text-[12px] text-gray-700">{r.planned_meeting || '—'}</span>
    },
    { 
      key: 'remark_1', 
      label: 'Remark 1', 
      render: (r) => (
        <p className="text-[11px] text-gray-600 max-w-[250px] whitespace-pre-wrap leading-tight">
          {r.remark_1 || '—'}
        </p>
      )
    },
    { 
      key: 'remark_2', 
      label: 'Remark 2', 
      render: (r) => (
        <p className="text-[11px] text-gray-600 max-w-[250px] whitespace-pre-wrap leading-tight">
          {r.remark_2 || '—'}
        </p>
      )
    },
    { 
      key: 'remark_3', 
      label: 'Remark 3', 
      render: (r) => (
        <p className="text-[11px] text-gray-600 max-w-[250px] whitespace-pre-wrap leading-tight">
          {r.remark_3 || '—'}
        </p>
      )
    },
    { 
      key: 'owner', 
      label: 'Owner', 
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-600">
            {r.owner_name?.split(' ').map(n => n[0]).join('').slice(0,2) || '?'}
          </div>
          <span className="text-[11px] font-medium text-gray-700">{r.owner_name}</span>
        </div>
      )
    },
    {
      key: 'actions',
      label: '',
      render: (r) => <Button variant="ghost" size="sm" onClick={() => handleEdit(r)}>Edit</Button>
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">Quarterly Tracking</h1>
          <p className="text-[13px] text-[var(--color-text-muted)]">Top-level summary reporting for management review</p>
        </div>
        <Button variant="primary" onClick={() => { setSelectedRecord(null); setIsDrawerOpen(true); }}>+ Add Record</Button>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Tracking Month</label>
          <input 
            type="month"
            className="bg-white border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none min-w-[150px] shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            value={filters.month}
            onChange={(e) => setFilters(p => ({ ...p, month: e.target.value }))}
          />
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Filter by Owner</label>
          <select 
            className="bg-white border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none min-w-[180px] shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            value={filters.owner_id}
            onChange={(e) => setFilters(p => ({ ...p, owner_id: e.target.value }))}
          >
            <option value="">All Owners</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <DataTable
          columns={columns}
          data={records}
          loading={isLoading}
          emptyText={`No tracking records found for ${filters.month}.`}
        />
      </div>

      <SlideOver 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        title={selectedRecord ? "Edit Tracking Record" : "New Tracking Record"}
      >
        <QuarterlyForm 
          key={selectedRecord?.id || 'new'}
          initialData={selectedRecord}
          onSuccess={() => setIsDrawerOpen(false)} 
          onCancel={() => setIsDrawerOpen(false)} 
        />
      </SlideOver>
    </div>
  );
}
