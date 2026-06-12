import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { t } from '../../i18n/translations';
import { useToast } from '../../contexts/ToastContext';

export default function ActivityHistoryModal({ user, onClose, lang }) {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    adminAPI.getUserActivity(user.id)
      .then(res => setLogs(res.data.data || []))
      .catch(() => showToast(t(lang, 'fetchError'), 'error'))
      .finally(() => setLoading(false));
  }, [user, lang, showToast]);

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(17,24,39,0.56)] flex items-start justify-center overflow-y-auto px-4 py-7" role="dialog" aria-modal="true">
      <div className="w-[min(560px,100%)] bg-white rounded-lg shadow-[0_10px_40px_rgba(13,31,60,0.13)] p-6">
        <div className="flex justify-between items-start gap-4 mb-[18px]">
          <div>
            <h2 className="text-[#172033] text-[1.72rem] font-extrabold dark:text-[#f8fafc]">{t(lang, 'adminUserActivityTitle')}</h2>
            <p className="text-[#667085] text-[0.94rem] dark:text-[#94a3b8]">{user.full_name || user.username}</p>
          </div>
          <button className="w-9 h-9 border border-[#d5d9e0] bg-[#f5f6f8] text-gray-700 rounded cursor-pointer text-[1.35rem] leading-none inline-flex items-center justify-center flex-shrink-0" type="button" onClick={onClose}>×</button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-10 h-10 border-4 border-gray-200 border-t-[#0d1f3c] rounded-full animate-spin" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-gray-500"><p>{t(lang, 'adminUserActivityEmpty')}</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr>
                  <th>{t(lang, 'adminUserActivityDate')}</th>
                  <th>{t(lang, 'adminUserActivityAction')}</th>
                  <th>{t(lang, 'adminUserActivityDetails')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString(lang === 'ar' ? 'ar-MA' : 'fr-FR')}</td>
                    <td><span className="inline-flex items-center min-h-[26px] bg-[#e8f4ef] text-[#0d604b] px-2.5 py-0.5 rounded-full font-sans font-extrabold text-xs">{t(lang, log.action)}</span></td>
                    <td style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                      {log.details ? (() => {
                        try {
                          const parsed = JSON.parse(log.details);
                          return Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(' | ');
                        } catch { return log.details; }
                      })() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
