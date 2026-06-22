const STATUTS = {
  EN_COURS_ANALYSE: 'en_cours_analyse',
  AVIS_FAVORABLE: 'avis_favorable',
  DOCUMENTS_CORRIGES: 'documents_corriges',
  DOCUMENTS_REJETES: 'documents_rejetes',
  ACCEPTE: 'accepte',
  REFUSE: 'refuse',
  DECISION_IMPRIMEE: 'decision_imprimee',
  ARCHIVE: 'archive',
  ANNULE: 'annule'
};

const TRANSITIONS_AUTORISEES = {
  [STATUTS.EN_COURS_ANALYSE]: [STATUTS.DOCUMENTS_REJETES, STATUTS.AVIS_FAVORABLE, STATUTS.DECISION_IMPRIMEE],
  [STATUTS.DOCUMENTS_REJETES]: [STATUTS.DOCUMENTS_CORRIGES, STATUTS.EN_COURS_ANALYSE],
  [STATUTS.DOCUMENTS_CORRIGES]: [STATUTS.EN_COURS_ANALYSE],
  [STATUTS.AVIS_FAVORABLE]: [STATUTS.DECISION_IMPRIMEE],
  [STATUTS.DECISION_IMPRIMEE]: [STATUTS.ACCEPTE, STATUTS.REFUSE],
  [STATUTS.ACCEPTE]: [STATUTS.ARCHIVE],
  [STATUTS.REFUSE]: [STATUTS.ARCHIVE],
  [STATUTS.ARCHIVE]: []
};

const normalizeStatut = (raw) => {
  const key = String(raw || '').trim().toLowerCase();
  const legacy = {
    en_attente: STATUTS.EN_COURS_ANALYSE, depose: STATUTS.EN_COURS_ANALYSE,
    brouillon: STATUTS.EN_COURS_ANALYSE, soumis: STATUTS.EN_COURS_ANALYSE,
    en_cours: STATUTS.EN_COURS_ANALYSE, fichier_rejete: STATUTS.DOCUMENTS_REJETES,
    refuse_employe: STATUTS.DOCUMENTS_REJETES, corrige: STATUTS.DOCUMENTS_CORRIGES,
    valide_provisoirement: STATUTS.AVIS_FAVORABLE, accepte_definitif: STATUTS.ACCEPTE,
    refuse_gouverneur: STATUTS.REFUSE, approuve: STATUTS.ACCEPTE, rejete: STATUTS.REFUSE,
    transmis_responsable: STATUTS.DECISION_IMPRIMEE, annule: STATUTS.ANNULE
  };
  return legacy[key] || key;
};

const estTransitionPermise = (de, vers) => {
  if (!de || !vers) return false;
  const liste = TRANSITIONS_AUTORISEES[de];
  return Array.isArray(liste) && liste.includes(vers);
};

module.exports = { STATUTS, TRANSITIONS_AUTORISEES, normalizeStatut, estTransitionPermise };
