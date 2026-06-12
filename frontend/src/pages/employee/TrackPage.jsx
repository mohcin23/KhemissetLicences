import React from 'react';
import LicenceBadge from '../../components/licences/LicenceBadge';
import ExtraDataPanel from '../../components/demandes/ExtraDataPanel';
import WorkflowTimeline from '../../components/workflow/WorkflowTimeline';
import PiecesJointesPanel from '../../components/demandes/PiecesJointesPanel';
import { STATUS_CONFIG } from '../../utils/workflowStatusConfig';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('auth_token')}`
});

export default function TrackPage({
  lang, isRtl, selectedDemande, piecesJointes, pjLoading, pjUploading,
  isAgentRole, onBack, onUploadPj, onDeletePj, showToast
}) {
  const handlePrintAll = async () => {
    if (!piecesJointes || piecesJointes.length === 0) {
      showToast(isRtl ? 'لا توجد وثائق للطباعة' : 'Aucun document à imprimer', 'error');
      return;
    }

    showToast(isRtl ? 'جاري فتح جميع الوثائق للطباعة…' : 'Ouverture des documents pour impression…', 'info');

    for (const pj of piecesJointes) {
      try {
        const url = `${window.API_BASE_URL || 'http://localhost:5000/api'}/demandes/${selectedDemande.id}/pieces-jointes/${pj.id}/download`;
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) continue;
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);

        if (pj.type_mime === 'application/pdf') {
          const printWindow = window.open(blobUrl, '_blank');
          if (printWindow) {
            printWindow.onload = () => {
              printWindow.focus();
              printWindow.print();
            };
          }
        } else {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`
              <html>
                <head><title>${pj.nom_original}</title></head>
                <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;">
                  <img src="${blobUrl}" style="max-width:100%;max-height:100vh;object-fit:contain;" onload="setTimeout(()=>{window.print();},500);" />
                </body>
              </html>
            `);
            printWindow.document.close();
          }
        }
      } catch {
        showToast(isRtl ? 'خطأ في تحميل وثيقة' : 'Erreur chargement document', 'error');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 font-['Inter',_system-ui,_sans-serif]">
      {/* Header */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-[13px] font-medium text-[#16a34a] hover:text-[#15803d] transition-colors mb-5 bg-transparent border-none cursor-pointer"
      >
        <span aria-hidden>←</span>
        {isRtl ? 'العودة إلى اللوحة' : 'Retour au tableau de bord'}
      </button>
      <p className="font-mono text-[13px] font-bold text-[#1e3a5f] mb-1">{selectedDemande.numero_dossier}</p>
      <h1 className="text-[28px] font-extrabold text-[#0f172a] mb-6 leading-tight">
        {isRtl ? 'متابعة الطلب' : 'Suivi de la demande'}
      </h1>

      {/* Licence badge inline */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {selectedDemande.licence_type && (
          <LicenceBadge licenceType={selectedDemande.licence_type} lang={lang} />
        )}
        <span
          className="rounded-full px-3 py-1 text-xs font-bold"
          style={{
            color: STATUS_CONFIG[selectedDemande.statut]?.color || '#2563eb',
            background: STATUS_CONFIG[selectedDemande.statut]?.bg || '#dbeafe',
            border: `1px solid ${STATUS_CONFIG[selectedDemande.statut]?.border || '#93c5fd'}`
          }}
        >
          {STATUS_CONFIG[selectedDemande.statut]?.icon || 'ℹ️'}{' '}
          {isRtl
            ? STATUS_CONFIG[selectedDemande.statut]?.label_ar || selectedDemande.statut
            : STATUS_CONFIG[selectedDemande.statut]?.label_fr || selectedDemande.statut}
        </span>
      </div>

      {/* Données complémentaires extra_data */}
      {selectedDemande.extra_data && (
        <div className="mb-4">
          <ExtraDataPanel extraData={selectedDemande.extra_data} lang={lang} />
        </div>
      )}

      <WorkflowTimeline demandeId={selectedDemande.id} demande={selectedDemande} lang={lang} />

      {/* Pièces jointes du dossier */}
      <div className="mt-6">
        <PiecesJointesPanel
          demandeId={selectedDemande.id}
          pieces={piecesJointes}
          loading={pjLoading}
          uploading={pjUploading}
          onUpload={onUploadPj}
          onDelete={onDeletePj}
          canDelete={isAgentRole}
          isRtl={isRtl}
          onPrintAll={isAgentRole ? handlePrintAll : undefined}
        />
      </div>
    </div>
  );
}
