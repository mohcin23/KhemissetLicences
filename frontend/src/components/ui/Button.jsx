import React from 'react';

const variants = {
  primary:
    'btn-primary text-white focus-visible:ring-[#27ab83] shadow-xs hover:shadow-sm',
  accent:
    'btn-primary text-white focus-visible:ring-[#27ab83] shadow-xs hover:shadow-sm',
  secondary:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 shadow-xs',
  ghost:
    'text-slate-600 hover:bg-slate-100 active:bg-slate-200',
  danger:
    'bg-error-600 text-white hover:bg-error-700 active:bg-error-800 focus-visible:ring-error-400 shadow-xs',
  outline:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100',
  success:
    'btn-primary text-white focus-visible:ring-[#27ab83] shadow-xs hover:shadow-sm',
  link:
    'text-primary-700 underline-offset-2 hover:underline bg-transparent p-0 h-auto min-h-0',
};

const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-md min-h-[28px]',
  sm: 'px-3 py-1.5 text-xs rounded-lg min-h-[32px]',
  md: 'px-4 py-2 text-sm rounded-lg min-h-[38px]',
  lg: 'px-5 py-2.5 text-sm rounded-lg min-h-[44px]',
  xl: 'px-6 py-3 text-base rounded-xl min-h-[48px]',
  icon: 'p-2 rounded-lg min-h-[38px] min-w-[38px]',
  'icon-sm': 'p-1.5 rounded-md min-h-[32px] min-w-[32px]',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  loading,
  type = 'button',
  icon: Icon,
  iconRight: IconRight,
  ...rest
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer whitespace-nowrap';
  const variantClass = variants[variant] || variants.primary;
  const sizeClass = sizes[size] || sizes.md;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${base} ${variantClass} ${sizeClass} ${className}`}
      {...rest}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {!loading && Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {children}
      {!loading && IconRight && <IconRight className="h-4 w-4 shrink-0" aria-hidden="true" />}
    </button>
  );
}
