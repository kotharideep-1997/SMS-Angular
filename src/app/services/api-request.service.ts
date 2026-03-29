import { isPlatformBrowser } from '@angular/common';
import {
  HttpClient,
  HttpContext,
  HttpHeaders,
  HttpInterceptorFn,
  HttpParams,
} from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_HTTP_INTERCEPTORS } from '../interceptors/app-http-interceptors';
import { SKIP_AUTH } from '../tokens/http-context.tokens';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { AuthService } from './auth';

/**
 * Options forwarded to Angular `HttpClient`. Bearer token from session cookies is merged on every call
 * unless {@link SKIP_AUTH} is set on `context` or `Authorization` is already provided.
 */
export interface ApiRequestOptions {
  headers?: HttpHeaders | Record<string, string | string[]>;
  params?: HttpParams | Record<string, string | number | boolean | readonly (string | number | boolean)[]>;
  context?: HttpContext;
  withCredentials?: boolean;
  reportProgress?: boolean;
  responseType?: 'json';
}

@Injectable({
  providedIn: 'root',
})
export class ApiRequestService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string,
    @Inject(APP_HTTP_INTERCEPTORS) readonly interceptors: readonly HttpInterceptorFn[],
    @Inject(PLATFORM_ID) private readonly platformId: object,
    private readonly auth: AuthService,
  ) {}

  /** `path` is relative to `apiBaseUrl`, e.g. `/api/Auth/login`. */
  private resolve(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const base = this.apiBaseUrl.replace(/\/+$/, '');
    return `${base}${normalized}`;
  }

  /**
   * Adds `Authorization: Bearer <access_token>` when a token exists (browser only).
   * Skipped when `context` has {@link SKIP_AUTH} or `Authorization` is already set.
   */
  private withAuth(options?: ApiRequestOptions): ApiRequestOptions | undefined {
    if (options?.context?.get(SKIP_AUTH)) {
      return options;
    }

    if (!isPlatformBrowser(this.platformId)) {
      return options;
    }

    const token = this.auth.getAccessToken();
    if (!token) {
      return options;
    }

    const headers = options?.headers;

    if (headers instanceof HttpHeaders) {
      if (headers.has('Authorization')) {
        return options;
      }
      return { ...options, headers: headers.set('Authorization', `Bearer ${token}`) };
    }

    if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
      const rec = headers as Record<string, string | string[]>;
      if ('Authorization' in rec || 'authorization' in rec) {
        return options;
      }
      return { ...options, headers: { ...rec, Authorization: `Bearer ${token}` } };
    }

    return { ...options, headers: { Authorization: `Bearer ${token}` } };
  }

  get<T>(path: string, options?: ApiRequestOptions): Observable<T> {
    return this.http.get<T>(this.resolve(path), this.withAuth(options));
  }

  post<T>(path: string, body: unknown | null, options?: ApiRequestOptions): Observable<T> {
    return this.http.post<T>(this.resolve(path), body, this.withAuth(options));
  }

  put<T>(path: string, body: unknown | null, options?: ApiRequestOptions): Observable<T> {
    return this.http.put<T>(this.resolve(path), body, this.withAuth(options));
  }

  patch<T>(path: string, body: unknown | null, options?: ApiRequestOptions): Observable<T> {
    return this.http.patch<T>(this.resolve(path), body, this.withAuth(options));
  }

  delete<T>(path: string, options?: ApiRequestOptions): Observable<T> {
    return this.http.delete<T>(this.resolve(path), this.withAuth(options));
  }

  /** Custom or uncommon HTTP verbs. */
  request<T>(method: string, path: string, options?: ApiRequestOptions & { body?: unknown | null }): Observable<T> {
    return this.http.request<T>(method, this.resolve(path), this.withAuth(options));
  }
}
