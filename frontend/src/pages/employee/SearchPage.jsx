import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import { PageShell, Button, FilterBar, FilterSelect } from '../../components/ui';
import DemandesTable from '../../components/demandes/DemandesTable';
import LicenceBadge from '../../components/licences/LicenceBadge';
import { t } from '../../i18n/translations';
import { demandesAPI, pdfAPI, auditAPI } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { STATUS_CONFIG } from '../../utils/workflowStatusConfig';
import { formatDate } from '../../utils/formatters';
import { ACTIVE_AGENT_STATUSES, PAGE_SIZE, DECISION_PDF_STATUSES } from '../../utils/appConstants';
import RejectDocumentsModal from '../../components/workflow/RejectDocumentsModal';

export default function SearchPage({ onShowConfirm, onTrackNavigate, onChooseDecisionLanguage }) {
  const navigate = useNavigate();
  const { lang, isRtl } = useLanguage();
  const { authUser } = useAuth();
  const { showToast } = useToast();

  const userRole = authUser?.role || '';
  const isAdminRole = userRole === 'admin';
  const isAgentRole = userRole === 'agent';
  const forbiddenMessage = t(lang, 'forbiddenMessage');

  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTotal, setSearchTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterCommune, setFilterCommune] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterLicenceType, setFilterLicenceType] = useState('');
  const [sortBy, setSortBy] = useState('date_modification');
  const [sortDir, setSortDir] = useState('desc');
  const [treatedTodayOnly, setTreatedTodayOnly] = useState(false);
  const [pdfLoading, setPdfLoading] = useState({});
  const [agentDashboard, setAgentDashboard] = useState(null);
  const [rejectingFile, setRejectingFile] = useState(null);
  const [fileRejectMotif, setFileRejectMotif] = useState('');
  const [fileRejectLoading, setFileRejectLoading] = useState(false);
  const [fileRejectApiError, setFileRejectApiError] = useState('');

  const fetchDemandes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await demandesAPI.getAll({
        search, statut: statusFilter, commune: filterCommune,
        licence_type: filterLicenceType || undefined,
        page: currentPage, limit: PAGE_SIZE,
        sort_by: sortBy, sort_dir: sortDir,
        traite_aujourdhui: treatedTodayOnly ? 1 : undefined
      });
      setDemandes(res.data.data);
      setSearchTotal(res.data.total || 0);
    } catch { showToast(t(lang, 'fetchError'), 'error'); } finally { setLoading(false); }
  }, [search, statusFilter, filterCommune, filterLicenceType, currentPage, sortBy, sortDir, treatedTodayOnly, lang, showToast]);

  const fetchAgentDashboard = useCallback(async () => {
    if (!isAgentRole && !isAdminRole) return;
    try {
      const res = await demandesAPI.getAgentDashboard();
      setAgentDashboard(res.data.data || null);
    } catch { setAgentDashboard(null); }
  }, [isAgentRole, isAdminRole]);

  useEffect(() => { fetchDemandes(); fetchAgentDashboard(); }, [fetchDemandes, fetchAgentDashboard]);
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, filterCommune, treatedTodayOnly]);

  const canEditDemande = () => isAgentRole;
  const canGeneratePdf = (demande) => isAgentRole && DECISION_PDF_STATUSES.has(demande?.statut);

  const totalPages = Math.max(1, Math.ceil(searchTotal / PAGE_SIZE));
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter(n => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 2);

  const applyAgentDashboardFilter = ({ statut = '', treatedToday = false } = {}) => {
    navigate('/app/search');
    setSearch(''); setFilterCommune(''); setStatusFilter(statut);
    setTreatedTodayOnly(treatedToday);
    setSortBy('date_modification'); setSortDir('desc'); setCurrentPage(1);
  };

  const handlePdf = async (id, numeroDossier) => {
    const demande = demandes.find(d => d.id === id);
    if (!canGeneratePdf(demande)) { showToast(forbiddenMessage, 'error'); return; }
    const pdfLang = onChooseDecisionLanguage ? await onChooseDecisionLanguage() : null;
    if (!pdfLang) return;
    const pdfKey = `pdf_${id}`;
    setPdfLoading(p => ({ ...p, [pdfKey]: true }));
    try { await pdfAPI.downloadDecision(id, numeroDossier, pdfLang); }
    catch { showToast(isRtl ? 'خطأ في توليد القرار' : 'Erreur PDF', 'error'); }
    setPdfLoading(p => { const n = { ...p }; delete n[pdfKey]; return n; });
  };

  const handlePrintPdf = async (id) => {
    const demande = demandes.find(d => d.id === id);
    if (!canGeneratePdf(demande)) { showToast(forbiddenMessage, 'error'); return; }
    const pdfLang = onChooseDecisionLanguage ? await onChooseDecisionLanguage() : null;
    if (!pdfLang) return;
    const printKey = `print_${id}`;
    setPdfLoading(p => ({ ...p, [printKey]: true }));
    try {
      const res = await pdfAPI.getDecisionForView(id, pdfLang);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const printWindow = window.open(url, '_blank');
      if (printWindow) { printWindow.onload = () => { printWindow.focus(); printWindow.print(); }; }
      else { showToast(isRtl ? 'يرجى السماح بالنوافذ المنبثقة' : 'Veuillez autoriser les popups', 'error'); }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { showToast(isRtl ? 'خطأ في الطباعة' : 'Erreur impression', 'error'); }
    setPdfLoading(p => { const n = { ...p }; delete n[printKey]; return n; });
  };

  const handleExportExcel = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const res = await demandesAPI.getAll({
        search, statut: statusFilter, commune: filterCommune,
        licence_type: filterLicenceType || undefined,
        page: 1, limit: searchTotal || 10000,
        sort_by: sortBy, sort_dir: sortDir,
        traite_aujourdhui: treatedTodayOnly ? 1 : undefined
      });
      const rows = (res.data.data || []).map(d => ({
        numero_dossier: d.numero_dossier, nom_complet: d.nom_complet, cin: d.cin,
        licence_type: d.licence_type || 'pharmacie', date_naissance: formatDate(d.date_naissance),
        universite: d.universite || '', diplome: d.diplome || '',
        adresse_complete: d.adresse_complete || '', commune: d.commune || '', cercle: d.cercle || '',
        statut: t(lang, d.statut), date_creation: formatDate(d.date_creation)
      }));
      if (!rows.length) { showToast(isRtl ? 'لا توجد بيانات للتصدير' : 'Aucune donnée à exporter', 'error'); return; }
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Demandes');
      worksheet.columns = [
        { header: 'N° Dossier', key: 'numero_dossier' }, { header: 'Nom Complet', key: 'nom_complet' },
        { header: 'CIN', key: 'cin' }, { header: 'Type de Licence', key: 'licence_type' },
        { header: 'Date Naissance', key: 'date_naissance' }, { header: 'Université', key: 'universite' },
        { header: 'Diplôme', key: 'diplome' }, { header: 'Adresse', key: 'adresse_complete' },
        { header: 'Commune', key: 'commune' }, { header: 'Cercle', key: 'cercle' },
        { header: 'Statut', key: 'statut' }, { header: 'Date Création', key: 'date_creation' }
      ];
      worksheet.addRows(rows);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_licences_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      try { await auditAPI.logExcelExport({ action: 'EXPORT_EXCEL_DEMANDES', entity_type: 'demandes', details: { total: rows.length, search, statut: statusFilter, commune: filterCommune } }); } catch {}
    } catch { showToast(isRtl ? 'خطأ في التصدير' : 'Erreur export Excel', 'error'); }
  };

  const handleDelete = (id) => {
    if (!isAdminRole) { showToast(forbiddenMessage, 'error'); return; }
    onShowConfirm?.({
      title: isRtl ? 'تأكيد الحذف' : 'Confirmer la suppression',
      message: isRtl ? 'سيتم حذف هذا الملف نهائياً.' : 'Cette action supprimera définitivement ce dossier.',
      danger: true, confirmLabel: isRtl ? 'حذف' : 'Supprimer', cancelLabel: isRtl ? 'إلغاء' : 'Annuler',
      onConfirm: async () => { await demandesAPI.delete(id); showToast(isRtl ? 'تم الحذف' : 'Supprimé'); await fetchDemandes(); }
    });
  };

  const handleStatusChange = async (id, statut, extraData = {}) => {
    const demande = demandes.find(d => d.id === id);
    if (!canEditDemande()) { showToast(forbiddenMessage, 'error'); return; }
    if (statut === 'documents_rejetes') { openRejectFileModal(demande); return; }
    try {
      if (statut === 'accepte') {
        await demandesAPI.accepterDefinitif(id, { commentaire: extraData.notes || null });
      } else if (statut === 'refuse') {
        await demandesAPI.refuserGouverneur(id, { notes: extraData.notes || 'Refusé par l\'employé' });
      } else {
        await demandesAPI.updateStatut(id, statut, extraData.notes ? { notes: extraData.notes } : {});
      }
      fetchDemandes(); await fetchAgentDashboard();
    } catch (err) { showToast(err.response?.data?.message || (isRtl ? 'خطأ في تحديث الحالة' : 'Erreur mise à jour statut'), 'error'); }
  };

  const openRejectFileModal = (demande) => {
    const rejOk = ['en_cours_analyse', 'documents_corriges'].includes(demande.statut);
    if (!canEditDemande() || !rejOk) { showToast(forbiddenMessage, 'error'); return; }
    setRejectingFile(demande); setFileRejectMotif(''); setFileRejectApiError('');
  };

  const closeRejectFileModal = () => {
    setRejectingFile(null); setFileRejectMotif(''); setFileRejectApiError('');
  };

  const handleRejectFileSubmit = async (e) => {
    e.preventDefault();
    if (!fileRejectMotif.trim()) { showToast(isRtl ? 'سبب الرفض مطلوب' : 'Motif de rejet requis', 'error'); return; }
    setFileRejectLoading(true);
    try {
      await demandesAPI.rejeterFichier(rejectingFile.id, fileRejectMotif);
      closeRejectFileModal(); await fetchDemandes(); await fetchAgentDashboard();
      showToast(isRtl ? 'تم رفض الملف' : 'Fichier rejeté');
    } catch (err) {
      const msg = err.response?.data?.message || (isRtl ? 'خطأ في رفض الملف' : 'Erreur rejet fichier');
      setFileRejectApiError(msg); showToast(msg, 'error');
    } finally { setFileRejectLoading(false); }
  };

  const hasActiveFilters = Boolean(search || filterCommune || statusFilter || filterLicenceType || treatedTodayOnly);

  const clearAllFilters = () => {
    setSearch(''); setFilterCommune(''); setStatusFilter(''); setFilterLicenceType('');
    setTreatedTodayOnly(false);
  };

  return (
    <div>
      <PageShell
        kicker={isRtl ? 'السجل' : 'Registre'}
        title={t(lang, 'searchRequests')}
        description={
          isRtl
            ? 'سجل الطلبات — بحث بالاسم، رقم البطاقة، رقم الملف أو الجماعة'
            : 'Registre des dossiers — recherche par nom, CIN, n° dossier ou commune'
        }
        actions={
          <Button variant="accent" size="md" icon={Download} onClick={handleExportExcel}>
            {t(lang, 'exportExcel')}
          </Button>
        }
      >
        {/* Filters */}
        <FilterBar
          lang={lang}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={isRtl ? 'بحث بالاسم أو رقم البطاقة أو رقم الملف...' : 'Rechercher par nom, CIN ou n° dossier...'}
          total={searchTotal}
          totalLabel={t(lang, 'filterBarCurrentView')}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearAllFilters}
        >
          <FilterSelect
            value={filterCommune}
            onChange={setFilterCommune}
            options={[
              { value: '', label: isRtl ? 'الجماعة' : 'Commune' },
              { value: 'Khémisset', label: 'Khémisset' },
              { value: 'Tiflet', label: 'Tiflet' },
              { value: 'Rommani', label: 'Rommani' },
              { value: 'Sidi Allal El Bahraoui', label: 'Sidi Allal El Bahraoui' },
              { value: 'Ait Siberne', label: 'Ait Siberne' },
              { value: 'Ait Ouribel', label: 'Ait Ouribel' },
              { value: 'Ait Mimoune', label: 'Ait Mimoune' },
              { value: 'Ait Yadine', label: 'Ait Yadine' },
              { value: 'Sfassif', label: 'Sfassif' },
              { value: 'El Kenzra', label: 'El Kenzra' },
              { value: 'Sidi El Ghandour', label: 'Sidi El Ghandour' },
              { value: 'Sidi Allal Lamsadder', label: 'Sidi Allal Lamsadder' },
              { value: 'Majmaa Tolba', label: 'Majmaa Tolba' },
              { value: 'Ait Ichou', label: 'Ait Ichou' },
              { value: 'Ait Iko', label: 'Ait Iko' },
              { value: 'Bouqachmir', label: 'Bouqachmir' },
              { value: 'Tiddas', label: 'Tiddas' },
              { value: 'Houderane', label: 'Houderane' },
              { value: 'Oulmes', label: 'Oulmes' },
              { value: 'Ain Sbit', label: 'Ain Sbit' },
              { value: 'Izdaylik', label: 'Izdaylik' },
              { value: 'El Ganzra', label: 'El Ganzra' },
              { value: 'Brachoua', label: 'Brachoua' },
              { value: 'Jemaat Moul Blad', label: 'Jemaat Moul Blad' },
              { value: 'Moulay Driss Aghbal', label: 'Moulay Driss Aghbal' },
              { value: 'Marchouch', label: 'Marchouch' },
              { value: 'Ait Belkacem', label: 'Ait Belkacem' },
              { value: 'Ait Bouyahya El Hajjama', label: 'Ait Bouyahya El Hajjama' },
              { value: 'Ait Ali Ou Lahsen', label: 'Ait Ali Ou Lahsen' },
              { value: 'Ait Malek', label: 'Ait Malek' },
              { value: 'Khemis Sidi Yahya', label: 'Khemis Sidi Yahya' },
              { value: 'Sidi Abdelrazak', label: 'Sidi Abdelrazak' },
              { value: 'Ain Johra - Sidi Boukhalkhal', label: 'Ain Johra - Sidi Boukhalkhal' },
              { value: 'Mqam Tolba', label: 'Mqam Tolba' },
            ]}
            className="min-w-[180px]"
          />
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: t(lang, 'searchStatusAll') },
              { value: ACTIVE_AGENT_STATUSES, label: 'Dossiers actifs' },
              { value: 'en_cours_analyse', label: t(lang, 'searchStatusEnCours') },
              { value: 'documents_rejetes', label: t(lang, 'searchStatusDocsRejetes') },
              { value: 'documents_corriges', label: t(lang, 'searchStatusDocsCorriges') },
              { value: 'avis_favorable', label: 'Documents validés' },
              { value: 'decision_imprimee', label: t(lang, 'searchStatusDecisionImprimee') },
              { value: 'accepte', label: t(lang, 'searchStatusAccepte') },
              { value: 'refuse', label: t(lang, 'searchStatusRefuse') },
              { value: 'archive', label: t(lang, 'searchStatusArchive') },
            ]}
          />
          <FilterSelect
            value={filterLicenceType}
            onChange={(v) => { setFilterLicenceType(v); setCurrentPage(1); }}
            options={[
              { value: '', label: isRtl ? 'جميع الأنواع' : 'Tous les types' },
              { value: 'pharmacie', label: isRtl ? 'صيدلية' : 'Pharmacie' },
              { value: 'cafe_restaurant', label: isRtl ? 'مقهى / مطعم' : 'Café / Restaurant' },
              { value: 'hopital_clinique', label: isRtl ? 'مستشفى / عيادة' : 'Hôpital / Clinique' },
              { value: 'ecole_privee', label: isRtl ? 'مدرسة خاصة' : 'École Privée' },
              { value: 'salle_sport', label: isRtl ? 'قاعة رياضية' : 'Salle de Sport' },
            ]}
          />
          <FilterSelect
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: 'date_creation', label: t(lang, 'searchSortDate') },
              { value: 'date_modification', label: t(lang, 'searchSortModif') },
              { value: 'nom_complet', label: t(lang, 'searchSortNom') },
              { value: 'statut', label: t(lang, 'searchSortStatut') },
              { value: 'numero_dossier', label: t(lang, 'searchSortDossier') },
            ]}
          />
          <FilterSelect
            value={sortDir}
            onChange={setSortDir}
            options={[
              { value: 'desc', label: t(lang, 'searchSortDesc') },
              { value: 'asc', label: t(lang, 'searchSortAsc') },
            ]}
          />
        </FilterBar>

        {/* Table */}
        <DemandesTable
          isRtl={isRtl}
          lang={lang}
          loading={loading}
          demandes={demandes}
          formatDate={formatDate}
          searchTotal={searchTotal}
          currentPage={currentPage}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          setCurrentPage={setCurrentPage}
          canEditDemande={canEditDemande}
          canGeneratePdf={canGeneratePdf}
          isAdminRole={isAdminRole}
          pdfLoading={pdfLoading}
          onTrack={onTrackNavigate}
          onPdf={handlePdf}
          onPrint={handlePrintPdf}
          onStatusChange={handleStatusChange}
          onRejectDocs={openRejectFileModal}
          onDelete={handleDelete}
          renderLicenceBadge={(d) => d.licence_type && d.licence_type !== 'pharmacie'
            ? <LicenceBadge licenceType={d.licence_type} lang={lang} style={{ marginLeft: 6, marginTop: 2 }} />
            : null
          }
          emptyResetFilters={clearAllFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </PageShell>

      <RejectDocumentsModal open={Boolean(rejectingFile)} onClose={closeRejectFileModal} onSubmit={handleRejectFileSubmit}
        numeroDossier={rejectingFile?.numero_dossier} motif={fileRejectMotif} onMotifChange={setFileRejectMotif}
        loading={fileRejectLoading} error={fileRejectApiError} lang={lang} />
    </div>
  );
}
