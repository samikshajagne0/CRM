import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import { Card, StatCard, SkeletonCard, EmptyState } from '../components/ui/Card';
import { formatCurrency, formatAbbreviated } from '../lib/formatters';

async function fetchDashboard() {
  const { data } = await apiClient.get('/dashboard');
  return data;
}

export default function Dashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)]">Dashboard</h1>
        <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Welcome back — here's what's happening today.</p>
      </div>

      {/* ── Stat cards ──────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} rows={1} />)}
        </div>
      ) : isError ? null : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Pipeline Value"
            value={formatAbbreviated(data?.pipeline?.total)}
            sub={`${data?.pipeline?.cnt ?? 0} active deals`}
            icon="📈"
            color="blue"
          />
          <StatCard
            label="Overdue Amount"
            value={formatAbbreviated(data?.overdue?.amt)}
            sub={`${data?.overdue?.cnt ?? 0} invoices`}
            icon="⚠️"
            color="red"
          />
          <StatCard
            label="Open Tasks"
            value={data?.openTasks?.cnt ?? 0}
            sub="Due today or earlier"
            icon="✅"
            color="yellow"
          />
          <StatCard
            label="Activities Today"
            value={data?.activitiesToday?.cnt ?? 0}
            sub="Logged so far"
            icon="📞"
            color="green"
          />
        </div>
      )}

      {/* ── Error state ──────────────────────────────────────── */}
      {isError && (
        <Card>
          <EmptyState
            icon="🔌"
            title="Backend not reachable"
            message="Could not load dashboard data. Please make sure the backend server is running on port 4000."
          />
        </Card>
      )}

      {/* ── Content grid ─────────────────────────────────────── */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Pipeline breakdown */}
          <div className="lg:col-span-2">
            <Card>
              <p className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-5">Pipeline Distribution</p>
              {data?.stageBreakdown?.length ? (
                <div className="space-y-4">
                  {data.stageBreakdown.map(item => {
                    const pct = data?.pipeline?.total > 0
                      ? Math.round((item.val / data.pipeline.total) * 100)
                      : 0;
                    return (
                      <div key={item.stage}>
                        <div className="flex items-center justify-between text-[12px] mb-1.5">
                          <span className="font-medium text-[var(--color-text-secondary)]">{item.stage}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[var(--color-text-muted)]">{item.cnt} deals</span>
                            <span className="font-semibold text-[var(--color-text-primary)]">{formatAbbreviated(item.val)}</span>
                            <span className="text-[11px] text-indigo-500 font-medium w-7 text-right">{pct}%</span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon="📊" title="No pipeline data" message="Create opportunities to see your pipeline." />
              )}
            </Card>
          </div>

          {/* Recent Activities */}
          <div>
            <Card>
              <p className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-5">Today's Activities</p>
              {data?.recentActivities?.length ? (
                <div className="space-y-3">
                  {data.recentActivities.map(act => (
                    <div key={act.id} className="flex gap-3 items-start pb-3 border-b border-[var(--color-border-light)] last:border-0 last:pb-0">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 text-[14px]">
                        {act.type === 'Call' ? '📞' : act.type === 'Meeting' ? '🤝' : act.type === 'Email' ? '✉️' : '💬'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{act.subject}</p>
                        <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5">{act.account_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon="📅" title="No activities today" message="Log your first activity for today." />
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
