import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { forkJoin, Subscription, filter, finalize } from 'rxjs';
import type { EnContext } from '../../../context/en-context.model';
import type { ClassDto } from '../../../models/class-api.model';
import { ClassApiService } from '../../../services/class-api.service';
import { GeneralContextService } from '../../../services/general-context.service';
import { Student } from '../../../services/student';
import { StudentApiService } from '../../../services/student-api.service';
import { ToastMessageService } from '../../../services/toast-message.service';
import { nameLettersOnlyValidator, rollNoSchoolValidator } from '../../../validators/student-form.validators';

@Component({
  selector: 'app-add-student-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSelectModule,
  ],
  templateUrl: './add-student-dialog.html',
  styleUrl: './add-student-dialog.scss',
})
export class AddStudentDialog implements OnInit, OnDestroy {
  private static readonly editKeys = new Set([
    'Backspace',
    'Delete',
    'Tab',
    'Escape',
    'Enter',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
  ]);

  private readonly nameMaxLen = 20;
  /** Roll is 1–100 → at most 3 digits */
  private readonly rollMaxLen = 3;

  studentForm!: FormGroup;
  isEditMode = false;
  ui: EnContext['addStudentDialog'] | null = null;

  activeClasses: ClassDto[] = [];
  classesLoading = true;
  classesLoadFailed = false;
  saving = false;

  private contextSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AddStudentDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { student?: Student },
    private generalContext: GeneralContextService,
    private classApi: ClassApiService,
    private studentApi: StudentApiService,
    private toast: ToastMessageService,
  ) {}

  ngOnInit(): void {
    this.isEditMode = !!this.data?.student;

    this.studentForm = this.fb.group({
      students: this.fb.array([]),
    });

    if (this.isEditMode && this.data.student) {
      this.students.push(this.createStudentGroup(this.data.student));
    } else {
      this.addStudentField();
    }

    this.contextSub = this.generalContext.context$
      .pipe(filter((c): c is EnContext => c !== null))
      .subscribe((c) => {
        this.ui = c.addStudentDialog;
      });

    this.loadClasses();
  }

  get students(): FormArray {
    return this.studentForm.get('students') as FormArray;
  }

  get canSave(): boolean {
    return (
      !this.classesLoading &&
      !this.classesLoadFailed &&
      this.activeClasses.length > 0 &&
      !this.saving &&
      this.studentForm.valid
    );
  }

  private loadClasses(): void {
    this.classesLoading = true;
    this.classesLoadFailed = false;
    this.classApi
      .getClasses()
      .pipe(
        finalize(() => {
          this.classesLoading = false;
        }),
      )
      .subscribe({
        next: (list) => {
          this.activeClasses = list.filter((c) => c.isActive);
          if (this.isEditMode && this.data.student) {
            const st = this.data.student;
            const byId =
              st.classId != null ? this.activeClasses.find((c) => c.id === st.classId) : undefined;
            const byName =
              !byId && st.class?.trim()
                ? this.activeClasses.find((c) => c.class === st.class.trim())
                : undefined;
            this.students.at(0)?.patchValue({ classId: byId?.id ?? byName?.id ?? null });
          }
        },
        error: () => {
          this.classesLoadFailed = true;
          const title = this.ui?.saveErrorTitle ?? 'Error';
          const msg = this.ui?.classesLoadError ?? 'Could not load classes.';
          this.toast.error(title, msg);
        },
      });
  }

  createStudentGroup(student?: Student): FormGroup {
    const roll = student?.rollNo != null ? String(student.rollNo) : '';
    return this.fb.group({
      firstName: [
        student?.firstName?.trim() ?? '',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(20),
          nameLettersOnlyValidator(),
        ],
      ],
      lastName: [
        student?.lastName?.trim() ?? '',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(20),
          nameLettersOnlyValidator(),
        ],
      ],
      rollNo: [roll, [Validators.required, rollNoSchoolValidator()]],
      classId: [(student?.classId ?? null) as number | null, Validators.required],
    });
  }

  addStudentField(student?: Student): void {
    this.students.push(this.createStudentGroup(student));
  }

  removeStudentField(index: number): void {
    if (this.students.length > 1) {
      this.students.removeAt(index);
    }
  }

  classLabel(id: number | null): string {
    if (id == null) return '';
    return this.activeClasses.find((c) => c.id === id)?.class ?? '';
  }

  /** Block non–A–Z keys before they appear (Ctrl/Cmd shortcuts still work). */
  onNameKeydown(event: KeyboardEvent): void {
    if (event.isComposing) {
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (AddStudentDialog.editKeys.has(event.key)) {
      return;
    }
    if (event.key.length === 1 && /^[a-zA-Z]$/.test(event.key)) {
      return;
    }
    event.preventDefault();
  }

  /** Strip digits/symbols and enforce max length (covers paste). */
  onNameInput(event: Event, index: number, field: 'firstName' | 'lastName'): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[^a-zA-Z]/g, '').slice(0, this.nameMaxLen);
    const ctrl = (this.students.at(index) as FormGroup).get(field);
    if (!ctrl || ctrl.value === cleaned) {
      return;
    }
    ctrl.setValue(cleaned, { emitEvent: true });
  }

  onRollKeydown(event: KeyboardEvent): void {
    if (event.isComposing) {
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (AddStudentDialog.editKeys.has(event.key)) {
      return;
    }
    if (event.key.length === 1 && /^\d$/.test(event.key)) {
      return;
    }
    event.preventDefault();
  }

  onRollInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/\D/g, '').slice(0, this.rollMaxLen);
    const ctrl = (this.students.at(index) as FormGroup).get('rollNo');
    if (!ctrl || ctrl.value === cleaned) {
      return;
    }
    ctrl.setValue(cleaned, { emitEvent: true });
  }

  onSave(): void {
    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
      return;
    }

    if (this.isEditMode && this.data.student) {
      const row = this.students.at(0) as FormGroup;
      const v = row.value;
      this.dialogRef.close([
        {
          ...this.data.student,
          firstName: v.firstName.trim(),
          lastName: v.lastName.trim(),
          rollNo: String(v.rollNo).trim(),
          class: this.classLabel(v.classId),
          classId: v.classId ?? undefined,
        },
      ]);
      return;
    }

    this.saving = true;
    const requests = this.students.controls.map((ctrl) => {
      const v = (ctrl as FormGroup).value;
      return this.studentApi.createStudent({
        classId: v.classId,
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        rollNo: Number(String(v.rollNo).trim()),
        active: true,
      });
    });

    forkJoin(requests)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (envelopes) => {
          const failed = envelopes.find((e) => !e.success || e.error);
          if (failed) {
            const msg = failed.error_msg?.trim() || 'Request failed';
            this.toast.error(this.ui?.saveErrorTitle ?? 'Error', msg);
            return;
          }
          const count = this.students.length;
          const successTitle = this.ui?.saveSuccessTitle ?? 'Success';
          const successBody =
            count === 1
              ? (this.ui?.saveSuccessSingle ?? 'Student added successfully.')
              : (this.ui?.saveSuccessPlural ?? '{{count}} students added successfully.').replace(
                  /\{\{\s*count\s*\}\}/gi,
                  String(count),
                );
          this.toast.success(successTitle, successBody);
          const created = this.students.controls.map((c) => this.rowToStudent(c as FormGroup));
          this.dialogRef.close(created);
        },
        error: (err: unknown) => {
          this.toast.error(this.ui?.saveErrorTitle ?? 'Error', this.extractApiError(err));
        },
      });
  }

  private rowToStudent(row: FormGroup): Omit<Student, 'id'> {
    const v = row.value;
    return {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      rollNo: String(v.rollNo).trim(),
      class: this.classLabel(v.classId),
      classId: v.classId ?? undefined,
    };
  }

  private extractApiError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (body && typeof body === 'object' && 'error_msg' in body) {
        const m = (body as { error_msg?: string }).error_msg;
        if (typeof m === 'string' && m.trim()) return m.trim();
      }
      return err.message || 'Request failed';
    }
    return 'Request failed';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this.contextSub?.unsubscribe();
  }
}
