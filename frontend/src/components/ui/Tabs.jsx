import React from 'react';

export default function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div
      className={`flex gap-1 p-1 bg-neutral-100 rounded-lg ${className}`}
      role="tablist"
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all duration-150 cursor-pointer ${
            active === tab.id
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700 hover:bg-white/50'
          }`}
        >
          {tab.icon && <tab.icon className="h-4 w-4" aria-hidden="true" />}
          {tab.label}
          {tab.count != null && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
              active === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-neutral-200 text-neutral-600'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
