import React, { useState, useEffect } from 'react';
import { demandesAPI, pdfAPI } from '../../services/api';
import { getLicenceDocs } from '../../constants/licenceConfig';
import { t } from '../../i18n/translations';
import PageHeader from '../../components/ui/PageHeader';
import LicenceSelector from '../../components/licences/LicenceSelector';
import DynamicLicenceForm from '../../components/licences/DynamicLicenceForm';

const AGENT_REQUEST_DRAFT_KEY = 'agent_new_request_draft';

const emptyForm = {
  nom_complet: '', cin: '', date_naissance: '',
  universite: '', diplome: '',
  adresse_complete: '',
  date_demande: '', date_izin: '', numero_izin: '',
  nom_massah: '', date_massah: '', date_lajna: '',
  commune: '', cercle: '', notes: ''
};

export default function AgentNewRequest({ lang, showToast }) {
  const isRtl = lang === 'ar';
  const text = (fr, ar) => (isRtl ? ar : fr);
  const safeShowToast = (message, tone) => {
    if (typeof showToast === 'function') showToast(message, tone);
  };

  const [licenceType, setLicenceType] = useState(null);
  const [mode, setMode] = useState('ocr');
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [submittedNumero, setSubmittedNumero] = useState('');
  const [page, setPage] = useState('form');
  const [agentDraft, setAgentDraft] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AGENT_REQUEST_DRAFT_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.licenceType && Object.values(data.form || {}).some(v => v && String(v).trim())) {
          setAgentDraft(data);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const hasData = Object.values(form).some(value => value && String(value).trim());
      if (hasData && licenceType) {
        localStorage.setItem(AGENT_REQUEST_DRAFT_KEY, JSON.stringify({ licenceType, form, mode }));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [form, licenceType, mode]);

  const restoreDraft = () => {
    if (agentDraft) {
      setLicenceType(agentDraft.licenceType);
      setForm((prev) => ({ ...prev, ...agentDraft.form }));
      if (agentDraft.mode) setMode(agentDraft.mode);
      setAgentDraft(null);
    }
  };

  const ignoreDraft = () => {
    localStorage.removeItem(AGENT_REQUEST_DRAFT_KEY);
    setAgentDraft(null);
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const uploadFiles = async (demandeId, files) => {
    if (!files || files.length === 0) return;
    const fichiers = await Promise.all(
      files.map(async (item) => {
        const file = item?.file || item;
        return {
          nom: file.name,
          type_mime: file.type,
          base64: await fileToBase64(file),
          type_piece: item?.key || item?.docKey || null,
        };
      })
    );
    await demandesAPI.uploadPiecesJointes(demandeId, fichiers);
  };

  const submitLicenceRequest = async (data) => {
    setLoading(true);
    try {
      const pendingFiles = data?._pendingFiles || [];
      const { _pendingFiles, ...licenceData } = data || {};
      const body = { ...form, ...licenceData, licence_type: licenceType || 'pharmacie' };
      const res = await demandesAPI.create(body);
      const created = res.data.data;

      if (pendingFiles.length > 0) {
        try {
          await uploadFiles(created.id, pendingFiles);
        } catch (pjErr) {
          safeShowToast(
            text("Demande créée mais échec de l'envoi de certains fichiers", 'تم إنشاء الطلب لكن فشل رفع بعض الوثائق'),
            'warning'
          );
        }
      }

      setSubmittedNumero(created.numero_dossier);
      setForm(emptyForm);
      setLicenceType(null);
      localStorage.removeItem(AGENT_REQUEST_DRAFT_KEY);
      setAgentDraft(null);
      setPage('success');
      try {
        await pdfAPI.downloadBoth(created.id, created.numero_dossier);
      } catch {}
    } catch (err) {
      safeShowToast(err.response?.data?.message || t(lang, 'errorCreate'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNewRequest = () => {
    setSubmittedNumero('');
    setLicenceType(null);
    setMode('ocr');
    setPage('form');
  };

  if (page === 'success') {
    return (
      <div className="agent-page">
        <div className="agent-page__inner">
          <section className="max-w-2xl mx-auto px-4 sm:px-6 py-8 text-center animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-10 sm:p-14">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white mb-3">
                {text('Demande enregistrée avec succès', 'تم تسجيل الطلب بنجاح')}
              </h1>
              <p className="text-sm text-[#64748B] dark:text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                {text(
                  'La demande a bien été enregistrée pour le citoyen. Vous pouvez créer une nouvelle demande ou retourner au tableau de bord.',
                  'تم تسجيل الطلب للمواطن بنجاح. يمكنك إنشاء طلب جديد أو العودة إلى لوحة التحكم.'
                )}
              </p>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5 mb-8 inline-block">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {text('Numéro de dossier', 'رقم الملف')}
                </p>
                <p className="text-xl font-mono font-bold text-[#0F172A] dark:text-white">{submittedNumero}</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleNewRequest}
                  className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  {text('Nouvelle demande', 'طلب جديد')}
                </button>
                <button
                  onClick={handleNewRequest}
                  className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  {text('Retour au tableau de bord', 'العودة للوحة التحكم')}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-page">
      <div className="agent-page__inner">
        <PageHeader
          kicker={text('Nouvelle demande', 'طلب جديد')}
          title={t(lang, 'newRequest')}
          description={text(
            'Enregistrez une nouvelle demande de licence pour un citoyen — choisissez le type de licence et remplissez les informations.',
            'سجل طلب ترخيص جديد ل المواطن — اختر نوع الرخصة ثم أكمل البيانات.'
          )}
        />

        {agentDraft && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-5 py-4 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-blue-800 dark:text-blue-200">
                  {text('Brouillon non soumis détecté', 'تم اكتشاف مسودة غير مرسلة')}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  {text(
                    'Reprenez où vous étiez, ou ignorez ce brouillon pour repartir de zéro.',
                    'تابع من حيث توقفت، أو تجاهل هذه المسودة للبدء من جديد.'
                  )}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300 bg-white dark:bg-blue-900/40 hover:bg-blue-50 dark:hover:bg-blue-800/40 transition-colors cursor-pointer"
                  onClick={ignoreDraft}
                >
                  {text('Ignorer', 'تجاهل')}
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border-0 text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                  onClick={restoreDraft}
                >
                  {text('Restaurer', 'استعادة')}
                </button>
              </div>
            </div>
          </div>
        )}

        {licenceType === null ? (
          <LicenceSelector
            lang={lang}
            onSelect={(type) => {
              setLicenceType(type);
            }}
          />
        ) : (
          <DynamicLicenceForm
            licenceType={licenceType}
            lang={lang}
            initialData={form}
            onBack={() => setLicenceType(null)}
            onSubmit={submitLicenceRequest}
            mode={mode}
            onModeChange={(nextMode) => { setMode(nextMode); }}
            licenceDocuments={getLicenceDocs(licenceType)}
          />
        )}
      </div>
    </div>
  );
}
