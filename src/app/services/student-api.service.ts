import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import type {
  StudentCreateEnvelope,
  StudentCreatePayload,
  StudentDeleteEnvelope,
  StudentListEnvelope,
} from '../models/student-api.model';
import { ApiRequestService } from './api-request.service';

@Injectable({
  providedIn: 'root',
})
export class StudentApiService {
  constructor(private readonly apiRequest: ApiRequestService) {}

  /** GET /api/Student — raw envelope (data parsed in {@link StudentService}). */
  getStudentList(): Observable<StudentListEnvelope> {
    return this.apiRequest.get<StudentListEnvelope>('/api/Student', {
      headers: { Accept: '*/*' },
    }).pipe(
      switchMap((env) => {
        if (!env.success || env.error) {
          return throwError(() => new Error(env.error_msg?.trim() || 'Failed to load students'));
        }
        return of(env);
      }),
    );
  }

  /** POST /api/Student */
  createStudent(body: StudentCreatePayload): Observable<StudentCreateEnvelope> {
    return this.apiRequest.post<StudentCreateEnvelope>('/api/Student', body, {
      headers: { Accept: '*/*' },
    });
  }

  /** DELETE /api/Student/{id} */
  deleteStudent(id: number): Observable<StudentDeleteEnvelope> {
    return this.apiRequest.delete<StudentDeleteEnvelope>(`/api/Student/${id}`, {
      headers: { Accept: '*/*' },
    });
  }
}
