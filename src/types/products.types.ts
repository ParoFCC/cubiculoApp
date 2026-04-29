export interface Product {
  id: string;
  name: string;
  category: string;
  image_url?: string;
  price: number;
  stock: number;
  is_active: boolean;
}

export interface SaleItem {
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface Sale {
  id: string;
  admin_id: string;
  admin_name: string;
  student_id?: string;
  student_name: string;
  total: number;
  payment_method: "cash" | "card";
  card_commission: number;
  sold_at: string;
  items: SaleItem[];
}

export interface RegisterSalePayload {
  student_id?: string;
  items: { product_id: string; quantity: number }[];
  payment_method?: "cash" | "card";
}

export type CashRegisterStatus = "open" | "closed";

export interface CashRegister {
  id: string;
  admin_id: string;
  opening_balance: number;
  withdrawals_total?: number;
  closing_balance?: number;
  opened_at: string;
  closed_at?: string;
  status: CashRegisterStatus;
  sales_total?: number;
}
