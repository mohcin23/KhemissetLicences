import React from 'react';
import PageHeader from './PageHeader';

export default function PageShell({
  kicker,
  title,
  description,
  icon,
  actions,
  headerClassName = '',
  maxWidth = '7xl',
  children,
  className = '',
}) {
  return (
    <div className={`w-full max-w-${maxWidth} mx-auto ${className}`}>
      <PageHeader
        kicker={kicker}
        title={title}
        description={description}
        icon={icon}
        actions={actions}
        className={headerClassName}
      />
      {children}
    </div>
  );
}
