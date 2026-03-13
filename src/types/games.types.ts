export interface Game {
  id: string;
  name: string;
  description: string;
  instructions: string;
  instructions_url?: string | null;
  image_url?: string;
  quantity_total: number;
  quantity_avail: number;
  is_active: boolean;
  created_at: string;
}

export type LoanStatus = "active" | "returned" | "overdue";

export interface GameLoan {
  id: string;
  game_id: string;
  game_name: string;
  student_id: string;
  student_name: string;
  admin_id: string;
  admin_name: string;
  borrowed_at: string;
  due_at?: string;
  returned_at?: string;
  status: LoanStatus;
  pieces_complete: boolean;
}

export interface RequestLoanPayload {
  game_id: string;
}
