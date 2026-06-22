import React, { useState, useEffect, useRef } from 'react';
import { ocrAPI } from '../../services/api';
import { mergeOcrIntoForm } from '../../constants/licenceConfig';
import { t } from '../../i18n/translations';
import { filterByLang } from '../../utils/languageFilter';
import { FileText, Clock, CheckCircle2, Search, Bot, XCircle, Trash2, Upload, RefreshCw } from 'lucide-react';

const OCR_FIELD_LABELS = {
  nom_complet: { fr: 'Nom complet', ar: 'الاسم الكامل' },
  nom: { fr: 'Nom', ar: 'الاسم العائلي' },
  prenom: { fr: 'Prénom', ar: 'الاسم الشخصي' },
  cin: { fr: 'CIN', ar: 'رقم بطاقة التعريف' },
  date_naissance: { fr: 'Date de naissance', ar: 'تاريخ الازدياد' },
  adresse: { fr: 'Adresse', ar: 'العنوان' },
  adresse_complete: { fr: 'Adresse complète', ar: 'العنوان الكامل' },
  adresse_proprietaire: { fr: 'Adresse du propriétaire', ar: 'عنوان المالك' },
  adresse_local: { fr: 'Adresse du local', ar: 'عنوان المحل' },
  universite: { fr: 'Université', ar: 'الجامعة' },
  diplome: { fr: 'Diplôme', ar: 'الشهادة' },
  specialite: { fr: 'Spécialité', ar: 'التخصص' },
  qualification_sportive: { fr: 'Qualification sportive', ar: 'المؤهل الرياضي' },
  superficie: { fr: 'Superficie (m²)', ar: 'المساحة' },
  superficie_totale: { fr: 'Superficie totale (m²)', ar: 'المساحة الإجمالية' },
  commune: { fr: 'Commune', ar: 'الجماعة' },
  cercle: { fr: 'Cercle', ar: 'الدائرة' },
  numero_izin: { fr: 'Numéro permis/autorisation', ar: 'رقم الرخصة' },
  date_izin: { fr: 'Date permis/autorisation', ar: 'تاريخ الرخصة' },
  notes: { fr: 'Notes', ar: 'ملاحظات' },
};

const compressImage = (file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new window.Image();
    img.onload = () => {
      const MAX_DIM = 1600;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      resolve({ b64: dataUrl.split(',')[1], previewUrl: dataUrl });
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

const DocStatusIcon = ({ status, className = '' }) => {
  const cls = `w-5 h-5 shrink-0 ${className}`;
  if (status === 'idle') return <FileText className={cls} />;
  if (status === 'compressing') return <Clock className={`${cls} animate-pulse`} />;
  if (status === 'ready') return <CheckCircle2 className={`${cls} text-emerald-500`} />;
  if (status === 'extracting') return <Search className={`${cls} text-blue-500 animate-pulse`} />;
  if (status === 'done') return <Bot className={`${cls} text-emerald-500`} />;
  if (status === 'error') return <XCircle className={`${cls} text-red-500`} />;
  return <FileText className={cls} />;
};

function CitizenOcrBox({ onApply, licenceDocuments = [], compact = false, lang }) {
  const [queue, setQueue] = useState([]);
  const [step, setStep] = useState('upload');
  const [merged, setMerged] = useState({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [docSlot, setDocSlot] = useState(() =>
    licenceDocuments.reduce((acc, d) => ({ ...acc, [d.key]: { file: null, previewUrl: null, base64: null, status: 'idle', extracted: {}, confirmed: false } }), {})
  );
  const inputRef = useRef(null);

  useEffect(() => {
    setDocSlot(licenceDocuments.reduce((acc, d) => ({
      ...acc,
      [d.key]: { file: null, previewUrl: null, base64: null, status: 'idle', extracted: {}, confirmed: false }
    }), {}));
    setMerged({});
    setStep('upload');
  }, [licenceDocuments.map(d => d.key).join(',')]);

  const handleDocFileChange = async (docKey, file) => {
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) return;
    setDocSlot(prev => ({ ...prev, [docKey]: { ...prev[docKey], status: 'compressing', file } }));
    if (isImage) {
      const { b64, previewUrl } = await compressImage(file);
      setDocSlot(prev => ({ ...prev, [docKey]: { ...prev[docKey], base64: b64, previewUrl, status: 'ready' } }));
    } else {
      const b64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = () => reject(new Error('Lecture fichier échouée'));
        reader.readAsDataURL(file);
      });
      setDocSlot(prev => ({ ...prev, [docKey]: { ...prev[docKey], base64: b64, previewUrl: null, status: 'ready' } }));
    }
  };

  const runOcrForDoc = async (docKey) => {
    const slot = docSlot[docKey];
    if (!slot?.base64) return;
    const docConfig = licenceDocuments.find(d => d.key === docKey);
    if (!docConfig?.ocr) return;

    setDocSlot(prev => ({ ...prev, [docKey]: { ...prev[docKey], status: 'extracting' } }));
    try {
      await new Promise(r => setTimeout(r, 1500));
      const res = await ocrAPI.extractText(slot.base64, 'image/jpeg');
      if (!res.data?.success) throw new Error(res.data?.message || 'Échec extraction');
      const text = res.data.text || '';

      const analyzeRes = await ocrAPI.analyzeTexts([{ name: docConfig.label_fr, text, prompt: docConfig.ocr_prompt }]);
      if (!analyzeRes.data?.success || !analyzeRes.data?.extracted) throw new Error('Analyse IA échouée');

      const ext = analyzeRes.data.extracted || {};
      setDocSlot(prev => ({ ...prev, [docKey]: { ...prev[docKey], status: 'done', extracted: ext } }));
      setMerged(prev => mergeOcrIntoForm(prev, ext));
    } catch (err) {
      setDocSlot(prev => ({ ...prev, [docKey]: { ...prev[docKey], status: 'error', errorMsg: err.message } }));
    }
  };

  const confirmDocOcr = (docKey) => {
    setDocSlot(prev => ({ ...prev, [docKey]: { ...prev[docKey], confirmed: true } }));
  };

  const updateMerged = (k, v) => setMerged(p => ({ ...p, [k]: v }));

  const updateMergedFiltered = (k, v) => {
    const filtered = filterByLang(v, lang);
    setMerged(p => ({ ...p, [k]: filtered }));
  };

  const isMultiMode = licenceDocuments.length > 0;

  const handleFiles = (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!valid.length) return;
    valid.forEach(f => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      setQueue(q => [...q, { id, name: f.name, mimeType: 'image/jpeg', base64: null, previewUrl: null, status: 'pending', extractedText: '', errorMsg: '' }]);
      compressImage(f).then(({ b64, previewUrl }) => {
        setQueue(q => q.map(item => item.id === id ? { ...item, base64: b64, previewUrl } : item));
      });
    });
    setStep('upload');
  };

  const handleDrop = (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); };
  const removeDoc = (id) => setQueue(q => q.filter(d => d.id !== id));

  const extractAll = async () => {
    setStep('extracting');
    const snap = [...queue];
    for (const doc of snap.filter(d => d.status === 'pending')) {
      setQueue(q => q.map(d => d.id === doc.id ? { ...d, status: 'extracting' } : d));
      try {
        let b64 = doc.base64;
        if (!b64) {
          for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 300));
            const cur = queue.find(x => x.id === doc.id);
            if (cur?.base64) { b64 = cur.base64; break; }
          }
        }
        if (!b64) throw new Error('Image non chargée');
        await new Promise(r => setTimeout(r, 3000));
        const res = await ocrAPI.extractText(b64, 'image/jpeg');
        if (!res.data?.success) throw new Error(res.data?.message || 'Échec extraction');
        setQueue(q => q.map(d => d.id === doc.id ? { ...d, status: 'extracted', extractedText: res.data.text || '' } : d));
      } catch (err) {
        setQueue(q => q.map(d => d.id === doc.id ? { ...d, status: 'error', errorMsg: err.message } : d));
      }
    }
    setQueue(q => {
      const success = q.filter(d => d.status === 'extracted').length;
      setStep(success > 0 ? 'extracted' : 'upload');
      setErrorMsg(success === 0 ? 'Aucun texte extrait. Vérifiez la qualité des images.' : '');
      return q;
    });
    setActiveIdx(0);
  };

  const analyze = async () => {
    setStep('analyzing');
    const texts = queue
      .filter(d => d.status === 'extracted' && d.extractedText?.trim())
      .map(d => ({ name: d.name, text: d.extractedText }));
    if (!texts.length) { setStep('extracted'); return; }
    try {
      const res = await ocrAPI.analyzeTexts(texts);
      if (!res.data?.success || !res.data?.extracted) throw new Error('Analyse IA échouée');
      const ext = res.data.extracted;
      const mapped = {
        nom_complet: ext.nom_complet || (ext.prenom && ext.nom ? `${ext.prenom} ${ext.nom}`.trim() : ''),
        cin: ext.cin ? ext.cin.toUpperCase().replace(/\s/g, '') : '',
        date_naissance: ext.date_naissance || '',
        universite: ext.universite || '',
        diplome: ext.diplome || ext.specialite || '',
        adresse_complete: ext.adresse_complete || ext.adresse || '',
        commune: ext.commune || '',
        cercle: ext.cercle || '',
        date_demande: ext.date_demande || '',
        date_izin: ext.date_izin || ext.date_permis || '',
        numero_izin: ext.numero_izin || ext.numero_permis || '',
        nom_massah: ext.nom_massah || '',
        date_massah: ext.date_massah || '',
        date_lajna: ext.date_lajna || '',
        notes: ext.notes || '',
      };
      setMerged(mapped);
      setStep('done');
    } catch (err) {
      setErrorMsg(err.message);
      setStep('extracted');
    }
  };

  const reset = () => {
    setQueue([]);
    setStep('upload');
    setMerged({});
    setErrorMsg('');
    setActiveIdx(0);
    if (isMultiMode) {
      setDocSlot(licenceDocuments.reduce((acc, d) => ({
        ...acc,
        [d.key]: { file: null, previewUrl: null, base64: null, status: 'idle', extracted: {}, confirmed: false }
      }), {}));
    }
  };

  const statusLabel = (doc) => {
    if (doc.status === 'pending') return 'En attente';
    if (doc.status === 'extracting') return 'Lecture...';
    if (doc.status === 'extracted') return 'Texte extrait';
    return `Échec${doc.errorMsg ? ` (${doc.errorMsg.slice(0, 35)})` : ''}`;
  };

  const renderMergedFields = () => {
    const fieldEntries = Object.entries(merged).filter(([, v]) => v !== undefined);
    if (!fieldEntries.length) return null;
    return (
      <div className="mt-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2 font-semibold">
          <Bot className="w-4 h-4 text-emerald-500" />
          <strong>{lang === 'ar' ? 'البيانات المستخرجة — راجع وصحح قبل التأكيد' : 'Données extraites — vérifiez avant confirmation'}</strong>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
          {fieldEntries.map(([key, value]) => {
            const isAutoExtracted = !!value;
            const label = OCR_FIELD_LABELS[key]?.[lang] || key;
            return (
              <div key={key} className={`rounded-lg p-2 border ${isAutoExtracted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600'}`}>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">{label}</label>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isAutoExtracted ? 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    {isAutoExtracted ? t(lang, 'ocrExtracted') : t(lang, 'ocrManual')}
                  </span>
                </div>
                <input
                  type={key.includes('date') ? 'date' : 'text'}
                  value={value}
                  onChange={e => {
                    const val = key === 'cin' ? e.target.value.toUpperCase() : filterByLang(e.target.value, lang);
                    updateMerged(key, val);
                  }}
                  className="w-full px-1.5 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isMultiMode) {
    const ocrDocs = licenceDocuments.filter(d => d.ocr);
    const nonOcrDocs = licenceDocuments.filter(d => !d.ocr);

    return (
      <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col gap-4 p-5 shadow-sm ${compact ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}>
        <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-2">
          {lang === 'ar' ? 'رفع الوثائق والقراءة التلقائية' : 'Upload des documents & lecture automatique'}
        </h4>

        {ocrDocs.length > 0 && (
          <div className="mb-5">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              {lang === 'ar'
                ? 'الوثائق التالية تدعم الاستخراج التلقائي للبيانات:'
                : 'Ces documents supportent l\'extraction automatique des données :'}
            </p>
            {ocrDocs.map(doc => {
              const slot = docSlot[doc.key] || {};
              const label = lang === 'ar' ? doc.label_ar : doc.label_fr;
              const borderColor = slot.confirmed ? 'border-emerald-500' : slot.status === 'done' ? 'border-blue-500' : slot.status === 'error' ? 'border-red-400' : 'border-slate-200 dark:border-slate-600';
              return (
                <div key={doc.key} className={`border-2 ${borderColor} rounded-xl p-4 mb-3 transition-colors ${slot.confirmed ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-white dark:bg-slate-800'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <DocStatusIcon status={slot.status} />
                    <div className="flex-1 min-w-0">
                      <strong className="text-sm text-slate-800 dark:text-white">{label}</strong>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {slot.status === 'idle' && (lang === 'ar' ? 'في انتظار الرفع' : 'En attente d\'upload')}
                        {slot.status === 'compressing' && (lang === 'ar' ? 'جاري الضغط...' : 'Compression...')}
                        {slot.status === 'ready' && (lang === 'ar' ? 'جاهز للتحليل' : 'Prêt pour analyse')}
                        {slot.status === 'extracting' && (lang === 'ar' ? 'جاري الاستخراج...' : 'Extraction en cours...')}
                        {slot.status === 'done' && !slot.confirmed && (lang === 'ar' ? 'البيانات مستخرجة — راجع وأكد' : 'Données extraites — vérifiez et confirmez')}
                        {slot.confirmed && (lang === 'ar' ? 'تأكيد البيانات' : 'Données confirmées')}
                        {slot.status === 'error' && (slot.errorMsg || 'Erreur')}
                      </div>
                    </div>
                    {!slot.confirmed && (
                      <label className="cursor-pointer px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                        {slot.previewUrl
                          ? (lang === 'ar' ? 'تغيير' : 'Changer')
                          : (lang === 'ar' ? 'رفع' : 'Importer')}
                        <input
                          type="file" accept="image/*,.pdf" hidden
                          onChange={e => e.target.files[0] && handleDocFileChange(doc.key, e.target.files[0])}
                        />
                      </label>
                    )}
                  </div>

                  {slot.previewUrl && (
                    <img src={slot.previewUrl} alt={label}
                      className="max-h-[120px] rounded-lg mb-3 border border-slate-200 dark:border-slate-600" />
                  )}

                  {slot.status === 'ready' && !slot.confirmed && (
                    <button type="button" className="inline-flex items-center justify-center gap-2 min-h-[32px] bg-[#10B981] hover:bg-[#059669] text-white rounded-lg text-xs font-bold px-3.5 py-1.5 border-none cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
                      onClick={() => runOcrForDoc(doc.key)}
                    >
                      <Bot className="w-3.5 h-3.5" />
                      {lang === 'ar' ? 'تحليل بالذكاء الاصطناعي' : 'Analyser avec l\'IA'}
                    </button>
                  )}

                  {slot.status === 'done' && !slot.confirmed && Object.keys(slot.extracted).length > 0 && (
                    <div className="mt-3">
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
                        {Object.entries(slot.extracted).map(([key, value]) => value ? (
                          <div key={key} className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-2">
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold mb-1">
                              {key} <span className="bg-emerald-100 dark:bg-emerald-800 rounded px-1 py-0.5 text-[9px]">OCR</span>
                            </div>
                            <input
                              type={key.includes('date') ? 'date' : 'text'}
                              value={value}
                              onChange={e => {
                                const val = filterByLang(e.target.value, lang);
                                setDocSlot(prev => ({
                                  ...prev,
                                  [doc.key]: { ...prev[doc.key], extracted: { ...prev[doc.key].extracted, [key]: val } }
                                }));
                                setMerged(prev => mergeOcrIntoForm(prev, { [key]: val }));
                              }}
                              className="w-full px-1.5 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                            />
                          </div>
                        ) : null)}
                      </div>
                      <button type="button" className="inline-flex items-center justify-center gap-2 min-h-[32px] bg-[#10B981] hover:bg-[#059669] text-white rounded-lg text-xs font-bold px-3.5 py-1.5 border-none cursor-pointer transition-all duration-200 mt-2.5 shadow-sm hover:shadow-md"
                        onClick={() => confirmDocOcr(doc.key)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t(lang, 'confirmOcrData')}
                      </button>
                    </div>
                  )}
                  {slot.confirmed && (
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      {lang === 'ar' ? 'تم دمج البيانات في النموذج' : 'Données fusionnées dans le formulaire'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {nonOcrDocs.length > 0 && (
          <div className="mb-5">
            {nonOcrDocs.map(doc => {
              const slot = docSlot[doc.key] || {};
              const label = lang === 'ar' ? doc.label_ar : doc.label_fr;
              const isUploaded = slot.status === 'ready' || slot.status === 'done';
              const borderColor = isUploaded ? 'border-emerald-500' : slot.status === 'error' ? 'border-red-400' : 'border-slate-200 dark:border-slate-600';
              return (
                <div key={doc.key} className={`border-2 ${borderColor} rounded-xl p-4 mb-3 transition-colors ${isUploaded ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-white dark:bg-slate-800'}`}>
                  <div className="flex items-center gap-3">
                    <DocStatusIcon status={slot.status} />
                    <div className="flex-1 min-w-0">
                      <strong className="text-sm text-slate-800 dark:text-white">{label}</strong>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {(!slot.status || slot.status === 'idle') && (lang === 'ar' ? 'في انتظار الرفع' : 'En attente d\'upload')}
                        {slot.status === 'compressing' && (lang === 'ar' ? 'جاري المعالجة...' : 'Traitement...')}
                        {slot.status === 'ready' && (lang === 'ar' ? 'تم الرفع بنجاح' : 'Fichier chargé')}
                        {slot.status === 'error' && (slot.errorMsg || 'Erreur')}
                      </div>
                    </div>
                    <label className="cursor-pointer px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                      {isUploaded
                        ? (lang === 'ar' ? 'تغيير' : 'Changer')
                        : (lang === 'ar' ? 'رفع' : 'Importer')}
                      <input
                        type="file" accept="image/*,.pdf" hidden
                        onChange={e => e.target.files[0] && handleDocFileChange(doc.key, e.target.files[0])}
                      />
                    </label>
                  </div>
                  {slot.previewUrl && (
                    <img src={slot.previewUrl} alt={label}
                      className="max-h-[120px] rounded-lg mt-3 border border-slate-200 dark:border-slate-600" />
                  )}
                  {isUploaded && !slot.previewUrl && slot.file && (
                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate">{slot.file.name}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {Object.keys(merged).some(k => merged[k]) && (
          <>
            {renderMergedFields()}
            <div className="flex gap-2 mt-3.5 flex-wrap">
              <button type="button" className="inline-flex items-center justify-center gap-2 min-h-[40px] bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-sm font-bold px-5 py-2.5 border-none cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg" onClick={() => onApply(merged)}>
                {t(lang, 'ocrConfirmUse')}
              </button>
              <button type="button" className="inline-flex items-center justify-center gap-2 min-h-[40px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold px-5 py-2.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200" onClick={reset}>
                <Trash2 className="w-4 h-4" />
                {lang === 'ar' ? 'إعادة تعيين' : 'Réinitialiser'}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`citizen-ocr ${compact ? 'compact' : ''}`}>
      {(step === 'upload' || step === 'extracting') && (
        <>
          <div
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl cursor-pointer text-center min-h-[140px] p-5 transition-colors"
            style={{ borderColor: queue.length ? '#10B981' : '#a8dbc3' }}
            onClick={() => inputRef.current?.click()}
            onDragEnter={e => { e.preventDefault(); e.stopPropagation(); }}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleDrop}
          >
            <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={e => handleFiles(e.target.files)} />
            <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-1" />
            <strong className="text-sm text-slate-700 dark:text-slate-200">{lang === 'ar' ? 'اسحب وثائقك هنا أو انقر (متعددة)' : 'Glissez vos documents ici ou cliquez (multiple)'}</strong>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {lang === 'ar' ? 'CIN، شهادة، إذن...' : 'CIN, Diplôme, Permis...'}
            </span>
          </div>

          {queue.length > 0 && (
            <div className="mt-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {lang === 'ar' ? `${queue.length} وثيقة` : `${queue.length} document(s)`}
                </span>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" onClick={reset}>
                  <Trash2 className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'مسح الكل' : 'Tout effacer'}
                </button>
              </div>
              {queue.map((doc, idx) => (
                <div key={doc.id} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl mb-1.5 border border-slate-200 dark:border-slate-700">
                  {doc.previewUrl
                    ? <img src={doc.previewUrl} alt="" className="w-10 h-10 object-cover rounded-lg" />
                    : <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-slate-400" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                      Doc {idx + 1} — {doc.name}
                    </div>
                    <div className={`text-[11px] font-medium ${doc.status === 'error' ? 'text-red-500' : doc.status === 'extracted' ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {statusLabel(doc)}
                    </div>
                  </div>
                  <button onClick={() => removeDoc(doc.id)} disabled={doc.status === 'extracting'} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-40 transition-colors">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {errorMsg && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-3 text-sm font-semibold mt-2">{errorMsg}</div>}
              <div className="flex gap-2 mt-2.5 flex-wrap">
                <button
                  className="inline-flex items-center justify-center gap-2 min-h-[40px] bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-sm font-bold px-5 py-2.5 border-none cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                  onClick={extractAll}
                  disabled={step === 'extracting' || queue.every(d => d.status !== 'pending')}
                >
                  <Search className="w-4 h-4" />
                  {step === 'extracting'
                    ? (lang === 'ar' ? 'جاري القراءة...' : 'Lecture en cours...')
                    : (lang === 'ar'
                        ? `قراءة النص من ${queue.filter(d => d.status === 'pending').length} صورة`
                        : `Extraire le texte de ${queue.filter(d => d.status === 'pending').length} image(s)`)
                  }
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {step === 'extracted' && (
        <div>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {queue.map((doc, idx) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-all ${
                  activeIdx === idx
                    ? 'bg-[#10B981] border-[#10B981] text-white'
                    : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {doc.status === 'extracted' ? <FileText className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1" />}
                Doc {idx + 1}
              </button>
            ))}
          </div>
          {queue[activeIdx] && (
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-semibold">{queue[activeIdx].name}</div>
              {queue[activeIdx].status === 'extracted' ? (
                <pre className="m-0 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-800 dark:text-slate-200 max-h-[180px] overflow-y-auto" dir={/[\u0600-\u06FF]/.test(queue[activeIdx].extractedText) ? 'rtl' : 'ltr'}>
                  {queue[activeIdx].extractedText || '(aucun texte)'}
                </pre>
              ) : (
                <p className="text-red-500 text-xs m-0">Échec lecture de ce document</p>
              )}
            </div>
          )}
          {errorMsg && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-3 text-sm font-semibold mb-2">{errorMsg}</div>}
          <div className="flex gap-2 flex-wrap">
            <button className="inline-flex items-center justify-center gap-2 min-h-[40px] bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-sm font-bold px-5 py-2.5 border-none cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" type="button" onClick={analyze}
              disabled={queue.every(d => d.status !== 'extracted')}>
              <Bot className="w-4 h-4" />
              {lang === 'ar' ? 'تحليل بالذكاء الاصطناعي وملء النموذج' : "Analyser avec l'IA et remplir le formulaire"}
            </button>
            <button className="inline-flex items-center justify-center gap-2 min-h-[40px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold px-5 py-2.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200" type="button" onClick={reset}>
              <Trash2 className="w-4 h-4" />
              {lang === 'ar' ? 'إعادة تعيين' : 'Réinitialiser'}
            </button>
          </div>
        </div>
      )}

      {step === 'analyzing' && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl text-emerald-700 dark:text-emerald-300 text-center py-5">
          <Bot className="w-6 h-6 mx-auto mb-2 animate-pulse" />
          {lang === 'ar' ? 'الذكاء الاصطناعي يحلل الوثائق ويملأ النموذج...' : "L'IA analyse les documents et remplit le formulaire..."}
        </div>
      )}

      {step === 'done' && (
        <div>
          {renderMergedFields()}
          <div className="flex gap-2 mt-3 flex-wrap">
            <button className="inline-flex items-center justify-center gap-2 min-h-[40px] bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-sm font-bold px-5 py-2.5 border-none cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg" type="button" onClick={() => onApply(merged)}>
              {t(lang, 'ocrConfirmUse')}
            </button>
            <button className="inline-flex items-center justify-center gap-2 min-h-[40px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold px-5 py-2.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200" type="button" onClick={reset}>
              <Trash2 className="w-4 h-4" />
              {lang === 'ar' ? 'إعادة تعيين' : 'Réinitialiser'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CitizenOcrBox;
