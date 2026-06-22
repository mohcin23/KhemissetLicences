import React from 'react';
import { Bell, CheckCheck, FileText, CheckCircle2, XCircle, Edit3 } from 'lucide-react';
import { t } from '../../i18n/translations';
import { translateNotification } from '../../utils/notificationTranslator';

const NOTIF_ICONS = {
  nouveau_dossier: FileText,
  dossier_corrige: Edit3,
  accepte: CheckCircle2,
  rejete: XCircle,
  avis_favorable: CheckCircle2,
  default: Bell,
};

const NOTIF_COLORS = {
  nouveau_dossier: 'border-l-teal-500',
  dossier_corrige: 'border-l-amber-500',
  accepte: 'border-l-emerald-500',
  rejete: 'border-l-red-400',
  avis_favorable: 'border-l-teal-500',
  default: 'border-l-slate-200',
};

const NOTIF_ICON_BG = {
  nouveau_dossier: 'bg-teal-50 text-teal-600',
  dossier_corrige: 'bg-amber-50 text-amber-600',
  accepte: 'bg-emerald-50 text-emerald-600',
  rejete: 'bg-red-50 text-red-500',
  avis_favorable: 'bg-teal-50 text-teal-600',
  default: 'bg-slate-50 text-slate-400',
};

export default function NotificationsPage({
  lang, isRtl, notifications, notifLoading, notifHasMore, formatRelativeTime,
  onNotificationClick, onLoadMore, onNavigateToSettings, showToast
}) {
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div>
      {/* Standard page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#3ebd93] mb-1">
            {isRtl ? 'الإشعارات' : 'NOTIFICATIONS'}
          </p>
          <h1 className="text-2xl font-bold text-slate-900">{t(lang, 'notifTitle')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t(lang, 'notifDesc')}</p>
        </div>
        <button className="flex items-center gap-2 text-sm font-medium text-slate-600 border border-slate-200 bg-white px-3 py-2 rounded-lg hover:bg-slate-50 transition">
          <CheckCheck className="w-4 h-4" />
          {t(lang, 'notifMarkAllRead') || 'Tout marquer comme lu'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        <button className="px-4 py-2 text-sm font-semibold border-b-2 border-[#27ab83] text-[#27ab83]">
          {t(lang, 'notifTabUnread')}{unreadCount > 0 && <span className="ml-1 bg-[#27ab83] text-white text-xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
        </button>
        <button className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">
          {t(lang, 'notifTabAll')}
        </button>
      </div>

      {notifLoading && !notifications.length ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm max-w-3xl">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">{t(lang, 'notifEmpty')}</h3>
          <p className="mt-1 text-sm text-slate-500">{t(lang, 'notifEmptySubtitle')}</p>
          <div className="mt-6">
            <button
              onClick={onNavigateToSettings}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              {t(lang, 'notifConfigureAlerts')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {notifications.map((notif) => {
            const type = notif.type || 'default';
            const Icon = NOTIF_ICONS[type] || NOTIF_ICONS.default;
            const borderColor = NOTIF_COLORS[type] || NOTIF_COLORS.default;
            const iconBg = NOTIF_ICON_BG[type] || NOTIF_ICON_BG.default;
            const { titre, message } = translateNotification(notif, lang);
            return (
              <div
                key={notif.id}
                className={`notif-item bg-white rounded-xl p-5 border border-slate-100 flex items-start gap-4 card-hover cursor-pointer border-l-4 ${borderColor} ${notif.is_read ? 'opacity-70' : 'bg-[#27ab83]/5'}`}
                onClick={() => onNotificationClick(notif)}
              >
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{titre}</h3>
                    {!notif.is_read && <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0"></span>}
                  </div>
                  <p className="text-sm text-slate-500">{message}</p>
                  <div className="text-xs text-slate-400 mt-2">{formatRelativeTime(notif.created_at)}</div>
                </div>
              </div>
            );
          })}
          {notifHasMore && (
            <button
              type="button"
              onClick={onLoadMore}
              className="w-full py-3 text-sm font-semibold text-slate-600 hover:text-slate-800 transition"
            >
              {t(lang, 'notifLoadMore')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
