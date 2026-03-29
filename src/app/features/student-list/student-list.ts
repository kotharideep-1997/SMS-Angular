import {
  Component,
  computed,
  EffectRef,
  Injector,
  OnDestroy,
  OnInit,
  AfterViewInit,
  ViewChild,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subscription, filter, map, switchMap, take } from 'rxjs';
import type { EnContext } from '../../context/en-context.model';
import {
  Permission,
  STUDENT_CREATE_ACCESS,
  STUDENT_ROW_ACTIONS_ACCESS,
  STUDENT_ROW_DELETE_ACCESS,
  STUDENT_ROW_EDIT_ACCESS,
  STUDENT_TABLE_VIEW_ACCESS,
} from '../../guards/permissions/permission-keys';
import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../services/auth';
import { GeneralContextService } from '../../services/general-context.service';
import { StudentService, Student } from '../../services/student';
import { AddStudentDialog } from './add-student-dialog/add-student-dialog';
import {
  DeleteStudentConfirmDialog,
} from './delete-student-confirm-dialog/delete-student-confirm-dialog';
import { MarkAttendanceDialog } from './mark-attendance-dialog/mark-attendance-dialog';
import { ToastMessageService } from '../../services/toast-message.service';
import { formatLocalDateYyyyMmDd } from '../../utils/format-local-date';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './student-list.html',
  styleUrl: './student-list.scss'
})
export class StudentList implements OnInit, AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);

  readonly showStudentTable = computed(() =>
    this.auth.hasAnyPermissionKey(STUDENT_TABLE_VIEW_ACCESS)
  );
  readonly showAddButton = computed(() => this.auth.hasAnyPermissionKey(STUDENT_CREATE_ACCESS));
  /** View-only: show the table but not the search field (per product rules). */
  readonly viewOnlyStudentList = computed(() => {
    const a = this.auth;
    return (
      a.hasPermissionKey(Permission.View) &&
      !a.hasPermissionKey(Permission.Create) &&
      !a.hasPermissionKey(Permission.Edit) &&
      !a.hasPermissionKey(Permission.Delete) &&
      !a.hasPermissionKey(Permission.Admin)
    );
  });
  readonly showSearchBar = computed(() => this.showStudentTable() && !this.viewOnlyStudentList());
  readonly showEditRow = computed(() => this.auth.hasAnyPermissionKey(STUDENT_ROW_EDIT_ACCESS));
  readonly showDeleteRow = computed(() => this.auth.hasAnyPermissionKey(STUDENT_ROW_DELETE_ACCESS));
  readonly showActionsColumn = computed(() => this.auth.hasAnyPermissionKey(STUDENT_ROW_ACTIONS_ACCESS));
  readonly createOnlyHint = computed(() => this.showAddButton() && !this.showStudentTable());

  readonly displayedColumns = computed(() => {
    const base = ['rollNo', 'firstName', 'lastName', 'class'];
    if (this.showActionsColumn()) {
      return [...base, 'actions'];
    }
    return base;
  });

  dataSource!: MatTableDataSource<Student>;
  ui: EnContext['studentList'] | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private readonly injector = inject(Injector);
  private studentsEffectRef?: EffectRef;
  private contextSub?: Subscription;

  constructor(
    private studentService: StudentService,
    private dialog: MatDialog,
    private generalContext: GeneralContextService,
    private readonly toast: ToastMessageService,
    private readonly attendanceService: AttendanceService,
  ) {}

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource([] as Student[]);

    this.studentsEffectRef = runInInjectionContext(this.injector, () =>
      effect(() => {
        this.dataSource.data = this.studentService.getStudents()();
      })
    );

    this.contextSub = this.generalContext.context$
      .pipe(filter((c): c is EnContext => c !== null))
      .subscribe((c) => {
        this.ui = c.studentList;
      });
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }

    this.dataSource.filterPredicate = (data, filterVal) => {
      const dataStr = `${data.firstName} ${data.lastName} ${data.rollNo}`.toLowerCase();
      return dataStr.indexOf(filterVal.toLowerCase()) !== -1;
    };
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  openAddStudentDialog() {
    const dialogRef = this.dialog.open(AddStudentDialog, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: Student[]) => {
      if (result && result.length > 0) {
        this.studentService.loadStudents().pipe(take(1)).subscribe({
          error: (err: unknown) => {
            this.toast.error(
              this.ui?.loadErrorTitle ?? 'Error',
              this.loadStudentsErrorMessage(err),
            );
          },
        });
      }
    });
  }

  openEditDialog(student: Student) {
    const dialogRef = this.dialog.open(AddStudentDialog, {
      width: '600px',
      data: { student },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: Student[]) => {
      if (result && result.length === 1) {
        this.studentService.updateStudent({ ...student, ...result[0] });
      }
    });
  }

  openAttendanceDialog(student: Student) {
    const dialogRef = this.dialog.open(MarkAttendanceDialog, {
      width: '400px',
      data: { student },
      disableClose: true,
      autoFocus: 'first-tabbable',
      enterAnimationDuration: 0,
      exitAnimationDuration: 0,
    });

    dialogRef
      .afterClosed()
      .pipe(
        filter((result): result is { status: 'Present' | 'Absent'; date: Date } => !!result),
        switchMap((result) =>
          this.attendanceService
            .recordAttendance({
              studentId: student.id,
              attendanceDate: formatLocalDateYyyyMmDd(result.date),
              status: result.status,
            })
            .pipe(map(() => result)),
        ),
        take(1),
      )
      .subscribe({
        next: (result) => {
          if (this.isSameLocalCalendarDay(result.date, new Date())) {
            this.studentService.patchStudentAttendance(student.id, {
              attendanceStatus: result.status,
              attendanceDate: formatLocalDateYyyyMmDd(result.date),
            });
          }
        },
        error: (err: unknown) => {
          const msg = this.loadStudentsErrorMessage(err);
          this.toast.error(this.ui?.attendanceSaveErrorTitle ?? 'Error', msg);
        },
      });
  }

  private isSameLocalCalendarDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  confirmDeleteStudent(student: Student): void {
    const name = `${student.firstName} ${student.lastName}`.trim();
    const template = this.ui?.deleteConfirm ?? 'Remove {{name}} from the list?';
    const message = template.replace(/\{\{\s*name\s*\}\}/i, name);

    this.dialog
      .open(DeleteStudentConfirmDialog, {
        width: '400px',
        disableClose: true,
        data: {
          title: this.ui?.deleteDialogTitle ?? 'Remove student',
          message,
          cancelLabel: this.ui?.deleteDialogCancel ?? 'Cancel',
          confirmLabel: this.ui?.deleteDialogConfirm ?? 'Delete',
        },
      })
      .afterClosed()
      .pipe(
        filter((ok): ok is true => ok === true),
        switchMap(() => this.studentService.deleteStudent(student.id)),
        take(1),
      )
      .subscribe({
        error: (err: unknown) => {
          const msg = this.deleteErrorMessage(err);
          this.toast.error(this.ui?.deleteErrorTitle ?? 'Error', msg);
        },
      });
  }

  private loadStudentsErrorMessage(err: unknown): string {
    if (err instanceof Error && err.message) {
      return err.message;
    }
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (body && typeof body === 'object' && 'error_msg' in body) {
        const m = (body as { error_msg?: string }).error_msg;
        if (typeof m === 'string' && m.trim()) {
          return m.trim();
        }
      }
      return err.message || 'Request failed';
    }
    return 'Request failed';
  }

  private deleteErrorMessage(err: unknown): string {
    if (err instanceof Error && err.message) {
      return err.message;
    }
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (body && typeof body === 'object' && 'error_msg' in body) {
        const m = (body as { error_msg?: string }).error_msg;
        if (typeof m === 'string' && m.trim()) {
          return m.trim();
        }
      }
      return err.message || 'Request failed';
    }
    return 'Request failed';
  }

  ngOnDestroy(): void {
    this.contextSub?.unsubscribe();
    this.studentsEffectRef?.destroy();
  }
}
