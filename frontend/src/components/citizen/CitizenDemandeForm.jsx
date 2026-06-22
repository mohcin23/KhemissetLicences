import React from 'react';
import { t } from '../../i18n/translations';
import { filterByLang } from '../../utils/languageFilter';

function CitizenDemandeForm({ form, setForm, onSubmit, loading, submitLabel, lang }) {
  const isAr = lang === 'ar';

  const updFiltered = (storeKey, targetLang) => (e) => {
    const filtered = filterByLang(e.target.value, targetLang);
    setForm(prev => ({ ...prev, [storeKey]: filtered }));
  };

  const inputCls = "w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const inputArCls = `${inputCls} text-right`;

  const labelCls = "text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider";

  const arabicPair = (fieldName, labelAr, labelFr, type = 'text') => {
    const arVal = form[`${fieldName}_ar`] || '';
    const frVal = form[fieldName] || '';
    const arLabel = isAr ? labelAr : `${labelFr} (arabe)`;
    const frLabel = isAr ? `${labelAr} (فرنسية)` : labelFr;
    return (
      <>
        <label className={labelCls}>{arLabel}</label>
        {type === 'textarea' ? (
          <textarea className={`${inputArCls} resize-none`} dir="rtl" value={arVal} onChange={updFiltered(`${fieldName}_ar`, 'ar')} rows={3} />
        ) : (
          <input className={inputArCls} type={type} dir="rtl" value={arVal} onChange={updFiltered(`${fieldName}_ar`, 'ar')} />
        )}
        <label className={labelCls}>{frLabel}</label>
        {type === 'textarea' ? (
          <textarea className={`${inputCls} resize-none`} dir="ltr" value={frVal} onChange={updFiltered(fieldName, 'fr')} rows={3} />
        ) : (
          <input className={inputCls} type={type} dir="ltr" value={frVal} onChange={updFiltered(fieldName, 'fr')} />
        )}
      </>
    );
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <fieldset className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl grid gap-3.5 grid-cols-2 p-6 shadow-sm">
        <legend className="text-sm font-extrabold text-slate-800 dark:text-white px-3">{t(lang, 'pharmacistInfo')}</legend>
        {arabicPair('nom_complet', t('ar', 'fullName'), t('fr', 'fullName'))}
        <label className={labelCls}>CIN *</label>
        <input className={inputCls} value={form.cin} onChange={e => setForm(prev => ({ ...prev, cin: e.target.value.toUpperCase() }))} required />
        <label className={labelCls}>{isAr ? t('ar', 'birthDate') : t('fr', 'birthDate')}</label>
        <input className={inputCls} type="date" value={form.date_naissance} onChange={(e) => setForm(prev => ({ ...prev, date_naissance: e.target.value }))} />
        {arabicPair('universite', t('ar', 'universite'), t('fr', 'universite'))}
        {arabicPair('diplome', t('ar', 'diplome'), t('fr', 'diplome'))}
      </fieldset>
      <fieldset className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl grid gap-3.5 grid-cols-2 p-6 shadow-sm">
        <legend className="text-sm font-extrabold text-slate-800 dark:text-white px-3">{t(lang, 'pharmacyInfo')}</legend>
        <label className={`${labelCls} col-span-full`}>{isAr ? t('ar', 'adressePharmacie') : `${t('fr', 'adressePharmacie')} (arabe)`} *</label>
        <textarea
          className={`${inputArCls} col-span-full resize-none`}
          dir="rtl"
          value={form.adresse_complete_ar || ''}
          onChange={updFiltered('adresse_complete_ar', 'ar')}
          rows={3}
          required
        />
        <label className={`${labelCls} col-span-full`}>{isAr ? `${t('ar', 'adressePharmacie')} (فرنسية)` : t('fr', 'adressePharmacie')}</label>
        <textarea
          className={`${inputCls} col-span-full resize-none`}
          dir="ltr"
          value={form.adresse_complete || ''}
          onChange={updFiltered('adresse_complete', 'fr')}
          rows={3}
        />
        <label className={labelCls}>{isAr ? t('ar', 'formDateDepot') : t('fr', 'formDateDepot')}</label>
        <input className={inputCls} type="date" value={form.date_demande} onChange={(e) => setForm(prev => ({ ...prev, date_demande: e.target.value }))} />
        <label className={labelCls}>{isAr ? t('ar', 'formNumPermis') : t('fr', 'formNumPermis')}</label>
        <input className={inputCls} value={form.numero_izin} onChange={(e) => setForm(prev => ({ ...prev, numero_izin: e.target.value }))} />
        <label className={labelCls}>{isAr ? t('ar', 'formDatePermis') : t('fr', 'formDatePermis')}</label>
        <input className={inputCls} type="date" value={form.date_izin} onChange={(e) => setForm(prev => ({ ...prev, date_izin: e.target.value }))} />
      </fieldset>
      <fieldset className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl grid gap-3.5 grid-cols-2 p-6 shadow-sm">
        <legend className="text-sm font-extrabold text-slate-800 dark:text-white px-3">{t(lang, 'formSection03Title')}</legend>
        {arabicPair('commune', t('ar', 'commune'), t('fr', 'commune'))}
        {arabicPair('cercle', t('ar', 'cercle'), t('fr', 'cercle'))}
        {arabicPair('nom_massah', t('ar', 'formGeometre'), t('fr', 'formGeometre'))}
        <label className={labelCls}>{isAr ? t('ar', 'formDateCertificat') : t('fr', 'formDateCertificat')}</label>
        <input className={inputCls} type="date" value={form.date_massah} onChange={(e) => setForm(prev => ({ ...prev, date_massah: e.target.value }))} />
        <label className={labelCls}>{isAr ? t('ar', 'formDateCommission') : t('fr', 'formDateCommission')}</label>
        <input className={inputCls} type="date" value={form.date_lajna} onChange={(e) => setForm(prev => ({ ...prev, date_lajna: e.target.value }))} />
      </fieldset>
      <div className="flex justify-end">
        <button className="inline-flex items-center justify-center gap-2 min-h-[44px] bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-sm font-bold px-6 border-none cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none" type="submit" disabled={loading}>
          {loading ? t(lang, 'authGatewayRegisterLoading') : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default CitizenDemandeForm;
