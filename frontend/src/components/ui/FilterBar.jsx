import React from 'react';
import { Search, X } from 'lucide-react';
import { t } from '../../i18n/translations';

export default function FilterBar({
  children,
  lang = 'fr',
  searchValue,
  onSearchChange,
  searchPlaceholder,
  total,
  totalLabel,
  hasActiveFilters = false,
  onClearFilters,
  className = '',
}) {
  const placeholder = searchPlaceholder || t(lang, 'filterBarSearchPlaceholder');
  const label = totalLabel || t(lang, 'filterBarResultsLabel');
  return (
    <div className={`bg-white border border-neutral-200 rounded-xl shadow-card overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-neutral-100">
        <div>
          <h3 className="text-sm font-bold text-neutral-900">{t(lang, 'filterBarTitle')}</h3>
          {total != null && (
            <p className="mt-0.5 text-xs text-neutral-500">
              {total} {label}
            </p>
          )}
        </div>
        {hasActiveFilters && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            {t(lang, 'filterBarClear')}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2.5 p-4 flex-wrap">
        {onSearchChange && (
          <div className="relative flex-1 min-w-[240px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              className="w-full h-10 pl-9 pr-3 border border-neutral-200 rounded-lg bg-white text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-all duration-150 focus:border-accent-500 focus:ring-2 focus:ring-accent-100 hover:border-neutral-300"
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={placeholder}
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                aria-label={t(lang, 'filterBarClearAria')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options, className = '' }) {
  return (
    <select
      className={`h-10 min-w-[130px] px-3 border border-neutral-200 rounded-lg bg-white text-sm text-neutral-900 outline-none transition-all duration-150 focus:border-accent-500 focus:ring-2 focus:ring-accent-100 hover:border-neutral-300 cursor-pointer ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function FilterInput({ value, onChange, placeholder, className = '' }) {
  return (
    <input
      type="text"
      className={`h-10 min-w-[130px] px-3 border border-neutral-200 rounded-lg bg-white text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-all duration-150 focus:border-accent-500 focus:ring-2 focus:ring-accent-100 hover:border-neutral-300 ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

export function FilterToggle({ label, checked, onChange, className = '' }) {
  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer select-none ${className}`}>
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="relative inline-flex h-5 w-9 items-center rounded-full border border-neutral-200 bg-neutral-100 transition-colors duration-200 peer-checked:bg-accent-500 peer-checked:border-accent-500">
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
      </span>
      <span className="text-sm font-medium text-neutral-700">{label}</span>
    </label>
  );
}
