export const PAGE_SIZE = 10;
export const AUDIT_PAGE_SIZE = 20;
export const CHART_COLORS = ['#065f46', '#15803d', '#10b981', '#84cc16'];
export const AGENT_DRAFT_KEY = 'draft_demande_agent';
export const ACTIVE_AGENT_STATUSES = 'en_cours_analyse,documents_corriges';
export const DECISION_PDF_STATUSES = new Set(['avis_favorable', 'decision_imprimee']);

export const emptyForm = {
  nom_complet: '', cin: '', date_naissance: '',
  universite: '', diplome: '',
  adresse_complete: '',
  date_demande: '', date_izin: '', numero_izin: '',
  nom_massah: '', date_massah: '', date_lajna: '',
  commune: '', cercle: '', notes: ''
};
