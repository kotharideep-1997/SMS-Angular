import type { AttendanceReportGridRow } from '../models/attendance-api.model';

function escapeCsvField(s: string): string {
  const t = s ?? '';
  if (/[",\n\r]/.test(t)) {
    return `"${t.replace(/"/g, '""')}"`;
  }
  return t;
}

/**
 * UTF-8 CSV with BOM (opens cleanly in Excel); columns match the report table.
 */
export function buildAttendanceReportCsv(
  rows: AttendanceReportGridRow[],
  columnLabels: readonly string[],
  formatAttendanceDate: (v: string | undefined) => string,
): string {
  const headerLine = columnLabels.map(escapeCsvField).join(',');
  const dataLines = rows.map((r) =>
    [
      escapeCsvField(String(r.rollNo)),
      escapeCsvField(r.firstName),
      escapeCsvField(r.lastName),
      escapeCsvField(r.class),
      escapeCsvField(formatAttendanceDate(r.attendanceDate)),
      escapeCsvField(r.attendanceStatus || ''),
    ].join(','),
  );
  return '\ufeff' + [headerLine, ...dataLines].join('\r\n');
}

export function downloadBlobInBrowser(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
