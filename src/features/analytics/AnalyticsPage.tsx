import { useState, useMemo } from 'react';
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  Star,
  CheckCircle,
  Clock,
  AlertCircle,
  Target,
  Award,
  Activity,
  BarChart2,
  Zap,
  UserCheck,
  XCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Search,
  ChevronUp,
  ChevronDown,
  Layers,
  Percent,
  Gauge,
  Sparkles,
  Compass,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Select, Input } from '../../components/ui/input';
import { Card, StatCard } from '../../components/ui/card';
import {
  FunnelChart,
  ScoreDistChart,
  LineChart,
  Heatmap,
  DeptChart,
} from '../../components/charts';
import type { Candidate, Application, Job } from '../../types';
import {
  calculateDashboardStats,
  calculateFunnelData,
  calculateScoreDistribution,
  calculateTrendData,
  calculateDepartmentData,
  calculateSkillGap,
} from '../../utils/chart-utils';

interface AnalyticsPageProps {
  candidates: Candidate[];
  applications: Application[];
  jobs: Job[];
  isLoading: boolean;
  onExport?: (type: string) => void;
}

type DateRange = '7d' | '30d' | '90d' | '1y' | 'all';
type JobSortKey =
  | 'applicants'
  | 'shortlisted'
  | 'interviewed'
  | 'hired'
  | 'convRate'
  | 'avgScore';

const RANGE_DAYS: Record<DateRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
  all: 3650,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function Trend({ value, suffix = '' }: { value: number; suffix?: string }) {
  if (value === 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-gray-400">
        <Minus className="w-3 h-3" /> Flat{suffix}
      </span>
    );
  const up = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        up ? 'text-emerald-600' : 'text-red-500'
      }`}
    >
      {up ? (
        <ArrowUpRight className="w-3 h-3" />
      ) : (
        <ArrowDownRight className="w-3 h-3" />
      )}
      {Math.abs(value)}%{suffix}
    </span>
  );
}

function GaugeBar({
  value,
  color = 'bg-blue-500',
}: {
  value: number;
  color?: string;
}) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
      <div
        className={`${color} h-2 rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: JobSortKey;
  activeKey: JobSortKey;
  dir: 'asc' | 'desc';
  onSort: (key: JobSortKey) => void;
}) {
  const active = activeKey === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          dir === 'asc' ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )
        ) : (
          <span className="w-3 h-3" />
        )}
      </span>
    </th>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AnalyticsPage({
  candidates,
  applications,
  jobs,
  isLoading,
  onExport,
}: AnalyticsPageProps) {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [sortKey, setSortKey] = useState<JobSortKey>('applicants');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: JobSortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  // ── Filtered data ──────────────────────────────────────────────────────────

  const filteredApplications = useMemo(() => {
    if (dateRange === 'all') return applications;
    const now = new Date();
    const cutoff = new Date(
      now.getTime() - RANGE_DAYS[dateRange] * 24 * 60 * 60 * 1000
    );
    return applications.filter(
      (app) => new Date(app.application_date) >= cutoff
    );
  }, [applications, dateRange]);

  const finalApplications = useMemo(() => {
    if (!departmentFilter) return filteredApplications;
    const deptJobIds = jobs
      .filter((j) => (j.department || 'General') === departmentFilter)
      .map((j) => j.job_id);
    return filteredApplications.filter((app) =>
      deptJobIds.includes(app.job_id)
    );
  }, [filteredApplications, jobs, departmentFilter]);

  // ── Chart data ─────────────────────────────────────────────────────────────

  const stats = useMemo(
    () => calculateDashboardStats(jobs, finalApplications, candidates),
    [jobs, finalApplications, candidates]
  );
  const funnelData = useMemo(
    () => calculateFunnelData(candidates, applications),
    [applications, candidates]
  );
  const scoreDistribution = useMemo(
    () => calculateScoreDistribution(candidates),
    [candidates]
  );
  const trendData = useMemo(
    () => calculateTrendData(finalApplications),
    [finalApplications]
  );
  const departmentData = useMemo(
    () => calculateDepartmentData(jobs, finalApplications),
    [jobs, finalApplications]
  );
  const skillGap = useMemo(
    () => calculateSkillGap(jobs, candidates),
    [jobs, candidates]
  );

  // ── Status counts (single source of truth) ─────────────────────────────────

  const statusCounts = useMemo(
    () => ({
      total: finalApplications.length || 0,
      shortlisted: finalApplications.filter((a) => a.status === 'shortlisted')
        .length,
      interviewed: finalApplications.filter((a) => a.status === 'interviewed')
        .length,
      hired: finalApplications.filter((a) => a.status === 'hired').length,
      rejected: finalApplications.filter((a) => a.status === 'rejected')
        .length,
    }),
    [finalApplications]
  );

  // ── Conversion rates ───────────────────────────────────────────────────────

  const conversionRates = useMemo(() => {
    const total = statusCounts.total || 1;
    const { shortlisted, interviewed, hired, rejected } = statusCounts;

    return {
      appliedToShortlist: Math.round((shortlisted / total) * 100),
      shortlistToInterview:
        shortlisted > 0 ? Math.round((interviewed / shortlisted) * 100) : 0,
      interviewToHire:
        interviewed > 0 ? Math.round((hired / interviewed) * 100) : 0,
      overallConversion: Math.round((hired / total) * 100),
      rejectionRate: Math.round((rejected / total) * 100),
    };
  }, [statusCounts]);

  // ── Time-to-hire & velocity ─────────────────────────────────────────────────

  const timeMetrics = useMemo(() => {
    const hiredApps = finalApplications.filter((a) => a.status === 'hired');
    const durations = hiredApps
      .map((a) => {
        const start = new Date(a.application_date).getTime();
        const end = a.hired_date
          ? new Date(a.hired_date).getTime()
          : Date.now();
        return Math.round((end - start) / (1000 * 60 * 60 * 24));
      })
      .filter((d) => d > 0);

    const avgTTH =
      durations.length > 0
        ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
        : 0;

    // Velocity: applications in last 7 days vs prior 7 days
    const now = Date.now();
    const week1 = finalApplications.filter(
      (a) => now - new Date(a.application_date).getTime() <= 7 * 86400000
    ).length;
    const week2 = finalApplications.filter((a) => {
      const age = now - new Date(a.application_date).getTime();
      return age > 7 * 86400000 && age <= 14 * 86400000;
    }).length;

    const velocityChange =
      week2 > 0
        ? Math.round(((week1 - week2) / week2) * 100)
        : week1 > 0
        ? 100
        : 0;

    return { avgTTH, velocityChange, recentApps: week1 };
  }, [finalApplications]);

  // ── Pipeline health ──────────────────────────────────────────────────────────

  const pipelineHealth = useMemo(() => {
    const total = statusCounts.total || 1;
    const pending = finalApplications.filter(
      (a) => a.status === 'applied' || a.status === 'under_review'
    ).length;
    const active = statusCounts.shortlisted + statusCounts.interviewed;
    const closed = statusCounts.hired + statusCounts.rejected;

    return {
      pendingPct: Math.round((pending / total) * 100),
      activePct: Math.round((active / total) * 100),
      closedPct: Math.round((closed / total) * 100),
      openRoles: jobs.filter((j) => j.status === 'open').length,
      closedRoles: jobs.filter((j) => j.status === 'closed').length,
      fillRate:
        jobs.length > 0
          ? Math.round(
              (jobs.filter((j) => j.status === 'closed').length /
                jobs.length) *
                100
            )
          : 0,
    };
  }, [finalApplications, jobs, statusCounts]);

  // ── NEW: Period-over-period comparison ──────────────────────────────────────

  const previousPeriodApplications = useMemo(() => {
    if (dateRange === 'all') return null;
    const now = new Date();
    const days = RANGE_DAYS[dateRange];
    const currentCutoff = new Date(now.getTime() - days * 86400000);
    const previousCutoff = new Date(now.getTime() - days * 2 * 86400000);

    let prevApps = applications.filter((a) => {
      const d = new Date(a.application_date);
      return d >= previousCutoff && d < currentCutoff;
    });

    if (departmentFilter) {
      const deptJobIds = jobs
        .filter((j) => (j.department || 'General') === departmentFilter)
        .map((j) => j.job_id);
      prevApps = prevApps.filter((a) => deptJobIds.includes(a.job_id));
    }

    return prevApps;
  }, [applications, jobs, dateRange, departmentFilter]);

  const avgScoreForApps = (apps: Application[]) => {
    const ids = new Set(apps.map((a) => a.candidate_id));
    const scores = candidates
      .filter((c) => ids.has(c.candidate_id) && typeof c.match_score === 'number')
      .map((c) => c.match_score as number);
    return scores.length
      ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
      : 0;
  };

  const currentPeriodAvgScore = useMemo(
    () => avgScoreForApps(finalApplications),
    [finalApplications, candidates]
  );

  const periodTrends = useMemo(() => {
    if (!previousPeriodApplications) return null;
    const prev = {
      total: previousPeriodApplications.length,
      shortlisted: previousPeriodApplications.filter(
        (a) => a.status === 'shortlisted'
      ).length,
      interviewed: previousPeriodApplications.filter(
        (a) => a.status === 'interviewed'
      ).length,
      hired: previousPeriodApplications.filter((a) => a.status === 'hired')
        .length,
      avgScore: avgScoreForApps(previousPeriodApplications),
    };
    return {
      applications: {
        current: statusCounts.total,
        previous: prev.total,
        change: pctChange(statusCounts.total, prev.total),
      },
      shortlisted: {
        current: statusCounts.shortlisted,
        previous: prev.shortlisted,
        change: pctChange(statusCounts.shortlisted, prev.shortlisted),
      },
      interviewed: {
        current: statusCounts.interviewed,
        previous: prev.interviewed,
        change: pctChange(statusCounts.interviewed, prev.interviewed),
      },
      hired: {
        current: statusCounts.hired,
        previous: prev.hired,
        change: pctChange(statusCounts.hired, prev.hired),
      },
      avgScore: {
        current: currentPeriodAvgScore,
        previous: prev.avgScore,
        change: pctChange(currentPeriodAvgScore, prev.avgScore),
      },
    };
  }, [previousPeriodApplications, statusCounts, currentPeriodAvgScore, candidates]);

  // ── NEW: Stage velocity & bottleneck detection ──────────────────────────────

  const stageTimings = useMemo(() => {
    const diffDays = (from?: string | null, to?: string | null) => {
      if (!from || !to) return null;
      const d = (new Date(to).getTime() - new Date(from).getTime()) / 86400000;
      return d >= 0 ? d : null;
    };

    const avgFor = (fromKey: string, toKey: string) => {
      const vals = finalApplications
        .map((a) => diffDays((a as any)[fromKey], (a as any)[toKey]))
        .filter((v): v is number => v !== null);
      return vals.length
        ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
        : null;
    };

    const stages = [
      {
        label: 'Applied → Shortlisted',
        days: avgFor('application_date', 'shortlisted_date'),
      },
      {
        label: 'Shortlisted → Interview',
        days: avgFor('shortlisted_date', 'interviewed_date'),
      },
      {
        label: 'Interview → Hire',
        days: avgFor('interviewed_date', 'hired_date'),
      },
    ];

    const measured = stages.filter((s) => s.days !== null) as {
      label: string;
      days: number;
    }[];
    const bottleneck =
      measured.length > 0
        ? measured.reduce((max, s) => (s.days > max.days ? s : max))
        : null;
    const totalCycle = measured.reduce((s, x) => s + x.days, 0);

    return { stages, bottleneck, totalCycle, hasData: measured.length > 0 };
  }, [finalApplications]);

  // ── NEW: Hiring forecast ─────────────────────────────────────────────────────

  const forecast = useMemo(() => {
    const dailyRate = timeMetrics.recentApps / 7;
    const projectedApps30 = Math.round(dailyRate * 30);
    const projectedHires30 = Math.round(
      projectedApps30 * (conversionRates.overallConversion / 100)
    );
    const daysToFillOpenRoles =
      projectedHires30 > 0 && pipelineHealth.openRoles > 0
        ? Math.round((pipelineHealth.openRoles / projectedHires30) * 30)
        : 0;

    return {
      dailyRate: Math.round(dailyRate * 10) / 10,
      projectedApps30,
      projectedHires30,
      daysToFillOpenRoles,
    };
  }, [timeMetrics, conversionRates, pipelineHealth]);

  // ── NEW: Source effectiveness ────────────────────────────────────────────────

  const sourceEffectiveness = useMemo(() => {
    const map: Record<
      string,
      { total: number; hired: number; scoreSum: number; scoreCount: number }
    > = {};
    const candidateById = new Map(candidates.map((c) => [c.candidate_id, c]));

    finalApplications.forEach((a) => {
      const src = (a as any).source || 'Direct';
      if (!map[src]) map[src] = { total: 0, hired: 0, scoreSum: 0, scoreCount: 0 };
      map[src].total++;
      if (a.status === 'hired') map[src].hired++;
      const cand = candidateById.get(a.candidate_id);
      if (cand && typeof cand.match_score === 'number') {
        map[src].scoreSum += cand.match_score;
        map[src].scoreCount++;
      }
    });

    const total = statusCounts.total || 1;
    return Object.entries(map)
      .map(([source, d]) => ({
        source,
        count: d.total,
        pct: Math.round((d.total / total) * 100),
        hireRate: d.total ? Math.round((d.hired / d.total) * 100) : 0,
        avgScore: d.scoreCount ? Math.round(d.scoreSum / d.scoreCount) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [finalApplications, candidates, statusCounts]);

  const sourceDiversityIndex = useMemo(() => {
    const total = statusCounts.total;
    if (!total) return 0;
    const counts: Record<string, number> = {};
    finalApplications.forEach((a) => {
      const src = (a as any).source || 'Direct';
      counts[src] = (counts[src] || 0) + 1;
    });
    const entries = Object.values(counts);
    if (entries.length <= 1) return 0;
    const entropy = -entries.reduce((sum, c) => {
      const p = c / total;
      return sum + p * Math.log(p);
    }, 0);
    const maxEntropy = Math.log(entries.length);
    return Math.round((entropy / maxEntropy) * 100);
  }, [finalApplications, statusCounts]);

  // ── NEW: Department quality index ────────────────────────────────────────────

  const departmentQuality = useMemo(() => {
    const map: Record<
      string,
      { scoreSum: number; scoreCount: number; apps: number; hired: number }
    > = {};
    const jobById = new Map(jobs.map((j) => [j.job_id, j]));
    const candidateById = new Map(candidates.map((c) => [c.candidate_id, c]));

    finalApplications.forEach((a) => {
      const dept = jobById.get(a.job_id)?.department || 'General';
      if (!map[dept]) map[dept] = { scoreSum: 0, scoreCount: 0, apps: 0, hired: 0 };
      map[dept].apps++;
      if (a.status === 'hired') map[dept].hired++;
      const cand = candidateById.get(a.candidate_id);
      if (cand && typeof cand.match_score === 'number') {
        map[dept].scoreSum += cand.match_score;
        map[dept].scoreCount++;
      }
    });

    return Object.entries(map)
      .map(([dept, d]) => ({
        dept,
        avgScore: d.scoreCount ? Math.round(d.scoreSum / d.scoreCount) : 0,
        apps: d.apps,
        hireRate: d.apps ? Math.round((d.hired / d.apps) * 100) : 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [finalApplications, jobs, candidates]);

  // ── Top candidates spotlight ─────────────────────────────────────────────────

  const topCandidates = useMemo(
    () =>
      [...candidates]
        .filter((c) => typeof c.match_score === 'number')
        .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
        .slice(0, 5),
    [candidates]
  );

  // ── Rejection analysis ────────────────────────────────────────────────────────

  const rejectionAnalysis = useMemo(() => {
    const rejected = finalApplications.filter((a) => a.status === 'rejected');
    const reasonMap: Record<string, number> = {};
    rejected.forEach((a) => {
      const reason = (a as any).rejection_reason || 'Not specified';
      reasonMap[reason] = (reasonMap[reason] || 0) + 1;
    });
    const total = rejected.length || 1;
    return Object.entries(reasonMap)
      .map(([reason, count]) => ({
        reason,
        count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [finalApplications]);

  const departments = useMemo(() => {
    const depts = new Set(jobs.map((j) => j.department || 'General'));
    return Array.from(depts);
  }, [jobs]);

  // ── NEW: Job performance table (search + sort + quality score) ──────────────

  const jobTableData = useMemo(() => {
    const candidateById = new Map(candidates.map((c) => [c.candidate_id, c]));
    const query = jobSearch.trim().toLowerCase();

    const rows = jobs
      .map((job) => {
        const jobApps = finalApplications.filter((a) => a.job_id === job.job_id);
        const shortlisted = jobApps.filter((a) => a.status === 'shortlisted').length;
        const interviewed = jobApps.filter((a) => a.status === 'interviewed').length;
        const hired = jobApps.filter((a) => a.status === 'hired').length;
        const convRate = jobApps.length
          ? Math.round((hired / jobApps.length) * 100)
          : 0;
        const scores = jobApps
          .map((a) => candidateById.get(a.candidate_id))
          .filter(
            (c): c is Candidate => !!c && typeof c.match_score === 'number'
          )
          .map((c) => c.match_score as number);
        const avgScore = scores.length
          ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
          : 0;

        return {
          job,
          applicants: jobApps.length,
          shortlisted,
          interviewed,
          hired,
          convRate,
          avgScore,
        };
      })
      .filter(
        (r) =>
          !query ||
          r.job.role.toLowerCase().includes(query) ||
          (r.job.department || 'General').toLowerCase().includes(query)
      );

    return rows.sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [jobs, finalApplications, candidates, jobSearch, sortKey, sortDir]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Deep insights into your hiring performance
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            options={[
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
              { value: '1y', label: 'Last year' },
              { value: 'all', label: 'All time' },
            ]}
          />
          <Select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            options={[
              { value: '', label: 'All Departments' },
              ...departments.map((d) => ({ value: d, label: d })),
            ]}
          />
          <Button
            variant="secondary"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => onExport?.('analytics')}
          >
            Export
          </Button>
        </div>
      </div>

      {/* ── Key Metrics Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Jobs"
          value={stats.totalJobs}
          icon={<Briefcase className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Applications"
          value={stats.totalApplications}
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Avg Score"
          value={`${stats.averageScore}%`}
          icon={<Star className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Hired"
          value={stats.hiredCount}
          icon={<CheckCircle className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Shortlisted"
          value={stats.shortlistedCount}
          icon={<TrendingUp className="w-5 h-5" />}
          color="orange"
        />
        <StatCard
          title="Interviews"
          value={stats.interviewsScheduled}
          icon={<Calendar className="w-5 h-5" />}
          color="blue"
        />
      </div>

      {/* ── Extended KPI Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Time to Hire */}
        <Card padding="lg" className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Avg Time to Hire
            </span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {timeMetrics.avgTTH}
            <span className="text-base font-normal text-gray-400 ml-1">days</span>
          </p>
          <p className="text-xs text-gray-400">From application to offer</p>
        </Card>

        {/* Application Velocity */}
        <Card padding="lg" className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              App Velocity
            </span>
            <Zap className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {timeMetrics.recentApps}
            <span className="text-base font-normal text-gray-400 ml-1">/ 7d</span>
          </p>
          <Trend value={timeMetrics.velocityChange} />
        </Card>

        {/* Rejection Rate */}
        <Card padding="lg" className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Rejection Rate
            </span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {conversionRates.rejectionRate}
            <span className="text-base font-normal text-gray-400 ml-1">%</span>
          </p>
          <GaugeBar value={conversionRates.rejectionRate} color="bg-red-400" />
        </Card>

        {/* Role Fill Rate */}
        <Card padding="lg" className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Role Fill Rate
            </span>
            <Target className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {pipelineHealth.fillRate}
            <span className="text-base font-normal text-gray-400 ml-1">%</span>
          </p>
          <GaugeBar value={pipelineHealth.fillRate} color="bg-emerald-500" />
        </Card>
      </div>

      {/* ── NEW: Period-over-period comparison ── */}
      {periodTrends && (
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Period-over-Period Performance
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Current {dateRange === '1y' ? 'year' : dateRange} vs. the
                equivalent prior period
              </p>
            </div>
            <RefreshCw className="w-5 h-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { label: 'Applications', data: periodTrends.applications },
              { label: 'Shortlisted', data: periodTrends.shortlisted },
              { label: 'Interviewed', data: periodTrends.interviewed },
              { label: 'Hired', data: periodTrends.hired },
              { label: 'Avg Score', data: periodTrends.avgScore, suffix: '%' as const },
            ].map(({ label, data, suffix }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {data.current}
                  {suffix ?? ''}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">{label}</p>
                <div className="mt-1 flex items-center justify-center gap-1">
                  <Trend value={data.change} />
                  <span className="text-xs text-gray-400">
                    vs {data.previous}
                    {suffix ?? ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Conversion Rates ── */}
      <Card padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Conversion Rates
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            {
              label: 'Applied → Shortlisted',
              value: conversionRates.appliedToShortlist,
              color: 'text-blue-600',
              bar: 'bg-blue-500',
            },
            {
              label: 'Shortlist → Interview',
              value: conversionRates.shortlistToInterview,
              color: 'text-purple-600',
              bar: 'bg-purple-500',
            },
            {
              label: 'Interview → Hire',
              value: conversionRates.interviewToHire,
              color: 'text-orange-600',
              bar: 'bg-orange-500',
            },
            {
              label: 'Overall Conversion',
              value: conversionRates.overallConversion,
              color: 'text-emerald-600',
              bar: 'bg-emerald-500',
            },
          ].map(({ label, value, color, bar }) => (
            <div key={label} className="text-center">
              <div className={`text-3xl font-bold ${color}`}>{value}%</div>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
              <GaugeBar value={value} color={bar} />
            </div>
          ))}
        </div>
      </Card>

      {/* ── Pipeline Health ── */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Pipeline Health</h3>
          <Activity className="w-5 h-5 text-gray-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stage distribution */}
          <div className="md:col-span-2 space-y-3">
            {[
              {
                label: 'Pending Review',
                pct: pipelineHealth.pendingPct,
                color: 'bg-yellow-400',
                text: 'text-yellow-700',
                bg: 'bg-yellow-50',
              },
              {
                label: 'Active (Shortlisted / Interviewed)',
                pct: pipelineHealth.activePct,
                color: 'bg-blue-500',
                text: 'text-blue-700',
                bg: 'bg-blue-50',
              },
              {
                label: 'Closed (Hired / Rejected)',
                pct: pipelineHealth.closedPct,
                color: 'bg-gray-400',
                text: 'text-gray-600',
                bg: 'bg-gray-50',
              },
            ].map(({ label, pct, color, text, bg }) => (
              <div key={label} className={`rounded-lg p-3 ${bg}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-sm font-medium ${text}`}>{label}</span>
                  <span className={`text-sm font-bold ${text}`}>{pct}%</span>
                </div>
                <div className="w-full bg-white rounded-full h-2">
                  <div
                    className={`${color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Open vs Closed roles */}
          <div className="flex flex-col gap-3">
            <div className="rounded-lg bg-emerald-50 p-4 text-center">
              <p className="text-3xl font-bold text-emerald-600">
                {pipelineHealth.openRoles}
              </p>
              <p className="text-sm text-emerald-700 mt-1">Open Roles</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-3xl font-bold text-gray-600">
                {pipelineHealth.closedRoles}
              </p>
              <p className="text-sm text-gray-500 mt-1">Closed Roles</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ── NEW: Hiring Velocity, Bottlenecks & Forecast ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage velocity */}
        <Card padding="lg" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Stage Velocity & Bottlenecks
            </h3>
            <Layers className="w-5 h-5 text-purple-400" />
          </div>
          {!stageTimings.hasData ? (
            <p className="text-sm text-gray-400">
              Not enough stage-date data to calculate stage durations yet.
            </p>
          ) : (
            <div className="space-y-3">
              {stageTimings.stages.map(({ label, days }) => {
                const isBottleneck =
                  stageTimings.bottleneck?.label === label && days !== null;
                const maxDays = Math.max(
                  ...stageTimings.stages.map((s) => s.days ?? 0),
                  1
                );
                return (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 flex items-center gap-1.5">
                        {label}
                        {isBottleneck && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" /> Bottleneck
                          </span>
                        )}
                      </span>
                      <span className="text-gray-500">
                        {days !== null ? `${days} days` : 'No data'}
                      </span>
                    </div>
                    <GaugeBar
                      value={days !== null ? (days / maxDays) * 100 : 0}
                      color={isBottleneck ? 'bg-red-400' : 'bg-purple-400'}
                    />
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
                <span className="text-sm font-medium text-gray-700">
                  Total measured cycle time
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {Math.round(stageTimings.totalCycle * 10) / 10} days
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Forecast */}
        <Card padding="lg" className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">30-Day Forecast</h3>
            <Compass className="w-5 h-5 text-blue-400" />
          </div>
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {forecast.projectedApps30}
            </p>
            <p className="text-sm text-blue-700 mt-1">Projected applications</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-4 text-center">
            <p className="text-3xl font-bold text-emerald-600">
              {forecast.projectedHires30}
            </p>
            <p className="text-sm text-emerald-700 mt-1">Projected hires</p>
          </div>
          <p className="text-xs text-gray-400">
            Based on a current pace of {forecast.dailyRate} apps/day and a{' '}
            {conversionRates.overallConversion}% overall conversion rate.
            {forecast.daysToFillOpenRoles > 0 && (
              <>
                {' '}
                At this pace, filling all {pipelineHealth.openRoles} open role
                {pipelineHealth.openRoles === 1 ? '' : 's'} would take roughly{' '}
                <span className="font-semibold text-gray-600">
                  {forecast.daysToFillOpenRoles} days
                </span>
                .
              </>
            )}
          </p>
        </Card>
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hiring Funnel</h3>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-400">
              Loading…
            </div>
          ) : (
            <FunnelChart data={funnelData} />
          )}
        </Card>
        <Card padding="lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Score Distribution
          </h3>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-400">
              Loading…
            </div>
          ) : (
            <ScoreDistChart data={scoreDistribution} />
          )}
        </Card>
      </div>

      {/* ── Application Trends ── */}
      <Card padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Application Trends
        </h3>
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-gray-400">
            Loading…
          </div>
        ) : (
          <LineChart data={trendData} height={280} />
        )}
      </Card>

      {/* ── Charts Row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Department Breakdown
          </h3>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-400">
              Loading…
            </div>
          ) : (
            <DeptChart data={departmentData} />
          )}
        </Card>
        <Card padding="lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Skill Gap Analysis
          </h3>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-400">
              Loading…
            </div>
          ) : skillGap.length > 0 ? (
            <Heatmap data={skillGap} height={280} />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">
              No skill gap data available
            </div>
          )}
        </Card>
      </div>

      {/* ── NEW: Department Quality Index ── */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Department Quality Index
          </h3>
          <Gauge className="w-5 h-5 text-indigo-400" />
        </div>
        {departmentQuality.length === 0 ? (
          <p className="text-sm text-gray-400">No data available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {departmentQuality.map(({ dept, avgScore, apps, hireRate }) => (
              <div key={dept} className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {dept}
                  </span>
                  <span className="text-sm font-bold text-indigo-600">
                    {avgScore}%
                  </span>
                </div>
                <GaugeBar value={avgScore} color="bg-indigo-400" />
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>{apps} applicants</span>
                  <span>{hireRate}% hire rate</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Three-column insight row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Candidates Spotlight */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Candidates</h3>
            <Award className="w-5 h-5 text-yellow-400" />
          </div>
          {topCandidates.length === 0 ? (
            <p className="text-sm text-gray-400">No scored candidates yet.</p>
          ) : (
            <ul className="space-y-3">
              {topCandidates.map((c, i) => (
                <li key={c.candidate_id} className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0
                        ? 'bg-yellow-100 text-yellow-700'
                        : i === 1
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-orange-50 text-orange-600'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {c.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {(c as any).applied_role || 'Role not specified'}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 shrink-0">
                    {c.match_score}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Rejection Reasons */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Rejection Reasons
            </h3>
            <TrendingDown className="w-5 h-5 text-red-400" />
          </div>
          {rejectionAnalysis.length === 0 ? (
            <p className="text-sm text-gray-400">No rejection data yet.</p>
          ) : (
            <ul className="space-y-3">
              {rejectionAnalysis.map(({ reason, count, pct }) => (
                <li key={reason}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 truncate max-w-[70%]">
                      {reason}
                    </span>
                    <span className="text-gray-500 shrink-0">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <GaugeBar value={pct} color="bg-red-400" />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Source Effectiveness */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Source Effectiveness
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Diversity score: {sourceDiversityIndex}/100
              </p>
            </div>
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          {sourceEffectiveness.length === 0 ? (
            <p className="text-sm text-gray-400">No source data available.</p>
          ) : (
            <ul className="space-y-3">
              {sourceEffectiveness.map(({ source, count, pct, hireRate, avgScore }) => (
                <li key={source}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{source}</span>
                    <span className="text-gray-500">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <GaugeBar value={pct} color="bg-blue-400" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{hireRate}% hire rate</span>
                    <span>Avg score {avgScore}%</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── Recruiter Efficiency ── */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Recruiter Efficiency
          </h3>
          <UserCheck className="w-5 h-5 text-purple-400" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            {
              label: 'Candidates Screened',
              value: candidates.length,
              icon: <Users className="w-4 h-4" />,
              color: 'text-blue-600',
            },
            {
              label: 'Avg Apps per Role',
              value:
                jobs.length > 0
                  ? Math.round(finalApplications.length / jobs.length)
                  : 0,
              icon: <BarChart2 className="w-4 h-4" />,
              color: 'text-purple-600',
            },
            {
              label: 'Interviews Conducted',
              value: stats.interviewsScheduled,
              icon: <Calendar className="w-4 h-4" />,
              color: 'text-orange-600',
            },
            {
              label: 'Offer Acceptance',
              value: `${conversionRates.overallConversion}%`,
              icon: <CheckCircle className="w-4 h-4" />,
              color: 'text-emerald-600',
            },
          ].map(({ label, value, icon, color }) => (
            <div
              key={label}
              className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-gray-50"
            >
              <span className={`${color}`}>{icon}</span>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Alerts & Attention Needed ── */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Attention Needed</h3>
          <AlertCircle className="w-5 h-5 text-yellow-500" />
        </div>
        <div className="space-y-2">
          {pipelineHealth.pendingPct > 50 && (
            <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">{pipelineHealth.pendingPct}%</span>{' '}
                of applications are still pending review. Consider expediting the
                screening process.
              </p>
            </div>
          )}
          {conversionRates.rejectionRate > 70 && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-800">
                High rejection rate of{' '}
                <span className="font-semibold">{conversionRates.rejectionRate}%</span>
                . Review job descriptions for alignment with candidate pool.
              </p>
            </div>
          )}
          {conversionRates.overallConversion < 5 && finalApplications.length > 10 && (
            <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <TrendingDown className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
              <p className="text-sm text-orange-800">
                Overall conversion is only{' '}
                <span className="font-semibold">
                  {conversionRates.overallConversion}%
                </span>
                . Review interview-to-hire stage for bottlenecks.
              </p>
            </div>
          )}
          {stageTimings.bottleneck && (
            <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <Layers className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
              <p className="text-sm text-purple-800">
                <span className="font-semibold">
                  {stageTimings.bottleneck.label}
                </span>{' '}
                is your slowest stage, averaging{' '}
                <span className="font-semibold">
                  {stageTimings.bottleneck.days} days
                </span>
                . Focus process improvements here for the biggest impact on
                time-to-hire.
              </p>
            </div>
          )}
          {sourceDiversityIndex > 0 && sourceDiversityIndex < 30 && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800">
                Sourcing diversity score is{' '}
                <span className="font-semibold">{sourceDiversityIndex}/100</span>,
                indicating heavy reliance on a single channel. Diversifying
                sourcing channels may improve candidate quality and reach.
              </p>
            </div>
          )}
          {pipelineHealth.openRoles === 0 && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Briefcase className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800">
                No open roles currently. Post new jobs to keep the pipeline active.
              </p>
            </div>
          )}
          {pipelineHealth.pendingPct <= 50 &&
            conversionRates.rejectionRate <= 70 &&
            (conversionRates.overallConversion >= 5 ||
              finalApplications.length <= 10) &&
            pipelineHealth.openRoles > 0 &&
            !stageTimings.bottleneck &&
            (sourceDiversityIndex === 0 || sourceDiversityIndex >= 30) && (
              <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-emerald-800">
                  Pipeline looks healthy! Keep the momentum going.
                </p>
              </div>
            )}
        </div>
      </Card>

      {/* ── Job Performance Table (searchable + sortable + quality score) ── */}
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Job Performance</h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
              placeholder="Search by role or department…"
              className="pl-9"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Job
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Dept
                </th>
                <SortHeader
                  label="Applicants"
                  sortKey="applicants"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Shortlisted"
                  sortKey="shortlisted"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Interviewed"
                  sortKey="interviewed"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Hired"
                  sortKey="hired"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Conv. Rate"
                  sortKey="convRate"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Avg Score"
                  sortKey="avgScore"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobTableData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-400">
                    No jobs match your search.
                  </td>
                </tr>
              ) : (
                jobTableData.map(
                  ({ job, applicants, shortlisted, interviewed, hired, convRate, avgScore }) => (
                    <tr key={job.job_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{job.role}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {job.department || 'General'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{applicants}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{shortlisted}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{interviewed}</td>
                      <td className="px-4 py-3 text-sm text-emerald-600 font-medium">
                        {hired}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-medium ${
                            convRate >= 20
                              ? 'text-emerald-600'
                              : convRate >= 10
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {convRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-medium ${
                            avgScore >= 70
                              ? 'text-emerald-600'
                              : avgScore >= 40
                              ? 'text-yellow-600'
                              : avgScore > 0
                              ? 'text-red-600'
                              : 'text-gray-400'
                          }`}
                        >
                          {avgScore > 0 ? `${avgScore}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            job.status === 'open'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {job.status === 'open' ? 'Open' : 'Closed'}
                        </span>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}