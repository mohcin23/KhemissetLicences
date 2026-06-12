import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, BellOff, CheckCheck, ChevronDown } from 'lucide-react';
import { notificationsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatRelativeTime } from '../../utils/formatters';

export default function NotificationBell({ lang, isRtl, onNavigateToDemande }) {
  const { showToast } = useToast();
  const { authUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifPage, setNotifPage] = useState(1);
  const [notifHasMore, setNotifHasMore] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const fetchNotifications = useCallback(async (pageNumber = 1) => {
    if (!authUser) return;
    setNotifLoading(true);
    try {
      const res = await notificationsAPI.getAll({ page: pageNumber, limit: 10 });
      const data = res.data.data || [];
      setNotifications(prev => pageNumber > 1 ? [...prev, ...data] : data);
      setNotifPage(pageNumber);
      setNotifHasMore(Boolean(res.data.has_more));
    } catch {
      showToast(isRtl ? 'خطأ في تحميل الإشعارات' : 'Erreur de chargement des notifications', 'error');
    } finally {
      setNotifLoading(false);
    }
  }, [authUser, isRtl, showToast]);

  const fetchCount = useCallback(async () => {
    if (!authUser) return;
    try {
      const res = await notificationsAPI.getCount();
      setUnreadCount(res.data.unread || 0);
    } catch {}
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    fetchCount();
    const poll = setInterval(fetchCount, 30000);
    return () => clearInterval(poll);
  }, [authUser, fetchCount]);

  const handleToggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) await fetchNotifications(1);
  };

  const handleClick = async (notif) => {
    try {
      if (!notif.is_read) {
        await notificationsAPI.markRead(notif.id);
        setUnreadCount(c => Math.max(0, c - 1));
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n));
      }
    } catch {}
    setOpen(false);
    if (notif.demande_id && onNavigateToDemande) onNavigateToDemande(notif.demande_id);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch {
      showToast(
        isRtl ? 'خطأ أثناء تحديث الإشعارات' : 'Erreur lors de la mise à jour des notifications',
        'error'
      );
    }
  };

  const loadMore = async () => {
    await fetchNotifications(notifPage + 1);
  };

  return (
    <div className="relative" ref={ref}>
      {/* ── Bell trigger button ── */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`${isRtl ? 'الإشعارات' : 'Notifications'}${unreadCount > 0 ? ` (${unreadCount} ${isRtl ? 'غير مقروءة' : 'non lues'})` : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative grid place-items-center w-9 h-9 border-0 rounded-full bg-slate-100 text-slate-600 cursor-pointer transition-all hover:bg-slate-200"
      >
        <Bell className="h-[17px] w-[17px]" aria-hidden />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-[5px] -end-[5px] min-w-[18px] h-[18px] px-[4px] rounded-full bg-error-500 text-white text-[10px] font-bold leading-none inline-flex items-center justify-center"
            style={{ border: '2px solid #ffffff' }}
            aria-hidden
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Notification panel ── */}
      {open && (
        <div
          className="absolute top-[calc(100%+10px)] end-0 rounded-xl shadow-dropdown overflow-hidden z-[100] animate-fade-in-down"
          style={{
            width: 'min(380px, 90vw)',
            background: 'var(--adm-card-bg)',
            border: '1px solid var(--adm-card-border)',
          }}
          role="dialog"
          aria-label={isRtl ? 'لوحة الإشعارات' : 'Panneau de notifications'}
        >
          {/* Panel header */}
          <div
            className="flex items-center justify-between gap-3 px-4 py-3"
            style={{
              background: 'var(--adm-content-bg)',
              borderBottom: '1px solid var(--adm-card-border)',
            }}
          >
            {/* Title + count */}
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--adm-text-primary)' }}
              >
                {isRtl ? 'الإشعارات' : 'Notifications'}
              </span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-error-100 text-error-600 text-[10px] font-bold leading-none">
                  {unreadCount}
                </span>
              )}
            </div>

            {/* Mark all read */}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 border-none bg-transparent cursor-pointer transition-colors text-[11px] font-semibold text-info-600 hover:text-info-700"
              >
                <CheckCheck className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                <span>{isRtl ? 'قراءة الكل' : 'Tout lire'}</span>
              </button>
            )}
          </div>

          {/* Panel body */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {/* Loading skeleton */}
            {notifLoading && notifications.length === 0 ? (
              <div className="p-3 space-y-1">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-3 py-3.5 rounded-lg"
                  >
                    {/* Dot placeholder */}
                    <div
                      className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                      style={{ background: 'var(--adm-content-bg)', animation: 'shimmer 1.5s ease-in-out infinite' }}
                    />
                    <div className="flex-1 space-y-2">
                      <div
                        className="h-3 rounded"
                        style={{ width: '60%', background: 'var(--adm-content-bg)' }}
                      />
                      <div
                        className="h-2.5 rounded"
                        style={{ width: '90%', background: 'var(--adm-content-bg)' }}
                      />
                      <div
                        className="h-2 rounded"
                        style={{ width: '30%', background: 'var(--adm-content-bg)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                  style={{ background: 'var(--adm-content-bg)' }}
                >
                  <BellOff className="h-5 w-5" style={{ color: 'var(--adm-text-muted)' }} aria-hidden />
                </div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: 'var(--adm-text-secondary)' }}
                >
                  {isRtl ? 'لا توجد إشعارات' : 'Aucune notification'}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: 'var(--adm-text-muted)' }}
                >
                  {isRtl ? 'ستظهر إشعاراتك الجديدة هنا' : 'Vos nouvelles notifications apparaîtront ici'}
                </p>
              </div>
            ) : (
              /* Notification list */
              <div>
                {notifications.map((notif, idx) => {
                  const isUnread = !notif.is_read;
                  return (
                    <button
                      key={notif.id}
                      type="button"
                      onClick={() => handleClick(notif)}
                      className="flex items-start gap-3 w-full text-start px-4 py-3.5 cursor-pointer transition-colors hover:bg-[var(--adm-content-bg)]"
                      style={{
                        background: isUnread ? 'rgba(37,99,235,0.04)' : 'transparent',
                        borderBottom: idx < notifications.length - 1 ? '1px solid var(--adm-card-border)' : 'none',
                      }}
                    >
                      {/* Unread indicator dot */}
                      <span
                        className="flex-shrink-0 w-2 h-2 rounded-full mt-[7px]"
                        style={{
                          background: isUnread ? '#2563eb' : 'transparent',
                          flexShrink: 0,
                        }}
                        aria-hidden
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: isUnread ? 'var(--adm-text-primary)' : 'var(--adm-text-secondary)' }}
                        >
                          {notif.titre}
                        </p>
                        <p
                          className="text-xs mt-0.5 leading-relaxed"
                          style={{
                            color: 'var(--adm-text-muted)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {notif.message}
                        </p>
                        <p
                          className="text-[10px] mt-1.5 font-medium"
                          style={{ color: 'var(--adm-text-muted)' }}
                        >
                          {formatRelativeTime(notif.created_at)}
                        </p>
                      </div>
                    </button>
                  );
                })}

                {/* Load more */}
                {notifHasMore && (
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={notifLoading}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 border-none cursor-pointer transition-colors text-sm font-semibold disabled:opacity-60"
                    style={{
                      background: 'var(--adm-content-bg)',
                      color: 'var(--adm-text-secondary)',
                      borderTop: '1px solid var(--adm-card-border)',
                    }}
                  >
                    {notifLoading ? (
                      <span style={{ color: 'var(--adm-text-muted)' }}>
                        {isRtl ? 'جارٍ التحميل...' : 'Chargement...'}
                      </span>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 flex-shrink-0" aria-hidden />
                        <span>{isRtl ? 'عرض المزيد' : 'Voir plus'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
