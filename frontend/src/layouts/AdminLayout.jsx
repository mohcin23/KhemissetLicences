import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart3, Bell, Building2, ChevronDown, ChevronRight, FilePlus2,
  FileText, FolderKanban, LayoutDashboard, LogOut, Menu, Moon, ScrollText,
  Search, Settings, Shield, Sun, Users,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ICON_MAP = {
  LayoutDashboard,
  FilePlus2,
  FolderKanban,
  Users,
  BarChart3,
  Bell,
  Settings,
  ScrollText,
  Shield,
  Search,
  FileText,
};

const NAV_GROUP_DEFS = [
  { key: 'travail', fr: 'Espace de travail', ar: 'مساحة العمل', ids: ['dashboard', 'new', 'search'] },
  { key: 'pilotage', fr: 'Pilotage', ar: 'التحكم', ids: ['advancedSearch', 'reports', 'adminUsers', 'audit'] },
  { key: 'systeme', fr: 'Systeme', ar: 'النظام', ids: ['notifications', 'settings'] },
];

const ROLE_LABELS = {
  admin: { fr: 'Administrateur', ar: 'مدير' },
  agent: { fr: 'Agent', ar: 'عون' },
  lecteur: { fr: 'Lecteur', ar: 'قارئ' },
  citizen: { fr: 'Citoyen', ar: 'مواطن' },
};

export default function AdminLayout({
  isRtl, lang, setLang, page, onNavigate, navItems, children,
  authUser, onLogout, notifBell,
}) {
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (userRef.current && !userRef.current.contains(event.target)) setUserOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => { setSidebarOpen(false); }, [page]);

  const groups = NAV_GROUP_DEFS
    .map((group) => ({
      ...group,
      items: (navItems || []).filter((item) => item && !item.hidden && group.ids.includes(item.id)),
    }))
    .filter((group) => group.items.length > 0);

  const currentItem = (navItems || []).find((item) => item?.id === page);
  const currentPageLabel = currentItem?.label || (isRtl ? 'لوحة القيادة' : 'Tableau de Bord');
  const roleLabel = authUser
    ? (isRtl ? ROLE_LABELS[authUser.role]?.ar : ROLE_LABELS[authUser.role]?.fr) || authUser.role
    : '';
  const displayName = authUser?.full_name || authUser?.username || '';
  const initial = (displayName || roleLabel || 'A').trim().charAt(0).toUpperCase();

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] dark:bg-[#0f172a] text-slate-800 dark:text-slate-200"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[55] bg-slate-900/40 backdrop-blur-sm border-none cursor-pointer lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label={isRtl ? 'اغلاق القائمة' : 'Fermer le menu'}
        />
      )}

      <aside
        className={[
          'fixed top-0 h-full w-[260px] z-[60] flex flex-col transition-transform duration-300',
          'bg-[#1E293B]',
          isRtl ? 'right-0' : 'left-0',
          sidebarOpen ? 'translate-x-0' : (isRtl ? 'max-lg:translate-x-full' : 'max-lg:-translate-x-full'),
        ].join(' ')}
        aria-label={isRtl ? 'القائمة الجانبية' : 'Menu lateral'}
      >
        <div className="p-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center overflow-hidden ring-1 ring-white/[0.06]">
              <img src="/logo.jpg" alt="" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <div className="min-w-0">
              <div className="text-white font-bold text-sm leading-tight truncate">
                {isRtl ? 'اقليم الخميسات' : 'Province de Khemisset'}
              </div>
              <div className="text-emerald-400 text-xs font-semibold truncate">
                {isRtl ? 'ادارة الرخص' : 'Gestion des licences'}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto adm-design-scroll">
          {groups.map((group, groupIndex) => (
            <div key={group.key}>
              <div className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 ${groupIndex === 0 ? 'pt-3' : 'pt-5'}`}>
                {isRtl ? group.ar : group.fr}
              </div>
              {group.items.map((item) => {
                const Icon = typeof item.icon === 'string' ? (ICON_MAP[item.icon] || FolderKanban) : (item.icon || FolderKanban);
                const active = page === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={[
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium border-0 cursor-pointer transition-all duration-200 text-start relative',
                      active
                        ? 'bg-emerald-500/[0.12] text-emerald-400'
                        : 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]',
                    ].join(' ')}
                    onClick={() => onNavigate(item.id)}
                    aria-current={active ? 'page' : undefined}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-emerald-400 rounded-r-full" />
                    )}
                    <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {authUser && (
          <div className="relative p-4 border-t border-white/[0.08]" ref={userRef}>
            <button
              type="button"
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.06] transition cursor-pointer border-0 bg-transparent text-start"
              onClick={() => setUserOpen((value) => !value)}
              aria-haspopup="true"
              aria-expanded={userOpen}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-emerald-400/30 shadow-lg shadow-emerald-500/20">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold truncate">{displayName}</div>
                <div className="text-slate-400 text-xs">{roleLabel}</div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${userOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>

            {userOpen && (
              <div className="absolute bottom-[72px] start-4 end-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-2xl overflow-hidden z-[80]">
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-0 cursor-pointer text-start"
                  onClick={() => { onNavigate('settings'); setUserOpen(false); }}
                >
                  <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                  {isRtl ? 'الاعدادات' : 'Parametres'}
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 border-0 cursor-pointer text-start"
                  onClick={() => { setUserOpen(false); onLogout?.(); }}
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  {isRtl ? 'تسجيل الخروج' : 'Deconnexion'}
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      <div className={`${isRtl ? 'lg:mr-[260px]' : 'lg:ml-[260px]'} min-h-screen flex flex-col`}>
        <header className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700">
          <div className="flex items-center justify-between px-6 max-sm:px-4 h-16">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 min-w-0">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden mr-2 w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition flex border-0 cursor-pointer"
                aria-label={isRtl ? 'فتح القائمة' : 'Ouvrir le menu'}
              >
                <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" aria-hidden="true" />
              </button>
              <Building2 className="w-4 h-4 hidden sm:block shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
              <span className="hidden sm:inline whitespace-nowrap text-slate-500 dark:text-slate-400">{isRtl ? 'الادارة' : 'Administration'}</span>
              <ChevronRight className="w-4 h-4 hidden sm:block shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" style={isRtl ? { transform: 'scaleX(-1)' } : undefined} />
              <span className="text-slate-900 dark:text-slate-100 font-semibold truncate">{currentPageLabel}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-full p-0.5">
                {['ar', 'fr'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLang(value)}
                    className={[
                      'px-3 py-1.5 text-xs font-semibold rounded-full border-0 cursor-pointer transition-all duration-200',
                      lang === value
                        ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-slate-100'
                        : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                    ].join(' ')}
                    aria-pressed={lang === value}
                  >
                    {value.toUpperCase()}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition border-0 cursor-pointer"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
              >
                {theme === 'dark'
                  ? <Sun className="w-[18px] h-[18px] text-slate-300" aria-hidden="true" />
                  : <Moon className="w-[18px] h-[18px] text-slate-500" aria-hidden="true" />}
              </button>
              {notifBell}
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 max-sm:p-4" id="main-content" tabIndex={-1}>
          {children}
        </main>

        <footer className="px-6 py-4 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800">
          <span>&copy; 2026 Province de Khemisset</span>
          <span className="mx-2">&middot;</span>
          <span>Gestion des licences d&apos;etablissement</span>
          <span className="mx-2">&middot;</span>
          <span>v2.0</span>
        </footer>
      </div>
    </div>
  );
}
