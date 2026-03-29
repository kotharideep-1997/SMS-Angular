import { isPlatformBrowser } from '@angular/common';
import { HttpContext } from '@angular/common/http';
import {
  Inject,
  Injectable,
  Injector,
  Optional,
  PLATFORM_ID,
  REQUEST,
  signal,
} from '@angular/core';
import { Observable } from 'rxjs';

import type { LoginApiEnvelope, LoginData, LoginRequest } from '../models/auth-api.model';
import { REPORT_ACCESS, STUDENT_LIST_ACCESS } from '../guards/permissions/permission-keys';
import { SKIP_AUTH } from '../tokens/http-context.tokens';
import { ApiRequestService } from './api-request.service';

const COOKIE_ACCESS = 'sms_access_token';
const COOKIE_REFRESH = 'sms_refresh_token';
const COOKIE_META = 'sms_auth_meta';

/**
 * Single entry for authentication: login API, cookie session, permissions, and navigation helpers.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  isAuthenticated = signal<boolean>(false);
  /** Permission strings from the last login / cookie restore (API casing). */
  permissions = signal<readonly string[]>([]);

  constructor(
    private readonly injector: Injector,
    @Inject(PLATFORM_ID) private readonly platformId: object,
    @Optional() @Inject(REQUEST) private readonly serverRequest: Request | null,
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.restoreSessionFromCookies();
    } else if (this.serverRequest) {
      this.restoreSessionFromServerCookies();
    }
  }

  /** POST /api/Auth/login (no Bearer on this call). */
  login(body: LoginRequest): Observable<LoginApiEnvelope> {
    const apiRequest = this.injector.get(ApiRequestService);
    return apiRequest.post<LoginApiEnvelope>('/api/Auth/login', body, {
      context: new HttpContext().set(SKIP_AUTH, true),
      headers: { Accept: '*/*' },
    });
  }

  /** Bearer token for {@link ApiRequestService} (browser only). */
  getAccessToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return this.parseCookies()[COOKIE_ACCESS] ?? null;
  }

  setSessionFromLogin(data: LoginData): void {
    this.saveLoginData(data);
    this.isAuthenticated.set(true);
    this.permissions.set([...data.permissions]);
  }

  logout(): void {
    this.isAuthenticated.set(false);
    this.permissions.set([]);
    this.clearLoginData();
  }

  /** Case-insensitive match — API may send `create`, `report`, etc. */
  hasPermissionKey(name: string): boolean {
    const n = name.toLowerCase();
    return this.permissions().some((p) => p.toLowerCase() === n);
  }

  hasAnyPermissionKey(keys: readonly string[]): boolean {
    return keys.some((k) => this.hasPermissionKey(k));
  }

  getDefaultHomePath(): string {
    if (this.hasAnyPermissionKey(REPORT_ACCESS)) {
      return '/reports';
    }
    if (this.hasAnyPermissionKey(STUDENT_LIST_ACCESS)) {
      return '/students';
    }
    return '/login';
  }

  getPostDenyRedirectPath(): string {
    if (this.hasAnyPermissionKey(REPORT_ACCESS)) {
      return '/reports';
    }
    if (this.hasAnyPermissionKey(STUDENT_LIST_ACCESS)) {
      return '/students';
    }
    return '/login';
  }

  private restoreSessionFromCookies(): void {
    const session = this.loadLoginData();
    this.applySession(session);
  }

  private restoreSessionFromServerCookies(): void {
    const header = this.serverRequest?.headers.get('cookie') ?? null;
    const session = this.loadLoginDataFromCookieHeader(header);
    this.applySession(session);
  }

  private applySession(session: LoginData | null): void {
    if (!session?.accessToken) return;
    this.isAuthenticated.set(true);
    this.permissions.set([...(session.permissions ?? [])]);
  }

  private saveLoginData(data: LoginData): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const maxAgeAccess = this.secondsUntil(data.accessTokenExpiresAtUtc);
    const maxAgeRefresh = this.secondsUntil(data.refreshTokenExpiresAtUtc);
    this.setCookie(COOKIE_ACCESS, data.accessToken, maxAgeAccess);
    this.setCookie(COOKIE_REFRESH, data.refreshToken, maxAgeRefresh);
    const meta = JSON.stringify({
      userId: data.userId,
      userName: data.userName,
      permissions: data.permissions,
      accessTokenExpiresAtUtc: data.accessTokenExpiresAtUtc,
      refreshTokenExpiresAtUtc: data.refreshTokenExpiresAtUtc,
    });
    this.setCookie(COOKIE_META, meta, maxAgeRefresh);
  }

  private loadLoginData(): LoginData | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return this.buildLoginDataFromCookieMap(this.parseCookies());
  }

  private loadLoginDataFromCookieHeader(cookieHeader: string | null): LoginData | null {
    return this.buildLoginDataFromCookieMap(this.parseCookieHeaderString(cookieHeader));
  }

  private buildLoginDataFromCookieMap(cookies: Record<string, string>): LoginData | null {
    const accessToken = cookies[COOKIE_ACCESS];
    const refreshToken = cookies[COOKIE_REFRESH];
    const metaRaw = cookies[COOKIE_META];
    if (!accessToken || !refreshToken || !metaRaw) return null;
    try {
      const meta = JSON.parse(metaRaw) as Omit<LoginData, 'accessToken' | 'refreshToken'>;
      return {
        accessToken,
        refreshToken,
        userId: meta.userId,
        userName: meta.userName,
        permissions: meta.permissions ?? [],
        accessTokenExpiresAtUtc: meta.accessTokenExpiresAtUtc,
        refreshTokenExpiresAtUtc: meta.refreshTokenExpiresAtUtc,
      };
    } catch {
      return null;
    }
  }

  private parseCookieHeaderString(header: string | null): Record<string, string> {
    if (!header?.trim()) return {};
    return header.split(';').reduce(
      (acc, part) => {
        const trimmed = part.trim();
        const eq = trimmed.indexOf('=');
        if (eq < 0) return acc;
        const key = decodeURIComponent(trimmed.slice(0, eq).trim());
        const val = decodeURIComponent(trimmed.slice(eq + 1).trim());
        acc[key] = val;
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  private clearLoginData(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.deleteCookie(COOKIE_ACCESS);
    this.deleteCookie(COOKIE_REFRESH);
    this.deleteCookie(COOKIE_META);
  }

  private secondsUntil(utc: string): number {
    const ms = new Date(utc).getTime() - Date.now();
    if (Number.isNaN(ms) || ms <= 0) return 7 * 24 * 3600;
    return Math.max(60, Math.floor(ms / 1000));
  }

  private setCookie(name: string, value: string, maxAgeSeconds: number): void {
    const secure =
      typeof globalThis !== 'undefined' &&
      'location' in globalThis &&
      (globalThis as unknown as { location?: { protocol?: string } }).location?.protocol ===
        'https:'
        ? '; Secure'
        : '';
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
  }

  private deleteCookie(name: string): void {
    document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`;
  }

  private parseCookies(): Record<string, string> {
    if (!document.cookie) return {};
    return document.cookie.split(';').reduce(
      (acc, part) => {
        const trimmed = part.trim();
        const eq = trimmed.indexOf('=');
        if (eq < 0) return acc;
        const key = decodeURIComponent(trimmed.slice(0, eq));
        const val = decodeURIComponent(trimmed.slice(eq + 1));
        acc[key] = val;
        return acc;
      },
      {} as Record<string, string>,
    );
  }
}
