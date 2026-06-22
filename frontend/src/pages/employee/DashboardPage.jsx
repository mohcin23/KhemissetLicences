import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import AdminDashboard from './AdminDashboard';
import AgentDashboard from './AgentDashboard';

export default function DashboardPage() {
  const { authUser } = useAuth();
  const { lang, isRtl } = useLanguage();
  const isAdminRole = authUser?.role === 'admin';

  if (isAdminRole) {
    return <AdminDashboard lang={lang} isRtl={isRtl} />;
  }

  return <AgentDashboard lang={lang} isRtl={isRtl} />;
}
