import React, { useState } from 'react';
import { Modal, Button, Input } from '../ui';
import { AlertCircle, Send, X } from 'lucide-react';

// AJOUTÉ PHASE 2 : Modal pour enregistrer la décision du Gouverneur (Accepté/Refusé)
export default function GovernorDecisionModal({
  isOpen,
  onClose,
  demande,
  onDecide,
  loading = false,
  lang = 'fr',
  isRtl = false
}) {
  const [decision, setDecision] = useState('accepte');
  const [motif, setMotif] = useState('');
  const [error, setError] = useState('');

  const handleDecide = () => {
    if (decision === 'refuse' && !motif.trim()) {
      setError(lang === 'ar' ? 'يجب تحديد سبب الرفض' : 'Veuillez entrer un motif de refus');
      return;
    }
    onDecide({ decision, motif: decision === 'refuse' ? motif : '' });
    setDecision('accepte');
    setMotif('');
    setError('');
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={lang === 'ar' ? 'قرار المحافظ' : 'Décision du Gouverneur'} 
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p>{lang === 'ar' ? 'حدد قرار السيد المحافظ - تحقق من البيانات قبل الحفظ' : 'Enregistrez la décision du Gouverneur - Vérifiez avant de valider'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {lang === 'ar' ? 'القرار *' : 'Décision *'}
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="accepte"
                checked={decision === 'accepte'}
                onChange={(e) => {
                  setDecision(e.target.value);
                  setMotif('');
                  setError('');
                }}
                className="w-4 h-4"
              />
              <span className={`text-sm font-medium ${decision === 'accepte' ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {lang === 'ar' ? '✅ مقبول' : '✅ Accepté'}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="refuse"
                checked={decision === 'refuse'}
                onChange={(e) => {
                  setDecision(e.target.value);
                  setError('');
                }}
                className="w-4 h-4"
              />
              <span className={`text-sm font-medium ${decision === 'refuse' ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {lang === 'ar' ? '❌ مرفوض' : '❌ Refusé'}
              </span>
            </label>
          </div>
        </div>

        {decision === 'refuse' && (
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
              placeholder={lang === 'ar' ? 'حدد سبب الرفض...' : 'Précisez les raisons du refus...'}
              rows={3}
              className={`w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-800 dark:text-white ${
                error ? 'border-red-300 dark:border-red-700' : 'border-slate-300 dark:border-slate-600'
              }`}
            />
            {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          <X className="h-4 w-4" />
          {lang === 'ar' ? 'إلغاء' : 'Annuler'}
        </Button>
        <Button 
          onClick={handleDecide} 
          disabled={loading} 
          variant={decision === 'accepte' ? 'primary' : 'danger'}
        >
          <Send className="h-4 w-4" />
          {lang === 'ar' ? 'حفظ القرار' : 'Enregistrer'}
        </Button>
      </div>
    </Modal>
  );
}
