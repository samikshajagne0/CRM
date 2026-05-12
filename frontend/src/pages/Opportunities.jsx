import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import SlideOver from '../components/ui/SlideOver';
import OpportunityForm from '../features/opportunities/OpportunityForm';
import PipelineStats from '../features/opportunities/PipelineStats';
import ActivityTimeline from '../features/activities/ActivityTimeline';
import { Card } from '../components/ui/Card';
import { formatCurrency, formatDate, formatLabel } from '../lib/formatters';

export default function Opportunities() {
  const queryClient = useQueryClient();
  const [view, setView] = useState('list');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filters, setFilters] = useState({
    stage: '',
    owner_id: '',
    entity: '',
    quarter: ''
  });

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ['opportunities', filters],
    queryFn: async () => {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      const { data } = await apiClient.get(`/opportunities?${params}`);
      return data;
    }
  });

  // Fetch LOVs for filters
  const { data: stages = [] } = useQuery({ queryKey: ['lov', 'opportunity_stage'], queryFn: async () => (await apiClient.get('/lov/opportunity_stage')).data });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: async () => (await apiClient.get('/users')).data });

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }) => {
      const stageProbs = { 'Lead': 10, 'Qualified': 25, 'Proposal': 50, 'Demo': 60, 'Negotiation': 75, 'Verbal Approval': 90, 'Won': 100, 'Lost': 0 };
      return apiClient.put(`/opportunities/${id}`, { stage, probability: stageProbs[stage] });
    },
    onSuccess: () => queryClient.invalidateQueries(['opportunities'])
  });

  const nextStageMap = {
    'Lead': 'Qualified',
    'Qualified': 'Proposal',
    'Proposal': 'Demo',
    'Demo': 'Negotiation',
    'Negotiation': 'Verbal Approval',
    'Verbal Approval': 'Won'
  };

  const columns = [
    { 
      key: 'expand', 
      label: '', 
      width: '40px',
      render: (opp) => (
        <button 
          onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === opp.id ? null : opp.id); }}
          className="text-gray-400 hover:text-indigo-600 transition-colors"
        >
          <svg className={`w-4 h-4 transform transition-transform ${expandedId === opp.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )
    },
    { 
      key: 'opportunity_name', 
      label: 'Opportunity Name',
      render: (opp) => (
        <div className="flex flex-col">
          <span className="font-medium text-[var(--color-text-primary)] hover:text-indigo-600 cursor-pointer">
            {opp.opportunity_name}
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)]">{opp.account_name}</span>
        </div>
      )
    },
    { 
      key: 'value', 
      label: 'Value',
      render: (opp) => (
        <div className="flex flex-col">
          <span className="font-medium text-[var(--color-text-primary)]">
            {formatCurrency(opp?.value, opp?.currency)}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)] uppercase">
            Weighted: {formatCurrency((opp.value * opp.probability) / 100, opp.currency)}
          </span>
        </div>
      )
    },
    { 
      key: 'stage_actions', 
      label: 'Stage',
      render: (opp) => (
        <div className="flex items-center gap-2">
          <Badge label={formatLabel(opp?.stage)} />
          {nextStageMap[opp.stage] && (
            <button 
              onClick={(e) => { e.stopPropagation(); stageMutation.mutate({ id: opp.id, stage: nextStageMap[opp.stage] }); }}
              className="p-1 hover:bg-indigo-50 text-indigo-600 rounded-md transition-colors group relative"
              title={`Move to ${nextStageMap[opp.stage]}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap">
                Advance to {nextStageMap[opp.stage]}
              </div>
            </button>
          )}
        </div>
      )
    },
    { 
      key: 'owner', 
      label: 'Owner',
      render: (opp) => <span className="text-[13px]">{opp.owner_name}</span>
    },
    { 
      key: 'close_date', 
      label: 'Exp. Close',
      render: (opp) => <span className="text-[12px] font-medium">{formatDate(opp?.expected_close)}</span>
    },
    {
      key: 'actions',
      label: '',
      width: '80px',
      render: (opp) => (
        <button 
          onClick={(e) => { e.stopPropagation(); setEditingOpp(opp); setIsDrawerOpen(true); }}
          className="text-indigo-600 hover:text-indigo-900 font-medium text-[12px]"
        >
          Edit
        </button>
      )
    }
  ];

  const handleEdit = (opp) => {
    setEditingOpp(opp);
    setIsDrawerOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">Sales Pipeline</h1>
          <p className="text-[13px] text-[var(--color-text-muted)]">Manage deals, forecast revenue, and track activity</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={() => { setEditingOpp(null); setIsDrawerOpen(true); }}>+ New Deal</Button>
        </div>
      </div>

      <PipelineStats opportunities={opportunities} />

      <div className="bg-white border border-[var(--color-border)] rounded-xl mb-6 p-3 flex gap-3 flex-wrap">
        <select 
          className="bg-gray-50 border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[12px] outline-none min-w-[140px]"
          value={filters.stage}
          onChange={(e) => setFilters(p => ({ ...p, stage: e.target.value }))}
        >
          <option value="">All Stages</option>
          {stages.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select 
          className="bg-gray-50 border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[12px] outline-none min-w-[140px]"
          value={filters.owner_id}
          onChange={(e) => setFilters(p => ({ ...p, owner_id: e.target.value }))}
        >
          <option value="">All Owners</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select 
          className="bg-gray-50 border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[12px] outline-none min-w-[140px]"
          value={filters.quarter}
          onChange={(e) => setFilters(p => ({ ...p, quarter: e.target.value }))}
        >
          <option value="">Closing Quarter</option>
          <option value="Q1">Q1 (Jan-Mar)</option>
          <option value="Q2">Q2 (Apr-Jun)</option>
          <option value="Q3">Q3 (Jul-Sep)</option>
          <option value="Q4">Q4 (Oct-Dec)</option>
        </select>
        {(filters.stage || filters.owner_id || filters.quarter) && (
          <button 
            onClick={() => setFilters({ stage: '', owner_id: '', entity: '', quarter: '' })}
            className="text-[12px] text-red-500 hover:underline font-medium ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <DataTable
          columns={columns}
          data={opportunities}
          loading={isLoading}
          onRowClick={handleEdit}
          expandedRowRender={(opp) => <ActivityTimeline opportunityId={opp.id} />}
          expandedId={expandedId}
        />
      </div>

      <SlideOver 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        title={editingOpp ? 'Edit Opportunity' : 'Create New Opportunity'}
      >
        <OpportunityForm 
          initialData={editingOpp}
          onSuccess={() => setIsDrawerOpen(false)} 
          onCancel={() => setIsDrawerOpen(false)} 
        />
      </SlideOver>
    </div>
  );
}
