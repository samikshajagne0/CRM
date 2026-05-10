import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import SlideOver from '../components/ui/SlideOver';
import TaskForm from '../features/tasks/TaskForm';
import { formatDate } from '../lib/formatters';

export default function Tasks() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: '', priority: '', assigned_to_id: '' });
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      const { data } = await apiClient.get(`/tasks?${params}`);
      return data;
    },
  });

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: async () => (await apiClient.get('/users')).data });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => apiClient.put(`/tasks/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const handleEdit = (task) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Medium': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // ── List View Columns ──────────────────────────────────────
  const columns = [
    { 
      key: 'task', 
      label: 'Task', 
      render: (t) => (
        <div className="flex flex-col max-w-[300px]">
          <span className="font-semibold text-gray-900 truncate" title={t.task}>{t.task}</span>
          <span className="text-[11px] text-gray-500 truncate">{t.account_name || 'Internal'}</span>
        </div>
      )
    },
    { 
      key: 'due', 
      label: 'Due Date', 
      render: (t) => {
        const isOverdue = new Date(t.due_date) < new Date(new Date().setHours(0,0,0,0)) && t.status !== 'Completed';
        return (
          <span className={`text-[13px] font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
            {formatDate(t.due_date)}
            {isOverdue && <span className="ml-2 text-[10px] font-bold text-red-500">OVERDUE</span>}
          </span>
        );
      }
    },
    { 
      key: 'priority', 
      label: 'Priority', 
      render: (t) => (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getPriorityColor(t.priority)}`}>
          {t.priority}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      render: (t) => (
        <select 
          className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-[12px] font-medium outline-none cursor-pointer hover:bg-gray-100 transition-colors"
          value={t.status}
          onChange={(e) => statusMutation.mutate({ id: t.id, status: e.target.value })}
        >
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="Deferred">Deferred</option>
          <option value="Completed">Completed</option>
        </select>
      )
    },
    { 
      key: 'assignee', 
      label: 'Assigned To', 
      render: (t) => (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-600">
            {t.assigned_name?.split(' ').map(n => n[0]).join('').slice(0,2) || '?'}
          </div>
          <span className="text-[12px] text-gray-600 font-medium">{t.assigned_name || 'Unassigned'}</span>
        </div>
      )
    },
    {
      key: 'actions',
      label: '',
      render: (t) => <Button variant="ghost" size="sm" onClick={() => handleEdit(t)}>Edit</Button>
    }
  ];

  // ── Kanban Logic ───────────────────────────────────────────
  const kanbanColumns = ['Not Started', 'In Progress', 'Deferred', 'Completed'];
  
  const groupedTasks = useMemo(() => {
    const groups = { 'Not Started': [], 'In Progress': [], 'Deferred': [], 'Completed': [] };
    tasks.forEach(t => {
      if (groups[t.status]) groups[t.status].push(t);
    });
    return groups;
  }, [tasks]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">Tasks</h1>
          <p className="text-[13px] text-[var(--color-text-muted)]">Team task management and execution</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setViewMode('list')}
            >
              List View
            </button>
            <button 
              className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setViewMode('kanban')}
            >
              Kanban
            </button>
          </div>
          <Button variant="primary" onClick={() => { setSelectedTask(null); setIsDrawerOpen(true); }}>+ Create Task</Button>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select 
          className="bg-white border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none min-w-[150px] shadow-sm"
          value={filters.priority}
          onChange={(e) => setFilters(p => ({ ...p, priority: e.target.value }))}
        >
          <option value="">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
        <select 
          className="bg-white border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none min-w-[180px] shadow-sm"
          value={filters.assigned_to_id}
          onChange={(e) => setFilters(p => ({ ...p, assigned_to_id: e.target.value }))}
        >
          <option value="">All Assignees</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        {viewMode === 'list' && (
          <select 
            className="bg-white border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none min-w-[150px] shadow-sm"
            value={filters.status}
            onChange={(e) => setFilters(p => ({ ...p, status: e.target.value }))}
          >
            <option value="">All Statuses</option>
            {kanbanColumns.map(col => <option key={col} value={col}>{col}</option>)}
          </select>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading tasks...</div>
        ) : viewMode === 'list' ? (
          <DataTable columns={columns} data={tasks} />
        ) : (
          /* ── Kanban View ────────────────────────────────── */
          <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
            {kanbanColumns.map(col => (
              <div key={col} className="flex flex-col min-w-[300px] max-w-[300px] bg-gray-50/50 rounded-2xl border border-gray-200">
                <div className="p-4 flex items-center justify-between border-b border-gray-200">
                  <h3 className="font-semibold text-[13px] text-gray-800 uppercase tracking-wider">{col}</h3>
                  <span className="text-[11px] font-bold bg-white px-2 py-0.5 rounded-full text-gray-500 shadow-sm">
                    {groupedTasks[col].length}
                  </span>
                </div>
                <div className="flex-1 p-3 overflow-y-auto space-y-3">
                  {groupedTasks[col].map(t => {
                    const isOverdue = new Date(t.due_date) < new Date(new Date().setHours(0,0,0,0)) && t.status !== 'Completed';
                    return (
                      <div 
                        key={t.id} 
                        onClick={() => handleEdit(t)}
                        className={`bg-white p-4 rounded-xl shadow-sm border hover:shadow-md transition-all cursor-pointer group ${isOverdue ? 'border-red-300' : 'border-gray-200'}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityColor(t.priority)}`}>
                            {t.priority}
                          </span>
                          <span className={`text-[10px] font-bold ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                            {formatDate(t.due_date)}
                          </span>
                        </div>
                        <p className="text-[13px] font-semibold text-gray-900 leading-snug mb-2 group-hover:text-indigo-600 transition-colors">
                          {t.task}
                        </p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <span className="text-[11px] text-gray-500 truncate max-w-[150px]">{t.account_name || 'No Client'}</span>
                          <div 
                            className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600"
                            title={`Assigned to ${t.assigned_name}`}
                          >
                            {t.assigned_name?.split(' ').map(n => n[0]).join('').slice(0,2) || '?'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {groupedTasks[col].length === 0 && (
                    <div className="p-4 text-center text-[12px] text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SlideOver 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        title={selectedTask ? "Edit Task" : "New Task"}
      >
        <TaskForm 
          key={selectedTask?.id || 'new'}
          initialData={selectedTask}
          onSuccess={() => setIsDrawerOpen(false)} 
          onCancel={() => setIsDrawerOpen(false)} 
        />
      </SlideOver>
    </div>
  );
}
