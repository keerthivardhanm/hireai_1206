import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Sidebar, BottomNav, Header } from './components/layout';
import { AuthPage } from './features/auth';
import { DashboardPage } from './features/dashboard';
import { CandidatesPage } from './features/candidates';
import { CandidateDetailPage, CandidateSlider } from './features/candidate-detail';
import { CandidateFormModal } from './features/candidate-form';
import { JobsPage } from './features/jobs';
import { JobFormModal } from './features/job-form';
import { PipelinePage } from './features/applications';
import { AnalyticsPage } from './features/analytics';
import { ReportsPage } from './features/reports';
import { CopilotPage } from './features/copilot';
import { NotificationsPage } from './features/notifications';
import { SettingsPage } from './features/settings';
import { LoadingState } from './components/ui/card';
import { useAuth, useDataStore, useNotifications } from './stores';
import { candidatesApi, jobsApi, applicationsApi } from './api';
import type { Candidate, Job, CandidateCreate, CandidateUpdate } from './types';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingState message="Loading..." /></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Main Layout with Sidebar
function MainLayout({ children, currentPage }: { children: React.ReactNode; currentPage: string }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleNavigate = (page: string) => {
    navigate(`/${page}`);
  };

  const showHeader = currentPage !== 'pipeline' && currentPage !== 'candidate-detail';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="hidden lg:block">
        <Sidebar
          user={user}
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onLogout={() => { logout(); navigate('/login'); }}
          notificationCount={unreadCount}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        {showHeader && (
          <Header
            user={user}
            title={getPageTitle(currentPage)}
            notificationCount={unreadCount}
            onNotificationClick={() => navigate('/notifications')}
          />
        )}
        {children}
        <div className="lg:hidden">
          <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />
        </div>
      </div>
    </div>
  );
}

function getPageTitle(page: string): string {
  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    candidates: 'Candidates',
    'candidate-detail': 'Candidate Detail',
    jobs: 'Jobs',
    pipeline: 'Pipeline',
    analytics: 'Analytics',
    reports: 'Reports',
    copilot: 'AI Copilot',
    notifications: 'Notifications',
    settings: 'Settings'
  };
  return titles[page] || page;
}

// Dashboard Page Wrapper
function DashboardWrapper() {
  const { candidates, applications, jobs, isLoading } = useDataStore();
  const navigate = useNavigate();

  const handleNavigate = (page: string, params?: Record<string, unknown>) => {
    if (params?.id) {
      const pagePath = page === 'candidate-detail' ? 'candidates' : page;
      navigate(`/${pagePath}/${params.id}`);
    } else {
      navigate(`/${page}`);
    }
  };

  return <DashboardPage candidates={candidates} applications={applications} jobs={jobs} isLoading={isLoading} onNavigate={handleNavigate} />;
}

// Candidates Page Wrapper with Slider
function CandidatesWrapper() {
  const { candidates, jobs, applications, isLoading, refreshAll, refreshCandidates, refreshApplications } = useDataStore();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ candidateId?: string }>();
  const [showForm, setShowForm] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | undefined>();
  const [formLoading, setFormLoading] = useState(false);
  const { addNotification } = useNotifications();

  const sliderCandidateId = params.candidateId ? Number(params.candidateId) : null;
  const sliderCandidate = sliderCandidateId ? candidates.find(c => c.candidate_id === sliderCandidateId) ?? null : null;
  const isSliderOpen = sliderCandidateId !== null;

  const handleView = (id: number) => navigate(`/candidates/${id}`);

  const handleCloseSlider = () => navigate('/candidates');

  const handleEdit = (id: number) => {
    const candidate = candidates.find(c => c.candidate_id === id);
    if (candidate) {
      setEditingCandidate(candidate);
      setShowForm(true);
    }
  };

  const handleSliderEdit = () => {
    if (sliderCandidate) {
      setEditingCandidate(sliderCandidate);
      setShowForm(true);
    }
  };

  const handleSliderStatusChange = async (status: string) => {
    if (!sliderCandidate) return;
    const app = applications.find(a => a.candidate_id === sliderCandidate.candidate_id);
    if (app) {
      await applicationsApi.updateStatus(app.application_id, { status });
      await refreshAll();
      addNotification('stage_change', 'Status Updated', `Moved to ${status}`);
    }
  };

  const handleSave = async (data: Partial<Candidate>) => {
    setFormLoading(true);
    try {
      if (editingCandidate) {
        await candidatesApi.update(editingCandidate.candidate_id, data);
        addNotification('system', 'Candidate Updated', 'Candidate has been updated successfully');
      } else {
        const newCandidate = await candidatesApi.create(data as Parameters<typeof candidatesApi.create>[0]);
        addNotification('system', 'Candidate Created', 'New candidate added successfully');
        if (jobs.length > 0 && data.status) {
          try {
            await applicationsApi.create({
              candidate_id: newCandidate.candidate_id,
              job_id: jobs[0].job_id,
              status: data.status,
              application_date: new Date().toISOString()
            });
          } catch (appError) {
            console.error('Failed to create application:', appError);
          }
        }
      }
      await refreshAll();
      setShowForm(false);
      setEditingCandidate(undefined);
    } catch (error) {
      console.error('Failed to save:', error);
      addNotification('system', 'Error', 'Failed to save candidate');
    } finally {
      setFormLoading(false);
    }
  };

  const handleBulkAction = async (ids: number[], action: string) => {
    try {
      const apps = applications.filter(a => ids.includes(a.candidate_id));
      if (apps.length === 0 && jobs.length > 0) {
        for (const id of ids) {
          await applicationsApi.create({
            candidate_id: id,
            job_id: jobs[0].job_id,
            status: action === 'delete' ? 'rejected' : action,
            application_date: new Date().toISOString()
          });
        }
      } else if (apps.length > 0) {
        await applicationsApi.bulkUpdate({ application_ids: apps.map(a => a.application_id), status: action === 'shortlist' ? 'shortlisted' : action });
      }
      addNotification('system', 'Bulk Action', `Applied ${action} to ${ids.length} candidates`);
      await refreshAll();
    } catch (error) {
      console.error('Bulk action failed:', error);
      addNotification('system', 'Error', 'Failed to apply bulk action');
    }
  };

  return (
    <>
      <CandidatesPage
        candidates={candidates}
        jobs={jobs}
        applications={applications}
        isLoading={isLoading}
        onCreateCandidate={() => { setEditingCandidate(undefined); setShowForm(true); }}
        onViewCandidate={handleView}
        onEditCandidate={handleEdit}
        onBulkAction={handleBulkAction}
        onRefresh={refreshAll}
      />
      <CandidateSlider
        candidate={sliderCandidate}
        isOpen={isSliderOpen}
        isLoading={isLoading}
        applications={applications}
        jobs={jobs}
        onClose={handleCloseSlider}
        onEdit={handleSliderEdit}
        onStatusChange={handleSliderStatusChange}
      />
      <CandidateFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingCandidate(undefined); }}
        onSave={handleSave}
        candidate={editingCandidate}
        jobs={jobs}
        isLoading={formLoading}
        title={editingCandidate ? 'Edit Candidate' : 'Add New Candidate'}
      />
    </>
  );
}

// Candidate Detail Page Wrapper
function CandidateDetailWrapper() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const { candidates, applications, jobs, isLoading, refreshAll } = useDataStore();
  const navigate = useNavigate();
  const [showEditForm, setShowEditForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const { addNotification } = useNotifications();

  const candidate = candidates.find(c => c.candidate_id === Number(candidateId)) ?? null;

  const handleStatusChange = async (status: string) => {
    if (!candidate) return;
    const app = applications.find(a => a.candidate_id === candidate.candidate_id);
    if (app) {
      await applicationsApi.updateStatus(app.application_id, { status });
      await refreshAll();
      addNotification('stage_change', 'Status Updated', `Moved to ${status}`);
    }
  };

  const handleSave = async (data: CandidateCreate | CandidateUpdate) => {
    if (!candidate) return;
    setFormLoading(true);
    try {
      await candidatesApi.update(candidate.candidate_id, data as CandidateUpdate);
      await refreshAll();
      setShowEditForm(false);
      addNotification('system', 'Updated', 'Candidate profile updated');
    } catch (error) {
      console.error('Failed to update:', error);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <>
      <CandidateDetailPage
        candidate={candidate}
        applications={applications}
        jobs={jobs}
        isLoading={isLoading}
        onClose={() => navigate('/candidates')}
        onEdit={() => setShowEditForm(true)}
        onStatusChange={handleStatusChange}
        onAddNote={(_note) => addNotification('system', 'Note Added', 'Note saved')}
      />
      <CandidateFormModal
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSave={handleSave}
        candidate={candidate ?? undefined}
        jobs={jobs}
        isLoading={formLoading}
        title="Edit Candidate"
      />
    </>
  );
}

// Jobs Page Wrapper
function JobsWrapper() {
  const { jobs, applications, isLoading, refreshAll } = useDataStore();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | undefined>();
  const [formLoading, setFormLoading] = useState(false);
  const { addNotification } = useNotifications();

  const handleView = (_id: number) => navigate('/jobs');

  const handleEdit = (id: number) => {
    const job = jobs.find(j => j.job_id === id);
    if (job) {
      setEditingJob(job);
      setShowForm(true);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await jobsApi.delete(id);
      await refreshAll();
      addNotification('system', 'Job Deleted', 'Job removed successfully');
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleSave = async (data: Partial<Job>) => {
    setFormLoading(true);
    try {
      if (editingJob) {
        await jobsApi.update(editingJob.job_id, data);
        addNotification('job_published', 'Job Updated', 'Job updated successfully');
      } else {
        await jobsApi.create(data as Parameters<typeof jobsApi.create>[0]);
        addNotification('job_published', 'Job Created', 'New job posted');
      }
      await refreshAll();
      setShowForm(false);
      setEditingJob(undefined);
    } catch (error) {
      console.error('Failed to save job:', error);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <>
      <JobsPage
        jobs={jobs}
        applications={applications}
        isLoading={isLoading}
        onCreateJob={() => { setEditingJob(undefined); setShowForm(true); }}
        onViewJob={handleView}
        onEditJob={handleEdit}
        onDeleteJob={handleDelete}
      />
      <JobFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingJob(undefined); }}
        onSave={handleSave}
        job={editingJob}
        isLoading={formLoading}
        title={editingJob ? 'Edit Job' : 'Create New Job'}
      />
    </>
  );
}

// Pipeline Page Wrapper
function PipelineWrapper() {
  const { candidates, jobs, applications, isLoading, refreshAll } = useDataStore();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const handleStatusChange = async (applicationId: number, status: string) => {
    await applicationsApi.updateStatus(applicationId, { status });
    await refreshAll();
    addNotification('stage_change', 'Updated', `Moved to ${status}`);
  };

  const handleBulkStatusChange = async (ids: number[], status: string) => {
    await applicationsApi.bulkUpdate({ application_ids: ids, status });
    await refreshAll();
    addNotification('stage_change', 'Bulk Update', `${ids.length} applications moved`);
  };

  return (
    <PipelinePage
      applications={applications}
      candidates={candidates}
      jobs={jobs}
      isLoading={isLoading}
      onStatusChange={handleStatusChange}
      onBulkStatusChange={handleBulkStatusChange}
      onViewCandidate={(id) => navigate(`/candidates/${id}`)}
    />
  );
}

// Analytics Page Wrapper
function AnalyticsWrapper() {
  const { candidates, applications, jobs } = useDataStore();
  return <AnalyticsPage candidates={candidates} applications={applications} jobs={jobs} isLoading={false} />;
}

// Reports Page Wrapper
function ReportsWrapper() {
  const { candidates, applications, jobs } = useDataStore();
  return <ReportsPage candidates={candidates} applications={applications} jobs={jobs} />;
}

// Copilot Page Wrapper
function CopilotWrapper() {
  const { candidates, jobs } = useDataStore();
  const navigate = useNavigate();
  return <CopilotPage candidates={candidates} jobs={jobs} onViewCandidate={(id) => navigate(`/candidates/${id}`)} />;
}

// Notifications Page Wrapper
function NotificationsWrapper() {
  const { notifications, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications();
  return (
    <NotificationsPage
      notifications={notifications}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
      onDelete={removeNotification}
      onClearAll={clearAll}
    />
  );
}

// Settings Page Wrapper
function SettingsWrapper() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return <SettingsPage user={user} onLogout={() => { logout(); navigate('/login'); }} />;
}

// App Component with Routes
function AppRoutes() {
  const location = useLocation();
  const currentPage = location.pathname.split('/')[1] || 'dashboard';

  return (
    <Routes>
      <Route path="/login" element={<AuthPageWrapper />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <MainLayout currentPage={currentPage}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardWrapper />} />
              <Route path="/candidates/*" element={<CandidatesWrapper />} />
              <Route path="/candidate-detail/:candidateId" element={<CandidateDetailWrapper />} />
              <Route path="/jobs" element={<JobsWrapper />} />
              <Route path="/pipeline" element={<PipelineWrapper />} />
              <Route path="/analytics" element={<AnalyticsWrapper />} />
              <Route path="/reports" element={<ReportsWrapper />} />
              <Route path="/copilot" element={<CopilotWrapper />} />
              <Route path="/notifications" element={<NotificationsWrapper />} />
              <Route path="/settings" element={<SettingsWrapper />} />
            </Routes>
          </MainLayout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

// Auth Page Wrapper
function AuthPageWrapper() {
  const { login, register, isLoading, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <AuthPage
      onLogin={async (email, password) => {
        await login(email, password);
      }}
      onRegister={async (name, email, password) => {
        await register(name, email, password);
      }}
      isLoading={isLoading}
      error={error}
    />
  );
}

// Main App
function App() {
  const { isAuthenticated, checkAuth } = useAuth();
  const { loadData } = useDataStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
