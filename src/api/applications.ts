import { apiClient } from './client';
import type {
  ApplicationResponse,
  ApplicationCreate,
  ApplicationUpdate,
  ApplicationStatusUpdate,
  ApplicationBulkUpdate,
  ApplicationFilters
} from '../types';

export const applicationsApi = {
  async list(filters?: ApplicationFilters): Promise<ApplicationResponse[]> {
    return apiClient.get<ApplicationResponse[]>('/api/applications', filters as Record<string, string | number | undefined>);
  },

  async get(id: number): Promise<ApplicationResponse> {
    return apiClient.get<ApplicationResponse>(`/api/applications/${id}`);
  },

  async create(data: ApplicationCreate): Promise<ApplicationResponse> {
    return apiClient.post<ApplicationResponse>('/api/applications', data);
  },

  async update(id: number, data: ApplicationUpdate): Promise<ApplicationResponse> {
    return apiClient.patch<ApplicationResponse>(`/api/applications/${id}`, data);
  },

  async updateStatus(id: number, data: ApplicationStatusUpdate): Promise<ApplicationResponse> {
    return apiClient.patch<ApplicationResponse>(`/api/applications/${id}/status`, data);
  },

  async bulkUpdate(data: ApplicationBulkUpdate): Promise<Record<string, unknown>> {
    return apiClient.patch<Record<string, unknown>>('/api/applications/bulk', data);
  }
};
