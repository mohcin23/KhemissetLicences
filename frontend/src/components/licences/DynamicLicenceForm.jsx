import React, { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../i18n/translations';
import { ocrAPI } from '../../services/api';
import ScannerModal from '../ui/ScannerModal';
import Stepper from './Stepper';
import { filterByLang } from '../../utils/languageFilter';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Camera,
  Check,
  ClipboardCheck,
  Coffee,
  Dumbbell,
  FileText,
  FileEdit,
  GraduationCap,
  Home,
  Hospital,
  IdCard,
  Keyboard,
  Loader2,
  PenTool,
  Pill,
  Ruler,
  Send,
  Sparkles,
  Upload,
  UploadCloud,
} from 'lucide-react';
import { FORM_CONFIG } from '../../constants/formConfig';
import { LICENCE_VIEW_META } from '../../constants/licenceConfig';
import Input, { Select, Textarea } from '../ui/Input';
import Alert from '../ui/Alert';

const LICENCE_META = {
  pharmacie: { icon: Pill },
  cafe_restaurant: { icon: Coffee },
  hopital_clinique: { icon: Hospital },
  ecole_privee: { icon: GraduationCap },
  salle_sport: { icon: Dumbbell },
};

const DOC_ICONS = {
  cin_proprietaire: IdCard, cin_directeur: IdCard,
  diplome_pharmacie: GraduationCap, diplome_directeur: GraduationCap, diplome_education_physique: GraduationCap, diplome_medecin: GraduationCap,
  permis_exercice: ClipboardCheck, autorisation_exploitation: ClipboardCheck, numero_autorisation: ClipboardCheck,
  certificat_distance: Ruler, certificat_conformite: Ruler, certificat_conformite_incendie: Ruler, attestation_conformite_equipements: Ruler, attestation_conformite_salles: Ruler, attestation_sanitize: Ruler, certificat_medical: Ruler,
  pv_commission: FileEdit, liste_enseignants: FileEdit, liste_equipements_medicaux: FileEdit,
  bail_propriete: Home, plan_local: PenTool, plan_architectural: PenTool, plans_locaux: PenTool,
};

const allFields = (config) => config.sections.flatMap((s) => s.fields);
const getInitialValue = (field, initialData) => initialData?.[field.name] ?? '';
const buildFormState = (config, initialData = {}) =>
  allFields(config).reduce((a, f) => {
    a[f.name] = getInitialValue(f, initialData);
    if (f.arabic) a[`${f.name}_ar`] = initialData?.[`${f.name}_ar`] ?? '';
    return a;
  }, {});
const buildDocsState = (config) =>
  config.documents.reduce((a, d) => { a[d.key] = null; return a; }, {});
const isEmailValid = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

const fileToPreview = (file) => new Promise((resolve) => {
  if (!file?.type?.startsWith('image/')) return resolve(null);
  const r = new FileReader();
  r.onload = (e) => resolve(e.target.result);
  r.onerror = () => resolve(null);
  r.readAsDataURL(file);
});

const imageToOcrBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Lecture fichier echouee'));
  reader.onload = (event) => {
    const img = new window.Image();
    img.onerror = () => reject(new Error('Image illisible'));
    img.onload = () => {
      const MAX = 1600;
      let { width: w, width: h } = img;
      if (w > MAX || h > MAX) { const r = Math.min(MAX / w, MAX / h); w = Math.round(w * r); h = Math.round(h * r); }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', 0.92).split(',')[1]);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

const OCR_ALIAS_MAP = {
  nom: ['nom', 'nom_directeur'],
  prenom: ['prenom', 'prenom_directeur'],
  nom_ar: ['nom_ar', 'nom_directeur_ar'],
  prenom_ar: ['prenom_ar', 'prenom_directeur_ar'],
  cin: ['cin', 'cin_directeur'],
  date_naissance: ['date_naissance'],
  adresse: ['adresse_complete', 'adresse', 'adresse_proprietaire'],
  adresse_ar: ['adresse_complete_ar', 'adresse_ar', 'adresse_proprietaire_ar'],
  commune: ['commune', 'commune_complete'],
  commune_ar: ['commune_ar', 'commune_complete_ar'],
  cercle: ['cercle'],
  cercle_ar: ['cercle_ar'],
  adresse_local: ['adresse_local', 'adresse_complete', 'adresse'],
  adresse_local_ar: ['adresse_local_ar'],
  specialite: ['diplome', 'specialite', 'qualification_sportive', 'diplome_directeur'],
  specialite_ar: ['diplome_ar', 'specialite_ar', 'qualification_sportive_ar', 'diplome_directeur_ar'],
  universite: ['universite'],
  universite_ar: ['universite_ar'],
  annee: ['annee_obtention'],
  superficie: ['superficie', 'superficie_totale'],
  nom_proprietaire: ['nom_complet', 'nom_proprietaire'],
  nom_proprietaire_ar: ['nom_complet_ar', 'nom_proprietaire_ar'],
  numero_autorisation: ['numero_izin', 'numero_autorisation'],
  date_autorisation: ['date_izin', 'date_autorisation'],
  numero_permis: ['numero_izin', 'numero_autorisation'],
  date_permis: ['date_izin', 'date_autorisation'],
};

const mergeExtractedIntoDynamicForm = (current, extracted) => {
  const next = { ...current };
  Object.entries(extracted || {}).forEach(([k, v]) => {
    if (!v) return;
    const targets = OCR_ALIAS_MAP[k] || [k];
    targets.forEach((t) => { if (t in next && !next[t]) next[t] = v; });
  });
  // Combine nom + prenom → nom_complet (French)
  const nomFr = extracted?.nom || '';
  const prenomFr = extracted?.prenom || '';
  if ((nomFr || prenomFr) && 'nom_complet' in next) {
    next.nom_complet = [prenomFr, nomFr].filter(Boolean).join(' ');
  }
  // Combine nom_ar + prenom_ar → nom_complet_ar (Arabic)
  const nomAr = extracted?.nom_ar || '';
  const prenomAr = extracted?.prenom_ar || '';
  if ((nomAr || prenomAr) && 'nom_complet_ar' in next) {
    next.nom_complet_ar = [prenomAr, nomAr].filter(Boolean).join(' ');
  }
  return next;
};

const formatBytes = (b) => {
  if (!b) return '';
  const u = ['o', 'Ko', 'Mo', 'Go'];
  let s = b, i = 0;
  while (s >= 1024 && i < u.length - 1) { s /= 1024; i++; }
  return `${s.toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
};

/* ── Sidebar: License Card ────────────────────────────────────────────────── */
function SidebarLicenceCard({ licenceType, lang, onBack }) {
  const meta = LICENCE_VIEW_META[licenceType];
  const lm = LICENCE_META[licenceType];
  const txt = (fr, ar) => (lang === 'ar' ? ar : fr);
  if (!meta) return null;
  const Icon = lm?.icon || FileText;
  return (
    <div className="citizen-lic-card">
      <div className={`citizen-lic-head type-${licenceType}`}>
        <div className="citizen-lic-icon">
          <Icon size={22} strokeWidth={2} />
        </div>
        <div className="citizen-lic-info">
          <div className="citizen-lic-badge">{txt('PERMIS SÉLECTIONNÉ', 'الرخصة المختارة')}</div>
          <div className="citizen-lic-name">{lang === 'ar' ? meta.title_ar : meta.title_fr}</div>
          <div className="citizen-lic-desc">{lang === 'ar' ? meta.description_ar : meta.description_fr}</div>
        </div>
      </div>
      <div className="citizen-lic-body">
        <button type="button" className="citizen-btn-change" onClick={onBack}>
          <ArrowLeft size={14} style={lang === 'ar' ? { transform: 'scaleX(-1)' } : undefined} />
          {txt('Changer de licence', 'تغيير الرخصة')}
        </button>
      </div>
    </div>
  );
}

/* ── Sidebar: Progression ─────────────────────────────────────────────────── */
function SidebarProgression({ documents, docsStatus, lang }) {
  const txt = (fr, ar) => (lang === 'ar' ? ar : fr);
  const done = documents.filter((d) => docsStatus[d.key] && !docsStatus[d.key]?.error).length;
  const total = documents.length;
  const pct = total ? (done / total * 100) : 0;
  return (
    <div className="citizen-prog-card">
      <div className="citizen-prog-card-head">
        <span className="citizen-prog-card-title">{txt('Progression', 'التقدم')}</span>
        <span className="citizen-prog-fraction"><span>{done}</span> / {total}</span>
      </div>
      <div className="citizen-prog-track">
        <div className="citizen-prog-fill" style={{ width: `${pct}%` }} />
      </div>
      <ul className="citizen-checklist">
        {documents.map((doc) => {
          const up = docsStatus[doc.key] && !docsStatus[doc.key]?.error;
          return (
            <li key={doc.key} className={`citizen-cl-item${up ? ' done' : ''}`}>
              <div className="citizen-cl-dot">
                {up && <Check size={11} strokeWidth={3} />}
              </div>
              <span>{lang === 'ar' ? doc.label_ar : doc.label_fr}</span>
              {doc.ocr && <span className="citizen-cl-ocr">OCR</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── Sidebar: OCR Card ────────────────────────────────────────────────────── */
function SidebarOcrInfo({ documents, lang }) {
  const txt = (fr, ar) => (lang === 'ar' ? ar : fr);
  const c = documents.filter((d) => d.ocr).length;
  return (
    <div className="citizen-ocr-card">
      <div className="citizen-ocr-card-icon">
        <Bot size={20} strokeWidth={2} />
      </div>
      <div>
        <h3>{txt(`${c} pièces compatibles OCR`, `${c} وثائق متوافقة مع OCR`)}</h3>
        <p>{txt(
          "CIN, Diplôme et Permis d'exercice seront lus automatiquement pour préremplir votre formulaire.",
          'ستتم قراءة بطاقة التعريف والدبلوم ورخصة المزاولة تلقائياً لملء الاستمارة.'
        )}</p>
      </div>
    </div>
  );
}

/* ── Mode Selector ────────────────────────────────────────────────────────── */
function ModeSection({ mode, onModeChange, lang }) {
  const txt = (fr, ar) => (lang === 'ar' ? ar : fr);
  return (
    <div className="citizen-panel" style={{ animationDelay: '0s' }}>
      <div className="citizen-panel-head">
        <div className="citizen-panel-head-left">
          <h2>{txt('Mode de dépôt', 'طريقة الإيداع')}</h2>
          <p>{txt('Choisissez comment vous souhaitez compléter votre dossier', 'اختر الطريقة لإنجاز ملفك')}</p>
        </div>
      </div>
      <div className="citizen-panel-body">
        <div className="citizen-mode-grid">
          <button type="button" className={`citizen-mode-card${mode === 'ocr' ? ' active' : ''}`} onClick={() => onModeChange('ocr')}>
            <div className="citizen-mode-icon">
              <Sparkles size={20} strokeWidth={2} />
            </div>
            <div className="citizen-mode-body">
              <div className="citizen-mode-title">
                {txt('Dépôt intelligent', 'إيداع ذكي')}
                <span className="citizen-badge-rec">{txt('Recommandé', 'موصى به')}</span>
              </div>
              <div className="citizen-mode-desc">{txt("Importez vos pièces — l'OCR lit et préremplit le formulaire automatiquement.", 'ارفع الوثائق — نظام OCR يقرأ ويعمل ملء تلقائي.')}</div>
            </div>
            <div className="citizen-mode-check">
              <Check size={12} strokeWidth={3} />
            </div>
          </button>
          <button type="button" className={`citizen-mode-card${mode === 'manual' ? ' active' : ''}`} onClick={() => onModeChange('manual')}>
            <div className="citizen-mode-icon">
              <Keyboard size={20} strokeWidth={2} />
            </div>
            <div className="citizen-mode-body">
              <div className="citizen-mode-title">{txt('Saisie manuelle', 'إدخال يدوي')}</div>
              <div className="citizen-mode-desc">{txt('Remplissez le formulaire vous-même, puis joignez vos documents.', 'املأ الاستمارة بنفسك ثم أرفق الوثائق.')}</div>
            </div>
            <div className="citizen-mode-check">
              <Check size={12} strokeWidth={3} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Doc Card ─────────────────────────────────────────────────────────────── */
function DocCard({ doc, docFile, isReading, isDone, isError, lang, onFileChange, onScanCapture, fileInputRef }) {
  const txt = (fr, ar) => (lang === 'ar' ? ar : fr);
  const uploaded = !!docFile && !isReading && !isError;
  const DocIcon = DOC_ICONS[doc.key] || FileText;
  return (
    <div className={`citizen-doc-card${uploaded ? ' uploaded' : ''}`}>
      <div className="citizen-doc-card-top">
        <div className="citizen-doc-ico">
          {isReading ? <Loader2 size={18} className="animate-spin" /> : <DocIcon size={18} strokeWidth={2} />}
        </div>
        <div className="citizen-doc-meta">
          <div className="citizen-doc-name">
            {isReading ? txt('Lecture en cours...', '...جاري القراءة') : (lang === 'ar' ? doc.label_ar : doc.label_fr)}
          </div>
          <div className="citizen-doc-tags">
            {doc.ocr && !docFile && <span className="citizen-tag citizen-tag-ocr">OCR</span>}
            {doc.required && <span className="citizen-tag citizen-tag-req">{txt('Obligatoire', 'إلزامي')}</span>}
          </div>
          <div className="citizen-doc-status">
            <Check size={12} strokeWidth={2.5} />
            {txt('Fichier ajouté', 'تمت إضافة الملف')}
          </div>
        </div>
      </div>
      <div className="citizen-doc-actions">
        {docFile ? (
          <label className={`citizen-btn-up${isReading ? ' opacity-50 pointer-events-none' : ''}`}>
            <UploadCloud size={14} />
            <span>{txt('Uploadé', 'تم الرفع')}</span>
            <input ref={(el) => { fileInputRef.current[doc.key] = el; }} type="file" accept="image/*,application/pdf" disabled={isReading} onChange={(e) => onFileChange(doc.key, e.target.files?.[0])} className="sr-only" />
          </label>
        ) : (
          <>
            <label className="citizen-btn-up">
              <Upload size={14} />
              <span>{txt('Upload', 'رفع')}</span>
              <input ref={(el) => { fileInputRef.current[doc.key] = el; }} type="file" accept="image/*,application/pdf" onChange={(e) => onFileChange(doc.key, e.target.files?.[0])} className="sr-only" />
            </label>
            <button type="button" className="citizen-btn-scan" onClick={() => onScanCapture(doc)}>
              <Camera size={14} />
              {txt('Scanner', 'مسح')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────────────────── */
export default function DynamicLicenceForm({
  licenceType, lang, initialData = {}, onSubmit, onBack, loading = false,
  mode = 'manual', onModeChange, ocrPanel = null, licenceDocuments = [],
}) {
  const config = FORM_CONFIG[licenceType];
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(() => (config ? buildFormState(config, initialData) : {}));
  const [docsStatus, setDocsStatus] = useState(() => (config ? buildDocsState(config) : {}));
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef({});
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTargetDoc, setScannerTargetDoc] = useState(null);

  useEffect(() => {
    if (!config) return;
    setStep(1); setFormData(buildFormState(config, initialData));
    setDocsStatus(buildDocsState(config)); setErrors({});
  }, [licenceType, config]);

  const txt = (fr, ar) => (lang === 'ar' ? ar : fr);
  const fields = useMemo(() => (config ? allFields(config) : []), [config]);
  const smartDocuments = useMemo(() => {
    if (!config) return [];
    return config.documents.map((d) => ({ ...d, ...(licenceDocuments.find((l) => l.key === d.key) || {}) }));
  }, [config, licenceDocuments]);
  const uploadedDocs = useMemo(() => Object.entries(docsStatus).filter(([, d]) => d && !d.error), [docsStatus]);
  const uploadedCount = uploadedDocs.length;
  const allDocsUploaded = smartDocuments.every((d) => docsStatus[d.key] && !docsStatus[d.key].error);
  const smartMode = mode === 'ocr';
  const docStepIndex = smartMode ? 1 : 2;
  const infoStepIndex = smartMode ? 2 : 1;
  const smartBusy = Object.values(docsStatus).some((d) => d?.ocrStatus === 'analyzing');

  if (!config) return null;
  const labelFor = (i) => (lang === 'ar' ? i.label_ar : i.label_fr);
  const titleFor = (i) => (lang === 'ar' ? i.title_ar : i.title_fr);

  const updateField = (field, raw) => {
    const v = field.transform === 'uppercase' ? raw.toUpperCase() : raw;
    setFormData((p) => ({ ...p, [field.name]: v }));
    setErrors((p) => { if (!p[field.name]) return p; const n = { ...p }; delete n[field.name]; return n; });
  };

  const validateInfo = () => {
    const e = {};
    fields.forEach((f) => {
      const v = String(formData[f.name] || '').trim();
      if (f.required && !v) e[f.name] = t(lang, 'licenceFormRequiredField');
      if (f.type === 'email' && !isEmailValid(v)) e[f.name] = t(lang, 'licenceFormInvalidEmail');
    });
    setErrors((p) => ({ ...p, ...e }));
    return Object.keys(e).length === 0;
  };

  const goToStep = (next) => {
    if (smartMode) {
      if (next > 1 && (uploadedCount === 0 || smartBusy)) {
        setErrors((p) => ({ ...p, documents: uploadedCount === 0 ? txt('Ajoutez au moins un document', 'أضف وثيقة واحدة على الأقل') : t(lang, 'licenceFormMissingDocs') }));
        return;
      }
      setStep(next); return;
    }
    if (next > 1 && !validateInfo()) return;
    if (next > 2 && uploadedCount === 0) {
      setErrors((p) => ({ ...p, documents: txt('Ajoutez au moins un document', 'أضف وثيقة واحدة على الأقل') }));
      return;
    }
    setStep(next);
  };

  const runSmartRead = async (doc, file) => {
    if (!doc?.ocr || !file?.type?.startsWith('image/')) return;
    setDocsStatus((p) => ({ ...p, [doc.key]: { ...p[doc.key], ocrStatus: 'analyzing' } }));
    try {
      const b64 = await imageToOcrBase64(file);
      let ext = {};

      // Step 1: Try direct Pixtral analysis (parseFieldsByType) — sees the image directly
      try {
        const direct = await ocrAPI.parseByType(b64, 'image/jpeg', licenceType, doc.key);
        if (direct.data?.success && direct.data?.extracted && Object.keys(direct.data.extracted).length > 0) {
          ext = direct.data.extracted;
        }
      } catch (directErr) {
        console.warn('parseByType failed, falling back to 2-step OCR:', directErr.message);
      }

      // Step 2: Fallback to 2-step OCR (extractText + analyzeTexts) if direct Pixtral gave nothing
      if (!ext || Object.keys(ext).length === 0) {
        const tr = await ocrAPI.extractText(b64, 'image/jpeg');
        if (!tr.data?.success) throw new Error(tr.data?.message || 'Extraction OCR echouee');
        const ar = await ocrAPI.analyzeTexts(
          [{ name: labelFor(doc), text: tr.data.text || '', prompt: doc.ocr_prompt }],
          doc.ocr_fields
        );
        if (!ar.data?.success || !ar.data?.extracted) throw new Error('Analyse IA echouee');
        ext = ar.data.extracted || {};
      }

      setFormData((p) => mergeExtractedIntoDynamicForm(p, ext));
      setDocsStatus((p) => ({ ...p, [doc.key]: { ...p[doc.key], ocrStatus: 'done', extracted: ext } }));
    } catch (err) {
      setDocsStatus((p) => ({ ...p, [doc.key]: { ...p[doc.key], ocrStatus: 'error', ocrError: err.message } }));
    }
  };

  const handleFileChange = async (docKey, file) => {
    if (!file) return;
    const meta = smartDocuments.find((d) => d.key === docKey);
    const preview = await fileToPreview(file);
    const smart = smartMode && meta?.ocr && file.type.startsWith('image/');
    setDocsStatus((p) => ({
      ...p, [docKey]: { id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, file, name: file.name, size: file.size, type: file.type, previewUrl: preview, ocrStatus: smart ? 'analyzing' : (meta?.ocr ? 'skipped' : 'not_supported') },
    }));
    setErrors((p) => ({ ...p, documents: null }));
    if (smart) await runSmartRead(meta, file);
  };

  const handleScanCapture = (doc) => { setScannerTargetDoc(doc); setScannerOpen(true); };
  const handleScanFile = async (file) => {
    if (!scannerTargetDoc || !file) return;
    await handleFileChange(scannerTargetDoc.key, file);
    setScannerTargetDoc(null);
  };

  const handleSubmit = () => {
    if (!validateInfo()) { setStep(smartMode ? 3 : 1); return; }
    if (!allDocsUploaded) {
      setErrors((p) => ({ ...p, documents: t(lang, 'licenceFormMissingDocs') }));
      setStep(smartMode ? 1 : 2); return;
    }
    const pending = Object.entries(docsStatus).filter(([, d]) => d?.file).map(([k, d]) => ({ key: k, file: d.file }));
    onSubmit({ ...formData, licence_type: licenceType, _pendingFiles: pending });
  };

  const renderField = (field) => {
    const err = errors[field.name];
    const arKey = `${field.name}_ar`;
    if (field.type === 'textarea') {
      if (field.arabic) {
        return (
          <div key={field.name} className="col-span-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Textarea
                label={lang === 'ar' ? field.label_ar : `${field.label_fr} (arabe)`}
                required={field.required}
                lang="ar"
                value={(formData[arKey]) || ''}
                onChange={(e) => setFormData((p) => ({ ...p, [arKey]: e.target.value }))}
                error={err}
                rows={3}
                className="agent-form-field"
                style={{ textAlign: 'right' }}
              />
              <Textarea
                label={lang === 'ar' ? `${field.label_ar} (فرنسية)` : field.label_fr}
                required={field.required}
                lang="fr"
                value={(formData[field.name]) || ''}
                onChange={(e) => updateField(field, e.target.value)}
                error={err}
                rows={3}
                className="agent-form-field"
              />
            </div>
          </div>
        );
      }
      return (
        <div key={field.name} className="col-span-full">
          <Textarea label={labelFor(field)} required={field.required} value={(formData[field.name]) || ''} onChange={(e) => updateField(field, e.target.value)} error={err} rows={3} className="agent-form-field" />
        </div>
      );
    }
    if (field.type === 'select') {
      const opts = [{ value: '', label: txt('Sélectionnez...', 'اختر...') }, ...field.options.map((o) => typeof o === 'string' ? { value: o, label: o } : o)];
      return (
        <div key={field.name} className="col-span-full sm:col-span-1">
          <Select label={labelFor(field)} required={field.required} value={formData[field.name] || ''} onChange={(e) => updateField(field, e.target.value)} error={err} options={opts} className="agent-form-field" />
        </div>
      );
    }
    if (field.arabic) return (
      <div key={field.name} className="col-span-full sm:col-span-1">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={lang === 'ar' ? field.label_ar : `${field.label_fr} (arabe)`}
            required={field.required}
            type={field.type || 'text'}
            lang="ar"
            value={(formData[arKey]) || ''}
            onChange={(e) => setFormData((p) => ({ ...p, [arKey]: e.target.value }))}
            error={err}
            className="agent-form-field"
            style={{ textAlign: 'right' }}
          />
          <Input
            label={lang === 'ar' ? `${field.label_ar} (فرنسية)` : field.label_fr}
            required={field.required}
            type={field.type || 'text'}
            lang="fr"
            value={(formData[field.name]) || ''}
            onChange={(e) => updateField(field, e.target.value)}
            error={err}
            className="agent-form-field"
          />
        </div>
      </div>
    );
    return (
      <div key={field.name} className="col-span-full sm:col-span-1">
        <Input label={labelFor(field)} required={field.required} type={field.type || 'text'} value={formData[field.name] || ''} onChange={(e) => updateField(field, e.target.value)} error={err} className="agent-form-field" />
      </div>
    );
  };

  const ocrCount = smartDocuments.filter((d) => d.ocr).length;

  return (
    <section className={`citizen-nouvelle-demande${lang === 'ar' ? ' rtl' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <div className="citizen-page-head">
        <h1>{txt('Nouvelle demande', 'طلب جديد')}</h1>
        <p>{step === 3
          ? txt('Vérifiez les informations ci-dessous avant de confirmer l\'envoi.', 'تحقق من المعلومات أدناه قبل تأكيد الإرسال.')
          : txt('Déposez vos pièces justificatives et soumettez votre dossier en quelques minutes.', 'ارفع وثائقك وأرسل ملفك في بضع دقائق.')
        }</p>
      </div>

      {/* Stepper */}
      <Stepper currentStep={step} displayStep={step === 3 ? 3 : 2} lang={lang} />

      {/* 2-Column Layout */}
      <div className="citizen-form-layout">
        {/* ── LEFT COLUMN ── */}
        <div className="citizen-main-col">
          {/* Mode Selector */}
          {step === 1 && onModeChange && (
            <ModeSection mode={mode} onModeChange={onModeChange} lang={lang} />
          )}

          {/* Documents Panel */}
          {step === docStepIndex && (
            <div className="citizen-panel" style={{ animationDelay: smartMode ? '.06s' : '0s' }}>
              <div className="citizen-panel-head">
                <div className="citizen-panel-head-left">
                  <h2>{txt('Documents à déposer', 'الوثائق المطلوبة')}</h2>
                  <p>{txt('Joignez chaque pièce requise pour votre dossier', 'ارفع كل وثيقة مطلوبة لملفك')}</p>
                </div>
                <div className="citizen-progress-chip">
                  <span className="count-done">{uploadedCount}</span>
                  <span className="count-sep">/</span>
                  <span className="count-total">{smartDocuments.length}</span>
                </div>
              </div>
              <div className="citizen-panel-body">
                {/* Progress bar */}
                <div className="citizen-prog-track">
                  <div className="citizen-prog-fill" style={{ width: `${smartDocuments.length ? (uploadedCount / smartDocuments.length * 100) : 0}%` }} />
                </div>

                {/* OCR strip */}
                {smartMode && ocrCount > 0 && (
                  <div className="citizen-ocr-strip">
                    <Sparkles size={16} />
                    <span><strong>{txt(`${ocrCount} pièces compatibles OCR`, `${ocrCount} وثائق متوافقة مع OCR`)}</strong> — {txt("elles seront lues et préremplies automatiquement après l'import.", 'ستتم قراءتها وملؤها تلقائياً.')}</span>
                  </div>
                )}

                {/* Document grid */}
                <div className="citizen-doc-grid">
                  {smartDocuments.map((doc) => {
                    const df = docsStatus[doc.key];
                    const reading = df?.ocrStatus === 'analyzing';
                    const done = df?.ocrStatus === 'done';
                    const error = df?.ocrStatus === 'error';
                    return (
                      <DocCard key={doc.key} doc={doc} docFile={df} isReading={reading} isDone={done} isError={error} lang={lang} onFileChange={handleFileChange} onScanCapture={handleScanCapture} fileInputRef={fileInputRef} />
                    );
                  })}
                </div>

                {errors.documents && <Alert tone="error" className="mt-4">{errors.documents}</Alert>}

                {/* Action buttons */}
                <div className="citizen-actions-row">
                  <button type="button" className="citizen-btn-back" onClick={() => (smartMode ? (onBack ? onBack() : setStep(1)) : setStep(1))}>
                    <ArrowLeft size={16} style={lang === 'ar' ? { transform: 'scaleX(-1)' } : undefined} />
                    {txt('Retour', 'السابق')}
                  </button>
                  <button type="button" className="citizen-btn-next" onClick={() => goToStep(3)} disabled={uploadedCount === 0 || smartBusy}>
                    {txt('Voir le récapitulatif', 'مراجعة الإرسال')}
                    <ArrowRight size={16} style={lang === 'ar' ? { transform: 'scaleX(-1)' } : undefined} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info Form Panel (only in manual mode) */}
          {!smartMode && step === infoStepIndex && (
            <div className="citizen-panel">
              <div className="citizen-panel-head">
                <div className="citizen-panel-head-left">
                  <h2>{txt('Informations', 'المعلومات')}</h2>
                  <p>{txt('Remplissez les informations requises', 'املأ المعلومات المطلوبة')}</p>
                </div>
              </div>
              <div className="citizen-panel-body">
                {mode === 'ocr' && ocrPanel && (
                  <div className="citizen-ocr-strip" style={{ marginBottom: 18 }}>
                    <Sparkles size={16} />
                    <span>{txt("L'IA a prérempli le formulaire. Vérifiez les champs ci-dessous.", 'قام الذكاء الاصطناعي بملء الاستمارة. تحقق من الحقول.')}</span>
                  </div>
                )}
                <form className="agent-form" onSubmit={(e) => { e.preventDefault(); if (smartMode) { if (validateInfo()) setStep(3); } else if (validateInfo()) setStep(2); }}>
                  {config.sections.map((sec, i) => (
                    <fieldset key={sec.title_fr} className="agent-form-section">
                      <legend className="agent-form-section-legend">
                        <span className="agent-form-section-index">{String(i + 1).padStart(2, '0')}</span>
                        <span>{titleFor(sec)}</span>
                      </legend>
                      <div className="agent-form-grid">{sec.fields.map(renderField)}</div>
                    </fieldset>
                  ))}
                  <div className="citizen-actions-row" style={{ borderTop: 'none', marginTop: 8, paddingTop: 0 }}>
                    {onBack && (
                      <button type="button" className="citizen-btn-back" onClick={onBack}>
                        <ArrowLeft size={16} style={lang === 'ar' ? { transform: 'scaleX(-1)' } : undefined} />
                        {txt('Retour', 'السابق')}
                      </button>
                    )}
                    <button type="submit" className="citizen-btn-next">
                      {smartMode ? txt('Voir le récapitulatif', 'مراجعة الإرسال') : txt('Passer aux documents', 'الانتقال إلى الوثائق')}
                      <ArrowRight size={16} style={lang === 'ar' ? { transform: 'scaleX(-1)' } : undefined} />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Confirmation Panel (Editable Recap) */}
          {step === 3 && (
            <div className="citizen-panel">
              <div className="citizen-panel-head">
                <div className="citizen-panel-head-left">
                  <h2>{txt('Récapitulatif de la demande', 'مراجعة الطلب')}</h2>
                  <p>{txt("Cliquez sur un champ pour le modifier. Vérifiez avant de confirmer.", 'انقر على حقل لتعديله. تحقق قبل التأكيد.')}</p>
                </div>
              </div>
              <div className="citizen-panel-body">
                {smartMode && ocrPanel && (
                  <div className="citizen-ocr-strip" style={{ marginBottom: 18 }}>
                    <Sparkles size={16} />
                    <span>{txt("L'IA a prérempli le formulaire. Cliquez sur un champ pour le corriger.", 'قام الذكاء الاصطناعي بملء الاستمارة. انقر على حقل لتعديله.')}</span>
                  </div>
                )}
                <div className="agent-recap-grid">
                  {fields.map((f) => (
                    <React.Fragment key={f.name}>
                      {f.arabic ? (
                        <>
                          <div className="agent-recap-item">
                            <span className="agent-recap-label">{lang === 'ar' ? f.label_ar : `${f.label_fr} (arabe)`}</span>
                            {f.type === 'select' ? (
                              <select
                                className="agent-recap-value agent-recap-editable"
                                value={(formData[`${f.name}_ar`]) || ''}
                                onChange={(e) => setFormData((p) => ({ ...p, [`${f.name}_ar`]: e.target.value }))}
                                style={{ cursor: 'pointer' }}
                              >
                                <option value="">-</option>
                                {(f.options || []).map((o) => {
                                  const val = typeof o === 'string' ? o : o.value;
                                  const lbl = typeof o === 'string' ? o : (lang === 'ar' ? o.label_ar : o.label_fr);
                                  return <option key={val} value={val}>{lbl}</option>;
                                })}
                              </select>
                            ) : f.type === 'textarea' ? (
                              <textarea
                                className="agent-recap-value agent-recap-editable"
                                value={(formData[`${f.name}_ar`]) || ''}
                                onChange={(e) => {
                                  const val = filterByLang(e.target.value, 'ar');
                                  setFormData((p) => ({ ...p, [`${f.name}_ar`]: val }));
                                }}
                                rows={2}
                                style={{ resize: 'vertical', textAlign: 'right' }}
                              />
                            ) : (
                              <input
                                type={f.type || 'text'}
                                className="agent-recap-value agent-recap-editable"
                                value={(formData[`${f.name}_ar`]) || ''}
                                onChange={(e) => {
                                  const val = filterByLang(e.target.value, 'ar');
                                  setFormData((p) => ({ ...p, [`${f.name}_ar`]: val }));
                                }}
                                style={{ textAlign: 'right' }}
                              />
                            )}
                          </div>
                          <div className="agent-recap-item">
                            <span className="agent-recap-label">{lang === 'ar' ? `${f.label_ar} (فرنسية)` : f.label_fr}</span>
                            {f.type === 'textarea' ? (
                              <textarea
                                className="agent-recap-value agent-recap-editable"
                                value={(formData[f.name]) || ''}
                                onChange={(e) => {
                                  const val = filterByLang(e.target.value, 'fr');
                                  updateField(f, val);
                                }}
                                rows={2}
                                style={{ resize: 'vertical' }}
                              />
                            ) : (
                              <input
                                type={f.type || 'text'}
                                className="agent-recap-value agent-recap-editable"
                                value={(formData[f.name]) || ''}
                                onChange={(e) => {
                                  const val = filterByLang(e.target.value, 'fr');
                                  updateField(f, val);
                                }}
                              />
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="agent-recap-item">
                          <span className="agent-recap-label">{labelFor(f)}</span>
                          {f.type === 'select' ? (
                            <select
                              className="agent-recap-value agent-recap-editable"
                              value={formData[f.name] || ''}
                              onChange={(e) => updateField(f, e.target.value)}
                              style={{ cursor: 'pointer' }}
                            >
                              <option value="">-</option>
                              {(f.options || []).map((o) => {
                                const val = typeof o === 'string' ? o : o.value;
                                const lbl = typeof o === 'string' ? o : (lang === 'ar' ? o.label_ar : o.label_fr);
                                return <option key={val} value={val}>{lbl}</option>;
                              })}
                            </select>
                          ) : f.type === 'textarea' ? (
                            <textarea
                              className="agent-recap-value agent-recap-editable"
                              value={formData[f.name] || ''}
                              onChange={(e) => updateField(f, e.target.value)}
                              rows={2}
                              style={{ resize: 'vertical' }}
                            />
                          ) : (
                            <input
                              type={f.type || 'text'}
                              className="agent-recap-value agent-recap-editable"
                              value={formData[f.name] || ''}
                              onChange={(e) => updateField(f, e.target.value)}
                            />
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ marginTop: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <FileText size={14} style={{ color: 'var(--c-text-3)' }} />
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--c-text)' }}>{txt('Fichiers uploadés', 'ملفات مرفوعة')}</span>
                    <span className="citizen-prog-fraction"><span>{uploadedDocs.length}</span></span>
                  </div>
                  {uploadedDocs.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {uploadedDocs.map(([k, d]) => (
                        <div key={k} className="citizen-cl-item done" style={{ marginTop: 0 }}>
                          <div className="citizen-cl-dot" style={{ background: 'var(--c-accent)', borderColor: 'var(--c-accent)' }}>
                            <Check size={10} strokeWidth={3} />
                          </div>
                          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                          {d.size && <span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{formatBytes(d.size)}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="citizen-actions-row">
                  <button type="button" className="citizen-btn-back" onClick={() => setStep(smartMode ? 1 : 2)}>
                    <ArrowLeft size={16} style={lang === 'ar' ? { transform: 'scaleX(-1)' } : undefined} />
                    {txt('Retour', 'السابق')}
                  </button>
                  <button type="button" className="citizen-btn-next" onClick={handleSubmit} disabled={loading}>
                    {loading
                      ? txt('Envoi en cours...', 'جارٍ الإرسال...')
                      : txt('Confirmer et envoyer', 'تأكيد الإرسال')}
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── SIDEBAR ── */}
        <div className="citizen-sidebar">
          <SidebarLicenceCard licenceType={licenceType} lang={lang} onBack={onBack} />
          <SidebarProgression documents={smartDocuments} docsStatus={docsStatus} lang={lang} />
          {smartMode && <SidebarOcrInfo documents={smartDocuments} lang={lang} />}
        </div>
      </div>

      <ScannerModal open={scannerOpen} onClose={() => { setScannerOpen(false); setScannerTargetDoc(null); }} onCapture={handleScanFile} lang={lang} />
    </section>
  );
}
