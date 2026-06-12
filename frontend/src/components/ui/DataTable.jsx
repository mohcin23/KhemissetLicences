import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import EmptyState from './EmptyState';
import { RingLoader } from './Loader';

function SortIcon({ active, direction }) {
  if (!active) {
    return (
      <span className="ml-1 inline-flex flex-col -space-y-1" aria-hidden="true">
        <svg className="h-3 w-3 text-neutral-300" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 2l4 4H2z" />
        </svg>
        <svg className="h-3 w-3 text-neutral-300" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 10l4-4H2z" />
        </svg>
      </span>
    );
  }
  return (
    <span className="ml-1 inline-flex" aria-hidden="true">
      {direction === 'asc' ? (
        <svg className="h-3 w-3 text-primary-600" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 2l4 4H2z" />
        </svg>
      ) : (
        <svg className="h-3 w-3 text-primary-600" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 10l4-4H2z" />
        </svg>
      )}
    </span>
  );
}

export default function DataTable({
  columns,
  data,
  loading = false,
  emptyTitle = 'Aucune donnée',
  emptyDescription = "Il n'y a rien à afficher pour le moment.",
  emptyIcon,
  emptyAction,
  sortKey,
  sortDir = 'desc',
  onSort,
  page = 1,
  totalPages = 1,
  onPageChange,
  className = '',
  rowKey = 'id',
  onRowClick,
  compact = false,
}) {
  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';
  const headerPadding = compact ? 'px-3 py-2.5' : 'px-4 py-3';

  return (
    <div className={`bg-white border border-neutral-200 rounded-xl shadow-card overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${headerPadding} text-left text-xs font-bold uppercase tracking-wider text-neutral-500 ${col.sortable ? 'cursor-pointer select-none hover:text-neutral-700' : ''} ${col.align === 'center' ? 'text-center' : ''} ${col.align === 'right' ? 'text-right' : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => onSort?.(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon active={sortKey === col.key} direction={sortDir} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <RingLoader size="md" className="text-primary-500" />
                    <span className="text-sm text-neutral-400 font-medium">Chargement...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-0">
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                    className="my-8 border-0"
                  />
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row[rowKey] || idx}
                  className={`border-b border-neutral-100 last:border-b-0 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-primary-50/30' : 'hover:bg-neutral-50'}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`${cellPadding} ${col.align === 'center' ? 'text-center' : ''} ${col.align === 'right' ? 'text-right' : ''} ${col.className || ''}`}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 bg-neutral-50/50">
          <span className="text-xs text-neutral-500">
            Page {page} sur {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <PaginationBtn
              disabled={page <= 1}
              onClick={() => onPageChange?.(1)}
              aria-label="Première page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </PaginationBtn>
            <PaginationBtn
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </PaginationBtn>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
              .map((n, idx, arr) => (
                <React.Fragment key={n}>
                  {idx > 0 && arr[idx - 1] !== n - 1 && (
                    <span className="px-1 text-neutral-300">...</span>
                  )}
                  <PaginationBtn
                    active={n === page}
                    onClick={() => onPageChange?.(n)}
                  >
                    {n}
                  </PaginationBtn>
                </React.Fragment>
              ))}

            <PaginationBtn
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              aria-label="Page suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </PaginationBtn>
            <PaginationBtn
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(totalPages)}
              aria-label="Dernière page"
            >
              <ChevronsRight className="h-4 w-4" />
            </PaginationBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function PaginationBtn({ children, active, disabled, onClick, ...rest }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center min-w-[32px] h-8 px-2 text-xs font-bold rounded-lg border transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'bg-primary-900 text-white border-primary-900'
          : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300'
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}
