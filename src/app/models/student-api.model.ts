export interface StudentCreatePayload {
  classId: number;
  firstName: string;
  lastName: string;
  rollNo: number;
  active: boolean;
}

export interface StudentCreateEnvelope {
  success: boolean;
  error: boolean;
  error_msg: string;
  status_code: number;
  data: unknown;
}

export interface StudentDeleteEnvelope {
  success: boolean;
  error: boolean;
  error_msg: string;
  status_code: number;
  data: unknown;
}

export interface StudentListEnvelope {
  success: boolean;
  error: boolean;
  error_msg: string;
  status_code: number;
  /** Array of student DTOs (shape may vary by API version). */
  data: unknown;
}

