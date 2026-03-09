import api from "./api";
import {
  PrintBalance,
  PrintHistoryItem,
  RegisterPrintPayload,
} from "../types/printing.types";

export const printingService = {
  getMyBalance: (): Promise<PrintBalance> =>
    api.get<PrintBalance>("/print/balance").then((r) => r.data),

  getMyHistory: (): Promise<PrintHistoryItem[]> =>
    api.get<PrintHistoryItem[]>("/print/history").then((r) => r.data),

  // Admin
  registerPrint: (payload: RegisterPrintPayload): Promise<PrintHistoryItem> =>
    api.post<PrintHistoryItem>("/print", payload).then((r) => r.data),

  getAllHistory: (): Promise<PrintHistoryItem[]> =>
    api.get<PrintHistoryItem[]>("/print/history/all").then((r) => r.data),
};
