import React from 'react';

export function RingLoader({ className = '', size = 'md' }) {
  const sizeMap = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };
  return (
    <div className={`${sizeMap[size] || sizeMap.md} ${className}`} role="status" aria-label="Chargement">
      <svg className="h-full w-full animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-80" stroke="currentColor" strokeWidth="3" strokeLinecap="round" d="M12 2a10 10 0 019.5 7" />
      </svg>
    </div>
  );
}

export function FullPageLoader({ text }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <RingLoader size="lg" className="text-primary-600" />
      {text && <p className="text-sm text-neutral-500 font-medium">{text}</p>}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((__, j) => (
            <div key={j} className="h-10 flex-1 rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className = '' }) {
  return (
    <div className={`bg-white border border-neutral-200 rounded-xl p-6 space-y-4 ${className}`} aria-hidden="true">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-neutral-100 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-neutral-100 animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-neutral-100 animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-neutral-100 animate-pulse" />
        <div className="h-3 w-4/5 rounded bg-neutral-100 animate-pulse" />
      </div>
    </div>
  );
}
