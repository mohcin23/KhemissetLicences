import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import AgentDashboard from './AgentDashboard';

export default function DashboardPage() {
  const { authUser } = useAuth();
  const isAdminRole = authUser?.role === 'admin';

  if (isAdminRole) {
    return <AdminDashboard />;
  }

  return <AgentDashboard />;
}
