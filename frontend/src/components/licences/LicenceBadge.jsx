import React from 'react';

const LICENCE_BADGE_CONFIG = {
  pharmacie:       { label_fr: 'Pharmacie',        label_ar: 'صيدلية',         color: '#1d4ed8', bg: '#dbeafe', icon: '💊' },
  cafe_restaurant: { label_fr: 'Café/Restaurant',  label_ar: 'مقهى/مطعم',      color: '#c2410c', bg: '#ffedd5', icon: '☕' },
  cafe:            { label_fr: 'Café/Restaurant',  label_ar: 'مقهى/مطعم',      color: '#c2410c', bg: '#ffedd5', icon: '☕' },
  hopital_clinique:{ label_fr: 'Hôpital/Clinique', label_ar: 'مستشفى/عيادة',   color: '#dc2626', bg: '#fee2e2', icon: '🏥' },
  hopital:         { label_fr: 'Hôpital/Clinique', label_ar: 'مستشفى/عيادة',   color: '#dc2626', bg: '#fee2e2', icon: '🏥' },
  ecole_privee:    { label_fr: 'École Privée',     label_ar: 'مدرسة خاصة',     color: '#15803d', bg: '#dcfce7', icon: '🏫' },
  ecole:           { label_fr: 'École Privée',     label_ar: 'مدرسة خاصة',     color: '#15803d', bg: '#dcfce7', icon: '🏫' },
  salle_sport:     { label_fr: 'Salle de Sport',   label_ar: 'قاعة رياضية',    color: '#7c3aed', bg: '#ede9fe', icon: '🏋️' },
  sport:           { label_fr: 'Salle de Sport',   label_ar: 'قاعة رياضية',    color: '#7c3aed', bg: '#ede9fe', icon: '🏋️' },
};

function LicenceBadge({ licenceType, lang, style }) {
  const cfg = LICENCE_BADGE_CONFIG[licenceType] || LICENCE_BADGE_CONFIG.pharmacie;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{
      color: cfg.color, background: cfg.bg,
      ...style
    }}>
      {cfg.icon} {lang === 'ar' ? cfg.label_ar : cfg.label_fr}
    </span>
  );
}

// ── Affichage lisible des extra_data d'une demande ──────────────────────────

export default LicenceBadge;
