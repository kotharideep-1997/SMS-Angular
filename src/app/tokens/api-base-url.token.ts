import { InjectionToken } from '@angular/core';

/** API origin (no trailing slash). Provided from `environment.apiBaseUrl` in `app.config`. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
