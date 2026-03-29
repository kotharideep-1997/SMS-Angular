import { CanMatchFn } from '@angular/router';

import { REPORT_ACCESS } from './permission-keys';
import { permissionGuard } from './permission-guard.utils';

/**
 * CanMatch — decides if the `reports` route config applies before lazy loading.
 */
export const reportCanMatchGuard: CanMatchFn = () =>
  permissionGuard(REPORT_ACCESS, 'guards.reportsPermissionDenied');
