import React from 'react';

export default function Card({
  children,
  className = '',
  padding = true,
  hover = false,
  onClick,
  as: Component = 'div',
}) {
  return (
    <Component
      className={`bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm transition-all duration-300 ${hover ? 'card-hover cursor-pointer' : ''} ${padding ? 'p-5 md:p-6' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } } : undefined}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ title, description, action, icon: Icon, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700 ${className}`}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 shrink-0">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          {title && (
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">{title}</h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
