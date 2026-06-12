import { useMemo, useState } from 'react';
import {
  Users,
  Briefcase,
  CheckCircle,
  Star,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Clock,
  Zap,
  Target,
  Award,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart2,
  UserCheck,
  XCircle,
  RefreshCw,
  ChevronRight,
  Flame,
  CircleDot,
  BadgeCheck,
  Inbox,
  LayoutGrid,
} from 'lucide-react';
import { Card, SkeletonStatCard } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { FunnelChart, LineChart, ScoreDistChart } from '../../components/charts';
import type { Candidate, Application, Job } from '../../types';
import {
  calculateDashboardStats,
  calculateFunnelData,
  calculateScoreDistribution,
  calculateTrendData,
  getTopCandidates,
  getRelativeTime,
  getStatusColor,
} from '../../utils/chart-utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardPageProps {
  candidates: Candidate[];
  applications: Application[];
  jobs: Job[];
  isLoading?: boolean;
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

type DateRange = '7d' | '30d' | '90d' | 'all';

// ─── Sub-components ──────────────────────────────────────────────────────────

function GrowthBadge({ value }: { value: number }) {
  if (value === 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
        <Minus className="w-3 h-3" /> Flat
      </span>
    );
  const pos = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
        pos ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
      }`}
    >
      {pos ? (
        <ArrowUpRight className="w-3 h-3" />
      ) : (
        <ArrowDownRight className="w-3 h-3" />
      )}
      {pos ? '+' : ''}
      {value}%
    </span>
  );
}

function MiniBar({
  value,
  max,
  color = 'bg-blue-500',
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5">
      <div
        className={`${color} h-1.5 rounded-full transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    applied: 'bg-blue-400',
    shortlisted: 'bg-yellow-400',
    interviewed: 'bg-purple-400',
    hired: 'bg-emerald-500',
    rejected: 'bg-red-400',
    under_review: 'bg-orange-400',
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
        map[status] ?? 'bg-gray-300'
      }`}
    />
  );
}

function SectionHeader({
  title,
  sub,
  action,
  onAction,
  icon,
}: {
  title: string;
  sub?: string;
  action?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-400">{icon}</span>}
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
      </div>
      {action && (
        <button
          onClick={onAction}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1"
        >
          {action} <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DashboardPage({
  candidates,
  applications,
  jobs,
  isLoading = false,
  onNavigate,
}: DashboardPageProps) {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [deptFilter, setDeptFilter] = useState('');
  const [jobFilter, setJobFilter] = useState('');

  // ── Filtered data ──────────────────────────────────────────────────────────

  const filteredApplications = useMemo(() => {
    let result = applications;
    if (dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 86400000);
      result = result.filter((a) => new Date(a.application_date) >= cutoff);
    }
    if (jobFilter)
      result = result.filter((a) => a.job_id === parseInt(jobFilter));
    return result;
  }, [applications, dateRange, jobFilter]);

  // ── Chart & summary data ───────────────────────────────────────────────────

  const stats = useMemo(
    () => calculateDashboardStats(jobs, filteredApplications, candidates),
    [jobs, filteredApplications, candidates]
  );
  const funnelData = useMemo(
    () => calculateFunnelData(candidates, applications),
    [candidates, applications]
  );
  const scoreDist = useMemo(
    () => calculateScoreDistribution(candidates),
    [candidates]
  );
  const trendData = useMemo(
    () => calculateTrendData(filteredApplications),
    [filteredApplications]
  );
  const topCandidates = useMemo(
    () => getTopCandidates(candidates, 8),
    [candidates]
  );

  const recentApplications = useMemo(
    () =>
      [...filteredApplications]
        .sort(
          (a, b) =>
            new Date(b.application_date).getTime() -
            new Date(a.application_date).getTime()
        )
        .slice(0, 6)
        .map((app) => ({
          ...app,
          candidate: candidates.find(
            (c) => c.candidate_id === app.candidate_id
          ),
          job: jobs.find((j) => j.job_id === app.job_id),
        })),
    [filteredApplications, candidates, jobs]
  );

  const departments = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.department || 'General'))),
    [jobs]
  );

  // ── NEW: Conversion rates ──────────────────────────────────────────────────

  const conversion = useMemo(() => {
    const total = applications.length || 1;
    const shortlisted = filteredApplications.filter(
      (a) => a.status === 'shortlisted'
    ).length;
    const interviewed = filteredApplications.filter(
      (a) => a.status === 'interviewed'
    ).length;
    const hired = filteredApplications.filter(
      (a) => a.status === 'hired'
    ).length;
    return {
      toShortlist: Math.round((shortlisted / total) * 100),
      toInterview:
        shortlisted > 0 ? Math.round((interviewed / shortlisted) * 100) : 0,
      toHire:
        interviewed > 0 ? Math.round((hired / interviewed) * 100) : 0,
      overall: Math.round((hired / total) * 100),
    };
  }, [filteredApplications]);

  // ── NEW: App velocity (last 7d vs prior 7d) ────────────────────────────────

  const velocity = useMemo(() => {
    const now = Date.now();
    const week1 = applications.filter(
      (a) => now - new Date(a.application_date).getTime() <= 7 * 86400000
    ).length;
    const week2 = applications.filter((a) => {
      const age = now - new Date(a.application_date).getTime();
      return age > 7 * 86400000 && age <= 14 * 86400000;
    }).length;
    const delta =
      week2 > 0 ? Math.round(((week1 - week2) / week2) * 100) : week1 > 0 ? 100 : 0;
    return { week1, delta };
  }, [applications]);

  // ── NEW: Per-department summary ────────────────────────────────────────────

  const deptSummary = useMemo(() => {
    const map: Record<
      string,
      { apps: number; hired: number; open: number }
    > = {};
    jobs.forEach((j) => {
      const d = j.department || 'General';
      if (!map[d]) map[d] = { apps: 0, hired: 0, open: 0 };
      if (j.status === 'open') map[d].open++;
    });
    filteredApplications.forEach((a) => {
      const job = jobs.find((j) => j.job_id === a.job_id);
      const d = job?.department || 'General';
      if (!map[d]) map[d] = { apps: 0, hired: 0, open: 0 };
      map[d].apps++;
      if (a.status === 'hired') map[d].hired++;
    });
    return Object.entries(map)
      .map(([dept, v]) => ({
        dept,
        ...v,
        convRate: v.apps > 0 ? Math.round((v.hired / v.apps) * 100) : 0,
      }))
      .sort((a, b) => b.apps - a.apps)
      .slice(0, 5);
  }, [jobs, filteredApplications]);

  const maxDeptApps = Math.max(...deptSummary.map((d) => d.apps), 1);

  // ── NEW: Stage-count badges ────────────────────────────────────────────────

  const stageCounts = useMemo(() => {
    const count = (s: string) =>
      filteredApplications.filter((a) => a.status === s).length;
    return [
      { label: 'Applied', count: count('applied'), color: 'bg-blue-400', text: 'text-blue-700', bg: 'bg-blue-50' },
      { label: 'Reviewing', count: count('under_review'), color: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50' },
      { label: 'Shortlisted', count: count('shortlisted'), color: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50' },
      { label: 'Interviewed', count: count('interviewed'), color: 'bg-purple-400', text: 'text-purple-700', bg: 'bg-purple-50' },
      { label: 'Hired', count: count('hired'), color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
      { label: 'Rejected', count: count('rejected'), color: 'bg-red-400', text: 'text-red-700', bg: 'bg-red-50' },
    ];
  }, [filteredApplications]);

  // ── NEW: Smart alerts ──────────────────────────────────────────────────────

  const alerts = useMemo(() => {
    const list: { type: 'warn' | 'info' | 'danger'; msg: string }[] = [];
    const pending = filteredApplications.filter(
      (a) => a.status === 'applied' || a.status === 'under_review'
    ).length;
    if (pending > 10)
      list.push({
        type: 'warn',
        msg: `${pending} applications are pending review. Consider scheduling a screening session.`,
      });
    if (stats.interviewsScheduled === 0 && stats.shortlistedCount > 0)
      list.push({
        type: 'info',
        msg: `${stats.shortlistedCount} shortlisted candidates have no interview scheduled yet.`,
      });
    if (conversion.overall < 5 && filteredApplications.length > 10)
      list.push({
        type: 'danger',
        msg: `Overall conversion is ${conversion.overall}%. Review hiring criteria or JD alignment.`,
      });
    if (jobs.filter((j) => j.status === 'open').length === 0)
      list.push({ type: 'info', msg: 'No open roles. Post a new job to keep the pipeline active.' });
    return list;
  }, [filteredApplications, stats, conversion, jobs]);

  // ── Stat cards config ──────────────────────────────────────────────────────

  const statCards = [
    {
      title: 'TOTAL JOBS',
      value: stats.totalJobs,
      icon: <Briefcase className="w-5 h-5" />,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      growth: 4,
      label: 'Active job postings',
      accent: 'border-l-slate-400',
    },
    {
      title: 'TOTAL APPLICATIONS',
      value: stats.totalApplications,
      icon: <Users className="w-5 h-5" />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      growth: 12,
      label: 'Submitted applications',
      accent: 'border-l-blue-400',
    },
    {
      title: 'AVERAGE SCORE',
      value: `${stats.averageScore}%`,
      icon: <Star className="w-5 h-5" />,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      growth: 2.6,
      label: 'Assessment quality',
      accent: 'border-l-emerald-400',
    },
    {
      title: 'HIRED COUNT',
      value: stats.hiredCount,
      icon: <CheckCircle className="w-5 h-5" />,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      growth: 9,
      label: 'YTD hires',
      accent: 'border-l-purple-400',
    },
  ];

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50 min-h-full space-y-6">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Hiring Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time snapshot of your recruitment pipeline
          </p>
        </div>
        <Button
          variant="secondary"
          leftIcon={<Download className="w-4 h-4" />}
          className="!bg-[#1a1f36] !text-white !border-[#1a1f36] hover:!bg-[#252b47] self-start sm:self-auto"
        >
          Export PDF
        </Button>
      </div>

      {/* ── Filters bar ── */}
      <Card padding="md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Dashboard filters
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Slice data by time, department, or role.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {[
              {
                label: 'Date Range',
                value: dateRange,
                onChange: (v: string) => setDateRange(v as DateRange),
                options: [
                  { value: '7d', label: 'Last 7 days' },
                  { value: '30d', label: 'Last 30 days' },
                  { value: '90d', label: 'Last 90 days' },
                  { value: 'all', label: 'All time' },
                ],
              },
              {
                label: 'Department',
                value: deptFilter,
                onChange: (v: string) => setDeptFilter(v),
                options: [
                  { value: '', label: 'All Departments' },
                  ...departments.map((d) => ({ value: d, label: d })),
                ],
              },
              {
                label: 'Job',
                value: jobFilter,
                onChange: (v: string) => setJobFilter(v),
                options: [
                  { value: '', label: 'All Jobs' },
                  ...jobs.map((j) => ({
                    value: String(j.job_id),
                    label: j.role,
                  })),
                ],
              },
            ].map(({ label, value, onChange, options }) => (
              <div key={label} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">
                  {label}
                </label>
                <select
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[130px]"
                >
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── KPI stat cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <Card
              key={i}
              padding="md"
              className={`border-l-4 ${card.accent}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-10 h-10 rounded-full ${card.iconBg} flex items-center justify-center`}
                >
                  <span className={card.iconColor}>{card.icon}</span>
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
                {card.title}
              </p>
              <p className="text-3xl font-bold text-gray-900 mb-3">
                {card.value}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <GrowthBadge value={card.growth} />
                <span className="text-xs text-gray-500">{card.label}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── NEW: Extended KPI strip (velocity, time-to-hire, conversion, fill rate) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="md" className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              App Velocity
            </span>
            <Zap className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {velocity.week1}
            <span className="text-sm font-normal text-gray-400 ml-1">/ 7d</span>
          </p>
          <GrowthBadge value={velocity.delta} />
        </Card>

        <Card padding="md" className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Interviews Sched.
            </span>
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.interviewsScheduled}
          </p>
          <p className="text-xs text-gray-400">Upcoming sessions</p>
        </Card>

        <Card padding="md" className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Offers Sent
            </span>
            <BadgeCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.offersSent ?? 0}
          </p>
          <p className="text-xs text-gray-400">Awaiting response</p>
        </Card>

        <Card padding="md" className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Overall Conv.
            </span>
            <Target className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {conversion.overall}%
          </p>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
            <div
              className="bg-blue-500 h-1.5 rounded-full"
              style={{ width: `${conversion.overall}%` }}
            />
          </div>
        </Card>
      </div>

      {/* ── NEW: Pipeline stage strip ── */}
      <Card padding="md">
        <SectionHeader
          title="Pipeline Stages"
          sub="Count of candidates at each recruitment stage"
          icon={<LayoutGrid className="w-4 h-4" />}
          action="Full pipeline"
          onAction={() => onNavigate('pipeline')}
        />
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {stageCounts.map(({ label, count, color, text, bg }) => (
            <div
              key={label}
              className={`${bg} rounded-xl p-3 text-center`}
            >
              <div className={`inline-block w-2.5 h-2.5 rounded-full ${color} mb-2`} />
              <p className={`text-xl font-bold ${text}`}>{count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="lg">
          <SectionHeader
            title="Hiring Funnel"
            sub="Pipeline conversion across recruitment stages"
            action="Live insights"
            onAction={() => onNavigate('pipeline')}
          />
          {filteredApplications.length > 0 ? (
            <FunnelChart data={funnelData} />
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">
              No applications in this period
            </div>
          )}
        </Card>

        <Card padding="lg">
          <SectionHeader
            title="Score Distribution"
            sub="Quality spread of candidate assessments"
            action="View analytics"
            onAction={() => onNavigate('analytics')}
          />
          {candidates.length > 0 ? (
            <ScoreDistChart data={scoreDist} />
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">
              No candidate data yet
            </div>
          )}
        </Card>
      </div>

      {/* ── Trend Chart ── */}
      <Card padding="lg">
        <SectionHeader
          title="Application Trends"
          sub="Daily applications and hires over time"
        />
        {trendData.length > 0 ? (
          <LineChart data={trendData} height={220} />
        ) : (
          <div className="h-48 flex items-center justify-center text-sm text-gray-400">
            No trend data available
          </div>
        )}
      </Card>

      {/* ── NEW: Conversion funnel metrics ── */}
      <Card padding="lg">
        <SectionHeader
          title="Stage Conversion Rates"
          sub="How candidates move through each step"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            {
              label: 'Applied → Shortlisted',
              value: conversion.toShortlist,
              color: 'text-blue-600',
              bar: 'bg-blue-500',
            },
            {
              label: 'Shortlist → Interview',
              value: conversion.toInterview,
              color: 'text-purple-600',
              bar: 'bg-purple-500',
            },
            {
              label: 'Interview → Hire',
              value: conversion.toHire,
              color: 'text-orange-600',
              bar: 'bg-orange-500',
            },
            {
              label: 'Overall Conversion',
              value: conversion.overall,
              color: 'text-emerald-600',
              bar: 'bg-emerald-500',
            },
          ].map(({ label, value, color, bar }) => (
            <div key={label} className="text-center">
              <p className={`text-3xl font-bold ${color}`}>{value}%</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                <div
                  className={`${bar} h-1.5 rounded-full transition-all duration-700`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Bottom main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Top candidates table */}
        <Card padding="none" className="lg:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <SectionHeader
              title="Top Candidates"
              sub="Highest-scoring applicants across all roles"
              action="Review all"
              onAction={() => onNavigate('candidates')}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Skills
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topCandidates.length > 0 ? (
                  topCandidates.map((candidate) => (
                    <tr
                      key={candidate.candidate_id}
                      onClick={() =>
                        onNavigate('candidate-detail', {
                          id: candidate.candidate_id,
                        })
                      }
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#1a1f36] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {candidate.name
                              .split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {candidate.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-blue-600">
                        {candidate.email}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                        {candidate.skills
                          .split(',')
                          .slice(0, 3)
                          .map((s: string) => s.trim())
                          .join(', ')}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            (candidate.score || 0) >= 80
                              ? 'bg-emerald-50 text-emerald-700'
                              : (candidate.score || 0) >= 60
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {candidate.score || 0}%
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-8 text-center text-sm text-gray-400"
                    >
                      No candidates yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right column */}
        <div className="space-y-5">

          {/* Activity summary */}
          <Card padding="lg">
            <SectionHeader
              title="Activity Summary"
              sub="Recruitment health and next steps"
              icon={<BarChart2 className="w-4 h-4" />}
            />
            <div className="space-y-3">
              {[
                {
                  label: 'Scheduled interviews',
                  value: stats.interviewsScheduled,
                  sub: 'Across all open roles',
                  icon: <Calendar className="w-4 h-4 text-purple-500" />,
                  bg: 'bg-purple-50',
                },
                {
                  label: 'Shortlisted candidates',
                  value: stats.shortlistedCount,
                  sub: 'Pending review',
                  icon: <Star className="w-4 h-4 text-yellow-500" />,
                  bg: 'bg-yellow-50',
                },
                {
                  label: 'Offers sent',
                  value: stats.offersSent ?? 0,
                  sub: 'Awaiting response',
                  icon: <BadgeCheck className="w-4 h-4 text-emerald-500" />,
                  bg: 'bg-emerald-50',
                },
              ].map(({ label, value, sub, icon, bg }) => (
                <div
                  key={label}
                  className={`${bg} rounded-xl p-3 flex items-center gap-3`}
                >
                  <div className="flex-shrink-0">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-xl font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-400">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent activity feed */}
          <Card padding="lg">
            <SectionHeader
              title="Recent Activity"
              sub="Latest application updates"
              icon={<Inbox className="w-4 h-4" />}
            />
            <div className="space-y-3">
              {recentApplications.length > 0 ? (
                recentApplications.map((app) => (
                  <div
                    key={app.application_id}
                    className="flex items-start gap-3"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        app.status === 'hired'
                          ? 'bg-emerald-100'
                          : app.status === 'rejected'
                          ? 'bg-red-100'
                          : app.status === 'interviewed'
                          ? 'bg-purple-100'
                          : 'bg-blue-100'
                      }`}
                    >
                      {app.status === 'hired' ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      ) : app.status === 'rejected' ? (
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                      ) : app.status === 'interviewed' ? (
                        <Calendar className="w-3.5 h-3.5 text-purple-600" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {app.candidate?.name || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StatusDot status={app.status} />
                        <p className="text-xs text-gray-500 truncate capitalize">
                          {app.status.replace('_', ' ')} ·{' '}
                          {app.job?.role || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {getRelativeTime(app.application_date)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── NEW: Department breakdown table ── */}
      <Card padding="lg">
        <SectionHeader
          title="Department Breakdown"
          sub="Application volume, hires, and conversion by department"
          icon={<Users className="w-4 h-4" />}
          action="View analytics"
          onAction={() => onNavigate('analytics')}
        />
        {deptSummary.length > 0 ? (
          <div className="space-y-3">
            {deptSummary.map(({ dept, apps, hired, open, convRate }) => (
              <div key={dept} className="flex items-center gap-4">
                <div className="w-28 flex-shrink-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {dept}
                  </p>
                  <p className="text-xs text-gray-400">{open} open role{open !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex-1">
                  <MiniBar value={apps} max={maxDeptApps} color="bg-blue-400" />
                </div>
                <div className="w-16 text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {apps}
                  </p>
                  <p className="text-xs text-gray-400">apps</p>
                </div>
                <div className="w-16 text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-emerald-600">
                    {hired}
                  </p>
                  <p className="text-xs text-gray-400">hired</p>
                </div>
                <div className="w-16 text-right flex-shrink-0">
                  <span
                    className={`text-xs font-bold ${
                      convRate >= 20
                        ? 'text-emerald-600'
                        : convRate >= 10
                        ? 'text-yellow-600'
                        : 'text-red-500'
                    }`}
                  >
                    {convRate}%
                  </span>
                  <p className="text-xs text-gray-400">conv.</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No department data available.</p>
        )}
      </Card>

      {/* ── NEW: Smart alerts panel ── */}
      {alerts.length > 0 && (
        <Card padding="lg">
          <SectionHeader
            title="Attention Needed"
            sub="Items that may require your action"
            icon={<AlertCircle className="w-4 h-4 text-yellow-500" />}
          />
          <div className="space-y-2">
            {alerts.map(({ type, msg }, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  type === 'warn'
                    ? 'bg-yellow-50 border-yellow-200'
                    : type === 'danger'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                {type === 'warn' ? (
                  <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                ) : type === 'danger' ? (
                  <TrendingDown className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <CircleDot className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                )}
                <p
                  className={`text-sm ${
                    type === 'warn'
                      ? 'text-yellow-800'
                      : type === 'danger'
                      ? 'text-red-800'
                      : 'text-blue-800'
                  }`}
                >
                  {msg}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Open roles quick view ── */}
      {jobs.filter((j) => j.status === 'open').length > 0 && (
        <Card padding="lg">
          <SectionHeader
            title="Open Roles"
            sub="Currently accepting applications"
            icon={<Briefcase className="w-4 h-4" />}
            action="Manage jobs"
            onAction={() => onNavigate('jobs')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {jobs
              .filter((j) => j.status === 'open')
              .slice(0, 6)
              .map((job) => {
                const appCount = filteredApplications.filter(
                  (a) => a.job_id === job.job_id
                ).length;
                return (
                  <div
                    key={job.job_id}
                    onClick={() =>
                      onNavigate('job-detail', { id: job.job_id })
                    }
                    className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#1a1f36] flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {job.role}
                      </p>
                      <p className="text-xs text-gray-500">
                        {job.department || 'General'}
                      </p>
                      <p className="text-xs text-blue-600 mt-1 font-medium">
                        {appCount} applicant{appCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* ── Empty / Welcome state ── */}
      {candidates.length === 0 && jobs.length === 0 && !isLoading && (
        <Card padding="lg">
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Welcome to HireAI Copilot
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              Start by creating your first job posting and adding candidates to
              begin your hiring journey.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={() => onNavigate('jobs')}>
                Create Job
              </Button>
              <Button onClick={() => onNavigate('candidates')}>
                Add Candidate
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}