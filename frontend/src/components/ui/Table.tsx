import type { ReactNode } from 'react';
import { Loader2, Inbox, AlertCircle } from 'lucide-react';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

function Table<T>({ columns, rows, rowKey, isLoading, error, emptyMessage = 'No records found', onRowClick }: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-max text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3 font-medium ${col.className ?? ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                Loading...
              </td>
            </tr>
          )}
          {!isLoading && error && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-red-500">
                <AlertCircle className="mx-auto mb-2 h-5 w-5" />
                {error}
              </td>
            </tr>
          )}
          {!isLoading && !error && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">
                <Inbox className="mx-auto mb-2 h-5 w-5" />
                {emptyMessage}
              </td>
            </tr>
          )}
          {!isLoading &&
            !error &&
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`bg-white text-slate-700 dark:bg-slate-950 dark:text-slate-200 ${
                  onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900' : ''
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
