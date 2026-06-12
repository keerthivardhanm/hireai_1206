import { apiClient } from './client';
import type {
  CandidateResponse,
  CandidateFullResponse,
  CandidateCreate,
  CandidateUpdate,
  CandidateFilters
} from '../types';

export const candidatesApi = {
  async list(filters?: CandidateFilters): Promise<CandidateResponse[]> {
    return apiClient.get<CandidateResponse[]>('/api/candidates', filters as Record<string, string | number | undefined>);
  },

  async get(id: number): Promise<CandidateResponse> {
    return apiClient.get<CandidateResponse>(`/api/candidates/${id}`);
  },

  async getFull(id: number): Promise<CandidateFullResponse> {
    return apiClient.get<CandidateFullResponse>(`/api/candidates/${id}/full`);
  },

  async create(data: CandidateCreate): Promise<CandidateResponse> {
    return apiClient.post<CandidateResponse>('/api/candidates', data);
  },

  async update(id: number, data: CandidateUpdate): Promise<CandidateResponse> {
    return apiClient.patch<CandidateResponse>(`/api/candidates/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    return apiClient.delete(`/api/candidates/${id}`);
  }
};
