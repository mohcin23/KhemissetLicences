import { t } from '../i18n/translations';

/**
 * Map every backend notification `type` to a translation key for its title
 * and message. Some messages have a `{motif}` placeholder that gets
 * substituted with the dynamic value from the backend (e.g. reject reason).
 *
 * The backend currently stores hard-coded French strings in MySQL. We ignore
 * those at render-time and rebuild the message in the user's UI language.
 */
const NOTIF_TYPE_MAP = {
  nouveau_dossier: {
    title: 'notifTypeNouveauDossierTitle',
    message: 'notifTypeNouveauDossierMessage',
  },
  fichier_rejete: {
    title: 'notifTypeFichierRejeteTitle',
    message: 'notifTypeFichierRejeteMessage',
  },
  fichier_accepte: {
    title: 'notifTypeFichierAccepteTitle',
    message: 'notifTypeFichierAccepteMessage',
  },
  decision_imprimee: {
    title: 'notifTypeDecisionImprimeeTitle',
    message: 'notifTypeDecisionImprimeeMessage',
  },
  transmis_responsable: {
    title: 'notifTypeTransmisResponsableTitle',
    message: 'notifTypeTransmisResponsableMessage',
  },
  approuve: {
    title: 'notifTypeApprouveTitle',
    message: 'notifTypeApprouveMessage',
  },
  rejete: {
    title: 'notifTypeRejeteTitle',
    message: 'notifTypeRejeteMessage',
  },
};

/**
 * Try to extract a rejection motif from the backend message. The backend
 * embeds it after the em-dash like "Vos documents ont été rejetés — Motif : X"
 * or "Votre demande a été refusée. Motif : X". We pull it out so the
 * translated message can re-inject it in the right language.
 */
const extractMotif = (rawMessage) => {
  if (!rawMessage) return null;
  const m = String(rawMessage).match(/Motif\s*[:\-–—]\s*(.+)$/i);
  return m ? m[1].trim() : null;
};

/**
 * Translate a notification received from the backend.
 * Returns { titre, message, motif } in the requested language, falling back
 * to the raw backend strings if we don't know the type (defensive).
 */
export const translateNotification = (notif, lang = 'fr') => {
  const type = notif?.type;
  const map = NOTIF_TYPE_MAP[type];

  if (!map) {
    // Unknown type — render the backend string as-is.
    return {
      titre: notif?.titre || '',
      message: notif?.message || '',
      motif: null,
    };
  }

  const motif = extractMotif(notif?.message);
  let message = t(lang, map.message);
  if (motif && message.includes('{motif}')) {
    message = message.replace('{motif}', motif);
  }

  return {
    titre: t(lang, map.title),
    message,
    motif,
  };
};
