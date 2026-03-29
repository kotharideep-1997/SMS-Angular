import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

const DEFAULT_DURATION_MS = 4500;

@Injectable({
  providedIn: 'root',
})
export class ToastMessageService {
  constructor(
    private readonly snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

  /** Green / success style, top-end (from global defaults). */
  success(title: string, message: string, durationMs: number = DEFAULT_DURATION_MS): void {
    this.show(title, message, 'sms-success-snackbar', durationMs);
  }

  /** Error style, top-end. */
  error(title: string, message: string, durationMs: number = DEFAULT_DURATION_MS): void {
    this.show(title, message, 'sms-error-snackbar', durationMs);
  }

  private show(title: string, message: string, panelClass: string, durationMs: number): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const body = this.formatBody(title, message);
    if (!body) {
      return;
    }
    const config: MatSnackBarConfig = {
      duration: durationMs,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [panelClass],
    };
    this.snackBar.open(body, undefined, config);
  }

  /** Title on the first line, message on the second when both are set. */
  private formatBody(title: string, message: string): string {
    const t = title?.trim() ?? '';
    const m = message?.trim() ?? '';
    if (t && m) {
      return `${t}\n${m}`;
    }
    return t || m;
  }
}
