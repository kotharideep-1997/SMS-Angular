import {
  Component,
  EffectRef,
  Injector,
  OnDestroy,
  OnInit,
  AfterViewInit,
  ViewChild,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { Subscription, filter } from 'rxjs';
import type { EnContext } from '../../context/en-context.model';
import { GeneralContextService } from '../../services/general-context.service';
import { StudentService, Student } from '../../services/student';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  presentToday = 0;
  absentToday = 0;

  filterForm!: FormGroup;
  dataSource!: MatTableDataSource<Student>;
  displayedColumns: string[] = ['rollNo', 'firstName', 'lastName', 'class', 'attendanceStatus'];
  ui: EnContext['dashboard'] | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private readonly injector = inject(Injector);
  private studentsEffectRef?: EffectRef;
  private contextSub?: Subscription;

  constructor(
    private studentService: StudentService,
    private fb: FormBuilder,
    private generalContext: GeneralContextService,
  ) {}

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource([] as Student[]);

    const today = new Date().toISOString().split('T')[0];

    this.filterForm = this.fb.group({
      startDate: [new Date(), Validators.required],
      endDate: [new Date(), Validators.required],
      name: [''],
      rollNo: ['']
    });

    this.studentsEffectRef = runInInjectionContext(this.injector, () =>
      effect(() => {
        const students = this.studentService.getStudents()();
        this.calculateTodayWidgets(students, today);
        this.applyFilters(students);
      })
    );

    this.contextSub = this.generalContext.context$
      .pipe(filter((c): c is EnContext => c !== null))
      .subscribe((c) => {
        this.ui = c.dashboard;
      });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  calculateTodayWidgets(students: Student[], today: string) {
    this.presentToday = students.filter(s => s.attendanceDate === today && s.attendanceStatus === 'Present').length;
    this.absentToday = students.filter(s => s.attendanceDate === today && s.attendanceStatus === 'Absent').length;
  }

  showAttendance(status: 'Present' | 'Absent') {
    const today = new Date().toISOString().split('T')[0];
    const filtered = this.studentService.getStudents()().filter(
      s => s.attendanceDate === today && s.attendanceStatus === status
    );
    this.dataSource.data = filtered;
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  onFilterSubmit() {
    if (this.filterForm.valid) {
      this.applyFilters(this.studentService.getStudents()());
    }
  }

  applyFilters(allStudents: Student[]) {
    if (!this.filterForm.valid) {
      this.dataSource.data = allStudents;
      return;
    }

    const val = this.filterForm.value;
    const start = new Date(val.startDate).toISOString().split('T')[0];
    const end = new Date(val.endDate).toISOString().split('T')[0];
    const searchName = val.name.toLowerCase();
    const searchRollNo = val.rollNo.toLowerCase();

    const filtered = allStudents.filter(s => {
      if (!s.attendanceDate) return false;
      const attDateStr = s.attendanceDate;
      const dateInRange = attDateStr >= start && attDateStr <= end;

      const nameMatch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchName);
      const rollMatch = s.rollNo.toLowerCase().includes(searchRollNo);

      return dateInRange && nameMatch && rollMatch;
    });

    this.dataSource.data = filtered;
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  ngOnDestroy(): void {
    this.contextSub?.unsubscribe();
    this.studentsEffectRef?.destroy();
  }
}
