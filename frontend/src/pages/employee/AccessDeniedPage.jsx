import React from 'react';
import { ShieldX } from 'lucide-react';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { t } from '../../i18n/translations';

export default function AccessDeniedPage({ lang, isRtl, canViewDashboard, onGoHome }) {
  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <EmptyState
        icon={ShieldX}
        title={t(lang, 'accessDeniedTitle')}
        description={t(lang, 'accessDeniedDesc')}
        action={
          <Button variant="primary" onClick={onGoHome}>
            {t(lang, 'accessDeniedBtn')}
          </Button>
        }
      />
    </div>
  );
}
