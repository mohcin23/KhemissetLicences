import React, { useState } from 'react';
import {
  ArrowRight, Check, Coffee, Dumbbell, FileText, Hospital,
  Pill, School,
} from 'lucide-react';

const LICENCES = [
  {
    key: 'pharmacie',
    Icon: Pill,
    label_fr: 'Pharmacie',
    label_ar: 'صيدلية',
    description_fr: "Autorisation d'ouverture de pharmacie",
    description_ar: 'ترخيص فتح صيدلية',
    documents_fr: ['CIN du proprietaire', 'Diplome de pharmacie', "Permis d'exercice", 'Certificat de distance', 'PV de la commission'],
    documents_ar: ['بطاقة التعريف الوطنية للمالك', 'دبلوم الصيدلة', 'رخصة المزاولة', 'شهادة المسافة', 'محضر اللجنة'],
  },
  {
    key: 'cafe_restaurant',
    Icon: Coffee,
    label_fr: 'Cafe / Restaurant',
    label_ar: 'مقهى / مطعم',
    description_fr: "Autorisation d'exploitation d'un cafe ou restaurant",
    description_ar: 'ترخيص استغلال مقهى أو مطعم',
    documents_fr: ['CIN du proprietaire', 'Bail ou titre de propriete', 'Certificat de conformite', "Autorisation d'exploitation", 'Plan du local', 'Attestation sanitaire'],
    documents_ar: ['بطاقة التعريف الوطنية للمالك', 'عقد الكراء أو الملكية', 'شهادة المطابقة', 'رخصة الاستغلال', 'مخطط المحل', 'شهادة صحية'],
  },
  {
    key: 'hopital_clinique',
    Icon: Hospital,
    label_fr: 'Hopital / Clinique',
    label_ar: 'مستشفى / عيادة',
    description_fr: "Autorisation d'ouverture d'un etablissement de soins",
    description_ar: 'ترخيص فتح مؤسسة صحية',
    documents_fr: ['CIN du directeur medical', 'Diplome de medecine', "Autorisation d'exercice", 'Plan architectural', 'Conformite incendie', 'Liste des equipements'],
    documents_ar: ['بطاقة تعريف المدير الطبي', 'دبلوم الطب', 'رخصة المزاولة', 'المخطط المعماري', 'مطابقة الوقاية من الحريق', 'قائمة التجهيزات'],
  },
  {
    key: 'ecole_privee',
    Icon: School,
    label_fr: 'Ecole Privee',
    label_ar: 'مدرسة خاصة',
    description_fr: "Autorisation d'ouverture d'un etablissement scolaire",
    description_ar: 'ترخيص فتح مؤسسة تعليمية خاصة',
    documents_fr: ['CIN du directeur', 'Diplome du directeur', 'Bail ou titre de propriete', 'Plans des locaux', 'Liste des enseignants', 'Conformite des salles'],
    documents_ar: ['بطاقة تعريف المدير', 'دبلوم المدير', 'عقد الكراء أو الملكية', 'مخططات المحلات', 'قائمة الاساتذة', 'مطابقة القاعات'],
  },
  {
    key: 'salle_sport',
    Icon: Dumbbell,
    label_fr: 'Salle de Sport',
    label_ar: 'قاعة رياضية',
    description_fr: "Autorisation d'ouverture d'une salle de sport",
    description_ar: 'ترخيص فتح قاعة رياضية',
    documents_fr: ['CIN du proprietaire', 'Bail ou titre de propriete', "Diplome d'education physique", 'Conformite des equipements', 'Plan du local', 'Certificat medical'],
    documents_ar: ['بطاقة تعريف المالك', 'عقد الكراء أو الملكية', 'دبلوم التربية البدنية', 'مطابقة التجهيزات', 'مخطط المحل', 'شهادة طبية'],
  },
];

export default function LicenceSelector({ lang, onSelect }) {
  const [selectedType, setSelectedType] = useState(null);
  const [hoveredType, setHoveredType] = useState(null);
  const isRtl = lang === 'ar';
  const text = (fr, ar) => (isRtl ? ar : fr);

  const handleSelect = (type) => {
    setSelectedType(type);
    onSelect(type);
  };

  return (
    <section dir={isRtl ? 'rtl' : 'ltr'} className="animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {LICENCES.map((licence) => {
          const Icon = licence.Icon;
          const docs = isRtl ? licence.documents_ar : licence.documents_fr;
          const selected = selectedType === licence.key;
          const hovered = hoveredType === licence.key;

          return (
            <article
              key={licence.key}
              onMouseEnter={() => setHoveredType(licence.key)}
              onMouseLeave={() => setHoveredType(null)}
              onClick={() => handleSelect(licence.key)}
              className={`
                relative bg-white dark:bg-slate-900 border-2 rounded-2xl p-6 cursor-pointer
                transition-all duration-300 ease-out flex flex-col min-h-[400px]
                ${selected
                  ? 'border-[#10B981] dark:border-[#3ebd93] shadow-[0_8px_30px_rgba(16,185,129,0.12)] ring-4 ring-[#10B981]/10 scale-[1.02]'
                  : 'border-[#E2E8F0] dark:border-slate-700 hover:border-[#10B981]/30 hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] hover:-translate-y-1'
                }
              `}
            >
              {/* Top accent line */}
              <div className={`
                absolute top-0 left-4 right-4 h-0.5 rounded-full transition-all duration-300
                ${selected || hovered ? 'bg-[#10B981] dark:bg-[#3ebd93] opacity-100' : 'bg-transparent opacity-0'}
              `} />

              {/* Header: Icon + Badge */}
              <div className="flex items-start justify-between mb-5">
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
                  bg-[#ECFDF5] dark:bg-emerald-900/20 text-[#10B981] dark:text-emerald-400
                `}>
                  <Icon className="w-6 h-6" aria-hidden="true" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#F1F5F9] dark:bg-slate-800 text-[#475569] dark:text-slate-400">
                  <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                  {text(`${docs.length} pieces`, `${docs.length} وثائق`)}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-extrabold text-[#0F172A] dark:text-white text-lg mb-1.5 leading-tight">
                {isRtl ? licence.label_ar : licence.label_fr}
              </h3>

              {/* Description */}
              <p className="text-sm text-[#64748B] dark:text-slate-400 mb-5 leading-relaxed">
                {isRtl ? licence.description_ar : licence.description_fr}
              </p>

              {/* Documents list */}
              <ul className="space-y-2.5 mb-5 flex-1">
                {docs.slice(0, 4).map((doc) => (
                  <li key={doc} className="flex items-center gap-2.5 text-sm text-[#475569] dark:text-slate-300">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-[#ECFDF5] dark:bg-emerald-900/20">
                      <Check className="w-3 h-3 text-[#10B981] dark:text-emerald-400" strokeWidth={3} aria-hidden="true" />
                    </span>
                    <span className="leading-tight">{doc}</span>
                  </li>
                ))}
              </ul>

              {/* More documents badge */}
              {docs.length > 4 && (
                <div className="text-xs font-semibold text-[#10B981] dark:text-emerald-400 mb-5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                  {text(`+ ${docs.length - 4} documents requis`, `+ ${docs.length - 4} وثائق مطلوبة`)}
                </div>
              )}

              {/* CTA Button */}
              <button
                type="button"
                className={`
                  w-full mt-auto py-3.5 rounded-xl text-sm font-bold
                  flex items-center justify-center gap-2 transition-all duration-300
                  border-0 cursor-pointer group/btn
                  ${selected
                    ? 'bg-[#059669] text-white shadow-lg shadow-[#10B981]/25'
                    : 'bg-[#10B981] text-white hover:bg-[#059669] shadow-md hover:shadow-lg hover:shadow-[#10B981]/20 hover:-translate-y-0.5'
                  }
                `}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(licence.key);
                }}
              >
                {text('Choisir cette licence', 'اختيار هذه الرخصة')}
                <ArrowRight
                  className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1"
                  aria-hidden="true"
                  style={isRtl ? { transform: 'scaleX(-1)' } : undefined}
                />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
