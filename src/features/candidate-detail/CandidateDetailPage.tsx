import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Edit3,
  Mail,
  Briefcase,
  Calendar,
  CheckCircle,
  GraduationCap,
  Code,
  FileText,
  MessageSquare,
  TrendingUp,
  User,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, Skeleton } from '../../components/ui/card';
import { Badge, ScoreBadge, Avatar } from '../../components/ui/badge';
import { Drawer } from '../../components/ui/modal';
import { Textarea } from '../../components/ui/input';
import { BarChart } from '../../components/charts';
import type { Candidate, Application, Job } from '../../types';
import { getStatusColor, getRelativeTime, getScoreLabel } from '../../utils/chart-utils';

interface CandidateDetailPageProps {
  candidate: Candidate | null;
  applications: Application[];
  jobs: Job[];
  isLoading?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (status: string) => void;
  onAddNote: (note: string) => void;
}

export function CandidateDetailPage({
  candidate,
  applications,
  jobs,
  isLoading = false,
  onClose,
  onEdit,
  onStatusChange,
  onAddNote
}: CandidateDetailPageProps) {
  const [showNoteDrawer, setShowNoteDrawer] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'activity' | 'notes'>('overview');

  const candidateApplications = useMemo(() => {
    if (!candidate) return [];
    return applications.filter(a => a.candidate_id === candidate.candidate_id);
  }, [candidate, applications]);

  const appliedJobs = useMemo(() => {
    return candidateApplications.map(app => ({
      ...app,
      job: jobs.find(j => j.job_id === app.job_id)
    }));
  }, [candidateApplications, jobs]);

  const scoreBreakdown = useMemo(() => {
    if (!candidate) return null;
    // Simulated score breakdown based on candidate data
    const skillsCount = candidate.skills.split(',').length;
    return [
      { label: 'Skills Match', value: Math.min(skillsCount * 10, 40), color: 'bg-blue-500' },
      { label: 'Experience', value: Math.min(candidate.experience_years * 10, 40), color: 'bg-purple-500' },
      { label: 'Education', value: candidate.education.toLowerCase().includes('phd') ? 20 : candidate.education.toLowerCase().includes('master') ? 15 : 10, color: 'bg-emerald-500' },
      { label: 'Projects', value: Math.min(candidate.projects.split(',').length * 5, 20), color: 'bg-orange-500' }
    ];
  }, [candidate]);

  const skillsList = useMemo(() => {
    if (!candidate) return [];
    return candidate.skills.split(',').map(s => s.trim()).filter(Boolean);
  }, [candidate]);

  const projectsList = useMemo(() => {
    if (!candidate) return [];
    return candidate.projects.split(',').map(p => p.trim()).filter(Boolean);
  }, [candidate]);

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim());
      setNewNote('');
      setShowNoteDrawer(false);
    }
  };

  if (isLoading || !candidate) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-4">
            <div className="animate-pulse w-8 h-8 bg-gray-200 rounded-lg" />
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 lg:p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} padding="sm">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card padding="lg">
                <Skeleton className="h-5 w-24 mb-4" />
                <Skeleton className="h-32 w-32 rounded-full mx-auto" />
              </Card>
              <Card padding="lg">
                <Skeleton className="h-5 w-16 mb-4" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-20 rounded-full" />
                  ))}
                </div>
              </Card>
            </div>
            <div className="space-y-6">
              <Card padding="lg">
                <Skeleton className="h-5 w-24 mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const scoreInfo = getScoreLabel(candidate.score || 0);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <Avatar name={candidate.name} size="lg" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{candidate.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(candidate.status || 'applied')}`}>
                    {candidate.status || 'Applied'}
                  </span>
                  {candidate.score !== undefined && (
                    <ScoreBadge score={candidate.score} size="sm" />
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onEdit} leftIcon={<Edit3 className="w-4 h-4" />}>
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button onClick={() => onStatusChange('shortlist')} leftIcon={<CheckCircle className="w-4 h-4" />}>
              Shortlist
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs (Mobile) */}
      <div className="lg:hidden bg-white border-b border-gray-100 overflow-x-auto">
        <div className="flex">
          {(['overview', 'applications', 'activity', 'notes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'text-emerald-600 border-b-2 border-emerald-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6">
          {/* Quick Info Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card padding="sm" className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900 truncate">{candidate.email}</p>
              </div>
            </Card>
            <Card padding="sm" className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50">
                <Briefcase className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Experience</p>
                <p className="text-sm font-medium text-gray-900">{candidate.experience_years} years</p>
              </div>
            </Card>
            <Card padding="sm" className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Education</p>
                <p className="text-sm font-medium text-gray-900 truncate">{candidate.education}</p>
              </div>
            </Card>
            <Card padding="sm" className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-50">
                <Calendar className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Applications</p>
                <p className="text-sm font-medium text-gray-900">{appliedJobs.length}</p>
              </div>
            </Card>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Overview */}
            <div className={`lg:col-span-2 ${activeTab !== 'overview' ? 'hidden lg:block' : ''}`}>
              {/* AI Analysis Card */}
              {candidate.score !== undefined && (
                <Card padding="lg" className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    AI Analysis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-32 h-32 relative">
                          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#f3f4f6"
                              strokeWidth="3"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke={candidate.score >= 80 ? '#10b981' : candidate.score >= 60 ? '#3b82f6' : candidate.score >= 40 ? '#f59e0b' : '#ef4444'}
                              strokeWidth="3"
                              strokeDasharray={`${candidate.score}, 100`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-3xl font-bold text-gray-900">{candidate.score}%</span>
                          </div>
                        </div>
                        <p className={`text-sm font-medium mt-2 ${scoreInfo.color}`}>{scoreInfo.label}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Score Breakdown</h4>
                      {scoreBreakdown && (
                        <BarChart data={scoreBreakdown.map(s => ({ label: s.label, value: s.value }))} />
                      )}
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
                    <p className="text-sm text-emerald-800">
                      <strong>Recommendation:</strong> This candidate shows strong alignment with role requirements.
                      {candidate.score >= 80 && ' Highly recommended for interview.'}
                      {candidate.score >= 60 && candidate.score < 80 && ' Consider for technical interview.'}
                      {candidate.score < 60 && ' May need additional evaluation.'}
                    </p>
                  </div>
                </Card>
              )}

              {/* Skills */}
              <Card padding="lg" className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Code className="w-5 h-5 text-blue-600" />
                  Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skillsList.map((skill, idx) => (
                    <Badge key={idx} variant="info">{skill}</Badge>
                  ))}
                </div>
              </Card>

              {/* Projects */}
              <Card padding="lg" className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Projects
                </h3>
                <div className="space-y-3">
                  {projectsList.map((project, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-900">{project}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Applications */}
              <div className={activeTab !== 'applications' ? 'hidden lg:block' : ''}>
                <Card padding="lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Applications
                  </h3>
                  {appliedJobs.length > 0 ? (
                    <div className="space-y-3">
                      {appliedJobs.map((app) => (
                        <div key={app.application_id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{app.job?.role || 'Unknown'}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Applied {getRelativeTime(app.application_date)}
                              </p>
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                              {app.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No applications yet</p>
                  )}
                </Card>
              </div>

              {/* Activity */}
              <div className={activeTab !== 'activity' ? 'hidden lg:block' : ''}>
                <Card padding="lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-900">Candidate created</p>
                        <p className="text-xs text-gray-500">Just now</p>
                      </div>
                    </div>
                    {appliedJobs.map((app) => (
                      <div key={app.application_id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">Applied for {app.job?.role}</p>
                          <p className="text-xs text-gray-500">{getRelativeTime(app.application_date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Notes */}
              <div className={activeTab !== 'notes' ? 'hidden lg:block' : ''}>
                <Card padding="lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Notes
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowNoteDrawer(true)}>
                      Add Note
                    </Button>
                  </div>
                  {candidate.notes ? (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{candidate.notes}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No notes yet</p>
                  )}
                </Card>
              </div>

              {/* Actions */}
              <Card padding="lg">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <Button
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={() => onStatusChange('shortlist')}
                    leftIcon={<CheckCircle className="w-4 h-4" />}
                  >
                    Move to Shortlisted
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={() => onStatusChange('interviewed')}
                    leftIcon={<Calendar className="w-4 h-4" />}
                  >
                    Schedule Interview
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:bg-red-50"
                    onClick={() => onStatusChange('rejected')}
                    leftIcon={<AlertCircle className="w-4 h-4" />}
                  >
                    Reject Candidate
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Note Drawer */}
      <Drawer
        isOpen={showNoteDrawer}
        onClose={() => setShowNoteDrawer(false)}
        title="Add Note"
      >
        <div className="space-y-4">
          <Textarea
            placeholder="Enter your note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={5}
          />
          <Button className="w-full" onClick={handleAddNote}>
            Save Note
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
