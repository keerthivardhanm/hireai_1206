import { apiClient } from './client';
import type { JobResponse, JobCreate, JobUpdate, PaginationParams } from '../types';

export const jobsApi = {
  async list(params?: PaginationParams): Promise<JobResponse[]> {
    return apiClient.get<JobResponse[]>('/api/jobs', params as Record<string, string | number | undefined>);
  },

  async get(id: number): Promise<JobResponse> {
    return apiClient.get<JobResponse>(`/api/jobs/${id}`);
  },

  async create(data: JobCreate): Promise<JobResponse> {
    return apiClient.post<JobResponse>('/api/jobs', data);
  },

  async update(id: number, data: JobUpdate): Promise<JobResponse> {
    return apiClient.patch<JobResponse>(`/api/jobs/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    return apiClient.delete(`/api/jobs/${id}`);
  }
};
