import type { Routes } from '@angular/router';

import { reportAccessGuard } from '../../guards/permissions/report-access.guard';

export const REPORT_ROUTES: Routes = [
  {
    path: '',
    canActivate: [reportAccessGuard],
    loadComponent: () => import('./reports').then((m) => m.Reports),
  },
];
