import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import AuthGateway from '../components/auth/AuthGateway';
import CitizenPortal from '../pages/citizen/CitizenPortal';
import AdminApp from './AdminApp';

function LoadingSpinner() {
  return (
    <div className="app ltr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="w-10 h-10 border-4 border-gray-200 border-t-[#0d1f3c] rounded-full animate-spin" />
    </div>
  );
}

export default function AppRouter() {
  const { authUser, authChecked, handleLogout, setAuthUser } = useAuth();
  const { toast, showToast } = useToast();
  const { lang, setLang } = useLanguage();

  if (!authChecked) return <LoadingSpinner />;
  if (!authUser) return <AuthGateway lang={lang} setLang={setLang} setAuthUser={setAuthUser} />;
  if (authUser.role === 'citizen') return (
    <CitizenPortal
      lang={lang}
      setLang={setLang}
      authUser={authUser}
      handleLogout={handleLogout}
      showToast={showToast}
      toast={toast}
    />
  );

  return (
    <Routes>
      <Route path="/app/*" element={<AdminApp />} />
      <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  );
}
