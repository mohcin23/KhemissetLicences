import React from 'react';
import { LICENCE_VIEW_META, getLicenceDocs } from '../../constants/licenceConfig';
import { ArrowLeft, FileCheck2, FileText, Keyboard, Sparkles } from 'lucide-react';

function CitizenLicenceWorkbench({ licenceType, mode, onModeChange, onBack, lang }) {
  const meta = LICENCE_VIEW_META[licenceType] || LICENCE_VIEW_META.pharmacie;
  const docs = getLicenceDocs(licenceType);
  const title = lang === 'ar' ? meta.title_ar : meta.title_fr;
  const description = lang === 'ar' ? meta.description_ar : meta.description_fr;
  const ocrDocsCount = docs.filter(doc => doc.ocr).length;

  return (
    <section className="animate-fade-in-up">
      {/* ── CARD PERMIS SÉLECTIONNÉ ── */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 rounded-2xl p-5 mb-6 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <FileCheck2 className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="inline-block bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-full px-3 py-1 mb-1.5">
            {lang === 'ar' ? 'الرخصة المختارة' : 'Permis sélectionné'}
          </span>
          <h2 className="text-base font-extrabold text-slate-900 m-0 leading-tight">{title}</h2>
          <p className="text-[13px] text-slate-500 mt-0.5 m-0">{description}</p>
        </div>
        <button
          type="button"
          className="bg-white border border-slate-200 text-slate-600 rounded-xl px-4 py-2.5 cursor-pointer text-[13px] font-bold inline-flex items-center gap-2 whitespace-nowrap transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 hover:text-emerald-600 shrink-0 shadow-sm"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          {lang === 'ar' ? 'تغيير نوع الرخصة' : 'Changer'}
        </button>
      </div>

      {/* ── SECTION CHOISIR LA MÉTHODE ── */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
          {lang === 'ar' ? 'اختر طريقة الإيداع' : 'Mode de dépôt'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            className={`
              relative bg-white border-2 rounded-2xl p-5 cursor-pointer font-inherit text-left
              transition-all duration-300 flex flex-col gap-3 group
              ${mode === 'ocr'
                ? 'border-emerald-500 bg-emerald-50/50 shadow-lg shadow-emerald-100 ring-4 ring-emerald-500/10'
                : 'border-slate-200 hover:border-emerald-300 hover:shadow-md'
              }
            `}
            onClick={() => onModeChange('ocr')}
          >
            {mode === 'ocr' && (
              <div className="absolute top-3 right-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              </div>
            )}
            <span className={`
              w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300
              ${mode === 'ocr' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-500'}
            `}>
              <Sparkles className="w-5 h-5" />
            </span>
            <div className="flex items-center gap-2 m-0">
              <strong className={`text-[15px] font-bold ${mode === 'ocr' ? 'text-slate-900' : 'text-slate-700'}`}>
                {lang === 'ar' ? 'إيداع ذكي' : 'Dépôt intelligent'}
              </strong>
              <span className="bg-emerald-500 text-white text-[10px] font-bold rounded-full px-2.5 py-0.5 whitespace-nowrap leading-tight">
                {lang === 'ar' ? 'موصى به' : 'Recommandé'}
              </span>
            </div>
            <p className="text-[13px] text-slate-500 m-0 leading-relaxed">
              {lang === 'ar'
                ? 'ارفع الوثائق أولا، والنظام يقترح ملء الاستمارة.'
                : "Vous importez les pièces, l'OCR propose les champs à vérifier."}
            </p>
          </button>

          <button
            type="button"
            className={`
              relative bg-white border-2 rounded-2xl p-5 cursor-pointer font-inherit text-left
              transition-all duration-300 flex flex-col gap-3 group
              ${mode === 'manual'
                ? 'border-emerald-500 bg-emerald-50/50 shadow-lg shadow-emerald-100 ring-4 ring-emerald-500/10'
                : 'border-slate-200 hover:border-emerald-300 hover:shadow-md'
              }
            `}
            onClick={() => onModeChange('manual')}
          >
            {mode === 'manual' && (
              <div className="absolute top-3 right-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              </div>
            )}
            <span className={`
              w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300
              ${mode === 'manual' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-500'}
            `}>
              <Keyboard className="w-5 h-5" />
            </span>
            <div className="flex items-center gap-2 m-0">
              <strong className={`text-[15px] font-bold ${mode === 'manual' ? 'text-slate-900' : 'text-slate-700'}`}>
                {lang === 'ar' ? 'إيداع يدوي' : 'Saisie manuelle'}
              </strong>
            </div>
            <p className="text-[13px] text-slate-500 m-0 leading-relaxed">
              {lang === 'ar'
                ? 'املأ المعلومات بنفسك، ثم أرفق الوثائق في النهاية.'
                : 'Vous remplissez le formulaire, puis vous joignez les documents.'}
            </p>
          </button>
        </div>
      </div>

      {/* ── SECTION DOCUMENTS REQUIS ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-[15px] font-bold text-slate-800 m-0">
              {lang === 'ar' ? 'الوثائق المطلوبة' : 'Documents requis'}
            </h3>
          </div>
          <span className="bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-full px-3 py-1 whitespace-nowrap">
            {docs.length} {lang === 'ar' ? 'وثائق' : 'pièces'}
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {docs.map(doc => (
            <span key={doc.key} className="inline-flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-full px-4 py-2 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 hover:bg-slate-100 transition-colors">
              {lang === 'ar' ? doc.label_ar : doc.label_fr}
              {doc.ocr && (
                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full px-2 py-0.5 leading-tight">
                  OCR
                </span>
              )}
            </span>
          ))}
        </div>
        {ocrDocsCount > 0 && (
          <div className="mt-3 flex items-center gap-2 text-[13px] text-slate-500">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>
              {lang === 'ar'
                ? `${ocrDocsCount} وثائق يمكن للنظام قراءة بياناتها تلقائيا.`
                : `${ocrDocsCount} documents peuvent préremplir automatiquement la demande.`}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

export default CitizenLicenceWorkbench;
