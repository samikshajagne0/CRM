import { useEffect } from 'react';
import Button from './Button';

// ── Modal Component ───────────────────────────────────────────
// Usage:
//   <Modal isOpen={open} onClose={() => setOpen(false)} title="Edit Account" size="md">
//     <p>content</p>
//   </Modal>

const SIZE_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`
          relative z-10 bg-white rounded-2xl shadow-xl w-full ${SIZE_MAP[size] || SIZE_MAP.md}
          flex flex-col max-h-[90vh]
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-[var(--color-border)]">
          <p className="text-[16px] font-medium text-[var(--color-text-primary)]">{title}</p>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-xl leading-none transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-7 py-5 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-7 py-4 border-t border-[var(--color-border)] flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
