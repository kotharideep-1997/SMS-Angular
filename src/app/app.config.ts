import {
  ApplicationConfig,
  importProvidersFrom,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { OVERLAY_DEFAULT_CONFIG } from '@angular/cdk/overlay';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { appHttpInterceptors } from './interceptors/app-http-interceptors';
import { GeneralContextService } from './services/general-context.service';
import { API_BASE_URL } from './tokens/api-base-url.token';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimations(),
    /*
     * CDK 21+ defaults to the native Popover API for overlays when the browser supports it.
     * That path can leave MatDialog with a visible backdrop but no usable / visible panel.
     * Classic overlay-container placement is reliable for dialogs, menus, and datepickers.
     */
    { provide: OVERLAY_DEFAULT_CONFIG, useValue: { usePopover: false } },
    importProvidersFrom(MatSnackBarModule),
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: {
        duration: 4500,
        horizontalPosition: 'end',
        verticalPosition: 'top',
      },
    },
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    provideHttpClient(withInterceptors(appHttpInterceptors)),
    provideAppInitializer(() => {
      const generalContext = inject(GeneralContextService);
      return firstValueFrom(generalContext.loadContext());
    }),
    provideRouter(routes),
    provideClientHydration(withEventReplay())
  ]
};
