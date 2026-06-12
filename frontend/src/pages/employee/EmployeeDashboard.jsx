import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { demandesAPI, pdfAPI } from '../../services/api';
import { STATUS_CONFIG } from '../../utils/workflowStatusConfig';
import { Badge, Button, Card, PageHeader, RingLoader, StatCard, LanguagePickerModal } from '../../components/ui';
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
} from 'lucide-react';

const DECISION_PDF_STATUSES = new Set([
  'avis_favorable',
  'decision_imprimee',
]);

const ACTIVE_STATUSES = ['en_cours_analyse', 'documents_corriges'];

const formatDate = (date, lang = 'fr') => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR');
};

const normalizeNumber = (value) => Number(value || 0);

export default function EmployeeDashboard({ lang = 'fr', isRtl = false }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState(null);
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState({});
  const [langPickerModal, setLangPickerModal] = useState({ open: false, resolve: null });
  const [error, setError] = useState('');
  const isRtlDir = isRtl || lang === 'ar';

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
      setError(err.response?.data?.message || 'Erreur de chargement du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilter.statut, tableFilter.statuts, tableFilter.treatedToday]);

  const goToSearch = (params = {}) => {
    const next = new URLSearchParams(params);
    navigate(`/employee/search${next.toString() ? `?${next.toString()}` : ''}`);
  };

  const chooseDecisionLanguage = () =>
    new Promise((resolve) => {
      setLangPickerModal({ open: true, resolve });
    });

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
      setError(err.response?.data?.message || 'Erreur pendant la generation du PDF');
    } finally {
      setPdfLoading((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const activeCount = normalizeNumber(stats?.dossiers_actifs);
  const rejectedCount = normalizeNumber(stats?.dossiers_rejetes);
  const todayCount = normalizeNumber(stats?.dossiers_traites_aujourdhui);
  const averageTime = stats?.temps_moyen_traitement_heures != null
    ? `${stats.temps_moyen_traitement_heures} h`
    : '-';

  const cards = [
    {
      label: 'Dossiers actifs',
      value: activeCount,
      sublabel: 'En analyse ou corriges',
      icon: ClipboardList,
      tone: 'warning',
      onClick: () => goToSearch({ statuts: ACTIVE_STATUSES.join(',') }),
    },
    {
      label: 'Documents rejetes',
      value: rejectedCount,
      sublabel: 'Correction citoyen attendue',
      icon: AlertTriangle,
      tone: 'danger',
      onClick: () => goToSearch({ statut: 'documents_rejetes' }),
    },
    {
      label: "Traites aujourd'hui",
      value: todayCount,
      sublabel: 'Actions finalisees ce jour',
      icon: CheckCircle2,
      tone: 'success',
      onClick: () => goToSearch({ treated: 'today' }),
    },
    {
      label: 'Temps moyen de traitement',
      value: averageTime,
      sublabel: 'Dossiers termines',
      icon: Clock,
      tone: 'default',
      onClick: () => goToSearch(),
    },
  ];

  return (
    <div className={`admin-page ${isRtlDir ? 'rtl' : 'ltr'}`} dir={isRtlDir ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-7xl">
        <PageHeader
          kicker="Espace agent"
          title="Tableau de bord employe"
          description="Priorites, dossiers recents et actions frequentes dans une vue de travail claire."
          actions={(
            <Button type="button" variant="secondary" onClick={loadDashboard} disabled={loading}>
              <RefreshCcw className="h-4 w-4" />
              Actualiser
            </Button>
          )}
        />

        {error && (
          <div className="mb-5 rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm font-medium text-rose-900 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <button key={card.label} type="button" onClick={card.onClick} className="text-left">
              <StatCard
                label={card.label}
                value={loading && !stats ? '...' : card.value}
                sublabel={card.sublabel}
                icon={card.icon}
                tone={card.tone}
                className="h-full cursor-pointer"
              />
            </button>
          ))}
        </div>

        <Card className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Actions rapides</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Acces direct aux files de travail courantes.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => navigate('/employee/new')}>
                <FilePlus2 className="h-4 w-4" />
                Nouveau dossier
              </Button>
              <Button type="button" variant="secondary" onClick={() => goToSearch({ statut: 'en_cours_analyse' })}>
                <ClipboardList className="h-4 w-4" />
                Dossiers en attente
              </Button>
              <Button type="button" variant="secondary" onClick={() => goToSearch({ statut: 'documents_rejetes' })}>
                <AlertTriangle className="h-4 w-4" />
                Documents rejetes
              </Button>
            </div>
          </div>
        </Card>

        <Card padding={false}>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Dossiers recents</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Tri par derniere modification, 10 dossiers maximum.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <RingLoader />
            </div>
          ) : demandes.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center text-slate-500 dark:text-slate-400">
              <Inbox className="mb-3 h-10 w-10" />
              <p className="font-semibold text-slate-700 dark:text-slate-200">Aucun dossier trouve</p>
              <p className="mt-1 text-sm">Les nouveaux dossiers apparaitront ici des leur mise a jour.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                    <th className="px-5 py-3 text-left">No Dossier</th>
                    <th className="px-5 py-3 text-left">Nom</th>
                    <th className="px-5 py-3 text-left">Statut</th>
                    <th className="px-5 py-3 text-left">Date</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {demandes.map((demande) => {
                    const status = STATUS_CONFIG[demande.statut] || STATUS_CONFIG.en_cours_analyse;
                    const canPrint = DECISION_PDF_STATUSES.has(demande.statut);
                    return (
                      <tr key={demande.id} className="bg-white transition hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/70">
                        <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">
                          {demande.numero_dossier}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900 dark:text-slate-50">{demande.nom_complet || '-'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{demande.cin || '-'}</p>
                        </td>
                        <td className="px-5 py-4">
                          <Badge style={{ color: status.color, backgroundColor: status.bg, borderColor: status.border }}>
                            <span aria-hidden>{status.icon}</span>
                            <span>{isRtlDir ? status.label_ar : status.label_fr}</span>
                          </Badge>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(demande.date_modification || demande.date_creation, lang)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => navigate(`/demandes/${demande.id}`)}>
                              <Eye className="h-4 w-4" />
                              Voir
                            </Button>
                            {canPrint && (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={pdfLoading[`pdf_${demande.id}`]}
                                onClick={() => printDecision(demande)}
                              >
                                <FileText className="h-4 w-4" />
                                Imprimer decision
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
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
