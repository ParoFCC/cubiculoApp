import api from "./api";
import { User, UserRole } from "../types/auth.types";

export interface UserListResponse {
  items: User[];
  total: number;
}

export const usersService = {
  getAll: (role?: UserRole, skip = 0, limit = 100): Promise<UserListResponse> =>
    api
      .get<UserListResponse>("/users", { params: { role, skip, limit } })
      .then((r) => r.data),

  deactivate: (userId: string): Promise<void> =>
    api.delete(`/users/${userId}`).then(() => undefined),

  changeRole: (userId: string, role: UserRole): Promise<User> =>
    api.patch<User>(`/users/${userId}`, { role }).then((r) => r.data),

  assignCubiculo: (userId: string, cubiculoId: string | null): Promise<User> =>
    api
      .patch<User>(`/users/${userId}/cubiculo`, { cubiculo_id: cubiculoId })
      .then((r) => r.data),

  lookupByStudentId: (studentId: string): Promise<User> =>
    api
      .get<User>("/users/lookup", { params: { student_id: studentId } })
      .then((r) => r.data),
};
