import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { t } from '../../i18n/translations';
import { auditAPI } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { AUDIT_PAGE_SIZE } from '../../utils/appConstants';
import { Download, FileSpreadsheet, Filter } from 'lucide-react';

const ACTION_BADGE_CONFIG = {
  'Changement de statut':        { color: '#2563eb', bg: '#eff6ff', label: 'Changement statut' },
  'Décision officielle imprimée': { color: '#d97706', bg: '#fffbeb', label: 'Impression' },
  'Création dossier':            { color: '#16a34a', bg: '#f0fdf4', label: 'Création' },
  'Refus dossier':               { color: '#dc2626', bg: '#fef2f2', label: 'Refus' },
  'Connexion':                   { color: '#7c3aed', bg: '#f5f3ff', label: 'Connexion' },
};

const formatAuditDetails = (details) => {
  if (!details) return '';
  try {
    const p = typeof details === 'string' ? JSON.parse(details) : details;
    const parts = [];
    if (p.numero_dossier) parts.push(`N° ${p.numero_dossier}`);
    if (p.nom_complet) parts.push(p.nom_complet);
    if (p.cin) parts.push(`CIN: ${p.cin}`);
    if (p.ancien_statut && p.nouveau_statut) {
      const statusLabels = { en_cours_analyse: 'En cours', documents_rejetes: 'Docs rejetés', documents_corriges: 'Docs corrigés', avis_favorable: 'Docs validés', decision_imprimee: 'Décision imprimée', accepte: 'Accepté', refuse: 'Refusé', archive: 'Archivé', brouillon: 'Brouillon' };
      parts.push(`${statusLabels[p.ancien_statut] || p.ancien_statut} → ${statusLabels[p.nouveau_statut] || p.nouveau_statut}`);
    }
    if (p.motif_rejet_fichier) parts.push(`Motif: ${p.motif_rejet_fichier}`);
    if (p.commentaire) parts.push(`Motif: ${p.commentaire}`);
    if (p.username && !p.nom_complet) parts.push(p.username);
    if (p.full_name && !p.nom_complet) parts.push(p.full_name);
    if (p.role) parts.push(`Rôle: ${p.role}`);
    if (p.lang) parts.push(`Langue: ${p.lang}`);
    if (p.commune) parts.push(p.commune);
    if (parts.length > 0) return parts.join('  •  ');
    return Object.entries(p).filter(([, v]) => v !== null && v !== undefined && v !== '').map(([, v]) => String(v)).slice(0, 4).join('  •  ');
  } catch { return details; }
};

export default function AuditPage() {
  const { lang, isRtl } = useLanguage();
  const { showToast } = useToast();
  const location = useLocation();

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditUserFilter, setAuditUserFilter] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditFilters, setAuditFilters] = useState({ users: [], actions: [] });
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await auditAPI.getLogs({
        user_id: auditUserFilter || undefined, action: auditActionFilter || undefined,
        page: auditPage, limit: AUDIT_PAGE_SIZE
      });
      setAuditLogs(res.data.data || []);
      setAuditTotal(res.data.total || 0);
    } catch { showToast(t(lang, 'fetchError'), 'error'); } finally { setAuditLoading(false); }
  }, [auditActionFilter, auditPage, auditUserFilter, lang, showToast]);

  const fetchAuditFilters = useCallback(async () => {
    try {
      const res = await auditAPI.getFilters();
      setAuditFilters({ users: res.data.users || [], actions: res.data.actions || [] });
    } catch {}
  }, []);

  useEffect(() => { fetchAuditLogs(); fetchAuditFilters(); }, [fetchAuditLogs, fetchAuditFilters]);

  useEffect(() => { setAuditPage(1); }, [auditUserFilter, auditActionFilter]);

  useEffect(() => {
    if (location.state?.filterUser) {
      setAuditUserFilter(location.state.filterUser);
    }
  }, [location.state]);

  const auditTotalPages = Math.max(1, Math.ceil(auditTotal / AUDIT_PAGE_SIZE));
  const auditPageNumbers = Array.from({ length: auditTotalPages }, (_, i) => i + 1).filter(n => n === 1 || n === auditTotalPages || Math.abs(n - auditPage) <= 2);

  const handleAuditExportCSV = async () => {
    try {
      const res = await auditAPI.exportCSV({ user_id: auditUserFilter || undefined, action: auditActionFilter || undefined });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
      showToast(t(lang, 'auditExportCSVSuccess'));
    } catch { showToast(t(lang, 'toastExportError'), 'error'); }
  };

  const handleAuditExportExcel = async () => {
    try {
      const res = await auditAPI.getLogs({ user_id: auditUserFilter || undefined, action: auditActionFilter || undefined, page: 1, limit: auditTotal || 10000 });
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Journal');
      worksheet.columns = [
        { header: 'Date/Heure', key: 'date_heure' }, { header: 'Utilisateur', key: 'utilisateur' },
        { header: 'Action', key: 'action' }, { header: 'Détails', key: 'details' }, { header: 'Adresse IP', key: 'ip' }
      ];
      const rows = (res.data.data || []).map(log => ({ 'Date/Heure': new Date(log.created_at).toLocaleString('fr-FR'), 'Utilisateur': log.user_name || '', 'Action': log.action, 'Détails': formatAuditDetails(log.details), 'Adresse IP': log.ip_address || '' }));
      if (!rows.length) { showToast(isRtl ? 'لا توجد بيانات للتصدير' : 'Aucune donnee a exporter', 'error'); return; }
      worksheet.addRows(rows);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `journal_operations_${new Date().toISOString().slice(0, 10)}.xlsx`; a.click();
      window.URL.revokeObjectURL(url);
      try { await auditAPI.logExcelExport({ action: 'EXPORT_EXCEL_JOURNAL', entity_type: 'audit_logs', details: { total: rows.length, user_id: auditUserFilter || null, action: auditActionFilter || null } }); } catch {}
    } catch { showToast(isRtl ? 'خطأ في تصدير السجل' : 'Erreur export journal', 'error'); }
  };

  return (
    <div className="max-w-[1120px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">{isRtl ? 'سجل العمليات' : 'Journal'}</div>
          <h1 className="text-2xl font-bold text-slate-900">{t(lang, 'auditLog')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t(lang, 'auditLogDesc')}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2" type="button" onClick={handleAuditExportExcel}>
            <FileSpreadsheet className="w-4 h-4" />
            {t(lang, 'exportAuditExcel')}
          </button>
          <button className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition" type="button" onClick={handleAuditExportCSV}>
            <Download className="w-4 h-4" />
            {t(lang, 'auditExportCSV')}
          </button>
        </div>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: '260px minmax(0, 1fr)' }}>
        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="stat-card-uniform">
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-[#27ab83]" />
            <div className="mt-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t(lang, 'auditJournalLabel')}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{auditTotal}</p>
              <p className="text-xs text-slate-500 mt-1">{t(lang, 'auditFoundOps')}</p>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t(lang, 'auditFiltersLabel')}</p>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{t(lang, 'auditUser')}</label>
              <select className="filter-select w-full" value={auditUserFilter} onChange={e => setAuditUserFilter(e.target.value)}>
                <option value="">{t(lang, 'allUsers')}</option>
                {auditFilters.users.map(user => (
                  <option key={user.user_id} value={user.user_id}>{user.user_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{t(lang, 'auditActionTypeLabel')}</label>
              <select className="filter-select w-full" value={auditActionFilter} onChange={e => setAuditActionFilter(e.target.value)}>
                <option value="">{t(lang, 'allActions')}</option>
                {auditFilters.actions.map(action => (
                  <option key={action} value={action}>{t(lang, action)}</option>
                ))}
              </select>
            </div>
            {(auditUserFilter || auditActionFilter) && (
              <button className="text-xs text-[#27ab83] font-medium" type="button" onClick={() => { setAuditUserFilter(''); setAuditActionFilter(''); }}>
                {t(lang, 'auditClearFilters')}
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <section className="min-w-0">
          {/* Filters */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 mb-6 card-hover">
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <select className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition appearance-none cursor-pointer min-w-[150px]" value={auditUserFilter} onChange={e => setAuditUserFilter(e.target.value)}>
                <option value="">{t(lang, 'allUsers')}</option>
                {auditFilters.users.map(user => (
                  <option key={user.user_id} value={user.user_id}>{user.user_name}</option>
                ))}
              </select>
              <select className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition appearance-none cursor-pointer min-w-[150px]" value={auditActionFilter} onChange={e => setAuditActionFilter(e.target.value)}>
                <option value="">{t(lang, 'allActions')}</option>
                {auditFilters.actions.map(action => (
                  <option key={action} value={action}>{t(lang, action)}</option>
                ))}
              </select>
              {(auditUserFilter || auditActionFilter) && (
                <button className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition" type="button" onClick={() => { setAuditUserFilter(''); setAuditActionFilter(''); }}>
                  {t(lang, 'auditClearFilters')}
                </button>
              )}
            </div>
          </div>

          {/* Page info */}
          {!auditLoading && (
            <div className="mb-3 text-sm text-slate-500">
              {isRtl
                ? `صفحة ${auditPage} على ${auditTotalPages} — ${auditTotal} عملية`
                : `Page ${auditPage} sur ${auditTotalPages} — ${auditTotal} opération${auditTotal !== 1 ? 's' : ''}`}
            </div>
          )}

          {/* Table */}
          {auditLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                <span className="text-3xl text-slate-300">≡</span>
              </div>
              <p className="text-sm text-slate-500">{t(lang, 'noAuditLogs')}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden card-hover">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-5 py-3">{t(lang, 'auditDateTime')}</th>
                      <th className="text-left px-5 py-3">{t(lang, 'auditUser')}</th>
                      <th className="text-left px-5 py-3">{t(lang, 'auditAction')}</th>
                      <th className="text-left px-5 py-3">{t(lang, 'auditDetails')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id} className="table-row border-b border-slate-50">
                        <td className="px-5 py-4 text-sm text-slate-700">{new Date(log.created_at).toLocaleString('fr-FR')}</td>
                        <td className="px-5 py-4 font-semibold text-sm text-slate-800">{log.user_name || '—'}</td>
                        <td className="px-5 py-4">
                          {(() => {
                            const badgeConfig = ACTION_BADGE_CONFIG[log.action];
                            if (badgeConfig) {
                              return (
                                <span
                                  className="text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1"
                                  style={{ color: badgeConfig.color, background: badgeConfig.bg }}
                                >
                                  {badgeConfig.label}
                                </span>
                              );
                            }
                            return (
                              <span className="badge bg-slate-50 text-slate-600 border border-slate-200">
                                {t(lang, log.action)}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">{formatAuditDetails(log.details) || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {!auditLoading && auditTotal > 0 && (
            <div className="mt-5 flex items-center justify-center gap-1.5">
              <button
                className="pagination-btn"
                disabled={auditPage === 1}
                onClick={() => setAuditPage(p => Math.max(1, p - 1))}
              >
                ‹
              </button>
              {auditPageNumbers.map(n => (
                <button
                  key={n}
                  className={`pagination-btn ${auditPage === n ? 'active' : ''}`}
                  onClick={() => setAuditPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                className="pagination-btn"
                disabled={auditPage === auditTotalPages}
                onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))}
              >
                ›
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
