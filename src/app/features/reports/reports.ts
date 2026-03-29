import {
  Component,
  OnDestroy,
  OnInit,
  AfterViewInit,
  ViewChild,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subscription, filter, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import type { EnContext } from '../../context/en-context.model';
import type { AttendanceReportGridRow } from '../../models/attendance-api.model';
import { AttendanceService } from '../../services/attendance.service';
import { GeneralContextService } from '../../services/general-context.service';
import { ToastMessageService } from '../../services/toast-message.service';
import { formatLocalDateYyyyMmDd } from '../../utils/format-local-date';
import { buildAttendanceReportCsv, downloadBlobInBrowser } from '../../utils/export-attendance-report';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatPaginatorModule,
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports implements OnInit, AfterViewInit, OnDestroy {
  presentToday = 0;
  absentToday = 0;
  /** Rows from today’s summary API; used when exporting from Present/Absent cards. */
  summaryPresentRows: AttendanceReportGridRow[] = [];
  summaryAbsentRows: AttendanceReportGridRow[] = [];
  /** Local YYYY-MM-DD for summary query (export filenames). */
  summaryExportDate = formatLocalDateYyyyMmDd(new Date());
  summaryLoading = false;
  gridLoading = false;
  /** Default high enough to show mixed Present/Absent rows from typical API payloads. */
  reportPageSize = 25;

  filterForm!: FormGroup;
  dataSource!: MatTableDataSource<AttendanceReportGridRow>;
  readonly displayedColumns: string[] = [
    'rollNo',
    'firstName',
    'lastName',
    'class',
    'attendanceDate',
    'attendanceStatus',
  ];
  ui: EnContext['reports'] | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private readonly platformId = inject(PLATFORM_ID);
  private contextSub?: Subscription;
  private summarySub?: Subscription;
  private gridSub?: Subscription;

  constructor(
    private attendanceService: AttendanceService,
    private fb: FormBuilder,
    private generalContext: GeneralContextService,
    private readonly toast: ToastMessageService,
  ) {}

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource<AttendanceReportGridRow>([]);

    this.filterForm = this.fb.group({
      startDate: [this.clampDateToReportRange(new Date()), Validators.required],
      endDate: [this.clampDateToReportRange(new Date()), Validators.required],
      name: [''],
      rollNo: [''],
    });

    if (isPlatformBrowser(this.platformId)) {
      this.summaryLoading = true;
      setTimeout(() => this.loadTodaySummary(), 0);
    }

    this.contextSub = this.generalContext.context$
      .pipe(filter((c): c is EnContext => c !== null))
      .subscribe((c) => {
        this.ui = c.reports;
      });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  onSummaryCardKeydown(event: Event, status: 'Present' | 'Absent'): void {
    if (this.summaryLoading) return;
    event.preventDefault();
    this.showAttendance(status);
  }

  /**
   * Downloads CSV for today’s summary: Present card uses `presentData`, Absent uses `absentData`.
   */
  showAttendance(status: 'Present' | 'Absent'): void {
    if (this.summaryLoading || !isPlatformBrowser(this.platformId)) return;
    const rows = status === 'Present' ? this.summaryPresentRows : this.summaryAbsentRows;
    const tag = status === 'Present' ? 'present' : 'absent';
    const csv = buildAttendanceReportCsv(
      rows,
      this.exportColumnLabels(),
      (d) => this.formatAttendanceDate(d),
    );
    downloadBlobInBrowser(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      `attendance-summary_${tag}_${this.summaryExportDate}.csv`,
    );
  }

  onFilterSubmit(): void {
    if (!this.filterForm.valid) return;

    this.gridSub?.unsubscribe();
    const val = this.filterForm.value;
    const from = new Date(val.startDate);
    const to = new Date(val.endDate);

    this.gridLoading = true;
    this.gridSub = this.attendanceService
      .getAttendanceGrid(from, to)
      .pipe(
        catchError((err: unknown) => {
          const msg =
            err instanceof Error && err.message
              ? err.message
              : (this.ui?.gridErrorMessage ?? 'Request failed');
          this.toast.error(this.ui?.gridErrorTitle ?? 'Error', msg);
          return of([] as AttendanceReportGridRow[]);
        }),
        finalize(() => {
          queueMicrotask(() => {
            this.gridLoading = false;
          });
        }),
      )
      .subscribe((rows) => {
        this.dataSource.data = this.applyClientNameRollFilter(rows);
        if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
        }
      });
  }

  onReportPaginatorPage(event: PageEvent): void {
    this.reportPageSize = event.pageSize;
  }

  canExportReport(): boolean {
    if (!isPlatformBrowser(this.platformId) || this.gridLoading) {
      return false;
    }
    return (this.dataSource?.data?.length ?? 0) > 0;
  }

  downloadReportCsv(): void {
    if (!this.canExportReport()) return;
    const csv = buildAttendanceReportCsv(
      this.dataSource.data,
      this.exportColumnLabels(),
      (d) => this.formatAttendanceDate(d),
    );
    downloadBlobInBrowser(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      `${this.exportBaseFileName()}.csv`,
    );
  }

  formatAttendanceDate(value: string | undefined): string {
    if (!value?.trim()) return '—';
    if (value.length >= 10 && (value[10] === 'T' || value[10] === ' ')) {
      return value.slice(0, 10);
    }
    return value;
  }

  ngOnDestroy(): void {
    this.summarySub?.unsubscribe();
    this.gridSub?.unsubscribe();
    this.contextSub?.unsubscribe();
  }

  get reportDateRangeMin(): Date {
    const n = new Date();
    return new Date(n.getFullYear(), 0, 1);
  }

  get reportDateRangeMax(): Date {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }

  private loadTodaySummary(): void {
    this.summarySub?.unsubscribe();
    this.summaryLoading = true;
    const empty = {
      present: 0,
      absent: 0,
      presentRows: [] as AttendanceReportGridRow[],
      absentRows: [] as AttendanceReportGridRow[],
      summaryDate: formatLocalDateYyyyMmDd(new Date()),
    };
    this.summarySub = this.attendanceService
      .getAttendanceSummaryForDate(new Date())
      .pipe(
        catchError(() => of(empty)),
        finalize(() => {
          queueMicrotask(() => {
            this.summaryLoading = false;
          });
        }),
      )
      .subscribe(({ present, absent, presentRows, absentRows, summaryDate }) => {
        this.presentToday = present;
        this.absentToday = absent;
        this.summaryPresentRows = presentRows;
        this.summaryAbsentRows = absentRows;
        this.summaryExportDate = summaryDate;
      });
  }

  private applyClientNameRollFilter(rows: AttendanceReportGridRow[]): AttendanceReportGridRow[] {
    const val = this.filterForm.value;
    const searchName = (val.name ?? '').trim().toLowerCase();
    const searchRollNo = (val.rollNo ?? '').trim().toLowerCase();
    return rows.filter((r) => {
      const nameOk =
        !searchName || `${r.firstName} ${r.lastName}`.toLowerCase().includes(searchName);
      const rollOk = !searchRollNo || r.rollNo.toLowerCase().includes(searchRollNo);
      return nameOk && rollOk;
    });
  }

  private exportColumnLabels(): string[] {
    const u = this.ui;
    return [
      u?.colRollNo ?? 'Roll No',
      u?.colFirstName ?? 'First Name',
      u?.colLastName ?? 'Last Name',
      u?.colClass ?? 'Class',
      u?.colAttendanceDate ?? 'Attendance date',
      u?.colAttendance ?? 'Attendance',
    ];
  }

  /** Filename stem: `attendance-report_YYYY-MM-DD_to_YYYY-MM-DD` from the filter range. */
  private exportBaseFileName(): string {
    const v = this.filterForm.getRawValue();
    try {
      const from = formatLocalDateYyyyMmDd(new Date(v.startDate));
      const to = formatLocalDateYyyyMmDd(new Date(v.endDate));
      return `attendance-report_${from}_to_${to}`;
    } catch {
      return 'attendance-report';
    }
  }

  private clampDateToReportRange(d: Date): Date {
    const min = this.reportDateRangeMin.getTime();
    const max = this.reportDateRangeMax.getTime();
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (t < min) return new Date(min);
    if (t > max) return new Date(max);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
}
