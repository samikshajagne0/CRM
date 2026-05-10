import React from 'react';

// ── Badge Component ───────────────────────────────────────────
// Covers all status values used across the CRM modules

const VARIANT_MAP = {
  // Generic
  default:  'bg-gray-100 text-gray-600',
  // Roles
  admin:    'bg-[var(--color-purple-bg)] text-[var(--color-purple-text)]',
  manager:  'bg-[var(--color-blue-bg)] text-[var(--color-blue-dark)]',
  sales:    'bg-gray-100 text-gray-700',
  // Active state
  active:   'bg-[var(--color-green-bg)] text-[var(--color-green-text)]',
  inactive: 'bg-[var(--color-red-bg)] text-[var(--color-red-text)]',
  // Invoice status
  Draft:    'bg-gray-100 text-gray-600',
  Sent:     'bg-blue-50 text-blue-700',
  Paid:     'bg-[var(--color-green-bg)] text-[var(--color-green-text)]',
  Overdue:  'bg-[var(--color-red-bg)] text-[var(--color-red-text)]',
  Partial:  'bg-[var(--color-yellow-bg)] text-[var(--color-yellow-text)]',
  Cancelled:'bg-gray-100 text-gray-500',
  // Project health
  'On Track': 'bg-[var(--color-green-bg)] text-[var(--color-green-text)]',
  'At Risk':  'bg-[var(--color-yellow-bg)] text-[var(--color-yellow-text)]',
  'Off Track':'bg-[var(--color-red-bg)] text-[var(--color-red-text)]',
  Completed:  'bg-[var(--color-blue-bg)] text-[var(--color-blue-dark)]',
  // Opportunity stage
  Won:        'bg-[var(--color-green-bg)] text-[var(--color-green-text)]',
  Lost:       'bg-gray-100 text-gray-500',
  'On Hold':  'bg-[var(--color-yellow-bg)] text-[var(--color-yellow-text)]',
};

export default function Badge({ label, variant }) {
  // Auto-detect variant from label if not explicitly provided
  const cls = VARIANT_MAP[variant] || VARIANT_MAP[label] || VARIANT_MAP.default;

  return (
    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}
