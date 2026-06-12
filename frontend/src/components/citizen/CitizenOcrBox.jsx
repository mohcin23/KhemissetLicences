import React, { useState, useEffect, useRef } from 'react';
import { ocrAPI } from '../../services/api';
import { mergeOcrIntoForm } from '../../constants/licenceConfig';
import { t } from '../../i18n/translations';

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

const docStatusIcon = (status) => {
  if (status === 'idle') return '📄';
  if (status === 'compressing') return '⏳';
  if (status === 'ready') return '✅';
  if (status === 'extracting') return '🔍';
  if (status === 'done') return '🤖';
  if (status === 'error') return '❌';
  return '📄';
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
    if (doc.status === 'pending') return '⏳ En attente';
    if (doc.status === 'extracting') return '📖 Lecture...';
    if (doc.status === 'extracted') return '✅ Texte extrait';
    return `❌ Échec${doc.errorMsg ? ` (${doc.errorMsg.slice(0, 35)})` : ''}`;
  };

  const renderMergedFields = () => {
    const fieldEntries = Object.entries(merged).filter(([, v]) => v !== undefined);
    if (!fieldEntries.length) return null;
    return (
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>🤖</span>
          <strong>{lang === 'ar' ? 'البيانات المستخرجة — راجع وصحح قبل التأكيد' : 'Données extraites — vérifiez avant confirmation'}</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {fieldEntries.map(([key, value]) => {
            const isAutoExtracted = !!value;
            const label = OCR_FIELD_LABELS[key]?.[lang] || key;
            return (
              <div key={key} style={{
                background: isAutoExtracted ? '#f0fdf4' : '#fafafa',
                border: `1px solid ${isAutoExtracted ? '#bbf7d0' : '#e5e7eb'}`,
                borderRadius: 8, padding: '8px 10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{label}</label>
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 10,
                    background: isAutoExtracted ? '#dcfce7' : '#f3f4f6',
                    color: isAutoExtracted ? 'var(--gov-accent-dark)' : '#6b7280'
                  }}>
                    {isAutoExtracted ? t(lang, 'ocrExtracted') : t(lang, 'ocrManual')}
                  </span>
                </div>
                <input
                  type={key.includes('date') ? 'date' : 'text'}
                  value={value}
                  onChange={e => updateMerged(key, key === 'cin' ? e.target.value.toUpperCase() : e.target.value)}
                  style={{ width: '100%', padding: '4px 6px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6 }}
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
      <div className={`bg-white border border-[#dce8df] rounded-lg flex flex-col gap-[14px] p-[18px] shadow-[0_10px_26px_rgba(19,34,56,0.06)] ${compact ? 'bg-[#fbfdfb]' : ''}`}>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f3f32', marginBottom: 12 }}>
          {lang === 'ar' ? '📎 رفع الوثائق والقراءة التلقائية' : '📎 Upload des documents & lecture automatique'}
        </h4>

        {ocrDocs.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
              {lang === 'ar'
                ? '⚡ الوثائق التالية تدعم الاستخراج التلقائي للبيانات:'
                : '⚡ Ces documents supportent l\'extraction automatique des données :'}
            </p>
            {ocrDocs.map(doc => {
              const slot = docSlot[doc.key] || {};
              const label = lang === 'ar' ? doc.label_ar : doc.label_fr;
              return (
                <div key={doc.key} style={{
                  border: `2px solid ${slot.confirmed ? 'var(--gov-accent)' : slot.status === 'done' ? '#2563eb' : slot.status === 'error' ? '#ef4444' : '#e5e7eb'}`,
                  borderRadius: 10, padding: 14, marginBottom: 12,
                  background: slot.confirmed ? '#f0fdf4' : '#ffffff'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 20 }}>{docStatusIcon(slot.status)}</span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 13, color: '#1e293b' }}>{label}</strong>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>
                        {slot.status === 'idle' && (lang === 'ar' ? 'في انتظار الرفع' : 'En attente d\'upload')}
                        {slot.status === 'compressing' && (lang === 'ar' ? 'جاري الضغط...' : 'Compression...')}
                        {slot.status === 'ready' && (lang === 'ar' ? 'جاهز للتحليل' : 'Prêt pour analyse')}
                        {slot.status === 'extracting' && (lang === 'ar' ? '🔍 جاري الاستخراج...' : '🔍 Extraction en cours...')}
                        {slot.status === 'done' && !slot.confirmed && (lang === 'ar' ? '✅ البيانات مستخرجة — راجع وأكد' : '✅ Données extraites — vérifiez et confirmez')}
                        {slot.confirmed && (lang === 'ar' ? '✅ تأكيد البيانات' : '✅ Données confirmées')}
                        {slot.status === 'error' && `❌ ${slot.errorMsg || 'Erreur'}`}
                      </div>
                    </div>
                    {!slot.confirmed && (
                      <label style={{ cursor: 'pointer', padding: '5px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12 }}>
                        {slot.previewUrl
                          ? (lang === 'ar' ? '🔄 تغيير' : '🔄 Changer')
                          : (lang === 'ar' ? '📤 رفع' : '📤 Importer')}
                        <input
                          type="file" accept="image/*,.pdf" hidden
                          onChange={e => e.target.files[0] && handleDocFileChange(doc.key, e.target.files[0])}
                        />
                      </label>
                    )}
                  </div>

                  {slot.previewUrl && (
                    <img src={slot.previewUrl} alt={label}
                      style={{ maxHeight: 120, borderRadius: 6, marginBottom: 10, border: '1px solid #e5e7eb' }} />
                  )}

                  {slot.status === 'ready' && !slot.confirmed && (
                    <button type="button" className="inline-flex items-center justify-center gap-2 min-h-[30px] bg-accent-500 text-white rounded-lg font-extrabold px-[14px] py-[5px] border-none cursor-pointer hover:bg-accent-700 hover:-translate-y-0.5 transition-all duration-150 disabled:opacity-65 disabled:cursor-not-allowed"
                      style={{ fontSize: 12 }}
                      onClick={() => runOcrForDoc(doc.key)}
                    >
                      🤖 {lang === 'ar' ? 'تحليل بالذكاء الاصطناعي' : 'Analyser avec l\'IA'}
                    </button>
                  )}

                  {slot.status === 'done' && !slot.confirmed && Object.keys(slot.extracted).length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                        {Object.entries(slot.extracted).map(([key, value]) => value ? (
                          <div key={key} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '6px 8px' }}>
                            <div style={{ fontSize: 10, color: 'var(--gov-accent-dark)', fontWeight: 600, marginBottom: 2 }}>
                              {key} <span style={{ background: '#dcfce7', borderRadius: 4, padding: '1px 4px' }}>OCR</span>
                            </div>
                            <input
                              type={key.includes('date') ? 'date' : 'text'}
                              value={value}
                              onChange={e => {
                                setDocSlot(prev => ({
                                  ...prev,
                                  [doc.key]: { ...prev[doc.key], extracted: { ...prev[doc.key].extracted, [key]: e.target.value } }
                                }));
                                setMerged(prev => mergeOcrIntoForm(prev, { [key]: e.target.value }));
                              }}
                              style={{ width: '100%', padding: '3px 5px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4 }}
                            />
                          </div>
                        ) : null)}
                      </div>
                      <button type="button" className="inline-flex items-center justify-center gap-2 min-h-[30px] bg-accent-500 text-white rounded-lg font-extrabold px-[14px] py-[5px] border-none cursor-pointer hover:bg-accent-700 hover:-translate-y-0.5 transition-all duration-150 disabled:opacity-65 disabled:cursor-not-allowed"
                        style={{ marginTop: 10, fontSize: 12 }}
                        onClick={() => confirmDocOcr(doc.key)}
                      >
                        ✅ {t(lang, 'confirmOcrData')}
                      </button>
                    </div>
                  )}
                  {slot.confirmed && (
                    <div style={{ fontSize: 12, color: 'var(--gov-accent)', fontWeight: 600 }}>
                      ✅ {lang === 'ar' ? 'تم دمج البيانات في النموذج' : 'Données fusionnées dans le formulaire'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {nonOcrDocs.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {nonOcrDocs.map(doc => {
              const slot = docSlot[doc.key] || {};
              const label = lang === 'ar' ? doc.label_ar : doc.label_fr;
              const isUploaded = slot.status === 'ready' || slot.status === 'done';
              return (
                <div key={doc.key} style={{
                      border: `2px solid ${isUploaded ? 'var(--gov-accent)' : slot.status === 'error' ? '#ef4444' : '#e5e7eb'}`,
                  borderRadius: 10, padding: 14, marginBottom: 12,
                  background: isUploaded ? '#f0fdf4' : '#ffffff'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{docStatusIcon(slot.status)}</span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 13, color: '#1e293b' }}>{label}</strong>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>
                        {(!slot.status || slot.status === 'idle') && (lang === 'ar' ? 'في انتظار الرفع' : 'En attente d\'upload')}
                        {slot.status === 'compressing' && (lang === 'ar' ? 'جاري المعالجة...' : 'Traitement...')}
                        {slot.status === 'ready' && (lang === 'ar' ? '✅ تم الرفع بنجاح' : '✅ Fichier chargé')}
                        {slot.status === 'error' && `❌ ${slot.errorMsg || 'Erreur'}`}
                      </div>
                    </div>
                    <label style={{ cursor: 'pointer', padding: '5px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12 }}>
                      {isUploaded
                        ? (lang === 'ar' ? '🔄 تغيير' : '🔄 Changer')
                        : (lang === 'ar' ? '📤 رفع' : '📤 Importer')}
                      <input
                        type="file" accept="image/*,.pdf" hidden
                        onChange={e => e.target.files[0] && handleDocFileChange(doc.key, e.target.files[0])}
                      />
                    </label>
                  </div>
                  {slot.previewUrl && (
                    <img src={slot.previewUrl} alt={label}
                      style={{ maxHeight: 120, borderRadius: 6, marginTop: 10, border: '1px solid #e5e7eb' }} />
                  )}
                  {isUploaded && !slot.previewUrl && slot.file && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>📄</span>
                      <span>{slot.file.name}</span>
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
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <button type="button" className="inline-flex items-center justify-center gap-2 min-h-[40px] bg-accent-500 text-white rounded-lg font-extrabold px-4 py-[11px] border-none cursor-pointer hover:bg-accent-700 hover:-translate-y-0.5 transition-all duration-150 disabled:opacity-65 disabled:cursor-not-allowed" onClick={() => onApply(merged)}>
                {t(lang, 'ocrConfirmUse')}
              </button>
              <button type="button" className="inline-flex items-center justify-center gap-2 min-h-[40px] bg-accent-50 border border-accent-200 text-accent-500 rounded-lg font-extrabold px-4 py-[11px] cursor-pointer hover:bg-accent-700 hover:-translate-y-0.5 transition-all duration-150" onClick={reset}>
                🗑 {lang === 'ar' ? 'إعادة تعيين' : 'Réinitialiser'}
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
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg cursor-pointer text-center min-h-[140px] p-5"
            style={{ borderColor: queue.length ? '#6366f1' : '#a8dbc3' }}
            onClick={() => inputRef.current?.click()}
            onDragEnter={e => { e.preventDefault(); e.stopPropagation(); }}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleDrop}
          >
            <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={e => handleFiles(e.target.files)} />
            <strong>{lang === 'ar' ? 'اسحب وثائقك هنا أو انقر (متعددة)' : 'Glissez vos documents ici ou cliquez (multiple)'}</strong>
            <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {lang === 'ar' ? 'CIN، شهادة، إذن...' : 'CIN, Diplôme, Permis...'}
            </span>
          </div>

          {queue.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  {lang === 'ar' ? `${queue.length} وثيقة` : `${queue.length} document(s)`}
                </span>
                <button className="inline-flex items-center justify-center gap-2 min-h-[30px] bg-accent-50 border border-accent-200 text-accent-500 rounded-lg font-extrabold px-[10px] py-[3px] cursor-pointer hover:bg-accent-700 hover:-translate-y-0.5 transition-all duration-150" style={{ fontSize: '12px' }} onClick={reset}>
                  {lang === 'ar' ? 'مسح الكل' : 'Tout effacer'}
                </button>
              </div>
              {queue.map((doc, idx) => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: '#f9fafb', borderRadius: '8px', marginBottom: '6px', border: '1px solid #e5e7eb' }}>
                  {doc.previewUrl
                    ? <img src={doc.previewUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                    : <div style={{ width: 40, height: 40, background: '#e5e7eb', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📄</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Doc {idx + 1} — {doc.name}
                    </div>
                    <div style={{ fontSize: '11px', color: doc.status === 'error' ? '#ef4444' : doc.status === 'extracted' ? 'var(--gov-accent)' : '#6b7280' }}>
                      {statusLabel(doc)}
                    </div>
                  </div>
                  <button onClick={() => removeDoc(doc.id)} disabled={doc.status === 'extracting'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px' }}>✕</button>
                </div>
              ))}
              {errorMsg && <div className="bg-[#fff1f2] border border-[#fecdd3] text-[#9f1239] rounded-lg p-[10px_12px] text-sm font-bold" style={{ marginTop: '8px' }}>{errorMsg}</div>}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button
                  className="inline-flex items-center justify-center gap-2 min-h-[40px] bg-accent-500 text-white rounded-lg font-extrabold px-4 py-[11px] border-none cursor-pointer hover:bg-accent-700 hover:-translate-y-0.5 transition-all duration-150 disabled:opacity-65 disabled:cursor-not-allowed"
                  type="button"
                  onClick={extractAll}
                  disabled={step === 'extracting' || queue.every(d => d.status !== 'pending')}
                >
                  {step === 'extracting'
                    ? (lang === 'ar' ? '📖 جاري القراءة...' : '📖 Lecture en cours...')
                    : (lang === 'ar'
                        ? `📖 قراءة النص من ${queue.filter(d => d.status === 'pending').length} صورة`
                        : `📖 Extraire le texte de ${queue.filter(d => d.status === 'pending').length} image(s)`)
                  }
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {step === 'extracted' && (
        <div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {queue.map((doc, idx) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setActiveIdx(idx)}
                style={{
                  padding: '4px 10px', fontSize: '12px', borderRadius: '20px', border: '1px solid',
                  cursor: 'pointer',
                  background: activeIdx === idx ? '#6366f1' : '#f3f4f6',
                  color: activeIdx === idx ? '#fff' : '#374151',
                  borderColor: activeIdx === idx ? '#6366f1' : '#d1d5db',
                }}
              >
                {doc.status === 'extracted' ? '📄' : '❌'} Doc {idx + 1}
              </button>
            ))}
          </div>
          {queue[activeIdx] && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>{queue[activeIdx].name}</div>
              {queue[activeIdx].status === 'extracted' ? (
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px', lineHeight: '1.6', color: '#1e293b', maxHeight: '180px', overflowY: 'auto', direction: /[\u0600-\u06FF]/.test(queue[activeIdx].extractedText) ? 'rtl' : 'ltr' }}>
                  {queue[activeIdx].extractedText || '(aucun texte)'}
                </pre>
              ) : (
                <p style={{ color: '#ef4444', fontSize: '12px', margin: 0 }}>❌ Échec lecture de ce document</p>
              )}
            </div>
          )}
          {errorMsg && <div className="bg-[#fff1f2] border border-[#fecdd3] text-[#9f1239] rounded-lg p-[10px_12px] text-sm font-bold" style={{ marginBottom: '8px' }}>{errorMsg}</div>}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="inline-flex items-center justify-center gap-2 min-h-[40px] bg-accent-500 text-white rounded-lg font-extrabold px-4 py-[11px] border-none cursor-pointer hover:bg-accent-700 hover:-translate-y-0.5 transition-all duration-150 disabled:opacity-65 disabled:cursor-not-allowed" type="button" onClick={analyze}
              disabled={queue.every(d => d.status !== 'extracted')}>
              🤖 {lang === 'ar' ? 'تحليل بالذكاء الاصطناعي وملء النموذج' : "Analyser avec l'IA et remplir le formulaire"}
            </button>
            <button className="inline-flex items-center justify-center gap-2 min-h-[40px] bg-accent-50 border border-accent-200 text-accent-500 rounded-lg font-extrabold px-4 py-[11px] cursor-pointer hover:bg-accent-700 hover:-translate-y-0.5 transition-all duration-150" type="button" onClick={reset}>
              🗑 {lang === 'ar' ? 'إعادة تعيين' : 'Réinitialiser'}
            </button>
          </div>
        </div>
      )}

      {step === 'analyzing' && (
        <div className="bg-[#eef8f2] border border-[#bfe5cf] rounded-lg text-[#0f5132] mt-3 p-[10px_12px]" style={{ textAlign: 'center', padding: '20px' }}>
          🤖 {lang === 'ar' ? 'الذكاء الاصطناعي يحلل الوثائق ويملأ النموذج...' : "L'IA analyse les documents et remplit le formulaire..."}
        </div>
      )}

      {step === 'done' && (
        <div>
          {renderMergedFields()}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <button className="inline-flex items-center justify-center gap-2 min-h-[40px] bg-accent-500 text-white rounded-lg font-extrabold px-4 py-[11px] border-none cursor-pointer hover:bg-accent-700 hover:-translate-y-0.5 transition-all duration-150 disabled:opacity-65 disabled:cursor-not-allowed" type="button" onClick={() => onApply(merged)}>
              {t(lang, 'ocrConfirmUse')}
            </button>
            <button className="inline-flex items-center justify-center gap-2 min-h-[40px] bg-accent-50 border border-accent-200 text-accent-500 rounded-lg font-extrabold px-4 py-[11px] cursor-pointer hover:bg-accent-700 hover:-translate-y-0.5 transition-all duration-150" type="button" onClick={reset}>
              🗑 {lang === 'ar' ? 'إعادة تعيين' : 'Réinitialiser'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CitizenOcrBox;
