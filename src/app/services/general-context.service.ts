import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, of, tap } from 'rxjs';

import type { EnContext } from '../context/en-context.model';
import enDefault from '../context/EN.json';

@Injectable({
  providedIn: 'root',
})
export class GeneralContextService {
  private readonly _context = new BehaviorSubject<EnContext | null>(null);

  /** Emits the full context whenever it is loaded or replaced (subscribe for UI updates). */
  readonly context$ = this._context.asObservable();

  /** Fires each time context is set (load or setContext). */
  private readonly contextUpdated = new Subject<EnContext>();

  /** Subscribe to receive a notification after each load/set (use context$ for the latest snapshot). */
  readonly contextUpdated$ = this.contextUpdated.asObservable();

  loadContext(): Observable<EnContext> {
    const data = enDefault as EnContext;
    return of(data).pipe(tap((d) => this.applyContext(d)));
  }

  getContext(): EnContext | null {
    return this._context.value;
  }

  setContext(data: EnContext): void {
    this.applyContext(data);
  }

  /** Dot path, e.g. "login.buttonLogin" */
  text(path: string): string {
    const root = this._context.value;
    if (!root) return path;
    const keys = path.split('.');
    let cur: unknown = root;
    for (const k of keys) {
      if (cur !== null && typeof cur === 'object' && k in cur) {
        cur = (cur as Record<string, unknown>)[k];
      } else {
        return path;
      }
    }
    return typeof cur === 'string' ? cur : path;
  }

  private applyContext(data: EnContext): void {
    this._context.next(data);
    this.contextUpdated.next(data);
  }
}
