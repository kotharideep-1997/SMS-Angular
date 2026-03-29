import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';

import { AuthService } from '../services/auth';

/**
 * Re-validates authentication on every child route under the shell (layout).
 * Pair with {@link authGuard} on the parent; permissions stay on feature guards.
 */
export const authChildGuard: CanActivateChildFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (authService.isAuthenticated()) {
    return true;
  }

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
