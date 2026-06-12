import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock,
  FileCheck2,
  FileWarning,
  GitBranch,
  Printer,
  RefreshCw,
  Send,
  Shield,
  User
} from 'lucide-react';
import { workflowAPI } from '../../services/api';
import { STATUS_CONFIG } from '../../utils/workflowStatusConfig';
import { t } from '../../i18n/translations';

const STATUS_ALIASES = {
  valide_provisoirement: 'avis_favorable',
  accepte_definitif: 'accepte',
  refuse_gouverneur: 'refuse',
  refuse_employe: 'documents_rejetes',
  fichier_rejete: 'documents_rejetes',
  fichier_corrige: 'documents_corriges',
  approuve: 'accepte',
  rejete: 'refuse',
  depose: 'en_cours_analyse'
};

const ACTION_LABELS = {
  demande_deposee: { fr: 'Demande déposée', ar: 'تم تقديم الطلب' },
  fichier_rejete: { fr: 'Documents rejetés', ar: 'رفض الوثائق' },
  fichier_corrige: { fr: 'Correction reçue', ar: 'تم استلام التصحيح' },
  documents_corriges: { fr: 'Documents corrigés', ar: 'وثائق مصححة' },
  decision_imprimee: { fr: 'Décision imprimée', ar: 'تمت طباعة القرار' },
  decision_imprimee_generee: { fr: 'Décision PDF générée', ar: 'تم إعداد قرار PDF' },
  transmis_au_chef: { fr: 'Transmis au responsable', ar: 'إحالة إلى المسؤول' },
  avis_favorable: { fr: 'Documents validés', ar: 'وثائق مvalidée' },
  approuve: { fr: 'Accepté par le Gouverneur', ar: 'قبول من طرف المحافظ' },
  accepte_definitif: { fr: 'Accepté définitivement', ar: 'قبول نهائي' },
  refuse_gouverneur: { fr: 'Refusé par le Gouverneur', ar: 'رفض من طرف المحافظ' },
  refuse_employe: { fr: 'Refus temporaire employé', ar: 'رفض مؤقت من الموظف' },
  changement_statut: { fr: 'Changement de statut', ar: 'تغيير الحالة' },
  admin_forcer_statut: { fr: 'Action administrative', ar: 'إجراء إداري' },
  reprise_analyse: { fr: "Reprise de l'analyse", ar: 'استئناف الدراسة' }
};

const normalizeStatus = (status) => STATUS_ALIASES[status] || status;

const getProgressForStatus = (status) => {
  const rawStatus = status || '';
  const normalized = normalizeStatus(rawStatus);

  if (['depose', 'en_attente', 'demande_deposee'].includes(rawStatus)) return 25;
  if (['accepte', 'refuse', 'archive'].includes(normalized)) return 100;
  if (['avis_favorable', 'decision_imprimee'].includes(normalized)) return 50;
  if (['en_cours_analyse', 'documents_rejetes', 'documents_corriges'].includes(normalized)) return 25;

  return rawStatus ? 25 : 0;
};

const getEventDate = (event) =>
  event?.date_action || event?.created_at || event?.updated_at || event?.date_creation || null;

const sortEventsAsc = (items) => [...items].sort((a, b) => {
  const at = getEventDate(a) ? new Date(getEventDate(a)).getTime() : 0;
  const bt = getEventDate(b) ? new Date(getEventDate(b)).getTime() : 0;
  if (at !== bt) return at - bt;
  return Number(a?.id || 0) - Number(b?.id || 0);
});

const formatDateTime = (date, lang = 'fr') =>
  date ? new Date(date).toLocaleString(lang === 'ar' ? 'ar-MA' : 'fr-FR') : '-';

const formatShortDate = (date, lang = 'fr') =>
  date ? new Date(date).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR') : null;

const formatDuration = (sec) => {
  if (sec == null || sec === '') return null;
  const n = Number(sec);
  if (Number.isNaN(n) || n <= 0) return null;
  if (n < 60) return `${n}s`;
  if (n < 3600) return `${Math.floor(n / 60)} min`;
  if (n < 86400) return `${Math.floor(n / 3600)} h`;
  return `${Math.floor(n / 86400)} j`;
};

const statusConfigFor = (status) => STATUS_CONFIG[normalizeStatus(status)] || STATUS_CONFIG.en_cours_analyse;

const statusFromEvent = (event) =>
  normalizeStatus(event?.nouveau_statut || event?.statut || event?.status || event?.action || event?.event_type);

const bilingualStatusLabel = (status, lang) => {
  const normalized = normalizeStatus(status);
  const config = statusConfigFor(normalized);
  if (!config) return normalized || '-';
  return lang === 'ar'
    ? `${config.label_ar} / ${config.label_fr}`
    : `${config.label_fr} / ${config.label_ar}`;
};

const actionLabel = (action, lang) => {
  const row = ACTION_LABELS[action];
  if (!row) return action || (lang === 'ar' ? 'حدث' : 'Événement');
  return lang === 'ar' ? row.ar : row.fr;
};

function actionIcon(action, status) {
  const value = `${action || ''} ${status || ''}`;
  if (value.includes('rejet') || value.includes('refus') || status === 'documents_rejetes' || status === 'refuse') return FileWarning;
  if (value.includes('approuv') || value.includes('accept') || status === 'accepte') return CheckCircle2;
  if (value.includes('imprim') || value.includes('pdf') || status === 'decision_imprimee') return Printer;
  if (value.includes('transmis') || value.includes('chef')) return Send;
  if (value.includes('corrige') || value.includes('correction') || status === 'documents_corriges') return FileCheck2;
  if (value.includes('admin') || value.includes('forcer')) return Shield;
  if (value.includes('reprise')) return RefreshCw;
  return GitBranch;
}

const findEventDate = (events, matcher, fallback = null) => {
  const event = events.find(matcher);
  return getEventDate(event) || fallback;
};

const getRejectReason = (demande, events, lang) => {
  const event = [...events].reverse().find((ev) => statusFromEvent(ev) === 'documents_rejetes');
  return demande?.motif_rejet_fichier ||
    event?.raison_rejet ||
    event?.commentaire ||
    event?.message ||
    demande?.notes ||
    (lang === 'ar' ? 'غير محدد' : 'Non précisé');
};

const getFinalReason = (demande, events, lang) => {
  const event = [...events].reverse().find((ev) => statusFromEvent(ev) === 'refuse');
  return demande?.notes ||
    demande?.motif_rejet ||
    event?.commentaire ||
    event?.raison_rejet ||
    event?.message ||
    (lang === 'ar' ? 'غير محدد' : 'Non précisée');
};

/* ── Timeline step circle ── */
function StepCircle({ state, size = 44 }) {
  const s = { w: size, h: size, text: size <= 40 ? 'text-xs' : 'text-sm' };
  if (state === 'completed') {
    return (
      <div className={`flex items-center justify-center rounded-full bg-[#10B981] text-white font-bold shadow-md shadow-emerald-200`}
        style={{ width: s.w, height: s.h }}>
        <svg width={size * 0.45} height={size * 0.45} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  if (state === 'current') {
    return (
      <div className="relative flex items-center justify-center" style={{ width: s.w, height: s.h }}>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-30" />
        <span className="relative inline-flex rounded-full bg-[#2563eb] shadow-md shadow-blue-200" style={{ width: s.w, height: s.h }} />
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-center rounded-full border-2 border-dashed border-[#d1d5db] bg-white text-[#9ca3af] font-bold ${s.text}`}
      style={{ width: s.w, height: s.h }}>
      ○
    </div>
  );
}

/* ── Horizontal connector line between steps ── */
function StepConnectorH({ done }) {
  return (
    <div className="flex-1 flex items-center">
      <div className={`h-[3px] w-full rounded-full transition-colors duration-500 ${done ? 'bg-[#10B981]' : 'bg-[#e5e7eb]'}`} />
    </div>
  );
}

/* ── Timeline Statuts – 4 high-level steps (horizontal) ── */
function TimelineStatuts({ demande, events, lang }) {
  const isRtl = lang === 'ar';
  const current = normalizeStatus(demande?.statut);
  const isFinalApproved = current === 'accepte';
  const isFinalRefused = current === 'refuse';
  const isFinal = isFinalApproved || isFinalRefused;
  const isDocsRejected = current === 'documents_rejetes';

  const submittedDate = findEventDate(
    events,
    (event, index) => event.action === 'demande_deposee' || event.ancien_statut == null || index === 0,
    demande?.date_creation || demande?.date_demande
  );
  const analysisDate = findEventDate(
    events,
    (event) => ['en_cours_analyse', 'documents_rejetes', 'documents_corriges'].includes(statusFromEvent(event)),
    submittedDate
  );
  const preparedDate = findEventDate(
    events,
    (event) => ['avis_favorable', 'decision_imprimee'].includes(statusFromEvent(event)),
    null
  );
  const finalDate = findEventDate(
    events,
    (event) => ['accepte', 'refuse'].includes(statusFromEvent(event)),
    isFinal ? demande?.date_modification : null
  );

  const stepMap = (key) => {
    const map = {
      submitted: { state: 'completed' },
      analysis: {
        state: ['en_cours_analyse', 'documents_rejetes', 'documents_corriges'].includes(current) ? 'current' : 'completed'
      },
      prepared: {
        state: isFinal ? 'completed' : ['avis_favorable', 'decision_imprimee'].includes(current) ? 'current' : 'pending'
      },
      final: {
        state: isFinal ? 'completed' : 'pending'
      }
    };
    return map[key];
  };

  const tStep = (fr, ar) => lang === 'ar' ? ar : fr;

  const steps = [
    {
      key: 'submitted',
      label: tStep('Dossier soumis', 'تم تقديم الطلب'),
      date: submittedDate,
      ...stepMap('submitted')
    },
    {
      key: 'analysis',
      label: tStep("En cours d'analyse", 'قيد الدراسة'),
      date: analysisDate,
      ...stepMap('analysis')
    },
    {
      key: 'prepared',
      label: tStep('Décision préparée', 'تم إعداد القرار'),
      date: preparedDate,
      ...stepMap('prepared')
    },
    {
      key: 'final',
      label: tStep('Décision finale', 'القرار النهائي'),
      date: finalDate,
      ...stepMap('final')
    }
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Horizontal Steps */}
      <div className="px-6 sm:px-8 pt-6 pb-5">
        <div className="flex items-start">
          {steps.map((step, index) => (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center flex-1 min-w-0">
                <StepCircle state={step.state} />
                <p className={`text-xs font-bold mt-2.5 text-center leading-tight ${
                  step.state === 'completed' ? 'text-[#10B981]' :
                  step.state === 'current' ? 'text-[#2563eb]' : 'text-[#9ca3af]'
                }`}>
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-[11px] text-slate-400 mt-1 text-center">
                    {formatShortDate(step.date, lang)}
                  </p>
                )}
                {step.state === 'current' && (
                  <span className="mt-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-600">
                    {lang === 'ar' ? 'حالي' : 'Actuel'}
                  </span>
                )}
                {step.state === 'pending' && (
                  <span className="mt-1.5 rounded-full bg-slate-50 px-2.5 py-0.5 text-[10px] font-medium text-slate-400">
                    {lang === 'ar' ? 'في الانتظار' : 'En attente'}
                  </span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className="flex items-center pt-[22px] flex-1 min-w-0 px-0.5">
                  <StepConnectorH done={step.state === 'completed'} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Alert Messages */}
      {(isDocsRejected || isFinalApproved || isFinalRefused) && (
        <div className="border-t border-slate-100 px-6 sm:px-8 py-4 bg-slate-50/50">
          {isDocsRejected && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-900">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <strong>{lang === 'ar' ? 'الوثائق غير كافية' : 'Documents insuffisants'}</strong>
              </div>
              <p className="text-red-800">
                {lang === 'ar'
                  ? `السبب: ${getRejectReason(demande, events, lang)}`
                  : `Raison : ${getRejectReason(demande, events, lang)}`}
              </p>
              <p className="mt-2 font-semibold text-red-700">
                {lang === 'ar' ? 'يمكنك التصحيح وإعادة التقديم' : 'Vous pouvez corriger et resoumettre'}
              </p>
            </div>
          )}

          {isFinalApproved && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              {lang === 'ar'
                ? 'تمت الموافقة — يرجى الحضور إلى العمالة لاستلام الرخصة'
                : "Approuvée — Venez récupérer votre licence à l'Amalat"}
            </div>
          )}

          {isFinalRefused && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              {lang === 'ar'
                ? `مرفوضة — السبب: ${getFinalReason(demande, events, lang)}`
                : `Refusée — Raison : ${getFinalReason(demande, events, lang)}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WorkflowTimeline({
  demandeId,
  demande,
  lang = 'fr',
  onCorrect,
  className = '',
  showCitizenSteps = false
}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const isRtl = lang === 'ar';
  const current = normalizeStatus(demande?.statut);

  useEffect(() => {
    const load = async () => {
      if (!demandeId) return;
      setLoading(true);
      try {
        const res = await workflowAPI.getEvents(demandeId);
        setEvents(sortEventsAsc(res.data.data || []));
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [demandeId]);

  const sortedEvents = useMemo(() => sortEventsAsc(events), [events]);

  const progressPct = useMemo(
    () => getProgressForStatus(demande?.statut),
    [demande?.statut]
  );

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200/80 bg-white/60 py-16 dark:border-slate-700 dark:bg-slate-900/50 ${className}`}>
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-600" role="status" aria-label="Chargement" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t(lang, 'wtLoading')}</p>
      </div>
    );
  }

  if (!sortedEvents.length && !showCitizenSteps) {
    return (
      <div className={`space-y-4 ${className}`}>
        {demande && <TimelineStatuts demande={demande} events={[]} lang={lang} />}
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-10 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-slate-300" aria-hidden />
          <p className="font-semibold text-slate-700">{t(lang, 'wtNoHistory')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Timeline Statuts */}
      <TimelineStatuts demande={demande} events={sortedEvents} lang={lang} />

      {/* Progression du dossier */}
      <div className="rounded-[16px] border border-[#e2e8f0] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span role="img" aria-label="progress">🔄</span>
            <span className="text-sm font-bold text-[#0f172a]">
              {t(lang, 'wtProgress')}
            </span>
          </div>
          <span className="text-sm font-bold text-accent-500">{progressPct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#f1f5f9]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400 transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Historique Actions */}
      <div className="rounded-[16px] border border-[#e2e8f0] bg-white p-5 shadow-sm" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="h-4 w-4 text-[#64748b]" aria-hidden />
          <h3 className="text-sm font-bold text-[#0f172a]">
            {lang === 'ar' ? 'سجل الإجراءات' : 'Historique des actions'}
          </h3>
        </div>

        <div className="space-y-3">
          {sortedEvents.map((event, index) => {
            const isLast = index === sortedEvents.length - 1;
            const status = statusFromEvent(event);
            const config = statusConfigFor(status);
            const title = actionLabel(event.action || event.event_type, lang);
            const showReject = event.raison_rejet || (status === 'documents_rejetes' && event.message);
            const IconNode = actionIcon(event.action || event.event_type, status);

            return (
              <div key={event.id || `${getEventDate(event)}-${index}`} className="relative animate-fade-in opacity-0 [animation-fill-mode:forwards]"
                style={{ animationDelay: `${Math.min(index * 55, 500)}ms` }}>
                <div className="rounded-xl bg-[#f8fafc] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <IconNode className="h-4 w-4 text-[#64748b] shrink-0" aria-hidden />
                        <h4 className="text-sm font-bold text-[#0f172a]">{title}</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-[#64748b]">
                        <span className="inline-flex items-center gap-1">
                          <span role="img" aria-label="date">⏰</span>
                          {formatDateTime(getEventDate(event), lang)}
                        </span>
                        {event.utilisateur_nom && (
                          <span className="inline-flex items-center gap-1">
                            <span role="img" aria-label="user">👤</span>
                            {event.utilisateur_nom}
                            {event.role_utilisateur && (
                              <span className="text-[#94a3b8]">({event.role_utilisateur})</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isLast && (
                        <span className="rounded-full bg-accent-50 px-3 py-1 text-[11px] font-semibold text-accent-500">
                          {t(lang, 'wtCurrentStep')}
                        </span>
                      )}
                      {status && (
                        <span
                          className="shrink-0 rounded-full px-3 py-1 text-[11px] font-medium"
                          style={{
                            color: config.color,
                            backgroundColor: config.bg,
                            border: `1px solid ${config.border}`
                          }}
                        >
                          {lang === 'ar' ? config.label_ar : config.label_fr}
                        </span>
                      )}
                    </div>
                  </div>

                  {event.commentaire && (
                    <p className="mt-3 rounded-lg border border-[#e2e8f0] bg-white p-3 text-sm leading-relaxed text-[#0f172a]">
                      {event.commentaire}
                    </p>
                  )}

                  {showReject && (
                    <div className="mt-3 rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4 text-sm text-rose-900">
                      <strong className="flex items-center gap-2">
                        <FileWarning className="h-4 w-4" aria-hidden />
                        {t(lang, 'wtRejectReason')}
                      </strong>
                      <p className="mt-2 leading-relaxed">{event.raison_rejet || event.message}</p>
                    </div>
                  )}

                  {event.temps_traitement != null && formatDuration(event.temps_traitement) && (
                    <p className="mt-3 text-xs text-[#94a3b8]">
                      {t(lang, 'wtDuration')}:{' '}
                      <span className="font-semibold text-[#64748b]">{formatDuration(event.temps_traitement)}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {onCorrect &&
        current === 'documents_rejetes' &&
        sortedEvents.length > 0 &&
        statusFromEvent(sortedEvents[sortedEvents.length - 1]) === 'documents_rejetes' && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={onCorrect}
              className="rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:from-amber-500 hover:to-amber-600 focus-visible:outline focus-visible:ring-4 focus-visible:ring-amber-400/40"
            >
              {t(lang, 'wtCorrectBtn')}
            </button>
          </div>
        )}
    </div>
  );
}
