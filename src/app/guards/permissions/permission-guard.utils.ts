import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '../../services/auth';
import { GeneralContextService } from '../../services/general-context.service';
import { ToastMessageService } from '../../services/toast-message.service';

/** Shared outcome for {@link permissionGuard} (used by CanActivate, CanMatch, CanLoad). */
export type PermissionGuardResult = true | UrlTree;

/**
 * Single gate for permission-based routes: SSR defer, auth redirect, then keys or deny+toast+redirect home.
 */
export function permissionGuard(
  keys: readonly string[],
  messagePath: string,
): PermissionGuardResult {
  const auth = inject(AuthService);
  const ssrDefer = deferGuardOnSsrIfNoSession(auth);
  if (ssrDefer !== null) {
    return true;
  }

  const authCheck = redirectIfNotAuthenticated();
  if (authCheck !== true) {
    return authCheck;
  }

  if (auth.hasAnyPermissionKey(keys)) {
    return true;
  }

  return denyWithToastAndRedirectDashboard(messagePath);
}

/**
 * When SSR has no session (no cookies on the request), defer guard logic to the browser
 * after `document.cookie` is available.
 */
export function deferGuardOnSsrIfNoSession(auth: AuthService): true | null {
  const platformId = inject(PLATFORM_ID);
  if (isPlatformBrowser(platformId)) {
    return null;
  }
  if (!auth.isAuthenticated()) {
    return true;
  }
  return null;
}

export function redirectIfNotAuthenticated(): true | UrlTree {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (auth.isAuthenticated()) {
    return true;
  }

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  return router.createUrlTree(['/login']);
}

export function denyWithToastAndRedirectDashboard(messagePath: string): UrlTree {
  const router = inject(Router);
  const auth = inject(AuthService);
  const ctx = inject(GeneralContextService);
  const platformId = inject(PLATFORM_ID);
  if (isPlatformBrowser(platformId)) {
    const toast = inject(ToastMessageService);
    toast.error(ctx.text('guards.toastErrorTitle'), ctx.text(messagePath));
  }
  const path = auth.getPostDenyRedirectPath();
  const segments = path.replace(/^\//, '').split('/').filter(Boolean);
  return router.createUrlTree(segments.length ? segments : ['login']);
}
