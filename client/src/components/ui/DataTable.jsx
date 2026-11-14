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
  if (isLoading) {
    return <LoadingState count={4} />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyMessage} />;
  }

  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-[#1C2948] ${className}`}>
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b border-[#1C2948] bg-[#101735]/60 text-xs uppercase tracking-wider text-gray-400">
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
        <tbody className="divide-y divide-[#1C2948]">
          {data.map((row, rowIdx) => (
            <tr
              key={row._id || rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              className={`transition-colors hover:bg-[#1C2948]/40 ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={col.key || colIdx}
                  className={`py-3 px-4 text-white dark:text-white light:text-gray-900 ${
                    col.cellClassName || ''
                  }`}
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
