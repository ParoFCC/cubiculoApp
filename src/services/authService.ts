import api from "./api";
import {
  LoginRequest,
  LoginResponse,
  AuthTokens,
  RegisterRequest,
  VerifyEmailRequest,
} from "../types/auth.types";

export const authService = {
  login: (payload: LoginRequest): Promise<LoginResponse> =>
    api.post<LoginResponse>("/auth/login", payload).then((r) => r.data),

  register: (payload: RegisterRequest): Promise<{ message: string }> =>
    api.post("/auth/register", payload).then((r) => r.data),

  verifyEmail: (payload: VerifyEmailRequest): Promise<LoginResponse> =>
    api
      .post<LoginResponse>("/auth/verify-email-full", payload)
      .then((r) => r.data),

  refresh: (refreshToken: string): Promise<Pick<AuthTokens, "access_token">> =>
    api
      .post<Pick<AuthTokens, "access_token">>("/auth/refresh", {
        refresh_token: refreshToken,
      })
      .then((r) => r.data),

  logout: (): Promise<void> => api.post("/auth/logout").then(() => undefined),

  requestPasswordReset: (email: string): Promise<{ message: string }> =>
    api
      .post<{ message: string }>("/auth/forgot-password", { email })
      .then((r) => r.data),

  resetPassword: (
    email: string,
    pin: string,
    newPassword: string,
  ): Promise<{ message: string }> =>
    api
      .post<{ message: string }>("/auth/reset-password", {
        email,
        pin,
        new_password: newPassword,
      })
      .then((r) => r.data),

  me: () => api.get("/users/me").then((r) => r.data),
};
