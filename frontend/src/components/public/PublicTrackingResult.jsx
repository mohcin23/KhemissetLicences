import React from 'react';
import { STATUS_CONFIG } from '../../utils/workflowStatusConfig';

const publicTrackDate = (date, lang) => {
  if (!date) return '-';
  return new Date(date).toLocaleString(lang === 'ar' ? 'ar-MA' : 'fr-FR');
};

const normalizePublicStatus = (statut) => ({
  accepte_definitif: 'accepte',
  refuse_gouverneur: 'refuse',
  fichier_rejete: 'documents_rejetes',
  approuve: 'accepte',
  rejete: 'refuse'
}[statut] || statut);

function PublicTrackingResult({ result, lang }) {
  if (!result) return null;

  const statusKey = normalizePublicStatus(result.statut);
  const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.en_cours_analyse;
  const isAccepted = ['accepte', 'accepte_definitif', 'approuve'].includes(result.statut);
  const isRefused = ['refuse', 'refuse_gouverneur', 'rejete', 'documents_rejetes', 'fichier_rejete'].includes(result.statut);
  const history = result.workflow_history || [];

  return (
    <div className="rounded-[16px] border border-[#e2e8f0] bg-white p-6 shadow-sm" style={{ marginTop: 16, fontFamily: "'Inter', 'Poppins', system-ui, sans-serif" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <span className="font-mono text-[13px] font-bold text-[#1e3a5f]">{result.numero_dossier}</span>
        <span
          className="rounded-full px-3 py-1 text-xs font-bold"
          style={{ color: statusConfig.color, background: statusConfig.bg, border: `1px solid ${statusConfig.border}` }}
        >
          {lang === 'ar' ? statusConfig.label_ar : statusConfig.label_fr}
        </span>
      </div>

      <h2 className="text-base font-semibold text-[#0f172a] mb-3">
        {lang === 'ar' ? 'الاسم:' : 'Prénom:'} {result.nom_complet || '-'}
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-[#f8fafc] p-3">
          <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide">{lang === 'ar' ? 'تاريخ الإيداع' : 'Date de dépôt'}</p>
          <p className="text-sm font-medium text-[#0f172a] mt-0.5">{publicTrackDate(result.date_creation, lang)}</p>
        </div>
        <div className="rounded-lg bg-[#f8fafc] p-3">
          <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide">{lang === 'ar' ? 'آخر تحديث' : 'Dernière mise à jour'}</p>
          <p className="text-sm font-medium text-[#0f172a] mt-0.5">{publicTrackDate(result.date_modification, lang)}</p>
        </div>
      </div>

      {isRefused && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-900 mb-4">
          <strong>{lang === 'ar' ? 'سبب الرفض:' : 'Motif du refus :'}</strong> {result.motif_rejet_fichier || (lang === 'ar' ? 'غير محدد' : 'Non précisé')}
        </div>
      )}

      {isAccepted && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 mb-4">
          {lang === 'ar'
            ? "رخصتك مقبولة، تفضل للعمالة لاستلامها"
            : "Votre licence est approuvée — Présentez-vous à l'Amalat pour la récupérer"}
        </div>
      )}

      <div className="rounded-[16px] border border-[#e2e8f0] bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-[#0f172a] mb-3">
          {lang === 'ar' ? 'سجل الإجراءات' : 'Historique des actions'}
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-[#64748b] text-center py-3">
            {lang === 'ar' ? 'لا توجد مراحل مسجلة بعد' : 'Aucun événement de suivi pour le moment'}
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((event, index) => {
              const eventStatusKey = normalizePublicStatus(event.nouveau_statut || event.statut);
              const eventConfig = STATUS_CONFIG[eventStatusKey] || STATUS_CONFIG.en_cours_analyse;
              return (
                <div key={`${event.date_action || index}_${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-[#f8fafc] p-3">
                  <span className="text-sm font-semibold text-[#0f172a]">
                    {lang === 'ar' ? eventConfig.label_ar : eventConfig.label_fr}
                  </span>
                  <span className="text-xs text-[#64748b] whitespace-nowrap">
                    {publicTrackDate(event.date_action, lang)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicTrackingResult;
