/**
 * Navigation param lists for type-safe navigation across the app.
 * Each stack/tab navigator has its own ParamList.
 */
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { ReceiptParams } from "../screens/admin/common/ReceiptScreen";
import type { Game } from "../types/games.types";

// ── Root ──────────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Auth: undefined;
  CubiculoSelect: undefined;
  Admin: undefined;
  Student: undefined;
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyEmail: {
    name: string;
    email: string;
    password: string;
    student_id: string;
    period?: string;
  };
  ForgotPassword: undefined;
};

export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

// ── Admin Home Stack ──────────────────────────────────────────────────────────
export type AdminHomeStackParamList = {
  Dashboard: undefined;
  Inventory: undefined;
  RegisterLoan:
    | {
        preselectedGame?: Game;
        game_id?: string;
        preselectedStudentId?: string;
      }
    | undefined;
  RegisterReturn: undefined;
  LoanHistory: undefined;
  RegisterPrint: { preselectedStudentId?: string } | undefined;
  PrintHistoryAdmin: undefined;
  InventoryProduct: undefined;
  RegisterSale:
    | { preselectedStudentId?: string; preselectedProductId?: string }
    | undefined;
  CashRegister: undefined;
  SalesReport: undefined;
  QrCodes: undefined;
  UsersAdmin: undefined;
  CubiculosAdmin: undefined;
  Receipt: ReceiptParams;
};

export type AdminHomeNavigationProp =
  NativeStackNavigationProp<AdminHomeStackParamList>;

// ── Admin Attendance Stack ────────────────────────────────────────────────────
export type AdminAttendanceStackParamList = {
  Attendance: undefined;
  AttendanceHistory: undefined;
};

export type AdminAttendanceNavigationProp =
  NativeStackNavigationProp<AdminAttendanceStackParamList>;

// ── Student Stacks ────────────────────────────────────────────────────────────
export type StudentGamesStackParamList = {
  GameCatalog: undefined;
  GameDetail: { game: Game };
  RequestLoan: { game: Game };
};

export type StudentGamesNavigationProp =
  NativeStackNavigationProp<StudentGamesStackParamList>;

export type StudentPrintingStackParamList = {
  PrintBalance: undefined;
  PrintHistory: undefined;
};

export type StudentPrintingNavigationProp =
  NativeStackNavigationProp<StudentPrintingStackParamList>;

export type StudentProductsStackParamList = {
  ProductCatalog: undefined;
};

// ── Route prop helpers ────────────────────────────────────────────────────────
export type VerifyEmailRouteProp = RouteProp<AuthStackParamList, "VerifyEmail">;
export type RegisterLoanRouteProp = RouteProp<
  AdminHomeStackParamList,
  "RegisterLoan"
>;
export type RegisterPrintRouteProp = RouteProp<
  AdminHomeStackParamList,
  "RegisterPrint"
>;
export type RegisterSaleRouteProp = RouteProp<
  AdminHomeStackParamList,
  "RegisterSale"
>;
export type ReceiptRouteProp = RouteProp<AdminHomeStackParamList, "Receipt">;
export type GameDetailRouteProp = RouteProp<
  StudentGamesStackParamList,
  "GameDetail"
>;
export type RequestLoanRouteProp = RouteProp<
  StudentGamesStackParamList,
  "RequestLoan"
>;
