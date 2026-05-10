import React from 'react';

// ── Card Components ────────────────────────────────────────────

export function Card({ children, className = '', padding = true, hover = false }) {
  return (
    <div
      className={`
        bg-white border border-[var(--color-border)] rounded-2xl
        shadow-[var(--shadow-sm)]
        ${padding ? 'p-5' : ''}
        ${hover ? 'hover:shadow-[var(--shadow-md)] transition-shadow duration-200 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">{title}</p>
        {subtitle && (
          <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, sub, icon, color = 'blue', className = '' }) {
  const STYLE = {
    blue:   { bg: 'bg-indigo-50',  text: 'text-indigo-700',  icon: 'bg-indigo-100 text-indigo-500' },
    green:  { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'bg-emerald-100 text-emerald-500' },
    red:    { bg: 'bg-red-50',     text: 'text-red-700',     icon: 'bg-red-100 text-red-500' },
    yellow: { bg: 'bg-amber-50',   text: 'text-amber-700',   icon: 'bg-amber-100 text-amber-500' },
    purple: { bg: 'bg-purple-50',  text: 'text-purple-700',  icon: 'bg-purple-100 text-purple-500' },
    orange: { bg: 'bg-orange-50',  text: 'text-orange-700',  icon: 'bg-orange-100 text-orange-500' },
  };
  const s = STYLE[color] || STYLE.blue;

  return (
    <div className={`bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-[var(--shadow-sm)] ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] uppercase tracking-widest font-semibold text-[var(--color-text-muted)]">{label}</p>
        {icon && (
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[16px] ${s.icon}`}>
            {icon}
          </div>
        )}
      </div>
      <p className={`text-[30px] font-bold leading-none ${s.text}`}>{value ?? '—'}</p>
      {sub && <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5">{sub}</p>}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title = 'No data yet', message = 'Add your first entry to get started.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-[40px] mb-4 opacity-60">{icon}</div>
      <p className="text-[15px] font-medium text-[var(--color-text-secondary)] mb-1">{title}</p>
      <p className="text-[13px] text-[var(--color-text-muted)] max-w-xs">{message}</p>
    </div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────
export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-[var(--shadow-sm)]">
      <div className="h-3.5 skeleton rounded w-1/3 mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-3 skeleton rounded mb-2.5 last:mb-0" style={{ width: `${85 - i * 12}%` }} />
      ))}
    </div>
  );
}
