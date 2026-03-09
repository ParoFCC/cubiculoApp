import api from "./api";
import { AttendanceRecord, AttendanceStatus } from "../types/attendance.types";

export const attendanceService = {
  getStatus: (): Promise<AttendanceStatus> =>
    api.get<AttendanceStatus>("/attendance/status").then((r) => r.data),

  clock: (method: "button" | "qr" | "nfc" = "button"): Promise<AttendanceStatus> =>
    api
      .post<AttendanceStatus>("/attendance/clock", { method })
      .then((r) => r.data),

  getHistory: (
    adminId?: string,
    forDate?: string,
  ): Promise<AttendanceRecord[]> =>
    api
      .get<AttendanceRecord[]>("/attendance/history", {
        params: {
          ...(adminId ? { admin_id: adminId } : {}),
          ...(forDate ? { for_date: forDate } : {}),
        },
      })
      .then((r) => r.data),
};
