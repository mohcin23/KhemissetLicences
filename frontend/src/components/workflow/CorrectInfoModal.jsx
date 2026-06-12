import React, { useState } from 'react';
import { Modal, Button, Input } from '../ui';
import { AlertCircle, Save, X } from 'lucide-react';

// AJOUTÉ PHASE 2 : Modal pour corriger les informations extraites par OCR
export default function CorrectInfoModal({
  isOpen,
  onClose,
  demande,
  onSave,
  loading = false,
  lang = 'fr',
  isRtl = false
}) {
  const [formData, setFormData] = useState({
    nom_complet: demande?.nom_complet || '',
    cin: demande?.cin || '',
    date_naissance: demande?.date_naissance || '',
    universite: demande?.universite || '',
    diplome: demande?.diplome || '',
    adresse_complete: demande?.adresse_complete || '',
    date_demande: demande?.date_demande || '',
    date_izin: demande?.date_izin || '',
    numero_izin: demande?.numero_izin || '',
    nom_massah: demande?.nom_massah || '',
    date_massah: demande?.date_massah || '',
    date_lajna: demande?.date_lajna || '',
    commune: demande?.commune || '',
    cercle: demande?.cercle || '',
    notes: demande?.notes || ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  const fields = [
    { key: 'nom_complet', label_fr: 'Nom complet', label_ar: 'الاسم الكامل' },
    { key: 'cin', label_fr: 'CIN', label_ar: 'بطاقة التعريف' },
    { key: 'date_naissance', label_fr: 'Date de naissance', label_ar: 'تاريخ الميلاد', type: 'date' },
    { key: 'universite', label_fr: 'Université', label_ar: 'الجامعة' },
    { key: 'diplome', label_fr: 'Diplôme', label_ar: 'الدبلوم' },
    { key: 'adresse_complete', label_fr: 'Adresse complète', label_ar: 'العنوان الكامل', multiline: true },
    { key: 'commune', label_fr: 'Commune', label_ar: 'البلدية' },
    { key: 'cercle', label_fr: 'Cercle', label_ar: 'الدائرة' },
    { key: 'date_demande', label_fr: 'Date de demande', label_ar: 'تاريخ الطلب', type: 'date' },
    { key: 'date_izin', label_fr: 'Date du permis', label_ar: 'تاريخ الإذن', type: 'date' },
    { key: 'numero_izin', label_fr: 'Numéro du permis', label_ar: 'رقم الإذن' },
    { key: 'nom_massah', label_fr: 'Géomètre', label_ar: 'المساح' },
    { key: 'date_massah', label_fr: 'Date du certificat', label_ar: 'تاريخ الشهادة', type: 'date' },
    { key: 'date_lajna', label_fr: 'Date commission', label_ar: 'تاريخ اللجنة', type: 'date' },
    { key: 'notes', label_fr: 'Notes', label_ar: 'ملاحظات', multiline: true }
  ];

  const getLabel = (field) => lang === 'ar' ? field.label_ar : field.label_fr;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={lang === 'ar' ? 'تصحيح المعلومات' : 'Corriger les informations'} size="lg">
      <div className="max-h-96 space-y-4 overflow-y-auto">
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p>{lang === 'ar' ? 'صحح أي معلومات مستخرجة بشكل غير صحيح من المستندات' : 'Corrigez les informations mal extraites des documents'}</p>
        </div>

        {fields.map(field => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {getLabel(field)}
            </label>
            {field.multiline ? (
              <textarea
                value={formData[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            ) : (
              <Input
                type={field.type || 'text'}
                value={formData[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-full"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          <X className="h-4 w-4" />
          {lang === 'ar' ? 'إلغاء' : 'Annuler'}
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          <Save className="h-4 w-4" />
          {lang === 'ar' ? 'حفظ التصحيحات' : 'Enregistrer'}
        </Button>
      </div>
    </Modal>
  );
}
