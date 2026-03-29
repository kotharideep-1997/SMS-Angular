import { CanLoadFn } from '@angular/router';

import { REPORT_ACCESS } from './permission-keys';
import { permissionGuard } from './permission-guard.utils';

/** CanLoad — runs before `loadChildren` fetches the reports route bundle. */
export const reportCanLoadGuard: CanLoadFn = () =>
  permissionGuard(REPORT_ACCESS, 'guards.reportsPermissionDenied');
