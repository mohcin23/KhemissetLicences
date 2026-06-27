import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ocrAPI, notificationsAPI, citizenAPI } from '../../services/api';
import { getLicenceDocs, LICENCE_VIEW_META, mergeOcrIntoForm } from '../../constants/licenceConfig';
import { t } from '../../i18n/translations';
import { translateNotification } from '../../utils/notificationTranslator';
import { useTheme } from '../../contexts/ThemeContext';
import { STATUS_CONFIG } from '../../utils/workflowStatusConfig';
import { dateInputValue, formatRelativeTime } from '../../utils/formatters';
import { CitizenDemandeCard, CitizenDemandeForm, CitizenOcrBox } from '../../components/citizen';
import PiecesJointesPanel from '../../components/demandes/PiecesJointesPanel';
import LicenceSelector from '../../components/licences/LicenceSelector';
import DynamicLicenceForm from '../../components/licences/DynamicLicenceForm';
import Stepper from '../../components/licences/Stepper';
import WorkflowTimeline from '../../components/workflow/WorkflowTimeline';
import { ArrowLeft, Building2, Clock, FileText, MapPin, Phone, Mail, User, LayoutDashboard, Plus, MessageSquare, FolderOpen, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import CitizenAiChat from '../../components/citizen/CitizenAiChat';

const CITIZEN_DRAFT_KEY = 'draft_demande_citizen';

const PAGE_TO_PATH = {
  dashboard: 'dashboard',
  new: 'nouvelle-demande',
  track: 'suivi',
  correct: 'correction',
  contact: 'contact',
  success: 'succes',
};
const PATH_TO_PAGE = Object.fromEntries(Object.entries(PAGE_TO_PATH).map(([k, v]) => [v, k]));

const emptyForm = {
  nom_complet: '', cin: '', date_naissance: '',
  universite: '', diplome: '',
  adresse_complete: '',
  date_demande: '', date_izin: '', numero_izin: '',
  nom_massah: '', date_massah: '', date_lajna: '',
  commune: '', cercle: '',
  nom_complet_ar: '', universite_ar: '', diplome_ar: '',
  adresse_complete_ar: '', commune_ar: '', cercle_ar: '', nom_massah_ar: ''
};

const compressCitizenImageForOcr = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Lecture fichier échouée'));
  reader.onload = (event) => {
    const img = new window.Image();
    img.onerror = () => reject(new Error('Image illisible'));
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
      resolve({ base64: dataUrl.split(',')[1], previewUrl: dataUrl });
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

const filePreviewUrl = (file) => new Promise((resolve) => {
  if (!file?.type?.startsWith('image/')) return resolve(null);
  const reader = new FileReader();
  reader.onload = (event) => resolve(event.target.result);
  reader.onerror = () => resolve(null);
  reader.readAsDataURL(file);
});

const formFromDemande = (demande) => {
  let extraData = {};
  try {
    extraData = demande.extra_data && typeof demande.extra_data === 'string'
      ? JSON.parse(demande.extra_data)
      : demande.extra_data || {};
  } catch {}

  return {
    nom_complet: demande.nom_complet || '',
    cin: demande.cin || '',
    date_naissance: dateInputValue(demande.date_naissance),
    universite: demande.universite || '',
    diplome: demande.diplome || '',
    adresse_complete: demande.adresse_complete || '',
    date_demande: dateInputValue(demande.date_demande),
    date_izin: dateInputValue(demande.date_izin),
    numero_izin: demande.numero_izin || '',
    nom_massah: demande.nom_massah || '',
    date_massah: dateInputValue(demande.date_massah),
    date_lajna: dateInputValue(demande.date_lajna),
    commune: demande.commune || '',
    cercle: demande.cercle || '',
    nom_complet_ar: extraData.nom_complet_ar || '',
    universite_ar: extraData.universite_ar || '',
    diplome_ar: extraData.diplome_ar || '',
    adresse_complete_ar: extraData.adresse_complete_ar || '',
    commune_ar: extraData.commune_ar || '',
    cercle_ar: extraData.cercle_ar || '',
    nom_massah_ar: extraData.nom_massah_ar || '',
  };
};

export default function CitizenPortal({ lang: initialLang, setLang: setGlobalLang, authUser, handleLogout, showToast, toast }) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const getPageFromPath = useCallback(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const slug = segments[1] || 'dashboard';
    return PATH_TO_PAGE[slug] || 'dashboard';
  }, [location.pathname]);

  const page = getPageFromPath();

  const navigateTo = useCallback((newPage, extra = {}) => {
    const slug = PAGE_TO_PATH[newPage] || 'dashboard';
    const path = extra.numero ? `/citizen/${slug}/${extra.numero}` : `/citizen/${slug}`;
    navigate(path);
  }, [navigate]);
  const [demandes, setDemandes] = useState([]);
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [correctionForm, setCorrectionForm] = useState(emptyForm);
  const [mode, setMode] = useState('ocr');
  const [licenceType, setLicenceType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submittedNumero, setSubmittedNumero] = useState('');
  const [citizenNotifications, setCitizenNotifications] = useState([]);
  const [citizenUnreadCount, setCitizenUnreadCount] = useState(0);
  const [citizenNotifOpen, setCitizenNotifOpen] = useState(false);
  const [citizenNotifLoading, setCitizenNotifLoading] = useState(false);
  const [citizenDraft, setCitizenDraft] = useState(null);
  const [publicTrackNum, setPublicTrackNum] = useState('');
  const [publicTrackResult, setPublicTrackResult] = useState(null);
  const [publicTrackLoading, setPublicTrackLoading] = useState(false);
  const [publicTrackError, setPublicTrackError] = useState('');
  const [cancelConfirmId, setCancelConfirmId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [citizenLang, setCitizenLang] = useState(() => {
    try { return localStorage.getItem('citizen_ui_lang') || 'fr'; } catch { return 'fr'; }
  });
  const isRtl = citizenLang === 'ar';
  const showCitizenToast = useRef(showToast);
  const notifRef = useRef(null);
  const avatarRef = useRef(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const restoreCitizenDraft = () => {
    if (citizenDraft) {
      setForm(prev => ({ ...prev, ...citizenDraft }));
      setCitizenDraft(null);
    }
  };

  const ignoreCitizenDraft = () => {
    localStorage.removeItem(CITIZEN_DRAFT_KEY);
    setCitizenDraft(null);
  };

  const handleLangToggle = () => {
    const next = citizenLang === 'fr' ? 'ar' : 'fr';
    setCitizenLang(next);
    try { localStorage.setItem('citizen_ui_lang', next); } catch {}
    setGlobalLang(next);
  };

  useEffect(() => {
    if (!citizenNotifOpen) return;
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setCitizenNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [citizenNotifOpen]);

  useEffect(() => {
    if (!avatarOpen) return;
    const handleClickOutside = (e) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [avatarOpen]);

  useEffect(() => {
    showCitizenToast.current = showToast;
  }, [showToast]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CITIZEN_DRAFT_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && Object.values(data).some(value => value && String(value).trim())) {
          setCitizenDraft(data);
        }
      }
    } catch (err) {
      // ignore malformed draft
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const hasData = Object.values(form).some(value => value && String(value).trim());
      if (hasData) {
        localStorage.setItem(CITIZEN_DRAFT_KEY, JSON.stringify(form));
        setCitizenDraft(form);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [form]);

  const fetchCitizenNotificationCount = useCallback(async () => {
    try {
      const res = await notificationsAPI.getCount();
      setCitizenUnreadCount(res.data.unread || 0);
    } catch {
      // ignore
    }
  }, []);

  const [citizenNotifPage, setCitizenNotifPage] = useState(1);
  const [citizenNotifHasMore, setCitizenNotifHasMore] = useState(false);

  const fetchCitizenNotifications = useCallback(async (pageNumber = 1, unreadOnly = false) => {
    setCitizenNotifLoading(true);
    try {
      const res = await notificationsAPI.getAll({ page: pageNumber, limit: 10, unreadOnly });
      const data = res.data.data || [];
      setCitizenNotifications(prev => (pageNumber > 1 ? [...prev, ...data] : data));
      setCitizenNotifPage(pageNumber);
      setCitizenNotifHasMore(Boolean(res.data.has_more));
    } catch (err) {
      showCitizenToast.current(err.response?.data?.message || t(citizenLang, 'loadError'), 'error');
    } finally {
      setCitizenNotifLoading(false);
    }
  }, [citizenLang]);

  useEffect(() => {
    fetchCitizenNotificationCount();
    const timer = setInterval(fetchCitizenNotificationCount, 30000);
    return () => clearInterval(timer);
  }, [fetchCitizenNotificationCount]);

  const toggleCitizenNotifications = async () => {
    setCitizenNotifOpen(open => !open);
    if (!citizenNotifOpen) {
      await fetchCitizenNotifications(1);
    }
  };

  const loadMoreCitizenNotifications = async () => {
    await fetchCitizenNotifications(citizenNotifPage + 1);
  };

  const handleCitizenNotificationClick = async (notif) => {
    try {
      if (!notif.is_read) {
        await notificationsAPI.markRead(notif.id);
        setCitizenUnreadCount(count => Math.max(0, count - 1));
      }
    } catch {
      // ignore
    }
    if (notif.demande_id) {
      try {
        const res = await citizenAPI.getById(notif.demande_id);
        setSelectedDemande(res.data.data);
        navigateTo('track', { numero: res.data.data.numero_dossier });
        setCitizenNotifOpen(false);
        loadPiecesJointes(res.data.data.id);
      } catch {
        showCitizenToast.current(t(citizenLang, 'toastDemandeNotFound'), 'error');
      }
    }
  };

  const markAllCitizenNotificationsRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setCitizenUnreadCount(0);
      setCitizenNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      showCitizenToast.current(t(citizenLang, 'toastDemandeNotFound'));
    } catch {
      showCitizenToast.current(t(citizenLang, 'toastError'), 'error');
    }
  };

  const handlePublicTrack = async () => {
    if (!publicTrackNum.trim()) return;
    setPublicTrackLoading(true);
    setPublicTrackError('');
    setPublicTrackResult(null);
    try {
      const res = await citizenAPI.trackPublic(publicTrackNum.trim());
      setPublicTrackResult(res.data.data);
    } catch (err) {
      setPublicTrackError(err.response?.status === 404
        ? 'Dossier introuvable / الملف غير موجود'
        : 'Erreur de connexion / خطأ في الاتصال');
    } finally {
      setPublicTrackLoading(false);
    }
  };

  const loadDemandes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await citizenAPI.getMine();
      setDemandes(res.data.data || []);
    } catch (err) {
      showCitizenToast.current(err.response?.data?.message || t(citizenLang, 'loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }, [citizenLang]);

  useEffect(() => {
    loadDemandes();
  }, [loadDemandes]);

  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [pharmacyScannerOpen, setPharmacyScannerOpen] = useState(false);

  const validateCitizenForm = (data) =>
    data.nom_complet.trim() && data.cin.trim() && data.adresse_complete.trim() && data.commune.trim() && data.cercle.trim();

  const allRequiredDocsUploaded = () =>
    getLicenceDocs('pharmacie').every(doc => uploadedDocs.find(u => u.docKey === doc.key));

  const isPharmacySmartFlow = licenceType === 'pharmacie' && mode === 'ocr';
  const isPharmacyOcrBusy = uploadedDocs.some(doc => ['compressing', 'analyzing'].includes(doc.ocrStatus));
  const [pharmacyScannerTargetDoc, setPharmacyScannerTargetDoc] = useState(null);

  const handlePharmacyScanFile = async (file) => {
    if (!pharmacyScannerTargetDoc || !file) return;
    await handlePharmacyDocFileChange(pharmacyScannerTargetDoc, file);
    setPharmacyScannerTargetDoc(null);
  };

  const runPharmacyOcr = async (doc, file) => {
    if (!doc?.ocr || !file?.type?.startsWith('image/')) return;

    setUploadedDocs(prev => prev.map(item =>
      item.docKey === doc.key ? { ...item, ocrStatus: 'analyzing' } : item
    ));

    try {
      const { base64 } = await compressCitizenImageForOcr(file);
      const textRes = await ocrAPI.extractText(base64, 'image/jpeg');
      if (!textRes.data?.success) throw new Error(textRes.data?.message || 'Extraction OCR échouée');

      const analyzeRes = await ocrAPI.analyzeTexts([{
        name: doc.label_fr,
        text: textRes.data.text || '',
        prompt: doc.ocr_prompt,
      }]);
      if (!analyzeRes.data?.success || !analyzeRes.data?.extracted) {
        throw new Error('Analyse IA échouée');
      }

      const extracted = analyzeRes.data.extracted || {};
      setForm(prev => mergeOcrIntoForm(prev, extracted));
      setUploadedDocs(prev => prev.map(item =>
        item.docKey === doc.key ? { ...item, ocrStatus: 'done', extracted } : item
      ));
    } catch (err) {
      setUploadedDocs(prev => prev.map(item =>
        item.docKey === doc.key ? { ...item, ocrStatus: 'error', ocrError: err.message } : item
      ));
    }
  };

  const handlePharmacyDocFileChange = async (doc, file) => {
    if (!file) return;
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const previewUrl = await filePreviewUrl(file);
    const supportsSmartRead = mode === 'ocr' && doc.ocr && file.type.startsWith('image/');
    const uploaded = {
      id,
      file,
      name: file.name,
      type: file.type,
      previewUrl,
      docKey: doc.key,
      ocrStatus: supportsSmartRead ? 'analyzing' : (doc.ocr ? 'skipped' : 'not_supported'),
    };

    setUploadedDocs(prev => [
      ...prev.filter(item => item.docKey !== doc.key),
      uploaded,
    ]);

    if (supportsSmartRead) {
      await runPharmacyOcr(doc, file);
    }
  };

  const openTrack = async (demande) => {
    setLoading(true);
    try {
      const res = await citizenAPI.getById(demande.id);
      setSelectedDemande(res.data.data);
      navigateTo('track', { numero: demande.numero_dossier });
      loadPiecesJointes(demande.id);
    } catch (err) {
      showCitizenToast.current(err.response?.data?.message || t(citizenLang, 'toastDemandeNotFound'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCorrection = async (demande) => {
    setLoading(true);
    try {
      const res = await citizenAPI.getById(demande.id);
      const current = res.data.data;
      setSelectedDemande(current);
      setCorrectionForm(formFromDemande(current));
      navigateTo('correct', { numero: current.numero_dossier });
    } catch (err) {
      showCitizenToast.current(err.response?.data?.message || t(citizenLang, 'toastDemandeNotFound'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const [pjUploaded, setPjUploaded] = useState([]);
  const [pjPanelLoading, setPjPanelLoading] = useState(false);

  const loadPiecesJointes = async (demandeId) => {
    setPjPanelLoading(true);
    try {
      const res = await citizenAPI.listPiecesJointes(demandeId);
      setPjUploaded(res.data.data || []);
    } catch {
      setPjUploaded([]);
    } finally {
      setPjPanelLoading(false);
    }
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
    await citizenAPI.uploadPiecesJointes(demandeId, fichiers);
  };

  const submitDemande = async (e) => {
    e.preventDefault();
    if (!validateCitizenForm(form) || !allRequiredDocsUploaded()) {
      showCitizenToast.current(t(citizenLang, 'required'), 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await citizenAPI.create({ ...form, licence_type: licenceType || 'pharmacie' });
      const created = res.data.data;

      if (uploadedDocs.length > 0) {
        try {
          await uploadFiles(created.id, uploadedDocs);
          setUploadedDocs([]);
        } catch (pjErr) {
          showCitizenToast.current(
            isRtl ? 'تم إرسال الطلب، لكن فشل رفع بعض الوثائق' : "Demande envoyée mais échec de l'envoi de certains fichiers",
            'warning'
          );
        }
      }

      setSubmittedNumero(created.numero_dossier);
      setSelectedDemande(created);
      await loadPiecesJointes(created.id);
      setForm(emptyForm);
      localStorage.removeItem(CITIZEN_DRAFT_KEY);
      setCitizenDraft(null);
      await loadDemandes();
    } catch (err) {
      showCitizenToast.current(err.response?.data?.message || t(citizenLang, 'errorCreate'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitCorrection = async (e) => {
    e.preventDefault();
    if (!selectedDemande || !validateCitizenForm(correctionForm)) {
      showCitizenToast.current(t(citizenLang, 'required'), 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await citizenAPI.update(selectedDemande.id, correctionForm);
      setSelectedDemande(res.data.data);
      await loadDemandes();
      navigateTo('track', { numero: res.data.data.numero_dossier });
      showCitizenToast.current(t(citizenLang, 'authGatewayCorrectBtn'));
    } catch (err) {
      showCitizenToast.current(err.response?.data?.message || t(citizenLang, 'errorCreate'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDemande = async (demandeId) => {
    try {
      await citizenAPI.annuler(demandeId);
      await loadDemandes();
      if (selectedDemande?.id === demandeId) {
        const res = await citizenAPI.getById(demandeId);
        setSelectedDemande(res.data.data);
      }
      showCitizenToast.current(t(citizenLang, 'cancelRequestSuccess'), 'success');
    } catch (err) {
      showCitizenToast.current(err.response?.data?.message || t(citizenLang, 'cancelRequestError'), 'error');
    }
  };

  const applyOcrToForm = (data) => {
    if (page === 'correct') {
      setCorrectionForm(prev => ({ ...prev, ...data }));
    } else {
      setForm(prev => ({ ...prev, ...data }));
    }
  };

  const submitLicenceRequest = async (data) => {
    setLoading(true);
    try {
      const pendingFiles = data?._pendingFiles || [];
      const { _pendingFiles, ...licenceData } = data || {};
      const body = { ...form, ...licenceData, licence_type: licenceType || 'pharmacie' };
      const res = await citizenAPI.create(body);
      const created = res.data.data;

      if (pendingFiles.length > 0) {
        await uploadFiles(created.id, pendingFiles);
      }

      setSubmittedNumero(created.numero_dossier);
      setSelectedDemande(created);
      await loadPiecesJointes(created.id);
      setForm(emptyForm);
      setLicenceType(null);
      localStorage.removeItem(CITIZEN_DRAFT_KEY);
      setCitizenDraft(null);
      await loadDemandes();
      navigateTo('success');
    } catch (err) {
      showCitizenToast.current(err.response?.data?.message || t(citizenLang, 'errorCreate'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${isRtl ? 'font-[Cairo]' : ''} min-h-screen bg-slate-50 dark:bg-slate-950 text-[#0f172a] dark:text-slate-100 transition-colors duration-200 px-0 sm:px-0`} dir={isRtl ? 'rtl' : 'ltr'}>
      {toast && <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-xl text-sm font-bold shadow-[0_10px_40px_rgba(0,0,0,0.2)] animate-[slideDown_0.3s_ease] ${toast.type === 'success' ? 'bg-accent-500 text-white' : toast.type === 'error' ? 'bg-[#dc2626] text-white' : 'bg-[#2563eb] text-white'}`}>{toast.msg}</div>}

      <header className="bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 backdrop-blur-md shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo + Title */}
          <div className="flex items-center gap-3 flex-none min-w-0">
            <div className="w-11 h-11 rounded-xl overflow-hidden ring-2 ring-slate-100 dark:ring-slate-700 shrink-0">
              <img src="/logo.jpg" alt="" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">{t(citizenLang, 'headerProvinceName')}</h1>
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tracking-wide mt-0.5">{t(citizenLang, 'headerCitizenSpace')}</p>
            </div>
          </div>

          {/* Desktop: Navigation + Actions */}
          <div className="hidden md:flex items-center gap-3 flex-none">
            {/* Navigation */}
            <button onClick={() => { navigateTo('dashboard'); setSubmittedNumero(''); }} className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${page === 'dashboard' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
              <LayoutDashboard className="w-4 h-4" />
              {t(citizenLang, 'authGatewayMyRequests')}
            </button>
            <button onClick={() => { navigateTo('new'); setSubmittedNumero(''); setLicenceType(null); }} className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${page === 'new' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
              <Plus className="w-4 h-4" />
              {t(citizenLang, 'authGatewayNewRequest')}
            </button>
            <button onClick={() => { navigateTo('contact'); setSubmittedNumero(''); }} className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${page === 'contact' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
              <MessageSquare className="w-4 h-4" />
              {t(citizenLang, 'headerContact')}
            </button>

            <div className="h-7 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

            {/* Utilities */}
            <div className="relative" ref={notifRef}>
              <button type="button" className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={t(citizenLang, 'notifTitle')} onClick={toggleCitizenNotifications}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                {citizenUnreadCount > 0 && <span className="absolute -top-[5px] end-[-5px] min-w-[18px] h-[18px] px-[4px] rounded-full bg-red-500 text-white text-[10px] font-bold leading-none inline-flex items-center justify-center border-[2px] border-white dark:border-slate-900">{citizenUnreadCount > 99 ? '99+' : citizenUnreadCount}</span>}
              </button>
              {citizenNotifOpen && (
                <div className="absolute top-full end-0 mt-2 w-[min(380px,calc(100vw-32px))] overflow-hidden border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08)] dark:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] z-80">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 rounded-t-2xl">
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mb-1">{t(citizenLang, 'notifDropdownTitle')}</p>
                    <button type="button" className="text-xs font-bold text-emerald-600 cursor-pointer bg-transparent border-none" onClick={markAllCitizenNotificationsRead}>
                      {t(citizenLang, 'notifMarkAllRead')}
                    </button>
                  </div>
                  <div className="p-2">
                    {citizenNotifLoading ? (
                      <div className="p-4 text-center text-slate-500 text-sm">{t(citizenLang, 'notifLoading')}</div>
                    ) : citizenNotifications.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">{t(citizenLang, 'notifEmptyList')}</div>
                    ) : (
                      <>
                        {citizenNotifications.map(notif => {
                          const translated = translateNotification(notif, citizenLang);
                          return (
                          <button key={notif.id} type="button" className={`w-full block border-0 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 rounded-xl text-slate-800 dark:text-slate-200 text-start cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors${notif.is_read ? '' : ' bg-emerald-50/50 dark:bg-emerald-900/20 shadow-[inset_3px_0_0_#10b981]'}`} onClick={() => handleCitizenNotificationClick(notif)}>
                            <strong className="block text-sm">{translated.titre}</strong>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{translated.message}</p>
                            <small className="mt-1.5 block text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(notif.created_at, citizenLang)}</small>
                          </button>
                          );
                        })}
                        {citizenNotifHasMore && (
                          <button type="button" className="w-full border-0 bg-transparent text-emerald-600 cursor-pointer font-bold p-3 text-center text-sm" onClick={loadMoreCitizenNotifications}>
                            {t(citizenLang, 'notifViewAll')}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 shadow-inner">
              <button className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${citizenLang === 'ar' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`} onClick={() => { if (citizenLang !== 'ar') handleLangToggle(); }}>AR</button>
              <button className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${citizenLang === 'fr' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`} onClick={() => { if (citizenLang !== 'fr') handleLangToggle(); }}>FR</button>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all"
              aria-label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            >
              {theme === 'dark' ? (
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              ) : (
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
              )}
            </button>

            <div className="h-7 w-px bg-slate-200 dark:bg-slate-700"></div>

            <div className="relative profile-group cursor-pointer" ref={avatarRef}>
              <div className="flex items-center gap-2" onClick={() => setAvatarOpen(!avatarOpen)}>
                <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {(authUser.full_name || authUser.username || 'C')[0].toUpperCase()}
                </div>
                <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${avatarOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
              </div>

              {avatarOpen && (
                <div className="absolute end-0 mt-2 w-64 max-w-[calc(100vw-32px)] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 py-4 z-50">
                  <div className="px-5 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">{t(citizenLang, 'connectedLabel')}</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">{authUser.full_name || authUser.username}</p>
                  </div>
                  <div className="pt-2">
                    <button className="w-full flex items-center px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group bg-transparent border-none cursor-pointer">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center ms-3 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t(citizenLang, 'settingsLabel')}</span>
                    </button>
                    <button className="w-full flex items-center px-5 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group bg-transparent border-none cursor-pointer" onClick={handleLogout}>
                      <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center ms-3 text-red-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                      </div>
                      <span className="text-sm font-bold text-red-500">{t(citizenLang, 'deconnexion')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
            {/* Mobile: bell + hamburger */}
            <div className="flex md:hidden items-center gap-1">
              <div className="relative" ref={notifRef}>
                <button type="button" className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={t(citizenLang, 'notifTitle')} onClick={toggleCitizenNotifications}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                  {citizenUnreadCount > 0 && <span className="absolute -top-[5px] end-[-5px] min-w-[18px] h-[18px] px-[4px] rounded-full bg-red-500 text-white text-[10px] font-bold leading-none inline-flex items-center justify-center border-[2px] border-white dark:border-slate-900">{citizenUnreadCount > 99 ? '99+' : citizenUnreadCount}</span>}
                </button>
                {citizenNotifOpen && (
                  <div className="absolute top-full end-0 mt-2 w-[min(340px,calc(100vw-24px))] overflow-hidden border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] z-80">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 rounded-t-2xl">
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mb-1">{t(citizenLang, 'notifDropdownTitle')}</p>
                      <button type="button" className="text-xs font-bold text-emerald-600 cursor-pointer bg-transparent border-none" onClick={markAllCitizenNotificationsRead}>
                        {t(citizenLang, 'notifMarkAllRead')}
                      </button>
                    </div>
                    <div className="p-2">
                      {citizenNotifLoading ? (
                        <div className="p-4 text-center text-slate-500 text-sm">{t(citizenLang, 'notifLoading')}</div>
                      ) : citizenNotifications.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-sm">{t(citizenLang, 'notifEmptyList')}</div>
                      ) : (
                        <>
                          {citizenNotifications.map(notif => {
                            const translated = translateNotification(notif, citizenLang);
                            return (
                            <button key={notif.id} type="button" className={`w-full block border-0 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 rounded-xl text-slate-800 dark:text-slate-200 text-start cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors${notif.is_read ? '' : ' bg-emerald-50/50 dark:bg-emerald-900/20 shadow-[inset_3px_0_0_#10b981]'}`} onClick={() => handleCitizenNotificationClick(notif)}>
                              <strong className="block text-sm">{translated.titre}</strong>
                              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{translated.message}</p>
                              <small className="mt-1.5 block text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(notif.created_at, citizenLang)}</small>
                            </button>
                            );
                          })}
                          {citizenNotifHasMore && (
                            <button type="button" className="w-full border-0 bg-transparent text-emerald-600 cursor-pointer font-bold p-3 text-center text-sm" onClick={loadMoreCitizenNotifications}>
                              {t(citizenLang, 'notifViewAll')}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button type="button" className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0" onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label="Menu">
                <div className="w-5 h-4 flex flex-col justify-between">
                  <span className={`block h-[1.5px] rounded-full bg-slate-600 dark:bg-slate-300 transition-all duration-300 origin-center ${mobileNavOpen ? 'rotate-45 translate-y-[5px]' : ''}`}></span>
                  <span className={`block h-[1.5px] rounded-full bg-slate-600 dark:bg-slate-300 transition-all duration-300 ${mobileNavOpen ? 'opacity-0 scale-x-0' : ''}`}></span>
                  <span className={`block h-[1.5px] rounded-full bg-slate-600 dark:bg-slate-300 transition-all duration-300 origin-center ${mobileNavOpen ? '-rotate-45 -translate-y-[5px]' : ''}`}></span>
                </div>
              </button>
            </div>
          </div>
      </header>

      {/* Mobile Nav Overlay */}
      <div className={`md:hidden fixed inset-0 top-20 z-40 transition-all duration-300 ${mobileNavOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)}></div>
        <nav className={`relative bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-xl transition-all duration-300 ${mobileNavOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
          <div className="px-4 py-3 space-y-1">
            <button onClick={() => { navigateTo('dashboard'); setSubmittedNumero(''); setMobileNavOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${page === 'dashboard' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-[#10B981] shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              {t(citizenLang, 'authGatewayMyRequests')}
            </button>
            <button onClick={() => { navigateTo('new'); setSubmittedNumero(''); setLicenceType(null); setMobileNavOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${page === 'new' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-[#10B981] shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              {t(citizenLang, 'authGatewayNewRequest')}
            </button>
            <button onClick={() => { navigateTo('contact'); setSubmittedNumero(''); setMobileNavOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${page === 'contact' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-[#10B981] shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              {t(citizenLang, 'headerContact')}
            </button>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 shadow-inner">
                <button className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${citizenLang === 'ar' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`} onClick={() => { if (citizenLang !== 'ar') handleLangToggle(); }}>AR</button>
                <button className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${citizenLang === 'fr' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`} onClick={() => { if (citizenLang !== 'fr') handleLangToggle(); }}>FR</button>
              </div>

              <button type="button" onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all" aria-label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}>
                {theme === 'dark' ? (
                  <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                ) : (
                  <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {(authUser.full_name || authUser.username || 'C')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{authUser.full_name || authUser.username}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">{t(citizenLang, 'citizen')}</p>
              </div>
              <button onClick={handleLogout} className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              </button>
            </div>
          </div>
        </nav>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pb-[70px] dark:text-slate-100">
        {page === 'dashboard' && (
          <section className="flex flex-col gap-6">
            <div className="md:flex md:items-center md:justify-between mb-2 pt-6 sm:pt-8">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">{t(citizenLang, 'authGatewayMyRequests')}</h2>
                <p className="text-sm text-[#64748B] dark:text-slate-400 mt-2">{citizenLang === 'ar'
                  ? 'كل طلباتك، الوثائق، الملاحظات والتصحيحات في مكان واحد.'
                  : 'Suivez l\'état d\'avancement de vos dossiers, complétez vos documents et téléchargez vos licences en un seul endroit.'}</p>
              </div>
              <div className="mt-4 md:mt-0 md:ml-4">
                <button onClick={() => { navigateTo('new'); setSubmittedNumero(''); setLicenceType(null); }} className="inline-flex items-center px-6 py-3.5 border border-transparent rounded-xl shadow-lg shadow-emerald-500/30 text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] transition-all transform hover:-translate-y-0.5">
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
                  {t(citizenLang, 'authGatewayNewRequestBtn')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-10">
              <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center text-center transition-shadow hover:shadow-md">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-400 mb-3">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">{citizenLang === 'ar' ? 'إجمالي الطلبات' : 'Total Déposées'}</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white leading-none">{loading ? '...' : demandes.length}</h3>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center text-center transition-shadow hover:shadow-md">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-500 mb-3">
                  <Clock className="w-5 h-5" />
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">{citizenLang === 'ar' ? 'في المعالجة' : 'En cours d\'étude'}</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white leading-none">{loading ? '...' : demandes.filter(d => !['accepte', 'refuse'].includes(d.statut)).length}</h3>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center text-center transition-shadow hover:shadow-md">
                {(() => {
                  const corrigerCount = demandes.filter(d => ['fichier_rejete', 'documents_rejetes'].includes(d.statut)).length;
                  return (
                    <>
                      <div className={`p-2.5 rounded-xl inline-block mb-3 ${corrigerCount > 0 ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-500' : 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">{citizenLang === 'ar' ? 'تتطلب تصحيحا' : 'À corriger'}</p>
                    </>
                  );
                })()}
                <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white leading-none">{loading ? '...' : demandes.filter(d => ['fichier_rejete', 'documents_rejetes'].includes(d.statut)).length}</h3>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center text-center transition-shadow hover:shadow-md">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-[#10B981] mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">{citizenLang === 'ar' ? 'طلبات مقبولة' : 'Acceptées'}</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white leading-none">{loading ? '...' : demandes.filter(d => d.statut === 'accepte').length}</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 sm:mb-10 overflow-hidden">
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-[#0F172A] dark:bg-slate-600 flex items-center justify-center shrink-0">
                    <Search className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0F172A] dark:text-white">{citizenLang==='ar' ? 'تتبع ملف برقم الملف' : 'Recherche rapide'}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{citizenLang==='ar' ? 'أدخل رقم الملف لمعرفة حالته فوراً.' : 'Entrez un numéro de dossier pour connaître son état instantanément.'}</p>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-5 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1 relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <FileText className="w-4 h-4" />
                    </div>
                    <input
                      value={publicTrackNum}
                      onChange={e => setPublicTrackNum(e.target.value)}
                      onKeyDown={e => e.key==='Enter' && handlePublicTrack()}
                      placeholder={citizenLang==='ar' ? 'مثال: KH-2026-XXXXX' : 'Ex: KH-2026-XXXXX'}
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981] transition-all"
                    />
                  </div>
                  <button
                    onClick={handlePublicTrack}
                    disabled={publicTrackLoading || !publicTrackNum.trim()}
                    className="inline-flex items-center justify-center gap-2 bg-[#10B981] hover:bg-[#059669] disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-semibold px-7 py-3 rounded-xl transition-all shrink-0 shadow-md hover:shadow-lg"
                  >
                    {publicTrackLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    {citizenLang==='ar' ? 'بحث' : 'Chercher'}
                  </button>
                </div>
              </div>
            </div>

            {publicTrackError && (
              <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 rounded-xl px-4 sm:px-5 py-3 sm:py-3.5 flex items-center gap-3">
                <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
                <p className="text-sm font-semibold text-red-700">{publicTrackError}</p>
              </div>
            )}

            {publicTrackResult && (
              <div className="mb-4 sm:mb-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="h-1" style={{
                  background: `linear-gradient(to right, ${STATUS_CONFIG[publicTrackResult.statut]?.border || '#e2e8f0'}, ${STATUS_CONFIG[publicTrackResult.statut]?.color || '#64748b'})`
                }} />
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
                        style={{ background: STATUS_CONFIG[publicTrackResult.statut]?.bg || '#f1f5f9' }}>
                        {STATUS_CONFIG[publicTrackResult.statut]?.icon || '📄'}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                          {citizenLang === 'ar' ? 'رقم الملف' : 'Dossier'}
                        </p>
                        <p className="font-mono text-lg font-black text-[#0F172A]">{publicTrackResult.numero_dossier}</p>
                        <p className="text-sm font-semibold text-slate-600 mt-0.5">{publicTrackResult.nom_complet}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl shrink-0"
                      style={{
                        background: STATUS_CONFIG[publicTrackResult.statut]?.bg || '#f1f5f9',
                        color: STATUS_CONFIG[publicTrackResult.statut]?.color || '#475569',
                        border: `1px solid ${STATUS_CONFIG[publicTrackResult.statut]?.border || '#e2e8f0'}`
                      }}>
                      {STATUS_CONFIG[publicTrackResult.statut]?.icon}
                      {(citizenLang === 'ar'
                        ? STATUS_CONFIG[publicTrackResult.statut]?.label_ar
                        : STATUS_CONFIG[publicTrackResult.statut]?.label_fr) || publicTrackResult.statut}
                    </span>
                  </div>
                  {publicTrackResult.statut === 'accepte_definitif' && (
                    <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-semibold text-emerald-700 flex items-center gap-2.5">
                      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      {citizenLang==='ar'
                        ? 'رخصتك مقبولة. يمكنك التوجه إلى الإدارة لاستلامها.'
                        : 'Licence approuvée. Vous pouvez vous présenter à l\'administration pour la récupérer.'}
                    </div>
                  )}
                  {(publicTrackResult.statut === 'refuse_gouverneur' || publicTrackResult.statut === 'refuse_employe') && publicTrackResult.motif_rejet_fichier && (
                    <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm font-semibold text-red-700 flex items-center gap-2.5">
                      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
                      {publicTrackResult.motif_rejet_fichier}
                    </div>
                  )}
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-12"><div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div></div>
            ) : demandes.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-8 sm:p-12 text-center">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="12" y="16" width="56" height="56" rx="8" stroke="#e2e8f0" stroke-width="2" fill="#f8fafc"/>
                  <rect x="20" y="26" width="40" height="4" rx="2" fill="#e2e8f0"/>
                  <rect x="20" y="36" width="28" height="4" rx="2" fill="#e2e8f0"/>
                  <rect x="20" y="46" width="34" height="4" rx="2" fill="#e2e8f0"/>
                  <rect x="20" y="56" width="18" height="4" rx="2" fill="#e2e8f0"/>
                  <circle cx="64" cy="18" r="12" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
                  <text x="64" y="22" textAnchor="middle" fill="#94a3b8" fontSize="14" fontWeight="bold">?</text>
                </svg>
                <h2 className="text-slate-700 dark:text-slate-200 text-base font-semibold mb-1.5 mt-4">{t(citizenLang, 'authGatewayEmptyTitle')}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-5 max-w-[400px] mx-auto">{t(citizenLang, 'authGatewayEmptyDesc')}</p>
                <button className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg shadow-emerald-500/30 text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] transition-all transform hover:-translate-y-0.5" onClick={() => { navigateTo('new'); setLicenceType(null); }}>{t(citizenLang, 'authGatewayEmptyBtn')}</button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {demandes.map(demande => (
                  <CitizenDemandeCard
                    key={demande.id}
                    demande={demande}
                    lang={citizenLang}
                    onTrack={() => openTrack(demande)}
                    onCorrect={() => openCorrection(demande)}
                    onNewRequest={() => { navigateTo('new'); setSubmittedNumero(''); setLicenceType(null); }}
                    onCancel={handleCancelDemande}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {page === 'new' && (
          <section className="flex flex-col gap-6 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pb-[80px] animate-fade-in">
            {citizenDraft && (
              <div className="bg-[#f0f7ff] dark:bg-blue-900/20 border border-[#a5d8ff] dark:border-blue-800 rounded-lg text-[#055160] dark:text-blue-200 mt-3 p-[10px_12px]">
                <p>{t(citizenLang, 'authGatewayDraftAlert')}</p>
                <div className="flex gap-2 mt-[10px]">
                  <button type="button" className="border-none rounded-lg cursor-pointer p-[8px_14px]" onClick={restoreCitizenDraft}>{t(citizenLang, 'authGatewayRestoreBtn')}</button>
                  <button type="button" className="border-none rounded-lg cursor-pointer p-[8px_14px] bg-[#f8fafc] dark:bg-slate-700 border border-[#cbd5e1] dark:border-slate-600 text-[#0f172a] dark:text-slate-200" onClick={ignoreCitizenDraft}>{t(citizenLang, 'authGatewayIgnoreBtn')}</button>
                </div>
              </div>
            )}

            {licenceType === null && (
              <>
                <div className="mb-2 pt-8 px-0">
                  <h2 className="text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">{citizenLang === 'ar' ? 'طلب جديد' : 'Nouvelle demande'}</h2>
                  <p className="text-sm text-[#64748B] dark:text-slate-400 mt-2">{citizenLang === 'ar'
                    ? 'اختر نوع الرخصة لبدء طلبك.'
                    : "Sélectionnez le type de licence pour commencer votre demande."}</p>
                </div>
                <Stepper currentStep={1} lang={citizenLang} />
              </>
            )}

            {licenceType === null ? (
              <LicenceSelector
                lang={citizenLang}
                onSelect={(type) => {
                  setLicenceType(type);
                }}
              />
            ) : (
              <DynamicLicenceForm
                licenceType={licenceType}
                lang={citizenLang}
                initialData={form}
                onBack={() => setLicenceType(null)}
                onSubmit={submitLicenceRequest}
                mode={mode}
                onModeChange={(nextMode) => { setMode(nextMode); setUploadedDocs([]); }}
                licenceDocuments={getLicenceDocs(licenceType)}
              />
            )}
          </section>
        )}

        {page === 'success' && (
          <section className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-10 sm:p-14">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white mb-3">
                {citizenLang === 'ar' ? 'تم تسجيل طلبك بنجاح' : 'Demande enregistrée avec succès'}
              </h1>
              <p className="text-sm text-[#64748B] dark:text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                {citizenLang === 'ar'
                  ? 'تم استلام طلبك وسيتم معالجته في أقرب وقت. يمكنك تتبع حالته من لوحة التحكم.'
                  : 'Votre demande a bien été reçue et sera traitée dans les meilleurs délais. Vous pouvez suivre son avancement depuis votre tableau de bord.'}
              </p>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5 mb-8 inline-block">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {citizenLang === 'ar' ? 'رقم الملف' : 'Numéro de dossier'}
                </p>
                <p className="text-xl font-mono font-bold text-[#0F172A] dark:text-white">{submittedNumero}</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => { navigateTo('track', { numero: submittedNumero }); }}
                  className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {citizenLang === 'ar' ? 'تتبع الملف' : 'Suivre ma demande'}
                </button>
                <button
                  onClick={() => { navigateTo('dashboard'); setSubmittedNumero(''); }}
                  className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  {citizenLang === 'ar' ? 'العودة للوحة التحكم' : 'Retour au tableau de bord'}
                </button>
              </div>
            </div>
          </section>
        )}

        {page === 'track' && selectedDemande && (
          <section className="flex flex-col gap-5 max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 pb-[80px] animate-fade-in pt-8">
            {(() => {
              const sc = STATUS_CONFIG[selectedDemande.statut] || STATUS_CONFIG.en_cours_analyse;
              return (
                <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="h-1.5" style={{ background: `linear-gradient(to right, ${sc.border}, ${sc.color})` }} />
                  <div className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ background: sc.bg }}>
                          {sc.icon}
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            {citizenLang === 'ar' ? 'رقم الملف' : 'Numéro de dossier'}
                          </p>
                          <p className="font-mono text-xl font-black text-[#0F172A] dark:text-white tracking-wide">{selectedDemande.numero_dossier}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl shrink-0"
                        style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                        {citizenLang === 'ar' ? sc.label_ar : sc.label_fr}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-[#10B981] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {citizenLang === 'ar' ? 'الرخصة' : 'Licence'}
                  </p>
                  <p className="text-sm font-bold text-[#0F172A] dark:text-white truncate">
                    {(() => {
                      const meta = LICENCE_VIEW_META[selectedDemande.licence_type];
                      return meta ? (citizenLang === 'ar' ? meta.title_ar : meta.title_fr) : selectedDemande.licence_type || '—';
                    })()}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {citizenLang === 'ar' ? 'تاريخ الإيداع' : 'Dépôt'}
                  </p>
                  <p className="text-sm font-bold text-[#0F172A] dark:text-white truncate">
                    {selectedDemande.date_creation
                      ? new Date(selectedDemande.date_creation).toLocaleDateString(citizenLang === 'ar' ? 'ar-MA' : 'fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-500 dark:text-violet-400 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {citizenLang === 'ar' ? 'الاسم' : 'Demandeur'}
                  </p>
                  <p className="text-sm font-bold text-[#0F172A] dark:text-white truncate">{selectedDemande.nom_complet || '—'}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {citizenLang === 'ar' ? 'الموقع' : 'Adresse'}
                  </p>
                  <p className="text-sm font-bold text-[#0F172A] dark:text-white truncate">{selectedDemande.adresse_complete || selectedDemande.commune || '—'}</p>
                </div>
              </div>
            </div>

            <WorkflowTimeline
              demandeId={selectedDemande.id}
              demande={selectedDemande}
              lang={citizenLang}
              onCorrect={() => openCorrection(selectedDemande)}
              showCitizenSteps
            />

            <PiecesJointesPanel
              demandeId={selectedDemande.id}
              pieces={pjUploaded}
              loading={pjPanelLoading}
              downloadUrlBuilder={citizenAPI.downloadPieceJointeUrl}
              onUpload={async (files) => {
                setPjPanelLoading(true);
                try {
                  await uploadFiles(selectedDemande.id, files);
                  await loadPiecesJointes(selectedDemande.id);
                  showCitizenToast.current(isRtl ? 'تم رفع الوثائق' : 'Documents envoyés', 'success');
                } catch (err) {
                  showCitizenToast.current(err?.response?.data?.message || 'Erreur envoi', 'error');
                } finally {
                  setPjPanelLoading(false);
                }
              }}
              canDelete={false}
              isRtl={isRtl}
            />

            {['en_cours_analyse', 'documents_rejetes', 'documents_corriges', 'avis_favorable'].includes(selectedDemande.statut) && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{t(citizenLang, 'cancelRequest')}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t(citizenLang, 'cancelRequestTrackDesc')}</p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                    onClick={() => setCancelConfirmId(selectedDemande.id)}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    {t(citizenLang, 'cancelRequest')}
                  </button>
                </div>
              </div>
            )}

            {cancelConfirmId === selectedDemande.id && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setCancelConfirmId(null)}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
                    </div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-white">{t(citizenLang, 'cancelRequest')}</h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{t(citizenLang, 'cancelRequestConfirm')}</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      onClick={() => setCancelConfirmId(null)}
                    >
                      {t(citizenLang, 'cancel')}
                    </button>
                    <button
                      type="button"
                      disabled={cancelLoading}
                      className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                      onClick={async () => {
                        setCancelLoading(true);
                        try {
                          await handleCancelDemande(selectedDemande.id);
                          setCancelConfirmId(null);
                          navigateTo('dashboard');
                        } catch {
                          // error handled in handleCancelDemande
                        } finally {
                          setCancelLoading(false);
                        }
                      }}
                    >
                      {cancelLoading ? '...' : t(citizenLang, 'cancelRequestConfirmBtn')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {page === 'correct' && selectedDemande && (
          <section className="flex flex-col gap-6 max-w-[1040px] mx-auto px-4 sm:px-6">
            <button className="flex items-center gap-[7px] bg-transparent border-0 text-accent-500 cursor-pointer font-extrabold w-fit" type="button" onClick={() => navigateTo('track', { numero: selectedDemande?.numero_dossier })}>
              <ArrowLeft className="h-4 w-4" />
              {t(citizenLang, 'authGatewayCorrectBack')}
            </button>
            <div className="bg-[#fff1f2] dark:bg-red-900/20 border border-[#fecdd3] dark:border-red-800 rounded-lg text-[#9f1239] dark:text-red-300 p-4">
              <strong className="block mb-1">{t(citizenLang, 'authGatewayDocsRejected')}</strong>
              <p>{selectedDemande.motif_rejet_fichier || t(citizenLang, 'authGatewayMotifNotSpecified')}</p>
            </div>
            {selectedDemande.statut === 'documents_rejetes' ? (
              <>
                <CitizenOcrBox onApply={applyOcrToForm} licenceDocuments={getLicenceDocs(selectedDemande?.licence_type || 'pharmacie')} compact lang={citizenLang} />
                <CitizenDemandeForm
                  form={correctionForm}
                  setForm={setCorrectionForm}
                  onSubmit={submitCorrection}
                  loading={loading}
                  submitLabel={t(citizenLang, 'authGatewayCorrectBtn')}
                  lang={citizenLang}
                />
              </>
            ) : (
              <div className="bg-[#fff1f2] dark:bg-red-900/20 border border-[#fecdd3] dark:border-red-800 rounded-lg text-[#9f1239] dark:text-red-300 mt-3 p-[10px_12px]">{t(citizenLang, 'authGatewayCorrectNotAllowed')}</div>
            )}
          </section>
        )}

        {page === 'contact' && (
          <section className="flex flex-col gap-6 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pb-[80px] animate-fade-in">
            <div className="pt-8">
              <h1 className="text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                {citizenLang === 'ar' ? 'معلومات الاتصال' : 'Contact'}
              </h1>
              <p className="text-sm text-[#64748B] dark:text-slate-400 mt-2 max-w-[520px] leading-relaxed">
                {citizenLang === 'ar'
                  ? 'تواصل مع إدارة عمالة إقليم الخميسات'
                  : "Restez en contact avec l'administration de la Province de Khémisset"}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-6 flex items-start gap-4 hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] dark:bg-emerald-900/20 text-[#10B981] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#64748B] dark:text-slate-500 uppercase tracking-wider mb-1">
                    {citizenLang === 'ar' ? 'العنوان' : 'Adresse'}
                  </p>
                  <p className="text-sm font-bold text-[#0F172A] dark:text-white leading-relaxed">Avenue Mohammed V, BP 42</p>
                  <p className="text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">Khémisset, Maroc</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-6 flex items-start gap-4 hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] dark:bg-emerald-900/20 text-[#10B981] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Phone className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#64748B] dark:text-slate-500 uppercase tracking-wider mb-1">
                    {citizenLang === 'ar' ? 'الهاتف' : 'Téléphone'}
                  </p>
                  <p className="text-sm font-bold text-[#0F172A] dark:text-white">+212 5 37 55 10 20</p>
                  <p className="text-sm text-[#64748B] dark:text-slate-400">
                    {citizenLang === 'ar' ? 'الخط الرئيسي' : 'Standard'}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-6 flex items-start gap-4 hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] dark:bg-emerald-900/20 text-[#10B981] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#64748B] dark:text-slate-500 uppercase tracking-wider mb-1">Email</p>
                  <p className="text-sm font-bold text-[#0F172A] dark:text-white">contact@khemisset.gov.ma</p>
                  <p className="text-sm text-[#64748B] dark:text-slate-400">
                    {citizenLang === 'ar' ? 'البريد الإلكتروني' : 'Courriel'}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-6 flex items-start gap-4 hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] dark:bg-emerald-900/20 text-[#10B981] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#64748B] dark:text-slate-500 uppercase tracking-wider mb-1">
                    {citizenLang === 'ar' ? 'ساعات العمل' : 'Horaires'}
                  </p>
                  <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                    {citizenLang === 'ar' ? 'الإثنين - الجمعة' : 'Lundi - Vendredi'}
                  </p>
                  <p className="text-sm text-[#64748B] dark:text-slate-400">08h30 - 16h30</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-6 sm:p-8 hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] dark:bg-emerald-900/20 text-[#10B981] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-extrabold text-[#0F172A] dark:text-white mb-2">
                    {citizenLang === 'ar' ? 'معلومات إضافية' : 'Informations complémentaires'}
                  </h3>
                  <p className="text-sm text-[#64748B] dark:text-slate-400 leading-relaxed max-w-[640px]">
                    {citizenLang === 'ar'
                      ? 'لأي استفسار حول ملفاتكم، يمكنكم الاتصال بالرقم أعلاه أو التوجه إلى مقر العمالة خلال أوقات العمل الرسمية.'
                      : 'Pour toute question relative à vos dossiers, veuillez contacter le numéro ci-dessus ou vous présenter au siège de la province durant les heures ouvrables.'}
                  </p>
                </div>
              </div>
            </div>

          </section>
        )}
      </main>

      <CitizenAiChat lang={citizenLang} authUser={authUser} />
    </div>
  );
}
