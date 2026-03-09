import api from "./api";
import {
  Product,
  Sale,
  RegisterSalePayload,
  CashRegister,
} from "../types/products.types";

export const productsService = {
  getCatalog: (): Promise<Product[]> =>
    api.get<Product[]>("/products").then((r) => r.data),

  // Admin
  createProduct: (data: Omit<Product, "id">): Promise<Product> =>
    api.post<Product>("/products", data).then((r) => r.data),

  updateProduct: (id: string, data: Partial<Product>): Promise<Product> =>
    api.patch<Product>(`/products/${id}`, data).then((r) => r.data),

  deleteAllProducts: (): Promise<{ deleted: number }> =>
    api.delete<{ deleted: number }>("/products").then((r) => r.data),

  deleteProduct: (id: string): Promise<void> =>
    api.delete(`/products/${id}`).then(() => undefined),

  registerSale: (payload: RegisterSalePayload): Promise<Sale> =>
    api.post<Sale>("/sales", payload).then((r) => r.data),

  getSales: (): Promise<Sale[]> =>
    api.get<Sale[]>("/sales").then((r) => r.data),

  getSalesReport: (from: string, to: string): Promise<Sale[]> =>
    api.get<Sale[]>("/sales", { params: { from, to } }).then((r) => r.data),

  // Caja
  openCashRegister: (openingBalance: number): Promise<CashRegister> =>
    api
      .post<CashRegister>("/cash-register/open", {
        opening_balance: openingBalance,
      })
      .then((r) => r.data),

  closeCashRegister: (closingBalance: number): Promise<CashRegister> =>
    api
      .post<CashRegister>("/cash-register/close", {
        closing_balance: closingBalance,
      })
      .then((r) => r.data),

  getCashRegisterStatus: (): Promise<CashRegister> =>
    api.get<CashRegister>("/cash-register").then((r) => r.data),

  getCashRegisterHistory: (): Promise<CashRegister[]> =>
    api.get<CashRegister[]>("/cash-register/history").then((r) => r.data),
};
