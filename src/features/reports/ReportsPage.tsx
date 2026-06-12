import { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  FileOutput,
  Users,
  Briefcase,
  TrendingUp,
  Building
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import type { Candidate, Application, Job, DashboardStats } from '../../types';
import { calculateDashboardStats, calculateFunnelData, calculateDepartmentData } from '../../utils/chart-utils';

interface ReportsPageProps {
  candidates: Candidate[];
  applications: Application[];
  jobs: Job[];
}

type ReportType = 'candidates' | 'jobs' | 'funnel' | 'summary' | 'department';
type ExportFormat = 'csv' | 'pdf';

const REPORT_CONFIG: Record<ReportType, { label: string; description: string; icon: React.ReactNode }> = {
  candidates: {
    label: 'Candidate Ranking Report',
    description: 'All candidates ranked by AI score with skills and experience',
    icon: <Users className="w-5 h-5" />
  },
  jobs: {
    label: 'Job Performance Report',
    description: 'Performance metrics for each job posting',
    icon: <Briefcase className="w-5 h-5" />
  },
  funnel: {
    label: 'Hiring Funnel Report',
    description: 'Stage-by-stage conversion analysis',
    icon: <TrendingUp className="w-5 h-5" />
  },
  summary: {
    label: 'Weekly Recruiter Summary',
    description: 'Key metrics and highlights for the week',
    icon: <FileText className="w-5 h-5" />
  },
  department: {
    label: 'Department Summary',
    description: 'Hiring breakdown by department',
    icon: <Building className="w-5 h-5" />
  }
};

export function ReportsPage({
  candidates,
  applications,
  jobs
}: ReportsPageProps) {
  const [dateRange, setDateRange] = useState('30d');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [generatingReport, setGeneratingReport] = useState<ReportType | null>(null);

  const stats = calculateDashboardStats(jobs, applications, candidates);
  const funnelData = calculateFunnelData(applications);
  const departmentData = calculateDepartmentData(jobs, applications);

  const departments = [...new Set(jobs.map(j => j.department || 'General'))];

  const generateReport = async (type: ReportType, _format: ExportFormat) => {
    setGeneratingReport(type);

    try {
      let content = '';
      let filename = '';

      switch (type) {
        case 'candidates':
          content = generateCandidateReport(candidates, applications, jobs);
          filename = 'candidate-ranking-report';
          break;
        case 'jobs':
          content = generateJobReport(jobs, applications);
          filename = 'job-performance-report';
          break;
        case 'funnel':
          content = generateFunnelReport(funnelData, applications);
          filename = 'hiring-funnel-report';
          break;
        case 'summary':
          content = generateSummaryReport(stats, candidates, jobs, applications);
          filename = 'weekly-summary-report';
          break;
        case 'department':
          content = generateDepartmentReport(departmentData);
          filename = 'department-summary-report';
          break;
      }

      downloadCSV(content, filename);
    } finally {
      setGeneratingReport(null);
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate and download hiring reports
          </p>
        </div>
        <div className="flex gap-3">
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            options={[
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
              { value: 'all', label: 'All time' }
            ]}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="sm" className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50">
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{candidates.length}</p>
            <p className="text-xs text-gray-500">Candidates</p>
          </div>
        </Card>
        <Card padding="sm" className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50">
            <Briefcase className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{jobs.length}</p>
            <p className="text-xs text-gray-500">Jobs</p>
          </div>
        </Card>
        <Card padding="sm" className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-50">
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{applications.length}</p>
            <p className="text-xs text-gray-500">Applications</p>
          </div>
        </Card>
        <Card padding="sm" className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-50">
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{stats.hiredCount}</p>
            <p className="text-xs text-gray-500">Hired</p>
          </div>
        </Card>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(Object.keys(REPORT_CONFIG) as ReportType[]).map((type) => {
          const config = REPORT_CONFIG[type];

          return (
            <Card key={type} padding="none" className="overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50">
                    {config.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{config.label}</h3>
                    <p className="text-sm text-gray-500 mt-1">{config.description}</p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => generateReport(type, 'csv')}
                  isLoading={generatingReport === type}
                  leftIcon={<FileSpreadsheet className="w-4 h-4" />}
                >
                  CSV
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => generateReport(type, 'pdf')}
                  isLoading={generatingReport === type}
                  leftIcon={<FileOutput className="w-4 h-4" />}
                >
                  PDF
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Custom Report */}
      <Card padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Report</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <Select
            label="Department"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            options={[
              { value: '', label: 'All Departments' },
              ...departments.map(d => ({ value: d, label: d }))
            ]}
          />
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Choose specific filters to generate a custom report tailored to your needs.
        </p>
        <Button
          onClick={() => {
            const filteredApps = departmentFilter
              ? applications.filter(a => {
                  const job = jobs.find(j => j.job_id === a.job_id);
                  return (job?.department || 'General') === departmentFilter;
                })
              : applications;
            const content = generateCustomReport(candidates, filteredApps, jobs, departmentFilter);
            downloadCSV(content, 'custom-report');
          }}
        >
          Generate Custom Report
        </Button>
      </Card>
    </div>
  );
}

// Report generators
function generateCandidateReport(
  candidates: Candidate[],
  applications: Application[],
  jobs: Job[]
): string {
  const rows = [
    ['Rank', 'Candidate ID', 'Name', 'Email', 'Skills', 'Experience', 'Education', 'Score', 'Status', 'Applied Job']
  ];

  const sorted = [...candidates].sort((a, b) => (b.score || 0) - (a.score || 0));

  sorted.forEach((c, idx) => {
    const app = applications.find(a => a.candidate_id === c.candidate_id);
    const job = app ? jobs.find(j => j.job_id === app.job_id) : null;
    rows.push([
      String(idx + 1),
      String(c.candidate_id),
      c.name,
      c.email,
      `"${c.skills}"`,
      String(c.experience_years),
      `"${c.education}"`,
      String(c.score || 0),
      c.status || 'Applied',
      job?.role || 'N/A'
    ]);
  });

  return rows.map(r => r.join(',')).join('\n');
}

function generateJobReport(jobs: Job[], applications: Application[]): string {
  const rows = [
    ['Job ID', 'Role', 'Department', 'Min Experience', 'Applicants', 'Shortlisted', 'Interviewed', 'Hired', 'Conversion Rate']
  ];

  jobs.forEach(job => {
    const jobApps = applications.filter(a => a.job_id === job.job_id);
    const shortlisted = jobApps.filter(a => a.status === 'shortlisted').length;
    const interviewed = jobApps.filter(a => a.status === 'interviewed').length;
    const hired = jobApps.filter(a => a.status === 'hired').length;
    const convRate = jobApps.length > 0 ? Math.round((hired / jobApps.length) * 100) : 0;

    rows.push([
      String(job.job_id),
      job.role,
      job.department || 'General',
      String(job.min_experience),
      String(jobApps.length),
      String(shortlisted),
      String(interviewed),
      String(hired),
      String(convRate) + '%'
    ]);
  });

  return rows.map(r => r.join(',')).join('\n');
}

function generateFunnelReport(
  funnelData: { stage: string; count: number; percentage: number }[],
  applications: Application[]
): string {
  const rows = [
    ['Stage', 'Count', 'Percentage', 'Top Skills']
  ];

  funnelData.forEach(stage => {
    rows.push([
      stage.stage,
      String(stage.count),
      String(stage.percentage) + '%'
    ]);
  });

  rows.push([]);
  rows.push(['Total Applications', String(applications.length)]);

  return rows.map(r => r.join(',')).join('\n');
}

function generateSummaryReport(
  stats: DashboardStats,
  candidates: Candidate[],
  _jobs: Job[],
  applications: Application[]
): string {
  const avgScore = candidates.length > 0
    ? (candidates.reduce((sum, c) => sum + (c.score || 0), 0) / candidates.length).toFixed(1)
    : 0;

  const rows = [
    ['HireAI Copilot - Weekly Recruiter Summary Report'],
    ['Generated', new Date().toISOString().split('T')[0]],
    [],
    ['Key Metrics'],
    ['Total Jobs', String(stats.totalJobs)],
    ['Open Jobs', String(stats.openJobs)],
    ['Total Applications', String(stats.totalApplications)],
    ['Average Score', avgScore + '%'],
    ['Shortlisted', String(stats.shortlistedCount)],
    ['Interviews Scheduled', String(stats.interviewsScheduled)],
    ['Offers Sent', String(stats.offersSent)],
    ['Hired', String(stats.hiredCount)],
    [],
    ['Conversion Rates'],
    ['Applied to Interview', applications.length > 0 ? Math.round((stats.interviewsScheduled / applications.length) * 100) + '%' : '0%'],
    ['Interview to Hire', stats.interviewsScheduled > 0 ? Math.round((stats.hiredCount / stats.interviewsScheduled) * 100) + '%' : '0%'],
  ];

  return rows.map(r => r.join(',')).join('\n');
}

function generateDepartmentReport(departmentData: { department: string; jobs: number; applications: number; hired: number }[]): string {
  const rows = [
    ['Department', 'Jobs', 'Applications', 'Hired', 'Conversion Rate']
  ];

  departmentData.forEach(dept => {
    const convRate = dept.applications > 0 ? Math.round((dept.hired / dept.applications) * 100) : 0;
    rows.push([
      dept.department,
      String(dept.jobs),
      String(dept.applications),
      String(dept.hired),
      convRate + '%'
    ]);
  });

  return rows.map(r => r.join(',')).join('\n');
}

function generateCustomReport(
  candidates: Candidate[],
  applications: Application[],
  jobs: Job[],
  department: string
): string {
  const rows = [
    ['Report Type', 'Custom Report'],
    ['Department Filter', department || 'All'],
    ['Generated', new Date().toISOString()],
    [],
    ['Candidate ID', 'Name', 'Email', 'Score', 'Status', 'Applied Job']
  ];

  applications.forEach(app => {
    const candidate = candidates.find(c => c.candidate_id === app.candidate_id);
    const job = jobs.find(j => j.job_id === app.job_id);

    rows.push([
      String(app.candidate_id),
      candidate?.name || 'Unknown',
      candidate?.email || 'Unknown',
      String(candidate?.score || 0),
      app.status,
      job?.role || 'Unknown'
    ]);
  });

  return rows.map(r => r.join(',')).join('\n');
}
