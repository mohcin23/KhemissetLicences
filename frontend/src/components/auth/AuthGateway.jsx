import React, { useState } from 'react';
import { authAPI, citizenAPI } from '../../services/api';
import PublicTrackingResult from '../public/PublicTrackingResult';
import {
  ArrowLeft, ArrowRight, Eye, EyeOff, Shield, CheckCircle2,
  FileText, Building2, Clock, Lock, AlertTriangle, ChevronRight,
  ChevronLeft, Globe2, LogOut, User, Mail, Hash, KeyRound,
  MapPin, Phone, X
} from 'lucide-react';

const copy = {
  ar: {
    provinceName: 'إقليم الخميسات',
    officialBadge: 'المنصة الإقليمية الرسمية',
    homeTitle: 'طلب رخصة تأسيس المحل',
    homeSubtitle: 'منصة رقمية سلسة لتقديم طلبات الرخص ومتابعتها لدى عمالة إقليم الخميسات.',
    citizenSpace: 'فضاء المواطن',
    citizenCardDesc: 'تقديم الطلب، إرفاق الوثائق المطلوبة، ومتابعة ملفك في الوقت الفعلي.',
    adminSpace: 'فضاء الإدارة',
    adminCardDesc: 'الوصول إلى أدوات المعالجة والمراقبة وتتبع الملفات الإقليمية.',
    enter: 'دخول',
    heroCaption: 'الخدمة الرقمية — إقليم الخميسات 2026',
    statFast: 'خدمة سريعة',
    statTrack: 'متابعة فورية',
    statSecure: 'آمن ورسمي',
    back: 'رجوع',
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب',
    trackRequest: 'متابعة طلب',
    username: 'اسم المستخدم',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    fullName: 'الاسم الكامل',
    forgotPassword: 'نسيت كلمة المرور؟',
    loginLoading: 'جاري تسجيل الدخول...',
    createLoading: 'جاري إنشاء الحساب...',
    trackLoading: 'جاري تتبع الطلب...',
    submitRegistrationLoading: 'جاري إرسال الطلب...',
    citizenWelcome: 'مرحباً بك في فضاء المواطن',
    citizenWelcomeSub: 'قدم طلبك وتابعه في أي وقت',
    citizenBullet1: 'تقديم الطلب رقمياً',
    citizenBullet2: 'متابعة الحالة',
    citizenBullet3: 'استلام الإشعارات',
    terms: 'بإنشاء حساب، أنت توافق على شروط الاستخدام',
    trackIntro: 'أدخل رقم الطلب للاطلاع على حالته دون الحاجة لحساب',
    requestNumber: 'رقم الطلب',
    adminRestricted: 'وصول مقيد — للموظفين فقط',
    adminWelcomeSub: 'خاص بأعوان وإطارات العمالة',
    role: 'الصفة',
    roleAgent: 'عون',
    roleReader: 'قارئ',
    roleAdmin: 'مدير',
    submitRegistration: 'إرسال طلب التسجيل',
    adminOnly: 'هذا الفضاء مخصص للموظفين المعتمدين فقط',
    reviewNote: 'سيتم مراجعة طلبك من طرف المسؤول قبل التفعيل',
    adminFeature1: 'معالجة الملفات',
    adminFeature2: 'المراقبة والتحقق',
    adminFeature3: 'التسيير والإحصائيات',
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
    wrongCitizenPortal: 'يرجى استعمال فضاء المواطن لهذا الحساب',
    wrongAdminPortal: 'يرجى استعمال فضاء الإدارة لهذا الحساب',
    loginError: 'تعذر تسجيل الدخول، يرجى التحقق من المعطيات',
    passwordMismatch: 'كلمتا المرور غير متطابقتين',
    registerSent: 'تم إرسال طلب التسجيل بنجاح',
    registerError: 'تعذر إنشاء الحساب',
    trackRequired: 'يرجى إدخال رقم الطلب',
    trackError: 'تعذر العثور على الطلب',
    contact: 'اتصال',
    contactSubtitle: 'تواصل مع إدارة عمالة إقليم الخميسات',
    contactAddress: 'Avenue Mohammed V, BP 42',
    contactCity: 'Khémisset, Maroc',
    contactPhone: '+212 5 37 55 10 20',
    contactPhoneLabel: 'الخط الرئيسي',
    contactEmail: 'contact@khemisset.gov.ma',
    contactEmailLabel: 'البريد الإلكتروني',
    contactHours: 'الإثنين - الجمعة',
    contactHoursValue: '08h30 - 16h30',
    contactInfo: 'لأي استفسار حول ملفاتكم، يمكنكم الاتصال بالرقم أعلاه أو التوجه إلى مقر العمالة خلال أوقات العمل الرسمية.',
  },
  fr: {
    provinceName: 'Province de Khémisset',
    officialBadge: 'Plateforme provinciale officielle',
    homeTitle: "Demande de licence d'établissement",
    homeSubtitle: 'Une plateforme numérique fluide pour déposer, corriger et suivre les demandes de licence auprès de la Province de Khémisset.',
    citizenSpace: 'Espace citoyen',
    citizenCardDesc: 'Déposer une demande, compléter les pièces requises et suivre votre dossier en temps réel.',
    adminSpace: 'Espace administration',
    adminCardDesc: 'Accéder aux outils de traitement, de contrôle et de pilotage des dossiers provinciaux.',
    enter: 'Entrer',
    heroCaption: 'Service numérique — Province de Khémisset 2026',
    statFast: 'Service rapide',
    statTrack: 'Suivi instantané',
    statSecure: 'Sécurisé et officiel',
    back: 'Retour',
    login: 'Connexion',
    register: 'Créer un compte',
    trackRequest: 'Suivre demande',
    username: "Nom d'utilisateur",
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    fullName: 'Nom complet',
    forgotPassword: 'Mot de passe oublié ?',
    loginLoading: 'Connexion...',
    createLoading: 'Création du compte...',
    trackLoading: 'Recherche...',
    submitRegistrationLoading: 'Envoi de la demande...',
    citizenWelcome: 'Bienvenue dans l\'espace citoyen',
    citizenWelcomeSub: 'Déposez et suivez votre demande à tout moment',
    citizenBullet1: 'Dépôt numérique de la demande',
    citizenBullet2: 'Suivi de l\'état',
    citizenBullet3: 'Réception des notifications',
    terms: 'En créant un compte, vous acceptez les conditions d\'utilisation',
    trackIntro: 'Saisissez le numéro de demande pour consulter son état sans compte',
    requestNumber: 'Numéro de demande',
    adminRestricted: 'Accès restreint — employés uniquement',
    adminWelcomeSub: 'Réservé aux agents et cadres de la province',
    role: 'Fonction',
    roleAgent: 'Agent',
    roleReader: 'Lecteur',
    roleAdmin: 'Administrateur',
    submitRegistration: 'Envoyer la demande d\'inscription',
    adminOnly: 'Cet espace est réservé aux employés autorisés uniquement',
    reviewNote: 'Votre demande sera examinée par le responsable avant activation',
    adminFeature1: 'Traitement des dossiers',
    adminFeature2: 'Contrôle et validation',
    adminFeature3: 'Pilotage et statistiques',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
    wrongCitizenPortal: 'Veuillez utiliser l\'espace citoyen pour ce compte',
    wrongAdminPortal: 'Veuillez utiliser l\'espace administration pour ce compte',
    loginError: 'Connexion impossible, veuillez vérifier les informations',
    passwordMismatch: 'Les deux mots de passe ne correspondent pas',
    registerSent: 'Demande d\'inscription envoyée avec succès',
    registerError: 'Création du compte impossible',
    trackRequired: 'Veuillez saisir le numéro de demande',
    trackError: 'Demande introuvable',
    contact: 'Contact',
    contactSubtitle: "Restez en contact avec l'administration de la Province de Khémisset",
    contactAddress: 'Avenue Mohammed V, BP 42',
    contactCity: 'Khémisset, Maroc',
    contactPhone: '+212 5 37 55 10 20',
    contactPhoneLabel: 'Standard',
    contactEmail: 'contact@khemisset.gov.ma',
    contactEmailLabel: 'Courriel',
    contactHours: 'Lundi - Vendredi',
    contactHoursValue: '08h30 - 16h30',
    contactInfo: "Pour toute question relative à vos dossiers, veuillez contacter le numéro ci-dessus ou vous présenter au siège de la province durant les heures ouvrables.",
  },
};

const getCopy = (lang) => copy[lang === 'fr' ? 'fr' : 'ar'];

function LanguageToggle({ lang, setLang, isRtl }) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-neutral-200 bg-white" role="group" aria-label="Language">
      <button
        type="button"
        className={`px-3 py-1.5 text-xs font-bold rounded-md border-none cursor-pointer transition-all duration-150 ${
          lang === 'ar' ? 'bg-primary-900 text-white shadow-sm' : 'bg-transparent text-neutral-500 hover:text-neutral-700'
        }`}
        onClick={() => setLang('ar')}
      >AR</button>
      <button
        type="button"
        className={`px-3 py-1.5 text-xs font-bold rounded-md border-none cursor-pointer transition-all duration-150 ${
          lang === 'fr' ? 'bg-primary-900 text-white shadow-sm' : 'bg-transparent text-neutral-500 hover:text-neutral-700'
        }`}
        onClick={() => setLang('fr')}
      >FR</button>
    </div>
  );
}

function ProvinceLogo({ size = 40 }) {
  return (
    <div className="flex items-center justify-center rounded-full bg-white border-2 border-neutral-200 overflow-hidden shadow-sm shrink-0" style={{ width: size, height: size }}>
      <img src="/logo.jpg" alt="" className="h-full w-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />
    </div>
  );
}

function BackButton({ onClick, isRtl, color = 'text-primary-600', label }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 text-sm font-medium ${color} cursor-pointer border-none bg-transparent p-0 hover:underline`}>
      {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      <span>{label}</span>
    </button>
  );
}

function AuthTabs({ tabs, active, onChange, variant = 'citizen' }) {
  const activeBg = variant === 'admin' ? 'bg-primary-900' : 'bg-accent-500';
  return (
    <div className="flex w-full gap-1 p-1 rounded-xl bg-neutral-100 mb-6" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 text-center px-3 py-2.5 border-none rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
            active === tab.id
              ? `${activeBg} text-white shadow-sm`
              : 'text-neutral-500 bg-transparent hover:bg-white/60'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function AuthNotice({ message, error }) {
  if (!message && !error) return null;
  return (
    <div className={`mb-5 flex items-start gap-3 rounded-xl border p-3.5 text-sm font-medium ${error ? 'border-error-200 bg-error-50 text-error-700' : 'border-success-200 bg-success-50 text-success-700'}`} role="status">
      {error ? <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" /> : <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />}
      <span>{error || message}</span>
    </div>
  );
}

function FormField({ id, label, icon: Icon, type = 'text', value, onChange, placeholder, required, error, autoComplete, isRtl, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-neutral-700">{label}</label>
      <div className={`relative flex items-center ${error ? 'animate-[govShake_0.4s_ease]' : ''}`}>
        {Icon && (
          <span className={`absolute top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 ${isRtl ? 'right-3.5' : 'left-3.5'}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
        {children || (
          <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            autoComplete={autoComplete}
            aria-label={label}
            className={`w-full h-12 border-[1.5px] border-neutral-200 rounded-xl bg-white text-sm text-neutral-900 outline-none transition-all duration-150 ${
              isRtl ? 'text-right' : ''
            } ${Icon ? (isRtl ? 'pr-11 pl-4' : 'pl-11 pr-4') : 'px-4'} ${
              error ? 'border-error-400 focus:border-error-500 focus:ring-2 focus:ring-error-100' : 'focus:border-primary-500 focus:ring-2 focus:ring-primary-100 hover:border-neutral-300'
            }`}
          />
        )}
      </div>
      {error && <span className="text-xs font-medium text-error-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{error}</span>}
    </div>
  );
}

function PasswordField({ id, label, value, onChange, visible, onToggle, error, autoComplete, isRtl, placeholder }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-neutral-700">{label}</label>
      <div className={`relative flex items-center ${error ? 'animate-[govShake_0.4s_ease]' : ''}`}>
        <span className={`absolute top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 ${isRtl ? 'right-3.5' : 'left-3.5'}`}>
          <Lock className="h-4 w-4" />
        </span>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required
          autoComplete={autoComplete}
          aria-label={label}
          placeholder={placeholder}
          className={`w-full h-12 border-[1.5px] border-neutral-200 rounded-xl bg-white text-sm text-neutral-900 outline-none transition-all duration-150 ${isRtl ? 'text-right pr-11 pl-11 text-right' : 'pl-11 pr-11'} ${
            error ? 'border-error-400 focus:border-error-500 focus:ring-2 focus:ring-error-100' : 'focus:border-primary-500 focus:ring-2 focus:ring-primary-100 hover:border-neutral-300'
          }`}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? 'Masquer' : 'Afficher'}
          className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'left-3' : 'right-3'} p-1 border-none bg-transparent text-neutral-400 cursor-pointer rounded-lg hover:text-neutral-600 transition-colors`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <span className="text-xs font-medium text-error-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{error}</span>}
    </div>
  );
}

/* ── ILLUSTRATIONS ─────────────────────────────────────── */
function HeroIllustration() {
  return (
    <svg className="w-full max-w-[380px] h-auto" style={{ animation: 'govFloat 5s ease-in-out infinite' }} viewBox="0 0 380 340" fill="none" aria-hidden="true">
      <circle cx="190" cy="170" r="150" fill="#f0fdf4" opacity="0.6" />
      <circle cx="310" cy="60" r="12" fill="#bbf7d0" />
      <circle cx="60" cy="100" r="8" fill="#bbf7d0" />
      <rect x="55" y="160" width="155" height="130" rx="8" fill="#dcfce7" stroke="#27ab83" strokeWidth="2" />
      <polygon points="38,163 132,95 226,163" fill="#27ab83" />
      <rect x="112" y="85" width="16" height="20" rx="3" fill="#147d64" />
      <rect x="72" y="190" width="38" height="32" rx="4" fill="white" stroke="#27ab83" strokeWidth="1.5" />
      <rect x="122" y="190" width="38" height="32" rx="4" fill="white" stroke="#27ab83" strokeWidth="1.5" />
      <rect x="108" y="240" width="46" height="50" rx="5" fill="#147d64" />
      <circle cx="148" cy="265" r="3" fill="#bbf7d0" />
      <rect x="210" y="110" width="125" height="160" rx="12" fill="white" stroke="#1e293b" strokeWidth="2" />
      <rect x="252" y="98" width="38" height="24" rx="10" fill="#102a43" />
      <line x1="228" y1="150" x2="318" y2="150" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="228" y1="168" x2="318" y2="168" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="228" y1="186" x2="300" y2="186" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="273" cy="238" r="24" fill="#dcfce7" stroke="#27ab83" strokeWidth="2" />
      <path d="M262 238l7 7 14-14" fill="none" stroke="#27ab83" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CitizenLoginIllustration() {
  return (
    <svg className="w-full max-w-[260px]" style={{ animation: 'govFloat 5s ease-in-out infinite' }} viewBox="0 0 260 220" fill="none" aria-hidden="true">
      <circle cx="130" cy="110" r="100" fill="rgba(255,255,255,0.08)" />
      <circle cx="90" cy="60" r="28" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
      <circle cx="90" cy="56" r="16" fill="rgba(255,255,255,0.25)" />
      <path d="M55 130c0-30 25-50 55-50s50 20 50 50" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
      <rect x="135" y="50" width="95" height="120" rx="12" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <line x1="150" y1="82" x2="215" y2="82" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" />
      <line x1="150" y1="98" x2="215" y2="98" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" />
      <line x1="150" y1="114" x2="200" y2="114" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="182" cy="142" r="18" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
      <path d="M173 142l6 6 12-12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AdminDashboardIllustration() {
  return (
    <svg className="w-full max-w-[300px]" style={{ animation: 'govFloat 5s ease-in-out infinite' }} viewBox="0 0 300 240" fill="none" aria-hidden="true">
      <circle cx="150" cy="120" r="110" fill="rgba(255,255,255,0.05)" />
      <rect x="35" y="48" width="175" height="120" rx="12" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <rect x="35" y="48" width="175" height="28" rx="12" fill="rgba(255,255,255,0.15)" />
      <circle cx="50" cy="62" r="4" fill="rgba(255,255,255,0.35)" />
      <circle cx="64" cy="62" r="4" fill="rgba(255,255,255,0.35)" />
      <circle cx="78" cy="62" r="4" fill="rgba(255,255,255,0.35)" />
      <rect x="48" y="88" width="42" height="22" rx="5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <rect x="98" y="88" width="42" height="22" rx="5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <rect x="148" y="88" width="42" height="22" rx="5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <rect x="50" y="125" width="12" height="20" rx="3" fill="rgba(255,255,255,0.4)" />
      <rect x="68" y="118" width="12" height="27" rx="3" fill="rgba(255,255,255,0.6)" />
      <rect x="86" y="113" width="12" height="32" rx="3" fill="rgba(255,255,255,0.8)" />
      <rect x="104" y="121" width="12" height="24" rx="3" fill="rgba(255,255,255,0.5)" />
      <rect x="122" y="110" width="12" height="35" rx="3" fill="rgba(255,255,255,0.75)" />
      <rect x="140" y="118" width="12" height="27" rx="3" fill="rgba(255,255,255,0.55)" />
      <rect x="225" y="68" width="55" height="75" rx="8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="235" y1="90" x2="270" y2="90" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" />
      <line x1="235" y1="102" x2="270" y2="102" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" />
      <line x1="235" y1="114" x2="260" y2="114" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="252" cy="132" r="10" fill="rgba(22,163,74,0.7)" />
      <path d="M247 132l3 3 7-7" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── CONTACT MODAL ──────────────────────────────────────── */
function ContactModal({ isRtl, labels, onClose }) {
  const cards = [
    { icon: MapPin, label: isRtl ? 'العنوان' : 'Adresse', value: labels.contactAddress, sub: labels.contactCity },
    { icon: Phone, label: isRtl ? 'الهاتف' : 'Téléphone', value: labels.contactPhone, sub: labels.contactPhoneLabel },
    { icon: Mail, label: 'Email', value: labels.contactEmail, sub: labels.contactEmailLabel },
    { icon: Clock, label: isRtl ? 'ساعات العمل' : 'Horaires', value: labels.contactHours, sub: labels.contactHoursValue },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto animate-[modalIn_0.25s_ease]">
        <div className="sticky top-0 bg-white border-b border-neutral-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-extrabold text-neutral-900">{isRtl ? 'معلومات الاتصال' : labels.contact}</h2>
            <p className="text-xs text-neutral-500 mt-0.5">{labels.contactSubtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center border-none cursor-pointer transition-colors" aria-label="Fermer">
            <X className="h-4 w-4 text-neutral-600" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} className="flex items-start gap-3.5 p-4 rounded-xl border border-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-success-50 text-success-600 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{card.label}</p>
                    <p className="text-sm font-semibold text-neutral-900 mt-0.5 leading-snug">{card.value}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{card.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-xl border border-neutral-100 bg-neutral-50/50">
            <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed">{labels.contactInfo}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── HOME PAGE ─────────────────────────────────────────── */
function HomePage({ onSelect, lang, setLang, isRtl, labels }) {
  const [contactOpen, setContactOpen] = useState(false);
  const accessCards = [
    {
      id: 'citizen',
      title: labels.citizenSpace,
      description: labels.citizenCardDesc,
      icon: FileText,
      iconBg: 'bg-success-50 text-success-600',
      btnClass: 'bg-accent-500 text-white hover:bg-accent-600',
      borderColor: 'border-t-success-500',
    },
    {
      id: 'admin',
      title: labels.adminSpace,
      description: labels.adminCardDesc,
      icon: Building2,
      iconBg: 'bg-primary-50 text-primary-700',
      btnClass: 'bg-primary-900 text-white hover:bg-primary-800',
      borderColor: 'border-t-primary-700',
    },
  ];

  const footerFeatures = [
    { icon: Clock, label: labels.statFast },
    { icon: CheckCircle2, label: labels.statTrack },
    { icon: Shield, label: labels.statSecure },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between gap-4 px-8 md:px-12 py-3.5 bg-white/95 backdrop-blur-md border-b border-neutral-100">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <ProvinceLogo size={40} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-neutral-900 leading-tight">{labels.provinceName}</p>
            <p className="text-[11px] text-neutral-500">{labels.heroCaption}</p>
          </div>
        </div>
        <span className="hidden md:flex items-center gap-1.5 bg-success-50 border border-success-200 rounded-full px-3.5 py-1.5 text-xs font-semibold text-success-700 whitespace-nowrap">
          <Shield className="h-3.5 w-3.5" />
          {labels.officialBadge}
        </span>
        <LanguageToggle lang={lang} setLang={setLang} isRtl={isRtl} />
      </header>

      {/* Main */}
      <section className="flex-1 flex items-center px-8 md:px-12 py-10 gap-12 min-h-[calc(100vh-65px-56px)] max-md:flex-col max-md:gap-8">
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          <h1 className="text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[1.08] tracking-tight text-neutral-900">
            {lang === 'fr' ? (
              <>Demande de <span className="text-accent-500">licence</span><br />d'établissement</>
            ) : (
              <>طلب <span className="text-accent-500">رخصة</span><br />تأسيس المحل</>
            )}
          </h1>
          <p className="text-base text-neutral-500 leading-relaxed max-w-lg">{labels.homeSubtitle}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            {accessCards.map(card => {
              const Icon = card.icon;
              return (
                <article
                  key={card.id}
                  className={`flex flex-col gap-3 p-6 rounded-2xl border-2 border-neutral-100 border-t-[3px] ${card.borderColor} bg-white cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated hover:border-neutral-200`}
                  onClick={() => onSelect(card.id)}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-base font-bold text-neutral-900">{card.title}</h2>
                  <p className="text-sm text-neutral-500 leading-relaxed flex-1">{card.description}</p>
                  <button
                    type="button"
                    className={`flex items-center justify-center gap-2 w-full h-11 border-none rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 ${card.btnClass} ${isRtl ? 'flex-row-reverse' : ''}`}
                  >
                    {labels.enter}
                    {isRtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
        <aside className="w-[400px] max-md:w-full shrink-0 flex items-center justify-center">
          <HeroIllustration />
        </aside>
      </section>

      {/* Footer */}
      <footer className="flex items-center justify-center flex-wrap border-t border-neutral-100 bg-neutral-50 py-4 gap-6 md:gap-12">
        {footerFeatures.map(f => {
          const Icon = f.icon;
          return (
            <span key={f.label} className="flex items-center gap-2 text-sm font-medium text-neutral-600">
              <Icon className="h-4 w-4 text-accent-500" />
              {f.label}
            </span>
          );
        })}
        <button type="button" onClick={() => setContactOpen(true)} className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-accent-600 cursor-pointer border-none bg-transparent transition-colors">
          <Mail className="h-4 w-4" />
          {labels.contact}
        </button>
      </footer>

      {contactOpen && <ContactModal isRtl={isRtl} labels={labels} onClose={() => setContactOpen(false)} />}
    </div>
  );
}

/* ── CITIZEN LOGIN ─────────────────────────────────────── */
function CitizenLoginPage(props) {
  const {
    mode, setMode, loginForm, setLoginForm, citizenRegisterForm, setCitizenRegisterForm,
    publicTrackNumero, setPublicTrackNumero, publicTrackResult, publicTrackError,
    publicTrackLoading, handleLogin, handleCitizenRegister, handlePublicTrack,
    onBack, loading, message, error, hasError, visiblePasswords, togglePassword,
    lang, setLang, isRtl, labels,
  } = props;

  return (
    <div className="min-h-screen flex" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Left panel */}
      <aside className="hidden lg:flex relative flex-col items-center justify-center px-8 py-12 text-center text-white bg-gradient-to-b from-accent-600 to-accent-500 overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-white/[0.04] pointer-events-none" />
        <CitizenLoginIllustration />
        <h2 className="text-2xl font-extrabold text-white text-center mb-2 leading-tight relative z-10">{labels.citizenWelcome}</h2>
        <p className="text-sm text-white/75 text-center mb-6 leading-relaxed max-w-[280px] relative z-10">{labels.citizenWelcomeSub}</p>
        <div className="flex flex-col gap-2.5 w-full max-w-[280px] relative z-10">
          {[labels.citizenBullet1, labels.citizenBullet2, labels.citizenBullet3].map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-white/15 rounded-full px-4 py-2.5 text-sm font-medium text-white">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Right panel */}
      <section className="flex-1 flex flex-col justify-center min-h-screen p-6 sm:px-12 bg-white max-md:overflow-y-auto max-md:justify-start">
        <div className="w-full max-w-[480px] mx-auto">
          <header className="flex items-center justify-between mb-4 gap-3">
            <div className={`flex items-center gap-2.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <ProvinceLogo size={34} />
              <span className="text-sm font-semibold text-neutral-900">{labels.provinceName}</span>
            </div>
            <LanguageToggle lang={lang} setLang={setLang} isRtl={isRtl} />
          </header>

          <BackButton onClick={onBack} isRtl={isRtl} color="text-accent-600" label={labels.back} />

          <h1 className="text-2xl font-extrabold text-neutral-900 mt-4 mb-1 tracking-tight">{labels.citizenSpace}</h1>
          <p className="text-sm text-neutral-500 mb-6">{labels.citizenCardDesc}</p>

          <AuthTabs
            variant="citizen"
            tabs={[
              { id: 'login', label: labels.login },
              { id: 'register', label: labels.register },
              { id: 'track', label: labels.trackRequest },
            ]}
            active={mode}
            onChange={setMode}
          />

          <AuthNotice message={message} error={error} />

          {mode === 'login' && (
            <form key="c-login" className="space-y-4" onSubmit={(e) => handleLogin(e, 'citizen')} noValidate>
              <FormField id="c-u" label={labels.username} icon={User} value={loginForm.username} onChange={e => setLoginForm(p => ({ ...p, username: e.target.value }))} required error={hasError ? ' ' : ''} autoComplete="username" isRtl={isRtl} />
              <PasswordField id="c-p" label={labels.password} value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} visible={visiblePasswords.login} onToggle={() => togglePassword('login')} error={hasError ? ' ' : ''} autoComplete="current-password" isRtl={isRtl} />
              <button className="w-full h-12 border-none rounded-xl text-sm font-bold text-white cursor-pointer bg-accent-500 hover:bg-accent-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2" type="submit" disabled={loading}>
                {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                {loading ? labels.loginLoading : labels.login}
              </button>
              <button type="button" className={`block w-full mt-2 text-sm text-accent-600 font-medium cursor-pointer border-none bg-transparent hover:underline ${isRtl ? 'text-left' : 'text-right'}`}>
                {labels.forgotPassword}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form key="c-reg" className="space-y-4" onSubmit={handleCitizenRegister} noValidate>
              <FormField id="c-r-name" label={labels.fullName} icon={User} value={citizenRegisterForm.full_name} onChange={e => setCitizenRegisterForm(p => ({ ...p, full_name: e.target.value }))} required error={hasError ? ' ' : ''} autoComplete="name" isRtl={isRtl} />
              <FormField id="c-r-user" label={labels.username} icon={User} value={citizenRegisterForm.username} onChange={e => setCitizenRegisterForm(p => ({ ...p, username: e.target.value }))} required error={hasError ? ' ' : ''} autoComplete="username" isRtl={isRtl} />
              <PasswordField id="c-r-pass" label={labels.password} value={citizenRegisterForm.password} onChange={e => setCitizenRegisterForm(p => ({ ...p, password: e.target.value }))} visible={visiblePasswords.citizenRegister} onToggle={() => togglePassword('citizenRegister')} error={hasError ? ' ' : ''} autoComplete="new-password" isRtl={isRtl} />
              <PasswordField id="c-r-confirm" label={labels.confirmPassword} value={citizenRegisterForm.confirmPassword} onChange={e => setCitizenRegisterForm(p => ({ ...p, confirmPassword: e.target.value }))} visible={visiblePasswords.citizenConfirm} onToggle={() => togglePassword('citizenConfirm')} error={hasError ? ' ' : ''} autoComplete="new-password" isRtl={isRtl} />
              <button className="w-full h-12 border-none rounded-xl text-sm font-bold text-white cursor-pointer bg-accent-500 hover:bg-accent-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2" type="submit" disabled={loading}>
                {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                {loading ? labels.createLoading : labels.register}
              </button>
              <p className="text-center text-xs font-medium text-neutral-500">{labels.terms}</p>
            </form>
          )}

          {mode === 'track' && (
            <form key="c-track" className="space-y-4" onSubmit={handlePublicTrack} noValidate>
              <div className="rounded-xl border border-success-200 bg-success-50 p-4 text-sm font-medium text-success-800">
                {labels.trackIntro}
              </div>
              <FormField id="c-track-num" label={labels.requestNumber} icon={Hash} value={publicTrackNumero} onChange={e => setPublicTrackNumero(e.target.value.toUpperCase())} placeholder="KH-2026-XXXXX" required error={publicTrackError} isRtl={isRtl} />
              <button className="w-full h-12 border-none rounded-xl text-sm font-bold text-white cursor-pointer bg-accent-500 hover:bg-accent-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2" type="submit" disabled={publicTrackLoading}>
                {publicTrackLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                {publicTrackLoading ? labels.trackLoading : labels.trackRequest}
              </button>
              <PublicTrackingResult result={publicTrackResult} lang={lang} />
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

/* ── ADMIN LOGIN ───────────────────────────────────────── */
function AdminLoginPage(props) {
  const {
    mode, setMode, loginForm, setLoginForm, agentRegisterForm, setAgentRegisterForm,
    handleLogin, handleAgentRegister, onBack, loading, message, error, hasError,
    visiblePasswords, togglePassword, lang, setLang, isRtl, labels,
  } = props;

  return (
    <div className="min-h-screen flex" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Left panel */}
      <aside className="hidden lg:flex relative flex-col items-center justify-center px-8 py-12 text-center text-white bg-gradient-to-b from-primary-900 to-primary-800 overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/[0.04] pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-white/[0.03] pointer-events-none" />
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/30 rounded-full px-4 py-2 text-white text-xs font-semibold tracking-wide mb-8 relative z-10">
          <span className="w-2 h-2 rounded-full bg-error-400 animate-pulse" aria-hidden="true" />
          {labels.adminRestricted}
        </div>
        <AdminDashboardIllustration />
        <h2 className="text-2xl font-extrabold text-white text-center mb-2.5 leading-tight relative z-10">{labels.adminSpace}</h2>
        <p className="text-sm text-white/70 text-center mb-7 leading-relaxed max-w-[280px] relative z-10">{labels.adminWelcomeSub}</p>
        <div className="flex flex-col gap-2.5 w-full max-w-[280px] relative z-10">
          {[labels.adminFeature1, labels.adminFeature2, labels.adminFeature3].map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-white/10 rounded-full px-4 py-2.5 text-sm font-medium text-white">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Right panel */}
      <section className="flex-1 flex flex-col justify-center min-h-screen p-6 sm:px-12 bg-white max-md:overflow-y-auto max-md:justify-start">
        <div className="w-full max-w-[480px] mx-auto">
          <header className="flex items-center justify-between mb-4 gap-3">
            <div className={`flex items-center gap-2.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <ProvinceLogo size={34} />
              <span className="text-sm font-semibold text-neutral-900">{labels.provinceName}</span>
            </div>
            <LanguageToggle lang={lang} setLang={setLang} isRtl={isRtl} />
          </header>

          <BackButton onClick={onBack} isRtl={isRtl} color="text-primary-700" label={labels.back} />

          <h1 className="text-2xl font-extrabold text-neutral-900 mt-4 mb-1 tracking-tight">{labels.adminSpace}</h1>
          <p className="text-sm text-neutral-500 mb-5">{labels.adminCardDesc}</p>

          <AuthTabs variant="admin" tabs={[{ id: 'login', label: labels.login }, { id: 'register', label: labels.register }]} active={mode} onChange={setMode} />

          <AuthNotice message={message} error={error} />

          {mode === 'login' && (
            <form key="a-login" className="space-y-4" onSubmit={(e) => handleLogin(e, 'admin')} noValidate>
              <FormField id="a-u" label={labels.username} icon={User} value={loginForm.username} onChange={e => setLoginForm(p => ({ ...p, username: e.target.value }))} required error={hasError ? ' ' : ''} autoComplete="username" isRtl={isRtl} />
              <PasswordField id="a-p" label={labels.password} value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} visible={visiblePasswords.login} onToggle={() => togglePassword('login')} error={hasError ? ' ' : ''} autoComplete="current-password" isRtl={isRtl} />
              <button className="w-full h-12 border-none rounded-xl text-sm font-bold text-white cursor-pointer bg-primary-900 hover:bg-primary-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2" type="submit" disabled={loading}>
                {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                {loading ? labels.loginLoading : labels.login}
              </button>
              <button type="button" className={`block w-full mt-2 text-sm text-primary-700 font-medium cursor-pointer border-none bg-transparent hover:underline ${isRtl ? 'text-left' : 'text-right'}`}>
                {labels.forgotPassword}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form key="a-reg" className="space-y-4" onSubmit={handleAgentRegister} noValidate>
              <FormField id="a-r-name" label={labels.fullName} icon={User} value={agentRegisterForm.full_name} onChange={e => setAgentRegisterForm(p => ({ ...p, full_name: e.target.value }))} required error={hasError ? ' ' : ''} autoComplete="name" isRtl={isRtl} />
              <FormField id="a-r-user" label={labels.username} icon={User} value={agentRegisterForm.username} onChange={e => setAgentRegisterForm(p => ({ ...p, username: e.target.value }))} required error={hasError ? ' ' : ''} autoComplete="username" isRtl={isRtl} />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="a-r-role" className="text-sm font-semibold text-neutral-700">{labels.role}</label>
                <select
                  id="a-r-role"
                  value={agentRegisterForm.role}
                  onChange={e => setAgentRegisterForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full h-12 px-4 border-[1.5px] border-neutral-200 rounded-xl bg-white text-sm text-neutral-900 outline-none transition-all duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 hover:border-neutral-300 cursor-pointer"
                >
                  <option value="agent">{labels.roleAgent}</option>
                  <option value="lecteur">{labels.roleReader}</option>
                  <option value="admin">{labels.roleAdmin}</option>
                </select>
              </div>
              <PasswordField id="a-r-pass" label={labels.password} value={agentRegisterForm.password} onChange={e => setAgentRegisterForm(p => ({ ...p, password: e.target.value }))} visible={visiblePasswords.agentRegister} onToggle={() => togglePassword('agentRegister')} error={hasError ? ' ' : ''} autoComplete="new-password" isRtl={isRtl} />
              <PasswordField id="a-r-confirm" label={labels.confirmPassword} value={agentRegisterForm.confirmPassword} onChange={e => setAgentRegisterForm(p => ({ ...p, confirmPassword: e.target.value }))} visible={visiblePasswords.agentConfirm} onToggle={() => togglePassword('agentConfirm')} error={hasError ? ' ' : ''} autoComplete="new-password" isRtl={isRtl} />
              <button className="w-full h-12 border-none rounded-xl text-sm font-bold text-white cursor-pointer bg-primary-900 hover:bg-primary-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2" type="submit" disabled={loading}>
                {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                {loading ? labels.submitRegistrationLoading : labels.submitRegistration}
              </button>
              <div className="flex items-center gap-3 mt-3 p-3.5 rounded-xl bg-warning-50 border border-warning-200 text-sm font-medium text-warning-800" role="note">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{labels.reviewNote}</span>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

/* ── AUTH GATEWAY (MAIN) ───────────────────────────────── */
function AuthGateway({ lang = 'ar', setLang = () => {}, setAuthUser }) {
  const normalizedLang = lang === 'fr' ? 'fr' : 'ar';
  const isRtl = normalizedLang === 'ar';
  const labels = getCopy(normalizedLang);
  const [entry, setEntry] = useState('home');
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [agentRegisterForm, setAgentRegisterForm] = useState({ full_name: '', username: '', password: '', confirmPassword: '', role: 'agent' });
  const [citizenRegisterForm, setCitizenRegisterForm] = useState({ full_name: '', username: '', password: '', confirmPassword: '', phone: '', email: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [publicTrackNumero, setPublicTrackNumero] = useState('');
  const [publicTrackResult, setPublicTrackResult] = useState(null);
  const [publicTrackError, setPublicTrackError] = useState('');
  const [publicTrackLoading, setPublicTrackLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({
    login: false, citizenRegister: false, citizenConfirm: false,
    agentRegister: false, agentConfirm: false,
  });

  const resetFeedback = () => { setMessage(''); setError(''); setHasError(false); };
  const showError = (msg) => { setError(msg); setHasError(false); window.requestAnimationFrame(() => setHasError(true)); };
  const togglePassword = (key) => setVisiblePasswords(prev => ({ ...prev, [key]: !prev[key] }));

  const chooseEntry = (nextEntry) => {
    setEntry(nextEntry);
    setMode('login');
    setLoginForm({ username: '', password: '' });
    resetFeedback();
  };

  const handleLogin = async (e, expectedRole) => {
    e.preventDefault();
    resetFeedback();
    setLoading(true);
    try {
      const res = await authAPI.login(loginForm.username, loginForm.password);
      const user = res.data.user;
      if (expectedRole === 'citizen' && user.role !== 'citizen') { showError(labels.wrongAdminPortal); localStorage.removeItem('auth_token'); return; }
      if (expectedRole === 'admin' && user.role === 'citizen') { showError(labels.wrongCitizenPortal); localStorage.removeItem('auth_token'); return; }
      localStorage.setItem('auth_token', res.data.token);
      setAuthUser(user);
    } catch (err) {
      showError(err.response?.data?.message || labels.loginError);
    } finally { setLoading(false); }
  };

  const handleAgentRegister = async (e) => {
    e.preventDefault();
    resetFeedback();
    if (agentRegisterForm.password !== agentRegisterForm.confirmPassword) { showError(labels.passwordMismatch); return; }
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = agentRegisterForm;
      const res = await authAPI.register(payload);
      setMessage(res.data.message || labels.registerSent);
      setAgentRegisterForm({ full_name: '', username: '', password: '', confirmPassword: '', role: 'agent' });
      setMode('login');
    } catch (err) { showError(err.response?.data?.message || labels.registerError); }
    finally { setLoading(false); }
  };

  const handleCitizenRegister = async (e) => {
    e.preventDefault();
    resetFeedback();
    if (citizenRegisterForm.password !== citizenRegisterForm.confirmPassword) { showError(labels.passwordMismatch); return; }
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = citizenRegisterForm;
      const res = await authAPI.registerCitizen(payload);
      localStorage.setItem('auth_token', res.data.token);
      setAuthUser(res.data.user);
    } catch (err) { showError(err.response?.data?.message || labels.registerError); }
    finally { setLoading(false); }
  };

  const handlePublicTrack = async (e) => {
    e.preventDefault();
    const numero = publicTrackNumero.trim();
    setPublicTrackError(''); setPublicTrackResult(null);
    if (!numero) { setPublicTrackError(labels.trackRequired); return; }
    setPublicTrackLoading(true);
    try { const res = await citizenAPI.trackPublic(numero); setPublicTrackResult(res.data.data); }
    catch (err) { setPublicTrackError(err.response?.data?.message || labels.trackError); }
    finally { setPublicTrackLoading(false); }
  };

  const commonProps = {
    lang: normalizedLang, setLang, isRtl, labels, mode,
    setMode: (m) => { setMode(m); resetFeedback(); },
    loginForm, setLoginForm, onBack: () => chooseEntry('home'),
    loading, message, error, hasError, visiblePasswords, togglePassword, handleLogin,
  };

  if (entry === 'citizen') {
    return <CitizenLoginPage {...commonProps} citizenRegisterForm={citizenRegisterForm} setCitizenRegisterForm={setCitizenRegisterForm} publicTrackNumero={publicTrackNumero} setPublicTrackNumero={setPublicTrackNumero} publicTrackResult={publicTrackResult} publicTrackError={publicTrackError} publicTrackLoading={publicTrackLoading} handleCitizenRegister={handleCitizenRegister} handlePublicTrack={handlePublicTrack} />;
  }
  if (entry === 'admin') {
    return <AdminLoginPage {...commonProps} mode={mode === 'track' ? 'login' : mode} agentRegisterForm={agentRegisterForm} setAgentRegisterForm={setAgentRegisterForm} handleAgentRegister={handleAgentRegister} />;
  }
  return <HomePage onSelect={chooseEntry} lang={normalizedLang} setLang={setLang} isRtl={isRtl} labels={labels} />;
}

export default AuthGateway;
