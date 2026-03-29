/** API permission names — keep in sync with backend (JWT `permission` claim). Matching is case-insensitive in AuthService. */
export const Permission = {
  View: 'View',
  Create: 'create',
  Edit: 'Edit',
  Delete: 'Delete',
  Report: 'report',
  Admin: 'Admin',
} as const;

/** Open `/students` and show the Students nav link (View, create, Edit, Delete, Admin). */
export const STUDENT_LIST_ACCESS: readonly string[] = [
  Permission.View,
  Permission.Create,
  Permission.Edit,
  Permission.Delete,
  Permission.Admin,
];

/** See the student grid and search (not Create-only). */
export const STUDENT_TABLE_VIEW_ACCESS: readonly string[] = [
  Permission.View,
  Permission.Edit,
  Permission.Delete,
  Permission.Admin,
];

/** Add student button — `create` only (+ Admin). */
export const STUDENT_CREATE_ACCESS: readonly string[] = [Permission.Create, Permission.Admin];

/** Edit row + mark attendance. */
export const STUDENT_ROW_EDIT_ACCESS: readonly string[] = [Permission.Edit, Permission.Admin];

/** Delete row. */
export const STUDENT_ROW_DELETE_ACCESS: readonly string[] = [Permission.Delete, Permission.Admin];

/** Any action column (edit / delete / attendance). */
export const STUDENT_ROW_ACTIONS_ACCESS: readonly string[] = [
  Permission.Edit,
  Permission.Delete,
  Permission.Admin,
];

/** Reports page (attendance report dashboard). */
export const REPORT_ACCESS: readonly string[] = [Permission.Report];
