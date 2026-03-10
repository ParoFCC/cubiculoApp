export type UserRole = "student" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  student_id?: string;
  period?: string;
  is_super_admin: boolean;
  managed_cubiculo_id?: string | null;
}

export const SUPER_ADMIN_ID = "be202329205";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// Backend login only returns tokens (user is fetched via /users/me)
export interface LoginResponse extends AuthTokens {}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  student_id: string;
  period?: string;
  role?: UserRole;
}

export interface VerifyEmailRequest {
  name: string;
  email: string;
  password: string;
  student_id: string;
  period?: string;
  role?: UserRole;
  code: string;
}
