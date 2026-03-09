export interface Game {
  id: string;
  name: string;
  description: string;
  instructions: string;
  instructions_url?: string | null;
  image_url?: string;
  quantity_total: number;
  quantity_avail: number;
  created_at: string;
}

export type LoanStatus = "active" | "returned" | "overdue";

export interface GameLoan {
  id: string;
  game: Game;
  student_id: string;
  admin_id: string;
  borrowed_at: string;
  due_at?: string;
  returned_at?: string;
  status: LoanStatus;
}

export interface RequestLoanPayload {
  game_id: string;
}
