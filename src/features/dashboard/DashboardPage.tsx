import { useMemo, useState } from 'react';
import {
  Users,
  Briefcase,
  CheckCircle,
  Star,
  TrendingUp,
  ChevronRight,
  Download,
  Calendar,
  Clock,
  Send
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
  getStatusColor
} from '../../utils/chart-utils';

interface DashboardPageProps {
  candidates: Candidate[];
  applications: Application[];
  jobs: Job[];
  isLoading?: boolean;
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

type DateRange = '7d' | '30d' | '90d' | 'all';

function GrowthBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
      <TrendingUp className={`w-3 h-3 ${!isPositive ? 'rotate-180' : ''}`} />
      {isPositive ? '+' : ''}{value}%
    </span>
  );
}

export function DashboardPage({ candidates, applications, jobs, isLoading = false, onNavigate }: DashboardPageProps) {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [deptFilter, setDeptFilter] = useState('');
  const [jobFilter, setJobFilter] = useState('');

  const filteredApplications = useMemo(() => {
    let result = applications;
    if (dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 86400000);
      result = result.filter(a => new Date(a.application_date) >= cutoff);
    }
    if (jobFilter) {
      result = result.filter(a => a.job_id === parseInt(jobFilter));
    }
    return result;
  }, [applications, dateRange, jobFilter]);

  const stats = useMemo(() => calculateDashboardStats(jobs, filteredApplications, candidates), [jobs, filteredApplications, candidates]);
  const funnelData = useMemo(() => calculateFunnelData(filteredApplications), [filteredApplications]);
  const scoreDist = useMemo(() => calculateScoreDistribution(candidates), [candidates]);
  const trendData = useMemo(() => calculateTrendData(filteredApplications), [filteredApplications]);
  const topCandidates = useMemo(() => getTopCandidates(candidates, 8), [candidates]);

  const recentApplications = useMemo(() => {
    return [...filteredApplications]
      .sort((a, b) => new Date(b.application_date).getTime() - new Date(a.application_date).getTime())
      .slice(0, 5)
      .map(app => ({
        ...app,
        candidate: candidates.find(c => c.candidate_id === app.candidate_id),
        job: jobs.find(j => j.job_id === app.job_id)
      }));
  }, [filteredApplications, candidates, jobs]);

  const departments = useMemo(() => Array.from(new Set(jobs.map(j => j.department || 'General'))), [jobs]);

  const statCards = [
    {
      title: 'TOTAL JOBS',
      value: stats.totalJobs,
      icon: <Briefcase className="w-5 h-5" />,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      growth: 4,
      label: 'Active job postings',
      growthLabel: 'Growth'
    },
    {
      title: 'TOTAL APPLICATIONS',
      value: stats.totalApplications,
      icon: <Users className="w-5 h-5" />,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      growth: 12,
      label: 'Submitted applications',
      growthLabel: 'Growth'
    },
    {
      title: 'AVERAGE SCORE',
      value: `${stats.averageScore}%`,
      icon: <Star className="w-5 h-5 text-emerald-600" />,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      growth: 2.6,
      label: 'Assessment quality',
      growthLabel: '+2.6% Growth'
    },
    {
      title: 'HIRED COUNT',
      value: stats.hiredCount,
      icon: <CheckCircle className="w-5 h-5 text-blue-500" />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      growth: 9,
      label: 'YTD hires',
      growthLabel: '+9% Growth'
    }
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50 min-h-full space-y-6">

      {/* Dashboard Filters */}
      <Card padding="md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Dashboard filters</h3>
            <p className="text-sm text-gray-500 mt-0.5">Update the dashboard state to explore hiring insights.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[130px]"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Department</label>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
              >
                <option value="">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Job</label>
              <select
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[130px]"
              >
                <option value="">All Jobs</option>
                {jobs.map(j => <option key={j.job_id} value={j.job_id}>{j.role}</option>)}
              </select>
            </div>
            <div className="flex flex-col justify-end gap-1 h-full mt-auto pt-5">
              <Button
                variant="secondary"
                leftIcon={<Download className="w-4 h-4" />}
                className="!bg-blue-600 !text-white !border-blue-600 hover:!bg-blue-700"
              >
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <Card key={i} padding="md">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-full ${card.iconBg} flex items-center justify-center`}>
                  <span className={card.iconColor}>{card.icon}</span>
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{card.title}</p>
              <p className="text-3xl font-bold text-gray-900 mb-3">{card.value}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <GrowthBadge value={card.growth} />
                <span className="text-xs text-gray-500">{card.label}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Hiring Funnel</h3>
              <p className="text-xs text-gray-500 mt-0.5">Pipeline conversion across recruitment stages</p>
            </div>
            <button
              onClick={() => onNavigate('pipeline')}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Live insights
            </button>
          </div>
          {filteredApplications.length > 0 ? (
            <FunnelChart data={funnelData} />
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">
              No applications in this period
            </div>
          )}
        </Card>

        <Card padding="lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Score Distribution</h3>
              <p className="text-xs text-gray-500 mt-0.5">Quality spread of candidate assessments</p>
            </div>
            <button
              onClick={() => onNavigate('analytics')}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              View analytics
            </button>
          </div>
          {candidates.length > 0 ? (
            <ScoreDistChart data={scoreDist} />
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">
              No candidate data yet
            </div>
          )}
        </Card>
      </div>

      {/* Trend Chart */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Application Trends</h3>
            <p className="text-xs text-gray-500 mt-0.5">Daily applications and hires over time</p>
          </div>
        </div>
        {trendData.length > 0 ? (
          <LineChart data={trendData} height={220} />
        ) : (
          <div className="h-48 flex items-center justify-center text-sm text-gray-400">
            No trend data available
          </div>
        )}
      </Card>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Candidates Table */}
        <Card padding="none" className="lg:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Top Candidates</h3>
              <p className="text-xs text-gray-500 mt-0.5">Highlights of top applicants</p>
            </div>
            <button
              onClick={() => onNavigate('candidates')}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Ready to review
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Skills</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topCandidates.length > 0 ? topCandidates.map((candidate) => (
                  <tr
                    key={candidate.candidate_id}
                    onClick={() => onNavigate('candidate-detail', { id: candidate.candidate_id })}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1a1f36] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{candidate.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-blue-600">{candidate.email}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                      {candidate.skills.split(',').slice(0, 3).map(s => s.trim()).join(', ')}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        (candidate.score || 0) >= 80 ? 'bg-emerald-50 text-emerald-700' :
                        (candidate.score || 0) >= 60 ? 'bg-blue-50 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {candidate.score || 0}%
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">No candidates yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Activity Summary */}
        <div className="space-y-4">
          <Card padding="lg">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Activity Summary</h3>
            <p className="text-xs text-gray-500 mb-4">Recruitment health and next steps</p>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Scheduled interviews</p>
                <p className="text-3xl font-bold text-gray-900">{stats.interviewsScheduled}</p>
                <p className="text-xs text-gray-500 mt-1">Across all open roles</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Shortlisted candidates</p>
                <p className="text-3xl font-bold text-gray-900">{stats.shortlistedCount}</p>
                <p className="text-xs text-gray-500 mt-1">Pending review</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Offers sent</p>
                <p className="text-3xl font-bold text-gray-900">{stats.offersSent}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting response</p>
              </div>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card padding="lg">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h3>
            <div className="space-y-3">
              {recentApplications.length > 0 ? recentApplications.map((app) => (
                <div key={app.application_id} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    app.status === 'hired' ? 'bg-emerald-100' :
                    app.status === 'rejected' ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    {app.status === 'hired' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> :
                     app.status === 'rejected' ? <Users className="w-3.5 h-3.5 text-red-600" /> :
                     <Clock className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{app.candidate?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 truncate">{app.status} · {app.job?.role || 'Unknown'}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{getRelativeTime(app.application_date)}</span>
                </div>
              )) : (
                <p className="text-xs text-gray-400 text-center py-4">No recent activity</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Empty welcome state */}
      {candidates.length === 0 && jobs.length === 0 && !isLoading && (
        <Card padding="lg">
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Welcome to HireAI Copilot</h3>
            <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
              Start by creating your first job posting and adding candidates to begin your hiring journey.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={() => onNavigate('jobs')}>Create Job</Button>
              <Button onClick={() => onNavigate('candidates')}>Add Candidate</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
