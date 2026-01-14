import { ApiError, type ApiClientConfig, type ApiResponse } from './types';
import { logger } from '../lib/logger';
import { defaultErrorHandler } from './errorHandler';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

function createApiClient(config: ApiClientConfig) {
  const { baseURL, onError } = config;

  const request = async <T>(
    endpoint: string,
    config: RequestInit = {},
  ): Promise<ApiResponse<T>> => {
    const { headers, ...restConfig } = config;

    const url = `${baseURL}${endpoint}`;
    logger.api.info('API 요청', { method: restConfig.method, url });

    const hasBody = restConfig.body !== undefined && restConfig.body !== null;
    const shouldSetJsonContentType = hasBody && !(restConfig.body instanceof FormData);

    const defaultHeaders: HeadersInit = {
      ...(shouldSetJsonContentType ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    };

    try {
      const response = await fetch(url, {
        ...restConfig,
        headers: defaultHeaders,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const apiError = new ApiError(
          errorData?.message || `HTTP 에러: ${response.status}`,
          response.status,
        );

        onError?.(apiError);

        throw apiError;
      }

      const data = await response.json();
      logger.api.info('API 응답', {
        method: restConfig.method,
        url,
        status: response.status,
      });
      return {
        data,
        status: response.status,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      const apiError = new ApiError(
        error instanceof Error ? error.message : '알 수 없는 서버 에러가 발생했습니다',
      );

      onError?.(apiError);

      throw apiError;
    }
  };

  return {
    get: async <T>(endpoint: string, config?: RequestInit): Promise<ApiResponse<T>> => {
      return request<T>(endpoint, { ...config, method: 'GET' });
    },

    post: async <T>(
      endpoint: string,
      body?: unknown,
      config?: RequestInit,
    ): Promise<ApiResponse<T>> => {
      return request<T>(endpoint, {
        ...config,
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      });
    },

    put: async <T>(
      endpoint: string,
      body?: unknown,
      config?: RequestInit,
    ): Promise<ApiResponse<T>> => {
      return request<T>(endpoint, {
        ...config,
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      });
    },

    delete: async <T>(endpoint: string, config?: RequestInit): Promise<ApiResponse<T>> => {
      return request<T>(endpoint, { ...config, method: 'DELETE' });
    },

    patch: async <T>(
      endpoint: string,
      body?: unknown,
      config?: RequestInit,
    ): Promise<ApiResponse<T>> => {
      return request<T>(endpoint, {
        ...config,
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
      });
    },

    postFormData: async <T>(
      endpoint: string,
      formData: FormData,
      config?: RequestInit,
    ): Promise<ApiResponse<T>> => {
      const { headers, ...restConfig } = config || {};

      const formHeaders = { ...headers };
      delete (formHeaders as Record<string, string>)['Content-Type'];

      return request<T>(endpoint, {
        ...restConfig,
        method: 'POST',
        headers: formHeaders,
        body: formData,
      });
    },
  };
}

export const apiClient = createApiClient({
  baseURL: API_BASE_URL,
  onError: defaultErrorHandler,
});
