import React from 'react';

const EXTRA_DATA_LABELS = {
  fr: {
    superficie: 'Superficie (m²)', capacite_places: 'Capacité (places)',
    type_etablissement: 'Type d\'établissement', nom_clinique: 'Nom clinique/hôpital',
    nom_ecole: 'Nom de l\'école', nom_salle: 'Nom de la salle',
    nombre_lits: 'Nombre de lits', nombre_classes: 'Nombre de classes',
    capacite_eleves: 'Capacité élèves', capacite_membres: 'Capacité membres',
    type_clinique: 'Type de clinique', cycle: 'Cycle d\'enseignement',
    type_activites: 'Type d\'activités', specialites_proposees: 'Spécialités proposées',
    equipements_disponibles: 'Équipements disponibles', qualification_sportive: 'Qualification sportive',
    nom_directeur: 'Nom directeur', prenom_directeur: 'Prénom directeur',
    cin_directeur: 'CIN directeur', specialite: 'Spécialité',
    numero_autorisation: 'N° autorisation', adresse_local: 'Adresse du local',
    adresse_proprietaire: 'Adresse propriétaire', superficie_totale: 'Superficie totale (m²)',
    experience_annees: 'Expérience (années)',
  },
  ar: {
    superficie: 'المساحة (م²)', capacite_places: 'الطاقة الاستيعابية (مقاعد)',
    type_etablissement: 'نوع المؤسسة', nom_clinique: 'اسم العيادة/المستشفى',
    nom_ecole: 'اسم المدرسة', nom_salle: 'اسم القاعة',
    nombre_lits: 'عدد الأسرة', nombre_classes: 'عدد الأقسام',
    capacite_eleves: 'الطاقة الاستيعابية للتلاميذ', capacite_membres: 'الطاقة الاستيعابية للأعضاء',
    type_clinique: 'نوع العيادة', cycle: 'مستوى التعليم',
    type_activites: 'نوع الأنشطة', specialites_proposees: 'التخصصات المقدمة',
    equipements_disponibles: 'التجهيزات المتوفرة', qualification_sportive: 'المؤهل الرياضي',
    nom_directeur: 'اسم المدير', prenom_directeur: 'الاسم الشخصي للمدير',
    cin_directeur: 'بطاقة التعريف للمدير', specialite: 'التخصص',
    numero_autorisation: 'رقم الترخيص', adresse_local: 'عنوان المحل',
    adresse_proprietaire: 'عنوان المالك', superficie_totale: 'المساحة الإجمالية (م²)',
    experience_annees: 'الخبرة (سنوات)',
  }
};

function ExtraDataPanel({ extraData, lang }) {
  if (!extraData) return null;
  let parsed = {};
  try { parsed = typeof extraData === 'string' ? JSON.parse(extraData) : (extraData || {}); } catch { return null; }
  const entries = Object.entries(parsed).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!entries.length) return null;
  const labels = EXTRA_DATA_LABELS[lang] || EXTRA_DATA_LABELS.fr;
  return (
    <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
      <h4 className="m-0 mb-2.5 text-[13px] font-bold text-[#0f3f32]">
        {lang === 'ar' ? 'البيانات التكميلية للملف' : 'Données complémentaires du dossier'}
      </h4>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {entries.map(([key, value]) => (
          <div key={key} className="bg-white rounded-lg px-2.5 py-2 border border-gray-200">
            <div className="text-[11px] text-gray-500 font-semibold mb-0.5">
              {labels[key] || key}
            </div>
            <div className="text-[13px] text-slate-800 font-medium">
              {Array.isArray(value) ? value.join(', ') : String(value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ExtraDataPanel;
