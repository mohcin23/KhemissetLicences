/**
 * Libellés et styles des statuts dossier (codes backend snake_case).
 *
 * WORKFLOW :
 * 1. en_cours_analyse → Agent examine le dossier
 * 2. documents_rejetes → Agent rejette les pièces jointes (citoyen doit corriger)
 * 3. documents_corriges → Citoyen a corrigé et renvoyé
 * 4. avis_favorable → Agent valide provisoirement le dossier
 * 5. decision_imprimee → L'agent a imprimé la décision pour signature
 * 6. accepte / refuse → Le Gouverneur a signé (enregistré par l'agent)
 * 7. archive → Dossier archivé définitivement
 *
 * Les anciens codes (brouillon, depose, approuve, rejete, etc.) sont conservés
 * en lecture seule pour l'affichage de données non migrées.
 */
export const STATUS_CONFIG = {
  // ── Statuts actifs ─────────────────────────────────────────────────────────
  en_cours_analyse: {
    color: '#92400e',
    bg: '#fffbeb',
    border: '#f59e0b',
    icon: '🔎',
    label_ar: 'قيد الدراسة',
    label_fr: "En cours d'analyse"
  },
  documents_rejetes: {
    color: '#7f1d1d',
    bg: '#fff1f2',
    border: '#fb7185',
    icon: '⚠️',
    label_ar: 'وثائق مرفوضة',
    label_fr: 'Documents rejetés'
  },
  documents_corriges: {
    color: '#166534',
    bg: '#ecfdf5',
    border: '#4ade80',
    icon: '✏️',
    label_ar: 'وثائق مصححة',
    label_fr: 'Documents corrigés'
  },
  avis_favorable: {
    color: '#1e40af',
    bg: '#eff6ff',
    border: '#60a5fa',
    icon: '👍',
    label_ar: 'تم التصديق مؤقتاً',
    label_fr: 'Validé provisoirement'
  },
  decision_imprimee: {
    color: '#1e3a8a',
    bg: '#eef2ff',
    border: '#6366f1',
    icon: '🖨️',
    label_ar: 'القرار مطبوع — في انتظار توقيع السيد المحافظ',
    label_fr: 'Décision imprimée — en attente signature Gouverneur'
  },
  accepte: {
    color: '#065f46',
    bg: '#d1fae5',
    border: '#10b981',
    icon: '✅',
    label_ar: 'مقبول (قرار المحافظ)',
    label_fr: 'Accepté (décision Gouverneur)'
  },
  refuse: {
    color: '#991b1b',
    bg: '#fee2e2',
    border: '#ef4444',
    icon: '❌',
    label_ar: 'مرفوض (قرار المحافظ)',
    label_fr: 'Refusé (décision Gouverneur)'
  },
  archive: {
    color: '#44403c',
    bg: '#f5f5f4',
    border: '#a8a29e',
    icon: '📦',
    label_ar: 'مؤرشف',
    label_fr: 'Archivé'
  },
  annule: {
    color: '#6b7280',
    bg: '#f3f4f6',
    border: '#9ca3af',
    icon: '🚫',
    label_ar: 'ملغي من طرف المواطن',
    label_fr: 'Annulé par le citoyen'
  },

  // ── Anciens codes (rétrocompatibilité affichage uniquement) ─────────────────
  brouillon:            { color: '#475569', bg: '#f1f5f9', border: '#94a3b8', icon: '📝', label_ar: 'مسودة',       label_fr: 'Brouillon (ancien)' },
  depose:               { color: '#1e40af', bg: '#eff6ff', border: '#60a5fa', icon: '📥', label_ar: 'مودع',        label_fr: 'Déposé (ancien)' },
  en_attente:           { color: '#92400e', bg: '#fef3c7', border: '#f59e0b', icon: '⏳', label_ar: 'في الانتظار',  label_fr: 'En attente (ancien)' },
  fichier_rejete:       { color: '#7f1d1d', bg: '#fff1f2', border: '#fb7185', icon: '⚠️', label_ar: 'ملف مرفوض',   label_fr: 'Fichier rejeté (ancien)' },
  transmis_responsable: { color: '#5b21b6', bg: '#f5f3ff', border: '#a78bfa', icon: '📨', label_ar: 'أُرسل',       label_fr: 'Transmis (ancien)' },
  approuve:             { color: '#065f46', bg: '#d1fae5', border: '#10b981', icon: '✅', label_ar: 'مقبول',       label_fr: 'Approuvé (ancien)' },
  rejete:               { color: '#991b1b', bg: '#fee2e2', border: '#ef4444', icon: '❌', label_ar: 'مرفوض',      label_fr: 'Rejeté (ancien)' },
  avis_defavorable:     { color: '#7c3aed', bg: '#f5f3ff', border: '#a78bfa', icon: '👎', label_ar: 'رأي سلبي (الموظف)', label_fr: 'Avis défavorable (ancien)' },
};

export const TERMINAL_STATUTS = new Set(['accepte', 'refuse', 'archive', 'annule']);

/**
 * Retourne le libellé localisé d'un statut.
 * @param {string} statut  Code statut
 * @param {'fr'|'ar'} lang Langue
 */
export function labelStatut(statut, lang = 'fr') {
  const cfg = STATUS_CONFIG[statut];
  if (!cfg) return statut;
  return lang === 'ar' ? cfg.label_ar : cfg.label_fr;
}
