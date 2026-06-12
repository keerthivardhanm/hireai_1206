import { apiClient } from './client';
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  UserResponse
} from '../types';

export const authApi = {
  async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>('/api/auth/login', data);
    apiClient.setTokens(response.access_token, response.refresh_token);
    localStorage.setItem('user', JSON.stringify(response.user));
    return response;
  },

  async register(data: RegisterRequest): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>('/api/auth/register', data);
    apiClient.setTokens(response.access_token, response.refresh_token);
    localStorage.setItem('user', JSON.stringify(response.user));
    return response;
  },

  async logout(): Promise<void> {
    apiClient.clearTokens();
  },

  async getCurrentUser(): Promise<UserResponse> {
    return apiClient.get<UserResponse>('/api/auth/me');
  },

  async refreshToken(): Promise<TokenResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token');
    }
    const response = await apiClient.post<TokenResponse>('/api/auth/refresh', {
      refresh_token: refreshToken
    });
    apiClient.setTokens(response.access_token, response.refresh_token);
    return response;
  },

  getStoredUser(): UserResponse | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated(): boolean {
    return apiClient.isAuthenticated();
  }
};
