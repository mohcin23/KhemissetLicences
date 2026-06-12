import React, { useState } from 'react';
import { Modal, Button, Input } from '../ui';
import { CheckCircle2, Send, X } from 'lucide-react';

// AJOUTÉ PHASE 2 : Modal pour valider provisoirement le dossier
export default function ValidateProvisionalModal({
  isOpen,
  onClose,
  demande,
  onValidate,
  loading = false,
  lang = 'fr',
  isRtl = false
}) {
  const [note, setNote] = useState('');

  const handleValidate = () => {
    onValidate(note);
    setNote('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={lang === 'ar' ? 'التحقق المؤقت' : 'Valider provisoirement'} size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <p>{lang === 'ar' ? 'سيتم تجميد الدوسيه بانتظار قرار المحافظ' : 'Le dossier sera en attente de la décision du Gouverneur'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {lang === 'ar' ? 'ملاحظات اختيارية' : 'Notes optionnelles'}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={lang === 'ar' ? 'ملاحظات للمحافظ...' : 'Notes pour le Gouverneur...'}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          <X className="h-4 w-4" />
          {lang === 'ar' ? 'إلغاء' : 'Annuler'}
        </Button>
        <Button onClick={handleValidate} disabled={loading}>
          <Send className="h-4 w-4" />
          {lang === 'ar' ? 'تحقق' : 'Valider'}
        </Button>
      </div>
    </Modal>
  );
}
