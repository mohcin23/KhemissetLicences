import React, { useState } from 'react';
import LicenceBadge from '../../components/licences/LicenceBadge';
import WorkflowTimeline from '../../components/workflow/WorkflowTimeline';
import PiecesJointesPanel from '../../components/demandes/PiecesJointesPanel';
import GovernorDecisionModal from '../../components/workflow/GovernorDecisionModal';
import LanguagePickerModal from '../../components/ui/LanguagePickerModal';
import { demandesAPI, pdfAPI } from '../../services/api';
import { STATUS_CONFIG } from '../../utils/workflowStatusConfig';
import { DECISION_PDF_STATUSES } from '../../utils/appConstants';
import { FileText, Printer, CheckCircle2, Save } from 'lucide-react';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('auth_token')}`
});

const EXTRA_DATA_FIELDS = [
  { key: 'nom_complet_ar', label_fr: 'Nom complet (AR)', label_ar: 'الاسم الكامل بالعربية' },
  { key: 'universite_ar', label_fr: 'Université (AR)', label_ar: 'الجامعة بالعربية' },
  { key: 'diplome_ar', label_fr: 'Diplôme (AR)', label_ar: 'الشهادة بالعربية' },
  { key: 'adresse_complete_ar', label_fr: 'Adresse (AR)', label_ar: 'العنوان بالعربية' },
  { key: 'commune_ar', label_fr: 'Commune (AR)', label_ar: 'الجماعة بالعربية' },
  { key: 'cercle_ar', label_fr: 'Cercle (AR)', label_ar: 'الدائرة بالعربية' },
  { key: 'nom_massah_ar', label_fr: 'Nom massah (AR)', label_ar: 'اسم المحلف بالعربية' },
];

export default function TrackPage({
  lang, isRtl, selectedDemande, piecesJointes, pjLoading, pjUploading,
  isAgentRole, onBack, onUploadPj, onDeletePj, showToast, onDemandeUpdated
}) {
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [langPickerAction, setLangPickerAction] = useState('print');
  const [showGovernorModal, setShowGovernorModal] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const canPrintDecision = isAgentRole && DECISION_PDF_STATUSES.has(selectedDemande?.statut);
  const canRecordGovernorDecision = isAgentRole && selectedDemande?.statut === 'decision_imprimee';
  const isEditing = editForm !== null;

  const startEditing = () => {
    let extraData = {};
    try {
      extraData = selectedDemande.extra_data && typeof selectedDemande.extra_data === 'string'
        ? JSON.parse(selectedDemande.extra_data)
        : selectedDemande.extra_data || {};
    } catch {}
    setEditForm({
      nom_complet: selectedDemande.nom_complet || '',
      cin: selectedDemande.cin || '',
      date_naissance: selectedDemande.date_naissance || '',
      universite: selectedDemande.universite || '',
      diplome: selectedDemande.diplome || '',
      adresse_complete: selectedDemande.adresse_complete || '',
      commune: selectedDemande.commune || '',
      cercle: selectedDemande.cercle || '',
      date_demande: selectedDemande.date_demande || '',
      date_izin: selectedDemande.date_izin || '',
      numero_izin: selectedDemande.numero_izin || '',
      nom_massah: selectedDemande.nom_massah || '',
      date_massah: selectedDemande.date_massah || '',
      date_lajna: selectedDemande.date_lajna || '',
      ...EXTRA_DATA_FIELDS.reduce((acc, f) => { acc[f.key] = extraData[f.key] || ''; return acc; }, {}),
    });
  };

  const cancelEditing = () => setEditForm(null);

  const handleFieldChange = (key, value) => {
    setEditForm(prev => ({ ...prev, [key]: value }));
  };

  const saveForm = async () => {
    if (!editForm) return;
    setSaving(true);
    try {
      await demandesAPI.update(selectedDemande.id, editForm);
      const updated = { ...selectedDemande, ...editForm };
      onDemandeUpdated?.(updated);
      setEditForm(null);
      showToast(isRtl ? 'تم تحديث البيانات بنجاح' : 'Données mises à jour avec succès');
    } catch (err) {
      showToast(err.response?.data?.message || (isRtl ? 'خطأ في التحديث' : 'Erreur de mise à jour'), 'error');
    }
    setSaving(false);
  };

  const handlePrintDecision = (pdfLang) => {
    setShowLangPicker(false);
    setPdfLoading(true);
    pdfAPI.getDecisionForView(selectedDemande.id, pdfLang)
      .then((res) => {
        const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
        } else {
          showToast(isRtl ? 'يرجى السماح بالنوافذ المنبثقة' : 'Veuillez autoriser les popups', 'error');
        }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      })
      .catch(() => showToast(isRtl ? 'خطأ في توليد القرار' : 'Erreur lors de la génération du PDF', 'error'))
      .finally(() => setPdfLoading(false));
  };

  const handleDownloadDecision = (pdfLang) => {
    setShowLangPicker(false);
    setPdfLoading(true);
    pdfAPI.downloadDecision(selectedDemande.id, selectedDemande.numero_dossier, pdfLang)
      .catch(() => showToast(isRtl ? 'خطأ في توليد القرار' : 'Erreur lors de la génération du PDF', 'error'))
      .finally(() => setPdfLoading(false));
  };

  const handleGovernorDecision = async ({ decision, motif }) => {
    try {
      if (decision === 'accepte') {
        await demandesAPI.accepterDefinitif(selectedDemande.id, { commentaire: motif || null });
      } else {
        await demandesAPI.refuserGouverneur(selectedDemande.id, { notes: motif });
      }
      const updated = { ...selectedDemande, statut: decision === 'accepte' ? 'accepte' : 'refuse', notes: motif || null };
      onDemandeUpdated?.(updated);
      setShowGovernorModal(false);
      showToast(isRtl ? 'تم تسجيل قرار المحافظ' : 'Décision du Gouverneur enregistrée');
    } catch (err) {
      showToast(err.response?.data?.message || (isRtl ? 'خطأ' : 'Erreur'), 'error');
    }
  };

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
          if (printWindow) { printWindow.onload = () => { printWindow.focus(); printWindow.print(); }; }
        } else {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`<html><head><title>${pj.nom_original}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;"><img src="${blobUrl}" style="max-width:100%;max-height:100vh;object-fit:contain;" onload="setTimeout(()=>{window.print();},500);" /></body></html>`);
            printWindow.document.close();
          }
        }
      } catch {
        showToast(isRtl ? 'خطأ في تحميل وثيقة' : 'Erreur chargement document', 'error');
      }
    }
  };

  const InputField = ({ label, value, fieldKey, type = 'text' }) => (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 font-['Inter',_system-ui,_sans-serif]">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-[13px] font-medium text-[#16a34a] hover:text-[#15803d] transition-colors mb-5 bg-transparent border-none cursor-pointer">
        <span aria-hidden>←</span>
        {isRtl ? 'العودة إلى اللوحة' : 'Retour au tableau de bord'}
      </button>
      <p className="font-mono text-[13px] font-bold text-[#1e3a5f] mb-1">{selectedDemande.numero_dossier}</p>
      <h1 className="text-[28px] font-extrabold text-[#0f172a] mb-6 leading-tight">
        {isRtl ? 'متابعة الطلب' : 'Suivi de la demande'}
      </h1>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        {selectedDemande.licence_type && <LicenceBadge licenceType={selectedDemande.licence_type} lang={lang} />}
        <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ color: STATUS_CONFIG[selectedDemande.statut]?.color || '#2563eb', background: STATUS_CONFIG[selectedDemande.statut]?.bg || '#dbeafe', border: `1px solid ${STATUS_CONFIG[selectedDemande.statut]?.border || '#93c5fd'}` }}>
          {STATUS_CONFIG[selectedDemande.statut]?.icon || 'ℹ️'}{' '}
          {isRtl ? STATUS_CONFIG[selectedDemande.statut]?.label_ar || selectedDemande.statut : STATUS_CONFIG[selectedDemande.statut]?.label_fr || selectedDemande.statut}
        </span>
      </div>

      {/* Données du formulaire - Agent: editable / Citoyen: lecture seule */}
      {isAgentRole && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              {isRtl ? 'بيانات النموذج' : 'Données du formulaire'}
            </h3>
            {!isEditing ? (
              <button type="button" onClick={startEditing} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition">
                {isRtl ? 'تعديل' : 'Modifier'}
              </button>
            ) : (
              <div className="flex gap-2">
                <button type="button" onClick={cancelEditing} className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition">
                  {isRtl ? 'إلغاء' : 'Annuler'}
                </button>
                <button type="button" onClick={saveForm} disabled={saving} className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition disabled:opacity-50">
                  <Save className="h-3 w-3" />
                  {saving ? (isRtl ? 'جاري الحفظ...' : 'Enregistrement...') : (isRtl ? 'حفظ' : 'Enregistrer')}
                </button>
              </div>
            )}
          </div>
          <div className="p-5">
            {isEditing ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField label={isRtl ? 'الاسم الكامل' : 'Nom complet'} value={editForm.nom_complet} fieldKey="nom_complet" />
                <InputField label="CIN" value={editForm.cin} fieldKey="cin" />
                <InputField label={isRtl ? 'تاريخ الميلاد' : 'Date de naissance'} value={editForm.date_naissance} fieldKey="date_naissance" type="date" />
                <InputField label={isRtl ? 'الجامعة' : 'Université'} value={editForm.universite} fieldKey="universite" />
                <InputField label={isRtl ? 'الشهادة' : 'Diplôme'} value={editForm.diplome} fieldKey="diplome" />
                <InputField label={isRtl ? 'العنوان الكامل' : 'Adresse complète'} value={editForm.adresse_complete} fieldKey="adresse_complete" />
                <InputField label={isRtl ? 'الجماعة' : 'Commune'} value={editForm.commune} fieldKey="commune" />
                <InputField label={isRtl ? 'الدائرة' : 'Cercle'} value={editForm.cercle} fieldKey="cercle" />
                <InputField label={isRtl ? 'تاريخ الطلب' : 'Date de demande'} value={editForm.date_demande} fieldKey="date_demande" type="date" />
                <InputField label={isRtl ? 'تاريخ الترخيص' : "Date d'izin"} value={editForm.date_izin} fieldKey="date_izin" type="date" />
                <InputField label={isRtl ? 'رقم الترخيص' : "Numéro d'izin"} value={editForm.numero_izin} fieldKey="numero_izin" />
                <InputField label={isRtl ? 'اسم المحلف' : 'Nom massah'} value={editForm.nom_massah} fieldKey="nom_massah" />
                <InputField label={isRtl ? 'تاريخ المحلف' : 'Date massah'} value={editForm.date_massah} fieldKey="date_massah" type="date" />
                <InputField label={isRtl ? 'تاريخ اللجان' : 'Date lajna'} value={editForm.date_lajna} fieldKey="date_lajna" type="date" />
                {EXTRA_DATA_FIELDS.map(f => (
                  <InputField key={f.key} label={isRtl ? f.label_ar : f.label_fr} value={editForm[f.key]} fieldKey={f.key} />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: isRtl ? 'الاسم الكامل' : 'Nom complet', value: selectedDemande.nom_complet },
                  { label: 'CIN', value: selectedDemande.cin },
                  { label: isRtl ? 'تاريخ الميلاد' : 'Date de naissance', value: selectedDemande.date_naissance },
                  { label: isRtl ? 'الجامعة' : 'Université', value: selectedDemande.universite },
                  { label: isRtl ? 'الشهادة' : 'Diplôme', value: selectedDemande.diplome },
                  { label: isRtl ? 'العنوان الكامل' : 'Adresse complète', value: selectedDemande.adresse_complete },
                  { label: isRtl ? 'الجماعة' : 'Commune', value: selectedDemande.commune },
                  { label: isRtl ? 'الدائرة' : 'Cercle', value: selectedDemande.cercle },
                  { label: isRtl ? 'تاريخ الطلب' : 'Date de demande', value: selectedDemande.date_demande },
                  { label: isRtl ? 'تاريخ الترخيص' : "Date d'izin", value: selectedDemande.date_izin },
                  { label: isRtl ? 'رقم الترخيص' : "Numéro d'izin", value: selectedDemande.numero_izin },
                  { label: isRtl ? 'اسم المحلف' : 'Nom massah', value: selectedDemande.nom_massah },
                  { label: isRtl ? 'تاريخ المحلف' : 'Date massah', value: selectedDemande.date_massah },
                  { label: isRtl ? 'تاريخ اللجان' : 'Date lajna', value: selectedDemande.date_lajna },
                ].map((item, i) => (
                  <div key={i} className="rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{item.label}</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{item.value || '—'}</p>
                  </div>
                ))}
                {(() => {
                  let extraData = {};
                  try {
                    extraData = selectedDemande.extra_data && typeof selectedDemande.extra_data === 'string'
                      ? JSON.parse(selectedDemande.extra_data)
                      : selectedDemande.extra_data || {};
                  } catch {}
                  const hasExtra = EXTRA_DATA_FIELDS.some(f => extraData[f.key]);
                  if (!hasExtra) return null;
                  return EXTRA_DATA_FIELDS.filter(f => extraData[f.key]).map(f => (
                    <div key={f.key} className="rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{isRtl ? f.label_ar : f.label_fr}</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{extraData[f.key]}</p>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Citoyen: lecture seule (données statiques, pas modifiable) */}
      {!isAgentRole && selectedDemande.extra_data && (
        <div className="mb-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">{isRtl ? 'بيانات النموذج' : 'Données du formulaire'}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: isRtl ? 'الاسم الكامل' : 'Nom complet', value: selectedDemande.nom_complet },
                { label: 'CIN', value: selectedDemande.cin },
                { label: isRtl ? 'العنوان' : 'Adresse', value: selectedDemande.adresse_complete },
                { label: isRtl ? 'الجماعة' : 'Commune', value: selectedDemande.commune },
                { label: isRtl ? 'الدائرة' : 'Cercle', value: selectedDemande.cercle },
              ].map((item, i) => (
                <div key={i} className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
                  <p className="text-sm font-medium text-slate-900 mt-0.5">{item.value || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <WorkflowTimeline demandeId={selectedDemande.id} demande={selectedDemande} lang={lang} />

      {/* Actions agent */}
      {isAgentRole && (canPrintDecision || canRecordGovernorDecision) && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">{isRtl ? 'إجراءات الملف' : 'Actions du dossier'}</h3>
          <div className="flex flex-wrap gap-3">
            {canPrintDecision && (
              <>
                <button type="button" onClick={() => { setLangPickerAction('print'); setShowLangPicker(true); }} disabled={pdfLoading} className="inline-flex items-center gap-2 rounded-xl bg-[#10B981] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#059669] hover:shadow-lg disabled:opacity-50">
                  <Printer className="h-4 w-4" />
                  {isRtl ? 'طباعة القرار' : 'Imprimer la décision'}
                </button>
                <button type="button" onClick={() => { setLangPickerAction('download'); setShowLangPicker(true); }} disabled={pdfLoading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                  <FileText className="h-4 w-4" />
                  {isRtl ? 'تنزيل القرار' : 'Télécharger la décision'}
                </button>
              </>
            )}
            {canRecordGovernorDecision && (
              <button type="button" onClick={() => setShowGovernorModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#1d4ed8] hover:shadow-lg">
                <CheckCircle2 className="h-4 w-4" />
                {isRtl ? 'تسجيل قرار المحافظ' : 'Enregistrer décision Gouverneur'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-6">
        <PiecesJointesPanel demandeId={selectedDemande.id} pieces={piecesJointes} loading={pjLoading} uploading={pjUploading} onUpload={onUploadPj} onDelete={onDeletePj} canDelete={isAgentRole} isRtl={isRtl} onPrintAll={isAgentRole ? handlePrintAll : undefined} />
      </div>

      <LanguagePickerModal open={showLangPicker} onClose={() => setShowLangPicker(false)} onSelect={(pdfLang) => { if (langPickerAction === 'print') handlePrintDecision(pdfLang); else handleDownloadDecision(pdfLang); }} isRtl={isRtl} />
      <GovernorDecisionModal isOpen={showGovernorModal} onClose={() => setShowGovernorModal(false)} demande={selectedDemande} onDecide={handleGovernorDecision} lang={lang} isRtl={isRtl} />
    </div>
  );
}
