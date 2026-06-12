import React from 'react';

export default function PageHeader({ kicker, title, description, actions, icon: Icon, className = '' }) {
  return (
    <div className={`mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between ${className}`}>
      <div className="flex min-w-0 flex-1 items-start gap-4">
        {Icon && (
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-teal-50 text-teal-600 shrink-0 ring-1 ring-teal-100">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          {kicker && (
            <p className="text-xs font-bold uppercase tracking-wider text-teal-600 mb-1">{kicker}</p>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">{title}</h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-slate-500 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
