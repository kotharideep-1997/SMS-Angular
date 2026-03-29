import { Injectable, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import type { ClassDto } from '../models/class-api.model';
import type { AttendanceStatus, Student } from '../models/student.model';

import { applyClassNamesFromApi, mapStudentApiList } from '../utils/map-student-api';
import { ClassApiService } from './class-api.service';
import { StudentApiService } from './student-api.service';

export type { Student } from '../models/student.model';

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private students = signal<Student[]>([]);

  constructor(
    private readonly studentApi: StudentApiService,
    private readonly classApi: ClassApiService,
  ) {}

  getStudents() {
    return this.students;
  }

  /** GET /api/Student and replace the in-memory list used by the table, dashboard, and reports. */
  loadStudents(): Observable<void> {
    return this.studentApi.getStudentList().pipe(
      switchMap((env) =>
        this.classApi.getClasses().pipe(
          catchError(() => of([] as ClassDto[])),
          map((classes) => ({ env, classes })),
        ),
      ),
      tap(({ env, classes }) => {
        const list = mapStudentApiList(env.data);
        this.students.set(applyClassNamesFromApi(list, classes));
      }),
      map(() => undefined),
    );
  }

  updateStudent(student: Student) {
    this.students.update(list => list.map(s => s.id === student.id ? student : s));
  }

  /** Update attendance fields for one row (e.g. after POST /api/StudentAttendance) without refetching the list. */
  patchStudentAttendance(
    studentId: number,
    patch: { attendanceStatus: AttendanceStatus; attendanceDate: string },
  ): void {
    this.students.update((list) =>
      list.map((s) => (s.id === studentId ? { ...s, ...patch } : s)),
    );
  }

  /** Calls DELETE /api/Student/{id}, then removes the row locally on success. */
  deleteStudent(id: number): Observable<void> {
    return this.studentApi.deleteStudent(id).pipe(
      switchMap((env) => {
        if (!env.success || env.error) {
          return throwError(() => new Error(env.error_msg?.trim() || 'Delete failed'));
        }
        this.students.update((list) => list.filter((s) => s.id !== id));
        return of(undefined);
      }),
    );
  }

}
