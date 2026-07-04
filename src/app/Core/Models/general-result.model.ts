export interface ApiError {
  errorCode: string;
  errorMessage: string;
}

export interface GeneralResult<T> {
  success: boolean;
  message: string;
  errors: Record<string, ApiError[]> | null;
  data: T | null;
}