import api from "./api";

export interface SearchUserResult {
  id: string;
  name: string;
  email: string;
  student_id?: string | null;
}

export interface SearchGameResult {
  id: string;
  name: string;
  quantity_total: number;
  quantity_avail: number;
}

export interface SearchProductResult {
  id: string;
  name: string;
  stock: number;
  price: number;
}

export interface GlobalSearchResponse {
  users: SearchUserResult[];
  games: SearchGameResult[];
  products: SearchProductResult[];
}

export const searchService = {
  searchGlobal: (q: string, limit = 5): Promise<GlobalSearchResponse> =>
    api
      .get<GlobalSearchResponse>("/search/global", { params: { q, limit } })
      .then((r) => r.data),
};
