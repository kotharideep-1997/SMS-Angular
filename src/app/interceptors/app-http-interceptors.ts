import { HttpInterceptorFn } from '@angular/common/http';
import { InjectionToken } from '@angular/core';

import { httpInterceptor } from './http.interceptor';

/** Single list used by `provideHttpClient(withInterceptors(...))` and injected into `ApiRequestService`. */
export const appHttpInterceptors: HttpInterceptorFn[] = [httpInterceptor];

export const APP_HTTP_INTERCEPTORS = new InjectionToken<readonly HttpInterceptorFn[]>(
  'APP_HTTP_INTERCEPTORS',
  {
    providedIn: 'root',
    factory: () => appHttpInterceptors,
  },
);
