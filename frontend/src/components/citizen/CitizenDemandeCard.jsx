import React from 'react';
import { STATUS_CONFIG } from '../../utils/workflowStatusConfig';
import { LICENCE_VIEW_META } from '../../constants/licenceConfig';
import { t } from '../../i18n/translations';

const TOP_BORDER_CLASS = {
  en_cours_analyse: 'border-t-blue-500',
  avis_favorable: 'border-t-teal-500',
  decision_imprimee: 'border-t-teal-500',
  accepte: 'border-t-[#10B981]',
  refuse: 'border-t-red-500',
  documents_rejetes: 'border-t-amber-500',
  fichier_rejete: 'border-t-amber-500',
};

const BADGE_STYLES = {
  en_cours_analyse: { bg: 'bg-blue-50', color: 'text-blue-600' },
  avis_favorable: { bg: 'bg-teal-50', color: 'text-teal-700' },
  decision_imprimee: { bg: 'bg-teal-50', color: 'text-teal-700' },
  accepte: { bg: 'bg-emerald-50', color: 'text-emerald-600' },
  refuse: { bg: 'bg-red-50', color: 'text-red-600' },
  documents_rejetes: { bg: 'bg-amber-50', color: 'text-amber-600' },
  fichier_rejete: { bg: 'bg-amber-50', color: 'text-amber-600' },
};

function CitizenDemandeCard({ demande, onTrack, onCorrect, onNewRequest, lang }) {
  const sc = STATUS_CONFIG[demande.statut] || STATUS_CONFIG.en_cours_analyse;
  const action = (demande.statut === 'fichier_rejete' || demande.statut === 'documents_rejetes') ? onCorrect : onTrack;
  const borderClass = TOP_BORDER_CLASS[demande.statut] || 'border-t-slate-700';
  const badgeStyle = BADGE_STYLES[demande.statut] || { bg: 'bg-slate-100', color: 'text-slate-700' };

  const licenceMeta = LICENCE_VIEW_META[demande.licence_type];
  const licenceLabel = licenceMeta ? (lang === 'ar' ? licenceMeta.title_ar : licenceMeta.title_fr) : demande.licence_type || '—';

  const getBtnStyle = () => {
    if (demande.statut === 'accepte') return 'bg-[#10B981] hover:bg-[#059669] text-white';
    if (['avis_favorable', 'decision_imprimee'].includes(demande.statut)) return 'bg-[#0F6E56] hover:bg-[#0A5240] text-white';
    return 'bg-[#1E293B] hover:bg-slate-800 text-white';
  };

  const btnLabel = () => {
    if (demande.statut === 'documents_rejetes' || demande.statut === 'fichier_rejete')
      return t(lang, 'authGatewayCorrectBtn');
    if (demande.statut === 'refuse')
      return lang === 'ar' ? 'طلب جديد' : 'Soumettre une nouvelle demande';
    return 'Suivi de la demande';
  };

  const handleCardClick = () => {
    if (demande.statut === 'refuse') onNewRequest();
    else action();
  };

  const handleBtnClick = (e) => {
    e.stopPropagation();
    if (demande.statut === 'refuse') onNewRequest();
    else action();
  };

  return (
    <article
      className={`bg-white dark:bg-slate-800 rounded-2xl border-t-4 ${borderClass} border-x border-b border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group`}
      onClick={handleCardClick}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-md">
            {demande.numero_dossier}
          </span>
          <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${badgeStyle.bg} ${badgeStyle.color}`}>
            {lang === 'ar' ? sc.label_ar : sc.label_fr}
          </span>
        </div>
        <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-6">{demande.nom_complet}</h4>
        <div className="space-y-4 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-slate-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            <span>{licenceLabel}</span>
          </div>
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-slate-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span>{demande.adresse_complete || demande.commune}</span>
          </div>
          {demande.statut === 'accepte' && (
            <div className="flex items-center gap-2 text-sm font-semibold text-[#10B981] mt-1">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
              <span>{lang === 'ar' ? 'القرار جاهز — التوجه إلى العمالة لاستلامه' : 'Décision prête — Récupérez-la à la province'}</span>
            </div>
          )}
        </div>
      </div>
      <div className="p-5 pt-0">
        <button className={`w-full font-semibold text-sm py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all ${getBtnStyle()}`} onClick={handleBtnClick}>
          <span>{btnLabel()}</span>
          <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </button>
      </div>
    </article>
  );
}

export default CitizenDemandeCard;
