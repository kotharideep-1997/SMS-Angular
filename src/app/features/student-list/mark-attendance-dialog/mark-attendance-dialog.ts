import { Overlay } from '@angular/cdk/overlay';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import {
  MAT_DATEPICKER_SCROLL_STRATEGY,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Subscription, filter } from 'rxjs';
import type { EnContext } from '../../../context/en-context.model';
import { Student } from '../../../services/student';
import { GeneralContextService } from '../../../services/general-context.service';

@Component({
  selector: 'app-mark-attendance-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatRadioModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './mark-attendance-dialog.html',
  styleUrl: './mark-attendance-dialog.scss',
  providers: [
    {
      provide: MAT_DATEPICKER_SCROLL_STRATEGY,
      deps: [Overlay],
      useFactory: (overlay: Overlay) => () => overlay.scrollStrategies.reposition(),
    },
  ],
})
export class MarkAttendanceDialog implements OnInit, OnDestroy {
  attendanceForm!: FormGroup;
  studentName = '';
  ui: EnContext['markAttendanceDialog'] | null = null;

  private contextSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<MarkAttendanceDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { student: Student },
    private generalContext: GeneralContextService,
  ) {}

  ngOnInit(): void {
    this.studentName = `${this.data.student.firstName} ${this.data.student.lastName}`;

    const raw = this.data.student.attendanceDate
      ? new Date(this.data.student.attendanceDate)
      : new Date();
    const parsed = Number.isNaN(raw.getTime()) ? new Date() : raw;
    const initialDate = this.clampAttendanceDate(parsed);

    this.attendanceForm = this.fb.group({
      status: [this.data.student.attendanceStatus || 'Present', Validators.required],
      date: [initialDate, Validators.required],
    });

    this.contextSub = this.generalContext.context$
      .pipe(filter((c): c is EnContext => c !== null))
      .subscribe((c) => {
        this.ui = c.markAttendanceDialog;
      });
  }

  onSave() {
    if (this.attendanceForm.valid) {
      this.dialogRef.close(this.attendanceForm.value);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this.contextSub?.unsubscribe();
  }

  /** First day of the current calendar year (local). */
  get attendanceDateMin(): Date {
    const n = new Date();
    return new Date(n.getFullYear(), 0, 1);
  }

  /** Today (local); no future dates or other years. */
  get attendanceDateMax(): Date {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }

  private clampAttendanceDate(d: Date): Date {
    const min = this.attendanceDateMin.getTime();
    const max = this.attendanceDateMax.getTime();
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (t < min) {
      return new Date(min);
    }
    if (t > max) {
      return new Date(max);
    }
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
}
