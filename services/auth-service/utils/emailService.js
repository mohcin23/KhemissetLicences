'use strict';

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASSWORD
  }
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildVerificationCodeEmail({ nom_complet, code }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Code de vérification</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1E3A5F 0%,#2563EB 100%);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#FFFFFF;">Code de vérification</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;font-size:15px;color:#374151;">
                Madame / Monsieur <strong>${escapeHtml(nom_complet)}</strong>,
              </p>
              <p style="margin:0 0 16px;font-size:14px;color:#374151;">
                Voici votre code de vérification :
              </p>
              <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
                <p style="margin:0;font-size:36px;font-weight:800;color:#1D4ED8;letter-spacing:8px;font-family:monospace;">${escapeHtml(code)}</p>
              </div>
              <div style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:0 8px 8px 0;padding:16px 20px;">
                <p style="margin:0;font-size:13px;color:#92400E;">
                  <strong>Important :</strong> Ce code expire dans <strong>15 minutes</strong>.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendVerificationCodeEmail({ to, nom_complet, code }) {
  if (!to || !String(to).trim()) return;

  const html = buildVerificationCodeEmail({ nom_complet, code });

  await transporter.sendMail({
    from: `"Amalat Khémisset" <${process.env.EMAIL_FROM}>`,
    to: String(to).trim(),
    subject: 'Code de vérification',
    html
  });

  console.log(`[emailService] Verification code email sent → ${to}`);
}

module.exports = { sendVerificationCodeEmail };
