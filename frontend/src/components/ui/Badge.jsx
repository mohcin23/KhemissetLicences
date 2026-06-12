import React from 'react';

const toneMap = {
  default: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  primary: 'bg-primary-50 text-primary-700 border-primary-200',
  success: 'bg-success-50 text-success-700 border-success-200',
  warning: 'bg-warning-50 text-warning-700 border-warning-200',
  error: 'bg-error-50 text-error-700 border-error-200',
  info: 'bg-info-50 text-info-700 border-info-200',
  gold: 'bg-amber-50 text-amber-700 border-amber-200',
};

const dotToneMap = {
  default: 'bg-neutral-400',
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
  info: 'bg-info-500',
  gold: 'bg-amber-500',
};

export default function Badge({
  children,
  tone = 'default',
  dot = false,
  removable = false,
  onRemove,
  className = '',
  size = 'sm',
}) {
  const sizeClass = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs';
  const toneClass = toneMap[tone] || toneMap.default;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${sizeClass} ${toneClass} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotToneMap[tone] || dotToneMap.default}`} aria-hidden="true" />
      )}
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 transition-colors cursor-pointer"
          aria-label="Retirer"
        >
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </button>
      )}
    </span>
  );
}

export function StatusBadge({ status, label, className = '' }) {
  const statusTones = {
    en_cours_analyse: 'info',
    en_attente: 'warning',
    accepte: 'success',
    refuse: 'error',
    documents_rejetes: 'warning',
    fichier_rejete: 'warning',
    avis_favorable: 'primary',
    termine: 'success',
    archive: 'default',
  };
  const tone = statusTones[status] || 'default';
  return (
    <Badge tone={tone} dot className={className}>
      {label}
    </Badge>
  );
}
