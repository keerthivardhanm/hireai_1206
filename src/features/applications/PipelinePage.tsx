import React, { useMemo, useState } from 'react';
import {
  Search,
  UserPlus,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  GripVertical,
  Undo2,
  Briefcase,
  Loader2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/input';
import { Badge, ScoreBadge, Avatar } from '../../components/ui/badge';
import { ConfirmDialog } from '../../components/ui/modal';
import { SkeletonPipelineCard } from '../../components/ui/card';
import type { Candidate, Application, Job } from '../../types';
import { getRelativeTime } from '../../utils/chart-utils';

interface PipelinePageProps {
  applications: Application[];
  candidates: Candidate[];
  jobs: Job[];
  isLoading?: boolean;
  onStatusChange: (applicationId: number, status: string) => Promise<void>;
  onBulkStatusChange: (applicationIds: number[], status: string) => Promise<void>;
  onViewCandidate: (id: number) => void;
}

type Stage =
  | 'applied'
  | 'shortlisted'
  | 'interviewed'
  | 'offered'
  | 'hired'
  | 'rejected';

type EnrichedApplication = Application & {
  candidate?: Candidate;
  job?: Job;
};

const STAGES: Stage[] = [
  'applied',
  'shortlisted',
  'interviewed',
  'offered',
  'hired',
  'rejected'
];

const STAGE_CONFIG: Record<
  Stage,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  applied: {
    label: 'Applied',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: <Clock className="w-4 h-4" />
  },
  shortlisted: {
    label: 'Shortlisted',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200',
    icon: <UserPlus className="w-4 h-4" />
  },
  interviewed: {
    label: 'Interviewed',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
    icon: <Calendar className="w-4 h-4" />
  },
  offered: {
    label: 'Offered',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
    icon: <Send className="w-4 h-4" />
  },
  hired: {
    label: 'Hired',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 border-emerald-200',
    icon: <CheckCircle className="w-4 h-4" />
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    icon: <XCircle className="w-4 h-4" />
  }
};

const STAGE_ACTIONS: Record<Stage, Stage[]> = {
  applied: ['shortlisted', 'rejected'],
  shortlisted: ['interviewed', 'rejected'],
  interviewed: ['offered', 'rejected'],
  offered: ['hired', 'rejected'],
  hired: [],
  rejected: []
};

const BULK_ACTION_OPTIONS: { status: Stage; label: string; variant?: string }[] = [
  { status: 'shortlisted', label: 'Shortlist' },
  { status: 'interviewed', label: 'Interview', variant: 'secondary' },
  { status: 'offered', label: 'Offer', variant: 'secondary' },
  { status: 'hired', label: 'Hire' },
  { status: 'rejected', label: 'Reject', variant: 'danger' }
];

function normalizeStage(value?: string): Stage {
  const normalized = value?.toLowerCase() as Stage | undefined;
  return STAGES.includes(normalized as Stage) ? (normalized as Stage) : 'applied';
}

function getActionLabel(stage: Stage) {
  switch (stage) {
    case 'shortlisted':
      return 'Shortlist';
    case 'interviewed':
      return 'Interview';
    case 'offered':
      return 'Offer';
    case 'hired':
      return 'Hire';
    case 'rejected':
      return 'Reject';
    default:
      return stage;
  }
}

function getActionVariant(stage: Stage) {
  if (stage === 'rejected') return 'danger';
  if (stage === 'hired') return 'primary';
  return 'secondary';
}

export function PipelinePage({
  applications,
  candidates,
  jobs,
  isLoading = false,
  onStatusChange,
  onBulkStatusChange,
  onViewCandidate
}: PipelinePageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [draggedApp, setDraggedApp] = useState<EnrichedApplication | null>(null);
  const [selectedApps, setSelectedApps] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<{ status: Stage; ids: number[] } | null>(null);
  const [lastAction, setLastAction] = useState<{
    appId: number;
    oldStatus: Stage;
    newStatus: Stage;
  } | null>(null);
  const [pendingAppIds, setPendingAppIds] = useState<Set<number>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const filteredApplications = useMemo<EnrichedApplication[]>(() => {
    let result = applications.map((app) => {
      const candidate = candidates.find((c) => c.candidate_id === app.candidate_id);
      const job = jobs.find((j) => j.job_id === app.job_id);
      return { ...app, candidate, job };
    });

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((app) => {
        const candidateName = app.candidate?.name?.toLowerCase() ?? '';
        const candidateSkills = app.candidate?.skills?.toLowerCase() ?? '';
        const jobRole = app.job?.role?.toLowerCase() ?? '';

        return (
          candidateName.includes(query) ||
          candidateSkills.includes(query) ||
          jobRole.includes(query)
        );
      });
    }

    if (jobFilter) {
      result = result.filter((app) => app.job_id === Number(jobFilter));
    }

    return result;
  }, [applications, candidates, jobs, searchQuery, jobFilter]);

  const applicationsByStage = useMemo(() => {
    const grouped: Record<Stage, EnrichedApplication[]> = {
      applied: [],
      shortlisted: [],
      interviewed: [],
      offered: [],
      hired: [],
      rejected: []
    };

    filteredApplications.forEach((app) => {
      grouped[normalizeStage(app.status)].push(app);
    });

    return grouped;
  }, [filteredApplications]);

  const setAppPending = (appId: number, pending: boolean) => {
    setPendingAppIds((prev) => {
      const next = new Set(prev);
      if (pending) {
        next.add(appId);
      } else {
        next.delete(appId);
      }
      return next;
    });
  };

  const canMoveToStage = (app: EnrichedApplication, targetStage: Stage) => {
    const currentStage = normalizeStage(app.status);
    if (currentStage === targetStage) return false;
    return STAGE_ACTIONS[currentStage]?.includes(targetStage) || false;
  };

  const updateApplicationStatus = async (
    appId: number,
    oldStatus: Stage,
    newStatus: Stage
  ) => {
    if (oldStatus === newStatus) return;

    setLastAction({
      appId,
      oldStatus,
      newStatus
    });

    setAppPending(appId, true);

    try {
      await onStatusChange(appId, newStatus);
    } finally {
      setAppPending(appId, false);
      setDraggedApp(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, app: EnrichedApplication) => {
    if (pendingAppIds.has(app.application_id)) return;

    setDraggedApp(app);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStage: Stage) => {
    e.preventDefault();
    if (!draggedApp) return;

    const oldStage = normalizeStage(draggedApp.status);
    if (!canMoveToStage(draggedApp, newStage)) {
      setDraggedApp(null);
      return;
    }

    await updateApplicationStatus(draggedApp.application_id, oldStage, newStage);
  };

  const handleUndo = async () => {
    if (!lastAction) return;

    setAppPending(lastAction.appId, true);

    try {
      await onStatusChange(lastAction.appId, lastAction.oldStatus);
      setLastAction(null);
    } catch (error) {
      console.error('Failed to undo:', error);
    } finally {
      setAppPending(lastAction.appId, false);
    }
  };

  const handleSelectApp = (appId: number) => {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  const handleBulkAction = (status: Stage) => {
    const ids = Array.from(selectedApps);
    if (ids.length === 0) return;
    setBulkAction({ status, ids });
  };

  const executeBulkAction = async () => {
    if (!bulkAction) return;

    setIsBulkUpdating(true);

    try {
      await onBulkStatusChange(bulkAction.ids, bulkAction.status);
      setSelectedApps(new Set());
    } finally {
      setIsBulkUpdating(false);
      setBulkAction(null);
    }
  };

  const handleQuickAction = async (
    e: React.MouseEvent,
    app: EnrichedApplication,
    newStage: Stage
  ) => {
    e.stopPropagation();

    const oldStage = normalizeStage(app.status);
    if (!canMoveToStage(app, newStage)) return;

    await updateApplicationStatus(app.application_id, oldStage, newStage);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-4 lg:px-6 lg:py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hiring Pipeline</h1>
              <p className="text-sm text-gray-500">
                {filteredApplications.length} applications across all stages
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 sm:min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search candidates, skills or roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:min-w-[220px]">
              <Select
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Jobs' },
                  ...jobs.map((job) => ({
                    value: String(job.job_id),
                    label: job.role
                  }))
                ]}
              />
            </div>
          </div>
        </div>

        {selectedApps.size > 0 && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-emerald-800">
                {selectedApps.size} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedApps(new Set())}
                disabled={isBulkUpdating}
              >
                Clear
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {BULK_ACTION_OPTIONS.map((action) => (
                <Button
                  key={action.status}
                  size="sm"
                  variant={(action.variant as any) || 'primary'}
                  onClick={() => handleBulkAction(action.status)}
                  disabled={isBulkUpdating}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {lastAction && (
          <div className="mt-4 p-4 bg-gray-100 rounded-xl flex items-center justify-between gap-4">
            <span className="text-sm text-gray-700">
              Moved application to {STAGE_CONFIG[lastAction.newStatus].label}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              leftIcon={<Undo2 className="w-4 h-4" />}
              disabled={pendingAppIds.has(lastAction.appId)}
            >
              Undo
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-x-auto p-4 lg:p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 min-w-[1560px] 2xl:min-w-0">
            {STAGES.map((stage) => (
              <div key={stage} className="min-w-[250px] rounded-xl border bg-gray-50 p-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="animate-pulse bg-gray-200 w-4 h-4 rounded" />
                  <div className="animate-pulse bg-gray-200 h-4 w-24 rounded" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonPipelineCard key={i} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-flow-col auto-cols-[280px] xl:grid-flow-row xl:grid-cols-3 2xl:grid-cols-6 gap-4 min-w-max 2xl:min-w-0 items-start">
            {STAGES.map((stage) => {
              const config = STAGE_CONFIG[stage];
              const stageApps = applicationsByStage[stage];

              return (
                <div
                  key={stage}
                  className={`h-[calc(100vh-240px)] min-h-[560px] flex flex-col rounded-xl border-2 ${config.bgColor}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage)}
                >
                  <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-current/10 bg-white/70 backdrop-blur-sm rounded-t-xl">
                    <div className="flex items-center gap-2">
                      <span className={config.color}>{config.icon}</span>
                      <span className={`font-semibold ${config.color}`}>{config.label}</span>
                    </div>
                    <span
                      className={`text-sm font-medium px-2.5 py-1 rounded-full bg-white/80 ${config.color}`}
                    >
                      {stageApps.length}
                    </span>
                  </div>

                  <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                    {stageApps.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center px-4 text-sm text-gray-400">
                        No applications
                      </div>
                    ) : (
                      stageApps.map((app) => {
                        const currentStage = normalizeStage(app.status);
                        const availableActions = STAGE_ACTIONS[currentStage];
                        const isPending = pendingAppIds.has(app.application_id);
                        const candidateSkills = (app.candidate?.skills ?? '')
                          .split(',')
                          .map((skill) => skill.trim())
                          .filter(Boolean)
                          .slice(0, 3);

                        return (
                          <div
                            key={app.application_id}
                            draggable={!isPending}
                            onDragStart={(e) => handleDragStart(e, app)}
                            onClick={() => !isPending && onViewCandidate(app.candidate_id)}
                            className={`
                              bg-white rounded-xl shadow-sm border border-gray-100
                              p-4 hover:shadow-md transition-all
                              flex flex-col justify-between min-h-[220px]
                              ${isPending ? 'opacity-70 cursor-wait' : 'cursor-pointer'}
                              ${
                                draggedApp?.application_id === app.application_id
                                  ? 'opacity-50 scale-[0.98]'
                                  : ''
                              }
                            `}
                          >
                            <div>
                              <div className="flex items-start gap-3 mb-3">
                                <input
                                  type="checkbox"
                                  checked={selectedApps.has(app.application_id)}
                                  onChange={() => handleSelectApp(app.application_id)}
                                  onClick={(e) => e.stopPropagation()}
                                  disabled={isPending || isBulkUpdating}
                                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <Avatar name={app.candidate?.name || 'Unknown'} size="md" />
                                    {isPending ? (
                                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                    ) : (
                                      <GripVertical className="w-4 h-4 text-gray-300" />
                                    )}
                                  </div>

                                  <div className="mt-2">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                      {app.candidate?.name || 'Unknown'}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                      {app.job?.role || 'Unknown role'}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 mb-3">
                                {app.candidate?.score !== undefined ? (
                                  <ScoreBadge score={app.candidate.score} size="sm" />
                                ) : (
                                  <span className="text-xs text-gray-400">No score</span>
                                )}

                                <div className="flex-1 flex flex-wrap justify-end gap-1">
                                  {candidateSkills.length > 0 ? (
                                    candidateSkills.map((skill, idx) => (
                                      <Badge key={idx} variant="gray" size="sm">
                                        {skill}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-xs text-gray-400">No skills</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-gray-400">
                                  {getRelativeTime(app.application_date)}
                                </span>

                                {typeof app.candidate?.experience_years === 'number' && (
                                  <span className="text-xs text-gray-400">
                                    {app.candidate.experience_years}y exp
                                  </span>
                                )}
                              </div>

                              {availableActions.length > 0 && (
                                <div
                                  className="flex flex-wrap gap-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {availableActions.map((action) => (
                                    <Button
                                      key={action}
                                      size="sm"
                                      variant={getActionVariant(action) as any}
                                      onClick={(e) => handleQuickAction(e, app, action)}
                                      disabled={isPending || isBulkUpdating}
                                    >
                                      {getActionLabel(action)}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={bulkAction !== null}
        onClose={() => !isBulkUpdating && setBulkAction(null)}
        onConfirm={executeBulkAction}
        title={`Move ${bulkAction?.ids.length ?? 0} Applications`}
        message={`Are you sure you want to move ${
          bulkAction?.ids.length ?? 0
        } applications to ${bulkAction ? STAGE_CONFIG[bulkAction.status].label : ''}?`}
        confirmLabel={isBulkUpdating ? 'Processing...' : 'Confirm'}
        variant="warning"
      />
    </div>
  );
}