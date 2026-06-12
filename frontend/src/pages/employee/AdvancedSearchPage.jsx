import React, { useState } from 'react';
import { t } from '../../i18n/translations';
import { adminAPI, demandesAPI } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { STATUS_CONFIG } from '../../utils/workflowStatusConfig';
import { formatDate } from '../../utils/formatters';
import { CitizenSearchIllustration, NoCitizenResultIllustration } from '../../components/ui/Illustrations';
import { Search } from 'lucide-react';

export default function AdvancedSearchPage({ onOpenDemandeNavigate }) {
  const { lang, isRtl } = useLanguage();
  const { showToast } = useToast();

  const [advancedQuery, setAdvancedQuery] = useState('');
  const [advancedResult, setAdvancedResult] = useState(null);
  const [advancedSearched, setAdvancedSearched] = useState(false);
  const [advancedProfileOpen, setAdvancedProfileOpen] = useState(false);
  const [advancedLoading, setAdvancedLoading] = useState(false);

  const handleAdvancedSearch = async (e) => {
    e?.preventDefault();
    if (!advancedQuery.trim()) return;
    setAdvancedLoading(true); setAdvancedResult(null); setAdvancedProfileOpen(false); setAdvancedSearched(true);
    try {
      const res = await adminAPI.searchCitoyen(advancedQuery.trim());
      setAdvancedResult(res.data.data);
    } catch (err) {
      setAdvancedResult(null);
      if (err.response?.status !== 404) showToast(err.response?.data?.message || t(lang, 'toastNoResults'), 'error');
    } finally { setAdvancedLoading(false); }
  };

  const openDemandeFromAdvancedSearch = async (id) => {
    try {
      const res = await demandesAPI.getById(id);
      onOpenDemandeNavigate?.(res.data.data);
    } catch (err) { showToast(err.response?.data?.message || t(lang, 'toastDemandeNotFound'), 'error'); }
  };

  const advancedDemandes = advancedResult?.demandes || [];
  const advancedLastDemande = advancedDemandes[0] || null;
  const advancedRows = advancedResult ? [{
    id: advancedResult.citoyen?.id || advancedLastDemande?.id || 'citizen-result',
    name: advancedResult.citoyen?.full_name || advancedLastDemande?.nom_complet || t(lang, 'citizen'),
    cin: advancedLastDemande?.cin || advancedResult.citoyen?.username || '-',
    dossiers: advancedDemandes.length, status: advancedLastDemande?.statut || '',
    demandeId: advancedLastDemande?.id
  }] : [];

  return (
    <div className="max-w-[900px]">
      {/* Header */}
      <div className="mb-8">
        <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">{isRtl ? 'البحث المتقدم' : 'Recherche avancée'}</div>
        <h1 className="text-2xl font-bold text-slate-900">{t(lang, 'advancedSearchTitle')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t(lang, 'advancedSearchDesc')}</p>
      </div>

      {/* Advanced filters - visible on entry */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">{isRtl ? 'فلاتر متقدمة' : 'Filtres avancés'}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">{isRtl ? 'الحالة' : 'Statut'}</label>
            <select className="filter-select w-full">
              <option value="">{isRtl ? 'الكل' : 'Tous'}</option>
              <option value="en_cours_analyse">{isRtl ? 'قيد التحليل' : 'En cours d\'analyse'}</option>
              <option value="accepte">{isRtl ? 'مقبول' : 'Accepté'}</option>
              <option value="refuse">{isRtl ? 'مرفوض' : 'Refusé'}</option>
              <option value="en_attente">{isRtl ? 'في الانتظار' : 'En attente'}</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">{isRtl ? 'نوع الرخصة' : 'Type de licence'}</label>
            <select className="filter-select w-full">
              <option value="">{isRtl ? 'الكل' : 'Tous'}</option>
              <option value="pharmacie">{isRtl ? 'صيدلية' : 'Pharmacie'}</option>
              <option value="cafe_restaurant">{isRtl ? 'مقهى / مطعم' : 'Café / Restaurant'}</option>
              <option value="hopital_clinique">{isRtl ? 'مستشفى / عيادة' : 'Hôpital / Clinique'}</option>
              <option value="ecole_privee">{isRtl ? 'مدرسة خاصة' : 'École privée'}</option>
              <option value="salle_sport">{isRtl ? 'قاعة رياضية' : 'Salle de sport'}</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">{isRtl ? 'الجماعة' : 'Commune'}</label>
            <input className="filter-select w-full" placeholder={isRtl ? 'بحث...' : 'Rechercher...'} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">{isRtl ? 'الفترة' : 'Période'}</label>
            <select className="filter-select w-full">
              <option value="">{isRtl ? 'الكل' : 'Toutes'}</option>
              <option value="today">{isRtl ? 'اليوم' : 'Aujourd\'hui'}</option>
              <option value="week">{isRtl ? 'هذا الأسبوع' : 'Cette semaine'}</option>
              <option value="month">{isRtl ? 'هذا الشهر' : 'Ce mois'}</option>
              <option value="quarter">{isRtl ? 'هذا الربع' : 'Ce trimestre'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search form */}
      <form className="bg-white rounded-2xl p-5 border border-slate-100 card-hover mb-6" onSubmit={handleAdvancedSearch}>
        <div className="flex gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
              value={advancedQuery}
              onChange={e => setAdvancedQuery(e.target.value)}
              placeholder={t(lang, 'advancedSearchPlaceholder')}
            />
          </div>
          <button
            className="btn-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 flex-shrink-0"
            type="submit"
            disabled={advancedLoading}
          >
            {advancedLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {advancedLoading ? t(lang, 'advancedSearching') : t(lang, 'advancedSearchBtn')}
          </button>
        </div>
      </form>

      {/* Results */}
      {advancedLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !advancedSearched ? (
        <div className="text-center py-16 px-5 flex flex-col items-center justify-center gap-3">
          <CitizenSearchIllustration />
          <h3 className="text-lg font-bold text-slate-900 mt-1">{isRtl ? 'ابحث عن مواطن' : 'Recherchez un citoyen'}</h3>
          <p className="max-w-[440px] text-sm text-slate-500">{isRtl ? 'أدخل اسما أو رقم البطاقة الوطنية أو رقم الملف للبدء' : 'Entrez un nom, CIN ou numéro de dossier pour commencer'}</p>
        </div>
      ) : !advancedResult ? (
        <div className="text-center py-16 px-5 flex flex-col items-center justify-center gap-3">
          <NoCitizenResultIllustration />
          <h3 className="text-lg font-bold text-slate-900 mt-1">{isRtl ? 'لم يتم العثور على نتائج' : 'Aucun résultat trouvé'}</h3>
          <p className="max-w-[440px] text-sm text-slate-500">{isRtl ? 'تحقق من الإملاء أو جرب معيارا آخر' : "Vérifiez l'orthographe ou essayez un autre critère"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Results table */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden card-hover">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-5 py-3">{isRtl ? 'الاسم' : 'NOM'}</th>
                    <th className="text-left px-5 py-3">CIN</th>
                    <th className="text-left px-5 py-3">{isRtl ? 'الملفات' : 'DOSSIERS'}</th>
                    <th className="text-left px-5 py-3">{isRtl ? 'الحالة' : 'STATUT'}</th>
                    <th className="text-right px-5 py-3">{isRtl ? 'الإجراءات' : 'ACTIONS'}</th>
                  </tr>
                </thead>
                <tbody>
                  {advancedRows.map(row => {
                    const statusConfig = STATUS_CONFIG[row.status] || {};
                    return (
                      <tr key={row.id} className="table-row border-b border-slate-50 cursor-pointer" onClick={() => setAdvancedProfileOpen(true)}>
                        <td className="px-5 py-4 font-semibold text-sm text-slate-800">{row.name}</td>
                        <td className="px-5 py-4 text-sm text-slate-600 font-mono">{row.cin}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{row.dossiers}</td>
                        <td className="px-5 py-4">
                          <span className="badge" style={{ color: statusConfig.color, backgroundColor: statusConfig.bg, borderColor: statusConfig.border }}>
                            {isRtl ? statusConfig.label_ar || row.status || '-' : statusConfig.label_fr || row.status || '-'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            className="px-4 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 transition"
                            type="button"
                            onClick={(event) => { event.stopPropagation(); setAdvancedProfileOpen(true); }}
                          >
                            {isRtl ? 'فتح الملف' : 'Ouvrir le profil'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Profile card */}
          {advancedProfileOpen && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 card-hover">
              <div className="flex justify-between items-center flex-wrap gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{advancedResult.citoyen?.full_name || t(lang, 'citizen')}</h3>
                  <p className="text-sm text-slate-500">
                    Username: {advancedResult.citoyen?.username || '-'} | {t(lang, 'creationDate')}: {formatDate(advancedResult.citoyen?.created_at)} | Tel: {advancedResult.citoyen?.phone || '-'}
                  </p>
                </div>
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-3 py-1 rounded-full">
                  {advancedResult.total_licences_approuvees} {t(lang, 'approved').toLowerCase()} / {advancedDemandes.length} {t(lang, 'totalRequests').toLowerCase()}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-5 py-3">{t(lang, 'dossierNumber')}</th>
                      <th className="text-left px-5 py-3">{t(lang, 'fullName')}</th>
                      <th className="text-left px-5 py-3">CIN</th>
                      <th className="text-left px-5 py-3">{t(lang, 'commune')}</th>
                      <th className="text-left px-5 py-3">{t(lang, 'status')}</th>
                      <th className="text-left px-5 py-3">{t(lang, 'creationDate')}</th>
                      <th className="text-right px-5 py-3">{t(lang, 'auditAction')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advancedDemandes.map(d => (
                      <tr key={d.id} className="table-row border-b border-slate-50">
                        <td className="px-5 py-4 font-mono text-sm font-semibold text-slate-800">{d.numero_dossier}</td>
                        <td className="px-5 py-4 text-sm text-slate-700">{d.nom_complet}</td>
                        <td className="px-5 py-4 text-sm text-slate-600 font-mono">{d.cin}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{d.commune}</td>
                        <td className="px-5 py-4">
                          <span className="badge" style={{ color: STATUS_CONFIG[d.statut]?.color, backgroundColor: STATUS_CONFIG[d.statut]?.bg, borderColor: STATUS_CONFIG[d.statut]?.border }}>
                            {isRtl ? STATUS_CONFIG[d.statut]?.label_ar || d.statut : STATUS_CONFIG[d.statut]?.label_fr || d.statut}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-500">{formatDate(d.date_creation)}</td>
                        <td className="px-5 py-4 text-right">
                          <button
                            className="px-4 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 transition"
                            type="button"
                            onClick={() => openDemandeFromAdvancedSearch(d.id)}
                          >
                            {t(lang, 'editRequest')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
