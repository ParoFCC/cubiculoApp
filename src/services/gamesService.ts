import api from "./api";
import { Game, GameLoan, RequestLoanPayload } from "../types/games.types";

export const gamesService = {
  getCatalog: (): Promise<Game[]> =>
    api.get<Game[]>("/games").then((r) => r.data),

  getById: (id: string): Promise<Game> =>
    api.get<Game>(`/games/${id}`).then((r) => r.data),

  // Admin
  createGame: (
    data: Omit<Game, "id" | "created_at"> & { instructions_url?: string },
  ): Promise<Game> => api.post<Game>("/games", data).then((r) => r.data),

  updateGame: (
    id: string,
    data: Partial<Game> & { instructions_url?: string | null },
  ): Promise<Game> => api.patch<Game>(`/games/${id}`, data).then((r) => r.data),

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

  registerReturn: (loanId: string): Promise<GameLoan> =>
    api.patch<GameLoan>(`/games/loans/${loanId}/return`).then((r) => r.data),

  // Student
  requestLoan: (payload: RequestLoanPayload): Promise<GameLoan> =>
    api.post<GameLoan>("/games/loans/request", payload).then((r) => r.data),
};
