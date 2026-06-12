import { useState, useMemo } from 'react';
import {
  Download,
  Calendar,
  TrendingUp,
  Users,
  Briefcase,
  Star,
  CheckCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/input';
import { Card, StatCard } from '../../components/ui/card';
import { FunnelChart, ScoreDistChart, LineChart, Heatmap, DeptChart } from '../../components/charts';
import type { Candidate, Application, Job } from '../../types';
import {
  calculateDashboardStats,
  calculateFunnelData,
  calculateScoreDistribution,
  calculateTrendData,
  calculateDepartmentData,
  calculateSkillGap
} from '../../utils/chart-utils';

interface AnalyticsPageProps {
  candidates: Candidate[];
  applications: Application[];
  jobs: Job[];
  isLoading: boolean;
  onExport?: (type: string) => void;
}

type DateRange = '7d' | '30d' | '90d' | '1y' | 'all';

export function AnalyticsPage({
  candidates,
  applications,
  jobs,
  isLoading,
  onExport
}: AnalyticsPageProps) {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Filter by date range
  const filteredApplications = useMemo(() => {
    if (dateRange === 'all') return applications;

    const now = new Date();
    const ranges: Record<DateRange, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
      'all': 365 * 10 // 10 years for 'all'
    };

    const daysAgo = new Date(now.getTime() - ranges[dateRange] * 24 * 60 * 60 * 1000);
    return applications.filter(app => new Date(app.application_date) >= daysAgo);
  }, [applications, dateRange]);

  // Filter by department
  const finalApplications = useMemo(() => {
    if (!departmentFilter) return filteredApplications;
    const deptJobIds = jobs
      .filter(j => (j.department || 'General') === departmentFilter)
      .map(j => j.job_id);
    return filteredApplications.filter(app => deptJobIds.includes(app.job_id));
  }, [filteredApplications, jobs, departmentFilter]);

  // Calculate all analytics
  const stats = useMemo(() => calculateDashboardStats(jobs, finalApplications, candidates), [jobs, finalApplications, candidates]);
  const funnelData = useMemo(() => calculateFunnelData(finalApplications), [finalApplications]);
  const scoreDistribution = useMemo(() => calculateScoreDistribution(candidates), [candidates]);
  const trendData = useMemo(() => calculateTrendData(finalApplications), [finalApplications]);
  const departmentData = useMemo(() => calculateDepartmentData(jobs, finalApplications), [jobs, finalApplications]);
  const skillGap = useMemo(() => calculateSkillGap(jobs, candidates), [jobs, candidates]);

  // Conversion rates
  const conversionRates = useMemo(() => {
    const total = finalApplications.length || 1;
    const shortlisted = finalApplications.filter(a => a.status === 'shortlisted').length;
    const interviewed = finalApplications.filter(a => a.status === 'interviewed').length;
    const hired = finalApplications.filter(a => a.status === 'hired').length;

    return {
      appliedToShortlist: Math.round((shortlisted / total) * 100),
      shortlistToInterview: shortlisted > 0 ? Math.round((interviewed / shortlisted) * 100) : 0,
      interviewToHire: interviewed > 0 ? Math.round((hired / interviewed) * 100) : 0,
      overallConversion: Math.round((hired / total) * 100)
    };
  }, [finalApplications]);

  const departments = useMemo(() => {
    const depts = new Set(jobs.map(j => j.department || 'General'));
    return Array.from(depts);
  }, [jobs]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
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
              { value: 'all', label: 'All time' }
            ]}
          />
          <Select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            options={[
              { value: '', label: 'All Departments' },
              ...departments.map(d => ({ value: d, label: d }))
            ]}
          />
          <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />} onClick={() => onExport?.('analytics')}>
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
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

      {/* Conversion Rates */}
      <Card padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Rates</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{conversionRates.appliedToShortlist}%</div>
            <p className="text-sm text-gray-500 mt-1">Applied to Shortlisted</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{conversionRates.shortlistToInterview}%</div>
            <p className="text-sm text-gray-500 mt-1">Shortlist to Interview</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{conversionRates.interviewToHire}%</div>
            <p className="text-sm text-gray-500 mt-1">Interview to Hire</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600">{conversionRates.overallConversion}%</div>
            <p className="text-sm text-gray-500 mt-1">Overall Conversion</p>
          </div>
        </div>
      </Card>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hiring Funnel</h3>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">Loading...</div>
          ) : (
            <FunnelChart data={funnelData} />
          )}
        </Card>
        <Card padding="lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Distribution</h3>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">Loading...</div>
          ) : (
            <ScoreDistChart data={scoreDistribution} />
          )}
        </Card>
      </div>

      {/* Application Trends */}
      <Card padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Trends</h3>
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">Loading...</div>
        ) : (
          <LineChart data={trendData} height={280} />
        )}
      </Card>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Breakdown</h3>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">Loading...</div>
          ) : (
            <DeptChart data={departmentData} />
          )}
        </Card>
        <Card padding="lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Skill Gap Analysis</h3>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">Loading...</div>
          ) : skillGap.length > 0 ? (
            <Heatmap data={skillGap} height={280} />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">
              No skill gap data available
            </div>
          )}
        </Card>
      </div>

      {/* Job Performance */}
      <Card padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicants</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shortlisted</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interviewed</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hired</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conv. Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job) => {
                const jobApps = finalApplications.filter(a => a.job_id === job.job_id);
                const shortlisted = jobApps.filter(a => a.status === 'shortlisted').length;
                const interviewed = jobApps.filter(a => a.status === 'interviewed').length;
                const hired = jobApps.filter(a => a.status === 'hired').length;
                const convRate = jobApps.length > 0 ? Math.round((hired / jobApps.length) * 100) : 0;

                return (
                  <tr key={job.job_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{job.role}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{jobApps.length}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{shortlisted}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{interviewed}</td>
                    <td className="px-4 py-3 text-sm text-emerald-600 font-medium">{hired}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${convRate >= 20 ? 'text-emerald-600' : convRate >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {convRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
