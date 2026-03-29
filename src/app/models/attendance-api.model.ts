export type AttendanceStatusApi = 'Present' | 'Absent';

export interface StudentAttendancePayload {
  studentId: number;
  /**
   * Local calendar date the user picked (`YYYY-MM-DD`).
   * Do not use `Date#toISOString()` for this — UTC conversion can shift the day (e.g. IST → previous date in Z).
   */
  attendanceDate: string;
  status: AttendanceStatusApi;
}

export interface StudentAttendanceEnvelope {
  success: boolean;
  error: boolean;
  error_msg: string;
  status_code: number;
  data: unknown;
}

/** GET /api/AttendanceReport/summary?date=YYYY-MM-DD (e.g. 2026-03-29) */
export interface AttendanceReportSummaryEnvelope {
  success: boolean;
  error: boolean;
  error_msg: string;
  status_code: number;
  data: AttendanceReportSummaryData | null;
}

/**
 * GET /api/AttendanceReport/summary `data` payload.
 * New shape: presentCount / absentCount plus presentData / absentData arrays.
 * Legacy: Present / Absent (or camelCase) counts only.
 */
export interface AttendanceReportSummaryData {
  date?: string;
  presentCount?: number;
  absentCount?: number;
  presentData?: AttendanceReportGridApiRow[];
  absentData?: AttendanceReportGridApiRow[];
  otherData?: AttendanceReportGridApiRow[];
  /** Legacy numeric counts */
  Present?: number;
  Absent?: number;
  present?: number;
  absent?: number;
}

/** Returned by {@link AttendanceService.getAttendanceSummaryForDate}. */
export interface AttendanceSummaryResult {
  present: number;
  absent: number;
  presentRows: AttendanceReportGridRow[];
  absentRows: AttendanceReportGridRow[];
  /** Local calendar date string used in summary query (for export filenames). */
  summaryDate: string;
}

/** @deprecated Use {@link AttendanceSummaryResult}; kept for narrow typing if needed. */
export interface AttendanceSummaryCounts {
  present: number;
  absent: number;
}

/** GET /api/AttendanceReport/grid */
export interface AttendanceReportGridEnvelope {
  success: boolean;
  error: boolean;
  error_msg: string;
  status_code: number;
  data: AttendanceReportGridApiRow[] | null;
}

/** Raw row from the grid API (camelCase; optional PascalCase variants). */
export interface AttendanceReportGridApiRow {
  rollNo?: number | string;
  firstName?: string;
  lastName?: string;
  class?: string;
  attendanceDate?: string;
  attendance?: string;
  Attendance?: string;
}

/** Normalized row for the reports table (`attendance` → `attendanceStatus`). */
export interface AttendanceReportGridRow {
  rollNo: string;
  firstName: string;
  lastName: string;
  class: string;
  attendanceDate: string;
  attendanceStatus: AttendanceStatusApi | '';
}
