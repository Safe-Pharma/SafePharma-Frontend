import { HttpErrorResponse } from '@angular/common/http';

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const apiMessage =
      err.error?.message ?? err.error?.title ?? (typeof err.error === 'string' ? err.error : null);

    if (apiMessage) return apiMessage;
    if (err.status === 0) return 'Cannot reach the server. Check your connection.';
    if (err.status === 401) return 'Invalid email or password.';
    if (err.status >= 500) return 'Something went wrong on our end. Please try again.';
    if (err.status >= 400) return 'Invalid request. Please check your input.';
    if (err.status >= 300) return 'Unexpected response from the server. Please try again.';
    if(err.status==403) return 'You are not authorized to access this resource.';
  }
  return fallback;
}