import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

const USER_SPECIFIC_KEYS = [
  'draft_demande_citizen',
  'agent_new_request_draft',
];

function clearUserConversations() {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('citizen_ai_conversations_')) {
      localStorage.removeItem(key);
    }
  });
}

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      authAPI.me()
        .then(res => setAuthUser(res.data.user))
        .catch(() => localStorage.removeItem('auth_token'))
        .finally(() => setAuthChecked(true));
    } else {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    const onAuthExpired = () => {
      localStorage.removeItem('auth_token');
      USER_SPECIFIC_KEYS.forEach(k => localStorage.removeItem(k));
      clearUserConversations();
      setAuthUser(null);
    };
    window.addEventListener('auth-expired', onAuthExpired);
    return () => window.removeEventListener('auth-expired', onAuthExpired);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('auth_token');
    USER_SPECIFIC_KEYS.forEach(k => localStorage.removeItem(k));
    clearUserConversations();
    setAuthUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ authUser, setAuthUser, authChecked, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
