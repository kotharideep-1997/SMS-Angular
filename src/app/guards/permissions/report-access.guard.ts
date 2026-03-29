import { CanActivateFn } from '@angular/router';

import { REPORT_ACCESS } from './permission-keys';
import { permissionGuard } from './permission-guard.utils';

/** CanActivate — reports dashboard. */
export const reportAccessGuard: CanActivateFn = () =>
  permissionGuard(REPORT_ACCESS, 'guards.reportsPermissionDenied');
