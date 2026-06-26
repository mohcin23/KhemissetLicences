import axios from 'axios';

const API = axios.create({ baseURL: `${window.location.protocol}//${window.location.hostname}:3001/api` });
let pendingRequests = 0;
const notifyPending = () => {
  window.dispatchEvent(new CustomEvent('api-pending-changed', { detail: { pending: pendingRequests } }));
};

// Intercepteur : ajoute le token JWT à chaque requête
API.interceptors.request.use((config) => {
  pendingRequests += 1;
  notifyPending();
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  pendingRequests = Math.max(0, pendingRequests - 1);
  notifyPending();
  return Promise.reject(error);
});

API.interceptors.response.use((response) => {
  pendingRequests = Math.max(0, pendingRequests - 1);
  notifyPending();
  return response;
}, (error) => {
  pendingRequests = Math.max(0, pendingRequests - 1);
  notifyPending();
  if (error.response?.status === 401) {
    localStorage.removeItem('auth_token');
    window.dispatchEvent(new CustomEvent('auth-expired'));
  }
  return Promise.reject(error);
});

export const authAPI = {
  login: (email, password) => API.post('/auth/login', { email, password }),
  register: (data) => API.post('/auth/register', data),
  registerCitizen: (data) => API.post('/auth/register-citizen', data),
  forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
  verifyCode: (email, code) => API.post('/auth/verify-code', { email, code }),
  resetPassword: (email, code, newPassword) => API.post('/auth/reset-password', { email, code, newPassword }),
  me: () => API.get('/auth/me'),
};

export const adminAPI = {
  getUsers: (params) => API.get('/admin/users', { params }),
  approveUser: (id) => API.post(`/admin/users/${id}/approve`),
  rejectUser: (id) => API.post(`/admin/users/${id}/reject`),
  toggleActive: (id) => API.post(`/admin/users/${id}/toggle-active`),
  deleteUser: (id) => API.delete(`/admin/users/${id}`),
  changeRole: (id, role) => API.post(`/admin/users/${id}/change-role`, { role }),
  createEmployee: (data) => API.post('/admin/create-employee', data), // PHASE 4 FINAL
  getUserActivity: (id) => API.get(`/admin/users/${id}/activity`), // PHASE 4 FINAL
  getStatsOverview: () => API.get('/admin/stats/overview'),
  getStatsByCommune: () => API.get('/admin/stats/by-commune'),
  getStatsByAgent: () => API.get('/admin/stats/by-agent'),
  getStatsTimeline: (params) => API.get('/admin/stats/timeline', { params }),
  searchCitoyen: (q) => API.get('/admin/search/citoyen', { params: { q } }),
  exportDemandes: (params) => API.get('/admin/demandes/export', { params }),
  forceStatut: (id, statut, motif) => API.post(`/admin/demandes/${id}/forcer-statut`, { statut, motif }),
};

export const demandesAPI = {
  create: (data) => API.post('/demandes', { ...data, licence_type: data?.licence_type ?? null }),
  getAll: (params) => API.get('/demandes', { params }),
  getById: (id) => API.get(`/demandes/${id}`),
  update: (id, data) => API.put(`/demandes/${id}`, data),
  updateStatut: (id, statut, extra = {}) => API.patch(`/demandes/${id}/statut`, { statut, ...extra }),
  rejeterFichier: (id, motif_rejet_fichier) => API.patch(`/demandes/${id}/rejeter-fichier`, { motif_rejet_fichier }),
  validerProvisoire:  (id, data = {}) => API.patch(`/demandes/${id}/valider-provisoire`, data),
  accepterDefinitif:  (id, data = {}) => API.patch(`/demandes/${id}/accepter-definitif`, data),
  refuserGouverneur:  (id, data)      => API.patch(`/demandes/${id}/refuser-gouverneur`, data),
  refuserEmploye:     (id, data)      => API.patch(`/demandes/${id}/refuser-employe`, data),
  corrigerDossier:    (id, data)      => API.patch(`/demandes/${id}/corriger`, data),
  delete: (id) => API.delete(`/demandes/${id}`),
  getStats: () => API.get('/demandes/stats'),
  getMonthlyStats: () => API.get('/demandes/stats/monthly'),
  getAgentDashboard: () => API.get('/demandes/agent-dashboard'),
  // ── Pièces jointes ────────────────────────────────────────────────────────
  uploadPiecesJointes: (demandeId, fichiers) =>
    API.post(`/demandes/${demandeId}/pieces-jointes`, { fichiers }),
  listPiecesJointes: (demandeId) =>
    API.get(`/demandes/${demandeId}/pieces-jointes`),
  downloadPieceJointeUrl: (demandeId, pjId) =>
    `${API.defaults.baseURL}/demandes/${demandeId}/pieces-jointes/${pjId}/download`,
  deletePieceJointe: (demandeId, pjId) =>
    API.delete(`/demandes/${demandeId}/pieces-jointes/${pjId}`),
};

export const workflowAPI = {
  getEvents: (demandeId) => API.get(`/workflow/${demandeId}`),
};

export const licencesAPI = {
  getConfig: () => API.get('/licences/config'),
  getConfigByType: (type) => API.get(`/licences/config/${type}`),
};

export const notificationsAPI = {
  getAll: ({ page = 1, limit = 10, unreadOnly = false } = {}) => API.get('/notifications', {
    params: {
      page,
      limit,
      unread_only: unreadOnly ? 'true' : undefined
    }
  }),
  getCount: () => API.get('/notifications/count'),
  markRead: (id) => API.patch(`/notifications/${id}/read`),
  markAllRead: () => API.patch('/notifications/read-all'),
};

export const citizenAPI = {
  trackPublic: (numero) => API.get(`/citizen/track/${numero}`, {
    headers: {} // override: no auth token needed
  }),
  create: (data) => API.post('/citizen/demandes', { ...data, licence_type: data?.licence_type ?? null }),
  getMine: () => API.get('/citizen/demandes'),
  getById: (id) => API.get(`/citizen/demandes/${id}`),
  update: (id, data) => API.put(`/citizen/demandes/${id}`, data),
  annuler: (id) => API.patch(`/citizen/demandes/${id}/annuler`),
  // ── Pièces jointes ────────────────────────────────────────────────────────
  uploadPiecesJointes: (demandeId, fichiers) =>
    API.post(`/citizen/demandes/${demandeId}/pieces-jointes`, { fichiers }),
  listPiecesJointes: (demandeId) =>
    API.get(`/citizen/demandes/${demandeId}/pieces-jointes`),
  downloadPieceJointeUrl: (demandeId, pjId) =>
    `${API.defaults.baseURL}/citizen/demandes/${demandeId}/pieces-jointes/${pjId}/download`,
};

export const pdfAPI = {
  normalizeLang: (lang = 'ar') => (String(lang).toLowerCase() === 'fr' ? 'fr' : 'ar'),
  viewDecisionUrl: (id, lang = 'ar') => `${API.defaults.baseURL}/pdf/decision/${id}/view?lang=${String(lang).toLowerCase() === 'fr' ? 'fr' : 'ar'}`,
  getDecisionForView: (id, lang = 'ar') => API.get(`/pdf/decision/${id}/view`, {
    params: { lang: String(lang).toLowerCase() === 'fr' ? 'fr' : 'ar' },
    responseType: 'blob'
  }),
  downloadDecision: (id, numeroDossier, lang = 'ar') => {
    const pdfLang = String(lang).toLowerCase() === 'fr' ? 'fr' : 'ar';
    return API.get(`/pdf/decision/${id}`, { params: { lang: pdfLang }, responseType: 'blob' }).then(res => {
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `decision_${numeroDossier}_${pdfLang}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  },
  // downloadBoth fetches only the decision (decharge removed)
  downloadBoth: async (id, numeroDossier, lang = 'ar') => {
    const pdfLang = String(lang).toLowerCase() === 'fr' ? 'fr' : 'ar';
    const res = await API.get(`/pdf/both/${id}`, { params: { lang: pdfLang } });
    const { decision } = res.data;
    const downloadBase64 = (b64, filename) => {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };
    downloadBase64(decision, `decision_${numeroDossier}_${pdfLang}.pdf`);
  },
  downloadRapport: () => {
    return API.post('/pdf/rapport', {}, { responseType: 'blob' }).then(res => {
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_complet_licences_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  },
  downloadRapportMensuel: (month, year) => {
    return API.post('/pdf/rapport-mensuel', { month, year }, { responseType: 'blob' }).then(res => {
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_mensuel_licences_${year}_${String(month).padStart(2, '0')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
};

export const ocrAPI = {
  analyze: (image, mimeType) => API.post('/ocr/analyze', { image, mimeType }),
  // Phase 1 : extraction texte brut depuis une image
  extractText: (image, mimeType) => API.post('/ocr/extract-text', { image, mimeType }),
  // Phase 2 : analyse de tous les textes extraits → remplissage formulaire
  analyzeTexts: (texts, expectedFields) => API.post('/ocr/analyze-texts', { texts, expected_fields: expectedFields }),
  // Nouveau : OCR direct par type (Pixtral voit l'image, extrait directement le JSON)
  parseByType: (image, mimeType, licenceType, docType) =>
    API.post('/ocr/parse-by-type', { image, mimeType, licence_type: licenceType, doc_type: docType }),
};

export const auditAPI = {
  getLogs: (params) => API.get('/audit', { params }),
  getFilters: () => API.get('/audit/filters'),
  logExcelExport: (payload = {}) => API.post('/audit/export-excel', payload),
  exportCSV: (params) => API.get('/audit/export-csv', { params, responseType: 'blob' }),
};

export const aiAPI = {
  chat: (message, history = []) => API.post('/ai/chat', { message, history }),
  chatStream: async (message, history = [], onToken) => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API.defaults.baseURL}/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ message, history })
    });

    if (!response.ok) {
      throw new Error('Stream error');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    const flushBuffer = () => {
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              if (parsed.token) {
                fullText += parsed.token;
                onToken(parsed.token, fullText);
              }
            } catch (e) {}
          }
        }
        buffer = '';
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.token) {
            fullText += parsed.token;
            onToken(parsed.token, fullText);
          }
        } catch (e) {}
      }
    }

    flushBuffer();
    return fullText;
  }
};
