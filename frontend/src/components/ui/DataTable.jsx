import React from 'react';

// ── DataTable Shell ───────────────────────────────────────────
// A reusable table shell. Module pages pass their own columns/data.
// Built to be compatible with future @tanstack/react-table integration.
//
// Usage:
//   <DataTable
//     columns={[{ key: 'name', label: 'Name' }, { key: 'status', label: 'Status', render: (val) => <Badge label={val} /> }]}
//     data={accounts}
//     loading={isLoading}
//     emptyText="No accounts found"
//   />

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyText = 'No records found',
  onRowClick,
  expandedRowRender,
  expandedId,
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
      <table className="w-full border-collapse text-[13px]">
        {/* Head */}
        <thead>
          <tr className="bg-[#f8f9fc]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-[11px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider border-b border-[var(--color-border)]"
                style={col.width ? { width: col.width } : {}}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {loading ? (
            // Loading skeleton rows
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="border-b border-[var(--color-border-light)]">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: col.skeletonWidth || '80%' }} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-[var(--color-text-muted)]"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, i) => {
              const isExpanded = expandedId !== undefined && expandedId === row.id;
              return (
                <React.Fragment key={row.id ?? i}>
                  <tr
                    onClick={() => onRowClick?.(row)}
                    className={`
                      border-b border-[var(--color-border-light)] last:border-0
                      ${onRowClick ? 'cursor-pointer hover:bg-[#f8f9fc]' : ''}
                      ${isExpanded ? 'bg-[#f8f9fc]' : ''}
                      transition-colors
                    `}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-[var(--color-text-primary)]">
                        {col.render ? col.render(row) : (row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                  {/* Expanded Row Content */}
                  {isExpanded && expandedRowRender && (
                    <tr className="bg-[#f8f9fc] border-b border-[var(--color-border-light)] last:border-0">
                      <td colSpan={columns.length} className="px-0 py-0 border-t border-[var(--color-border-light)]">
                        <div className="p-4">
                          {expandedRowRender(row)}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
