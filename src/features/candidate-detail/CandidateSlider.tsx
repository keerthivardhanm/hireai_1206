import { useEffect, useMemo } from 'react';
import {
  X,
  Mail,
  Phone,
  MapPin,
  Star,
  Briefcase,
  GraduationCap,
  Code,
  FileText,
  Calendar,
  CheckCircle,
  Download,
  Edit3,
  TrendingUp,
  AlertCircle,
  User
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/card';
import type { Candidate, Application, Job } from '../../types';
import { getStatusColor, getRelativeTime, getScoreLabel } from '../../utils/chart-utils';

interface CandidateSliderProps {
  candidate: Candidate | null;
  isOpen: boolean;
  isLoading?: boolean;
  applications: Application[];
  jobs: Job[];
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (status: string) => void;
}

export function CandidateSlider({
  candidate,
  isOpen,
  isLoading = false,
  applications,
  jobs,
  onClose,
  onEdit,
  onStatusChange
}: CandidateSliderProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

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

  const skillsList = useMemo(() => {
    if (!candidate) return [];
    return candidate.skills.split(',').map(s => s.trim()).filter(Boolean);
  }, [candidate]);

  const projectsList = useMemo(() => {
    if (!candidate) return [];
    return candidate.projects.split(',').map(p => p.trim()).filter(Boolean);
  }, [candidate]);

  const primaryApplication = appliedJobs[0];
  const scoreInfo = candidate ? getScoreLabel(candidate.score || 0) : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Slider Panel */}
      <div
        className={`
          fixed top-0 right-0 h-full z-50 bg-white shadow-2xl
          flex flex-col
          transition-transform duration-300 ease-out
          w-full sm:w-[480px] lg:w-[520px]
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {isLoading || !candidate ? (
          <SliderSkeleton onClose={onClose} />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex-1 min-w-0 pr-4">
                <h2 className="text-xl font-bold text-gray-900">{candidate.name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {primaryApplication?.job?.role || candidate.education}
                  {candidate.location && ` • ${candidate.location}`}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-6">

                {/* Info Cards Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard label="Match Score">
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                      <span className={`text-xl font-bold ${scoreInfo?.color || 'text-gray-900'}`}>
                        {candidate.score || 0}%
                      </span>
                    </div>
                  </InfoCard>
                  <InfoCard label="Status">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(candidate.status || 'applied')}`}>
                      {candidate.status || 'Applied'}
                    </span>
                  </InfoCard>
                  <InfoCard label="Experience">
                    <span className="font-semibold text-gray-900">{candidate.experience_years} years</span>
                  </InfoCard>
                  <InfoCard label="Applications">
                    <span className="font-semibold text-gray-900">{appliedJobs.length}</span>
                  </InfoCard>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => onStatusChange('shortlisted')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Shortlist
                  </button>
                  <button
                    onClick={() => onStatusChange('interviewed')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <Calendar className="w-4 h-4" />
                    Schedule Interview
                  </button>
                  <button
                    onClick={onEdit}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                </div>

                {/* Profile Summary */}
                <section>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Profile Summary</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {candidate.name} is a {primaryApplication?.job?.role || 'candidate'} with {candidate.experience_years} years of experience
                    {skillsList.length > 0 && ` in ${skillsList.slice(0, 3).join(', ')}`}.
                    {candidate.education && ` ${candidate.education}.`}
                  </p>
                </section>

                {/* Contact */}
                <section>
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Contact</h3>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-blue-600">{candidate.email}</span>
                    </div>
                    {candidate.phone ? (
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>{candidate.phone}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <Phone className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        <span>Not available</span>
                      </div>
                    )}
                    {candidate.location ? (
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>{candidate.location}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <MapPin className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        <span>Not available</span>
                      </div>
                    )}
                  </div>
                </section>

                {/* Skills */}
                <section>
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {skillsList.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>

                {/* Background / Education */}
                <section>
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Background</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Education</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">{candidate.education || 'Not specified'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Experience</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">{candidate.experience_years} years</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Projects */}
                {projectsList.length > 0 && (
                  <section>
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Projects</h3>
                    <div className="space-y-2">
                      {projectsList.map((project, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700">{project}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Applications History */}
                {appliedJobs.length > 0 && (
                  <section>
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Application History</h3>
                    <div className="space-y-2">
                      {appliedJobs.map((app) => (
                        <div key={app.application_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{app.job?.role || 'Unknown Role'}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Applied {getRelativeTime(app.application_date)}</p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(app.status)}`}>
                            {app.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* AI Score Breakdown */}
                <section>
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    AI Assessment
                  </h3>
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`text-2xl font-bold ${scoreInfo?.color}`}>{candidate.score || 0}%</div>
                      <div>
                        <p className={`text-sm font-semibold ${scoreInfo?.color}`}>{scoreInfo?.label}</p>
                        <p className="text-xs text-gray-500">Overall match score</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: 'Skills Match', value: Math.min(skillsList.length * 10, 40) },
                        { label: 'Experience', value: Math.min((candidate.experience_years || 0) * 10, 40) },
                        { label: 'Education', value: candidate.education.toLowerCase().includes('phd') ? 20 : candidate.education.toLowerCase().includes('master') ? 15 : 10 },
                        { label: 'Projects', value: Math.min(projectsList.length * 5, 20) },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">{item.label}</span>
                            <span className="font-medium text-gray-900">{item.value}%</span>
                          </div>
                          <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all duration-500"
                              style={{ width: `${item.value}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-blue-700">
                      {(candidate.score || 0) >= 80
                        ? 'Highly recommended — strong alignment with role requirements.'
                        : (candidate.score || 0) >= 60
                        ? 'Good candidate — consider for technical interview.'
                        : 'Needs further evaluation before proceeding.'}
                    </p>
                  </div>
                </section>

                {/* Danger Zone */}
                <section className="pb-6">
                  <button
                    onClick={() => onStatusChange('rejected')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Reject Candidate
                  </button>
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl border border-gray-100 bg-white">
      <p className="text-xs text-gray-400 font-medium mb-1.5">{label}</p>
      <div className="font-semibold text-gray-900">{children}</div>
    </div>
  );
}

function SliderSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-11 rounded-xl" />
          <Skeleton className="flex-1 h-11 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </>
  );
}
