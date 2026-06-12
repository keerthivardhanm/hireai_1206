import { useState, useEffect, useCallback } from 'react';
import type { Candidate, Application, Job } from '../types';
import { candidatesApi } from '../api/candidates';
import { jobsApi } from '../api/jobs';
import { applicationsApi } from '../api/applications';
import { apiClient, ApiError } from '../api/client';

interface DataState {
  candidates: Candidate[];
  jobs: Job[];
  applications: Application[];
  isLoading: boolean;
  error: string | null;
}

// Local storage keys
const CACHE_KEYS = {
  CANDIDATES: 'hr_store_candidates',
  JOBS: 'hr_store_jobs',
  APPLICATIONS: 'hr_store_applications',
};

function normalizeStatus(status?: string): string {
  return String(status || '').toLowerCase().trim();
}

function calculateScore(candidate: { skills: string; experience_years: number; education: string; projects: string }): number {
  const skillsCount = candidate.skills ? candidate.skills.split(',').length : 0;
  const experienceScore = Math.min((candidate.experience_years || 0) * 10, 40);
  const educationLower = (candidate.education || '').toLowerCase();
  const educationBonus = educationLower.includes('phd') ? 20 :
    educationLower.includes('master') ? 15 :
    educationLower.includes('bachelor') ? 10 : 5;
  const projectScore = Math.min((candidate.projects ? candidate.projects.split(',').length : 0) * 5, 20);

  const baseScore = skillsCount * 5 + experienceScore + educationBonus + projectScore;
  return Math.min(baseScore, 100);
}

// Unified mapping helper to relationalize raw API data
function processRawData(candidatesRaw: any[], jobsRaw: any[], applicationsRaw: any[]) {
  const candidates: Candidate[] = candidatesRaw.map(c => ({
    ...c,
    score: calculateScore(c),
    status: 'Applied' as const
  }));

  const jobs: Job[] = jobsRaw.map(j => ({
    ...j,
    department: 'General',
    status: 'open' as const,
    applicants_count: applicationsRaw.filter(a => a.job_id === j.job_id).length
  }));

  const applications: Application[] = applicationsRaw.map(a => {
    const candidate = candidates.find(c => c.candidate_id === a.candidate_id);
    const job = jobs.find(j => j.job_id === a.job_id);
    return {
      ...a,
      candidate,
      job,
      score: candidate?.score
    };
  });

  applications.forEach(app => {
    const candidate = candidates.find(c => c.candidate_id === app.candidate_id);
    if (candidate) {
      candidate.status = app.status as Candidate['status'];
    }
  });

  return { candidates, jobs, applications };
}

export function useDataStore() {
  const [state, setState] = useState<DataState>(() => {
    // Synchronously initialize state from localStorage if available
    try {
      const cachedCandidates = localStorage.getItem(CACHE_KEYS.CANDIDATES);
      const cachedJobs = localStorage.getItem(CACHE_KEYS.JOBS);
      const cachedApplications = localStorage.getItem(CACHE_KEYS.APPLICATIONS);

      if (cachedCandidates && cachedJobs && cachedApplications) {
        return {
          candidates: JSON.parse(cachedCandidates),
          jobs: JSON.parse(cachedJobs),
          applications: JSON.parse(cachedApplications),
          isLoading: false,
          error: null,
        };
      }
    } catch (e) {
      console.error('Failed to parse cached data on init:', e);
    }

    return {
      candidates: [],
      jobs: [],
      applications: [],
      isLoading: false,
      error: null
    };
  });

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!apiClient.isAuthenticated()) return;

    // If we already have local data and a refresh isn't explicitly forced, skip the API call
    if (!forceRefresh && state.candidates.length > 0) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const [candidatesData, jobsData, applicationsData] = await Promise.all([
        candidatesApi.list({ page: 1, page_size: 100 }),
        jobsApi.list({ page: 1, page_size: 100 }),
        applicationsApi.list({ page: 1, page_size: 100 })
      ]);

      const { candidates, jobs, applications } = processRawData(candidatesData, jobsData, applicationsData);

      // Store in local storage
      localStorage.setItem(CACHE_KEYS.CANDIDATES, JSON.stringify(candidates));
      localStorage.setItem(CACHE_KEYS.JOBS, JSON.stringify(jobs));
      localStorage.setItem(CACHE_KEYS.APPLICATIONS, JSON.stringify(applications));

      setState({
        candidates,
        jobs,
        applications,
        isLoading: false,
        error: null
      });
    } catch (err) {
      let message = 'Failed to load data';
      if (err instanceof ApiError) {
        if (err.status === 401) {
          message = 'Session expired. Please log in again.';
        } else if (err.status === 422) {
          message = 'Invalid request format';
        } else {
          message = err.message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      console.error('Failed to load data:', err);
    }
  }, [state.candidates.length]);

  const refreshAll = useCallback(async (forceRefresh = true) => {
    if (!apiClient.isAuthenticated()) return;

    // Default to bypassing cache on an explicit refreshAll call, but can be configured
    if (!forceRefresh && state.candidates.length > 0) return;

    try {
      const [candidatesData, jobsData, applicationsData] = await Promise.all([
        candidatesApi.list({ page: 1, page_size: 100 }),
        jobsApi.list({ page: 1, page_size: 100 }),
        applicationsApi.list({ page: 1, page_size: 100 })
      ]);

      const { candidates, jobs, applications } = processRawData(candidatesData, jobsData, applicationsData);

      localStorage.setItem(CACHE_KEYS.CANDIDATES, JSON.stringify(candidates));
      localStorage.setItem(CACHE_KEYS.JOBS, JSON.stringify(jobs));
      localStorage.setItem(CACHE_KEYS.APPLICATIONS, JSON.stringify(applications));

      setState(prev => ({
        ...prev,
        candidates,
        jobs,
        applications
      }));
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  }, [state.candidates.length]);

  const refreshCandidates = useCallback(async () => {
    if (!apiClient.isAuthenticated()) return;

    try {
      const data = await candidatesApi.list({ page: 1, page_size: 1000 });
      const candidates: Candidate[] = data.map(c => ({
        ...c,
        score: calculateScore(c)
      }));

      setState(prev => {
        const updatedApplications = prev.applications.map(app => {
          const candidate = candidates.find(c => c.candidate_id === app.candidate_id);
          return {
            ...app,
            candidate,
            score: candidate?.score
          };
        });

        candidates.forEach(c => {
          const app = prev.applications.find(a => a.candidate_id === c.candidate_id);
          if (app) {
            c.status = app.status as Candidate['status'];
          }
        });

        localStorage.setItem(CACHE_KEYS.CANDIDATES, JSON.stringify(candidates));
        localStorage.setItem(CACHE_KEYS.APPLICATIONS, JSON.stringify(updatedApplications));

        return {
          ...prev,
          candidates,
          applications: updatedApplications
        };
      });
    } catch (err) {
      console.error('Failed to refresh candidates:', err);
    }
  }, []);

  const refreshJobs = useCallback(async () => {
    if (!apiClient.isAuthenticated()) return;

    try {
      const data = await jobsApi.list({ page: 1, page_size: 1000 });
      const jobs: Job[] = data.map(j => ({
        ...j,
        department: 'General',
        status: 'open' as const
      }));

      setState(prev => {
        const updatedApplications = prev.applications.map(app => {
          const job = jobs.find(j => j.job_id === app.job_id);
          return { ...app, job };
        });

        jobs.forEach(j => {
          j.applicants_count = prev.applications.filter(a => a.job_id === j.job_id).length;
        });

        localStorage.setItem(CACHE_KEYS.JOBS, JSON.stringify(jobs));
        localStorage.setItem(CACHE_KEYS.APPLICATIONS, JSON.stringify(updatedApplications));

        return {
          ...prev,
          jobs,
          applications: updatedApplications
        };
      });
    } catch (err) {
      console.error('Failed to refresh jobs:', err);
    }
  }, []);

  const refreshApplications = useCallback(async () => {
    if (!apiClient.isAuthenticated()) return;

    try {
      const data = await applicationsApi.list({ page: 1, page_size: 1000 });
      
      setState(prev => {
        const applications: Application[] = data.map(a => {
          const candidate = prev.candidates.find(c => c.candidate_id === a.candidate_id);
          const job = prev.jobs.find(j => j.job_id === a.job_id);
          return {
            ...a,
            candidate,
            job,
            score: candidate?.score
          };
        });

        const updatedCandidates = prev.candidates.map(c => {
          const app = applications.find(a => a.candidate_id === c.candidate_id);
          if (app) {
            return { ...c, status: app.status as Candidate['status'] };
          }
          return c;
        });

        const updatedJobs = prev.jobs.map(j => ({
          ...j,
          applicants_count: applications.filter(a => a.job_id === j.job_id).length
        }));

        localStorage.setItem(CACHE_KEYS.CANDIDATES, JSON.stringify(updatedCandidates));
        localStorage.setItem(CACHE_KEYS.JOBS, JSON.stringify(updatedJobs));
        localStorage.setItem(CACHE_KEYS.APPLICATIONS, JSON.stringify(applications));

        return {
          ...prev,
          candidates: updatedCandidates,
          jobs: updatedJobs,
          applications
        };
      });
    } catch (err) {
      console.error('Failed to refresh applications:', err);
    }
  }, []); // Safe dependency array preventing loops

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    ...state,
    loadData,
    refreshAll,
    refreshCandidates,
    refreshJobs,
    refreshApplications
  };
}