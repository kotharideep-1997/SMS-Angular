import { CanActivateFn } from '@angular/router';

import { STUDENT_LIST_ACCESS } from './permission-keys';
import { permissionGuard } from './permission-guard.utils';

/** CanActivate — student list feature. */
export const studentListAccessGuard: CanActivateFn = () =>
  permissionGuard(STUDENT_LIST_ACCESS, 'guards.studentsPermissionDenied');
