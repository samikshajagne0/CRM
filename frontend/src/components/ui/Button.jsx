import React from 'react';

// ── Button Component ──────────────────────────────────────────
// Variant × Size matrix matching the CRM's color system

const VARIANTS = {
  primary:  'bg-[var(--color-blue)] text-white hover:bg-blue-600 border-transparent',
  secondary:'bg-white text-[var(--color-text-primary)] border-[var(--color-border)] hover:bg-gray-50',
  danger:   'bg-[var(--color-red-bg)] text-[var(--color-red-text)] border-red-200 hover:bg-red-100',
  ghost:    'bg-transparent text-[var(--color-text-secondary)] border-transparent hover:bg-gray-100',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-[11px] rounded-md',
  md: 'px-4 py-2 text-[13px] rounded-lg',
  lg: 'px-5 py-2.5 text-sm rounded-xl',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 font-medium border transition cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${SIZES[size]} ${className}
      `}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  );
}
