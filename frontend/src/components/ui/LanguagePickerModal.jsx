import React from 'react';
import { FileText, X } from 'lucide-react';

/**
 * Modal de choix de langue pour l'impression / téléchargement de la décision.
 * Props:
 *   open      {boolean}          - afficher ou non le modal
 *   onClose   {() => void}       - fermer sans choisir
 *   onSelect  {(lang) => void}   - appelé avec 'fr' ou 'ar'
 *   isRtl     {boolean}          - interface en arabe ?
 */
export default function LanguagePickerModal({ open, onClose, onSelect, isRtl = false }) {
  if (!open) return null;

  const title   = isRtl ? 'اختر لغة القرار'             : 'Choisir la langue de la décision';
  const subtitle= isRtl ? 'حدد اللغة التي تريد طباعة أو تنزيل القرار بها' : 'Sélectionnez la langue dans laquelle imprimer ou télécharger la décision';
  const cancelLbl = isRtl ? 'إلغاء' : 'Annuler';

  const options = [
    {
      lang: 'fr',
      flag: '🇫🇷',
      label: 'Français',
      sublabel: isRtl ? 'نسخة فرنسية' : 'Version française',
      gradient: 'from-blue-600 to-blue-800',
      border: 'border-blue-200 hover:border-blue-400 dark:border-blue-700 dark:hover:border-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-950',
      textColor: 'text-blue-700 dark:text-blue-300',
    },
    {
      lang: 'ar',
      flag: '🇲🇦',
      label: 'العربية',
      sublabel: isRtl ? 'نسخة عربية' : 'Version arabe',
      gradient: 'from-green-600 to-emerald-800',
      border: 'border-green-200 hover:border-green-400 dark:border-green-700 dark:hover:border-green-400',
      iconBg: 'bg-green-50 dark:bg-green-950',
      textColor: 'text-green-700 dark:text-green-300',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lang-picker-title"
        className="relative z-[601] w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950">
              <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 id="lang-picker-title" className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {title}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            onClick={onClose}
            aria-label={cancelLbl}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Language options */}
        <div className="flex flex-col gap-3 p-5">
          {options.map((opt) => (
            <button
              key={opt.lang}
              type="button"
              onClick={() => onSelect(opt.lang)}
              className={`flex items-center gap-4 rounded-xl border-2 ${opt.border} bg-white p-4 text-left transition-all hover:shadow-md active:scale-[0.98] dark:bg-slate-800`}
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${opt.iconBg} text-2xl shadow-inner`}>
                {opt.flag}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${opt.textColor}`}>{opt.label}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{opt.sublabel}</p>
              </div>
              <div className={`h-2 w-2 rounded-full bg-gradient-to-br ${opt.gradient} opacity-60`} aria-hidden />
            </button>
          ))}
        </div>

        {/* Cancel */}
        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            {cancelLbl}
          </button>
        </div>
      </div>
    </div>
  );
}
