import React from 'react';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  illustration: Illustration,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 px-6 py-16 text-center ${className}`}>
      {Illustration ? (
        <div className="mb-5">
          <Illustration />
        </div>
      ) : Icon ? (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 ring-1 ring-neutral-200">
          <Icon className="h-8 w-8 text-neutral-400" aria-hidden="true" />
        </div>
      ) : null}
      {title && (
        <h3 className="text-base font-semibold text-neutral-800">{title}</h3>
      )}
      {description && (
        <p className="mt-2 max-w-sm text-sm text-neutral-500 leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
