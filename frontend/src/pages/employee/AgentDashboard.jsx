import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { demandesAPI, pdfAPI } from '../../services/api';
import { STATUS_CONFIG } from '../../utils/workflowStatusConfig';
import { t } from '../../i18n/translations';
import { LanguagePickerModal } from '../../components/ui';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  FilePlus2,
  FileText,
  Inbox,
  RefreshCcw,
  ArrowRight,
} from 'lucide-react';

const DECISION_PDF_STATUSES = new Set([
  'en_cours_analyse',
  'avis_favorable',
  'decision_imprimee',
]);

const PRINT_DECISION_LABEL = {
  fr: 'Imprimer la décision',
  ar: 'طباعة القرار',
};

const formatDate = (date, lang = 'fr') => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR');
};

const formatLongDate = (date, lang = 'fr') => {
  if (!date) return '';
  return new Date(date).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const normalizeNumber = (value) => Number(value || 0);

const STATUS_BADGE_MAP = [
  { match: /attente.*signature/i, fr: 'statutEnAttenteSignature', ar: 'statutEnAttenteSignature' },
  { match: /approuv/i, fr: 'statutApprouve', ar: 'statutApprouve' },
  { match: /rejet/i, fr: 'statutRejete', ar: 'statutRejete' },
  { match: /cours.*traitement/i, fr: 'statutEnTraitement', ar: 'statutEnTraitement' },
  { match: /décision.*imprimée|decision.*imprimee/i, fr: 'statutDecisionImprimee', ar: 'statutDecisionImprimee' },
  { match: /nouveau|déposé|depose/i, fr: 'statutNouveau', ar: 'statutNouveau' },
];

function StatusBadge({ statusText, lang = 'fr' }) {
  const found = STATUS_BADGE_MAP.find((s) => s.match.test(statusText));
  if (!found) {
    return (
      <span
        title={statusText}
        className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
      >
        {statusText}
      </span>
    );
  }
  const label = t(lang, found[lang] || found.fr);
  return (
    <span
      title={statusText}
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: '#F1F5F9', color: '#64748B', borderRadius: 999 }}
    >
      {label}
    </span>
  );
}

export default function AgentDashboard({ lang = 'fr', isRtl = false }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState(null);
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState({});
  const [langPickerModal, setLangPickerModal] = useState({ open: false, resolve: null });
  const [error, setError] = useState('');
  const isRtlDir = isRtl || lang === 'ar';
  const tr = (key) => t(lang, key);

  const tableFilter = useMemo(() => ({
    statut: searchParams.get('statut') || '',
    statuts: searchParams.get('statuts') || '',
    treatedToday: searchParams.get('treated') === 'today',
  }), [searchParams]);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const listParams = {
        limit: 10,
        sort_by: 'date_modification',
        sort_dir: 'desc',
      };
      if (tableFilter.statut) listParams.statut = tableFilter.statut;
      if (tableFilter.statuts) listParams.statut = tableFilter.statuts;
      if (tableFilter.treatedToday) listParams.traite_aujourdhui = 1;

      const [dashboardRes, demandesRes] = await Promise.all([
        demandesAPI.getAgentDashboard(),
        demandesAPI.getAll(listParams),
      ]);

      setStats(dashboardRes.data.data || {});
      setDemandes(demandesRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || tr('agentLoadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, [tableFilter.statut, tableFilter.statuts, tableFilter.treatedToday]); // eslint-disable-line

  const goToSearch = (params = {}) => {
    const next = new URLSearchParams(params);
    navigate(`/app/search${next.toString() ? `?${next.toString()}` : ''}`);
  };

  const chooseDecisionLanguage = () =>
    new Promise((resolve) => setLangPickerModal({ open: true, resolve }));

  const handleLangPickerSelect = (selectedLang) => {
    setLangPickerModal((prev) => {
      prev.resolve?.(selectedLang);
      return { open: false, resolve: null };
    });
  };

  const handleLangPickerClose = () => {
    setLangPickerModal((prev) => {
      prev.resolve?.(null);
      return { open: false, resolve: null };
    });
  };

  const printDecision = async (demande) => {
    if (!DECISION_PDF_STATUSES.has(demande.statut)) return;
    const pdfLang = await chooseDecisionLanguage();
    if (!pdfLang) return;
    const key = `pdf_${demande.id}`;
    setPdfLoading((prev) => ({ ...prev, [key]: true }));
    try {
      await pdfAPI.downloadDecision(demande.id, demande.numero_dossier, pdfLang);
    } catch (err) {
      setError(err.response?.data?.message || tr('agentPdfError'));
    } finally {
      setPdfLoading((prev) => { const next = { ...prev }; delete next[key]; return next; });
    }
  };

  const activeCount = normalizeNumber(stats?.dossiers_actifs);
  const attenteCount = normalizeNumber(stats?.dossiers_en_attente ?? stats?.dossiers_rejetes);
  const todayCount = normalizeNumber(stats?.dossiers_traites_aujourdhui);
  const rejectedCount = normalizeNumber(stats?.dossiers_rejetes);
  const today = formatLongDate(new Date(), lang);

  const statCards = [
    { label: tr('agentStatEnCours'), value: activeCount, icon: ClipboardList, iconColor: '#3B82F6' },
    { label: tr('agentStatFileAttente'), value: attenteCount, icon: Clock, iconColor: '#F59E0B' },
    { label: tr('agentStatTraitesToday'), value: todayCount, icon: CheckCircle2, iconColor: '#10B981' },
    { label: tr('agentStatRejetes'), value: rejectedCount, icon: AlertTriangle, iconColor: '#EF4444' },
  ];

  return (
    <div className={isRtlDir ? 'rtl' : 'ltr'} dir={isRtlDir ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-1">{tr('agentSpace')}</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {tr('agentHello')}{' '}
            <span className="text-teal-600 dark:text-teal-400">
              {stats?.prenom_agent || tr('agentHelloFallback')}
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {today} — {tr('agentSubtitle')}
          </p>
        </div>
        <button
          onClick={loadDashboard}
          disabled={loading}
          className="btn-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {tr('agentRefresh')}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-4 text-sm font-medium text-rose-800 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="stat-card-uniform"
              style={{ borderBottom: '3px solid #10B981' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{card.label}</p>
                  <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2 tabular-nums tracking-tight">{loading && !stats ? '...' : card.value}</p>
                </div>
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: `${card.iconColor}1A` }}
                >
                  <Icon className="w-5 h-5" style={{ color: card.iconColor }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dossiers à traiter banner */}
      {!loading && (() => {
        const dossiers_a_traiter = attenteCount + activeCount;
        if (dossiers_a_traiter === 0) {
          return (
            <div className="flex items-center gap-3 mb-4 bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500 rounded-lg p-3.5 text-sm font-medium text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
              {tr('agentNoDossierEmpty')}
            </div>
          );
        }
        const isUrgent = dossiers_a_traiter >= 2;
        const Icon = isUrgent ? AlertTriangle : Clock;
        const iconColor = isUrgent ? '#EF4444' : '#F59E0B';
        const label = dossiers_a_traiter === 1
          ? tr('agentDossierCountOne')
          : tr('agentDossierCountMany').replace('{count}', String(dossiers_a_traiter));
        const btnLabel = dossiers_a_traiter === 1 ? tr('agentVoirDossier') : tr('agentVoirDossiers');
        return (
          <div className={`flex items-center justify-between gap-3 mb-4 rounded-lg p-3.5 ${isUrgent ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500' : 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500'}`}>
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 shrink-0" style={{ color: iconColor }} />
              <span className={`text-sm font-medium ${isUrgent ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}`}>
                {label}
              </span>
            </div>
            <button
              onClick={() => goToSearch({ statut: 'en_attente' })}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg text-[13px] font-semibold transition bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 px-3.5 py-1.5"
            >
              {btnLabel}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })()}

      {/* Actions rapides */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 mb-6 card-hover">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">{tr('agentActionsRapides')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{tr('agentActionsRapidesSub')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => navigate('/app/new')} className="btn-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
              <FilePlus2 className="w-4 h-4" />
              {tr('agentBtnNouveau')}
            </button>
            <button onClick={() => goToSearch({ statut: 'en_cours_analyse' })} className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition">
              <Clock className="w-4 h-4 text-amber-500" />
              {tr('agentBtnEnAttente')}
            </button>
            <button onClick={() => goToSearch({ statut: 'documents_rejetes' })} className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition">
              <AlertTriangle className="w-4 h-4" />
              {tr('agentBtnDocsRejetes')}
            </button>
          </div>
        </div>
      </div>

      {/* Recent dossiers */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden card-hover">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{tr('agentRecent')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{tr('agentRecentSub')}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : demandes.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center text-slate-500 dark:text-slate-400">
            <Inbox className="mb-3 w-10 h-10" />
            <p className="font-semibold text-slate-700 dark:text-slate-200">{tr('agentEmptyTitle')}</p>
            <p className="mt-1 text-sm">{tr('agentEmptySub')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-5 py-3 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">{tr('agentThDossier')}</th>
                  <th className="text-left px-5 py-3 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">{tr('agentThDemandeur')}</th>
                  <th className="text-left px-5 py-3 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">{tr('agentThStatut')}</th>
                  <th className="text-left px-5 py-3 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">{tr('agentThDate')}</th>
                  <th className="text-right px-5 py-3 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">{tr('agentThActions')}</th>
                </tr>
              </thead>
              <tbody>
                {demandes.map((demande) => {
                  const status = STATUS_CONFIG[demande.statut] || STATUS_CONFIG.en_cours_analyse;
                  const canPrint = DECISION_PDF_STATUSES.has(demande.statut);
                  return (
                    <tr key={demande.id} className="table-row border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-4 font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {demande.numero_dossier}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{demande.nom_complet || '-'}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">{demande.cin || '-'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge statusText={isRtlDir ? status.label_ar : status.label_fr} lang={lang} />
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(demande.date_modification || demande.date_creation, lang)}
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        <button
                          onClick={() => navigate(`/app/search`)}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center gap-1.5 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {tr('agentActionVoir')}
                        </button>
                        {canPrint && (
                          <button
                            onClick={() => printDecision(demande)}
                            disabled={pdfLoading[`pdf_${demande.id}`]}
                            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/40 inline-flex items-center gap-1.5 transition"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {tr('agentActionImprimer')}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LanguagePickerModal
        open={langPickerModal.open}
        onClose={handleLangPickerClose}
        onSelect={handleLangPickerSelect}
        isRtl={isRtlDir}
      />
    </div>
  );
}
