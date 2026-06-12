import type {
  Candidate,
  Application,
  Job,
  FunnelData,
  ScoreDistribution,
  TrendData,
  DepartmentData,
  SkillGap,
  DashboardStats
} from '../types';

const STAGES_ORDER = ['applied', 'shortlisted', 'interviewed', 'offered', 'hired', 'rejected'] as const;

export function calculateDashboardStats(
  jobs: Job[],
  applications: Application[],
  candidates: Candidate[]
): DashboardStats {
  const totalJobs = jobs.filter(j => j.status === 'open').length || jobs.length;
  const totalApplications = applications.length;
  const hiredCount = applications.filter(a => a.status === 'hired').length;
  const shortlistedCount = applications.filter(a => a.status === 'shortlisted').length;
  const interviewsScheduled = applications.filter(a => a.status === 'interviewed').length;
  const offersSent = applications.filter(a => a.status === 'offered').length;

  const scoresWithValue = candidates.filter(c => c.score !== undefined && c.score > 0);
  const averageScore = scoresWithValue.length > 0
    ? scoresWithValue.reduce((sum, c) => sum + (c.score || 0), 0) / scoresWithValue.length
    : 0;

  return {
    totalJobs,
    totalApplications,
    averageScore: Math.round(averageScore * 10) / 10,
    hiredCount,
    openJobs: totalJobs,
    shortlistedCount,
    interviewsScheduled,
    offersSent
  };
}

export function calculateFunnelData(applications: Application[]): FunnelData[] {
  const stageCounts = STAGES_ORDER.reduce((acc, stage) => {
    acc[stage] = applications.filter(a => a.status?.toLowerCase() === stage).length;
    return acc;
  }, {} as Record<string, number>);

  const total = applications.length || 1;

  return STAGES_ORDER.map(stage => ({
    stage: stage.charAt(0).toUpperCase() + stage.slice(1),
    count: stageCounts[stage],
    percentage: Math.round((stageCounts[stage] / total) * 100)
  }));
}

export function calculateScoreDistribution(candidates: Candidate[]): ScoreDistribution[] {
  const ranges = [
    { label: '0-20', min: 0, max: 20 },
    { label: '21-40', min: 21, max: 40 },
    { label: '41-60', min: 41, max: 60 },
    { label: '61-80', min: 61, max: 80 },
    { label: '81-100', min: 81, max: 100 }
  ];

  const total = candidates.length || 1;

  return ranges.map(range => {
    const count = candidates.filter(c => {
      const score = c.score || 0;
      return score >= range.min && score <= range.max;
    }).length;

    return {
      range: range.label,
      count,
      percentage: Math.round((count / total) * 100)
    };
  });
}

export function calculateTrendData(applications: Application[]): TrendData[] {
  const dateMap = new Map<string, { applications: number; hired: number }>();

  applications.forEach(app => {
    const date = new Date(app.application_date).toISOString().split('T')[0];
    const existing = dateMap.get(date) || { applications: 0, hired: 0 };
    existing.applications++;
    if (app.status === 'hired') {
      existing.hired++;
    }
    dateMap.set(date, existing);
  });

  const sortedDates = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30);

  return sortedDates.map(([date, data]) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    applications: data.applications,
    hired: data.hired
  }));
}

export function calculateDepartmentData(jobs: Job[], applications: Application[]): DepartmentData[] {
  const deptMap = new Map<string, { jobs: Set<number>; applications: number; hired: number }>();

  jobs.forEach(job => {
    const dept = job.department || 'General';
    if (!deptMap.has(dept)) {
      deptMap.set(dept, { jobs: new Set(), applications: 0, hired: 0 });
    }
    const deptData = deptMap.get(dept)!;
    deptData.jobs.add(job.job_id);
  });

  applications.forEach(app => {
    const job = jobs.find(j => j.job_id === app.job_id);
    const dept = job?.department || 'General';
    const deptData = deptMap.get(dept);
    if (deptData) {
      deptData.applications++;
      if (app.status === 'hired') {
        deptData.hired++;
      }
    }
  });

  return Array.from(deptMap.entries()).map(([department, data]) => ({
    department,
    jobs: data.jobs.size,
    applications: data.applications,
    hired: data.hired
  }));
}

export function calculateSkillGap(jobs: Job[], candidates: Candidate[]): SkillGap[] {
  const skillDemand = new Map<string, number>();
  const skillSupply = new Map<string, number>();

  jobs.forEach(job => {
    const skills = job.required_skills.split(',').map(s => s.trim().toLowerCase());
    skills.forEach(skill => {
      skillDemand.set(skill, (skillDemand.get(skill) || 0) + 1);
    });
  });

  candidates.forEach(candidate => {
    const skills = candidate.skills.split(',').map(s => s.trim().toLowerCase());
    skills.forEach(skill => {
      skillSupply.set(skill, (skillSupply.get(skill) || 0) + 1);
    });
  });

  const allSkills = new Set([...skillDemand.keys(), ...skillSupply.keys()]);

  return Array.from(allSkills)
    .map(skill => ({
      skill: skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      demand: skillDemand.get(skill) || 0,
      supply: skillSupply.get(skill) || 0,
      gap: (skillDemand.get(skill) || 0) - (skillSupply.get(skill) || 0)
    }))
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
    .slice(0, 10);
}

export function getTopCandidates(candidates: Candidate[], limit = 10): Candidate[] {
  return [...candidates]
    .filter(c => c.score !== undefined)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, limit);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    applied: 'bg-blue-100 text-blue-800',
    shortlisted: 'bg-yellow-100 text-yellow-800',
    interviewed: 'bg-purple-100 text-purple-800',
    offered: 'bg-orange-100 text-orange-800',
    hired: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    open: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
    archived: 'bg-gray-100 text-gray-600',
    draft: 'bg-slate-100 text-slate-600'
  };
  return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

export function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: 'text-green-600' };
  if (score >= 60) return { label: 'Good', color: 'text-blue-600' };
  if (score >= 40) return { label: 'Average', color: 'text-yellow-600' };
  return { label: 'Needs Review', color: 'text-red-600' };
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}
