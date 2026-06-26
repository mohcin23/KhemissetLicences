import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import {
  ClipboardList, CheckCircle2, Clock, Users, FileText,
  AlertTriangle, Download, Building2, Activity
} from 'lucide-react';
import { t } from '../../i18n/translations';
import { adminAPI, pdfAPI } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { CHART_COLORS } from '../../utils/appConstants';
import { PageShell, Card, Button, Avatar, EmptyState, FullPageLoader } from '../../components/ui';

function MiniSparkline({ data, height = 32 }) {
  if (!data || data.length < 2) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <Area type="monotone" dataKey="v" stroke="#10B981" strokeWidth={1.5} fill="#10B981" fillOpacity={0.08} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function TrendPill({ value, previous }) {
  const cur = Number(value || 0);
  const prev = Number(previous || 0);
  if (prev === 0 && cur === 0) return null;
  if (prev === 0 && cur > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
        Nouveau &uarr;
      </span>
    );
  }
  if (prev > 0 && cur === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
        Aucune donn&eacute;e
      </span>
    );
  }
  const percent = Math.round(((cur - prev) / prev) * 100);
  if (percent === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
        Stable &rarr;
      </span>
    );
  }
  if (percent > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
        &uarr; +{percent}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
      &darr; {percent}%
    </span>
  );
}

export default function AdminDashboard() {
  const { lang, isRtl } = useLanguage();
  const { authUser } = useAuth();
  const { showToast } = useToast();

  const [stats, setStats] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [pdfLoading, setPdfLoading] = useState({});
  const [loading, setLoading] = useState(true);

  const realtimeStats = useMemo(() => {
    try { return localStorage.getItem('admin_realtime_stats') !== 'false'; } catch { return true; }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10);
      const [overviewRes, byCommuneRes, byAgentRes, timelineRes] = await Promise.allSettled([
        adminAPI.getStatsOverview(),
        adminAPI.getStatsByCommune(),
        adminAPI.getStatsByAgent(),
        adminAPI.getStatsTimeline({ from, group_by: 'month' })
      ]);
      const overview = overviewRes.status === 'fulfilled' ? (overviewRes.value.data.data || {}) : {};
      setStats({
        ...overview,
        total: overview.total_demandes || 0,
        approuves: overview.approuvees || 0,
        rejetes: overview.rejetees || 0,
        en_attente: overview.en_attente || 0,
        fichiers_rejetes: overview.fichiers_rejetes || 0,
        by_commune: byCommuneRes.status === 'fulfilled' ? (byCommuneRes.value.data.data || []) : [],
        by_agent: byAgentRes.status === 'fulfilled' ? (byAgentRes.value.data.data || []) : [],
      });
      const rows = timelineRes.status === 'fulfilled' ? (timelineRes.value.data.data || []) : [];
      setMonthlyStats(rows.map(row => ({
        ...row,
        label: row.date?.length === 7
          ? new Date(`${row.date}-01`).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { month: 'short', year: '2-digit' })
          : row.date
      })));
    } catch {
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (!realtimeStats) return;
    const timer = setInterval(fetchStats, 30000);
    return () => clearInterval(timer);
  }, [fetchStats, realtimeStats]);

  const handleRapportPdf = async () => {
    setPdfLoading(p => ({ ...p, rapport: true }));
    try {
      await pdfAPI.downloadRapportMensuel(reportMonth, reportYear);
    } catch {
      showToast(isRtl ? 'خطأ في تقرير PDF' : 'Erreur lors de la génération du rapport', 'error');
    }
    setPdfLoading(p => { const n = { ...p }; delete n.rapport; return n; });
  };

  const statusChartData = stats ? [
    { name: t(lang, 'approved'), value: Number(stats.approuves || 0), color: '#10B981' },
    { name: t(lang, 'pending'), value: Number(stats.en_attente || 0), color: '#F59E0B' },
    { name: t(lang, 'dashboardFichierRejete'), value: Number(stats.fichiers_rejetes || 0), color: '#F97316' },
    { name: t(lang, 'rejected'), value: Number(stats.rejetes || 0), color: '#EF4444' }
  ] : [];

  const rateOf = (row, key) => {
    const total = Number(row?.total || 0);
    return total > 0 ? Math.round((Number(row?.[key] || 0) / total) * 100) : 0;
  };

  const latestMonthStats = monthlyStats[monthlyStats.length - 1] || {};
  const previousMonthStats = monthlyStats[monthlyStats.length - 2] || {};

  const rejectRate = stats?.total
    ? `${Math.round((stats.rejetes / stats.total) * 100)}%`
    : '0%';

  const kpiCards = [
    {
      label: t(lang, 'totalRequests'),
      value: stats?.total || 0,
      icon: ClipboardList,
      color: '#10B981',
      sparkData: monthlyStats.slice(-6).map((m) => ({ v: m.total || 0 })),
      trend: { value: latestMonthStats.total, previous: previousMonthStats.total },
    },
    {
      label: t(lang, 'kpiThisWeek'),
      value: stats?.demandes_ce_semaine || 0,
      icon: FileText,
      color: '#3B82F6',
      sparkData: null,
    },
    {
      label: t(lang, 'kpiAcceptRate'),
      value: stats?.taux_approbation || '0%',
      icon: CheckCircle2,
      color: '#10B981',
      sparkData: monthlyStats.slice(-6).map((m) => ({ v: rateOf(m, 'approuvees') })),
      trend: { value: rateOf(latestMonthStats, 'approuvees'), previous: rateOf(previousMonthStats, 'approuvees') },
    },
    {
      label: t(lang, 'kpiRejectRate'),
      value: rejectRate,
      icon: AlertTriangle,
      color: '#EF4444',
      sparkData: monthlyStats.slice(-6).map((m) => ({ v: rateOf(m, 'rejetees') })),
      trend: { value: rateOf(latestMonthStats, 'rejetees'), previous: rateOf(previousMonthStats, 'rejetees') },
    },
    {
      label: t(lang, 'kpiAvgTime'),
      value: stats?.temps_moyen_traitement_heures != null ? `${stats.temps_moyen_traitement_heures}h` : '\u2014',
      icon: Clock,
      color: '#F59E0B',
      sparkData: monthlyStats.slice(-6).map((m) => ({ v: m.temps_moyen || 0 })),
    },
    {
      label: t(lang, 'dashboardActiveAgents'),
      value: stats?.total_agents || 0,
      icon: Users,
      color: '#8B5CF6',
      sparkData: null,
    },
  ];

  if (loading) return <FullPageLoader />;

  const tooltipStyle = {
    borderRadius: 12,
    border: '1px solid var(--gov-border)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    fontSize: 13,
    padding: '8px 12px',
    background: 'var(--gov-surface)',
    color: 'var(--gov-text)',
  };

  return (
    <PageShell
      kicker={isRtl ? 'لوحة القيادة' : 'Tableau de bord'}
      title={isRtl ? `مرحباً، ${authUser?.full_name || authUser?.username}` : `Bonjour, ${authUser?.full_name || authUser?.username}`}
      description={
        new Date().toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        + ' \u2014 ' + (isRtl ? 'نظرة عامة على النشاط' : "Vue d'ensemble de l'activité")
      }
      actions={
        <div className="flex items-center gap-2 flex-shrink-0 max-md:w-full max-md:flex-wrap">
          <select
            className="h-10 px-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 outline-none cursor-pointer transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            value={reportMonth}
            onChange={e => setReportMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>
                {new Date(2024, m - 1, 1).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { month: 'long' })}
              </option>
            ))}
          </select>
          <input
            className="h-10 w-[90px] px-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            type="number"
            min="2000"
            max="2100"
            value={reportYear}
            onChange={e => setReportYear(Number(e.target.value))}
          />
          <Button
            variant="accent"
            size="md"
            icon={Download}
            onClick={handleRapportPdf}
            disabled={pdfLoading.rapport}
            loading={pdfLoading.rapport}
            className="rounded-full"
          >
            {isRtl ? 'تقرير شهري' : 'Rapport mensuel'}
          </Button>
        </div>
      }
    >
      {/* KPI Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6 max-md:grid-cols-2 max-[480px]:grid-cols-1">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="stat-card-uniform"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5" style={{ color: card.color }} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{card.label}</span>
                </div>
                {card.trend && (
                  <TrendPill value={card.trend.value} previous={card.trend.previous} />
                )}
              </div>
              <p className="text-[2.5rem] font-extrabold text-slate-900 dark:text-slate-100 tabular-nums tracking-tight leading-none mb-2">
                {card.value}
              </p>
              {card.sparkData && (
                <div className="mt-1 -mx-1">
                  <MiniSparkline data={card.sparkData} height={28} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts Row 1: Bar + Pie */}
      <div className="grid grid-cols-2 gap-6 mb-6 max-md:grid-cols-1">
        <Card className="p-6">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500 mb-1">
            {isRtl ? 'طلبات حسب الشهر' : 'Demandes par mois'}
          </h3>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-5">
            {isRtl ? 'التوزيع الشهري للملفات' : 'Répartition mensuelle des dossiers'}
          </p>
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyStats} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gov-grid)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--gov-text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--gov-text-secondary)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'rgba(16,185,129,0.05)' }}
                />
                <Bar dataKey="total" name={t(lang, 'totalRequests')} fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500 mb-1">
            {isRtl ? 'توزيع حسب الحالة' : 'Répartition par statut'}
          </h3>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-5">
            {isRtl ? 'حالات الملفات الحالية' : 'État actuel des dossiers'}
          </p>
          <div className="w-full h-[280px] flex items-center gap-4">
            <div className="relative flex-shrink-0" style={{ width: '60%' }}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {statusChartData.map((entry, idx) => (
                      <Cell key={entry.name} fill={entry.color || CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginTop: '-10px' }}>
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{stats?.total || 0}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{isRtl ? 'إجمالي' : 'Total'}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 flex-1">
              {statusChartData.filter(d => d.value > 0).map((entry) => (
                <div key={entry.name} className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm text-slate-600 dark:text-slate-400 flex-1">{entry.name}</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">{entry.value}</span>
                </div>
              ))}
              {statusChartData.filter(d => d.value > 0).length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">{isRtl ? 'لا توجد بيانات' : 'Aucune donnée'}</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Tables: Communes + Agent Performance */}
      <div className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t(lang, 'dashboardTopCommunes')}</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {isRtl ? 'أكثر الجماعات نشاطاً' : 'Communes les plus actives'}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    {t(lang, 'reportsCommuneCol')}
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    {t(lang, 'reportsCercleCol')}
                  </th>
                  <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    {t(lang, 'reportsTotalCol')}
                  </th>
                  <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    {t(lang, 'reportsApprouveesCol')}
                  </th>
                  <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    {t(lang, 'reportsTauxCol')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(stats?.by_commune || []).slice(0, 8).map(row => (
                  <tr key={`${row.commune}-${row.cercle}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 font-semibold text-slate-900 dark:text-slate-100">
                      {row.commune}
                    </td>
                    <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 text-slate-500 dark:text-slate-400">
                      {row.cercle}
                    </td>
                    <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 text-center font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      {row.total}
                    </td>
                    <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 text-center font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {row.approuvees}
                    </td>
                    <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold tabular-nums">
                        {row.taux_approbation}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
              <Activity className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t(lang, 'dashboardAgentPerf')}</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {isRtl ? 'أداء الأعوان في معالجة الملفات' : 'Performance des agents sur les dossiers'}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    {t(lang, 'dashboardAgentCol')}
                  </th>
                  <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    {t(lang, 'dashboardTraiteesCol')}
                  </th>
                  <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    {t(lang, 'reportsApprouveesCol')}
                  </th>
                  <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    {t(lang, 'reportsRejeteesCol')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(stats?.by_agent || []).map(agent => (
                  <tr key={agent.agent_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={agent.full_name || agent.username} size="sm" />
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{agent.full_name || agent.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 text-center font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      {agent.total_traitees || 0}
                    </td>
                    <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 text-center font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {agent.approuvees || 0}
                    </td>
                    <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 text-center font-bold text-red-500 dark:text-red-400 tabular-nums">
                      {agent.rejetees || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
