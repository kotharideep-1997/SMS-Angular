import type { ClassDto } from '../models/class-api.model';
import type { AttendanceStatus, Student } from '../models/student.model';

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return undefined;
}

function num(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normAttendance(s: string | undefined): AttendanceStatus | undefined {
  if (!s) return undefined;
  const u = s.trim();
  if (u === 'Present' || u === 'present') return 'Present';
  if (u === 'Absent' || u === 'absent') return 'Absent';
  return undefined;
}

/**
 * Maps one GET /api/Student row to UI {@link Student} (camelCase or PascalCase fields).
 */
export function mapStudentApiRow(row: unknown): Student | null {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const o = row as Record<string, unknown>;

  const id = num(o['id']) ?? num(o['Id']);
  if (id == null) {
    return null;
  }

  const firstName = str(o['firstName']) ?? str(o['FirstName']) ?? '';
  const lastName = str(o['lastName']) ?? str(o['LastName']) ?? '';
  const rollRaw = o['rollNo'] ?? o['RollNo'];
  const rollNo = rollRaw != null ? String(rollRaw).trim() : '';

  const classId = num(o['classId']) ?? num(o['ClassId']);

  let classLabel =
    str(o['className']) ?? str(o['ClassName']) ?? str(o['class']) ?? str(o['Class']);
  const nestedClass = o['class'] ?? o['Class'];
  if (!classLabel && nestedClass && typeof nestedClass === 'object') {
    const nc = nestedClass as Record<string, unknown>;
    classLabel =
      str(nc['class']) ?? str(nc['Class']) ?? str(nc['name']) ?? str(nc['Name']);
  }

  const attendanceStatus =
    normAttendance(str(o['attendanceStatus']) ?? str(o['AttendanceStatus'])) ??
    normAttendance(str(o['attendance']) ?? str(o['Attendance']));

  const attendanceDate =
    str(o['attendanceDate']) ??
    str(o['AttendanceDate']) ??
    str(o['attendance_date']) ??
    str(o['date']);

  return {
    id,
    firstName,
    lastName,
    rollNo,
    class: classLabel ?? '',
    ...(classId != null ? { classId } : {}),
    ...(attendanceStatus ? { attendanceStatus } : {}),
    ...(attendanceDate ? { attendanceDate } : {}),
  };
}

/** Fill empty `student.class` from active class list when `classId` is set (API often returns `class: null`). */
export function applyClassNamesFromApi(students: Student[], classes: ClassDto[]): Student[] {
  const byId = new Map<number, string>();
  for (const c of classes) {
    if (!c.isActive) continue;
    const label = c.class?.trim();
    byId.set(c.id, label || String(c.id));
  }
  return students.map((s) => {
    if (s.class?.trim()) return s;
    const cid = s.classId;
    if (cid == null) return s;
    const name = byId.get(cid);
    return { ...s, class: name ?? `Class ${cid}` };
  });
}

export function mapStudentApiList(data: unknown): Student[] {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map(mapStudentApiRow).filter((s): s is Student => s != null);
}
