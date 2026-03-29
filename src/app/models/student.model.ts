export type AttendanceStatus = 'Present' | 'Absent';

export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  rollNo: string;
  class: string;
  /** From API when `class` is null; used to resolve the label via `/api/Class`. */
  classId?: number;
  attendanceStatus?: AttendanceStatus;
  attendanceDate?: string;
}
