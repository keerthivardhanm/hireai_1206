// API Types based on OpenAPI specification

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'recruiter' | 'viewer';
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string | null;
  token_type: string;
  user: UserResponse;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'recruiter' | 'viewer';
  created_at: string;
}

// Candidate Types
export interface CandidateCreate {
  name: string;
  email: string;
  skills: string;
  experience_years: number;
  education: string;
  projects: string;
}

export interface CandidateUpdate {
  name?: string | null;
  email?: string | null;
  skills?: string | null;
  experience_years?: number | null;
  education?: string | null;
  projects?: string | null;
}

export interface CandidateResponse {
  candidate_id: number;
  name: string;
  email: string;
  skills: string;
  experience_years: number;
  education: string;
  projects: string;
}

export interface ScoreResponse {
  candidate_id: number;
  job_id: number;
  score: number;
  skills_match: number;
  experience_score: number;
  project_score: number;
  label: string;
}

export interface CandidateFullResponse extends CandidateResponse {
  applications?: ApplicationResponse[];
  scores?: ScoreResponse[];
}

// Job Types
export interface JobCreate {
  role: string;
  required_skills: string;
  min_experience: number;
}

export interface JobUpdate {
  role?: string | null;
  required_skills?: string | null;
  min_experience?: number | null;
}

export interface JobResponse {
  job_id: number;
  role: string;
  required_skills: string;
  min_experience: number;
}

// Application Types
export type ApplicationStatus = 'applied' | 'shortlisted' | 'interviewed' | 'offered' | 'hired' | 'rejected';

export interface ApplicationCreate {
  candidate_id: number;
  job_id: number;
  status: string;
  application_date: string;
}

export interface ApplicationUpdate {
  candidate_id?: number | null;
  job_id?: number | null;
  status?: string | null;
  application_date?: string | null;
}

export interface ApplicationStatusUpdate {
  status: string;
}

export interface ApplicationBulkUpdate {
  application_ids: number[];
  status: string;
}

export interface ApplicationResponse {
  application_id: number;
  candidate_id: number;
  job_id: number;
  status: string;
  application_date: string;
}

// Pagination & Filter Types
export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface CandidateFilters extends PaginationParams {
  skills?: string;
  min_score?: number;
  max_score?: number;
  job_id?: number;
}

export interface ApplicationFilters extends PaginationParams {
  job_id?: number;
  status?: string;
}

// UI Enhancement Types
export interface Candidate extends CandidateResponse {
  status?: ApplicationStatus;
  score?: number;
  matchedJob?: string;
  avatar?: string;
  phone?: string;
  location?: string;
  source?: string;
  expected_salary?: number;
  notes?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Job extends JobResponse {
  department?: string;
  location?: string;
  type?: 'full-time' | 'part-time' | 'contract' | 'internship';
  salary_min?: number;
  salary_max?: number;
  description?: string;
  status?: 'open' | 'closed' | 'archived' | 'draft';
  posted_date?: string;
  applicants_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Application extends ApplicationResponse {
  candidate?: Candidate;
  job?: Job;
  score?: number;
  notes?: string;
  interview_date?: string;
  updated_at?: string;
}

// Analytics Types
export interface DashboardStats {
  totalJobs: number;
  totalApplications: number;
  averageScore: number;
  hiredCount: number;
  openJobs: number;
  shortlistedCount: number;
  interviewsScheduled: number;
  offersSent: number;
}

export interface FunnelData {
  stage: string;
  count: number;
  percentage: number;
}

export interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface TrendData {
  date: string;
  applications: number;
  hired: number;
}

export interface DepartmentData {
  department: string;
  jobs: number;
  applications: number;
  hired: number;
}

export interface SkillGap {
  skill: string;
  demand: number;
  supply: number;
  gap: number;
}

// Notification Types
export interface Notification {
  id: number;
  type: 'stage_change' | 'interview' | 'job_published' | 'report_ready' | 'copilot' | 'system';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

// Report Types
export interface ReportConfig {
  type: 'candidates' | 'jobs' | 'funnel' | 'summary' | 'department';
  format: 'pdf' | 'csv' | 'excel';
  filters?: {
    date_from?: string;
    date_to?: string;
    department?: string;
    job_id?: number;
  };
}

// Audit Log Types
export interface AuditLog {
  id: number;
  action: string;
  entity_type: 'candidate' | 'job' | 'application';
  entity_id: number;
  user_id: number;
  user_name: string;
  details: string;
  created_at: string;
}

// Copilot Types
export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  candidates?: Candidate[];
  actions?: CopilotAction[];
}

export interface CopilotAction {
  type: 'view_candidate' | 'shortlist' | 'compare' | 'schedule';
  label: string;
  data: Record<string, unknown>;
}
