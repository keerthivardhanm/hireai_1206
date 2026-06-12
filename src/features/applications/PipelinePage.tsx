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
  Loader2,
  CheckSquare
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/input';
import { Badge, ScoreBadge, Avatar } from '../../components/ui/badge';
import { ConfirmDialog } from '../../components/ui/modal';
import { SkeletonPipelineCard } from '../../components/ui/card';
// import { CandidatePanel } from '../../components/candidates/CandidatePanel';
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
  onEditCandidate?: (id: number) => void;
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
  { label: string; color: string; bgColor: string; headerBg: string; icon: React.ReactNode }
> = {
  applied: {
    label: 'Applied',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    headerBg: 'bg-blue-50/95',
    icon: <Clock className="w-4 h-4" />
  },
  shortlisted: {
    label: 'Shortlisted',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
    headerBg: 'bg-amber-50/95',
    icon: <UserPlus className="w-4 h-4" />
  },
  interviewed: {
    label: 'Interviewed',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50 border-violet-200',
    headerBg: 'bg-violet-50/95',
    icon: <Calendar className="w-4 h-4" />
  },
  offered: {
    label: 'Offered',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
    headerBg: 'bg-orange-50/95',
    icon: <Send className="w-4 h-4" />
  },
  hired: {
    label: 'Hired',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 border-emerald-200',
    headerBg: 'bg-emerald-50/95',
    icon: <CheckCircle className="w-4 h-4" />
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    headerBg: 'bg-red-50/95',
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

// Maps the action names used by the shared CandidatePanel's "Quick Actions"
// to the pipeline Stage values used by onStatusChange / onBulkStatusChange.
const PANEL_ACTION_TO_STAGE: Record<string, Stage> = {
  shortlist: 'shortlisted',
  interviewed: 'interviewed',
  hire: 'hired',
  rejected: 'rejected'
};

const BULK_ACTION_OPTIONS: Array<{
  status: Stage;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}> = [
  { status: 'shortlisted', label: 'Shortlist', variant: 'primary' },
  { status: 'interviewed', label: 'Interview', variant: 'secondary' },
  { status: 'offered', label: 'Offer', variant: 'secondary' },
  { status: 'hired', label: 'Hire', variant: 'primary' },
  { status: 'rejected', label: 'Reject', variant: 'danger' }
];

function normalizeStage(value?: string): Stage {
  const normalized = String(value || '').trim().toLowerCase() as Stage;
  return STAGES.includes(normalized) ? normalized : 'applied';
}

function getActionLabel(stage: Stage): string {
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

function getActionVariant(
  stage: Stage
): 'primary' | 'secondary' | 'danger' | 'ghost' {
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
  onViewCandidate,
  onEditCandidate
}: PipelinePageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [draggedAppId, setDraggedAppId] = useState<number | null>(null);
  const [selectedApps, setSelectedApps] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<{ status: Stage; ids: number[] } | null>(null);
  const [lastAction, setLastAction] = useState<{
    appId: number;
    oldStatus: Stage;
    newStatus: Stage;
  } | null>(null);
  const [pendingAppIds, setPendingAppIds] = useState<Set<number>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Side panel state — holds the *application* the panel was opened from,
  // so quick actions taken in the panel know which application to update.
  const [panelApp, setPanelApp] = useState<EnrichedApplication | null>(null);
  const [panelActionPending, setPanelActionPending] = useState(false);

  const candidatesMap = useMemo(() => {
    return new Map(candidates.map((candidate) => [candidate.candidate_id, candidate]));
  }, [candidates]);

  const jobsMap = useMemo(() => {
    return new Map(jobs.map((job) => [job.job_id, job]));
  }, [jobs]);

  const enrichedApplications = useMemo<EnrichedApplication[]>(() => {
    return applications.map((app) => ({
      ...app,
      candidate: candidatesMap.get(app.candidate_id),
      job: jobsMap.get(app.job_id)
    }));
  }, [applications, candidatesMap, jobsMap]);

  const filteredApplications = useMemo<EnrichedApplication[]>(() => {
    let result = enrichedApplications;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
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
      const selectedJobId = Number(jobFilter);
      result = result.filter((app) => app.job_id === selectedJobId);
    }

    return result;
  }, [enrichedApplications, searchQuery, jobFilter]);

  const applicationsByStage = useMemo<Record<Stage, EnrichedApplication[]>>(() => {
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

    STAGES.forEach((stage) => {
      grouped[stage] = grouped[stage].sort((a, b) => {
        const aTime = new Date(a.application_date || 0).getTime();
        const bTime = new Date(b.application_date || 0).getTime();
        return bTime - aTime;
      });
    });

    return grouped;
  }, [filteredApplications]);

  // Keep the open side panel in sync if the underlying application data
  // changes (e.g. status updated elsewhere) while it's open.
  const livePanelApp = useMemo(() => {
    if (!panelApp) return null;
    return (
      enrichedApplications.find((a) => a.application_id === panelApp.application_id) ??
      panelApp
    );
  }, [panelApp, enrichedApplications]);

  const setAppPending = (appId: number, pending: boolean) => {
    setPendingAppIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(appId);
      else next.delete(appId);
      return next;
    });
  };

  const canMoveToStage = (app: EnrichedApplication, targetStage: Stage) => {
    const currentStage = normalizeStage(app.status);
    if (currentStage === targetStage) return false;
    return STAGE_ACTIONS[currentStage].includes(targetStage);
  };

  const updateApplicationStatus = async (
    appId: number,
    oldStatus: Stage,
    newStatus: Stage
  ) => {
    if (oldStatus === newStatus) return;

    setLastAction({ appId, oldStatus, newStatus });
    setAppPending(appId, true);

    try {
      await onStatusChange(appId, newStatus);
    } catch (error) {
      console.error('Failed to update application status:', error);
    } finally {
      setAppPending(appId, false);
      setDraggedAppId(null);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, appId: number) => {
    if (pendingAppIds.has(appId)) return;
    setDraggedAppId(appId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(appId));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, newStage: Stage) => {
    e.preventDefault();

    const draggedId =
      draggedAppId ?? Number(e.dataTransfer.getData('text/plain') || 0);

    if (!draggedId) return;

    const app = enrichedApplications.find(
      (application) => application.application_id === draggedId
    );

    if (!app) {
      setDraggedAppId(null);
      return;
    }

    const oldStage = normalizeStage(app.status);

    if (!canMoveToStage(app, newStage)) {
      setDraggedAppId(null);
      return;
    }

    await updateApplicationStatus(app.application_id, oldStage, newStage);
  };

  const handleUndo = async () => {
    if (!lastAction) return;

    setAppPending(lastAction.appId, true);

    try {
      await onStatusChange(lastAction.appId, lastAction.oldStatus);
      setLastAction(null);
    } catch (error) {
      console.error('Failed to undo status update:', error);
    } finally {
      setAppPending(lastAction.appId, false);
    }
  };

  const handleSelectApp = (appId: number) => {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
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
    } catch (error) {
      console.error('Failed to update bulk application status:', error);
    } finally {
      setIsBulkUpdating(false);
      setBulkAction(null);
    }
  };

  const handleQuickAction = async (
    e: React.MouseEvent<HTMLButtonElement>,
    app: EnrichedApplication,
    newStage: Stage
  ) => {
    e.stopPropagation();

    const oldStage = normalizeStage(app.status);
    if (!canMoveToStage(app, newStage)) return;

    await updateApplicationStatus(app.application_id, oldStage, newStage);
  };

  // ── Card click: select-mode aware ────────────────────────────────────────
  // While at least one card is selected, clicking *any* card (anywhere on
  // its body) toggles its selection instead of opening the side panel —
  // this makes multi-select fast without hunting for checkboxes.
  // With nothing selected, clicking a card opens the candidate's details
  // in the shared right-hand side panel.
  const handleCardClick = (app: EnrichedApplication) => {
    if (pendingAppIds.has(app.application_id)) return;

    if (selectedApps.size > 0) {
      handleSelectApp(app.application_id);
      return;
    }

    setPanelApp(app);
    onViewCandidate(app.candidate_id);
  };

  const closePanel = () => setPanelApp(null);

  const handlePanelEdit = (candidateId: number) => {
    if (onEditCandidate) onEditCandidate(candidateId);
    else onViewCandidate(candidateId);
  };

  const handlePanelBulkAction = async (ids: number[], action: string) => {
    if (!livePanelApp) return;

    const newStage = PANEL_ACTION_TO_STAGE[action];
    if (!newStage) return;

    const oldStage = normalizeStage(livePanelApp.status);
    if (!canMoveToStage(livePanelApp, newStage)) return;

    setPanelActionPending(true);
    try {
      await updateApplicationStatus(livePanelApp.application_id, oldStage, newStage);
      closePanel();
    } finally {
      setPanelActionPending(false);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-gray-50">
      <div
        className={`flex-1 min-h-0 flex flex-col transition-all duration-300 ${
          panelApp ? 'lg:mr-[480px]' : ''
        }`}
      >
        <div className="bg-white border-b border-gray-200 px-4 py-4 lg:px-6 lg:py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900">Hiring Pipeline</h1>
                <p className="text-sm text-gray-500">
                  {filteredApplications.length} applications across all stages
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 xl:justify-end">
              <div className="relative flex-1 sm:min-w-[280px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search candidates, skills or roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800">
                  <CheckSquare className="w-4 h-4" />
                  {selectedApps.size} selected
                </span>
                <span className="text-xs text-emerald-700/70 hidden sm:inline">
                  Click a card to toggle selection
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
                    variant={action.variant || 'primary'}
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

        <div className="flex-1 min-h-0 overflow-hidden p-4 lg:p-6">
          {isLoading ? (
            <div className="h-full overflow-x-auto overflow-y-hidden">
              <div className="grid grid-flow-col auto-cols-[320px] gap-4 min-w-max h-full">
                {STAGES.map((stage) => (
                  <div
                    key={stage}
                    className="h-full min-h-[560px] rounded-2xl border border-gray-200 bg-white p-3"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="animate-pulse bg-gray-200 w-4 h-4 rounded" />
                      <div className="animate-pulse bg-gray-200 h-4 w-24 rounded" />
                    </div>

                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <SkeletonPipelineCard key={index} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full overflow-x-auto overflow-y-hidden">
              <div className="grid grid-flow-col auto-cols-[320px] gap-4 min-w-max h-full items-stretch">
                {STAGES.map((stage) => {
                  const config = STAGE_CONFIG[stage];
                  const stageApps = applicationsByStage[stage];

                  return (
                    <section
                      key={stage}
                      className={`h-full min-h-[560px] flex flex-col rounded-2xl border ${config.bgColor} overflow-hidden`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, stage)}
                    >
                      <div
                        className={`sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-b border-current/10 ${config.headerBg} backdrop-blur-sm`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`${config.color} shrink-0`}>{config.icon}</span>
                          <span className={`font-semibold ${config.color} truncate`}>
                            {config.label}
                          </span>
                        </div>

                        <span
                          className={`text-sm font-medium px-2.5 py-1 rounded-full bg-white/90 ${config.color} shrink-0`}
                        >
                          {stageApps.length}
                        </span>
                      </div>

                      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                        {stageApps.length === 0 ? (
                          <div className="h-full min-h-[180px] flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/50 text-center px-4 text-sm text-gray-400">
                            No applications
                          </div>
                        ) : (
                          stageApps.map((app) => {
                            const currentStage = normalizeStage(app.status);
                            const availableActions = STAGE_ACTIONS[currentStage];
                            const isPending = pendingAppIds.has(app.application_id);
                            const isSelected = selectedApps.has(app.application_id);
                            const isPanelOpen = panelApp?.application_id === app.application_id;
                            const candidateSkills = String(app.candidate?.skills || '')
                              .split(',')
                              .map((skill) => skill.trim())
                              .filter(Boolean)
                              .slice(0, 3);

                            return (
                              <article
                                key={app.application_id}
                                draggable={!isPending}
                                onDragStart={(e) => handleDragStart(e, app.application_id)}
                                onClick={() => handleCardClick(app)}
                                className={[
                                  'bg-white rounded-xl border shadow-sm',
                                  'p-4 transition-all duration-200',
                                  'flex min-h-[220px] flex-col justify-between',
                                  isPending ? 'cursor-wait opacity-70' : 'cursor-pointer hover:shadow-md',
                                  draggedAppId === app.application_id ? 'scale-[0.98] opacity-50' : '',
                                  isSelected
                                    ? 'border-emerald-400 ring-2 ring-emerald-100'
                                    : isPanelOpen
                                    ? 'border-blue-300 ring-2 ring-blue-100'
                                    : 'border-gray-200'
                                ].join(' ')}
                              >
                                <div className="space-y-3">
                                  <div className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleSelectApp(app.application_id)}
                                      onClick={(e) => e.stopPropagation()}
                                      disabled={isPending || isBulkUpdating}
                                      className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                    />

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex items-center gap-3">
                                          <Avatar
                                            name={app.candidate?.name || 'Unknown'}
                                            size="md"
                                          />
                                          <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                              {app.candidate?.name || 'Unknown'}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                              {app.job?.role || 'Unknown role'}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="shrink-0">
                                          {isPending ? (
                                            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                          ) : (
                                            <GripVertical className="w-4 h-4 text-gray-300" />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-start justify-between gap-3">
                                    <div className="shrink-0">
                                      {app.candidate?.score !== undefined ? (
                                        <ScoreBadge score={app.candidate.score} size="sm" />
                                      ) : (
                                        <span className="text-xs text-gray-400">No score</span>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap justify-end gap-1 min-w-0">
                                      {candidateSkills.length > 0 ? (
                                        candidateSkills.map((skill, index) => (
                                          <Badge key={`${app.application_id}-${skill}-${index}`} variant="gray" size="sm">
                                            {skill}
                                          </Badge>
                                        ))
                                      ) : (
                                        <span className="text-xs text-gray-400">No skills</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-gray-400 truncate">
                                      {getRelativeTime(app.application_date)}
                                    </span>

                                    {typeof app.candidate?.experience_years === 'number' && (
                                      <span className="text-xs text-gray-400 shrink-0">
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
                                          variant={getActionVariant(action)}
                                          onClick={(e) => handleQuickAction(e, app, action)}
                                          disabled={isPending || isBulkUpdating}
                                        >
                                          {getActionLabel(action)}
                                        </Button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </article>
                            );
                          })
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={bulkAction !== null}
        onClose={() => {
          if (!isBulkUpdating) setBulkAction(null);
        }}
        onConfirm={executeBulkAction}
        title={`Move ${bulkAction?.ids.length ?? 0} Applications`}
        message={`Are you sure you want to move ${
          bulkAction?.ids.length ?? 0
        } applications to ${
          bulkAction ? STAGE_CONFIG[bulkAction.status].label : ''
        }?`}
        confirmLabel={isBulkUpdating ? 'Processing...' : 'Confirm'}
        variant="warning"
      />

      {/* ── Shared candidate side panel ── */}
      {livePanelApp?.candidate && (
        <CandidatePanel
          candidate={livePanelApp.candidate}
          applications={applications}
          jobs={jobs}
          onClose={closePanel}
          onEdit={handlePanelEdit}
          onBulkAction={handlePanelBulkAction}
        />
      )}

      {panelActionPending && (
        <div className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm shadow-lg">
          <Loader2 className="w-4 h-4 animate-spin" /> Updating status…
        </div>
      )}
    </div>
  );
}