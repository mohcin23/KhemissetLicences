import React from 'react';

const sizeMap = {
  xs: 'h-6 w-6 text-2xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const colorMap = {
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  error: 'bg-error-100 text-error-700',
  info: 'bg-info-100 text-info-700',
  neutral: 'bg-neutral-200 text-neutral-600',
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getColorFromName(name) {
  if (!name) return 'neutral';
  const colors = ['primary', 'success', 'warning', 'info', 'error'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({
  name,
  src,
  size = 'md',
  color,
  className = '',
}) {
  const sizeClass = sizeMap[size] || sizeMap.md;
  const autoColor = color || getColorFromName(name);
  const colorClass = colorMap[autoColor] || colorMap.neutral;

  if (src) {
    return (
      <img
        src={src}
        alt={name || ''}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-white shadow-xs ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold ring-2 ring-white shadow-xs ${colorClass} ${className}`}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}

export function AvatarGroup({ users = [], max = 3, size = 'sm' }) {
  const visible = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((user, i) => (
        <Avatar
          key={user.id || i}
          name={user.full_name || user.username}
          size={size}
          className="ring-2 ring-white"
        />
      ))}
      {remaining > 0 && (
        <div className={`flex items-center justify-center rounded-full bg-neutral-200 text-neutral-600 font-bold ring-2 ring-white ${sizeMap[size]}`}>
          +{remaining}
        </div>
      )}
    </div>
  );
}
