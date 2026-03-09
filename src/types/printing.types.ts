export type PrintType = "free" | "paid";

export interface PrintBalance {
  id: string;
  student_id: string;
  period: string;
  free_remaining: number;
  free_total: number;
}

export interface PrintHistoryItem {
  id: string;
  student_id: string;
  student_name: string;
  admin_id: string;
  admin_name: string;
  pages: number;
  type: PrintType;
  cost: number;
  printed_at: string;
}

export interface RegisterPrintPayload {
  student_id: string;
  pages: number;
}
