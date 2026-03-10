import api from "./api";
import { Game, GameLoan, RequestLoanPayload } from "../types/games.types";
import { getCached, setCached, invalidateCache } from "../utils/catalogCache";

const GAMES_CACHE_KEY = "games_catalog";

export const gamesService = {
  getCatalog: (): Promise<Game[]> => {
    const cached = getCached<Game[]>(GAMES_CACHE_KEY);
    if (cached) return Promise.resolve(cached);
    return api.get<Game[]>("/games").then((r) => {
      setCached(GAMES_CACHE_KEY, r.data);
      return r.data;
    });
  },

  getById: (id: string): Promise<Game> =>
    api.get<Game>(`/games/${id}`).then((r) => r.data),

  // Admin
  createGame: (
    data: Omit<Game, "id" | "created_at"> & { instructions_url?: string },
  ): Promise<Game> =>
    api.post<Game>("/games", data).then((r) => {
      invalidateCache(GAMES_CACHE_KEY);
      return r.data;
    }),

  updateGame: (
    id: string,
    data: Partial<Game> & { instructions_url?: string | null },
  ): Promise<Game> =>
    api.patch<Game>(`/games/${id}`, data).then((r) => {
      invalidateCache(GAMES_CACHE_KEY);
      return r.data;
    }),

  getLoanHistory: (): Promise<GameLoan[]> =>
    api.get<GameLoan[]>("/games/loans").then((r) => r.data),

  registerLoan: (
    studentId: string,
    gameId: string,
    piecesComplete = true,
  ): Promise<GameLoan> =>
    api
      .post<GameLoan>("/games/loans", {
        student_id: studentId,
        game_id: gameId,
        pieces_complete: piecesComplete,
      })
      .then((r) => r.data),

  registerReturn: (
    loanId: string,
    payload?: { notes?: string; pieces_complete?: boolean },
  ): Promise<GameLoan> =>
    api
      .patch<GameLoan>(`/games/loans/${loanId}/return`, payload ?? {})
      .then((r) => r.data),

  // Student
  requestLoan: (payload: RequestLoanPayload): Promise<GameLoan> =>
    api.post<GameLoan>("/games/loans/request", payload).then((r) => r.data),
};
