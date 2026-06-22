import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { demandesAPI } from '../../services/api';
import { STATUS_CONFIG } from '../../utils/workflowStatusConfig';
import { DECISION_PDF_STATUSES } from '../../utils/appConstants';
import WorkflowTimeline from '../../components/workflow/WorkflowTimeline';
import PiecesJointesPanel from '../../components/demandes/PiecesJointesPanel';
import CorrectInfoModal from '../../components/workflow/CorrectInfoModal';
import RefuseDossierModal from '../../components/workflow/RefuseDossierModal';
import ValidateProvisionalModal from '../../components/workflow/ValidateProvisionalModal';
import { Badge, Button, Card, PageHeader, RingLoader } from '../../components/ui';
import {
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  FileText,
  Files,
  Printer,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

const formatDate = (date, lang = 'fr') => (
  date ? new Date(date).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR') : '-'
);

function InfoItem({ label, value, wide = false }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{value || '-'}</p>
    </div>
  );
}

export default function DemandeDetailPage({ lang = 'fr', isRtl = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [demande, setDemande] = useState(null);
  const [pieces, setPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCorrectModal, setShowCorrectModal] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const isRtlDir = isRtl || lang === 'ar';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [demandeRes, piecesRes] = await Promise.all([
          demandesAPI.getById(id),
          demandesAPI.listPiecesJointes(id),
        ]);
        setDemande(demandeRes.data.data);
        setPieces(piecesRes.data.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleCorrectInfo = async (formData) => {
    setActionLoading(true);
    try {
      await demandesAPI.update(id, formData);
      setDemande((prev) => ({ ...prev, ...formData }));
      setShowCorrectModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefuseDossier = async (motif) => {
    setActionLoading(true);
    try {
      await demandesAPI.refuserEmploye(id, { motif_rejet_fichier: motif });
      setDemande((prev) => ({ ...prev, statut: 'documents_rejetes', motif_rejet_fichier: motif }));
      setShowRefuseModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidateProvisional = async (note) => {
    setActionLoading(true);
    try {
      await demandesAPI.validerProvisoire(id, { commentaire: note });
      setDemande((prev) => ({ ...prev, statut: 'avis_favorable', notes: note }));
      setShowValidateModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <RingLoader />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">{error}</div>;
  }

  if (!demande) {
    return <div className="p-6 text-center">Dossier non trouve</div>;
  }

  const statusConfig = STATUS_CONFIG[demande.statut] || STATUS_CONFIG.en_cours_analyse;
  const canCorrect = ['en_cours_analyse', 'documents_corriges'].includes(demande.statut);
  const canRefuse = ['en_cours_analyse', 'documents_corriges'].includes(demande.statut);
  const canValidate = ['documents_corriges', 'en_cours_analyse'].includes(demande.statut);

  return (
    <div className={`admin-page ${isRtlDir ? 'rtl' : 'ltr'}`} dir={isRtlDir ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-6xl">
        <PageHeader
          kicker={demande.numero_dossier}
          title={demande.nom_complet || 'Dossier'}
          description={`CIN ${demande.cin || '-'} - cree le ${formatDate(demande.date_creation, lang)}`}
          actions={(
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              Retour
            </Button>
          )}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Etat actuel</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{demande.numero_dossier}</h2>
                </div>
                <Badge style={{ color: statusConfig.color, backgroundColor: statusConfig.bg, borderColor: statusConfig.border }}>
                  <span>{statusConfig.icon}</span>
                  <span>{isRtlDir ? statusConfig.label_ar : statusConfig.label_fr}</span>
                </Badge>
              </div>
            </Card>

            <Card>
              <h3 className="mb-5 text-base font-semibold text-slate-900 dark:text-white">Informations du dossier</h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <InfoItem label="Nom complet" value={demande.nom_complet} />
                <InfoItem label="CIN" value={demande.cin} />
                <InfoItem label="Date de naissance" value={formatDate(demande.date_naissance, lang)} />
                <InfoItem label="Universite" value={demande.universite} />
                <InfoItem label="Adresse" value={demande.adresse_complete} wide />
                <InfoItem label="Commune" value={demande.commune} />
                <InfoItem label="Cercle" value={demande.cercle} />
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Pieces jointes</h3>
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {pieces.length}
                </span>
              </div>
              <PiecesJointesPanel demandeId={id} pieces={pieces} isRtl={isRtl} />
            </Card>

            <Card>
              <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Chronologie du dossier</h3>
              <WorkflowTimeline demandeId={id} demande={demande} lang={lang} />
            </Card>
          </div>

          <aside className="space-y-4">
            <Card className="border-l-4 border-l-sky-700">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-sky-50 p-2 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Controle rapide</p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                    Verifier donnees et pieces avant decision
                  </h3>
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                  <span className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-slate-500" />
                    Statut
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">{isRtlDir ? statusConfig.label_ar : statusConfig.label_fr}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                  <span className="flex items-center gap-2">
                    <Files className="h-4 w-4 text-slate-500" />
                    Pieces
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">{pieces.length}</span>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Actions disponibles
              </h3>
              <div className="grid gap-2">
                {canCorrect && (
                  <Button onClick={() => setShowCorrectModal(true)} className="w-full justify-start" variant="outline">
                    <FileText className="h-4 w-4" />
                    Corriger les infos
                  </Button>
                )}

                {canRefuse && (
                  <Button onClick={() => setShowRefuseModal(true)} className="w-full justify-start" variant="outline">
                    <XCircle className="h-4 w-4" />
                    Refuser
                  </Button>
                )}

                {canValidate && (
                  <Button onClick={() => setShowValidateModal(true)} className="w-full justify-start" variant="outline">
                    <CheckCircle2 className="h-4 w-4" />
                    Valider provisoirement
                  </Button>
                )}
              </div>
            </Card>
          </aside>
        </div>
      </div>

      <CorrectInfoModal
        isOpen={showCorrectModal}
        onClose={() => setShowCorrectModal(false)}
        demande={demande}
        onSave={handleCorrectInfo}
        loading={actionLoading}
        lang={lang}
        isRtl={isRtl}
      />

      <RefuseDossierModal
        isOpen={showRefuseModal}
        onClose={() => setShowRefuseModal(false)}
        demande={demande}
        onRefuse={handleRefuseDossier}
        loading={actionLoading}
        lang={lang}
        isRtl={isRtl}
      />

      <ValidateProvisionalModal
        isOpen={showValidateModal}
        onClose={() => setShowValidateModal(false)}
        demande={demande}
        onValidate={handleValidateProvisional}
        loading={actionLoading}
        lang={lang}
        isRtl={isRtl}
      />
    </div>
  );
}
