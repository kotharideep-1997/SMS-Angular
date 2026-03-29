import type { Routes } from '@angular/router';

import { studentListAccessGuard } from '../../guards/permissions/student-list-access.guard';

export const STUDENT_LIST_ROUTES: Routes = [
  {
    path: '',
    canActivate: [studentListAccessGuard],
    loadComponent: () => import('./student-list').then((m) => m.StudentList),
  },
];
