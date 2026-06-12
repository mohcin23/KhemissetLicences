'use strict';

const nodemailer = require('nodemailer');

// Transporter configured via environment variables.
// EMAIL_FROM  : your Gmail address
// EMAIL_PASSWORD : Gmail App Password (not your account password).
//   → Google Account > Security > 2-Step Verification > App Passwords
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASSWORD
  }
});

// ─── Status content map (FR + AR) ────────────────────────────────────────────

const STATUS_CONTENT = {
  en_cours_analyse: {
    subject: 'Dossier en cours d\'analyse — مlفك قيد الدراسة',
    badge: '#3B82F6',
    icon: '🔍',
    fr: 'Votre dossier est <strong>en cours d\'analyse</strong> par nos services.',
    ar: 'ملفك <strong>قيد الدراسة</strong> من طرف مصالحنا.'
  },
  documents_rejetes: {
    subject: 'Documents insuffisants — وثائق ناقصة',
    badge: '#EF4444',
    icon: '📋',
    fr: (commentaire) =>
      `Vos documents sont <strong>insuffisants</strong>.<br>Motif : <em>${commentaire || 'Voir commentaire de l\'agent'}</em>`,
    ar: (commentaire) =>
      `وثائقكم <strong>غير كافية</strong>.<br>السبب: <em>${commentaire || 'راجع تعليق الموظف'}</em>`
  },
  valide_provisoirement: {
    subject: 'Dossier validé — en attente du Gouverneur',
    badge: '#F59E0B',
    icon: '⏳',
    fr: 'Votre dossier a été <strong>validé provisoirement</strong> et est en attente de la décision du Gouverneur.',
    ar: 'تم <strong>قبول ملفكم مبدئياً</strong> وهو في انتظار قرار السيد العامل.'
  },
  accepte_definitif: {
    subject: '✅ Licence approuvée — الترخيص مقبول',
    badge: '#10B981',
    icon: '✅',
    fr: `<strong>FÉLICITATIONS !</strong><br>Votre licence a été <strong>approuvée définitivement</strong>.<br><br>
         <div style="background:#ECFDF5;border-left:4px solid #10B981;padding:12px 16px;border-radius:4px;margin:12px 0;">
           📍 Présentez-vous à l'Amalat de la Province de Khémisset pour récupérer votre document officiel.
         </div>`,
    ar: `<strong>تهانينا!</strong><br>لقد تم <strong>قبول ترخيصكم نهائياً</strong>.<br><br>
         <div style="background:#ECFDF5;border-right:4px solid #10B981;padding:12px 16px;border-radius:4px;margin:12px 0;direction:rtl;">
           📍 تفضلوا بالحضور إلى عمالة إقليم الخميسات لاستلام وثيقتكم الرسمية.
         </div>`
  },
  refuse_gouverneur: {
    subject: '❌ Demande refusée par le Gouverneur — مرفوضة من طرف العامل',
    badge: '#EF4444',
    icon: '❌',
    fr: (commentaire) =>
      `Nous vous informons que votre demande a été <strong>refusée par le Gouverneur</strong>.<br>Raison : <em>${commentaire || 'Non précisée'}</em>`,
    ar: (commentaire) =>
      `نُعلمكم بأن طلبكم قد <strong>رُفض من طرف السيد العامل</strong>.<br>السبب: <em>${commentaire || 'غير محدد'}</em>`
  },
  refuse_employe: {
    subject: 'Documents à corriger — وثائق تحتاج تصحيحاً',
    badge: '#F59E0B',
    icon: '📝',
    fr: (commentaire) =>
      `Des corrections sont nécessaires sur votre dossier.<br>Remarques de l\'agent : <em>${commentaire || 'Voir votre espace citoyen'}</em>`,
    ar: (commentaire) =>
      `يتطلب ملفكم بعض التصحيحات.<br>ملاحظات الموظف: <em>${commentaire || 'راجع فضاءكم الرقمي'}</em>`
  }
};

// ─── HTML email builder ───────────────────────────────────────────────────────

function buildHtmlEmail({ nom_complet, numero_dossier, statut, commentaire }) {
  const content = STATUS_CONTENT[statut];
  if (!content) return null;

  const frText = typeof content.fr === 'function' ? content.fr(commentaire) : content.fr;
  const arText = typeof content.ar === 'function' ? content.ar(commentaire) : content.ar;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Suivi de votre demande</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1E3A5F 0%,#2563EB 100%);padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#93C5FD;letter-spacing:2px;text-transform:uppercase;">المملكة المغربية | Royaume du Maroc</p>
              <h1 style="margin:8px 0 4px;font-size:20px;font-weight:700;color:#FFFFFF;">
                عمالة إقليم الخميسات
              </h1>
              <p style="margin:0;font-size:14px;color:#BFDBFE;">Amalat de la Province de Khémisset</p>
              <p style="margin:8px 0 0;font-size:12px;color:#93C5FD;">Suivi de votre demande — متابعة طلبكم</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">

              <!-- Greeting -->
              <p style="margin:0 0 20px;font-size:15px;color:#374151;">
                Madame / Monsieur <strong>${escapeHtml(nom_complet)}</strong>,
              </p>

              <!-- Dossier number -->
              <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:16px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 4px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Numéro de dossier — رقم الملف</p>
                <p style="margin:0;font-size:28px;font-weight:800;color:#1D4ED8;letter-spacing:2px;">${escapeHtml(numero_dossier)}</p>
              </div>

              <!-- Status badge -->
              <div style="border-left:4px solid ${content.badge};background:#F9FAFB;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:24px;">
                <p style="margin:0 0 6px;font-size:13px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Nouveau statut</p>
                <p style="margin:0;font-size:16px;color:#111827;">${content.icon}&nbsp; ${frText}</p>
              </div>

              <!-- Arabic section -->
              <div style="border-right:4px solid ${content.badge};background:#F9FAFB;border-radius:8px 0 0 8px;padding:16px 20px;margin-bottom:24px;direction:rtl;text-align:right;">
                <p style="margin:0 0 6px;font-size:13px;color:#6B7280;letter-spacing:1px;">الوضعية الجديدة</p>
                <p style="margin:0;font-size:16px;color:#111827;">${content.icon}&nbsp; ${arText}</p>
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin:28px 0 8px;">
                <a href="https://khemisset-permits.ma" style="display:inline-block;background:#2563EB;color:#FFFFFF;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;text-decoration:none;">
                  Suivre mon dossier — متابعة ملفي
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 32px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#6B7280;">
                Amalat de la Province de Khémisset &nbsp;|&nbsp; عمالة إقليم الخميسات
              </p>
              <p style="margin:0;font-size:11px;color:#9CA3AF;">
                Cet email est envoyé automatiquement — merci de ne pas y répondre.<br>
                هذه الرسالة مُرسلة تلقائياً — يُرجى عدم الرد عليها.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ─── Escape HTML helper ───────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Send a bilingual status-change notification to a citizen.
 *
 * @param {object} opts
 * @param {string|null} opts.to              - Recipient email (null → silent no-op)
 * @param {string}      opts.nom_complet     - Citizen full name
 * @param {string}      opts.numero_dossier  - Dossier reference number
 * @param {string}      opts.statut          - New status key
 * @param {string|null} opts.commentaire     - Optional agent comment / reject reason
 * @param {string}      [opts.lang]          - Reserved for future use
 */
async function sendStatusChangeEmail({ to, nom_complet, numero_dossier, statut, commentaire = null }) {
  // Guard: no email address → silent no-op
  if (!to || !String(to).trim()) return;

  const content = STATUS_CONTENT[statut];
  if (!content) {
    // Unknown status — skip silently rather than crashing
    console.warn(`[emailService] Unknown statut "${statut}" — skipping email`);
    return;
  }

  const html = buildHtmlEmail({ nom_complet, numero_dossier, statut, commentaire });
  if (!html) return;

  await transporter.sendMail({
    from: `"Amalat Khémisset" <${process.env.EMAIL_FROM}>`,
    to: String(to).trim(),
    subject: `[${numero_dossier}] ${content.subject}`,
    html
  });

  console.log(`[emailService] Email sent → ${to} | dossier ${numero_dossier} | statut ${statut}`);
}

module.exports = { sendStatusChangeEmail };
