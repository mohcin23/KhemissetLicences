import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export default function Breadcrumb({ items = [], isRtl = false, className = '' }) {
  const Separator = isRtl ? ChevronLeft : ChevronRight;

  return (
    <nav aria-label="Fil d'Ariane" className={`flex items-center gap-1.5 text-sm ${className}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <Separator className="h-3.5 w-3.5 text-neutral-300 shrink-0" aria-hidden="true" />
            )}
            {isLast ? (
              <span className="font-semibold text-neutral-900 truncate max-w-[200px]" aria-current="page">
                {item.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={item.onClick}
                className="text-neutral-500 hover:text-neutral-700 transition-colors cursor-pointer font-medium truncate max-w-[200px]"
              >
                {item.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
