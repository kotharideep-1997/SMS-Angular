import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subscription, filter, finalize } from 'rxjs';
import type { AppConfig } from '../../app-config/app-config.model';
import appConfigJson from '../../app-config/config.json';
import type { EnContext } from '../../context/en-context.model';

const appConfig = appConfigJson as AppConfig;
import { AuthService } from '../../services/auth';
import { GeneralContextService } from '../../services/general-context.service';
import { ToastMessageService } from '../../services/toast-message.service';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { NoPermissionsDialog } from './no-permissions-dialog/no-permissions-dialog';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  isLoading = false;
  ui: EnContext['login'] | null = null;

  private readonly platformId = inject(PLATFORM_ID);
  private authApiSub?: Subscription;
  private contextSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private generalContext: GeneralContextService,
    private readonly toast: ToastMessageService,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    const usernameRe = new RegExp(appConfig.login.usernamePattern);
    const passwordRe = new RegExp(appConfig.login.passwordPattern);

    this.loginForm = this.fb.group({
      username: ['Admin', [Validators.required, Validators.pattern(usernameRe)]],
      password: ['admin123', [Validators.required, Validators.pattern(passwordRe)]],
    });

    this.contextSub = this.generalContext.context$
      .pipe(filter((c): c is EnContext => c !== null))
      .subscribe((c) => {
        this.ui = c.login;
      });

    if (
      isPlatformBrowser(this.platformId) &&
      this.authService.isAuthenticated() &&
      this.authService.permissions().length === 0
    ) {
      queueMicrotask(() => {
        this.openNoPermissionsDialog();
        this.authService.logout();
      });
    }
  }

  onSubmit(): void {
    if (!this.loginForm.valid || this.isLoading) return;

    this.isLoading = true;
    const { username, password } = this.loginForm.value;

    this.authApiSub?.unsubscribe();
    this.authApiSub = this.authService
      .login({ userName: username, password })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          if (res.success && res.data && !res.error) {
            const perms = res.data.permissions;
            if (!Array.isArray(perms) || perms.length === 0) {
              this.openNoPermissionsDialog();
              return;
            }
            this.authService.setSessionFromLogin(res.data);
            void this.router.navigate([this.authService.getDefaultHomePath()]);
          } else {
            const msg = res.error_msg?.trim() || 'Login failed';
            this.toast.error(this.loginToastErrorTitle(), msg);
          }
        },
        error: (err: unknown) => {
          this.toast.error(this.loginToastErrorTitle(), this.extractLoginErrorMessage(err));
        },
      });
  }

  private loginToastErrorTitle(): string {
    return this.ui?.toastErrorTitle?.trim() || 'Login failed';
  }

  private openNoPermissionsDialog(): void {
    const u = this.ui;
    this.dialog.open(NoPermissionsDialog, {
      width: '420px',
      autoFocus: 'first-tabbable',
      disableClose: false,
      data: {
        title: u?.noPermissionsTitle?.trim() || 'No access',
        message:
          u?.noPermissionsMessage?.trim() ||
          'You do not have permission to use this site. Please contact your administrator.',
        okLabel: u?.noPermissionsOk?.trim() || 'OK',
      },
    });
  }

  /** Parses API body from `next` failures or `HttpErrorResponse` (e.g. 401 with JSON body). */
  private extractLoginErrorMessage(err: unknown): string {
    const fallback = 'Login failed';
    if (!err || typeof err !== 'object') {
      return fallback;
    }
    const e = err as { error?: unknown; message?: string };
    const body = e.error;
    if (body && typeof body === 'object' && body !== null && 'error_msg' in body) {
      const msg = (body as { error_msg?: unknown }).error_msg;
      if (typeof msg === 'string' && msg.trim()) {
        return msg.trim();
      }
    }
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body) as { error_msg?: string };
        if (parsed?.error_msg?.trim()) {
          return parsed.error_msg.trim();
        }
      } catch {
        if (body.trim()) {
          return body.trim();
        }
      }
    }
    return e.message?.trim() || fallback;
  }

  ngOnDestroy(): void {
    this.contextSub?.unsubscribe();
    this.authApiSub?.unsubscribe();
  }
}
