import { CanLoadFn } from '@angular/router';

import { STUDENT_LIST_ACCESS } from './permission-keys';
import { permissionGuard } from './permission-guard.utils';

/**
 * CanLoad — runs before `loadChildren` fetches the student-list route bundle.
 * Pair with {@link studentListCanMatchGuard} and {@link studentListAccessGuard}.
 */
export const studentListCanLoadGuard: CanLoadFn = () =>
  permissionGuard(STUDENT_LIST_ACCESS, 'guards.studentsPermissionDenied');
