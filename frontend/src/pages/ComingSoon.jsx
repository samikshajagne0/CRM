// Placeholder for modules not yet implemented
export default function ComingSoon({ module }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <p className="text-[32px] mb-3">🏗</p>
      <p className="text-[18px] font-medium text-[var(--color-text-primary)] mb-1">{module}</p>
      <p className="text-[13px] text-[var(--color-text-muted)]">
        Module architecture is ready. Implementation coming next.
      </p>
    </div>
  );
}
