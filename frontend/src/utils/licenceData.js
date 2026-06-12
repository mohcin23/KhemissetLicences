export const LICENCE_OCR_DOCS = {
  pharmacie: [
    { key: 'cin_proprietaire', label_fr: 'CIN du propriétaire', label_ar: 'بطاقة التعريف الوطنية للمالك', ocr: true,
      ocr_fields: ['nom', 'prenom', 'cin', 'date_naissance', 'adresse'],
      ocr_prompt: 'Extrais nom, prenom, cin, date_naissance (YYYY-MM-DD), adresse de cette CIN marocaine. JSON uniquement.' },
    { key: 'diplome_pharmacie', label_fr: 'Diplôme de pharmacie', label_ar: 'دبلوم الصيدلة', ocr: true,
      ocr_fields: ['nom', 'specialite', 'universite', 'annee'],
      ocr_prompt: 'Extrais nom, specialite, universite, annee de ce diplôme. JSON uniquement.' },
    { key: 'permis_exercice', label_fr: "Permis d'exercice", label_ar: 'رخصة المزاولة', ocr: true,
      ocr_fields: ['numero_permis', 'date_permis'],
      ocr_prompt: 'Extrais numero_permis, date_permis (YYYY-MM-DD). JSON uniquement.' },
    { key: 'certificat_distance', label_fr: 'Certificat de distance', label_ar: 'شهادة المسافة', ocr: false },
    { key: 'pv_commission', label_fr: 'PV de la commission', label_ar: 'محضر اللجنة', ocr: false },
  ],
  cafe: [
    { key: 'cin_proprietaire', label_fr: 'CIN du propriétaire', label_ar: 'بطاقة التعريف الوطنية للمالك', ocr: true,
      ocr_fields: ['nom', 'prenom', 'cin', 'date_naissance', 'adresse'],
      ocr_prompt: 'Extrais nom, prenom, cin, date_naissance (YYYY-MM-DD), adresse de cette CIN marocaine. JSON uniquement.' },
    { key: 'bail_propriete', label_fr: 'Bail ou titre de propriété', label_ar: 'عقد الكراء أو سند الملكية', ocr: true,
      ocr_fields: ['adresse_local', 'superficie', 'nom_proprietaire'],
      ocr_prompt: 'Extrais adresse_local, superficie (nombre m²), nom_proprietaire de ce bail. JSON uniquement.' },
    { key: 'certificat_conformite', label_fr: 'Certificat de conformité', label_ar: 'شهادة المطابقة', ocr: false },
    { key: 'autorisation_exploitation', label_fr: "Autorisation d'exploitation", label_ar: 'رخصة الاستغلال', ocr: false },
    { key: 'plan_local', label_fr: 'Plan du local', label_ar: 'مخطط المحل', ocr: false },
  ],
  cafe_restaurant: [
    { key: 'cin_proprietaire', label_fr: 'CIN du propriétaire', label_ar: 'بطاقة التعريف الوطنية للمالك', ocr: true,
      ocr_fields: ['nom', 'prenom', 'cin', 'date_naissance', 'adresse'],
      ocr_prompt: 'Extrais nom, prenom, cin, date_naissance (YYYY-MM-DD), adresse de cette CIN marocaine. JSON uniquement.' },
    { key: 'bail_propriete', label_fr: 'Bail ou titre de propriété', label_ar: 'عقد الكراء أو سند الملكية', ocr: true,
      ocr_fields: ['adresse_local', 'superficie', 'nom_proprietaire'],
      ocr_prompt: 'Extrais adresse_local, superficie (nombre m²), nom_proprietaire de ce bail. JSON uniquement.' },
    { key: 'certificat_conformite', label_fr: 'Certificat de conformité', label_ar: 'شهادة المطابقة', ocr: false },
    { key: 'autorisation_exploitation', label_fr: "Autorisation d'exploitation", label_ar: 'رخصة الاستغلال', ocr: false },
    { key: 'plan_local', label_fr: 'Plan du local', label_ar: 'مخطط المحل', ocr: false },
  ],
  hopital: [
    { key: 'cin_directeur', label_fr: 'CIN du directeur médical', label_ar: 'بطاقة التعريف الوطنية للمدير الطبي', ocr: true,
      ocr_fields: ['nom', 'prenom', 'cin', 'date_naissance', 'adresse'],
      ocr_prompt: 'Extrais nom, prenom, cin, date_naissance (YYYY-MM-DD), adresse de cette CIN marocaine. JSON uniquement.' },
    { key: 'diplome_medecin', label_fr: 'Diplôme de médecine / spécialité', label_ar: 'دبلوم الطب / التخصص', ocr: true,
      ocr_fields: ['nom', 'specialite', 'universite', 'annee'],
      ocr_prompt: 'Extrais nom, specialite, universite, annee de ce diplôme médical. JSON uniquement.' },
    { key: 'autorisation_exploitation', label_fr: "Autorisation d'exploitation", label_ar: 'رخصة الاستغلال', ocr: true,
      ocr_fields: ['numero_autorisation', 'date_autorisation'],
      ocr_prompt: 'Extrais numero_autorisation, date_autorisation (YYYY-MM-DD). JSON uniquement.' },
    { key: 'plan_architectural', label_fr: 'Plan architectural', label_ar: 'المخطط المعماري', ocr: false },
    { key: 'certificat_conformite_incendie', label_fr: 'Certificat de conformité incendie', label_ar: 'شهادة مطابقة الوقاية من الحريق', ocr: false },
    { key: 'liste_equipements_medicaux', label_fr: 'Liste des équipements médicaux', label_ar: 'قائمة التجهيزات الطبية', ocr: false },
  ],
  hopital_clinique: null,
  ecole: [
    { key: 'cin_directeur', label_fr: 'CIN du directeur', label_ar: 'بطاقة التعريف الوطنية للمدير', ocr: true,
      ocr_fields: ['nom', 'prenom', 'cin', 'date_naissance', 'adresse'],
      ocr_prompt: 'Extrais nom, prenom, cin, date_naissance (YYYY-MM-DD), adresse de cette CIN. JSON uniquement.' },
    { key: 'diplome_directeur', label_fr: 'Diplôme du directeur', label_ar: 'دبلوم المدير', ocr: true,
      ocr_fields: ['nom', 'specialite', 'universite', 'annee'],
      ocr_prompt: 'Extrais nom, specialite, universite, annee de ce diplôme. JSON uniquement.' },
    { key: 'bail_propriete', label_fr: 'Bail ou titre de propriété', label_ar: 'عقد الكراء أو سند الملكية', ocr: false },
    { key: 'plans_locaux', label_fr: 'Plans des locaux', label_ar: 'مخططات المحلات', ocr: false },
    { key: 'liste_enseignants', label_fr: 'Liste des enseignants', label_ar: 'قائمة الأساتذة', ocr: false },
    { key: 'attestation_conformite_salles', label_fr: 'Attestation de conformité des salles', label_ar: 'شهادة مطابقة القاعات', ocr: false },
  ],
  ecole_privee: null,
  sport: [
    { key: 'cin_proprietaire', label_fr: 'CIN du propriétaire', label_ar: 'بطاقة التعريف الوطنية للمالك', ocr: true,
      ocr_fields: ['nom', 'prenom', 'cin', 'date_naissance', 'adresse'],
      ocr_prompt: 'Extrais nom, prenom, cin, date_naissance (YYYY-MM-DD), adresse de cette CIN. JSON uniquement.' },
    { key: 'diplome_education_physique', label_fr: "Diplôme d'éducation physique", label_ar: 'دبلوم التربية البدنية', ocr: true,
      ocr_fields: ['nom', 'specialite', 'universite', 'annee'],
      ocr_prompt: 'Extrais nom, specialite, universite, annee de ce diplôme sportif. JSON uniquement.' },
    { key: 'bail_propriete', label_fr: 'Bail ou titre de propriété', label_ar: 'عقد الكراء أو سند الملكية', ocr: false },
    { key: 'attestation_conformite_equipements', label_fr: 'Attestation de conformité des équipements', label_ar: 'شهادة مطابقة التجهيزات', ocr: false },
    { key: 'plan_local', label_fr: 'Plan des locaux', label_ar: 'مخطط المحل', ocr: false },
    { key: 'certificat_medical', label_fr: 'Certificat médical du responsable', label_ar: 'الشهادة الطبية للمسؤول', ocr: false },
  ],
  salle_sport: null,
};
LICENCE_OCR_DOCS.hopital_clinique = LICENCE_OCR_DOCS.hopital;
LICENCE_OCR_DOCS.ecole_privee = LICENCE_OCR_DOCS.ecole;
LICENCE_OCR_DOCS.salle_sport = LICENCE_OCR_DOCS.sport;

export const getLicenceDocs = (licenceType) => LICENCE_OCR_DOCS[licenceType] || [];

export const LICENCE_VIEW_META = {
  pharmacie: {
    title_fr: 'Pharmacie', title_ar: 'صيدلية',
    description_fr: "Autorisation d'ouverture d'une pharmacie.",
    description_ar: 'ترخيص فتح صيدلية.',
  },
  cafe_restaurant: {
    title_fr: 'Café / Restaurant', title_ar: 'مقهى / مطعم',
    description_fr: "Autorisation d'exploitation d'un café ou restaurant.",
    description_ar: 'ترخيص استغلال مقهى أو مطعم.',
  },
  hopital_clinique: {
    title_fr: 'Hôpital / Clinique', title_ar: 'مستشفى / عيادة',
    description_fr: "Autorisation d'ouverture d'un établissement de soins.",
    description_ar: 'ترخيص فتح مؤسسة صحية.',
  },
  ecole_privee: {
    title_fr: 'École privée', title_ar: 'مدرسة خاصة',
    description_fr: "Autorisation d'ouverture d'un établissement scolaire.",
    description_ar: 'ترخيص فتح مؤسسة تعليمية خاصة.',
  },
  salle_sport: {
    title_fr: 'Salle de sport', title_ar: 'قاعة رياضية',
    description_fr: "Autorisation d'ouverture d'une salle de sport.",
    description_ar: 'ترخيص فتح قاعة رياضية.',
  },
};

export const OCR_FIELD_MAP = {
  nom: ['nom_complet', 'nom', 'nom_directeur'],
  prenom: ['nom_complet', 'prenom', 'prenom_directeur'],
  cin: ['cin', 'cin_directeur'],
  date_naissance: ['date_naissance'],
  adresse: ['adresse_complete', 'adresse', 'adresse_proprietaire'],
  specialite: ['diplome', 'specialite', 'qualification_sportive', 'diplome_directeur'],
  universite: ['universite'],
  annee: ['annee_obtention'],
  adresse_local: ['adresse_local', 'adresse_complete', 'adresse'],
  superficie: ['superficie', 'superficie_totale'],
  nom_proprietaire: ['nom_complet'],
  numero_autorisation: ['numero_izin', 'numero_autorisation'],
  date_autorisation: ['date_izin'],
  numero_permis: ['numero_izin'],
  date_permis: ['date_izin'],
};

export function mergeOcrIntoForm(existing, extracted) {
  const merged = { ...existing };
  Object.entries(extracted).forEach(([srcKey, value]) => {
    if (!value) return;
    const targets = OCR_FIELD_MAP[srcKey] || [srcKey];
    targets.forEach(tgt => {
      if (tgt in merged && !merged[tgt]) merged[tgt] = value;
    });
  });
  if (extracted.nom && extracted.prenom) {
    const full = `${extracted.prenom} ${extracted.nom}`.trim();
    if (full && !merged.nom_complet) merged.nom_complet = full;
  }
  return merged;
}

export const compressImageForOcr = (file) => new Promise((resolve, reject) => {
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

export const filePreviewUrl = (file) => new Promise((resolve) => {
  if (!file?.type?.startsWith('image/')) return resolve(null);
  const reader = new FileReader();
  reader.onload = (event) => resolve(event.target.result);
  reader.onerror = () => resolve(null);
  reader.readAsDataURL(file);
});

export const emptyForm = {
  nom_complet: '', cin: '', date_naissance: '',
  universite: '', diplome: '',
  adresse_complete: '',
  date_demande: '', date_izin: '', numero_izin: '',
  nom_massah: '', date_massah: '', date_lajna: '',
  commune: '', cercle: '', notes: ''
};

export const dateInputValue = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
