import React from 'react';

export function GovernmentBuilding() {
  return (
    <svg className="w-full max-w-[280px] h-auto" viewBox="0 0 280 220" fill="none" role="img" aria-label="Bâtiment gouvernemental">
      <rect x="60" y="80" width="160" height="120" rx="4" fill="#f0f4f8" stroke="#cbd5e1" strokeWidth="2" />
      <polygon points="40,85 140,25 240,85" fill="#102a43" stroke="#334e68" strokeWidth="2" />
      <rect x="128" y="15" width="24" height="15" rx="2" fill="#16a34a" />
      {[80, 120, 160, 200].map((x) => (
        <rect key={x} x={x} y="100" width="20" height="28" rx="2" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
      ))}
      <rect x="125" y="155" width="30" height="45" rx="3" fill="#16a34a" stroke="#15803d" strokeWidth="1.5" />
      <circle cx="150" cy="178" r="3" fill="#dcfce7" />
      <rect x="50" y="200" width="180" height="8" rx="2" fill="#e2e8f0" />
    </svg>
  );
}

export function EmptyDocuments() {
  return (
    <svg className="w-[min(200px,60vw)] h-auto" viewBox="0 0 200 160" fill="none" role="img" aria-hidden="true">
      <rect x="40" y="30" width="80" height="105" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
      <line x1="56" y1="55" x2="104" y2="55" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
      <line x1="56" y1="70" x2="96" y2="70" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
      <line x1="56" y1="85" x2="88" y2="85" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
      <rect x="80" y="50" width="80" height="105" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
      <line x1="96" y1="75" x2="144" y2="75" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
      <line x1="96" y1="90" x2="136" y2="90" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
      <line x1="96" y1="105" x2="128" y2="105" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
      <circle cx="150" cy="45" r="18" fill="#f0f4f8" stroke="#e2e8f0" strokeWidth="2" />
      <path d="M145 45l3 3 7-7" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SuccessCheck() {
  return (
    <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none" role="img" aria-hidden="true">
      <circle cx="32" cy="32" r="28" fill="#dcfce7" stroke="#16a34a" strokeWidth="3" />
      <path d="M20 32l8 8 16-16" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CitizenSearchIllustration() {
  return (
    <svg className="w-[min(220px,74vw)] h-auto" viewBox="0 0 220 150" role="img" aria-hidden="true">
      <circle cx="74" cy="50" r="24" fill="#f0fdf4" stroke="#16a34a" strokeWidth="3" />
      <circle cx="126" cy="48" r="20" fill="#eff6ff" stroke="#3b82f6" strokeWidth="3" />
      <path d="M35 124c6-30 27-45 55-45s48 15 55 45" fill="#f0fdf4" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" />
      <path d="M98 120c6-24 23-36 45-36 18 0 33 8 42 24" fill="#eff6ff" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
      <circle cx="162" cy="88" r="21" fill="#fff" stroke="#16a34a" strokeWidth="4" />
      <path d="M177 103l19 19" stroke="#16a34a" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function NoCitizenResultIllustration() {
  return (
    <svg className="w-[min(220px,74vw)] h-auto" viewBox="0 0 220 150" role="img" aria-hidden="true">
      <circle cx="98" cy="70" r="42" fill="#fef2f2" stroke="#dc2626" strokeWidth="4" />
      <path d="M129 101l34 34" stroke="#dc2626" strokeWidth="7" strokeLinecap="round" />
      <path d="M91 59c1-12 20-14 23-2 2 9-7 13-12 18" fill="none" stroke="#dc2626" strokeWidth="6" strokeLinecap="round" />
      <circle cx="101" cy="92" r="4" fill="#dc2626" />
      <path d="M52 126h76" stroke="#fecaca" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function TeamApprovedIllustration() {
  return (
    <svg className="w-[min(220px,74vw)] h-auto" viewBox="0 0 220 150" role="img" aria-hidden="true">
      <circle cx="76" cy="52" r="22" fill="#f0fdf4" stroke="#16a34a" strokeWidth="3" />
      <circle cx="128" cy="52" r="22" fill="#eff6ff" stroke="#3b82f6" strokeWidth="3" />
      <path d="M38 123c7-28 25-42 52-42s44 14 52 42" fill="#f0fdf4" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" />
      <path d="M100 123c6-27 23-41 48-41 17 0 31 7 41 22" fill="#eff6ff" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
      <circle cx="170" cy="44" r="22" fill="#f0fdf4" stroke="#16a34a" strokeWidth="4" />
      <path d="M160 44l7 7 14-16" fill="none" stroke="#16a34a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SearchNotFound() {
  return (
    <svg className="w-[min(200px,60vw)] h-auto" viewBox="0 0 200 160" fill="none" role="img" aria-hidden="true">
      <circle cx="85" cy="75" r="40" fill="#fef2f2" stroke="#fecaca" strokeWidth="3" />
      <circle cx="85" cy="75" r="25" fill="none" stroke="#fca5a5" strokeWidth="2" />
      <line x1="103" y1="93" x2="130" y2="120" stroke="#fca5a5" strokeWidth="5" strokeLinecap="round" />
      <circle cx="85" cy="68" r="3" fill="#dc2626" />
      <path d="M74 84c2 3 5 5 11 5s9-2 11-5" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
      <line x1="55" y1="140" x2="145" y2="140" stroke="#fecaca" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
