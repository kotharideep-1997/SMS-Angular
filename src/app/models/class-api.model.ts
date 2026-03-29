export interface ClassDto {
  id: number;
  class: string;
  strength: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface ClassListEnvelope {
  success: boolean;
  error: boolean;
  error_msg: string;
  status_code: number;
  data: ClassDto[] | null;
}
