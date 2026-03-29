export interface LoginRequest {
  userName: string;
  password: string;
}

export interface LoginData {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc: string;
  refreshTokenExpiresAtUtc: string;
  userId: number;
  userName: string;
  permissions: string[];
}

export interface LoginApiEnvelope {
  success: boolean;
  error: boolean;
  error_msg: string;
  status_code: number;
  data: LoginData | null;
}
