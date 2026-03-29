import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { authChildGuard } from './guards/auth-child.guard';
import { reportCanLoadGuard } from './guards/permissions/report-can-load.guard';
import { reportCanMatchGuard } from './guards/permissions/report-can-match.guard';
import { studentListCanLoadGuard } from './guards/permissions/student-list-can-load.guard';
import { studentListCanMatchGuard } from './guards/permissions/student-list-can-match.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout').then((m) => m.MainLayout),
    canActivate: [authGuard],
    canActivateChild: [authChildGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'reports' },
      {
        path: 'dashboard',
        pathMatch: 'full',
        redirectTo: 'reports',
      },
      {
        path: 'students',
        canMatch: [studentListCanMatchGuard],
        canLoad: [studentListCanLoadGuard],
        loadChildren: () =>
          import('./features/student-list/student-list.routes').then((m) => m.STUDENT_LIST_ROUTES),
      },
      {
        path: 'reports',
        canMatch: [reportCanMatchGuard],
        canLoad: [reportCanLoadGuard],
        loadChildren: () =>
          import('./features/reports/reports.routes').then((m) => m.REPORT_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
