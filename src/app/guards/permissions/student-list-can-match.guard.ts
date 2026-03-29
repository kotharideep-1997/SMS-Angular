import { CanMatchFn } from '@angular/router';

import { STUDENT_LIST_ACCESS } from './permission-keys';
import { permissionGuard } from './permission-guard.utils';

/**
 * CanMatch — decides if the `students` route config applies before lazy loading.
 * Use together with {@link studentListCanLoadGuard} and {@link studentListAccessGuard}.
 */
export const studentListCanMatchGuard: CanMatchFn = () =>
  permissionGuard(STUDENT_LIST_ACCESS, 'guards.studentsPermissionDenied');
