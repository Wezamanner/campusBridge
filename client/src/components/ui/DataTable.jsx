import React from 'react';
import LoadingState from './LoadingState.jsx';
import EmptyState from './EmptyState.jsx';

export default function DataTable({
  columns = [],
  data = [],
  isLoading = false,
  emptyMessage = 'No records found',
  emptyTitle = 'Empty Data Table',
  onRowClick,
  className = '',
}) {
  if (isLoading) return <LoadingState count={4} />;
  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyMessage} />;
  }

  return (
    <div
      className={`w-full overflow-x-auto rounded-xl ${className}`}
      style={{ border: '1px solid var(--cb-border)' }}
    >
      <table className="w-full text-left text-sm border-collapse" style={{ minWidth: '480px' }}>
        <thead>
          <tr
            className="text-xs uppercase tracking-wider"
            style={{
              borderBottom: '1px solid var(--cb-border)',
              backgroundColor: 'var(--cb-bg)',
              color: 'var(--cb-text-muted)',
            }}
          >
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                className={`py-3.5 px-4 font-semibold ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={row._id || rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              style={{ borderTop: rowIdx > 0 ? '1px solid var(--cb-border)' : 'none' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--cb-surface)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={col.key || colIdx}
                  className={`py-3 px-4 ${col.cellClassName || ''}`}
                  style={{ color: 'var(--cb-text)' }}
                >
                  {col.render
                    ? col.render(row[col.accessor], row)
                    : row[col.accessor] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
