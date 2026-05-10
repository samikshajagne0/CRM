import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import SlideOver from '../components/ui/SlideOver';
import InvoiceForm from '../features/invoices/InvoiceForm';
import { formatCurrency, formatDate, formatLabel } from '../lib/formatters';

export default function Invoices() {
  const [filters, setFilters] = useState({ status: '', account_id: '', entity: '' });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      const { data } = await apiClient.get(`/invoices?${params}`);
      return data;
    },
  });

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: async () => (await apiClient.get('/accounts')).data });

  const handleEdit = (inv) => {
    setSelectedInvoice(inv);
    setIsDrawerOpen(true);
  };

  const handleCreate = () => {
    setSelectedInvoice(null);
    setIsDrawerOpen(true);
  };

  const handleSuccess = () => {
    setIsDrawerOpen(false);
    // Invalidation handled in InvoiceForm or via broad key
  };

  const columns = [
    { 
      key: 'invoice_no', 
      label: 'Invoice No', 
      render: (i) => (
        <div className="flex flex-col">
          <span className="font-mono text-[13px] font-bold text-indigo-600">{i.invoice_no}</span>
          <span className="text-[10px] text-gray-400 uppercase tracking-tighter">{formatDate(i.date)}</span>
        </div>
      )
    },
    { 
      key: 'client', 
      label: 'Client / Project', 
      render: (i) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{i.account_name}</span>
          <span className="text-[11px] text-gray-500">{i.project_name || i.opportunity_name || 'Direct Billing'}</span>
        </div>
      )
    },
    { 
      key: 'amount', 
      label: 'Amount (Incl. GST)', 
      render: (i) => (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900">₹{formatCurrency(i.total).replace('₹','')}</span>
          <span className="text-[10px] text-gray-400">GST (18%): ₹{formatCurrency(i.gst).replace('₹','')}</span>
        </div>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (i) => (
        <div className="flex items-center gap-2">
          <Badge label={i.status} />
          {i.days_overdue > 0 && <span className="text-[10px] text-red-500 font-bold">Overdue {i.days_overdue}d</span>}
        </div>
      )
    },
    {
      key: 'actions',
      label: '',
      render: (i) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(i)}>Edit</Button>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">Invoices</h1>
          <p className="text-[13px] text-[var(--color-text-muted)]">Manage billings, payments, and overdue tracking</p>
        </div>
        <Button variant="primary" onClick={handleCreate}>+ Create Invoice</Button>
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select 
          className="bg-white border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none min-w-[150px] shadow-sm"
          value={filters.status}
          onChange={(e) => setFilters(p => ({ ...p, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Sent">Sent</option>
          <option value="Paid">Paid</option>
          <option value="Overdue">Overdue</option>
          <option value="Partial">Partial</option>
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
          data={invoices}
          loading={isLoading}
          rowClassName={(row) => row.days_overdue > 0 ? 'bg-red-50/30' : ''}
        />
      </div>

      <SlideOver 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        title={selectedInvoice ? `Edit Invoice: ${selectedInvoice.invoice_no}` : "New Invoice"}
      >
        <InvoiceForm 
          key={selectedInvoice?.id || 'new'}
          initialData={selectedInvoice}
          onSuccess={handleSuccess} 
          onCancel={() => setIsDrawerOpen(false)} 
        />
      </SlideOver>
    </div>
  );
}
