import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { Subscription, filter, take } from 'rxjs';
import type { EnContext } from '../context/en-context.model';
import { REPORT_ACCESS, STUDENT_LIST_ACCESS } from '../guards/permissions/permission-keys';
import { AuthService } from '../services/auth';
import { GeneralContextService } from '../services/general-context.service';
import { StudentService } from '../services/student';
import { ToastMessageService } from '../services/toast-message.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatListModule, MatIconModule, MatToolbarModule, MatButtonModule,
    MatTooltipModule
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav #drawer [mode]="isHandset() ? 'over' : 'side'"
                   [opened]="!isHandset()"
                   class="sidenav">
        <div class="logo-container">
          <h2>{{ ui?.brandTitle }}</h2>
        </div>
        <mat-nav-list>
          @if (showStudentsNav()) {
            <a mat-list-item routerLink="/students" routerLinkActive="active-link" (click)="closeOnMobile(drawer)">
              <mat-icon matListItemIcon>people</mat-icon>
              <span matListItemTitle>{{ ui?.navStudents }}</span>
            </a>
          }
          @if (showReportsNav()) {
            <a mat-list-item routerLink="/reports" routerLinkActive="active-link" (click)="closeOnMobile(drawer)">
              <mat-icon matListItemIcon>assessment</mat-icon>
              <span matListItemTitle>{{ ui?.navReports }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>
      
      <mat-sidenav-content class="sidenav-content">
        <mat-toolbar color="primary" class="header-toolbar">
          <button type="button" [attr.aria-label]="ui?.toggleSidenavAria" mat-icon-button (click)="drawer.toggle()" *ngIf="isHandset()">
            <mat-icon>menu</mat-icon>
          </button>
          
          <span class="spacer"></span>
          <button mat-icon-button (click)="logout()" [matTooltip]="ui?.logoutTooltip ?? ''">
            <mat-icon>logout</mat-icon>
          </button>
        </mat-toolbar>
        
        <div class="main-panel">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container {
      height: 100vh;
    }
    .sidenav {
      width: 250px;
      background-color: #fafafa;
      border-right: 1px solid #e0e0e0;
    }
    .logo-container {
      padding: 20px 16px;
      text-align: center;
      background: #3f51b5;
      color: white;
    }
    .logo-container h2 { 
      margin: 0; 
      font-weight: 500; 
      letter-spacing: 1px; 
    }
    .active-link {
      background-color: rgba(63, 81, 181, 0.1) !important;
      color: #3f51b5 !important;
    }
    .active-link mat-icon { 
      color: #3f51b5 !important; 
    }
    .spacer {
      flex: 1 1 auto;
    }
    .main-panel {
      padding: 24px;
      height: calc(100vh - 64px);
      overflow-y: auto;
      background-color: #f5f5f5;
    }

    @media (max-width: 600px) {
      .main-panel {
        padding: 16px;
      }
    }
  `]
})
export class MainLayout implements OnInit, OnDestroy {
  private breakpointObserver = inject(BreakpointObserver);
  private authService = inject(AuthService);

  isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map(result => result.matches)),
    { initialValue: false }
  );

  readonly showStudentsNav = computed(() => this.authService.hasAnyPermissionKey(STUDENT_LIST_ACCESS));
  readonly showReportsNav = computed(() => this.authService.hasAnyPermissionKey(REPORT_ACCESS));

  ui: EnContext['layout'] | null = null;

  private contextSub?: Subscription;

  constructor(
    private router: Router,
    private generalContext: GeneralContextService,
    private studentService: StudentService,
    private toast: ToastMessageService,
  ) {}

  ngOnInit(): void {
    this.contextSub = this.generalContext.context$
      .pipe(filter((c): c is EnContext => c !== null))
      .subscribe((c) => {
        this.ui = c.layout;
      });

    this.studentService.loadStudents().pipe(take(1)).subscribe({
      error: (err: unknown) => {
        const msg =
          err instanceof Error && err.message
            ? err.message
            : this.generalContext.text('studentList.loadErrorMessage');
        this.toast.error(this.generalContext.text('guards.toastErrorTitle'), msg);
      },
    });
  }

  closeOnMobile(drawer: MatSidenav) {
    if (this.isHandset()) {
      drawer.close();
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.contextSub?.unsubscribe();
  }
}
