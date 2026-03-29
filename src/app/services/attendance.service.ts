import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import type {
  AttendanceReportGridApiRow,
  AttendanceReportGridEnvelope,
  AttendanceReportGridRow,
  AttendanceReportSummaryEnvelope,
  AttendanceSummaryResult,
  AttendanceStatusApi,
  StudentAttendanceEnvelope,
  StudentAttendancePayload,
} from '../models/attendance-api.model';
import { formatLocalDateYyyyMmDd } from '../utils/format-local-date';
import { ApiRequestService } from './api-request.service';

function str(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

function normalizeGridStatus(v: unknown): AttendanceStatusApi | '' {
  const s = str(v).trim();
  if (!s) return '';
  const key = s.toLowerCase();
  if (key === 'present') return 'Present';
  if (key === 'absent') return 'Absent';
  return '';
}

function mapGridRow(raw: AttendanceReportGridApiRow): AttendanceReportGridRow {
  const attendance = raw.attendance ?? raw.Attendance;
  return {
    rollNo: str(raw.rollNo),
    firstName: str(raw.firstName),
    lastName: str(raw.lastName),
    class: str(raw.class),
    attendanceDate: str(raw.attendanceDate),
    attendanceStatus: normalizeGridStatus(attendance),
  };
}

function summaryNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  constructor(private readonly apiRequest: ApiRequestService) {}

  /** POST /api/StudentAttendance */
  recordAttendance(body: StudentAttendancePayload): Observable<void> {
    return this.apiRequest.post<StudentAttendanceEnvelope>('/api/StudentAttendance', body, {
      headers: { Accept: '*/*' },
    }).pipe(
      switchMap((env) => {
        if (!env.success || env.error) {
          return throwError(() => new Error(env.error_msg?.trim() || 'Attendance save failed'));
        }
        return of(undefined);
      }),
    );
  }

  /**
   * GET /api/AttendanceReport/summary?date=YYYY-MM-DD (local calendar day, e.g. 2026-03-29).
   * Returns counts plus mapped rows for presentData / absentData when the API provides them.
   */
  getAttendanceSummaryForDate(date: Date): Observable<AttendanceSummaryResult> {
    const dateParam = formatLocalDateYyyyMmDd(date);
    return this.apiRequest.get<AttendanceReportSummaryEnvelope>('/api/AttendanceReport/summary', {
      params: { date: dateParam },
      headers: { Accept: '*/*' },
    }).pipe(
      switchMap((env) => {
        if (!env.success || env.error || env.data == null) {
          return throwError(() => new Error(env.error_msg?.trim() || 'Attendance summary failed'));
        }
        const d = env.data;
        const summaryDate =
          typeof d.date === 'string' && d.date.length >= 10 ? d.date.slice(0, 10) : dateParam;
        const presentRows = (Array.isArray(d.presentData) ? d.presentData : []).map(mapGridRow);
        const absentRows = (Array.isArray(d.absentData) ? d.absentData : []).map(mapGridRow);
        return of({
          present: summaryNumber(d.presentCount ?? d.Present ?? d.present),
          absent: summaryNumber(d.absentCount ?? d.Absent ?? d.absent),
          presentRows,
          absentRows,
          summaryDate,
        });
      }),
    );
  }

  /**
   * GET /api/AttendanceReport/grid?FromDate=YYYY-MM-DD&ToDate=YYYY-MM-DD
   * (`FromDate` / `ToDate` use the user’s local calendar day.)
   */
  getAttendanceGrid(from: Date, to: Date): Observable<AttendanceReportGridRow[]> {
    return this.apiRequest
      .get<AttendanceReportGridEnvelope>('/api/AttendanceReport/grid', {
        params: {
          FromDate: formatLocalDateYyyyMmDd(from),
          ToDate: formatLocalDateYyyyMmDd(to),
        },
        headers: { Accept: '*/*' },
      })
      .pipe(
        switchMap((env) => {
          if (!env.success || env.error || env.data == null) {
            return throwError(() => new Error(env.error_msg?.trim() || 'Attendance grid failed'));
          }
          return of(env.data.map(mapGridRow));
        }),
      );
  }
}
