import React from 'react';

export default function Progress({ value = 0, max = 100, tone = 'primary', size = 'md', label, showValue = false, className = '' }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  const tones = {
    primary: 'bg-primary-600',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    info: 'bg-info-500',
  };

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-sm font-medium text-neutral-700">{label}</span>}
          {showValue && <span className="text-sm font-semibold text-neutral-600">{Math.round(percent)}%</span>}
        </div>
      )}
      <div
        className={`w-full rounded-full bg-neutral-100 overflow-hidden ${sizes[size] || sizes.md}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${tones[tone] || tones.primary}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
