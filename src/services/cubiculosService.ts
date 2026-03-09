import api from "./api";
import { Cubiculo } from "../types/cubiculo.types";
import { User } from "../types/auth.types";

export interface CubiculoPayload {
  name?: string;
  slug?: string;
  description?: string | null;
  location?: string | null;
  is_active?: boolean;
  games_enabled?: boolean;
  printing_enabled?: boolean;
  products_enabled?: boolean;
}

export const cubiculosService = {
  getAll: async (): Promise<Cubiculo[]> => {
    const { data } = await api.get<Cubiculo[]>("/cubiculos");
    return data;
  },

  getAllAdmin: async (): Promise<Cubiculo[]> => {
    const { data } = await api.get<Cubiculo[]>("/cubiculos/all");
    return data;
  },

  getById: async (id: string): Promise<Cubiculo> => {
    const { data } = await api.get<Cubiculo>(`/cubiculos/${id}`);
    return data;
  },

  create: async (
    payload: CubiculoPayload & { name: string; slug: string },
  ): Promise<Cubiculo> => {
    const { data } = await api.post<Cubiculo>("/cubiculos", payload);
    return data;
  },

  update: async (id: string, payload: CubiculoPayload): Promise<Cubiculo> => {
    const { data } = await api.patch<Cubiculo>(`/cubiculos/${id}`, payload);
    return data;
  },

  getAdmins: async (cubiculoId: string): Promise<User[]> => {
    const { data } = await api.get<User[]>(`/cubiculos/${cubiculoId}/admins`);
    return data;
  },

  assignAdmin: async (cubiculoId: string, userId: string): Promise<void> => {
    await api.post(`/cubiculos/${cubiculoId}/admins/${userId}`);
  },

  removeAdmin: async (cubiculoId: string, userId: string): Promise<void> => {
    await api.delete(`/cubiculos/${cubiculoId}/admins/${userId}`);
  },
};
