import api from "./api";
import {
  Product,
  Sale,
  RegisterSalePayload,
  CashRegister,
} from "../types/products.types";
import { getCached, setCached, invalidateCache } from "../utils/catalogCache";

const PRODUCTS_CACHE_KEY = "products_catalog";

export const productsService = {
  getCatalog: (): Promise<Product[]> => {
    const cached = getCached<Product[]>(PRODUCTS_CACHE_KEY);
    if (cached) return Promise.resolve(cached);
    return api.get<Product[]>("/products").then((r) => {
      setCached(PRODUCTS_CACHE_KEY, r.data);
      return r.data;
    });
  },

  // Admin
  createProduct: (data: Omit<Product, "id">): Promise<Product> =>
    api.post<Product>("/products", data).then((r) => {
      invalidateCache(PRODUCTS_CACHE_KEY);
      return r.data;
    }),

  updateProduct: (id: string, data: Partial<Product>): Promise<Product> =>
    api.patch<Product>(`/products/${id}`, data).then((r) => {
      invalidateCache(PRODUCTS_CACHE_KEY);
      return r.data;
    }),

  deleteAllProducts: (): Promise<{ deleted: number }> =>
    api.delete<{ deleted: number }>("/products").then((r) => r.data),

  deleteProduct: (id: string): Promise<void> =>
    api.delete(`/products/${id}`).then(() => {
      invalidateCache(PRODUCTS_CACHE_KEY);
    }),

  registerSale: (payload: RegisterSalePayload): Promise<Sale> =>
    api.post<Sale>("/sales", payload).then((r) => r.data),

  getSales: (): Promise<Sale[]> =>
    api.get<Sale[]>("/sales").then((r) => r.data),

  getSalesReport: (from: string, to: string): Promise<Sale[]> =>
    api.get<Sale[]>("/sales", { params: { from, to } }).then((r) => r.data),

  // Caja
  openCashRegister: (): Promise<CashRegister> =>
    api.post<CashRegister>("/cash-register/open").then((r) => r.data),

  closeCashRegister: (closingBalance: number): Promise<CashRegister> =>
    api
      .post<CashRegister>("/cash-register/close", {
        closing_balance: closingBalance,
      })
      .then((r) => r.data),

  withdrawCashRegister: (amount: number): Promise<CashRegister> =>
    api
      .post<CashRegister>("/cash-register/withdraw", {
        amount,
      })
      .then((r) => r.data),

  getCashRegisterStatus: (): Promise<CashRegister> =>
    api.get<CashRegister>("/cash-register").then((r) => r.data),

  getCashRegisterHistory: (): Promise<CashRegister[]> =>
    api.get<CashRegister[]>("/cash-register/history").then((r) => r.data),
};
