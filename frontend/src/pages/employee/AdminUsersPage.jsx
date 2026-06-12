import React, { useState, useEffect, useCallback } from 'react';
import { t } from '../../i18n/translations';
import { adminAPI } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../utils/formatters';
import { TeamApprovedIllustration } from '../../components/ui/Illustrations';
import CreateEmployeeModal from '../../components/employee/CreateEmployeeModal';
import ActivityHistoryModal from '../../components/employee/ActivityHistoryModal';
import { Users, UserPlus, Download, Check, X, Search, Clock } from 'lucide-react';

const roleBadges = (lang) => ({
  admin: { label: t(lang, 'roleAdmin'), className: 'role-admin' },
  agent: { label: t(lang, 'roleAgent'), className: 'role-agent' },
  lecteur: { label: t(lang, 'roleLecteur'), className: 'role-lecteur' },
  citizen: { label: t(lang, 'citizen'), className: 'role-lecteur' }
});

export default function AdminUsersPage({ onShowConfirm }) {
  const { lang, isRtl } = useLanguage();
  const { showToast } = useToast();

  const [pendingAgents, setPendingAgents] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersTab, setUsersTab] = useState('pending');
  const [userFilters, setUserFilters] = useState({ role: '', is_active: '', search: '' });
  const [agentUsersLoading, setAgentUsersLoading] = useState(false);
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [createEmployeeForm, setCreateEmployeeForm] = useState({ full_name: '', username: '', password: '', role: 'agent' });
  const [activityUser, setActivityUser] = useState(null);

  const fetchAgentUsers = useCallback(async () => {
    setAgentUsersLoading(true);
    try {
      const [pendingRes, usersRes] = await Promise.all([
        adminAPI.getUsers({ role: 'agent', is_active: 0, limit: 100 }),
        adminAPI.getUsers({ role: userFilters.role || undefined, is_active: userFilters.is_active !== '' ? userFilters.is_active : undefined, search: userFilters.search || undefined, limit: 200 })
      ]);
      setPendingAgents((pendingRes.data.data || []).filter(user => !user.approved_at));
      setAllUsers(usersRes.data.data || []);
      setUsersTotal(usersRes.data.total || 0);
    } catch (err) {
      showToast(err.response?.data?.message || (isRtl ? 'خطأ في تحميل الحسابات' : 'Erreur de chargement des comptes'), 'error');
    } finally { setAgentUsersLoading(false); }
  }, [isRtl, userFilters.role, userFilters.is_active, userFilters.search, showToast]);

  useEffect(() => { fetchAgentUsers(); }, [fetchAgentUsers]);

  const pendingAgentsCount = pendingAgents.length;

  const handleApproveAgent = async (id) => {
    try { await adminAPI.approveUser(id); await fetchAgentUsers(); showToast(isRtl ? 'تم تفعيل الحساب' : 'Compte agent approuvé'); }
    catch (err) { showToast(err.response?.data?.message || (isRtl ? 'خطأ في تفعيل الحساب' : 'Erreur approbation compte'), 'error'); }
  };

  const handleRejectAgent = (id) => {
    onShowConfirm?.({
      title: isRtl ? 'رفض الحساب' : 'Refuser ce compte',
      message: isRtl ? 'لن يتمكن المستخدم من الاتصال بهذا الحساب.' : "Le compte agent sera refusé et ne pourra pas s'authentifier.",
      danger: true, confirmLabel: isRtl ? 'رفض' : 'Refuser', cancelLabel: isRtl ? 'إلغاء' : 'Annuler',
      onConfirm: async () => { await adminAPI.rejectUser(id); await fetchAgentUsers(); showToast(isRtl ? 'تم رفض الحساب' : 'Compte agent refusé'); }
    });
  };

  const handleToggleUser = async (id) => {
    try { await adminAPI.toggleActive(id); await fetchAgentUsers(); showToast(isRtl ? 'تم تحديث حالة المستخدم' : 'Statut utilisateur mis a jour'); }
    catch (err) { showToast(err.response?.data?.message || t(lang, 'toastError'), 'error'); }
  };

  const handleDeleteUser = (id) => {
    onShowConfirm?.({
      title: isRtl ? 'حذف المستخدم' : 'Supprimer cet utilisateur',
      message: isRtl ? 'هذا الإجراء نهائي.' : 'Cette action est irréversible.',
      danger: true, confirmLabel: isRtl ? 'حذف' : 'Supprimer', cancelLabel: isRtl ? 'إلغاء' : 'Annuler',
      onConfirm: async () => { await adminAPI.deleteUser(id); await fetchAgentUsers(); showToast(isRtl ? 'تم حذف المستخدم' : 'Utilisateur supprimé'); }
    });
  };

  const handleChangeUserRole = async (id, role) => {
    try { await adminAPI.changeRole(id, role); await fetchAgentUsers(); showToast(isRtl ? 'تم تغيير الدور' : 'Role mis a jour'); }
    catch (err) { showToast(err.response?.data?.message || t(lang, 'toastError'), 'error'); }
  };

  const handleUsersExportExcel = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const rows = allUsers.map(user => ({
        full_name: user.full_name || '', username: user.username, role: user.role,
        is_active: Number(user.is_active) === 1 ? 'Actif' : 'Inactif',
        created_at: formatDate(user.created_at), approved_by_name: user.approved_by_name || '',
        total_demandes: user.total_demandes || 0
      }));
      if (!rows.length) { showToast(t(lang, 'toastNoExportData'), 'error'); return; }
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(t(lang, 'adminUsersAllTab'));
      worksheet.columns = [
        { header: 'Nom complet', key: 'full_name' }, { header: 'Username', key: 'username' },
        { header: 'Role', key: 'role' }, { header: 'Statut', key: 'is_active' },
        { header: 'Date creation', key: 'created_at' }, { header: 'Approuve par', key: 'approved_by_name' },
        { header: 'Total demandes', key: 'total_demandes' }
      ];
      worksheet.addRows(rows);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `utilisateurs_${new Date().toISOString().slice(0, 10)}.xlsx`; a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) { showToast(err.response?.data?.message || t(lang, 'toastError'), 'error'); }
  };

  return (
    <div className="max-w-[1120px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">{isRtl ? 'الفريق' : 'Équipe'}</div>
          <h1 className="text-2xl font-bold text-slate-900">{t(lang, 'adminUsersTitle')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t(lang, 'adminUsersDesc')}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2" type="button" onClick={() => setShowCreateEmployee(true)}>
            <UserPlus className="w-4 h-4" />
            {t(lang, 'createAccount')}
          </button>
          <button className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition" type="button" onClick={handleUsersExportExcel}>
            <Download className="w-4 h-4" />
            {t(lang, 'adminUsersExport')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card-uniform">
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-[#d97706]" />
          <div className="flex items-start justify-between mt-1">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">En attente</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{pendingAgentsCount}</p>
              <p className="text-xs text-slate-500 mt-1">Comptes à examiner</p>
            </div>
            <div className="w-11 h-11 rounded-full flex items-center justify-center bg-[#d97706]/10">
              <Clock className="w-5 h-5 text-[#d97706]" />
            </div>
          </div>
        </div>
        <div className="stat-card-uniform">
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-[#2563eb]" />
          <div className="flex items-start justify-between mt-1">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{usersTotal}</p>
              <p className="text-xs text-slate-500 mt-1">Comptes enregistrés</p>
            </div>
            <div className="w-11 h-11 rounded-full flex items-center justify-center bg-[#2563eb]/10">
              <Users className="w-5 h-5 text-[#2563eb]" />
            </div>
          </div>
        </div>
        <div className="stat-card-uniform">
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-[#16a34a]" />
          <div className="flex items-start justify-between mt-1">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Agents actifs</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{allUsers.filter(u => Number(u.is_active) === 1 && u.role === 'agent').length}</p>
              <p className="text-xs text-slate-500 mt-1">Comptes actifs</p>
            </div>
            <div className="w-11 h-11 rounded-full flex items-center justify-center bg-[#16a34a]/10">
              <Check className="w-5 h-5 text-[#16a34a]" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        <button
          className={`px-4 py-2 text-sm border-b-2 transition-all border-0 cursor-pointer ${usersTab === 'pending' ? 'border-b-2 border-[#27ab83] text-[#27ab83] font-semibold' : 'text-slate-500 hover:text-slate-700 font-medium'}`}
          type="button"
          onClick={() => setUsersTab('pending')}
        >
          {t(lang, 'adminUsersPendingTab')}
          {pendingAgentsCount > 0 && <span className="ml-2 bg-[#27ab83] text-white px-2 py-0.5 rounded-full text-xs font-bold">{pendingAgentsCount}</span>}
        </button>
        <button
          className={`px-4 py-2 text-sm border-b-2 transition-all border-0 cursor-pointer ${usersTab === 'all' ? 'border-b-2 border-[#27ab83] text-[#27ab83] font-semibold' : 'text-slate-500 hover:text-slate-700 font-medium'}`}
          type="button"
          onClick={() => setUsersTab('all')}
        >
          {t(lang, 'adminUsersAllTab')}
        </button>
      </div>

      {/* Filters */}
      {usersTab === 'all' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 mb-6 card-hover">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition" value={userFilters.search} onChange={e => setUserFilters(p => ({ ...p, search: e.target.value }))} placeholder={t(lang, 'adminUsersSearchPlaceholder')} />
            </div>
            <select className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition appearance-none cursor-pointer min-w-[150px]" value={userFilters.role} onChange={e => setUserFilters(p => ({ ...p, role: e.target.value }))}>
              <option value="">{t(lang, 'adminUsersFilterRole')}</option>
              <option value="agent">{t(lang, 'roleAgent')}</option>
              <option value="citizen">{t(lang, 'citizen')}</option>
              <option value="lecteur">{t(lang, 'roleLecteur')}</option>
              <option value="admin">{t(lang, 'roleAdmin')}</option>
            </select>
            <select className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition appearance-none cursor-pointer min-w-[150px]" value={userFilters.is_active} onChange={e => setUserFilters(p => ({ ...p, is_active: e.target.value }))}>
              <option value="">{t(lang, 'adminUsersFilterStatus')}</option>
              <option value="1">{t(lang, 'adminUsersActive')}</option>
              <option value="0">{t(lang, 'adminUsersInactive')}</option>
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      {agentUsersLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : usersTab === 'pending' && pendingAgents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100">
          <TeamApprovedIllustration />
          <h3 className="text-lg font-bold text-slate-800 mt-2">{t(lang, 'adminUsersNoPending')}</h3>
          <p className="text-sm text-slate-500 mt-1">{t(lang, 'adminUsersNoPendingSubtitle')}</p>
        </div>
      ) : usersTab === 'pending' ? (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden card-hover">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3">{t(lang, 'adminUsersNameCol')}</th>
                  <th className="text-left px-5 py-3">Username</th>
                  <th className="text-left px-5 py-3">{t(lang, 'adminUsersAllRole')}</th>
                  <th className="text-left px-5 py-3">{t(lang, 'adminUsersDateCol')}</th>
                  <th className="text-right px-5 py-3">{t(lang, 'adminUsersActionsCol')}</th>
                </tr>
              </thead>
              <tbody>
                {pendingAgents.map(user => (
                  <tr key={user.id} className="table-row border-b border-slate-50">
                    <td className="px-5 py-4 font-semibold text-sm text-slate-800">{user.full_name || '—'}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{user.username}</td>
                    <td className="px-5 py-4">
                      <span className={`role-badge ${roleBadges(lang)[user.role]?.className || `role-${user.role}`}`}>
                        {roleBadges(lang)[user.role]?.label || user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">{formatDate(user.created_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 inline-flex items-center gap-1.5 transition" type="button" onClick={() => handleApproveAgent(user.id)}>
                          <Check className="w-3.5 h-3.5" />
                          {t(lang, 'adminUsersApprove')}
                        </button>
                        <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 inline-flex items-center gap-1.5 transition" type="button" onClick={() => handleRejectAgent(user.id)}>
                          <X className="w-3.5 h-3.5" />
                          {t(lang, 'adminUsersReject')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden card-hover">
          <div className="px-5 py-3 border-b border-slate-100 text-sm text-slate-500">
            {usersTotal} {t(lang, 'adminUsersAllTab')}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3">{t(lang, 'adminUsersNameCol')}</th>
                  <th className="text-left px-5 py-3">Username</th>
                  <th className="text-left px-5 py-3">{t(lang, 'adminUsersAllRole')}</th>
                  <th className="text-left px-5 py-3">{t(lang, 'adminUsersAllStatut')}</th>
                  <th className="text-left px-5 py-3">{t(lang, 'adminUsersAllApprouvePar')}</th>
                  <th className="text-left px-5 py-3">{t(lang, 'adminUsersAllDemandes')}</th>
                  <th className="text-right px-5 py-3">{t(lang, 'adminUsersAllActions')}</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map(user => (
                  <tr key={user.id} className="table-row border-b border-slate-50">
                    <td className="px-5 py-4 font-semibold text-sm text-slate-800">{user.full_name || '—'}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{user.username}</td>
                    <td className="px-5 py-4">
                      <select className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition appearance-none cursor-pointer" value={user.role} onChange={e => handleChangeUserRole(user.id, e.target.value)}>
                        <option value="admin">{t(lang, 'roleAdmin')}</option>
                        <option value="agent">{t(lang, 'roleAgent')}</option>
                        <option value="lecteur">{t(lang, 'roleLecteur')}</option>
                        <option value="citizen">{t(lang, 'citizen')}</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge ${Number(user.is_active) === 1 ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                        {Number(user.is_active) === 1 ? t(lang, 'adminUsersActive') : t(lang, 'adminUsersInactive')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">{user.approved_by_name || '—'}</td>
                    <td className="px-5 py-4 text-sm text-slate-700 font-semibold">{user.total_demandes || 0}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex gap-1.5 justify-end flex-wrap">
                        {Number(user.is_active) === 0 && (
                          <button className="px-3 py-1.5 rounded-lg text-xs font-semibold btn-primary text-white inline-flex items-center gap-1" type="button" onClick={() => handleApproveAgent(user.id)}>
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition" type="button" onClick={() => handleToggleUser(user.id)}>
                          {Number(user.is_active) === 1 ? t(lang, 'adminUsersToggleDesactiver') : t(lang, 'adminUsersToggleActiver')}
                        </button>
                        <button className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition" type="button" onClick={() => setActivityUser(allUsers.find(u => Number(u.id) === Number(user.id)) || { id: user.id })}>
                          {isRtl ? 'السجل' : 'Activité'}
                        </button>
                        <button className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition" type="button" onClick={() => handleDeleteUser(user.id)}>
                          {t(lang, 'adminUsersSupprimer')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateEmployeeModal show={showCreateEmployee} onClose={() => { setShowCreateEmployee(false); setCreateEmployeeForm({ full_name: '', username: '', password: '', role: 'agent' }); }} onCreated={() => { setShowCreateEmployee(false); setCreateEmployeeForm({ full_name: '', username: '', password: '', role: 'agent' }); fetchAgentUsers(); }} lang={lang} isRtl={isRtl} />
      <ActivityHistoryModal user={activityUser} onClose={() => setActivityUser(null)} lang={lang} />
    </div>
  );
}
