import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth';

/**
 * Shell layout: user must be signed in on the browser.
 * On the server, `AuthService` restores the session from the `Cookie` header when `REQUEST` is present.
 * If there is still no session during SSR (e.g. static prerender), allow the route so the browser can re-run this guard after reading `document.cookie`.
 */
export const authGuard: CanActivateFn = () => {
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
