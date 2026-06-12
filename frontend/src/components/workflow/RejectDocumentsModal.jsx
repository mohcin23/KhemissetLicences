import React from 'react';
import { t } from '../../i18n/translations';

/**
 * Modal de rejet des documents — motif obligatoire, erreurs API affichées.
 */
export default function RejectDocumentsModal({
  open,
  onClose,
  onSubmit,
  numeroDossier,
  motif,
  onMotifChange,
  loading,
  error,
  lang = 'fr'
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-admin-950">{t(lang, 'rdmTitle')}</h2>
            <p className="text-sm text-slate-500">{numeroDossier}</p>
          </div>
          <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onClose} aria-label={t(lang, 'rdmCloseLabel')}>
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t(lang, 'rdmMotifLabel')} <span className="text-red-600">*</span>
            </label>
            <textarea
              className="min-h-[120px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-admin-800/20 focus:border-admin-800 focus:ring-2"
              rows={5}
              value={motif}
              onChange={(e) => onMotifChange(e.target.value)}
              placeholder={t(lang, 'rdmPlaceholder')}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100" onClick={onClose}>
              {t(lang, 'rdmCancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-red-700 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-red-800 disabled:opacity-60"
            >
              {loading ? t(lang, 'rdmLoading') : t(lang, 'rdmConfirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
