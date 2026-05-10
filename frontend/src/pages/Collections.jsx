import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import SlideOver from '../components/ui/SlideOver';
import CollectionForm from '../features/collections/CollectionForm';
import { formatCurrency, formatDate } from '../lib/formatters';

export default function Collections() {
  const [filters, setFilters] = useState({ status: '', account_id: '', escalation: '' });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['collections', filters],
    queryFn: async () => {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      const { data } = await apiClient.get(`/collections?${params}`);
      return data;
    },
  });

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: async () => (await apiClient.get('/accounts')).data });

  // ── Aging Calculations ──────────────────────────────────────
  const stats = useMemo(() => {
    const buckets = {
      '0-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 },
      '90+': { count: 0, amount: 0 }
    };
    
    collections.forEach(c => {
      if (c.status === 'Cleared' || c.status === 'Written Off') return;
      const d = c.days_overdue;
      const amt = parseFloat(c.amount) || 0;
      
      if (d > 90) { buckets['90+'].count++; buckets['90+'].amount += amt; }
      else if (d > 60) { buckets['61-90'].count++; buckets['61-90'].amount += amt; }
      else if (d > 30) { buckets['31-60'].count++; buckets['31-60'].amount += amt; }
      else if (d > 0) { buckets['0-30'].count++; buckets['0-30'].amount += amt; }
    });
    return buckets;
  }, [collections]);

  const handleEdit = (item) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  const columns = [
    { 
      key: 'invoice', 
      label: 'Invoice / Client', 
      render: (c) => (
        <div className="flex flex-col">
          <span className="font-mono text-[12px] font-bold text-indigo-600">{c.invoice_no || 'Direct Collection'}</span>
          <span className="text-[13px] font-medium text-gray-900">{c.account_name}</span>
        </div>
      )
    },
    { 
      key: 'aging', 
      label: 'Aging', 
      render: (c) => (
        <div className="flex flex-col">
          <span className={`text-[13px] font-bold ${c.days_overdue > 60 ? 'text-red-600' : 'text-orange-600'}`}>
            {c.days_overdue} Days Overdue
          </span>
          <span className="text-[10px] text-gray-400">Due: {formatDate(c.due_date)}</span>
        </div>
      )
    },
    { 
      key: 'amount', 
      label: 'Outstanding', 
      render: (c) => <span className="font-semibold text-gray-900">₹{formatCurrency(c.amount).replace('₹','')}</span>
    },
    { 
      key: 'reminders', 
      label: 'Follow-ups', 
      render: (c) => (
        <div className="flex flex-col">
          <span className="text-[12px] font-medium text-gray-700">{c.reminder_count} Reminders Sent</span>
          <span className="text-[10px] text-gray-400">Last: {formatDate(c.last_reminder) || 'Never'}</span>
        </div>
      )
    },
    { 
      key: 'escalation', 
      label: 'Escalation', 
      render: (c) => <Badge label={c.escalation} />
    },
    {
      key: 'actions',
      label: '',
      render: (c) => <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}>Chase</Button>
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">Collections</h1>
          <p className="text-[13px] text-[var(--color-text-muted)]">Track outstanding recoveries and aging buckets</p>
        </div>
        <Button variant="primary" onClick={() => { setSelectedItem(null); setIsDrawerOpen(true); }}>+ Log Activity</Button>
      </div>

      {/* ── Aging Dashboard ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Object.entries(stats).map(([bucket, data]) => (
          <div key={bucket} className="bg-white p-5 rounded-3xl border border-[var(--color-border)] shadow-sm">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">{bucket} Days</p>
            <p className="text-[20px] font-bold text-gray-900">₹{formatCurrency(data.amount).replace('₹','')}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="text-[11px] text-gray-500 font-medium">{data.count} Pending Cases</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select 
          className="bg-white border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none min-w-[150px] shadow-sm"
          value={filters.escalation}
          onChange={(e) => setFilters(p => ({ ...p, escalation: e.target.value }))}
        >
          <option value="">All Escalations</option>
          <option value="None">None</option>
          <option value="L1">L1 (Team)</option>
          <option value="L2">L2 (Manager)</option>
          <option value="CFO">CFO Level</option>
          <option value="Legal">Legal</option>
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
          data={collections}
          loading={isLoading}
        />
      </div>

      <SlideOver 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        title={selectedItem ? "Chase Invoice" : "New Collection Task"}
      >
        <CollectionForm 
          key={selectedItem?.id || 'new'}
          initialData={selectedItem}
          onSuccess={() => setIsDrawerOpen(false)} 
          onCancel={() => setIsDrawerOpen(false)} 
        />
      </SlideOver>
    </div>
  );
}
