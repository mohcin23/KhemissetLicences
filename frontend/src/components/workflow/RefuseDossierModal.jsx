import React, { useState } from 'react';
import { Modal, Button, Input } from '../ui';
import { AlertCircle, Send, X } from 'lucide-react';

// AJOUTÉ PHASE 2 : Modal pour refuser le dossier avec motif obligatoire
export default function RefuseDossierModal({
  isOpen,
  onClose,
  demande,
  onRefuse,
  loading = false,
  lang = 'fr',
  isRtl = false
}) {
  const [motif, setMotif] = useState('');
  const [error, setError] = useState('');

  const handleRefuse = () => {
    if (!motif.trim()) {
      setError(lang === 'ar' ? 'يجب تحديد سبب الرفض' : 'Veuillez entrer un motif de refus');
      return;
    }
    onRefuse(motif);
    setMotif('');
    setError('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={lang === 'ar' ? 'رفض الدوسيه' : 'Refuser le dossier'} size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950/30 dark:text-red-100">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{lang === 'ar' ? 'تحذير' : 'Attention'}</p>
            <p className="mt-1">{lang === 'ar' ? 'هذا الإجراء سيرفض الدوسيه وسيطلب من المواطن إعادة الوثائق المصححة' : 'Cette action rejettera le dossier et demandera au citoyen de corriger les documents'}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {lang === 'ar' ? 'سبب الرفض *' : 'Motif du refus *'}
          </label>
          <textarea
            value={motif}
            onChange={(e) => {
              setMotif(e.target.value);
              setError('');
            }}
            placeholder={lang === 'ar' ? 'مثال: وثائق غير واضحة, معلومات ناقصة...' : 'Ex: Documents flous, informations manquantes...'}
            rows={4}
            className={`w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-800 dark:text-white ${
              error ? 'border-red-300 dark:border-red-700' : 'border-slate-300 dark:border-slate-600'
            }`}
          />
          {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          <X className="h-4 w-4" />
          {lang === 'ar' ? 'إلغاء' : 'Annuler'}
        </Button>
        <Button onClick={handleRefuse} disabled={loading} variant="danger">
          <Send className="h-4 w-4" />
          {lang === 'ar' ? 'رفض الدوسيه' : 'Refuser'}
        </Button>
      </div>
    </Modal>
  );
}
