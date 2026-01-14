export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiResponse<T> {
  data: T;
  status: number;
}

export type ErrorHandler = (error: ApiError) => void;

export interface ApiClientConfig {
  baseURL: string;
  onError?: ErrorHandler;
}
