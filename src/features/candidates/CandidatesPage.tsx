import { useState, useMemo } from 'react';
import {
  UserPlus,
  Search,
  Filter,
  Download,
  Trash2,
  ChevronDown,
  Briefcase,
  Eye,
  Edit3,
  UserCheck,
  UserX,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/input';
import { EmptyState, SkeletonCandidateRow } from '../../components/ui/card';
import { Badge, ScoreBadge, Avatar } from '../../components/ui/badge';
import { ConfirmDialog } from '../../components/ui/modal';
import type { Candidate, Application, Job } from '../../types';
import { getStatusColor } from '../../utils/chart-utils';

interface CandidatesPageProps {
  candidates: Candidate[];
  jobs: Job[];
  applications: Application[];
  isLoading: boolean;
  onCreateCandidate: () => void;
  onViewCandidate: (id: number) => void;
  onEditCandidate: (id: number) => void;
  onBulkAction: (ids: number[], action: string) => void;
  onRefresh?: () => void;
}

type SortField = 'name' | 'score' | 'experience_years' | 'created_at' | 'status';
type SortOrder = 'asc' | 'desc';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'applied', label: 'Applied' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interviewed', label: 'Interviewed' },
  { value: 'offered', label: 'Offered' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' }
];

const ITEMS_PER_PAGE = 25;

export function CandidatesPage({
  candidates,
  jobs,
  applications,
  isLoading,
  onCreateCandidate,
  onViewCandidate,
  onEditCandidate,
  onBulkAction,
  onRefresh
}: CandidatesPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [minScore, setMinScore] = useState('');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ action: string; ids: number[] } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredCandidates = useMemo(() => {
    let result = [...candidates];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.skills.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      result = result.filter(c => c.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    if (jobFilter) {
      const jobId = parseInt(jobFilter);
      const candidateIdsForJob = applications
        .filter(a => a.job_id === jobId)
        .map(a => a.candidate_id);
      result = result.filter(c => candidateIdsForJob.includes(c.candidate_id));
    }

    if (minScore) {
      const min = parseInt(minScore);
      result = result.filter(c => (c.score || 0) >= min);
    }

    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'score':
          aVal = a.score || 0;
          bVal = b.score || 0;
          break;
        case 'experience_years':
          aVal = a.experience_years;
          bVal = b.experience_years;
          break;
        case 'status':
          aVal = a.status || 'applied';
          bVal = b.status || 'applied';
          break;
        case 'created_at':
          aVal = a.created_at || '';
          bVal = b.created_at || '';
          break;
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });

    return result;
  }, [candidates, searchQuery, statusFilter, jobFilter, minScore, sortField, sortOrder, applications]);

  const totalPages = Math.ceil(filteredCandidates.length / ITEMS_PER_PAGE);
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCandidates.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCandidates, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    setSelectedIds(new Set());
  };

  const handleSelectAll = () => {
    if (selectedIds.size === paginatedCandidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedCandidates.map(c => c.candidate_id)));
    }
  };

  const handleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkAction = (action: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setConfirmAction({ action, ids });
  };

  const executeBulkAction = () => {
    if (confirmAction) {
      onBulkAction(confirmAction.ids, confirmAction.action);
      setSelectedIds(new Set());
      setConfirmAction(null);
    }
  };

  const exportCandidates = () => {
    const data = selectedIds.size > 0
      ? candidates.filter(c => selectedIds.has(c.candidate_id))
      : filteredCandidates;

    const csv = [
      ['ID', 'Name', 'Email', 'Skills', 'Experience', 'Education', 'Score', 'Status'].join(','),
      ...data.map(c => [
        c.candidate_id,
        `"${c.name}"`,
        c.email,
        `"${c.skills}"`,
        c.experience_years,
        `"${c.education}"`,
        c.score || 0,
        c.status || 'applied'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidates-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredCandidates.length} of {candidates.length} candidates
            {totalPages > 1 && ` - Page ${currentPage} of ${totalPages}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportCandidates} leftIcon={<Download className="w-4 h-4" />}>
            Export
          </Button>
          <Button onClick={onCreateCandidate} leftIcon={<UserPlus className="w-4 h-4" />}>
            Add Candidate
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or skills..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            leftIcon={<Filter className="w-4 h-4" />}
            rightIcon={<ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />}
          >
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              options={STATUS_OPTIONS}
            />
            <Select
              label="Job"
              value={jobFilter}
              onChange={(e) => { setJobFilter(e.target.value); setCurrentPage(1); }}
              options={[
                { value: '', label: 'All Jobs' },
                ...jobs.map(j => ({ value: String(j.job_id), label: j.role }))
              ]}
            />
            <Select
              label="Min Score"
              value={minScore}
              onChange={(e) => { setMinScore(e.target.value); setCurrentPage(1); }}
              options={[
                { value: '', label: 'Any Score' },
                { value: '80', label: '80%+' },
                { value: '60', label: '60%+' },
                { value: '40', label: '40%+' },
                { value: '20', label: '20%+' }
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
                { value: 'score-desc', label: 'Highest Score' },
                { value: 'score-asc', label: 'Lowest Score' },
                { value: 'name-asc', label: 'Name A-Z' },
                { value: 'name-desc', label: 'Name Z-A' },
                { value: 'experience_years-desc', label: 'Most Experience' },
                { value: 'created_at-desc', label: 'Newest First' }
              ]}
            />
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-emerald-800">
              {selectedIds.size} selected
            </span>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => handleBulkAction('shortlist')}>
              <UserCheck className="w-4 h-4 mr-1.5" />
              Shortlist
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleBulkAction('interviewed')}>
              <Calendar className="w-4 h-4 mr-1.5" />
              Interview
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleBulkAction('rejected')}>
              <UserX className="w-4 h-4 mr-1.5" />
              Reject
            </Button>
            <Button size="sm" variant="danger" onClick={() => handleBulkAction('delete')}>
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === paginatedCandidates.length && paginatedCandidates.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skills</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Experience</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <SkeletonCandidateRow key={i} />
                ))
              ) : paginatedCandidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12">
                    <EmptyState
                      icon={<UserPlus className="w-6 h-6" />}
                      title="No candidates found"
                      description={searchQuery || statusFilter ? "Try adjusting your filters" : "Add your first candidate to get started"}
                      action={
                        !searchQuery && !statusFilter && (
                          <Button onClick={onCreateCandidate}>Add Candidate</Button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginatedCandidates.map((candidate) => (
                  <tr
                    key={candidate.candidate_id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(candidate.candidate_id)}
                        onChange={() => handleSelect(candidate.candidate_id)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onViewCandidate(candidate.candidate_id)}
                        className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                      >
                        <Avatar name={candidate.name} size="md" />
                        <div>
                          <p className="font-medium text-gray-900">{candidate.name}</p>
                          <p className="text-sm text-gray-500">{candidate.email}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {candidate.skills.split(',').slice(0, 3).map((skill, idx) => (
                          <Badge key={idx} variant="gray" size="sm">
                            {skill.trim()}
                          </Badge>
                        ))}
                        {candidate.skills.split(',').length > 3 && (
                          <Badge variant="gray" size="sm">+{candidate.skills.split(',').length - 3}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{candidate.experience_years} years</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {candidate.score !== undefined ? (
                        <ScoreBadge score={candidate.score} />
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(candidate.status || 'applied')}`}>
                        {candidate.status || 'Applied'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onViewCandidate(candidate.candidate_id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditCandidate(candidate.candidate_id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-100">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4">
                <SkeletonCandidateRow />
              </div>
            ))
          ) : paginatedCandidates.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<UserPlus className="w-6 h-6" />}
                title="No candidates found"
                action={!searchQuery && !statusFilter && <Button onClick={onCreateCandidate}>Add Candidate</Button>}
              />
            </div>
          ) : (
            paginatedCandidates.map((candidate) => (
              <div
                key={candidate.candidate_id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(candidate.candidate_id)}
                    onChange={() => handleSelect(candidate.candidate_id)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => onViewCandidate(candidate.candidate_id)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={candidate.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{candidate.name}</p>
                        <p className="text-sm text-gray-500 truncate">{candidate.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(candidate.status || 'applied')}`}>
                            {candidate.status || 'Applied'}
                          </span>
                          {candidate.score !== undefined && (
                            <ScoreBadge score={candidate.score} size="sm" />
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditCandidate(candidate.candidate_id); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredCandidates.length)} of {filteredCandidates.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium ${
                      currentPage === pageNum
                        ? 'bg-emerald-600 text-white'
                        : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeBulkAction}
        title={`${confirmAction?.action.charAt(0).toUpperCase()}${confirmAction?.action.slice(1)} Candidates`}
        message={`Are you sure you want to ${confirmAction?.action} ${confirmAction?.ids.length} selected candidates?`}
        confirmLabel="Confirm"
        variant={confirmAction?.action === 'delete' ? 'danger' : 'warning'}
      />
    </div>
  );
}
