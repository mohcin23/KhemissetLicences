import React from 'react';
import {
  FileText,
  Printer,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button, Badge, EmptyState, RingLoader, TableSkeleton } from '../ui';
import { Inbox } from 'lucide-react';
import { t } from '../../i18n/translations';
import { STATUS_CONFIG } from '../../utils/workflowStatusConfig';

function initials(name) {
  if (!name || typeof name !== 'string') return '?';
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return '?';
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

const AGENT_STATUS_OPTIONS = [
  { value: 'en_cours_analyse', label_fr: "En cours d'étude", label_ar: 'قيد الدراسة' },
  { value: 'documents_rejetes', label_fr: 'Refusé', label_ar: 'مرفوض' },
  { value: 'avis_favorable', label_fr: 'Validé provisoirement', label_ar: 'تم التصديق مؤقتاً' },
  { value: 'decision_imprimee', label_fr: 'Décision imprimée', label_ar: 'القرار مطبوع' },
  { value: 'accepte', label_fr: 'Accepté (Gouverneur)', label_ar: 'مقبول (المحافظ)' },
  { value: 'refuse', label_fr: 'Refusé (Gouverneur)', label_ar: 'مرفوض (المحافظ)' },
];

const TRANSITIONS_VALIDES = {
  en_cours_analyse: ['documents_rejetes', 'avis_favorable', 'decision_imprimee'],
  avis_favorable: ['decision_imprimee'],
  decision_imprimee: ['accepte', 'refuse'],
  documents_rejetes: ['en_cours_analyse'],
  documents_corriges: ['en_cours_analyse'],
};

export default function DemandesTable({
  isRtl,
  lang = 'fr',
  loading,
  demandes,
  formatDate,
  searchTotal,
  currentPage,
  totalPages,
  pageNumbers,
  setCurrentPage,
  canEditDemande,
  canGeneratePdf,
  isAdminRole,
  pdfLoading,
  onTrack,
  onPdf,
  onPrint,
  onStatusChange,
  onRejectDocs,
  onDelete,
  renderLicenceBadge,
  emptyResetFilters,
  hasActiveFilters
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex justify-center py-8">
          <RingLoader />
        </div>
        <TableSkeleton rows={5} cols={5} />
      </div>
    );
  }

  if (!demandes.length) {
    return (
      <EmptyState
        icon={Inbox}
        title={t(lang, 'dtNoResults')}
        description={t(lang, 'dtNoResultsHint')}
        action={
          hasActiveFilters ? (
            <Button type="button" variant="secondary" onClick={emptyResetFilters}>
              {t(lang, 'dtClearFilters')}
            </Button>
          ) : null
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm dark:text-slate-100">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400">
                <th className="px-4 py-3 ltr:text-left rtl:text-right">{t(lang, 'dtDossier')}</th>
                <th className="px-4 py-3">{t(lang, 'dtPharmacien')}</th>
                <th className="px-4 py-3">{t(lang, 'dtStatut')}</th>
                <th className="px-4 py-3">{t(lang, 'dtDate')}</th>
                <th className="px-4 py-3 text-end">{t(lang, 'dtActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {demandes.map((d) => {
                const sc = STATUS_CONFIG[d.statut] || STATUS_CONFIG.en_cours_analyse;
                const pdfKey = `pdf_${d.id}`;
                const canEditThis = canEditDemande(d);
                const canPdfThis = canGeneratePdf(d);
                const agentStatusOptions = AGENT_STATUS_OPTIONS.filter(opt => {
                  const validNext = TRANSITIONS_VALIDES[d.statut];
                  return validNext && validNext.includes(opt.value);
                });
                return (
                  <tr
                    key={d.id}
                    className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-bold text-white shadow-inner dark:from-amber-600 dark:to-amber-800"
                          aria-hidden
                        >
                          {initials(d.nom_complet)}
                        </div>
                        <div>
                          <p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">{d.numero_dossier}</p>
                          {renderLicenceBadge && renderLicenceBadge(d)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-slate-900 dark:text-slate-50">{d.nom_complet}</p>
                      <p className="text-xs text-slate-400 font-mono">{d.cin}</p>
                      <p className="text-xs text-slate-400">{d.commune}{d.cercle ? ` · ${d.cercle}` : ''}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Badge
                        style={{
                          color: sc.color,
                          backgroundColor: sc.bg,
                          borderColor: sc.border
                        }}
                      >
                        <span aria-hidden>{sc.icon}</span>
                        <span className="max-w-[140px] truncate">{isRtl ? sc.label_ar : sc.label_fr}</span>
                      </Badge>
                      {(d.statut === 'fichier_rejete' || d.statut === 'documents_rejetes') && d.motif_rejet_fichier && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-rose-600 dark:text-rose-400" title={d.motif_rejet_fichier}>
                          {d.motif_rejet_fichier}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(d.date_creation)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button type="button" size="sm" variant="outline" className="!px-2" onClick={() => onTrack(d)} title="Suivi">
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Suivi</span>
                        </Button>
                        {canPdfThis && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="!px-2"
                              disabled={pdfLoading[pdfKey]}
                              onClick={() => onPdf(d.id, d.numero_dossier)}
                              title="PDF"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="!px-2"
                              disabled={pdfLoading[`print_${d.id}`]}
                              onClick={() => onPrint(d.id)}
                              title="Print"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {canEditThis && (
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                onStatusChange(d.id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 cursor-pointer"
                            title={isRtl ? 'تغيير الحالة' : 'Changer le statut'}
                          >
                            <option value="">
                              {isRtl ? '⋯' : '⋯'}
                            </option>
                            {agentStatusOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {isRtl ? opt.label_ar : opt.label_fr}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {`${t(lang, 'dtPage')} ${currentPage} / ${totalPages} — ${searchTotal} ${t(lang, 'dtResult')}${searchTotal !== 1 ? 's' : ''}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="ms-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label={t(lang, 'dtPreviousLabel')}
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCurrentPage(n)}
                className={`min-w-[2.25rem] rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                  currentPage === n
                    ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {n}
              </button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label={t(lang, 'dtNextLabel')}
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
