import React from 'react';

export default function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = 'default',
  trend,
  className = '',
}) {
  const tones = {
    default: {
      card: 'border-l-[#27ab83] bg-white',
      value: 'text-slate-900',
      icon: 'bg-teal-50 text-teal-600 ring-teal-100',
    },
    success: {
      card: 'border-l-emerald-500 bg-white',
      value: 'text-slate-900',
      icon: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    },
    warning: {
      card: 'border-l-amber-500 bg-white',
      value: 'text-slate-900',
      icon: 'bg-amber-50 text-amber-600 ring-amber-100',
    },
    error: {
      card: 'border-l-red-500 bg-white',
      value: 'text-slate-900',
      icon: 'bg-red-50 text-red-500 ring-red-100',
    },
    info: {
      card: 'border-l-blue-500 bg-white',
      value: 'text-slate-900',
      icon: 'bg-blue-50 text-blue-600 ring-blue-100',
    },
    gold: {
      card: 'border-l-amber-500 bg-white',
      value: 'text-slate-900',
      icon: 'bg-amber-50 text-amber-600 ring-amber-100',
    },
    neutral: {
      card: 'border-l-slate-400 bg-white',
      value: 'text-slate-900',
      icon: 'bg-slate-50 text-slate-600 ring-slate-100',
    },
  };

  const t = tones[tone] || tones.default;

  return (
    <div
      className={`stat-card group relative overflow-hidden rounded-2xl border border-slate-100 border-l-4 p-5 shadow-sm card-hover ${t.card} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className={`mt-2 text-3xl font-extrabold tabular-nums tracking-tight ${t.value}`}>{value}</p>
          {sublabel && (
            <p className="mt-1 text-xs text-slate-500">{sublabel}</p>
          )}
          {trend && (
            <p className={`mt-2 text-xs font-semibold ${trend.className || 'text-neutral-500'}`}>
              {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ${t.icon}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-current/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
