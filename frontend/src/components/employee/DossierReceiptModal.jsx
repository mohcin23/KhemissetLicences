import React from 'react';
import { Clipboard, Printer, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function DossierReceiptModal({ receipt, onClose, isRtl }) {
  const { showToast } = useToast();

  const copyDossierNumber = async () => {
    const numero = receipt?.numero_dossier;
    if (!numero) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(numero);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = numero;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showToast(isRtl ? 'تم نسخ رقم الملف' : 'Numero de dossier copie');
    } catch {
      showToast(isRtl ? 'تعذر نسخ رقم الملف' : 'Impossible de copier le numero', 'error');
    }
  };

  const printDossierReceipt = () => {
    if (!receipt) return;
    const platformUrl = receipt.platformUrl || window.location.origin;
    const receiptDate = new Date(receipt.createdAt || Date.now()).toLocaleDateString('fr-FR');
    const printWindow = window.open('', '_blank', 'width=720,height=860');
    if (!printWindow) {
      showToast(isRtl ? 'تعذر فتح نافذة الطباعة' : 'Impossible d ouvrir la fenetre d impression', 'error');
      return;
    }
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Recu dossier ${escapeHtml(receipt.numero_dossier)}</title><style>body{font-family:Arial,sans-serif;color:#172033;margin:0;padding:36px}.receipt{border:2px solid #172033;padding:30px;min-height:600px}.header{text-align:center;border-bottom:1px solid #d6b65d;padding-bottom:18px;margin-bottom:28px}.seal{width:72px;height:72px;border:3px solid #d6b65d;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:800;color:#172033;margin-bottom:10px}h1{margin:0;font-size:22px}.sub{margin-top:6px;color:#596273;font-size:13px}.number-label{text-align:center;margin:28px 0 8px;font-size:13px;color:#596273;text-transform:uppercase;letter-spacing:.08em}.number{text-align:center;font-size:38px;font-weight:900;color:#0f5132;border:2px dashed #d6b65d;padding:18px;margin-bottom:28px}.row{display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid #e5e7eb;padding:12px 0;font-size:15px}.row strong{color:#172033}.message{margin-top:30px;padding:16px;background:#f8fafc;border-left:4px solid #d6b65d;font-size:16px;line-height:1.6}@media print{body{padding:0}.receipt{border:none}}</style></head><body><main class="receipt"><section class="header"><div class="seal">AK</div><h1>Amalat Khemisset</h1><div class="sub">Recu de depot de dossier</div></section><div class="number-label">Numero de dossier</div><div class="number">${escapeHtml(receipt.numero_dossier)}</div><div class="row"><strong>Citoyen</strong><span>${escapeHtml(receipt.citizenName)}</span></div><div class="row"><strong>Date</strong><span>${escapeHtml(receiptDate)}</span></div><p class="message">Suivez votre demande sur ${escapeHtml(platformUrl)} avec ce numero.</p></main><script>window.onload=function(){window.focus();window.print()}</script></body></html>`);
    printWindow.document.close();
  };

  if (!receipt) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(17,24,39,0.56)] flex items-start justify-center overflow-y-auto px-4 py-7" role="dialog" aria-modal="true" aria-labelledby="created-dossier-title">
      <div className="w-[min(720px,100%)] bg-white rounded-lg shadow-[0_10px_40px_rgba(13,31,60,0.13)] p-6">
        <div className="flex justify-between items-start gap-4 mb-[18px]">
          <div>
            <h2 id="created-dossier-title" className="text-[#172033] text-[1.72rem] font-extrabold dark:text-[#f8fafc]">Dossier créé avec succès / تم إنشاء الملف بنجاح</h2>
            <p className="text-[#667085] text-[0.94rem] dark:text-[#94a3b8]">Donnez ce numéro au citoyen / أعطِ هذا الرقم للمواطن</p>
          </div>
          <button className="w-9 h-9 border border-[#d5d9e0] bg-[#f5f6f8] text-gray-700 rounded cursor-pointer text-[1.35rem] leading-none inline-flex items-center justify-center flex-shrink-0" type="button" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        </div>
        <div className="flex flex-col gap-[18px]">
          <div className="text-center border-2 border-dashed border-[#b8922a] rounded-lg bg-[#fffdf5] px-[18px] py-6">
            <span className="block text-[#4a5568] text-[0.78rem] font-extrabold tracking-widest uppercase mb-2">Numero de dossier</span>
            <strong className="text-[#065f46] text-[clamp(2rem,6vw,3.3rem)] font-black">{receipt.numero_dossier}</strong>
          </div>
          <div className="flex justify-between gap-3 text-[#4a5568] text-sm border-t border-b border-[#eaecf0] py-3">
            <span>{receipt.citizenName}</span>
            <span>{new Date(receipt.createdAt).toLocaleDateString('fr-FR')}</span>
          </div>
          <div className="flex justify-end gap-2.5 flex-wrap">
            <button className="rounded-lg font-sans font-bold tracking-normal min-h-[40px] bg-[#153e49] text-white shadow-[0_1px_2px_rgba(16,24,40,0.06)] hover:bg-[#1f5d63] hover:shadow-[0_14px_38px_rgba(16,24,40,0.12)] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 px-4 py-2" type="button" onClick={copyDossierNumber}><Clipboard size={18} /> Copier le numéro</button>
            <button className="bg-transparent border border-[#c9a84c] text-[#0d1f3c] bg-[#fffdf5] rounded-lg px-4 py-2 font-semibold cursor-pointer inline-flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-[#132238]" type="button" onClick={printDossierReceipt}><Printer size={18} /> Imprimer le reçu</button>
            <button className="bg-transparent border border-[#d9e1e7] text-[#172033] rounded-lg px-4 py-2 font-semibold cursor-pointer inline-flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-[#132238]" type="button" onClick={onClose}>Fermer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
