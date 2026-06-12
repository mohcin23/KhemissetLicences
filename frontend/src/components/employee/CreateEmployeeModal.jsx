import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { t } from '../../i18n/translations';
import { useToast } from '../../contexts/ToastContext';

export default function CreateEmployeeModal({ show, onClose, onCreated, lang, isRtl }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ full_name: '', username: '', password: '', role: 'agent' });
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { full_name, username, password } = form;
    if (!full_name.trim() || !username.trim() || !password) {
      showToast(t(lang, 'adminCreateRequired'), 'error');
      return;
    }
    if (password.length < 6) {
      showToast(t(lang, 'adminCreatePasswordMin'), 'error');
      return;
    }
    setLoading(true);
    try {
      await adminAPI.createEmployee({ ...form, full_name: full_name.trim(), username: username.trim() });
      showToast(t(lang, 'adminCreateSuccess'));
      onClose();
      setForm({ full_name: '', username: '', password: '', role: 'agent' });
      onCreated();
    } catch (err) {
      showToast(err.response?.data?.message || t(lang, 'toastError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  const inp = `border border-[#d9e1e7] rounded-lg bg-white text-[#172033] text-sm px-3 py-2.5 w-full outline-none transition-[border-color,box-shadow] duration-200 focus:border-[#0f7a5b] focus:shadow-[0_0_0_3px_rgba(15,122,91,0.14)] dark:border-[#27364d] dark:bg-[#111f33] dark:text-[#e5edf7]`;

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(17,24,39,0.56)] flex items-start justify-center overflow-y-auto px-4 py-7" role="dialog" aria-modal="true">
      <div className="w-[min(560px,100%)] bg-white rounded-lg shadow-[0_10px_40px_rgba(13,31,60,0.13)] p-6">
        <div className="flex justify-between items-start gap-4 mb-[18px]">
          <div>
            <h2 className="text-[#172033] text-[1.72rem] font-extrabold dark:text-[#f8fafc]">{t(lang, 'adminCreateEmployeeTitle')}</h2>
            <p className="text-[#667085] text-[0.94rem] dark:text-[#94a3b8]">{t(lang, 'adminCreateEmployeeDesc')}</p>
          </div>
          <button className="w-9 h-9 border border-[#d5d9e0] bg-[#f5f6f8] text-gray-700 rounded cursor-pointer text-[1.35rem] leading-none inline-flex items-center justify-center flex-shrink-0" type="button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          <div className="grid grid-cols-2 gap-[18px] p-[26px]">
            <div className="flex flex-col gap-1.5 col-span-full">
              <label>{t(lang, 'adminCreateNameLabel')} *</label>
              <input className={inp} value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder={t(lang, 'adminCreateNamePlaceholder')} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label>{t(lang, 'adminCreateUsernameLabel')} *</label>
              <input className={inp} value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder={t(lang, 'adminCreateUsernamePlaceholder')} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label>{t(lang, 'adminCreatePasswordLabel')} *</label>
              <div className="relative">
                <span className={`pointer-events-none absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`}><Lock size={18} /></span>
                <button type="button" className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:text-slate-800`} onClick={() => setPasswordVisible(v => !v)} aria-label={passwordVisible ? (isRtl ? 'إخفاء كلمة المرور' : 'Masquer le mot de passe') : (isRtl ? 'إظهار كلمة المرور' : 'Afficher le mot de passe')}>
                  {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <input className={`${inp} ${isRtl ? 'pr-10 pl-10' : 'pl-10 pr-10'}`} type={passwordVisible ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder={t(lang, 'adminCreatePasswordPlaceholder')} required minLength={6} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label>{t(lang, 'adminCreateRoleLabel')}</label>
              <select className="min-h-[40px] border border-[#d9e1e7] rounded-lg bg-white text-[#172033] text-sm px-3 py-2.5 outline-none cursor-pointer" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="agent">{t(lang, 'roleAgent')}</option>
                <option value="lecteur">{t(lang, 'roleLecteur')}</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" className="bg-transparent border border-[#d9e1e7] text-[#172033] rounded-lg px-4 py-2 font-semibold cursor-pointer inline-flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-[#132238]" onClick={onClose}>{t(lang, 'cancel')}</button>
            <button type="submit" className="rounded-lg font-sans font-bold tracking-normal min-h-[40px] bg-[#153e49] text-white shadow-[0_1px_2px_rgba(16,24,40,0.06)] hover:bg-[#1f5d63] hover:shadow-[0_14px_38px_rgba(16,24,40,0.12)] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 px-4 py-2" disabled={loading}>
              {loading ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin align-middle" /> : null} {t(lang, 'adminCreateBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
