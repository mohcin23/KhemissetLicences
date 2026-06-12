import React, { useState, useEffect } from 'react';
import { t } from '../../i18n/translations';
import { dateInputValue } from '../../utils/formatters';

function buildEditForm(d) {
  return {
    nom_complet: d.nom_complet || '',
    cin: d.cin || '',
    date_naissance: dateInputValue(d.date_naissance),
    universite: d.universite || '',
    diplome: d.diplome || '',
    adresse_complete: d.adresse_complete || '',
    date_demande: dateInputValue(d.date_demande),
    date_izin: dateInputValue(d.date_izin),
    numero_izin: d.numero_izin || '',
    nom_massah: d.nom_massah || '',
    date_massah: dateInputValue(d.date_massah),
    date_lajna: dateInputValue(d.date_lajna),
    commune: d.commune || '',
    cercle: d.cercle || '',
    notes: d.notes || ''
  };
}

function validate(form, lang) {
  const errs = {};
  if (!form.nom_complet.trim()) errs.nom_complet = t(lang, 'required');
  if (!form.cin.trim()) errs.cin = t(lang, 'required');
  if (!form.adresse_complete.trim()) errs.adresse_complete = t(lang, 'required');
  if (!form.commune.trim()) errs.commune = t(lang, 'required');
  if (!form.cercle.trim()) errs.cercle = t(lang, 'required');
  return errs;
}

const inp = (error) => `border border-[#d9e1e7] rounded-lg bg-white text-[#172033] text-sm px-3 py-2.5 w-full outline-none transition-[border-color,box-shadow] duration-200 focus:border-[#0f7a5b] focus:shadow-[0_0_0_3px_rgba(15,122,91,0.14)] dark:border-[#27364d] dark:bg-[#111f33] dark:text-[#e5edf7]${error ? ' border-[#ef4444] shadow-[0_0_0_3px_rgba(239,68,68,0.1)]' : ''}`;

export default function EditDemandeModal({ editingDemande, onClose, onSubmit, loading, lang, isRtl }) {
  const [form, setForm] = useState(() => buildEditForm(editingDemande || {}));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editingDemande) setForm(buildEditForm(editingDemande));
  }, [editingDemande]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate(form, lang);
    setErrors(errs);
    if (Object.keys(errs).length === 0) onSubmit(editingDemande.id, form);
  };

  const upd = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  if (!editingDemande) return null;

  const Section = ({ num, title, subtitle, children }) => (
    <div className="bg-white border border-[#eaecf0] border-t-[3px] border-t-[#c9a84c] rounded-lg overflow-hidden shadow-[0_1px_4px_rgba(13,31,60,0.07)] dark:border-[#1f2f45] dark:bg-[#0f1b2d] dark:text-[#e5edf7]">
      <div className="flex items-start gap-3.5 px-[26px] py-5 bg-gradient-to-br from-[#f8f6f0] to-[#faf9f5] border-b border-[#eaecf0] dark:bg-[#132238] dark:text-[#cbd5e1]">
        <div className="font-['Georgia'] text-[1.9rem] font-bold text-[#b8922a] opacity-80 min-w-[44px] leading-none">{isRtl ? ['٠١','٠٢','٠٣'][num-1] : `0${num}`}</div>
        <div>
          <h3 className="font-['Georgia'] text-base font-bold text-[#0d1f3c] mb-0.5">{title}</h3>
          <p className="text-xs text-[#4a5568]">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-[18px] p-[26px]">{children}</div>
    </div>
  );

  const Field = ({ field, label, required, type }) => (
    <div className={`flex flex-col gap-1.5 ${type === 'full' || type === 'textarea' ? 'col-span-full' : ''}`}>
      <label>{label}{required && ' *'}</label>
      {type === 'textarea' ? (
        <textarea className={inp(errors[field])} value={form[field]} rows={3} onChange={upd(field)} />
      ) : type === 'date' ? (
        <input type="date" className={inp(errors[field])} value={form[field]} onChange={upd(field)} />
      ) : field === 'cin' ? (
        <input className={inp(errors[field])} value={form[field]} onChange={e => setForm(p => ({ ...p, cin: e.target.value.toUpperCase() }))} maxLength="10" />
      ) : (
        <input className={inp(errors[field])} value={form[field]} onChange={upd(field)} />
      )}
      {errors[field] && <span className="text-xs text-[#991b1b]">{errors[field]}</span>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(17,24,39,0.56)] flex items-start justify-center overflow-y-auto px-4 py-7" role="dialog" aria-modal="true">
      <div className="w-[min(980px,100%)] bg-white rounded-lg shadow-[0_10px_40px_rgba(13,31,60,0.13)] p-6">
        <div className="flex justify-between items-start gap-4 mb-[18px]">
          <div>
            <h2 className="text-[#172033] text-[1.72rem] font-extrabold dark:text-[#f8fafc]">{t(lang, 'editRequest')}</h2>
            <p className="text-[#667085] text-[0.94rem] dark:text-[#94a3b8]">{editingDemande.numero_dossier}</p>
          </div>
          <button className="w-9 h-9 border border-[#d5d9e0] bg-[#f5f6f8] text-gray-700 rounded cursor-pointer text-[1.35rem] leading-none inline-flex items-center justify-center flex-shrink-0" type="button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          <Section num={1} title={t(lang, 'pharmacistInfo')} subtitle={isRtl ? 'البيانات الشخصية للصيدلاني' : 'Données personnelles du pharmacien'}>
            <Field field="nom_complet" label={t(lang, 'fullName')} required type="full" />
            <Field field="cin" label={t(lang, 'cin')} required />
            <Field field="date_naissance" label={t(lang, 'birthDate')} type="date" />
            <Field field="universite" label={t(lang, 'universite')} type="full" />
            <Field field="diplome" label={t(lang, 'diplome')} type="full" />
          </Section>
          <Section num={2} title={isRtl ? 'عنوان الصيدلية الكامل' : 'Adresse Complète de la Pharmacie'} subtitle={isRtl ? 'العنوان كما سيظهر في القرار' : "L'adresse telle qu'elle apparaîtra dans la décision"}>
            <Field field="adresse_complete" label={isRtl ? 'العنوان الكامل' : 'Adresse complète'} required type="textarea" />
            <Field field="commune" label={t(lang, 'commune')} required />
            <Field field="cercle" label={t(lang, 'cercle')} required />
          </Section>
          <Section num={3} title={isRtl ? 'بيانات الملف والوثائق' : 'Données du Dossier'} subtitle={isRtl ? 'التواريخ والأرقام المرجعية' : 'Dates et références du dossier'}>
            <Field field="date_demande" label={isRtl ? 'تاريخ تقديم الطلب' : 'Date de dépôt de la demande'} type="date" />
            <Field field="date_izin" label={isRtl ? "تاريخ قرار الإذن بمزاولة المهنة" : "Date du permis d'exercice"} type="date" />
            <Field field="numero_izin" label={isRtl ? "رقم عدد قرار الإذن" : "N° du permis d'exercice"} type="full" />
            <Field field="nom_massah" label={isRtl ? 'اسم المساح الطبوغرافي' : 'Nom du Géomètre Topographe'} type="full" />
            <Field field="date_massah" label={isRtl ? 'تاريخ شهادة قياس المسافة' : 'Date du certificat de distance'} type="date" />
            <Field field="date_lajna" label={isRtl ? 'تاريخ محضر اللجنة' : 'Date du PV de la Commission'} type="date" />
            <Field field="notes" label={t(lang, 'notes')} type="textarea" />
          </Section>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" className="bg-transparent border border-[#d9e1e7] text-[#172033] rounded-lg px-4 py-2 font-semibold cursor-pointer inline-flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-[#132238]" onClick={onClose}>{t(lang, 'cancel')}</button>
            <button type="submit" className="rounded-lg font-sans font-bold tracking-normal min-h-[40px] bg-[#153e49] text-white shadow-[0_1px_2px_rgba(16,24,40,0.06)] hover:bg-[#1f5d63] hover:shadow-[0_14px_38px_rgba(16,24,40,0.12)] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 px-4 py-2" disabled={loading}>
              {loading ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin align-middle" /> {t(lang, 'generating')}</> : t(lang, 'saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
