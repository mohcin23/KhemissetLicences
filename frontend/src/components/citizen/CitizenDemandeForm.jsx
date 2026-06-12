import React from 'react';
import { t } from '../../i18n/translations';

function CitizenDemandeForm({ form, setForm, onSubmit, loading, submitLabel, lang }) {
  const upd = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <form className="flex flex-col gap-3 mt-[18px]" onSubmit={onSubmit}>
      <fieldset className="bg-white border border-[#dce8df] rounded-lg grid gap-[10px_14px] grid-cols-2 p-5 shadow-[0_8px_20px_rgba(19,34,56,0.04)]">
        <legend className="text-[#0f3f32] font-black px-[6px]">{t(lang, 'pharmacistInfo')}</legend>
        <label className="text-[#24463d] text-sm font-extrabold">{t(lang, 'fullName')} *</label>
        <input className="border border-[#cfded6] rounded-lg text-[#18332b] font-inherit p-[10px_12px] w-full outline-none focus:border-[#0b7a5b] focus:shadow-[0_0_0_3px_rgba(11,122,91,0.12)]" value={form.nom_complet} onChange={upd('nom_complet')} required />
        <label className="text-[#24463d] text-sm font-extrabold">CIN *</label>
        <input className="border border-[#cfded6] rounded-lg text-[#18332b] font-inherit p-[10px_12px] w-full outline-none focus:border-[#0b7a5b] focus:shadow-[0_0_0_3px_rgba(11,122,91,0.12)]" value={form.cin} onChange={e => setForm(prev => ({ ...prev, cin: e.target.value.toUpperCase() }))} required />
        <label className="text-[#24463d] text-sm font-extrabold">{t(lang, 'birthDate')}</label>
        <input className="border border-[#cfded6] rounded-lg text-[#18332b] font-inherit p-[10px_12px] w-full outline-none focus:border-[#0b7a5b] focus:shadow-[0_0_0_3px_rgba(11,122,91,0.12)]" type="date" value={form.date_naissance} onChange={upd('date_naissance')} />
        <label className="text-[#24463d] text-sm font-extrabold">{t(lang, 'universite')}</label>
        <input className="border border-[#cfded6] rounded-lg text-[#18332b] font-inherit p-[10px_12px] w-full outline-none focus:border-[#0b7a5b] focus:shadow-[0_0_0_3px_rgba(11,122,91,0.12)]" value={form.universite} onChange={upd('universite')} />
        <label className="text-[#24463d] text-sm font-extrabold">{t(lang, 'diplome')}</label>
        <input className="border border-[#cfded6] rounded-lg text-[#18332b] font-inherit p-[10px_12px] w-full outline-none focus:border-[#0b7a5b] focus:shadow-[0_0_0_3px_rgba(11,122,91,0.12)]" value={form.diplome} onChange={upd('diplome')} />
      </fieldset>
      <fieldset className="bg-white border border-[#dce8df] rounded-lg grid gap-[10px_14px] grid-cols-2 p-5 shadow-[0_8px_20px_rgba(19,34,56,0.04)]">
        <legend className="text-[#0f3f32] font-black px-[6px]">{t(lang, 'pharmacyInfo')}</legend>
        <label className="text-[#24463d] text-sm font-extrabold col-span-full">{t(lang, 'adressePharmacie')} *</label>
        <textarea className="border border-[#cfded6] rounded-lg text-[#18332b] font-inherit p-[10px_12px] w-full outline-none focus:border-[#0b7a5b] focus:shadow-[0_0_0_3px_rgba(11,122,91,0.12)] col-span-full" value={form.adresse_complete} onChange={upd('adresse_complete')} rows={3} required />
        <label className="text-[#24463d] text-sm font-extrabold">{t(lang, 'formDateDepot')}</label>
        <input className="border border-[#cfded6] rounded-lg text-[#18332b] font-inherit p-[10px_12px] w-full outline-none focus:border-[#0b7a5b] focus:shadow-[0_0_0_3px_rgba(11,122,91,0.12)]" type="date" value={form.date_demande} onChange={upd('date_demande')} />
        <label className="text-[#24463d] text-sm font-extrabold">{t(lang, 'formNumPermis')}</label>
        <input className="border border-[#cfded6] rounded-lg text-[#18332b] font-inherit p-[10px_12px] w-full outline-none focus:border-[#0b7a5b] focus:shadow-[0_0_0_3px_rgba(11,122,91,0.12)]" value={form.numero_izin} onChange={upd('numero_izin')} />
        <label className="text-[#24463d] text-sm font-extrabold">{t(lang, 'formDatePermis')}</label>
        <input className="border border-[#cfded6] rounded-lg text-[#18332b] font-inherit p-[10px_12px] w-full outline-none focus:border-[#0b7a5b] focus:shadow-[0_0_0_3px_rgba(11,122,91,0.12)]" type="date" value={form.date_izin} onChange={upd('date_izin')} />
      </fieldset>
      <fieldset className="bg-white border border-[#dce8df] rounded-lg grid gap-[10px_14px] grid-cols-2 p-5 shadow-[0_8px_20px_rgba(19,34,56,0.04)]">
        <legend className="text-[#0f3f32] font-black px-[6px]">{t(lang, 'formSection03Title')}</legend>
        <label className="text-[#24463d] text-sm font-extrabold">{t(lang, 'commune')} *</label>
        <input className="border border-[#cfded6] rounded-lg text-[#18332b] font-inherit p-[10px_12px] w-full outline-none focus:border-[#0b7a5b] focus:shadow-[0_0_0_3px_rgba(11,122,91,0.12)]" value={form.commune} onChange={upd('commune')} required />
        <label className="text-[#24463d] text-sm font-extrabold">{t(lang, 'cercle')} *</label>
        <input className="border border-[#cfded6] rounded-lg text-[#18332b] font-inherit p-[10px_12px] w-full outline-none focus:border-[#0b7a5b] focus:shadow-[0_0_0_3px_rgba(11,122,91,0.12)]" value={form.cercle} onChange={upd('cercle')} required />
        <label className="text-[#24463d] text-sm font-extrabold">{t(lang, 'formGeometre')}</label>
        <input className="border border-[#cfded6] rounded-lg text-[#18332b] font-inherit p-[10px_12px] w-full outline-none focus:border-[#0b7a5b] focus:shadow-[0_0_0_3px_rgba(11,122,91,0.12)]" value={form.nom_massah} onChange={upd('nom_massah')} />
        <label className="text-[#24463d] text-sm font-extrabold">{t(lang, 'formDateCertificat')}</label>
        <input className="border border-[#cfded6] rounded-lg text-[#18332b] font-inherit p-[10px_12px] w-full outline-none focus:border-[#0b7a5b] focus:shadow-[0_0_0_3px_rgba(11,122,91,0.12)]" type="date" value={form.date_massah} onChange={upd('date_massah')} />
        <label className="text-[#24463d] text-sm font-extrabold">{t(lang, 'formDateCommission')}</label>
        <input className="border border-[#cfded6] rounded-lg text-[#18332b] font-inherit p-[10px_12px] w-full outline-none focus:border-[#0b7a5b] focus:shadow-[0_0_0_3px_rgba(11,122,91,0.12)]" type="date" value={form.date_lajna} onChange={upd('date_lajna')} />
        <label className="text-[#24463d] text-sm font-extrabold col-span-full">{t(lang, 'notes')}</label>
        <textarea className="border border-[#cfded6] rounded-lg text-[#18332b] font-inherit p-[10px_12px] w-full outline-none focus:border-[#0b7a5b] focus:shadow-[0_0_0_3px_rgba(11,122,91,0.12)] col-span-full" value={form.notes} onChange={upd('notes')} rows={2} />
      </fieldset>
      <div className="flex justify-end">
        <button className="inline-flex items-center justify-center gap-2 min-h-[40px] bg-accent-500 text-white rounded-lg font-extrabold px-4 py-[11px] border-none cursor-pointer hover:bg-accent-700 hover:-translate-y-0.5 transition-all duration-150 disabled:opacity-65 disabled:cursor-not-allowed" type="submit" disabled={loading}>
          {loading ? t(lang, 'authGatewayRegisterLoading') : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default CitizenDemandeForm;
