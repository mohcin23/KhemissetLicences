/**
 * Statuts métier du dossier (codes stables, affichage côté UI).
 *
 * Rappel des correspondances métier / codes historiques :
 * - SOUMIS / EN_COURS => 'en_cours_analyse'
 * - VALIDE_PROVISOIREMENT => 'avis_favorable'
 * - CORRIGE => 'documents_corriges'
 * - REFUSE_EMPLOYE => 'documents_rejetes'
 * - ACCEPTE_DEFINITIF => 'accepte'
 * - REFUSE_GOUVERNEUR => 'refuse'
 *
 * Le système conserve la compatibilité avec les valeurs existantes en base.
 */
const STATUTS = {
  SOUMIS:               'en_cours_analyse',
  EN_COURS:             'en_cours_analyse',
  DEPOSE:               'en_cours_analyse',
  EN_COURS_ANALYSE:     'en_cours_analyse',
  VALIDE_PROVISOIREMENT:'avis_favorable',
  AVIS_FAVORABLE:       'avis_favorable',
  CORRIGE:              'documents_corriges',
  DOCUMENTS_CORRIGES:   'documents_corriges',
  REFUSE_EMPLOYE:       'documents_rejetes',
  DOCUMENTS_REJETES:    'documents_rejetes',
  ACCEPTE_DEFINITIF:    'accepte',
  ACCEPTE:              'accepte',
  REFUSE_GOUVERNEUR:    'refuse',
  REFUSE:               'refuse',
  DECISION_IMPRIMEE:    'decision_imprimee',
  TRANSMIS_RESPONSABLE: 'decision_imprimee',
  ARCHIVE:              'archive'
};

const TERMINAUX = [STATUTS.ACCEPTE, STATUTS.REFUSE, STATUTS.ARCHIVE];

const ACTIFS_NON_TERMINAUX = [
  STATUTS.EN_COURS_ANALYSE,
  STATUTS.DOCUMENTS_REJETES,
  STATUTS.DOCUMENTS_CORRIGES,
  STATUTS.AVIS_FAVORABLE,
  STATUTS.DECISION_IMPRIMEE
];

/**
 * Transitions autorisées pour un agent (clé = statut actuel).
 * L'admin peut forcer n'importe quelle transition via forceStatut.
 *
 * WORKFLOW EMPLOYÉ:
 * 1. en_cours_analyse → L'agent examine le dossier
 * 2. documents_rejetes → L'agent rejette les documents (citoyen corrige)
 * 3. documents_corriges → Le citoyen a corrigé et renvoyé
 * 4. avis_favorable → L'agent valide provisoirement
 * 5. decision_imprimee → L'agent imprime la décision
 * 6. accepte / refuse → Le Gouverneur signe la décision
 */
const TRANSITIONS_AUTORISEES = {
  [STATUTS.EN_COURS_ANALYSE]: [
    STATUTS.DOCUMENTS_REJETES,
    STATUTS.AVIS_FAVORABLE
  ],
  [STATUTS.DOCUMENTS_REJETES]: [
    STATUTS.DOCUMENTS_CORRIGES,
    STATUTS.EN_COURS_ANALYSE
  ],
  [STATUTS.DOCUMENTS_CORRIGES]: [
    STATUTS.EN_COURS_ANALYSE
  ],
  [STATUTS.AVIS_FAVORABLE]: [
    STATUTS.DECISION_IMPRIMEE
  ],
  [STATUTS.DECISION_IMPRIMEE]: [
    STATUTS.ACCEPTE,
    STATUTS.REFUSE
  ],
  [STATUTS.ACCEPTE]: [STATUTS.ARCHIVE],
  [STATUTS.REFUSE]:  [STATUTS.ARCHIVE],
  [STATUTS.ARCHIVE]: []
};

/** Libellés affichables (français / arabe selon contexte UI). */
const LIBELLES_STATUTS = {
  [STATUTS.EN_COURS_ANALYSE]:   'En cours d\'étude',
  [STATUTS.AVIS_FAVORABLE]:     'Validé provisoirement',
  [STATUTS.DOCUMENTS_CORRIGES]: 'Corrigé',
  [STATUTS.DOCUMENTS_REJETES]:  'Refusé par l\'employé',
  [STATUTS.DECISION_IMPRIMEE]:  'Décision imprimée',
  [STATUTS.ACCEPTE]:            'Accepté définitivement',
  [STATUTS.REFUSE]:             'Refusé par le Gouverneur',
  [STATUTS.ARCHIVE]:            'Archivé'
};

/** Normalise les anciens codes legacy provenant de l'UI ou ancienne BDD. */
const normalizeStatut = (raw) => {
  const key = String(raw || '').trim().toLowerCase();
  const legacy = {
    en_attente:             STATUTS.EN_COURS_ANALYSE,
    depose:                 STATUTS.EN_COURS_ANALYSE,
    brouillon:              STATUTS.EN_COURS_ANALYSE,
    soumis:                 STATUTS.EN_COURS_ANALYSE,
    en_cours:               STATUTS.EN_COURS_ANALYSE,
    fichier_rejete:         STATUTS.DOCUMENTS_REJETES,
    refuse_employe:         STATUTS.DOCUMENTS_REJETES,
    corrige:                STATUTS.DOCUMENTS_CORRIGES,
    valide_provisoirement:  STATUTS.AVIS_FAVORABLE,
    accepte_definitif:      STATUTS.ACCEPTE,
    refuse_gouverneur:      STATUTS.REFUSE,
    approuve:               STATUTS.ACCEPTE,
    rejete:                 STATUTS.REFUSE,
    transmis_responsable:   STATUTS.DECISION_IMPRIMEE
  };
  return legacy[key] || key;
};

const estTransitionPermise = (de, vers) => {
  if (!de || !vers) return false;
  const liste = TRANSITIONS_AUTORISEES[de];
  return Array.isArray(liste) && liste.includes(vers);
};

module.exports = {
  STATUTS,
  TERMINAUX,
  ACTIFS_NON_TERMINAUX,
  TRANSITIONS_AUTORISEES,
  LIBELLES_STATUTS,
  normalizeStatut,
  estTransitionPermise
};
