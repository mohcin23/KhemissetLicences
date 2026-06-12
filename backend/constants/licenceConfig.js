/**
 * licenceConfig.js — Source de vérité côté backend pour les 5 types de licences.
 * Province de Khémisset — Gestion des licences d'ouverture.
 *
 * Chaque type de licence expose :
 *   - label_fr / label_ar         : libellés d'affichage
 *   - documents[]                 : pièces requises, avec config OCR
 *   - form_sections[]             : champs du formulaire de demande
 */

'use strict';

const LICENCE_CONFIGS = {

  // ══════════════════════════════════════════════════════════════
  // 1. PHARMACIE
  // ══════════════════════════════════════════════════════════════
  pharmacie: {
    label_fr: 'Licence de Pharmacie',
    label_ar: 'رخصة الصيدلية',

    documents: [
      {
        key: 'cin_proprietaire',
        label_fr: 'CIN du propriétaire',
        label_ar: 'بطاقة التعريف الوطنية للمالك',
        ocr: true,
        ocr_fields: ['nom', 'prenom', 'cin', 'date_naissance', 'adresse'],
        ocr_prompt: `Extrais les informations suivantes de cette CIN marocaine et retourne UNIQUEMENT un JSON valide sans commentaires ni markdown :
{
  "nom": "nom de famille",
  "prenom": "prénom",
  "cin": "numéro CIN (lettres majuscules + chiffres, ex: BE123456)",
  "date_naissance": "date de naissance au format YYYY-MM-DD",
  "adresse": "adresse complète inscrite sur la CIN"
}
Champ non trouvé = chaîne vide "".`
      },
      {
        key: 'diplome_pharmacie',
        label_fr: 'Diplôme de pharmacie',
        label_ar: 'دبلوم الصيدلة',
        ocr: true,
        ocr_fields: ['nom', 'specialite', 'universite', 'annee'],
        ocr_prompt: `Extrais les informations suivantes de ce diplôme de pharmacie marocain et retourne UNIQUEMENT un JSON valide sans commentaires ni markdown :
{
  "nom": "nom complet du titulaire",
  "specialite": "spécialité ou intitulé exact du diplôme",
  "universite": "nom de l'université ou établissement délivrant le diplôme",
  "annee": "année d'obtention (YYYY)"
}
Champ non trouvé = chaîne vide "".`
      },
      {
        key: 'permis_exercice',
        label_fr: "Permis d'exercice",
        label_ar: 'رخصة المزاولة',
        ocr: true,
        ocr_fields: ['numero_permis', 'date_permis'],
        ocr_prompt: `Extrais les informations suivantes de ce permis d'exercice marocain et retourne UNIQUEMENT un JSON valide sans commentaires ni markdown :
{
  "numero_permis": "numéro du permis / izin",
  "date_permis": "date de délivrance au format YYYY-MM-DD"
}
Champ non trouvé = chaîne vide "".`
      },
      {
        key: 'certificat_distance',
        label_fr: 'Certificat de distance',
        label_ar: 'شهادة المسافة',
        ocr: false
      },
      {
        key: 'pv_commission',
        label_fr: 'PV de la commission',
        label_ar: 'محضر اللجنة',
        ocr: false
      }
    ],

    form_sections: [
      { key: 'nom_complet',      label_fr: 'Nom complet',           label_ar: 'الاسم الكامل',          type: 'text',     required: true,  section: 'identite' },
      { key: 'cin',              label_fr: 'Numéro CIN',            label_ar: 'رقم بطاقة التعريف',     type: 'text',     required: true,  section: 'identite' },
      { key: 'date_naissance',   label_fr: 'Date de naissance',     label_ar: 'تاريخ الازدياد',        type: 'date',     required: true,  section: 'identite' },
      { key: 'universite',       label_fr: 'Université',            label_ar: 'الجامعة',               type: 'text',     required: false, section: 'formation' },
      { key: 'diplome',          label_fr: 'Diplôme',               label_ar: 'الشهادة',               type: 'text',     required: false, section: 'formation' },
      { key: 'adresse_complete', label_fr: 'Adresse complète',      label_ar: 'العنوان الكامل',        type: 'textarea', required: true,  section: 'localisation' },
      { key: 'commune',          label_fr: 'Commune',               label_ar: 'الجماعة',               type: 'text',     required: true,  section: 'localisation' },
      { key: 'cercle',           label_fr: 'Cercle',                label_ar: 'الدائرة',               type: 'text',     required: true,  section: 'localisation' },
      { key: 'nom_pharmacie',    label_fr: 'Nom de la pharmacie',   label_ar: 'اسم الصيدلية',          type: 'text',     required: true,  section: 'etablissement' },
      { key: 'date_izin',        label_fr: 'Date izin',             label_ar: 'تاريخ الإذن',           type: 'date',     required: false, section: 'autorisation' },
      { key: 'numero_izin',      label_fr: 'Numéro izin',           label_ar: 'رقم الإذن',             type: 'text',     required: false, section: 'autorisation' }
    ]
  },

  // ══════════════════════════════════════════════════════════════
  // 2. CAFÉ / RESTAURANT
  // ══════════════════════════════════════════════════════════════
  cafe_restaurant: {
    label_fr: 'Licence Café / Restaurant',
    label_ar: 'رخصة المقهى / المطعم',

    documents: [
      {
        key: 'cin_proprietaire',
        label_fr: 'CIN du propriétaire',
        label_ar: 'بطاقة التعريف الوطنية للمالك',
        ocr: true,
        ocr_fields: ['nom', 'prenom', 'cin', 'date_naissance', 'adresse'],
        ocr_prompt: `Extrais les informations suivantes de cette CIN marocaine et retourne UNIQUEMENT un JSON valide sans commentaires ni markdown :
{
  "nom": "nom de famille",
  "prenom": "prénom",
  "cin": "numéro CIN (lettres majuscules + chiffres)",
  "date_naissance": "date de naissance au format YYYY-MM-DD",
  "adresse": "adresse complète inscrite sur la CIN"
}
Champ non trouvé = chaîne vide "".`
      },
      {
        key: 'bail_propriete',
        label_fr: 'Bail ou titre de propriété',
        label_ar: 'عقد الكراء أو سند الملكية',
        ocr: true,
        ocr_fields: ['adresse_local', 'superficie', 'nom_proprietaire'],
        ocr_prompt: `Extrais les informations suivantes de ce document (bail ou titre de propriété marocain) et retourne UNIQUEMENT un JSON valide sans commentaires ni markdown :
{
  "adresse_local": "adresse complète du local",
  "superficie": "superficie en m² (nombre uniquement)",
  "nom_proprietaire": "nom du propriétaire ou bailleur"
}
Champ non trouvé = chaîne vide "".`
      },
      {
        key: 'certificat_conformite',
        label_fr: 'Certificat de conformité',
        label_ar: 'شهادة المطابقة',
        ocr: false
      },
      {
        key: 'autorisation_exploitation',
        label_fr: "Autorisation d'exploitation",
        label_ar: 'رخصة الاستغلال',
        ocr: false
      },
      {
        key: 'plan_local',
        label_fr: 'Plan du local',
        label_ar: 'مخطط المحل',
        ocr: false
      }
    ],

    form_sections: [
      { key: 'nom',                 label_fr: 'Nom',                        label_ar: 'الاسم العائلي',              type: 'text',     required: true,  section: 'identite' },
      { key: 'prenom',              label_fr: 'Prénom',                     label_ar: 'الاسم الشخصي',               type: 'text',     required: true,  section: 'identite' },
      { key: 'cin',                 label_fr: 'Numéro CIN',                 label_ar: 'رقم بطاقة التعريف',          type: 'text',     required: true,  section: 'identite' },
      { key: 'date_naissance',      label_fr: 'Date de naissance',          label_ar: 'تاريخ الازدياد',             type: 'date',     required: true,  section: 'identite' },
      { key: 'adresse_proprietaire',label_fr: 'Adresse du propriétaire',    label_ar: 'عنوان المالك',               type: 'textarea', required: true,  section: 'identite' },
      { key: 'adresse_local',       label_fr: 'Adresse du local',           label_ar: 'عنوان المحل',                type: 'textarea', required: true,  section: 'etablissement' },
      { key: 'superficie',          label_fr: 'Superficie (m²)',            label_ar: 'المساحة (م²)',               type: 'number',   required: true,  section: 'etablissement' },
      { key: 'capacite_places',     label_fr: 'Capacité (nombre de places)',label_ar: 'الطاقة الاستيعابية (مقاعد)', type: 'number',   required: true,  section: 'etablissement' },
      { key: 'type_etablissement',  label_fr: "Type d'établissement",       label_ar: 'نوع المؤسسة',                type: 'select',   required: true,  section: 'etablissement',
        options: ['Café', 'Restaurant', 'Café-Restaurant', 'Fast-food', 'Snack'] },
      { key: 'telephone',           label_fr: 'Téléphone',                  label_ar: 'الهاتف',                     type: 'tel',      required: false, section: 'contact' },
      { key: 'email',               label_fr: 'Email',                      label_ar: 'البريد الإلكتروني',          type: 'email',    required: false, section: 'contact' }
    ]
  },

  // ══════════════════════════════════════════════════════════════
  // 3. HÔPITAL / CLINIQUE
  // ══════════════════════════════════════════════════════════════
  hopital_clinique: {
    label_fr: 'Licence Hôpital / Clinique',
    label_ar: 'رخصة المستشفى / العيادة',

    documents: [
      {
        key: 'cin_directeur',
        label_fr: 'CIN du directeur médical',
        label_ar: 'بطاقة التعريف الوطنية للمدير الطبي',
        ocr: true,
        ocr_fields: ['nom', 'prenom', 'cin', 'date_naissance', 'adresse'],
        ocr_prompt: `Extrais les informations suivantes de cette CIN marocaine et retourne UNIQUEMENT un JSON valide sans commentaires ni markdown :
{
  "nom": "nom de famille",
  "prenom": "prénom",
  "cin": "numéro CIN (lettres majuscules + chiffres)",
  "date_naissance": "date de naissance au format YYYY-MM-DD",
  "adresse": "adresse complète inscrite sur la CIN"
}
Champ non trouvé = chaîne vide "".`
      },
      {
        key: 'diplome_medecin',
        label_fr: 'Diplôme de médecine / spécialité',
        label_ar: 'دبلوم الطب / التخصص',
        ocr: true,
        ocr_fields: ['nom', 'specialite', 'universite', 'annee'],
        ocr_prompt: `Extrais les informations suivantes de ce diplôme médical marocain et retourne UNIQUEMENT un JSON valide sans commentaires ni markdown :
{
  "nom": "nom complet du titulaire",
  "specialite": "spécialité médicale ou intitulé exact du diplôme",
  "universite": "nom de l'université ou faculté de médecine",
  "annee": "année d'obtention (YYYY)"
}
Champ non trouvé = chaîne vide "".`
      },
      {
        key: 'autorisation_exploitation',
        label_fr: "Autorisation d'exploitation",
        label_ar: 'رخصة الاستغلال',
        ocr: true,
        ocr_fields: ['numero_autorisation', 'date_autorisation'],
        ocr_prompt: `Extrais les informations suivantes de cette autorisation d'exploitation et retourne UNIQUEMENT un JSON valide sans commentaires ni markdown :
{
  "numero_autorisation": "numéro de l'autorisation",
  "date_autorisation": "date de délivrance au format YYYY-MM-DD"
}
Champ non trouvé = chaîne vide "".`
      },
      {
        key: 'plan_architectural',
        label_fr: 'Plan architectural',
        label_ar: 'المخطط المعماري',
        ocr: false
      },
      {
        key: 'certificat_conformite_incendie',
        label_fr: 'Certificat de conformité incendie',
        label_ar: 'شهادة مطابقة الوقاية من الحريق',
        ocr: false
      },
      {
        key: 'liste_equipements_medicaux',
        label_fr: 'Liste des équipements médicaux',
        label_ar: 'قائمة التجهيزات الطبية',
        ocr: false
      }
    ],

    form_sections: [
      { key: 'nom_directeur',          label_fr: 'Nom du directeur médical',    label_ar: 'اسم المدير الطبي',              type: 'text',     required: true,  section: 'identite' },
      { key: 'prenom_directeur',        label_fr: 'Prénom du directeur médical', label_ar: 'الاسم الشخصي للمدير الطبي',     type: 'text',     required: true,  section: 'identite' },
      { key: 'cin_directeur',           label_fr: 'CIN du directeur',            label_ar: 'بطاقة التعريف للمدير',          type: 'text',     required: true,  section: 'identite' },
      { key: 'specialite',              label_fr: 'Spécialité',                  label_ar: 'التخصص',                        type: 'text',     required: true,  section: 'identite' },
      { key: 'numero_autorisation',     label_fr: "Numéro d'autorisation",       label_ar: 'رقم الترخيص',                   type: 'text',     required: false, section: 'autorisation' },
      { key: 'nom_clinique',            label_fr: 'Nom de la clinique / hôpital',label_ar: 'اسم العيادة / المستشفى',         type: 'text',     required: true,  section: 'etablissement' },
      { key: 'adresse',                 label_fr: 'Adresse',                     label_ar: 'العنوان',                       type: 'textarea', required: true,  section: 'etablissement' },
      { key: 'superficie',              label_fr: 'Superficie (m²)',             label_ar: 'المساحة (م²)',                  type: 'number',   required: true,  section: 'etablissement' },
      { key: 'nombre_lits',             label_fr: 'Nombre de lits',              label_ar: 'عدد الأسرة',                    type: 'number',   required: true,  section: 'etablissement' },
      { key: 'type_clinique',           label_fr: 'Type de clinique',            label_ar: 'نوع العيادة',                   type: 'select',   required: true,  section: 'etablissement',
        options: ['Clinique générale', 'Clinique spécialisée', 'Hôpital privé', 'Centre de soins', 'Polyclinique'] },
      { key: 'specialites_proposees',   label_fr: 'Spécialités proposées',       label_ar: 'التخصصات المقدمة',              type: 'array',    required: false, section: 'etablissement' },
      { key: 'telephone',               label_fr: 'Téléphone',                   label_ar: 'الهاتف',                        type: 'tel',      required: false, section: 'contact' },
      { key: 'email',                   label_fr: 'Email',                       label_ar: 'البريد الإلكتروني',             type: 'email',    required: false, section: 'contact' }
    ]
  },

  // ══════════════════════════════════════════════════════════════
  // 4. ÉCOLE PRIVÉE
  // ══════════════════════════════════════════════════════════════
  ecole_privee: {
    label_fr: 'Licence École Privée',
    label_ar: 'رخصة المدرسة الخصوصية',

    documents: [
      {
        key: 'cin_directeur',
        label_fr: 'CIN du directeur',
        label_ar: 'بطاقة التعريف الوطنية للمدير',
        ocr: true,
        ocr_fields: ['nom', 'prenom', 'cin', 'date_naissance', 'adresse'],
        ocr_prompt: `Extrais les informations suivantes de cette CIN marocaine et retourne UNIQUEMENT un JSON valide sans commentaires ni markdown :
{
  "nom": "nom de famille",
  "prenom": "prénom",
  "cin": "numéro CIN (lettres majuscules + chiffres)",
  "date_naissance": "date de naissance au format YYYY-MM-DD",
  "adresse": "adresse complète inscrite sur la CIN"
}
Champ non trouvé = chaîne vide "".`
      },
      {
        key: 'diplome_directeur',
        label_fr: 'Diplôme du directeur',
        label_ar: 'دبلوم المدير',
        ocr: true,
        ocr_fields: ['nom', 'specialite', 'universite', 'annee'],
        ocr_prompt: `Extrais les informations suivantes de ce diplôme et retourne UNIQUEMENT un JSON valide sans commentaires ni markdown :
{
  "nom": "nom complet du titulaire",
  "specialite": "spécialité ou intitulé exact du diplôme",
  "universite": "nom de l'université ou établissement",
  "annee": "année d'obtention (YYYY)"
}
Champ non trouvé = chaîne vide "".`
      },
      {
        key: 'bail_propriete',
        label_fr: 'Bail ou titre de propriété',
        label_ar: 'عقد الكراء أو سند الملكية',
        ocr: false
      },
      {
        key: 'plans_locaux',
        label_fr: 'Plans des locaux',
        label_ar: 'مخططات المحلات',
        ocr: false
      },
      {
        key: 'liste_enseignants',
        label_fr: 'Liste des enseignants',
        label_ar: 'قائمة الأساتذة',
        ocr: false
      },
      {
        key: 'attestation_conformite_salles',
        label_fr: 'Attestation de conformité des salles',
        label_ar: 'شهادة مطابقة القاعات',
        ocr: false
      }
    ],

    form_sections: [
      { key: 'nom_directeur',      label_fr: 'Nom du directeur',        label_ar: 'اسم المدير',                  type: 'text',     required: true,  section: 'identite' },
      { key: 'prenom_directeur',   label_fr: 'Prénom du directeur',     label_ar: 'الاسم الشخصي للمدير',         type: 'text',     required: true,  section: 'identite' },
      { key: 'cin_directeur',      label_fr: 'CIN du directeur',        label_ar: 'بطاقة التعريف للمدير',        type: 'text',     required: true,  section: 'identite' },
      { key: 'diplome_directeur',  label_fr: 'Diplôme du directeur',    label_ar: 'دبلوم المدير',                type: 'text',     required: true,  section: 'formation' },
      { key: 'experience_annees',  label_fr: 'Expérience (années)',     label_ar: 'الخبرة (سنوات)',              type: 'number',   required: false, section: 'formation' },
      { key: 'nom_ecole',          label_fr: "Nom de l'école",          label_ar: 'اسم المدرسة',                 type: 'text',     required: true,  section: 'etablissement' },
      { key: 'adresse',            label_fr: 'Adresse',                 label_ar: 'العنوان',                     type: 'textarea', required: true,  section: 'etablissement' },
      { key: 'superficie_totale',  label_fr: 'Superficie totale (m²)', label_ar: 'المساحة الإجمالية (م²)',       type: 'number',   required: true,  section: 'etablissement' },
      { key: 'cycle',              label_fr: "Cycle d'enseignement",    label_ar: 'مستوى التعليم',               type: 'select',   required: true,  section: 'etablissement',
        options: ['Préscolaire', 'Primaire', 'Collège', 'Lycée', 'Préscolaire + Primaire', 'Tous cycles'] },
      { key: 'nombre_classes',     label_fr: 'Nombre de classes',       label_ar: 'عدد الأقسام',                 type: 'number',   required: true,  section: 'etablissement' },
      { key: 'capacite_eleves',    label_fr: 'Capacité élèves',         label_ar: 'الطاقة الاستيعابية للتلاميذ', type: 'number',   required: true,  section: 'etablissement' },
      { key: 'telephone',          label_fr: 'Téléphone',               label_ar: 'الهاتف',                      type: 'tel',      required: false, section: 'contact' },
      { key: 'email',              label_fr: 'Email',                   label_ar: 'البريد الإلكتروني',           type: 'email',    required: false, section: 'contact' }
    ]
  },

  // ══════════════════════════════════════════════════════════════
  // 5. SALLE DE SPORT
  // ══════════════════════════════════════════════════════════════
  salle_sport: {
    label_fr: 'Licence Salle de Sport',
    label_ar: 'رخصة قاعة الرياضة',

    documents: [
      {
        key: 'cin_proprietaire',
        label_fr: 'CIN du propriétaire',
        label_ar: 'بطاقة التعريف الوطنية للمالك',
        ocr: true,
        ocr_fields: ['nom', 'prenom', 'cin', 'date_naissance', 'adresse'],
        ocr_prompt: `Extrais les informations suivantes de cette CIN marocaine et retourne UNIQUEMENT un JSON valide sans commentaires ni markdown :
{
  "nom": "nom de famille",
  "prenom": "prénom",
  "cin": "numéro CIN (lettres majuscules + chiffres)",
  "date_naissance": "date de naissance au format YYYY-MM-DD",
  "adresse": "adresse complète inscrite sur la CIN"
}
Champ non trouvé = chaîne vide "".`
      },
      {
        key: 'bail_propriete',
        label_fr: 'Bail ou titre de propriété',
        label_ar: 'عقد الكراء أو سند الملكية',
        ocr: false
      },
      {
        key: 'diplome_education_physique',
        label_fr: "Diplôme d'éducation physique",
        label_ar: 'دبلوم التربية البدنية',
        ocr: true,
        ocr_fields: ['nom', 'specialite', 'universite', 'annee'],
        ocr_prompt: `Extrais les informations suivantes de ce diplôme d'éducation physique ou sportive et retourne UNIQUEMENT un JSON valide sans commentaires ni markdown :
{
  "nom": "nom complet du titulaire",
  "specialite": "spécialité ou qualification sportive",
  "universite": "nom de l'établissement ou institut",
  "annee": "année d'obtention (YYYY)"
}
Champ non trouvé = chaîne vide "".`
      },
      {
        key: 'attestation_conformite_equipements',
        label_fr: 'Attestation de conformité des équipements',
        label_ar: 'شهادة مطابقة التجهيزات',
        ocr: false
      },
      {
        key: 'plan_local',
        label_fr: 'Plan des locaux',
        label_ar: 'مخطط المحل',
        ocr: false
      },
      {
        key: 'certificat_medical',
        label_fr: 'Certificat médical du responsable',
        label_ar: 'الشهادة الطبية للمسؤول',
        ocr: false
      }
    ],

    form_sections: [
      { key: 'nom',                    label_fr: 'Nom',                      label_ar: 'الاسم العائلي',               type: 'text',     required: true,  section: 'identite' },
      { key: 'prenom',                 label_fr: 'Prénom',                   label_ar: 'الاسم الشخصي',                type: 'text',     required: true,  section: 'identite' },
      { key: 'cin',                    label_fr: 'Numéro CIN',               label_ar: 'رقم بطاقة التعريف',           type: 'text',     required: true,  section: 'identite' },
      { key: 'qualification_sportive', label_fr: 'Qualification sportive',   label_ar: 'المؤهل الرياضي',              type: 'text',     required: true,  section: 'formation' },
      { key: 'nom_salle',              label_fr: 'Nom de la salle',          label_ar: 'اسم القاعة',                  type: 'text',     required: true,  section: 'etablissement' },
      { key: 'adresse',                label_fr: 'Adresse',                  label_ar: 'العنوان',                     type: 'textarea', required: true,  section: 'etablissement' },
      { key: 'superficie',             label_fr: 'Superficie (m²)',          label_ar: 'المساحة (م²)',                type: 'number',   required: true,  section: 'etablissement' },
      { key: 'type_activites',         label_fr: "Type d'activités",         label_ar: 'نوع الأنشطة',                 type: 'select',   required: true,  section: 'etablissement',
        options: ['Musculation', 'Arts martiaux', 'Fitness / Cardio', 'Natation', 'Sports collectifs', 'Multi-activités'] },
      { key: 'capacite_membres',       label_fr: 'Capacité membres',         label_ar: 'الطاقة الاستيعابية للأعضاء', type: 'number',   required: true,  section: 'etablissement' },
      { key: 'equipements_disponibles',label_fr: 'Équipements disponibles',  label_ar: 'التجهيزات المتوفرة',          type: 'array',    required: false, section: 'etablissement' },
      { key: 'telephone',              label_fr: 'Téléphone',                label_ar: 'الهاتف',                      type: 'tel',      required: false, section: 'contact' },
      { key: 'email',                  label_fr: 'Email',                    label_ar: 'البريد الإلكتروني',           type: 'email',    required: false, section: 'contact' }
    ]
  }

};

module.exports = { LICENCE_CONFIGS };
