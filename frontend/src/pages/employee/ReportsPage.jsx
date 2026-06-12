import React, { useState, useEffect, useCallback } from 'react';
import { t } from '../../i18n/translations';
import { adminAPI, pdfAPI } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { STATUS_CONFIG } from '../../utils/workflowStatusConfig';
import { formatDate } from '../../utils/formatters';
import { Download, FileText, Filter } from 'lucide-react';

export default function ReportsPage() {
  const { lang, isRtl } = useLanguage();
  const { showToast } = useToast();

  const nowForReport = new Date();
  const [reportMonth, setReportMonth] = useState(nowForReport.getMonth() + 1);
  const [reportYear, setReportYear] = useState(nowForReport.getFullYear());
  const [reportFilters, setReportFilters] = useState({ from: '', to: '', statut: '', commune: '', cercle: '', source: '' });
  const [communeSort, setCommuneSort] = useState({ key: 'total', dir: 'desc' });
  const [communeData, setCommuneData] = useState([]);
  const [pdfLoading, setPdfLoading] = useState({});

  const fetchCommuneData = useCallback(async () => {
    try {
      const res = await adminAPI.getStatsByCommune();
      setCommuneData(res.data.data || []);
    } catch {}
  }, []);

  useEffect(() => { fetchCommuneData(); }, [fetchCommuneData]);

  const sortedCommunes = [...communeData].sort((a, b) => {
    const dir = communeSort.dir === 'asc' ? 1 : -1;
    const av = communeSort.key === 'taux_approbation' ? parseFloat(a.taux_approbation) : a[communeSort.key];
    const bv = communeSort.key === 'taux_approbation' ? parseFloat(b.taux_approbation) : b[communeSort.key];
    if (typeof av === 'string') return av.localeCompare(String(bv || '')) * dir;
    return (Number(av || 0) - Number(bv || 0)) * dir;
  });

  const handleRapportPdf = async () => {
    setPdfLoading(p => ({ ...p, rapport: true }));
    try { await pdfAPI.downloadRapportMensuel(reportMonth, reportYear); }
    catch { showToast(isRtl ? 'خطأ في تقرير PDF' : 'Erreur rapport PDF', 'error'); }
    setPdfLoading(p => { const n = { ...p }; delete n.rapport; return n; });
  };

  const handleRapportGlobalPdf = async () => {
    setPdfLoading(p => ({ ...p, rapportGlobal: true }));
    try { await pdfAPI.downloadRapport(); }
    catch { showToast(t(lang, 'toastPdfReportError'), 'error'); }
    finally { setPdfLoading(p => { const n = { ...p }; delete n.rapportGlobal; return n; }); }
  };

  const handleAdvancedExportExcel = async () => {
    try {
      const res = await adminAPI.exportDemandes({ ...reportFilters, format: 'json' });
      const ExcelJS = await import('exceljs');
      const rows = (res.data.data || []).map(d => ({
        'N dossier': d.numero_dossier, 'Nom pharmacien': d.nom_complet, CIN: d.cin,
        Commune: d.commune, Cercle: d.cercle, Statut: STATUS_CONFIG[d.statut]?.label_fr || d.statut,
        Source: d.source || '', 'Agent traitant': d.created_by_full_name || '',
        'Citoyen': d.citizen_full_name || '', 'Dernier evenement': d.workflow_last_event || '',
        'Date creation': formatDate(d.date_creation), 'Date decision': formatDate(d.date_decision)
      }));
      if (!rows.length) { showToast(t(lang, 'toastNoExportData'), 'error'); return; }
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(t(lang, 'searchTitle'));
      worksheet.columns = [
        { header: 'N dossier', key: 'numero_dossier' }, { header: 'Nom pharmacien', key: 'nom_complet' },
        { header: 'CIN', key: 'cin' }, { header: 'Commune', key: 'commune' }, { header: 'Cercle', key: 'cercle' },
        { header: 'Statut', key: 'statut' }, { header: 'Source', key: 'source' },
        { header: 'Agent traitant', key: 'created_by_full_name' }, { header: 'Citoyen', key: 'citizen_full_name' },
        { header: 'Dernier evenement', key: 'workflow_last_event' }, { header: 'Date creation', key: 'date_creation' },
        { header: 'Date decision', key: 'date_decision' }
      ];
      worksheet.addRows(rows);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `export_demandes_${new Date().toISOString().slice(0, 10)}.xlsx`; a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) { showToast(err.response?.data?.message || t(lang, 'toastExportError'), 'error'); }
  };

  return (
    <div className="max-w-[1120px]">
      {/* Header */}
      <div className="mb-8">
        <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">{isRtl ? 'التقارير' : 'Rapports'}</div>
        <h1 className="text-2xl font-bold text-slate-900">{t(lang, 'reportsTitle')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t(lang, 'reportsDesc')}</p>
      </div>

      {/* Report cards */}
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: 'minmax(260px, 0.85fr) minmax(360px, 1.15fr)' }}>
        {/* Global report */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 card-hover">
          <h3 className="font-bold text-slate-900 mb-1">{t(lang, 'reportsGlobalTitle')}</h3>
          <p className="text-sm text-slate-500 mb-4">{isRtl ? 'تصدير كامل لجميع الملفات' : 'Export complet de tous les dossiers'}</p>
          <button
            className="btn-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
            type="button"
            onClick={handleRapportGlobalPdf}
            disabled={pdfLoading.rapportGlobal}
          >
            <FileText className="w-4 h-4" />
            {pdfLoading.rapportGlobal ? t(lang, 'reportsGlobalGenerating') : t(lang, 'reportsGlobalBtn')}
          </button>
        </div>

        {/* Monthly report */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 card-hover">
          <h3 className="font-bold text-slate-900 mb-1">{t(lang, 'reportsMonthlyTitle')}</h3>
          <p className="text-sm text-slate-500 mb-4">{isRtl ? 'تصدير حسب الشهر والسنة' : 'Export par mois et année'}</p>
          <div className="flex items-center gap-2.5 flex-wrap justify-end">
            <input
              type="date"
              className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#27ab83]/30 focus:border-[#27ab83] transition-all"
              value={reportFilters.from}
              onChange={e => setReportFilters(p => ({ ...p, from: e.target.value }))}
            />
            <input
              type="date"
              className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#27ab83]/30 focus:border-[#27ab83] transition-all"
              value={reportFilters.to}
              onChange={e => setReportFilters(p => ({ ...p, to: e.target.value }))}
            />
            <button
              className="btn-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
              type="button"
              onClick={handleRapportPdf}
              disabled={pdfLoading.rapport}
            >
              <Download className="w-4 h-4" />
              {pdfLoading.rapport ? t(lang, 'reportsGlobalGenerating') : t(lang, 'reportsMonthlyBtn')}
            </button>
          </div>
        </div>

        {/* Advanced export */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 card-hover col-span-full">
          <h3 className="font-bold text-slate-900 mb-3">{t(lang, 'reportsAdvancedTitle')}</h3>
          <div className="flex items-center gap-2.5 flex-wrap">
            <input className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#27ab83]/30 focus:border-[#27ab83] transition-all" type="date" value={reportFilters.from} onChange={e => setReportFilters(p => ({ ...p, from: e.target.value }))} />
            <input className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#27ab83]/30 focus:border-[#27ab83] transition-all" type="date" value={reportFilters.to} onChange={e => setReportFilters(p => ({ ...p, to: e.target.value }))} />
            <select className="filter-select min-w-[150px]" value={reportFilters.statut} onChange={e => setReportFilters(p => ({ ...p, statut: e.target.value }))}>
              <option value="">{t(lang, 'reportsAdvancedStatusesAll')}</option>
              <option value="en_cours_analyse">{t(lang, 'searchStatusEnCours')}</option>
              <option value="documents_rejetes">{t(lang, 'searchStatusDocsRejetes')}</option>
              <option value="decision_imprimee">{t(lang, 'searchStatusDecisionImprimee')}</option>
              <option value="accepte">{t(lang, 'searchStatusAccepte')}</option>
              <option value="avis_favorable">Documents validés</option>
              <option value="refuse">{t(lang, 'searchStatusRefuse')}</option>
            </select>
            <input className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#27ab83]/30 focus:border-[#27ab83] transition-all" placeholder={t(lang, 'searchCommunePlaceholder')} value={reportFilters.commune} onChange={e => setReportFilters(p => ({ ...p, commune: e.target.value }))} />
            <input className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#27ab83]/30 focus:border-[#27ab83] transition-all" placeholder={t(lang, 'searchCerclePlaceholder')} value={reportFilters.cercle} onChange={e => setReportFilters(p => ({ ...p, cercle: e.target.value }))} />
            <select className="filter-select min-w-[150px]" value={reportFilters.source} onChange={e => setReportFilters(p => ({ ...p, source: e.target.value }))}>
              <option value="">{t(lang, 'reportsAdvancedSourcesAll')}</option>
              <option value="citizen">{t(lang, 'citizen')}</option>
              <option value="agent">{t(lang, 'roleAgent')}</option>
            </select>
            <button
              className="btn-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
              type="button"
              onClick={handleAdvancedExportExcel}
            >
              <Download className="w-4 h-4" />
              {t(lang, 'reportsAdvancedExporter')}
            </button>
          </div>
        </div>
      </div>

      {/* Commune stats table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden card-hover mt-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {[
                  ['commune', t(lang, 'reportsCommuneCol')],
                  ['cercle', t(lang, 'reportsCercleCol')],
                  ['total', t(lang, 'reportsTotalCol')],
                  ['approuvees', t(lang, 'reportsApprouveesCol')],
                  ['rejetees', t(lang, 'reportsRejeteesCol')],
                  ['en_attente', t(lang, 'reportsEnAttenteCol')],
                  ['taux_approbation', t(lang, 'reportsTauxCol')]
                ].map(([key, label]) => (
                  <th key={key} onClick={() => setCommuneSort(p => ({ key, dir: p.key === key && p.dir === 'desc' ? 'asc' : 'desc' }))} className="text-left px-5 py-3 cursor-pointer hover:text-teal-600 transition">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedCommunes.map(row => (
                <tr key={`${row.commune}-${row.cercle}`} className="table-row border-b border-slate-50">
                  <td className="px-5 py-4 text-sm text-slate-700">{row.commune}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">{row.cercle}</td>
                  <td className="px-5 py-4 text-sm text-slate-700 font-semibold">{row.total}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">{row.approuvees}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">{row.rejetees}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">{row.en_attente}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">{row.taux_approbation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
