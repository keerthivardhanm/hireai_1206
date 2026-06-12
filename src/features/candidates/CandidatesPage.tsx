  import { useState, useMemo, useEffect, useRef } from 'react';
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
    ChevronRight,
    X,
    Mail,
    Phone,
    MapPin,
    Star,
    Clock,
    GraduationCap,
    Award,
    TrendingUp,
    CheckCircle,
    XCircle,
    AlertCircle,
    BarChart2,
    Layers,
    ExternalLink,
    ChevronUp,
    ArrowUpRight,
    Users,
    Target,
    Zap,
    FileText,
    MessageSquare,
    Send,
  } from 'lucide-react';
  import { Button } from '../../components/ui/button';
  import { Select } from '../../components/ui/input';
  import { EmptyState, SkeletonCandidateRow } from '../../components/ui/card';
  import { Badge, ScoreBadge, Avatar } from '../../components/ui/badge';
  import { ConfirmDialog } from '../../components/ui/modal';
  import type { Candidate, Application, Job } from '../../types';
  import { getStatusColor, getRelativeTime } from '../../utils/chart-utils';

  // ─── Types ───────────────────────────────────────────────────────────────────

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
  type ViewMode = 'table' | 'grid';

  const STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'applied', label: 'Applied' },
    { value: 'shortlisted', label: 'Shortlisted' },
    { value: 'interviewed', label: 'Interviewed' },
    { value: 'offered', label: 'Offered' },
    { value: 'hired', label: 'Hired' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const STAGE_ORDER = ['applied', 'shortlisted', 'interviewed', 'offered', 'hired', 'rejected'];

  const STAGE_COLORS: Record<string, { dot: string; bg: string; text: string; border: string }> = {
    applied:     { dot: 'bg-blue-400',    bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
    shortlisted: { dot: 'bg-yellow-400',  bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200' },
    interviewed: { dot: 'bg-purple-400',  bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
    offered:     { dot: 'bg-orange-400',  bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200' },
    hired:       { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    rejected:    { dot: 'bg-red-400',     bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
  };

  const ITEMS_PER_PAGE = 25;

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function scoreColor(score: number) {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-500';
  }

  function scoreBg(score: number) {
    if (score >= 80) return 'bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'bg-blue-50 border-blue-200';
    if (score >= 40) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  }

  function ScoreRing({ score }: { score: number }) {
    const r = 22, circ = 2 * Math.PI * r;
    const fill = (score / 100) * circ;
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444';
    return (
      <svg width="60" height="60" viewBox="0 0 60 60" className="rotate-[-90deg]">
        <circle cx="30" cy="30" r={r} fill="none" stroke="#f3f4f6" strokeWidth="5" />
        <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x="30" y="34" textAnchor="middle" dominantBaseline="middle"
          className="rotate-90" fill={color}
          style={{ fontSize: 12, fontWeight: 700, transform: 'rotate(90deg)', transformOrigin: '30px 30px' }}>
          {score}%
        </text>
      </svg>
    );
  }

  // ─── Candidate Detail Side Panel ──────────────────────────────────────────────

  interface SidePanelProps {
    candidate: Candidate | null;
    applications: Application[];
    jobs: Job[];
    onClose: () => void;
    onEdit: (id: number) => void;
    onBulkAction: (ids: number[], action: string) => void;
  }

  function CandidatePanel({ candidate, applications, jobs, onClose, onEdit, onBulkAction }: SidePanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'notes'>('overview');
    const [note, setNote] = useState('');

    // Close on Escape
    useEffect(() => {
      const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // Close on outside click
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
          // only close if clicking outside the panel (not on table rows)
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (!candidate) return null;

    const candidateApps = applications
      .filter(a => a.candidate_id === candidate.candidate_id)
      .map(a => ({ ...a, job: jobs.find(j => j.job_id === a.job_id) }));

    const skills = candidate.skills.split(',').map(s => s.trim()).filter(Boolean);
    const statusKey = (candidate.status || 'applied').toLowerCase();
    const sc = STAGE_COLORS[statusKey] ?? STAGE_COLORS['applied'];
    const stageIdx = STAGE_ORDER.indexOf(statusKey);

    const tabs = [
      { id: 'overview', label: 'Overview' },
      { id: 'applications', label: `Applications (${candidateApps.length})` },
      { id: 'notes', label: 'Notes' },
    ] as const;

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity"
          onClick={onClose}
        />

        {/* Panel */}
        <div
          ref={panelRef}
          className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white shadow-2xl z-50 flex flex-col
            transform transition-transform duration-300 ease-out"
          style={{ animation: 'slideIn 0.25s ease-out' }}
        >
          {/* ── Panel Header ── */}
          <div className="flex-shrink-0 bg-gradient-to-br from-[#1a1f36] to-[#252b4a] px-6 pt-6 pb-5">
            <div className="flex items-start justify-between mb-4">
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(candidate.candidate_id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors"
                  onClick={() => onBulkAction([candidate.candidate_id], 'shortlist')}
                >
                  <UserCheck className="w-3.5 h-3.5" /> Shortlist
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 ring-2 ring-white/20">
                {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate">{candidate.name}</h2>
                <p className="text-sm text-white/70 truncate">{candidate.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text} border ${sc.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
                  </span>
                  {candidate.score !== undefined && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${scoreBg(candidate.score)} ${scoreColor(candidate.score)}`}>
                      <Star className="w-3 h-3" /> {candidate.score}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stage progress */}
            <div className="mt-4 flex items-center gap-1">
              {STAGE_ORDER.filter(s => s !== 'rejected').map((stage, i) => {
                const isActive = i <= stageIdx && statusKey !== 'rejected';
                const isCurrent = stage === statusKey;
                return (
                  <div key={stage} className="flex items-center flex-1">
                    <div className={`flex-1 h-1 rounded-full transition-colors ${isActive ? 'bg-emerald-400' : 'bg-white/20'}`} />
                    {isCurrent && <div className="w-2 h-2 rounded-full bg-white ring-2 ring-emerald-400 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              {STAGE_ORDER.filter(s => s !== 'rejected').map(stage => (
                <span key={stage} className={`text-[9px] capitalize ${stage === statusKey ? 'text-white font-semibold' : 'text-white/40'}`}>
                  {stage}
                </span>
              ))}
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex-shrink-0 border-b border-gray-100 px-6">
            <div className="flex gap-0">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab content ── */}
          <div className="flex-1 overflow-y-auto">

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="p-6 space-y-5">

                {/* Score ring + quick stats */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                  {candidate.score !== undefined ? (
                    <ScoreRing score={candidate.score} />
                  ) : (
                    <div className="w-[60px] h-[60px] rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">N/A</div>
                  )}
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-400">Experience</p>
                      <p className="text-sm font-semibold text-gray-900">{candidate.experience_years} yrs</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Applications</p>
                      <p className="text-sm font-semibold text-gray-900">{candidateApps.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Education</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {candidate.education?.split(' ')[0] || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Match Score</p>
                      <p className={`text-sm font-bold ${scoreColor(candidate.match_score ?? candidate.score ?? 0)}`}>
                        {candidate.match_score ?? candidate.score ?? 'N/A'}{typeof (candidate.match_score ?? candidate.score) === 'number' ? '%' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</h4>
                  <div className="space-y-2">
                    <a href={`mailto:${candidate.email}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group">
                      <Mail className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                      <span className="text-sm text-gray-700 group-hover:text-blue-600">{candidate.email}</span>
                      <ExternalLink className="w-3 h-3 text-gray-300 ml-auto group-hover:text-blue-400" />
                    </a>
                    {(candidate as any).phone && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{(candidate as any).phone}</span>
                      </div>
                    )}
                    {(candidate as any).location && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{(candidate as any).location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Education */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Education</h4>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                    <GraduationCap className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{candidate.education || 'Not specified'}</p>
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Skills ({skills.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, i) => (
                      <span key={i}
                        className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100 hover:bg-blue-100 transition-colors">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Score breakdown if available */}
                {candidate.score !== undefined && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Score Breakdown</h4>
                    <div className="space-y-2">
                      {[
                        { label: 'Technical Skills', value: Math.min((candidate.score || 0) + 5, 100) },
                        { label: 'Experience Match', value: Math.max((candidate.score || 0) - 8, 0) },
                        { label: 'Education Fit', value: Math.min((candidate.score || 0) + 2, 100) },
                        { label: 'Overall Match', value: candidate.score || 0 },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>{label}</span>
                            <span className={`font-semibold ${scoreColor(value)}`}>{value}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-700 ${
                                value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-blue-500' : value >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                              }`}
                              style={{ width: `${value}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary / bio if available */}
                {(candidate as any).summary && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Summary</h4>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3">
                      {(candidate as any).summary}
                    </p>
                  </div>
                )}

                {/* Quick actions */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Move to Shortlist', action: 'shortlist', icon: <UserCheck className="w-3.5 h-3.5" />, color: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' },
                      { label: 'Schedule Interview', action: 'interviewed', icon: <Calendar className="w-3.5 h-3.5" />, color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
                      { label: 'Mark as Hired', action: 'hire', icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
                      { label: 'Reject', action: 'rejected', icon: <XCircle className="w-3.5 h-3.5" />, color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
                    ].map(({ label, action, icon, color }) => (
                      <button key={action}
                        onClick={() => onBulkAction([candidate.candidate_id], action)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${color}`}>
                        {icon} {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* APPLICATIONS TAB */}
            {activeTab === 'applications' && (
              <div className="p-6 space-y-3">
                {candidateApps.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No applications yet</p>
                  </div>
                ) : (
                  candidateApps.map(app => {
                    const sc = STAGE_COLORS[(app.status || 'applied').toLowerCase()] ?? STAGE_COLORS['applied'];
                    return (
                      <div key={app.application_id}
                        className="p-4 rounded-2xl border border-gray-100 hover:border-gray-200 bg-gray-50 hover:bg-white transition-all space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {app.job?.role || 'Unknown Role'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {app.job?.department || 'General'} · Applied {getRelativeTime(app.application_date)}
                            </p>
                          </div>
                          <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {(app.status || 'applied').charAt(0).toUpperCase() + (app.status || 'applied').slice(1)}
                          </span>
                        </div>
                        {app.job?.requirements && (
                          <p className="text-xs text-gray-400 line-clamp-2">{app.job.requirements}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* NOTES TAB */}
            {activeTab === 'notes' && (
              <div className="p-6 space-y-4">
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm mb-1">No notes yet</p>
                  <p className="text-xs">Add internal notes about this candidate.</p>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Type a note..."
                    rows={3}
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      disabled={!note.trim()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" /> Save Note
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>
      </>
    );
  }

  // ─── Main Page ────────────────────────────────────────────────────────────────

  export function CandidatesPage({
    candidates,
    jobs,
    applications,
    isLoading,
    onCreateCandidate,
    onViewCandidate,
    onEditCandidate,
    onBulkAction,
    onRefresh,
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
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

    // ── Filter + sort ─────────────────────────────────────────────────────────

    const filteredCandidates = useMemo(() => {
      let result = [...candidates];

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.skills.toLowerCase().includes(q) ||
          (c.education || '').toLowerCase().includes(q)
        );
      }

      if (statusFilter)
        result = result.filter(c => (c.status || '').toLowerCase() === statusFilter.toLowerCase());

      if (jobFilter) {
        const jobId = parseInt(jobFilter);
        const ids = applications.filter(a => a.job_id === jobId).map(a => a.candidate_id);
        result = result.filter(c => ids.includes(c.candidate_id));
      }

      if (minScore) {
        const min = parseInt(minScore);
        result = result.filter(c => (c.score || 0) >= min);
      }

      result.sort((a, b) => {
        let aV: string | number = '';
        let bV: string | number = '';
        switch (sortField) {
          case 'name': aV = a.name; bV = b.name; break;
          case 'score': aV = a.score || 0; bV = b.score || 0; break;
          case 'experience_years': aV = a.experience_years; bV = b.experience_years; break;
          case 'status': aV = a.status || ''; bV = b.status || ''; break;
          case 'created_at': aV = a.created_at || ''; bV = b.created_at || ''; break;
        }
        if (sortOrder === 'asc') return aV < bV ? -1 : aV > bV ? 1 : 0;
        return aV > bV ? -1 : aV < bV ? 1 : 0;
      });

      return result;
    }, [candidates, searchQuery, statusFilter, jobFilter, minScore, sortField, sortOrder, applications]);

    const totalPages = Math.ceil(filteredCandidates.length / ITEMS_PER_PAGE);
    const paginatedCandidates = useMemo(() => {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      return filteredCandidates.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredCandidates, currentPage]);

    // ── Stage summary bar ─────────────────────────────────────────────────────

    const stageSummary = useMemo(() => {
      return STAGE_ORDER.map(stage => ({
        stage,
        count: candidates.filter(c => (c.status || 'applied').toLowerCase() === stage).length,
      }));
    }, [candidates]);

    // ── Avg score ─────────────────────────────────────────────────────────────

    const avgScore = useMemo(() => {
      const scored = candidates.filter(c => c.score !== undefined);
      if (!scored.length) return 0;
      return Math.round(scored.reduce((s, c) => s + (c.score || 0), 0) / scored.length);
    }, [candidates]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handlePageChange = (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
      setSelectedIds(new Set());
    };

    const handleSelectAll = () => {
      if (selectedIds.size === paginatedCandidates.length) setSelectedIds(new Set());
      else setSelectedIds(new Set(paginatedCandidates.map(c => c.candidate_id)));
    };

    const handleSelect = (id: number) => {
      const s = new Set(selectedIds);
      s.has(id) ? s.delete(id) : s.add(id);
      setSelectedIds(s);
    };

    const handleBulkAction = (action: string) => {
      const ids = Array.from(selectedIds);
      if (!ids.length) return;
      setConfirmAction({ action, ids });
    };

    const executeBulkAction = () => {
      if (confirmAction) {
        onBulkAction(confirmAction.ids, confirmAction.action);
        setSelectedIds(new Set());
        setConfirmAction(null);
      }
    };

    const openPanel = (candidate: Candidate) => setSelectedCandidate(candidate);
    const closePanel = () => setSelectedCandidate(null);

    const exportCandidates = () => {
      const data = selectedIds.size > 0
        ? candidates.filter(c => selectedIds.has(c.candidate_id))
        : filteredCandidates;
      const csv = [
        ['ID', 'Name', 'Email', 'Skills', 'Experience', 'Education', 'Score', 'Status'].join(','),
        ...data.map(c => [
          c.candidate_id, `"${c.name}"`, c.email, `"${c.skills}"`,
          c.experience_years, `"${c.education}"`, c.score || 0, c.status || 'applied',
        ].join(','))
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `candidates-${new Date().toISOString().split('T')[0]}.csv`; a.click();
      URL.revokeObjectURL(url);
    };

    const sortIcon = (field: SortField) => {
      if (sortField !== field) return null;
      return sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
    };

    const toggleSort = (field: SortField) => {
      if (sortField === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
      else { setSortField(field); setSortOrder('desc'); }
    };

    // ─── RENDER ───────────────────────────────────────────────────────────────

    return (
      <>
        <div className={`p-4 md:p-6 lg:p-8 space-y-5 transition-all duration-300 ${selectedCandidate ? 'mr-[480px]' : ''}`}>

          {/* ── Page header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
              <p className="text-sm text-gray-500 mt-1">
                {filteredCandidates.length} of {candidates.length} candidates
                {totalPages > 1 && ` · Page ${currentPage} of ${totalPages}`}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" onClick={exportCandidates} leftIcon={<Download className="w-4 h-4" />}>
                Export CSV
              </Button>
              <Button onClick={onCreateCandidate} leftIcon={<UserPlus className="w-4 h-4" />}>
                Add Candidate
              </Button>
            </div>
          </div>

          {/* ── Stage summary bar ── */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {stageSummary.map(({ stage, count }) => {
              const sc = STAGE_COLORS[stage];
              const isActive = statusFilter === stage;
              return (
                <button
                  key={stage}
                  onClick={() => {
                    setStatusFilter(isActive ? '' : stage);
                    setCurrentPage(1);
                  }}
                  className={`rounded-xl p-3 text-center border transition-all ${
                    isActive
                      ? `${sc.bg} ${sc.border} ring-2 ring-offset-1 ring-current`
                      : `bg-white border-gray-100 hover:${sc.bg} hover:border-gray-200`
                  }`}
                >
                  <p className={`text-xl font-bold ${isActive ? sc.text : 'text-gray-900'}`}>{count}</p>
                  <p className={`text-xs capitalize mt-0.5 ${isActive ? sc.text : 'text-gray-400'}`}>{stage}</p>
                </button>
              );
            })}
          </div>

          {/* ── NEW: KPI strip ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{candidates.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">All candidates</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Avg Score</span>
                <Star className="w-4 h-4 text-yellow-400" />
              </div>
              <p className={`text-2xl font-bold ${scoreColor(avgScore)}`}>{avgScore}%</p>
              <p className="text-xs text-gray-400 mt-0.5">Across scored candidates</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Hired</span>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                {candidates.filter(c => c.status === 'hired').length}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Successfully placed</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Shortlisted</span>
                <Target className="w-4 h-4 text-yellow-400" />
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {candidates.filter(c => c.status === 'shortlisted').length}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Pending review</p>
            </div>
          </div>

          {/* ── Search + filter bar ── */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, skills or education…"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowFilters(!showFilters)}
                  leftIcon={<Filter className="w-4 h-4" />}
                  rightIcon={<ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />}
                >
                  Filters
                </Button>
                {/* View mode toggle */}
                <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white">
                  {(['table', 'grid'] as ViewMode[]).map(mode => (
                    <button key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-3 py-2 transition-colors ${viewMode === mode ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                      title={mode === 'table' ? 'Table view' : 'Grid view'}
                    >
                      {mode === 'table'
                        ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm2 0v3h12V2H2zm0 4v3h3V6H2zm4 0v3h3V6H6zm4 0v3h4V6h-4zM2 10v4h3v-4H2zm4 0v4h3v-4H6zm4 0v4h4v-4h-4z"/></svg>
                        : <Layers className="w-4 h-4" />
                      }
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <Select label="Status" value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  options={STATUS_OPTIONS} />
                <Select label="Job" value={jobFilter}
                  onChange={e => { setJobFilter(e.target.value); setCurrentPage(1); }}
                  options={[{ value: '', label: 'All Jobs' }, ...jobs.map(j => ({ value: String(j.job_id), label: j.role }))]} />
                <Select label="Min Score" value={minScore}
                  onChange={e => { setMinScore(e.target.value); setCurrentPage(1); }}
                  options={[
                    { value: '', label: 'Any Score' },
                    { value: '80', label: '80%+' },
                    { value: '60', label: '60%+' },
                    { value: '40', label: '40%+' },
                    { value: '20', label: '20%+' },
                  ]} />
                <Select label="Sort By" value={`${sortField}-${sortOrder}`}
                  onChange={e => {
                    const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
                    setSortField(field); setSortOrder(order);
                  }}
                  options={[
                    { value: 'score-desc', label: 'Highest Score' },
                    { value: 'score-asc', label: 'Lowest Score' },
                    { value: 'name-asc', label: 'Name A–Z' },
                    { value: 'name-desc', label: 'Name Z–A' },
                    { value: 'experience_years-desc', label: 'Most Experience' },
                    { value: 'created_at-desc', label: 'Newest First' },
                  ]} />
              </div>
            )}
          </div>

          {/* ── Bulk action bar ── */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-blue-800">{selectedIds.size} selected</span>
                <button onClick={() => setSelectedIds(new Set())} className="text-xs text-blue-600 underline">Clear</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Shortlist', action: 'shortlist', icon: <UserCheck className="w-3.5 h-3.5" /> },
                  { label: 'Interview', action: 'interviewed', icon: <Calendar className="w-3.5 h-3.5" /> },
                  { label: 'Reject', action: 'rejected', icon: <UserX className="w-3.5 h-3.5" /> },
                  { label: 'Delete', action: 'delete', icon: <Trash2 className="w-3.5 h-3.5" />, danger: true },
                ].map(({ label, action, icon, danger }) => (
                  <button key={action}
                    onClick={() => handleBulkAction(action)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      danger
                        ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}>
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── TABLE VIEW ── */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <input type="checkbox"
                          checked={selectedIds.size === paginatedCandidates.length && paginatedCandidates.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      </th>
                      {[
                        { label: 'Candidate', field: 'name' as SortField },
                        { label: 'Skills', field: null },
                        { label: 'Experience', field: 'experience_years' as SortField },
                        { label: 'Education', field: null },
                        { label: 'Score', field: 'score' as SortField },
                        { label: 'Status', field: 'status' as SortField },
                      ].map(({ label, field }) => (
                        <th key={label}
                          className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide ${field ? 'cursor-pointer select-none hover:text-gray-700' : ''}`}
                          onClick={() => field && toggleSort(field)}>
                          {label}{field && sortIcon(field)}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {isLoading ? (
                      Array.from({ length: 10 }).map((_, i) => <SkeletonCandidateRow key={i} />)
                    ) : paginatedCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12">
                          <EmptyState
                            icon={<UserPlus className="w-6 h-6" />}
                            title="No candidates found"
                            description={searchQuery || statusFilter ? 'Try adjusting your filters' : 'Add your first candidate to get started'}
                            action={!searchQuery && !statusFilter && <Button onClick={onCreateCandidate}>Add Candidate</Button>}
                          />
                        </td>
                      </tr>
                    ) : (
                      paginatedCandidates.map(candidate => {
                        const isOpen = selectedCandidate?.candidate_id === candidate.candidate_id;
                        const sc = STAGE_COLORS[(candidate.status || 'applied').toLowerCase()] ?? STAGE_COLORS['applied'];
                        return (
                          <tr key={candidate.candidate_id}
                            className={`transition-colors cursor-pointer ${isOpen ? 'bg-blue-50/60' : 'hover:bg-gray-50/70'}`}
                            onClick={() => openPanel(candidate)}>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              <input type="checkbox"
                                checked={selectedIds.has(candidate.candidate_id)}
                                onChange={() => handleSelect(candidate.candidate_id)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${isOpen ? 'bg-[#1a1f36] text-white' : 'bg-gray-100 text-gray-600'}`}>
                                  {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{candidate.name}</p>
                                  <p className="text-xs text-gray-400">{candidate.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {candidate.skills.split(',').slice(0, 3).map((s, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-100">
                                    {s.trim()}
                                  </span>
                                ))}
                                {candidate.skills.split(',').length > 3 && (
                                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">
                                    +{candidate.skills.split(',').length - 3}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <Briefcase className="w-3.5 h-3.5 text-gray-300" />
                                <span className="text-sm text-gray-600">{candidate.experience_years} yrs</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-gray-600 max-w-[140px] truncate">
                                {candidate.education?.split(' ').slice(0, 3).join(' ') || '—'}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              {candidate.score !== undefined ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-gray-100 rounded-full h-1.5">
                                    <div className={`h-1.5 rounded-full ${
                                      candidate.score >= 80 ? 'bg-emerald-500' : candidate.score >= 60 ? 'bg-blue-500' : candidate.score >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                                    }`} style={{ width: `${candidate.score}%` }} />
                                  </div>
                                  <span className={`text-sm font-bold ${scoreColor(candidate.score)}`}>{candidate.score}%</span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                {(candidate.status || 'applied').charAt(0).toUpperCase() + (candidate.status || 'applied').slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openPanel(candidate)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Quick view">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button onClick={() => onEditCandidate(candidate.candidate_id)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Edit">
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="md:hidden divide-y divide-gray-100">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <div key={i} className="p-4"><SkeletonCandidateRow /></div>)
                ) : paginatedCandidates.length === 0 ? (
                  <div className="p-8">
                    <EmptyState icon={<UserPlus className="w-6 h-6" />} title="No candidates found"
                      action={!searchQuery && !statusFilter && <Button onClick={onCreateCandidate}>Add Candidate</Button>} />
                  </div>
                ) : (
                  paginatedCandidates.map(candidate => {
                    const sc = STAGE_COLORS[(candidate.status || 'applied').toLowerCase()] ?? STAGE_COLORS['applied'];
                    return (
                      <div key={candidate.candidate_id} className="p-4 hover:bg-gray-50 transition-colors"
                        onClick={() => openPanel(candidate)}>
                        <div className="flex items-start gap-3">
                          <input type="checkbox" checked={selectedIds.has(candidate.candidate_id)}
                            onChange={e => { e.stopPropagation(); handleSelect(candidate.candidate_id); }}
                            onClick={e => e.stopPropagation()}
                            className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#1a1f36] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{candidate.name}</p>
                                <p className="text-xs text-gray-500 truncate">{candidate.email}</p>
                              </div>
                              {candidate.score !== undefined && (
                                <span className={`text-sm font-bold flex-shrink-0 ${scoreColor(candidate.score)}`}>{candidate.score}%</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                {(candidate.status || 'applied').charAt(0).toUpperCase() + (candidate.status || 'applied').slice(1)}
                              </span>
                              <span className="text-xs text-gray-400">{candidate.experience_years} yrs exp</span>
                            </div>
                          </div>
                          <button onClick={e => { e.stopPropagation(); onEditCandidate(candidate.candidate_id); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 flex-shrink-0">
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredCandidates.length)} of {filteredCandidates.length}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let p: number;
                      if (totalPages <= 5) p = i + 1;
                      else if (currentPage <= 3) p = i + 1;
                      else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                      else p = currentPage - 2 + i;
                      return (
                        <button key={p} onClick={() => handlePageChange(p)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === p ? 'bg-[#1a1f36] text-white' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}>{p}</button>
                      );
                    })}
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── GRID VIEW ── */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-200" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                        <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded" />
                    <div className="h-6 bg-gray-100 rounded-full w-20" />
                  </div>
                ))
              ) : paginatedCandidates.length === 0 ? (
                <div className="col-span-full py-12">
                  <EmptyState icon={<UserPlus className="w-6 h-6" />} title="No candidates found"
                    action={!searchQuery && !statusFilter && <Button onClick={onCreateCandidate}>Add Candidate</Button>} />
                </div>
              ) : (
                paginatedCandidates.map(candidate => {
                  const sc = STAGE_COLORS[(candidate.status || 'applied').toLowerCase()] ?? STAGE_COLORS['applied'];
                  const isOpen = selectedCandidate?.candidate_id === candidate.candidate_id;
                  const skills = candidate.skills.split(',').map(s => s.trim()).filter(Boolean);
                  return (
                    <div key={candidate.candidate_id}
                      onClick={() => openPanel(candidate)}
                      className={`bg-white rounded-2xl border transition-all cursor-pointer group hover:shadow-md hover:-translate-y-0.5 ${
                        isOpen ? 'border-blue-300 shadow-md ring-2 ring-blue-100' : 'border-gray-100'
                      }`}>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                              isOpen ? 'bg-[#1a1f36] text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-[#1a1f36] group-hover:text-white'
                            }`}>
                              {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{candidate.name}</p>
                              <p className="text-xs text-gray-400 truncate">{candidate.email}</p>
                            </div>
                          </div>
                          {candidate.score !== undefined && (
                            <span className={`text-sm font-bold flex-shrink-0 ${scoreColor(candidate.score)}`}>{candidate.score}%</span>
                          )}
                        </div>

                        {candidate.score !== undefined && (
                          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                            <div className={`h-1.5 rounded-full transition-all ${
                              candidate.score >= 80 ? 'bg-emerald-500' : candidate.score >= 60 ? 'bg-blue-500' : candidate.score >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                            }`} style={{ width: `${candidate.score}%` }} />
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1 mb-3">
                          {skills.slice(0, 3).map((s, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-100">{s}</span>
                          ))}
                          {skills.length > 3 && (
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">+{skills.length - 3}</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {(candidate.status || 'applied').charAt(0).toUpperCase() + (candidate.status || 'applied').slice(1)}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Briefcase className="w-3 h-3" /> {candidate.experience_years} yrs
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Pagination for grid */}
              {totalPages > 1 && (
                <div className="col-span-full flex items-center justify-center gap-2 pt-2">
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-500">{currentPage} of {totalPages}</span>
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Confirm dialog ── */}
        <ConfirmDialog
          isOpen={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={executeBulkAction}
          title={`${confirmAction?.action.charAt(0).toUpperCase()}${confirmAction?.action.slice(1)} Candidates`}
          message={`Are you sure you want to ${confirmAction?.action} ${confirmAction?.ids.length} selected candidate${confirmAction?.ids.length === 1 ? '' : 's'}?`}
          confirmLabel="Confirm"
          variant={confirmAction?.action === 'delete' ? 'danger' : 'warning'}
        />

        {/* ── Side panel ── */}
        {selectedCandidate && (
          <CandidatePanel
            candidate={selectedCandidate}
            applications={applications}
            jobs={jobs}
            onClose={closePanel}
            onEdit={id => { closePanel(); onEditCandidate(id); }}
            onBulkAction={(ids, action) => {
              onBulkAction(ids, action);
              closePanel();
            }}
          />
        )}
      </>
    );
  }