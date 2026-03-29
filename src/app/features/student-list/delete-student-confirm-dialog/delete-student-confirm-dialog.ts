import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface DeleteStudentConfirmData {
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
}

@Component({
  selector: 'app-delete-student-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './delete-student-confirm-dialog.html',
  styleUrl: './delete-student-confirm-dialog.scss',
})
export class DeleteStudentConfirmDialog {
  constructor(
    public dialogRef: MatDialogRef<DeleteStudentConfirmDialog, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteStudentConfirmData,
  ) {}
}
