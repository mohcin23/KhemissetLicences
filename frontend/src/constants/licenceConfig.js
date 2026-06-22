// ── Shared licence configuration constants ──────────────────────────────────
// Consolidates LICENCE_VIEW_META, LICENCE_OCR_DOCS, and related configs
// Used by: CitizenPortal, DynamicLicenceForm, LicenceSelector, LicenceBadge

export const LICENCE_VIEW_META = {
  pharmacie: {
    title_fr: 'Pharmacie',
    title_ar: 'صيدلية',
    description_fr: "Autorisation d'ouverture d'une pharmacie.",
    description_ar: 'ترخيص فتح صيدلية.',
  },
  cafe_restaurant: {
    title_fr: 'Café / Restaurant',
    title_ar: 'مقهى / مطعم',
    description_fr: "Autorisation d'exploitation d'un café ou restaurant.",
    description_ar: 'ترخيص استغلال مقهى أو مطعم.',
  },
  hopital_clinique: {
    title_fr: 'Hôpital / Clinique',
    title_ar: 'مستشفى / عيادة',
    description_fr: "Autorisation d'ouverture d'un établissement de soins.",
    description_ar: 'ترخيص فتح مؤسسة صحية.',
  },
  ecole_privee: {
    title_fr: 'École privée',
    title_ar: 'مدرسة خاصة',
    description_fr: "Autorisation d'ouverture d'un établissement scolaire.",
    description_ar: 'ترخيص فتح مؤسسة تعليمية خاصة.',
  },
  salle_sport: {
    title_fr: 'Salle de sport',
    title_ar: 'قاعة رياضية',
    description_fr: "Autorisation d'ouverture d'une salle de sport.",
    description_ar: 'ترخيص فتح قاعة رياضية.',
  },
};

// ── Documents OCR par type de licence (miroir de licenceConfig.js backend) ──
export const LICENCE_OCR_DOCS = {
  pharmacie: [
    { key: 'cin_proprietaire', label_fr: 'CIN du propriétaire', label_ar: 'بطاقة التعريف الوطنية للمالك', ocr: true,
      ocr_fields: ['nom', 'prenom', 'cin', 'date_naissance', 'adresse', 'commune', 'cercle', 'nom_ar', 'prenom_ar', 'adresse_ar', 'commune_ar', 'cercle_ar'],
      ocr_prompt: "Extrais les données de cette CIN marocaine. La CIN contient des données en français (côté gauche) ET en arabe (côté droit). Extrais: nom (français), prenom (français), commune (français), cercle (français), nom_ar (الاسم العائلي en arabe), prenom_ar (الاسم الشخصي en arabe), cin, date_naissance (YYYY-MM-DD), adresse (français), adresse_ar (العنوان en arabe), commune_ar (الجماعة en arabe), cercle_ar (الدائرة en arabe). JSON uniquement." },
    { key: 'diplome_pharmacie', label_fr: 'Diplôme de pharmacie', label_ar: 'دبلوم الصيدلة', ocr: true,
      ocr_fields: ['nom', 'specialite', 'universite', 'annee', 'nom_ar', 'specialite_ar', 'universite_ar'],
      ocr_prompt: "Extrais les données de ce diplôme. Le document contient du texte en français ET en arabe. Extrais: nom (français), nom_ar (arabe), specialite (français), specialite_ar (arabe), universite (français), universite_ar (arabe), annee. JSON uniquement." },
    { key: 'permis_exercice', label_fr: "Permis d'exercice", label_ar: 'رخصة المزاولة', ocr: true,
      ocr_fields: ['numero_permis', 'date_permis'],
      ocr_prompt: 'Extrais numero_permis, date_permis (YYYY-MM-DD). JSON uniquement.' },
    { key: 'certificat_distance', label_fr: 'Certificat de distance', label_ar: 'شهادة المسافة', ocr: false },
    { key: 'pv_commission', label_fr: 'PV de la commission', label_ar: 'محضر اللجنة', ocr: false },
  ],
  cafe: [
    { key: 'cin_proprietaire', label_fr: 'CIN du propriétaire', label_ar: 'بطاقة التعريف الوطنية للمالك', ocr: true,
      ocr_fields: ['nom', 'prenom', 'cin', 'date_naissance', 'adresse', 'commune', 'cercle', 'nom_ar', 'prenom_ar', 'adresse_ar', 'commune_ar', 'cercle_ar'],
      ocr_prompt: "Extrais les données de cette CIN marocaine. La CIN contient des données en français (côté gauche) ET en arabe (côté droit). Extrais: nom (français), prenom (français), commune (français), cercle (français), nom_ar (الاسم العائلي en arabe), prenom_ar (الاسم الشخصي en arabe), cin, date_naissance (YYYY-MM-DD), adresse (français), adresse_ar (العنوان en arabe), commune_ar (الجماعة en arabe), cercle_ar (الدائرة en arabe). JSON uniquement." },
    { key: 'bail_propriete', label_fr: 'Bail ou titre de propriété', label_ar: 'عقد الكراء أو سند الملكية', ocr: true,
      ocr_fields: ['adresse_local', 'superficie', 'nom_proprietaire', 'adresse_local_ar', 'nom_proprietaire_ar'],
      ocr_prompt: "Extrais les données de ce bail ou titre de propriété. Extrais: adresse_local (français), adresse_local_ar (arabe), superficie (nombre m2), nom_proprietaire (français), nom_proprietaire_ar (arabe). JSON uniquement." },
    { key: 'certificat_conformite', label_fr: 'Certificat de conformité', label_ar: 'شهادة المطابقة', ocr: false },
    { key: 'autorisation_exploitation', label_fr: "Autorisation d'exploitation", label_ar: 'رخصة الاستغلال', ocr: false },
    { key: 'plan_local', label_fr: 'Plan du local', label_ar: 'مخطط المحل', ocr: false },
  ],
  cafe_restaurant: null, // alias
  hopital: [
    { key: 'cin_directeur', label_fr: 'CIN du directeur médical', label_ar: 'بطاقة التعريف الوطنية للمدير الطبي', ocr: true,
      ocr_fields: ['nom', 'prenom', 'cin', 'date_naissance', 'adresse', 'commune', 'cercle', 'nom_ar', 'prenom_ar', 'adresse_ar', 'commune_ar', 'cercle_ar'],
      ocr_prompt: "Extrais les données de cette CIN marocaine. La CIN contient des données en français (côté gauche) ET en arabe (côté droit). Extrais: nom (français), prenom (français), commune (français), cercle (français), nom_ar (الاسم العائلي en arabe), prenom_ar (الاسم الشخصي en arabe), cin, date_naissance (YYYY-MM-DD), adresse (français), adresse_ar (العنوان en arabe), commune_ar (الجماعة en arabe), cercle_ar (الدائرة en arabe). JSON uniquement." },
    { key: 'diplome_medecin', label_fr: 'Diplôme de médecine / spécialité', label_ar: 'دبلوم الطب / التخصص', ocr: true,
      ocr_fields: ['nom', 'specialite', 'universite', 'annee', 'nom_ar', 'specialite_ar', 'universite_ar'],
      ocr_prompt: "Extrais les données de ce diplôme médical. Le document contient du texte en français ET en arabe. Extrais: nom (français), nom_ar (arabe), specialite (français), specialite_ar (arabe), universite (français), universite_ar (arabe), annee. JSON uniquement." },
    { key: 'autorisation_exploitation', label_fr: "Autorisation d'exploitation", label_ar: 'رخصة الاستغلال', ocr: true,
      ocr_fields: ['numero_autorisation', 'date_autorisation'],
      ocr_prompt: 'Extrais numero_autorisation, date_autorisation (YYYY-MM-DD). JSON uniquement.' },
    { key: 'plan_architectural', label_fr: 'Plan architectural', label_ar: 'المخطط المعماري', ocr: false },
    { key: 'certificat_conformite_incendie', label_fr: 'Certificat de conformité incendie', label_ar: 'شهادة مطابقة الوقاية من الحريق', ocr: false },
    { key: 'liste_equipements_medicaux', label_fr: 'Liste des équipements médicaux', label_ar: 'قائمة التجهيزات الطبية', ocr: false },
  ],
  hopital_clinique: null, // alias
  ecole: [
    { key: 'cin_directeur', label_fr: 'CIN du directeur', label_ar: 'بطاقة التعريف الوطنية للمدير', ocr: true,
      ocr_fields: ['nom', 'prenom', 'cin', 'date_naissance', 'adresse', 'commune', 'cercle', 'nom_ar', 'prenom_ar', 'adresse_ar', 'commune_ar', 'cercle_ar'],
      ocr_prompt: "Extrais les données de cette CIN marocaine. La CIN contient des données en français (côté gauche) ET en arabe (côté droit). Extrais: nom (français), prenom (français), commune (français), cercle (français), nom_ar (الاسم العائلي en arabe), prenom_ar (الاسم الشخصي en arabe), cin, date_naissance (YYYY-MM-DD), adresse (français), adresse_ar (العنوان en arabe), commune_ar (الجماعة en arabe), cercle_ar (الدائرة en arabe). JSON uniquement." },
    { key: 'diplome_directeur', label_fr: 'Diplôme du directeur', label_ar: 'دبلوم المدير', ocr: true,
      ocr_fields: ['nom', 'specialite', 'universite', 'annee', 'nom_ar', 'specialite_ar', 'universite_ar'],
      ocr_prompt: "Extrais les données de ce diplôme. Le document contient du texte en français ET en arabe. Extrais: nom (français), nom_ar (arabe), specialite (français), specialite_ar (arabe), universite (français), universite_ar (arabe), annee. JSON uniquement." },
    { key: 'bail_propriete', label_fr: 'Bail ou titre de propriété', label_ar: 'عقد الكراء أو سند الملكية', ocr: false },
    { key: 'plans_locaux', label_fr: 'Plans des locaux', label_ar: 'مخططات المحلات', ocr: false },
    { key: 'liste_enseignants', label_fr: 'Liste des enseignants', label_ar: 'قائمة الأساتذة', ocr: false },
    { key: 'attestation_conformite_salles', label_fr: 'Attestation de conformité des salles', label_ar: 'شهادة مطابقة القاعات', ocr: false },
  ],
  ecole_privee: null, // alias
  sport: [
    { key: 'cin_proprietaire', label_fr: 'CIN du propriétaire', label_ar: 'بطاقة التعريف الوطنية للمالك', ocr: true,
      ocr_fields: ['nom', 'prenom', 'cin', 'date_naissance', 'adresse', 'commune', 'cercle', 'nom_ar', 'prenom_ar', 'adresse_ar', 'commune_ar', 'cercle_ar'],
      ocr_prompt: "Extrais les données de cette CIN marocaine. La CIN contient des données en français (côté gauche) ET en arabe (côté droit). Extrais: nom (français), prenom (français), commune (français), cercle (français), nom_ar (الاسم العائلي en arabe), prenom_ar (الاسم الشخصي en arabe), cin, date_naissance (YYYY-MM-DD), adresse (français), adresse_ar (العنوان en arabe), commune_ar (الجماعة en arabe), cercle_ar (الدائرة en arabe). JSON uniquement." },
    { key: 'diplome_education_physique', label_fr: "Diplôme d'éducation physique", label_ar: 'دبلوم التربية البدنية', ocr: true,
      ocr_fields: ['nom', 'specialite', 'universite', 'annee', 'nom_ar', 'specialite_ar', 'universite_ar'],
      ocr_prompt: "Extrais les données de ce diplôme sportif. Le document contient du texte en français ET en arabe. Extrais: nom (français), nom_ar (arabe), specialite (français), specialite_ar (arabe), universite (français), universite_ar (arabe), annee. JSON uniquement." },
    { key: 'bail_propriete', label_fr: 'Bail ou titre de propriété', label_ar: 'عقد الكراء أو سند الملكية', ocr: false },
    { key: 'attestation_conformite_equipements', label_fr: 'Attestation de conformité des équipements', label_ar: 'شهادة مطابقة التجهيزات', ocr: false },
    { key: 'plan_local', label_fr: 'Plan des locaux', label_ar: 'مخطط المحل', ocr: false },
    { key: 'certificat_medical', label_fr: 'Certificat médical du responsable', label_ar: 'الشهادة الطبية للمسؤول', ocr: false },
  ],
  salle_sport: null, // alias
};

// Resolve aliases
LICENCE_OCR_DOCS.cafe_restaurant = LICENCE_OCR_DOCS.cafe;
LICENCE_OCR_DOCS.hopital_clinique = LICENCE_OCR_DOCS.hopital;
LICENCE_OCR_DOCS.ecole_privee = LICENCE_OCR_DOCS.ecole;
LICENCE_OCR_DOCS.salle_sport = LICENCE_OCR_DOCS.sport;

export const getLicenceDocs = (licenceType) => LICENCE_OCR_DOCS[licenceType] || [];

// ── Badge config for licence types ──────────────────────────────────────────
export const LICENCE_BADGE_CONFIG = {
  pharmacie: { bg: 'bg-emerald-50', color: 'text-emerald-700', border: 'border-emerald-200' },
  cafe_restaurant: { bg: 'bg-amber-50', color: 'text-amber-700', border: 'border-amber-200' },
  hopital_clinique: { bg: 'bg-blue-50', color: 'text-blue-700', border: 'border-blue-200' },
  ecole_privee: { bg: 'bg-violet-50', color: 'text-violet-700', border: 'border-violet-200' },
  salle_sport: { bg: 'bg-rose-50', color: 'text-rose-700', border: 'border-rose-200' },
};

// ── OCR field mapping for form auto-fill ────────────────────────────────────
export const OCR_FIELD_MAP = {
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
  specialite: ['diplome', 'specialite', 'qualification_sportive', 'diplome_directeur'],
  specialite_ar: ['diplome_ar', 'specialite_ar', 'qualification_sportive_ar', 'diplome_directeur_ar'],
  universite: ['universite'],
  universite_ar: ['universite_ar'],
  annee: ['annee_obtention'],
  adresse_local: ['adresse_local', 'adresse_complete', 'adresse'],
  adresse_local_ar: ['adresse_local_ar'],
  superficie: ['superficie', 'superficie_totale'],
  nom_proprietaire: ['nom_complet', 'nom_proprietaire'],
  nom_proprietaire_ar: ['nom_complet_ar', 'nom_proprietaire_ar'],
  numero_autorisation: ['numero_izin', 'numero_autorisation'],
  date_autorisation: ['date_izin'],
  numero_permis: ['numero_izin'],
  date_permis: ['date_izin'],
};

export const mergeOcrIntoForm = (existing, extracted) => {
  const merged = { ...existing };
  Object.entries(extracted).forEach(([srcKey, value]) => {
    if (!value) return;
    const targets = OCR_FIELD_MAP[srcKey] || [srcKey];
    targets.forEach(tgt => {
      if (tgt in merged && !merged[tgt]) merged[tgt] = value;
    });
  });
  if (extracted.nom || extracted.prenom) {
    const full = [extracted.prenom, extracted.nom].filter(Boolean).join(' ');
    if (full) merged.nom_complet = full;
  }
  if (extracted.nom_ar || extracted.prenom_ar) {
    merged.nom_complet_ar = [extracted.prenom_ar, extracted.nom_ar].filter(Boolean).join(' ');
  }
  return merged;
};
