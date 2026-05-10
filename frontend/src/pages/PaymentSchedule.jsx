import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import SlideOver from '../components/ui/SlideOver';
import PaymentForm from '../features/payments/PaymentForm';
import { formatCurrency, formatDate } from '../lib/formatters';

export default function PaymentSchedule() {
  const [filters, setFilters] = useState({ status: '', project_id: '' });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const { data: schedule = [], isLoading } = useQuery({
    queryKey: ['payment-schedule', filters],
    queryFn: async () => {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      const { data } = await apiClient.get(`/payment-schedule?${params}`);
      return data;
    },
  });

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: async () => (await apiClient.get('/projects')).data });

  const handleEdit = (p) => {
    setSelectedPayment(p);
    setIsDrawerOpen(true);
  };

  const handleCreate = () => {
    setSelectedPayment(null);
    setIsDrawerOpen(true);
  };

  const columns = [
    { 
      key: 'milestone', 
      label: 'Milestone / Project', 
      render: (p) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{p.milestone}</span>
          <span className="text-[11px] text-gray-500">{p.project_name || 'Direct Milestone'}</span>
        </div>
      )
    },
    { 
      key: 'expected', 
      label: 'Expected Amount / Date', 
      render: (p) => (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900">₹{formatCurrency(p.expected_amount).replace('₹','')}</span>
          <span className="text-[10px] text-gray-400">{formatDate(p.expected_date)}</span>
        </div>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (p) => (
        <div className="flex items-center gap-2">
          <Badge label={p.status} />
          {p.days_until_due < 0 && p.status !== 'Received' && (
            <span className="text-[10px] text-red-500 font-bold">Overdue {Math.abs(p.days_until_due)}d</span>
          )}
          {p.days_until_due >= 0 && p.days_until_due <= 7 && p.status !== 'Received' && (
            <span className="text-[10px] text-orange-500 font-bold">Due in {p.days_until_due}d</span>
          )}
        </div>
      )
    },
    { 
      key: 'variance', 
      label: 'Received / Variance', 
      render: (p) => (
        <div className="flex flex-col">
          <span className="text-[13px] font-medium text-green-600">₹{formatCurrency(p.amount_received).replace('₹','')}</span>
          {p.variance > 0 && <span className="text-[10px] text-red-400">Short: ₹{formatCurrency(p.variance).replace('₹','')}</span>}
        </div>
      )
    },
    { 
      key: 'invoice', 
      label: 'Invoice Raised', 
      render: (p) => (
        <div className="flex items-center gap-2">
          {p.invoice_raised ? (
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              {p.invoice_no || 'Raised'}
            </span>
          ) : (
            <span className="text-[11px] text-gray-300">Pending</span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      label: '',
      render: (p) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}>Manage</Button>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">Payment Schedule</h1>
          <p className="text-[13px] text-[var(--color-text-muted)]">Forward-looking tracker of expected cash inflows</p>
        </div>
        <Button variant="primary" onClick={handleCreate}>+ Add Milestone</Button>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select 
          className="bg-white border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none min-w-[150px] shadow-sm"
          value={filters.status}
          onChange={(e) => setFilters(p => ({ ...p, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Due">Due</option>
          <option value="Overdue">Overdue</option>
          <option value="Received">Received</option>
          <option value="Partial">Partial</option>
        </select>
        <select 
          className="bg-white border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none min-w-[200px] shadow-sm"
          value={filters.project_id}
          onChange={(e) => setFilters(p => ({ ...p, project_id: e.target.value }))}
        >
          <option value="">All Projects</option>
          {projects.map(prj => <option key={prj.id} value={prj.id}>{prj.project_name}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-hidden">
        <DataTable
          columns={columns}
          data={schedule}
          loading={isLoading}
        />
      </div>

      <SlideOver 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        title={selectedPayment ? "Manage Milestone Payment" : "New Expected Payment"}
      >
        <PaymentForm 
          key={selectedPayment?.id || 'new'}
          initialData={selectedPayment}
          onSuccess={() => { setIsDrawerOpen(false); }} 
          onCancel={() => setIsDrawerOpen(false)} 
        />
      </SlideOver>
    </div>
  );
}
