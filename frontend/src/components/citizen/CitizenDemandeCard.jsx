import React, { useState } from 'react';
import { STATUS_CONFIG } from '../../utils/workflowStatusConfig';
import { LICENCE_VIEW_META } from '../../constants/licenceConfig';
import { t } from '../../i18n/translations';
import { Building2, MapPin, FileText, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

const STATUTS_ANNULABLES = new Set([
  'en_cours_analyse',
  'documents_rejetes',
  'documents_corriges',
  'avis_favorable'
]);

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
  en_cours_analyse: { bg: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-600 dark:text-blue-400' },
  avis_favorable: { bg: 'bg-teal-50 dark:bg-teal-900/20', color: 'text-teal-700 dark:text-teal-400' },
  decision_imprimee: { bg: 'bg-teal-50 dark:bg-teal-900/20', color: 'text-teal-700 dark:text-teal-400' },
  accepte: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-600 dark:text-emerald-400' },
  refuse: { bg: 'bg-red-50 dark:bg-red-900/20', color: 'text-red-600 dark:text-red-400' },
  documents_rejetes: { bg: 'bg-amber-50 dark:bg-amber-900/20', color: 'text-amber-600 dark:text-amber-400' },
  fichier_rejete: { bg: 'bg-amber-50 dark:bg-amber-900/20', color: 'text-amber-600 dark:text-amber-400' },
};

function CitizenDemandeCard({ demande, onTrack, onCorrect, onNewRequest, onCancel, lang }) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const sc = STATUS_CONFIG[demande.statut] || STATUS_CONFIG.en_cours_analyse;
  const action = (demande.statut === 'fichier_rejete' || demande.statut === 'documents_rejetes') ? onCorrect : onTrack;
  const borderClass = TOP_BORDER_CLASS[demande.statut] || 'border-t-slate-700';
  const badgeStyle = BADGE_STYLES[demande.statut] || { bg: 'bg-slate-100 dark:bg-slate-700', color: 'text-slate-700 dark:text-slate-300' };
  const canCancel = STATUTS_ANNULABLES.has(demande.statut) && onCancel;

  const licenceMeta = LICENCE_VIEW_META[demande.licence_type];
  const licenceLabel = licenceMeta ? (lang === 'ar' ? licenceMeta.title_ar : licenceMeta.title_fr) : demande.licence_type || '—';

  const getBtnStyle = () => {
    if (demande.statut === 'accepte') return 'bg-[#10B981] hover:bg-[#059669] text-white shadow-md hover:shadow-lg';
    if (['avis_favorable', 'decision_imprimee'].includes(demande.statut)) return 'bg-[#0F6E56] hover:bg-[#0A5240] text-white shadow-md hover:shadow-lg';
    return 'bg-[#0F172A] dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white';
  };

  const btnLabel = () => {
    if (demande.statut === 'documents_rejetes' || demande.statut === 'fichier_rejete')
      return t(lang, 'authGatewayCorrectBtn');
    if (demande.statut === 'refuse')
      return t(lang, 'authGatewayNewRequestBtn');
    return t(lang, 'trackTitle');
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
      className={`bg-white dark:bg-slate-800 rounded-2xl border-t-4 ${borderClass} border-x border-b border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden group cursor-pointer`}
      onClick={handleCardClick}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg">
            {demande.numero_dossier}
          </span>
          <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${badgeStyle.bg} ${badgeStyle.color}`}>
            {lang === 'ar' ? sc.label_ar : sc.label_fr}
          </span>
        </div>
        <h4 className="text-base font-bold text-slate-800 dark:text-white mb-4 group-hover:text-[#10B981] dark:group-hover:text-[#10B981] transition-colors">{demande.nom_complet}</h4>
        <div className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="truncate">{licenceLabel}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="truncate">{demande.adresse_complete || demande.commune}</span>
          </div>
          {demande.statut === 'accepte' && (
            <div className="flex items-center gap-2 text-sm font-semibold text-[#10B981] mt-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{lang === 'ar' ? 'القرار جاهز — التوجه إلى العمالة لاستلامه' : 'Décision prête — Récupérez-la à la province'}</span>
            </div>
          )}
        </div>
      </div>
      <div className="p-4 pt-0 space-y-2">
        <button className={`w-full font-semibold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${getBtnStyle()}`} onClick={handleBtnClick}>
          <span>{btnLabel()}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        {canCancel && (
          <>
            <button
              type="button"
              className="w-full font-semibold text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 bg-transparent border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={(e) => { e.stopPropagation(); setShowCancelConfirm(true); }}
            >
              <AlertTriangle className="w-4 h-4" />
              {t(lang, 'cancelRequest')}
            </button>
            {showCancelConfirm && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-white">{t(lang, 'cancelRequest')}</h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{t(lang, 'cancelRequestConfirm')}</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      onClick={() => setShowCancelConfirm(false)}
                    >
                      {t(lang, 'cancel')}
                    </button>
                    <button
                      type="button"
                      disabled={cancelLoading}
                      className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                      onClick={async () => {
                        setCancelLoading(true);
                        try {
                          await onCancel(demande.id);
                          setShowCancelConfirm(false);
                        } catch {
                          // error handled by parent
                        } finally {
                          setCancelLoading(false);
                        }
                      }}
                    >
                      {cancelLoading ? '...' : t(lang, 'cancelRequestConfirmBtn')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
}

export default CitizenDemandeCard;
