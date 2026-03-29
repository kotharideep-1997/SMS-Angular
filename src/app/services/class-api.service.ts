import { Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';

import type { ClassDto, ClassListEnvelope } from '../models/class-api.model';
import { ApiRequestService } from './api-request.service';

@Injectable({
  providedIn: 'root',
})
export class ClassApiService {
  constructor(private readonly apiRequest: ApiRequestService) {}

  /** GET /api/Class — full list (filter active in UI if needed). */
  getClasses(): Observable<ClassDto[]> {
    return this.apiRequest.get<ClassListEnvelope>('/api/Class', { headers: { Accept: '*/*' } }).pipe(
      map((env) => (env.success && env.data ? env.data : [])),
    );
  }
}
