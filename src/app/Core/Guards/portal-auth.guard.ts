import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PortalAuthService } from '../../Features/CustomerPortal/Services/portal-auth.service';

export const portalAuthGuard: CanActivateFn = () => {
  const portalAuth = inject(PortalAuthService);
  const router = inject(Router);

  if (portalAuth.ensureSession()) {
    return true;
  }

  return router.parseUrl('/portal/login');
};