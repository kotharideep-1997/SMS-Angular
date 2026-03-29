import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface NoPermissionsDialogData {
  title: string;
  message: string;
  okLabel: string;
}

@Component({
  selector: 'app-no-permissions-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './no-permissions-dialog.html',
  styleUrl: './no-permissions-dialog.scss',
})
export class NoPermissionsDialog {
  constructor(
    public dialogRef: MatDialogRef<NoPermissionsDialog, void>,
    @Inject(MAT_DIALOG_DATA) public data: NoPermissionsDialogData,
  ) {}
}
