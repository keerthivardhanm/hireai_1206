import { useState, useEffect, useCallback } from 'react';
import type { UserResponse } from '../types';
import { authApi } from '../api/auth';
import { apiClient, ApiError } from '../api/client';

interface AuthState {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: authApi.getStoredUser(),
    isAuthenticated: apiClient.isAuthenticated(),
    isLoading: false,
    error: null
  });

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authApi.login({ email, password });
      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      return response;
    } catch (err) {
      let message = 'Login failed. Please check your credentials.';
      if (err instanceof ApiError) {
        if (err.status === 401) {
          message = 'Invalid email or password';
        } else if (err.status === 422) {
          message = 'Invalid input. Please check your email format.';
        } else {
          message = err.message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw err;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authApi.register({ name, email, password });
      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      return response;
    } catch (err) {
      let message = 'Registration failed';
      if (err instanceof ApiError) {
        if (err.status === 422) {
          message = 'Invalid input. Please check all fields are filled correctly.';
        } else if (err.status === 409) {
          message = 'An account with this email already exists';
        } else {
          message = err.message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  }, []);

  const checkAuth = useCallback(async () => {
    if (!apiClient.isAuthenticated()) {
      return false;
    }
    try {
      const user = await authApi.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(user));
      setState(prev => ({ ...prev, user, isAuthenticated: true }));
      return true;
    } catch {
      authApi.logout();
      setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
      return false;
    }
  }, []);

  useEffect(() => {
    if (state.isAuthenticated && !state.user) {
      checkAuth();
    }
  }, [state.isAuthenticated, state.user, checkAuth]);

  return {
    ...state,
    login,
    logout,
    register,
    checkAuth
  };
}
