// AdminPanel shell — migrated from frontend_auth.txt
// Full implementation will expand each tab with real queries.
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import { Card, StatCard } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { useAuth } from '../auth/AuthContext';
import { formatDate, formatTime, formatLabel } from '../../lib/formatters';

const TABS = [
  { k: 'stats', label: 'Overview' },
  { k: 'users', label: 'Users' },
  { k: 'lov',   label: 'System Config' },
  { k: 'audit', label: 'Audit Log' },
];

export default function AdminPanel() {
  const [tab, setTab] = useState('stats');

  return (
    <div>
      <p className="text-[20px] font-medium text-[var(--color-text-primary)] mb-5">Admin Panel</p>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 border-b border-[var(--color-border)] pb-3">
        {TABS.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition cursor-pointer ${
              tab === t.k
                ? 'bg-[var(--color-blue)] text-white'
                : 'bg-transparent text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stats' && <AdminStats />}
      {tab === 'users' && <UsersTab />}
      {tab === 'lov'   && <LovTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}

// ── Stats ──────────────────────────────────────────────────────
function AdminStats() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => { const { data } = await apiClient.get('/admin/stats'); return data; },
  });

  if (isLoading) return <p className="text-[var(--color-text-muted)] text-sm">Loading…</p>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Total Users"    value={data?.users?.total}      color="blue" />
      <StatCard label="Active Users"   value={data?.users?.active}     color="green" />
      <StatCard label="Live Sessions"  value={data?.activeSessions}    color="purple" />
      <StatCard label="LOV Values"     value={data?.activeLovValues}   color="yellow" />
      <div className="col-span-full bg-[var(--color-yellow-bg)] border border-yellow-200 rounded-xl px-4 py-3">
        <p className="text-[13px] text-[var(--color-yellow-text)]">
          Audit events in last 24h: <strong>{data?.auditLast24h}</strong>
        </p>
      </div>
    </div>
  );
}

// ── Users tab ─────────────────────────────────────────────────
function UsersTab() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'sales', entity: 'Astura Global Pvt Ltd' });
  const [formError, setFormError] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => (await apiClient.get('/admin/users')).data,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['admin', 'users']),
  });

  const resetSessionsMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/admin/users/${id}/reset`),
    onSuccess: () => alert('All active sessions for this user have been invalidated.'),
  });

  const saveMutation = useMutation({
    mutationFn: (body) => {
      if (editingUser) return apiClient.put(`/admin/users/${editingUser.id}`, body);
      return apiClient.post('/admin/users', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'users']);
      setShowAdd(false);
      setEditingUser(null);
      setForm({ name: '', email: '', role: 'sales', entity: 'Astura Global Pvt Ltd' });
      setFormError('');
    },
    onError: (e) => setFormError(e.response?.data?.error || 'Failed to save user'),
  });

  const handleEdit = (u) => {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, role: u.role, entity: u.entity || '' });
    setShowAdd(true);
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    saveMutation.mutate(form);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setShowAdd(v => !v); setEditingUser(null); setFormError(''); setForm({ name: '', email: '', role: 'sales', entity: 'Astura Global Pvt Ltd' }); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium text-white cursor-pointer transition"
          style={{ background: 'var(--color-blue)' }}
        >
          {showAdd ? '✕ Cancel' : '+ Add User'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-[var(--color-blue-bg)] border border-[var(--color-blue-border)] rounded-2xl p-5">
          <p className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-4">{editingUser ? 'Edit User' : 'New User'}</p>
          {formError && (
            <p className="text-[13px] text-[var(--color-red-text)] bg-[var(--color-red-bg)] border border-red-200 rounded-lg px-3 py-2 mb-3">{formError}</p>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-[var(--color-text-secondary)] mb-1">Full Name *</label>
              <input
                required
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder="e.g. Kishore Kumar"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--color-text-secondary)] mb-1">Work Email *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder="e.g. kishore@asturaglobal.com"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--color-text-secondary)] mb-1">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="sales">Sales</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--color-text-secondary)] mb-1">Entity</label>
              <input
                value={form.entity}
                onChange={e => setForm(p => ({ ...p, entity: e.target.value }))}
                className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3">
              {editingUser && (
                <button
                  type="button"
                  onClick={() => resetSessionsMutation.mutate(editingUser.id)}
                  className="px-4 py-2.5 rounded-xl text-[12px] font-medium border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer transition"
                >
                  Force Logout
                </button>
              )}
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="px-5 py-2.5 rounded-xl text-[13px] font-medium text-white disabled:opacity-60 cursor-pointer transition"
                style={{ background: 'var(--color-blue)' }}
              >
                {saveMutation.isPending ? 'Saving…' : (editingUser ? 'Update User' : 'Create User')}
              </button>
            </div>
          </form>
        </div>
      )}

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f8f9fc]">
                {['Name', 'Email', 'Role', 'Entity', 'Status', 'Last Login', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider border-b border-[var(--color-border)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--color-border-light)]">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 animate-pulse rounded w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                : users.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-[var(--color-text-muted)] text-[13px]">No users yet. Add one above.</td></tr>
                  )
                : users.map((u) => (
                    <tr key={u.id} className="border-b border-[var(--color-border-light)] hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3 font-medium">
                        {u.name}
                        {u.id === currentUser?.id && <span className="ml-1.5 text-[10px] text-indigo-500 font-semibold">(you)</span>}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{u.email}</td>
                      <td className="px-4 py-3"><Badge label={u.role} variant={u.role} /></td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] text-[12px]">{u.entity || '—'}</td>
                      <td className="px-4 py-3"><Badge label={u.active ? 'Active' : 'Inactive'} variant={u.active ? 'active' : 'inactive'} /></td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)] text-[11px]">{u.last_login ? new Date(u.last_login).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <button onClick={() => handleEdit(u)} className="text-indigo-600 hover:underline cursor-pointer">Edit</button>
                          {u.id !== currentUser?.id && u.active && (
                            <button
                              onClick={() => { if (window.confirm(`Deactivate ${u.name}?`)) deactivateMutation.mutate(u.id); }}
                              disabled={deactivateMutation.isPending}
                              className="text-[var(--color-red-text)] hover:underline cursor-pointer disabled:opacity-50"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Audit tab ─────────────────────────────────────────────────
function AuditTab() {
  const [filters, setFilters] = useState({ limit: 50 });
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin', 'audit', filters],
    queryFn: async () => {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      const { data } = await apiClient.get(`/admin/audit?${params}`);
      return data;
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin', 'users-minimal'],
    queryFn: async () => (await apiClient.get('/admin/users')).data,
  });

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const ACTION_VARIANT = { CREATE: 'active', UPDATE: 'Sent', DELETE: 'Overdue' };

  return (
    <Card padding={false}>
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex gap-3">
        <select
          className="border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[13px] outline-none"
          value={filters.module || ''}
          onChange={(e) => setFilters((p) => ({ ...p, module: e.target.value }))}
        >
          <option value="">All Modules</option>
          {['accounts','contacts','opportunities','projects','invoices','tasks','activities','collections'].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select
          className="border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[13px] outline-none"
          value={filters.user_id || ''}
          onChange={(e) => setFilters((p) => ({ ...p, user_id: e.target.value }))}
        >
          <option value="">All Users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#f8f9fc]">
              {['Time', 'User', 'Action', 'Module', 'Record', 'IP Address'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider border-b border-[var(--color-border)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--color-border-light)]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 animate-pulse rounded w-3/4" /></td>
                    ))}
                  </tr>
                ))
              : rows.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--color-border-light)]">
                    <td className="px-4 py-3 text-[var(--color-text-muted)] text-[11px] whitespace-nowrap">{formatDate(r.created_at)} {formatTime(r.created_at)}</td>
                    <td className="px-4 py-3 font-medium">{formatLabel(r.actor)}</td>
                    <td className="px-4 py-3"><Badge label={r.action} variant={ACTION_VARIANT[r.action]} /></td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatLabel(r.module)}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{formatLabel(r.record_name) || `#${r.record_id}`}</td>
                    <td className="px-4 py-3 text-[11px] text-[var(--color-text-muted)] font-mono">{r.ip_address || '—'}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── LOV / System Config tab ───────────────────────────────────
function LovTab() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingValue, setEditingValue] = useState(null);
  const [form, setForm] = useState({ value: '', label: '', sort_order: 0 });

  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ['admin', 'lov-categories'],
    queryFn: async () => (await apiClient.get('/admin/lov')).data,
  });

  const { data: values = [], isLoading: loadingValues } = useQuery({
    queryKey: ['admin', 'lov-values', selectedCategory],
    queryFn: async () => (await apiClient.get(`/admin/lov/${selectedCategory}`)).data,
    enabled: !!selectedCategory,
  });

  const saveMutation = useMutation({
    mutationFn: (body) => {
      if (editingValue) return apiClient.put(`/admin/lov/${editingValue.id}`, body);
      return apiClient.post('/admin/lov', { ...body, category: selectedCategory });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'lov-values', selectedCategory]);
      queryClient.invalidateQueries(['admin', 'lov-categories']);
      setShowAdd(false);
      setEditingValue(null);
      setForm({ value: '', label: '', sort_order: 0 });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => apiClient.put(`/admin/lov/${id}`, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'lov-values', selectedCategory]);
    },
  });

  const handleEdit = (v) => {
    setEditingValue(v);
    setForm({ value: v.value, label: v.label, sort_order: v.sort_order });
    setShowAdd(true);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Categories list */}
      <div className="space-y-3">
        <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">Categories</p>
        <Card padding={false}>
          <div className="flex flex-col h-[500px] overflow-y-auto">
            {loadingCats ? (
              <div className="p-4 text-center text-sm text-gray-400">Loading…</div>
            ) : categories.map(cat => (
              <button
                key={cat.category}
                onClick={() => { setSelectedCategory(cat.category); setShowAdd(false); setEditingValue(null); }}
                className={`flex items-center justify-between px-4 py-3 text-[13px] border-b border-[var(--color-border-light)] last:border-0 transition text-left ${
                  selectedCategory === cat.category ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-[var(--color-text-secondary)] hover:bg-gray-50'
                }`}
              >
                <span>{formatLabel(cat.category)}</span>
                <span className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{cat.active_count} active</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Values list */}
      <div className="md:col-span-2 space-y-4">
        {selectedCategory ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                Values for <span className="text-indigo-600">{formatLabel(selectedCategory)}</span>
              </p>
              <button
                onClick={() => { setShowAdd(!showAdd); setEditingValue(null); setForm({ value: '', label: '', sort_order: 0 }); }}
                className="text-[12px] text-indigo-600 hover:underline font-medium cursor-pointer"
              >
                {showAdd ? '✕ Cancel' : '+ Add Value'}
              </button>
            </div>

            {showAdd && (
              <div className="bg-gray-50 border border-[var(--color-border)] rounded-xl p-4 animate-fade-in">
                <form 
                  onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
                >
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] text-gray-500 mb-1">Value (ID)</label>
                    <input
                      required
                      disabled={!!editingValue}
                      value={form.value}
                      onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                      className="w-full border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[13px] outline-none bg-white disabled:opacity-50"
                      placeholder="healthcare"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] text-gray-500 mb-1">Display Label</label>
                    <input
                      required
                      value={form.label}
                      onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                      className="w-full border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[13px] outline-none bg-white"
                      placeholder="Healthcare"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] text-gray-500 mb-1">Sort Order</label>
                    <input
                      type="number"
                      value={form.sort_order}
                      onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) }))}
                      className="w-full border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[13px] outline-none bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-[12px] font-medium disabled:opacity-50"
                  >
                    {editingValue ? 'Save' : 'Add'}
                  </button>
                </form>
              </div>
            )}

            <Card padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-gray-50 text-[11px] text-gray-500 uppercase">
                      <th className="px-4 py-2 text-left">Label</th>
                      <th className="px-4 py-2 text-left">Value</th>
                      <th className="px-4 py-2 text-center">Sort</th>
                      <th className="px-4 py-2 text-center">Status</th>
                      <th className="px-4 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingValues ? (
                      <tr><td colSpan={5} className="p-10 text-center text-gray-400">Loading values…</td></tr>
                    ) : values.length === 0 ? (
                      <tr><td colSpan={5} className="p-10 text-center text-gray-400">No values found.</td></tr>
                    ) : values.map(v => (
                      <tr key={v.id} className="border-b border-[var(--color-border-light)] last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 font-medium">{v.label}</td>
                        <td className="px-4 py-2.5 text-gray-500 font-mono text-[11px]">{v.value}</td>
                        <td className="px-4 py-2.5 text-center">{v.sort_order}</td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge label={v.active ? 'Active' : 'Inactive'} variant={v.active ? 'active' : 'inactive'} />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex justify-end gap-3">
                            <button onClick={() => handleEdit(v)} className="text-indigo-600 hover:underline">Edit</button>
                            <button
                              onClick={() => toggleMutation.mutate({ id: v.id, active: !v.active })}
                              className={`text-[11px] font-medium transition cursor-pointer ${v.active ? 'text-red-500 hover:underline' : 'text-green-600 hover:underline'}`}
                            >
                              {v.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ) : (
          <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl p-10">
            <p className="text-[13px] text-gray-400 text-center">Select a category on the left to manage its values.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ComingSoonTab({ label }) {
  return (
    <Card>
      <p className="text-[var(--color-text-muted)] text-sm">🏗 {label} — Implementation coming next.</p>
    </Card>
  );
}
