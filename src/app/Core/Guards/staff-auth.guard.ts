import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from '../Services/auth-session.service';

export const staffAuthGuard: CanActivateFn = () => {
  const authSession = inject(AuthSessionService);
  const router = inject(Router);

  if (authSession.ensureSession()) {
    return true;
  }

  return router.parseUrl('/login');
};