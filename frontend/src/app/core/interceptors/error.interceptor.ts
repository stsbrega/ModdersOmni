import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'An unexpected error occurred';

      if (error.status === 0) {
        message = 'Unable to connect to server. Is the backend running?';
      } else if (error.status === 404) {
        message = 'Resource not found';
      } else if (error.status === 422) {
        message = error.error?.detail || 'Invalid request data';
      } else if (error.status >= 500) {
        message = 'Server error. Please try again later.';
      } else if (error.error?.detail) {
        message = error.error.detail;
      }

      notifications.error(message);
      return throwError(() => error);
    })
  );
};
