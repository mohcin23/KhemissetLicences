import React from 'react';
import {
  Activity, BarChart3, FolderKanban, KeyRound, Languages, LayoutDashboard,
  ScrollText, Shield, Volume2
} from 'lucide-react';
import { Card, CardHeader, Button } from '../../components/ui';
import { t } from '../../i18n/translations';

export default function SettingsPage({
  lang, setLang, isRtl, authUser, userRole, roleBadges, soundNotifications, setSoundNotifications,
  realtimeStats, setRealtimeStats, isAdminRole,
  onNavigateToAudit, showToast
}) {
  return (
    <div className="max-w-[700px]">
      {/* Page Header */}
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-wider text-[#3ebd93] mb-1">
          {isRtl ? 'النظام' : 'SYSTÈME'}
        </p>
        <h1 className="text-2xl font-bold text-slate-900">{t(lang, 'settingsTitle')}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{t(lang, 'settingsDesc')}</p>
      </div>

      {/* Interface Card */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden card-hover">
        <div className="p-6 pb-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">{t(lang, 'settingsInterfaceTitle')}</h3>
          <p className="text-sm text-slate-500 mt-1">{t(lang, 'settingsInterfaceDesc')}</p>
        </div>

        {/* Language Row */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Languages className="w-5 h-5 text-slate-600" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-slate-900">{t(lang, 'settingsDefaultLanguage')}</div>
              <div className="text-xs text-slate-500 mt-0.5">{t(lang, 'settingsDefaultLanguageDesc')}</div>
            </div>
          </div>
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 flex-shrink-0 ml-4">
            <button
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all border-0 cursor-pointer ${lang === 'ar' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
              onClick={() => setLang('ar')}
            >AR</button>
            <button
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all border-0 cursor-pointer ${lang === 'fr' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
              onClick={() => setLang('fr')}
            >FR</button>
          </div>
        </div>

        {/* Notifications sonores Row */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Volume2 className="w-5 h-5 text-slate-600" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-slate-900">{t(lang, 'settingsSoundNotifications')}</div>
              <div className="text-xs text-slate-500 mt-0.5">{t(lang, 'settingsSoundNotificationsDesc')}</div>
            </div>
          </div>
          <div
            onClick={() => setSoundNotifications(v => !v)}
            className={`toggle flex-shrink-0 ml-4 ${soundNotifications ? 'active' : ''}`}
          >
            <div className="toggle-dot"></div>
          </div>
        </div>

        {/* Stats temps réel Row */}
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Activity className="w-5 h-5 text-slate-600" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-slate-900">{t(lang, 'settingsRealtimeStats')}</div>
              <div className="text-xs text-slate-500 mt-0.5">{t(lang, 'settingsRealtimeStatsDesc')}</div>
            </div>
          </div>
          <div
            onClick={() => setRealtimeStats(v => !v)}
            className={`toggle flex-shrink-0 ml-4 ${realtimeStats ? 'active' : ''}`}
          >
            <div className="toggle-dot"></div>
          </div>
        </div>
      </div>

      {/* Admin-only sections */}
      {isAdminRole && (
        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader title={t(lang, 'settingsAccountTitle')} />
            <div className="flex items-center justify-between gap-4 border border-slate-100 rounded-xl bg-slate-50 p-4">
              <div className="min-w-0">
                <span className="text-xs text-slate-500">{t(lang, 'settingsCurrentUser')}</span>
                <strong className="block font-bold text-slate-900 mt-0.5">{authUser?.full_name || authUser?.username || '-'}</strong>
              </div>
              <span className={`role-badge ${roleBadges[userRole]?.className || `role-${userRole}`}`}>
                {roleBadges[userRole]?.label || userRole}
              </span>
            </div>
            <div className="flex flex-wrap gap-2.5 mt-4">
              <Button type="button" variant="outline" onClick={() => showToast(t(lang, 'settingsPasswordSoon'), 'info')}>
                <KeyRound size={16} />
                {t(lang, 'settingsChangePassword')}
              </Button>
              <Button type="button" variant="outline" onClick={() => onNavigateToAudit(String(authUser?.id || ''))}>
                <ScrollText size={16} />
                {t(lang, 'settingsViewMyActivity')}
              </Button>
            </div>
          </Card>
          <Card>
            <CardHeader title={t(lang, 'settingsShortcutsTitle')} />
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
              {[
                { label: t(lang, 'dashboard'), icon: LayoutDashboard, target: 'dashboard' },
                { label: t(lang, 'searchTitle'), icon: FolderKanban, target: 'search' },
                { label: t(lang, 'rapports'), icon: BarChart3, target: 'reports' },
                { label: t(lang, 'auditLog'), icon: ScrollText, target: 'audit' },
                { label: t(lang, 'equipe'), icon: Shield, target: 'adminUsers' }
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.target} type="button" className="shortcut-card" onClick={() => {
                    if (item.target === 'audit') onNavigateToAudit('');
                  }}>
                    <div className="w-10 h-10 rounded-lg bg-[#27ab83]/10 flex items-center justify-center group-hover:bg-[#27ab83]/20 transition">
                      <Icon size={18} className="text-[#27ab83]" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
