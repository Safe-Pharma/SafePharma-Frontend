import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from '../Services/auth-session.service';

export const staffAuthGuard: CanActivateFn = () => {
  const authSession = inject(AuthSessionService);
  const router = inject(Router);
  const user = authSession.syncFromStorage();

  if (!user) {
    return router.parseUrl('/login');
  }

  if (user.role.trim().toLowerCase() === 'owner') {
    return router.parseUrl('/login');
  }

  if (user.role) {
    return true;
  }

  return router.parseUrl('/login');
};
