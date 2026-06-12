import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { demandesAPI, adminAPI, citizenAPI, notificationsAPI } from '../services/api';
import { t } from '../i18n/translations';
import { formatRelativeTime } from '../utils/formatters';

import AdminLayout from '../layouts/AdminLayout';
import AgentNewRequest from '../pages/employee/AgentNewRequest';
import SearchPage from '../pages/employee/SearchPage';
import TrackPage from '../pages/employee/TrackPage';
import AdvancedSearchPage from '../pages/employee/AdvancedSearchPage';
import AdminUsersPage from '../pages/employee/AdminUsersPage';
import ReportsPage from '../pages/employee/ReportsPage';
import AuditPage from '../pages/employee/AuditPage';
import AccessDeniedPage from '../pages/employee/AccessDeniedPage';
import DashboardPage from '../pages/employee/DashboardPage';
import NotificationsPage from '../pages/employee/NotificationsPage';
import SettingsPage from '../pages/employee/SettingsPage';
import NotificationBell from '../components/employee/NotificationBell';
import { Button, EmptyState, ConfirmDialog, LanguagePickerModal } from '../components/ui';

export default function AdminApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, isRtl, setLang } = useLanguage();
  const { authUser, handleLogout } = useAuth();
  const { showToast } = useToast();

  const userRole = authUser?.role || '';
  const isAdminRole = userRole === 'admin';
  const isAgentRole = userRole === 'agent';
  const canCreateDemandes = isAgentRole;
  const canViewDashboard = userRole !== 'citizen';
  const forbiddenMessage = t(lang, 'forbiddenMessage');

  const page = location.pathname.replace('/app/', '') || 'dashboard';

  const [langPickerModal, setLangPickerModal] = useState({ open: false, resolve: null });
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [apiPending, setApiPending] = useState(false);
  const [soundNotifications, setSoundNotifications] = useState(() => {
    try { return localStorage.getItem('admin_sound_notifications') !== 'false'; } catch { return true; }
  });
  const [realtimeStats, setRealtimeStats] = useState(() => {
    try { return localStorage.getItem('admin_realtime_stats') !== 'false'; } catch { return true; }
  });

  const [selectedDemande, setSelectedDemande] = useState(null);
  const [piecesJointes, setPiecesJointes] = useState([]);
  const [pjLoading, setPjLoading] = useState(false);
  const [pjUploading, setPjUploading] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifPage, setNotifPage] = useState(1);
  const [notifHasMore, setNotifHasMore] = useState(false);

  const [pendingAgentsCount, setPendingAgentsCount] = useState(0);
  const notifRef = useRef(null);
  const roleHomeInitializedRef = useRef(false);

  const fetchPendingCount = useCallback(async () => {
    if (!isAdminRole) return;
    try {
      const res = await adminAPI.getUsers({ role: 'agent', is_active: 0, limit: 100 });
      setPendingAgentsCount((res.data.data || []).filter(user => !user.approved_at).length);
    } catch {}
  }, [isAdminRole]);

  useEffect(() => { fetchPendingCount(); }, [fetchPendingCount]);

  const fetchNotificationCount = useCallback(async () => {
    if (!authUser) return;
    try { const res = await notificationsAPI.getCount(); setUnreadNotifications(res.data.unread || 0); } catch {}
  }, [authUser]);

  const fetchNotifications = useCallback(async (pageNumber = 1) => {
    if (!authUser) return;
    setNotifLoading(true);
    try {
      const res = await notificationsAPI.getAll({ page: pageNumber, limit: 10 });
      const data = res.data.data || [];
      setNotifications(prev => pageNumber > 1 ? [...prev, ...data] : data);
      setNotifPage(pageNumber);
      setNotifHasMore(Boolean(res.data.has_more));
    } catch { showToast(isRtl ? 'خطأ في تحميل الإشعارات' : 'Erreur de chargement des notifications', 'error'); }
    finally { setNotifLoading(false); }
  }, [authUser, isRtl, showToast]);

  const loadMoreNotifications = useCallback(async () => { await fetchNotifications(notifPage + 1); }, [fetchNotifications, notifPage]);

  useEffect(() => {
    if (!authUser) return;
    fetchNotificationCount();
    const poll = setInterval(fetchNotificationCount, 30000);
    return () => clearInterval(poll);
  }, [authUser, fetchNotificationCount]);

  useEffect(() => {
    if (page === 'notifications') fetchNotifications(1);
  }, [page, fetchNotifications]);

  useEffect(() => {
    try { localStorage.setItem('admin_sound_notifications', String(soundNotifications)); } catch {}
  }, [soundNotifications]);
  useEffect(() => {
    try { localStorage.setItem('admin_realtime_stats', String(realtimeStats)); } catch {}
  }, [realtimeStats]);

  useEffect(() => {
    const handlePending = (event) => setApiPending(Boolean(event.detail?.pending));
    window.addEventListener('api-pending-changed', handlePending);
    return () => window.removeEventListener('api-pending-changed', handlePending);
  }, []);

  useEffect(() => {
    if (!authUser || !roleHomeInitializedRef.current) return;
    const forbidden = [];
    if (page === 'new' && !canCreateDemandes) forbidden.push('new');
    if (page === 'audit' && !isAdminRole) forbidden.push('audit');
    if (page === 'adminUsers' && !isAdminRole) forbidden.push('adminUsers');
    if (page === 'advancedSearch' && !isAdminRole) forbidden.push('advancedSearch');
    if (page === 'reports' && !isAdminRole) forbidden.push('reports');
    if (forbidden.includes(page)) navigate('/app/access-denied', { replace: true });
  }, [authUser, page, canCreateDemandes, isAdminRole, navigate]);

  const chooseDecisionLanguage = () => new Promise((resolve) => setLangPickerModal({ open: true, resolve }));

  const handleLangPickerSelect = (selectedLang) => {
    setLangPickerModal(prev => { prev.resolve?.(selectedLang); return { open: false, resolve: null }; });
  };

  const handleLangPickerClose = () => {
    setLangPickerModal(prev => { prev.resolve?.(null); return { open: false, resolve: null }; });
  };

  const handleNotificationBellClick = async (demandeId) => {
    try {
      const fetcher = authUser?.role === 'citizen' ? citizenAPI.getById : demandesAPI.getById;
      const response = await fetcher(demandeId);
      setSelectedDemande(response.data.data);
      navigate('/app/track');
      if (authUser?.role !== 'citizen') await loadAgentPiecesJointes(demandeId);
    } catch { showToast(isRtl ? 'تعذر تحميل الطلب' : 'Impossible de charger la demande', 'error'); }
  };

  const loadAgentPiecesJointes = async (demandeId) => {
    if (!demandeId) return;
    setPjLoading(true);
    try {
      const res = await demandesAPI.listPiecesJointes(demandeId);
      setPiecesJointes(res.data.data || []);
    } catch { setPiecesJointes([]); }
    finally { setPjLoading(false); }
  };

  const handleAgentUploadPj = async (files) => {
    if (!selectedDemande || !files || files.length === 0) return;
    setPjUploading(true);
    try {
      const toBase64 = (f) => new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      const fichiers = await Promise.all(files.map(async (f) => ({
        nom: f.name, type_mime: f.type, base64: await toBase64(f), type_piece: null
      })));
      await demandesAPI.uploadPiecesJointes(selectedDemande.id, fichiers);
      await loadAgentPiecesJointes(selectedDemande.id);
      showToast(isRtl ? 'تم رفع الوثيقة' : 'Fichier(s) joint(s) avec succès');
    } catch (err) { showToast(err.response?.data?.message || 'Erreur upload', 'error'); }
    finally { setPjUploading(false); }
  };

  const handleAgentDeletePj = async (pjId) => {
    if (!selectedDemande) return;
    try {
      await demandesAPI.deletePieceJointe(selectedDemande.id, pjId);
      await loadAgentPiecesJointes(selectedDemande.id);
      showToast(isRtl ? 'تم حذف الوثيقة' : 'Pièce jointe supprimée');
    } catch (err) { showToast(err.response?.data?.message || 'Erreur suppression', 'error'); }
  };

  const handleOpenDemandeNavigate = (demande) => {
    setSelectedDemande(demande);
    navigate('/app/track');
  };

  const handleAgentNavigate = (id) => {
    if (id === 'workflow') {
      if (selectedDemande) navigate('/app/track');
      else showToast(isRtl ? 'اختر طلباً من الجدول ثم اضغط على أيقونة العين للمتابعة.' : 'Sélectionnez un dossier dans le tableau (icône œil) pour ouvrir le suivi détaillé.', 'info');
      return;
    }
    navigate(`/app/${id}`);
  };

  const showConfirm = (config) => {
    setConfirmDialog({
      title: config.title,
      message: config.message,
      danger: config.danger,
      confirmLabel: config.confirmLabel,
      cancelLabel: config.cancelLabel,
      onConfirm: config.onConfirm,
    });
  };

  const runConfirm = async () => {
    if (!confirmDialog?.onConfirm) return;
    setConfirmLoading(true);
    try { await confirmDialog.onConfirm(); }
    catch (err) { showToast(err.response?.data?.message || (isRtl ? 'خطأ' : 'Erreur'), 'error'); }
    finally { setConfirmLoading(false); setConfirmDialog(null); }
  };

  const roleBadges = {
    admin: { label: t(lang, 'roleAdmin'), className: 'role-admin' },
    agent: { label: t(lang, 'roleAgent'), className: 'role-agent' },
    lecteur: { label: t(lang, 'roleLecteur'), className: 'role-lecteur' },
    citizen: { label: t(lang, 'citizen'), className: 'role-lecteur' }
  };

  const agentNavItems = [
    canViewDashboard && { id: 'dashboard', label: t(lang, 'dashboard'), icon: 'LayoutDashboard' },
    canCreateDemandes && { id: 'new', label: t(lang, 'newRequest'), icon: 'FilePlus2' },
    { id: 'search', label: isRtl ? t(lang, 'searchTitle') : 'Demandes', icon: 'FolderKanban' },
    isAdminRole && { id: 'advancedSearch', label: t(lang, 'rechercheAvancee'), icon: 'Users' },
    isAdminRole && { id: 'reports', label: t(lang, 'rapports'), icon: 'BarChart3' },
    { id: 'notifications', label: t(lang, 'notifications'), icon: 'Bell' },
    isAdminRole && { id: 'adminUsers', label: t(lang, 'equipe'), icon: 'Shield', badge: pendingAgentsCount },
    isAdminRole && { id: 'audit', label: t(lang, 'auditLog'), icon: 'ScrollText' },
    { id: 'settings', label: t(lang, 'parametres'), icon: 'Settings' }
  ].filter(Boolean);

  return (
    <div className={`${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="fixed top-0 left-0 right-0 h-[3px] z-[9999] pointer-events-none bg-transparent">
        <div className={`h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-200 ${apiPending ? 'w-[90%] animate-[progress-bar-grow_2.5s_ease_forwards]' : 'w-0'}`} />
      </div>

      <AdminLayout
        isRtl={isRtl} lang={lang} setLang={setLang}
        page={page} onNavigate={handleAgentNavigate} navItems={agentNavItems}
        authUser={authUser} onLogout={handleLogout}
        notifBell={<NotificationBell lang={lang} isRtl={isRtl} onNavigateToDemande={handleNotificationBellClick} />}
      >
        <div className="min-h-[calc(100vh-160px)] mx-auto w-full max-w-7xl">
          <Routes>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="search" element={
              <SearchPage
                onShowConfirm={showConfirm}
                onTrackNavigate={async (demande) => {
                  try {
                    const res = await demandesAPI.getById(demande.id);
                    setSelectedDemande(res.data.data);
                    navigate('/app/track');
                    if (authUser?.role !== 'citizen') await loadAgentPiecesJointes(demande.id);
                  } catch (err) { showToast(err.response?.data?.message || (isRtl ? 'تعذر تحميل الطلب' : 'Demande introuvable'), 'error'); }
                }}
                onChooseDecisionLanguage={chooseDecisionLanguage}
              />
            } />
            <Route path="new" element={canCreateDemandes ? <AgentNewRequest lang={lang} showToast={showToast} /> : <AccessDeniedPage lang={lang} isRtl={isRtl} canViewDashboard={canViewDashboard} onGoHome={() => navigate('/app/dashboard')} />} />
            <Route path="track" element={
              selectedDemande ? (
                <TrackPage lang={lang} isRtl={isRtl} selectedDemande={selectedDemande}
                  piecesJointes={piecesJointes} pjLoading={pjLoading} pjUploading={pjUploading}
                  isAgentRole={isAgentRole} onBack={() => navigate('/app/search')}
                  onUploadPj={handleAgentUploadPj} onDeletePj={handleAgentDeletePj}
                  showToast={showToast} />
              ) : <div className="min-h-[200px]"><EmptyState icon={() => <span>❓</span>} title={t(lang, 'page404Title')} description={t(lang, 'page404Desc')} action={<Button type="button" variant="primary" onClick={() => navigate('/app/search')}>{t(lang, 'page404Btn')}</Button>} /></div>
            } />
            <Route path="advancedSearch" element={isAdminRole ? (
              <AdvancedSearchPage onOpenDemandeNavigate={handleOpenDemandeNavigate} />
            ) : <AccessDeniedPage lang={lang} isRtl={isRtl} canViewDashboard={canViewDashboard} onGoHome={() => navigate('/app/dashboard')} />} />
            <Route path="adminUsers" element={isAdminRole ? (
              <AdminUsersPage onShowConfirm={showConfirm} />
            ) : <AccessDeniedPage lang={lang} isRtl={isRtl} canViewDashboard={canViewDashboard} onGoHome={() => navigate('/app/dashboard')} />} />
            <Route path="reports" element={isAdminRole ? <ReportsPage /> : <AccessDeniedPage lang={lang} isRtl={isRtl} canViewDashboard={canViewDashboard} onGoHome={() => navigate('/app/dashboard')} />} />
            <Route path="audit" element={isAdminRole ? <AuditPage /> : <AccessDeniedPage lang={lang} isRtl={isRtl} canViewDashboard={canViewDashboard} onGoHome={() => navigate('/app/dashboard')} />} />
            <Route path="notifications" element={
              <NotificationsPage lang={lang} isRtl={isRtl}
                notifications={notifications} notifLoading={notifLoading}
                notifHasMore={notifHasMore} formatRelativeTime={formatRelativeTime}
                onNotificationClick={handleNotificationBellClick} onLoadMore={loadMoreNotifications}
                onNavigateToSettings={() => navigate('/app/settings')}
                showToast={showToast} />
            } />
            <Route path="settings" element={
              <SettingsPage lang={lang} setLang={setLang} isRtl={isRtl}
                authUser={authUser} userRole={userRole} roleBadges={roleBadges}
                soundNotifications={soundNotifications} setSoundNotifications={setSoundNotifications}
                realtimeStats={realtimeStats} setRealtimeStats={setRealtimeStats}
                isAdminRole={isAdminRole}
                onNavigateToAudit={(userId) => navigate('/app/audit', { state: { filterUser: userId } })}
                showToast={showToast} />
            } />
            <Route path="access-denied" element={<AccessDeniedPage lang={lang} isRtl={isRtl} canViewDashboard={canViewDashboard} onGoHome={() => navigate('/app/dashboard')} />} />
            <Route path="*" element={<div className="min-h-[200px]"><EmptyState icon={() => <span>❓</span>} title={t(lang, 'page404Title')} description={t(lang, 'page404Desc')} action={<Button type="button" variant="primary" onClick={() => navigate(canViewDashboard ? '/app/dashboard' : '/app/search')}>{t(lang, 'page404Btn')}</Button>} /></div>} />
          </Routes>
        </div>
      </AdminLayout>

      <LanguagePickerModal open={langPickerModal.open} onClose={handleLangPickerClose} onSelect={handleLangPickerSelect} isRtl={isRtl} />
      <ConfirmDialog open={Boolean(confirmDialog)} onClose={() => { if (!confirmLoading) setConfirmDialog(null); }} onConfirm={runConfirm}
        title={confirmDialog?.title} message={confirmDialog?.message} confirmLabel={confirmDialog?.confirmLabel}
        cancelLabel={confirmDialog?.cancelLabel} loading={confirmLoading} danger={confirmDialog?.danger} />
    </div>
  );
}
