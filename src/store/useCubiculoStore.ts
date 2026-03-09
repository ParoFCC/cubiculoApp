import { create } from "zustand";
import { Cubiculo } from "../types/cubiculo.types";

interface CubiculoState {
  selectedCubiculo: Cubiculo | null;
  cubiculos: Cubiculo[];
  setCubiculo: (cubiculo: Cubiculo) => void;
  setCubiculos: (cubiculos: Cubiculo[]) => void;
  clearCubiculo: () => void;
}

export const useCubiculoStore = create<CubiculoState>((set) => ({
  selectedCubiculo: null,
  cubiculos: [],

  setCubiculo: (cubiculo) => set({ selectedCubiculo: cubiculo }),
  setCubiculos: (cubiculos) => set({ cubiculos }),
  clearCubiculo: () => set({ selectedCubiculo: null }),
}));
