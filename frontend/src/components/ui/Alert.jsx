import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const tones = {
  success: {
    bg: 'bg-success-50 border-success-200',
    icon: 'text-success-600',
    text: 'text-success-800',
    Icon: CheckCircle2,
  },
  warning: {
    bg: 'bg-warning-50 border-warning-200',
    icon: 'text-warning-600',
    text: 'text-warning-800',
    Icon: AlertTriangle,
  },
  error: {
    bg: 'bg-error-50 border-error-200',
    icon: 'text-error-600',
    text: 'text-error-800',
    Icon: XCircle,
  },
  info: {
    bg: 'bg-info-50 border-info-200',
    icon: 'text-info-600',
    text: 'text-info-800',
    Icon: Info,
  },
};

export default function Alert({ tone = 'info', title, children, dismissible = false, onDismiss, className = '' }) {
  const t = tones[tone] || tones.info;
  const IconComp = t.Icon;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 ${t.bg} ${className}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <IconComp className={`h-5 w-5 shrink-0 mt-0.5 ${t.icon}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`text-sm font-semibold ${t.text}`}>{title}</p>
        )}
        {children && (
          <div className={`text-sm leading-relaxed ${t.text} ${title ? 'mt-1 opacity-90' : ''}`}>
            {children}
          </div>
        )}
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className={`p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer ${t.icon}`}
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
