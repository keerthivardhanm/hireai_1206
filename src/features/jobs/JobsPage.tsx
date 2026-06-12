import { useState, useMemo } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  MoreVertical,
  MapPin,
  Clock,
  Users,
  DollarSign,
  Edit3,
  Archive,
  Trash2,
  Eye
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/input';
import { Card, EmptyState, StatCard, SkeletonStatCard, SkeletonJobCard } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ConfirmDialog } from '../../components/ui/modal';
import type { Job, Application } from '../../types';
import { getStatusColor } from '../../utils/chart-utils';

interface JobsPageProps {
  jobs: Job[];
  applications: Application[];
  isLoading?: boolean;
  onCreateJob: () => void;
  onViewJob: (id: number) => void;
  onEditJob: (id: number) => void;
  onDeleteJob: (id: number) => void;
  onCloneJob?: (id: number) => void;
}

type SortField = 'role' | 'applicants_count' | 'created_at' | 'status';
type SortOrder = 'asc' | 'desc';

export function JobsPage({
  jobs,
  applications,
  isLoading = false,
  onCreateJob,
  onViewJob,
  onEditJob,
  onDeleteJob
}: JobsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);

  const jobStats = useMemo(() => {
    const open = jobs.filter(j => j.status === 'open').length || jobs.length;
    const closed = jobs.filter(j => j.status === 'closed').length;
    const totalApps = applications.length;
    const avgAppsPerJob = jobs.length > 0 ? Math.round(totalApps / jobs.length) : 0;
    return { open, closed, totalApps, avgAppsPerJob };
  }, [jobs, applications]);

  const departments = useMemo(() => {
    const depts = new Set(jobs.map(j => j.department || 'General'));
    return Array.from(depts);
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(j =>
        j.role.toLowerCase().includes(query) ||
        j.required_skills.toLowerCase().includes(query) ||
        (j.department || '').toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      result = result.filter(j => j.status === statusFilter);
    }

    if (departmentFilter) {
      result = result.filter(j => (j.department || 'General') === departmentFilter);
    }

    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'role':
          aVal = a.role;
          bVal = b.role;
          break;
        case 'applicants_count':
          aVal = a.applicants_count || 0;
          bVal = b.applicants_count || 0;
          break;
        case 'created_at':
          aVal = a.created_at || '';
          bVal = b.created_at || '';
          break;
        case 'status':
          aVal = a.status || 'open';
          bVal = b.status || 'open';
          break;
      }

      return sortOrder === 'asc' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
    });

    return result;
  }, [jobs, searchQuery, statusFilter, departmentFilter, sortField, sortOrder]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your open positions and hiring pipelines
          </p>
        </div>
        <Button onClick={onCreateJob} leftIcon={<Plus className="w-4 h-4" />}>
          Create Job
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Open Jobs"
          value={jobStats.open}
          icon={<Briefcase className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Closed Jobs"
          value={jobStats.closed}
          icon={<Archive className="w-5 h-5" />}
          color="gray"
        />
        <StatCard
          title="Total Applications"
          value={jobStats.totalApps}
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Avg per Job"
          value={jobStats.avgAppsPerJob}
          icon={<Clock className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by role, skills, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            leftIcon={<Filter className="w-4 h-4" />}
          >
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'open', label: 'Open' },
                { value: 'closed', label: 'Closed' },
                { value: 'archived', label: 'Archived' },
                { value: 'draft', label: 'Draft' }
              ]}
            />
            <Select
              label="Department"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              options={[
                { value: '', label: 'All Departments' },
                ...departments.map(d => ({ value: d, label: d }))
              ]}
            />
            <Select
              label="Sort By"
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
                setSortField(field);
                setSortOrder(order);
              }}
              options={[
                { value: 'created_at-desc', label: 'Newest First' },
                { value: 'created_at-asc', label: 'Oldest First' },
                { value: 'applicants_count-desc', label: 'Most Applicants' },
                { value: 'role-asc', label: 'Role A-Z' }
              ]}
            />
          </div>
        )}
      </div>

      {/* Jobs Grid */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonJobCard key={i} />
            ))}
          </div>
        </div>
      ) : filteredJobs.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Briefcase className="w-6 h-6" />}
            title="No jobs found"
            description={searchQuery || statusFilter ? 'Try adjusting your filters' : 'Create your first job posting'}
            action={!searchQuery && !statusFilter && <Button onClick={onCreateJob}>Create Job</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => {
            const jobApps = applications.filter(a => a.job_id === job.job_id);
            const hiredCount = jobApps.filter(a => a.status === 'hired').length;

            return (
              <Card
                key={job.job_id}
                padding="none"
                hover
                onClick={() => onViewJob(job.job_id)}
                className="overflow-hidden"
              >
                <div className="p-4 lg:p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{job.role}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="gray" size="sm">{job.department || 'General'}</Badge>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(activeMenu === job.job_id ? null : job.job_id);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {activeMenu === job.job_id && (
                        <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                          <button
                            onClick={(e) => { e.stopPropagation(); onViewJob(job.job_id); setActiveMenu(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Eye className="w-4 h-4" /> View
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onEditJob(job.job_id); setActiveMenu(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit3 className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(job.job_id);
                              setActiveMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{job.location || 'Remote'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      <span>Min {job.min_experience} years experience</span>
                    </div>
                    {job.salary_min && job.salary_max && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span>${(job.salary_min / 1000).toFixed(0)}K - ${(job.salary_max / 1000).toFixed(0)}K</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-2">Required Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {job.required_skills.split(',').slice(0, 4).map((skill, idx) => (
                        <Badge key={idx} variant="info" size="sm">{skill.trim()}</Badge>
                      ))}
                      {job.required_skills.split(',').length > 4 && (
                        <Badge variant="gray" size="sm">+{job.required_skills.split(',').length - 4}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-4 lg:px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-gray-600">
                      <Users className="w-4 h-4" />
                      {jobApps.length} applicants
                    </span>
                    {hiredCount > 0 && (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <Users className="w-4 h-4" />
                        {hiredCount} hired
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status || 'open')}`}>
                    {job.status || 'Open'}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) onDeleteJob(deleteConfirm);
          setDeleteConfirm(null);
        }}
        title="Delete Job"
        message="Are you sure you want to delete this job? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
