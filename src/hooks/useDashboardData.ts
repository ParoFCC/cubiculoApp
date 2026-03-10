import { useState, useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { gamesService } from "../services/gamesService";
import { printingService } from "../services/printingService";
import { productsService } from "../services/productsService";
import { usersService } from "../services/usersService";
import { GameLoan } from "../types/games.types";
import { CashRegister, Product, Sale } from "../types/products.types";
import { PrintHistoryItem } from "../types/printing.types";

const PURPLE = "#5C35D9";

export interface CriticalItem {
  key: string;
  title: string;
  description: string;
  accent: string;
  soft: string;
  icon: string;
  screen: string;
}

export interface MetricCard {
  key: string;
  title: string;
  value: string;
  accent: string;
  soft: string;
  icon: string;
}

export interface QuickCard {
  screen: string;
  title: string;
  icon: string;
  bg: string;
  subtitle: string;
}

interface Options {
  gamesOn: boolean;
  printOn: boolean;
  productsOn: boolean;
  isSuperAdmin: boolean;
}

function isSameDay(dateString: string): boolean {
  const d = new Date(dateString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function useDashboardData({
  gamesOn,
  printOn,
  productsOn,
  isSuperAdmin,
}: Options) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [loanHistory, setLoanHistory] = useState<GameLoan[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [printHistory, setPrintHistory] = useState<PrintHistoryItem[]>([]);
  const [cashStatus, setCashStatus] = useState<CashRegister | null>(null);
  const [pendingAdmins, setPendingAdmins] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const loadDashboard = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const [loanResp, salesResp, cashResp, printResp, , productsResp] =
        await Promise.all([
          gamesOn
            ? gamesService.getLoanHistory().catch(() => [])
            : Promise.resolve([]),
          productsOn
            ? productsService.getSales().catch(() => [])
            : Promise.resolve([]),
          productsOn
            ? productsService.getCashRegisterStatus().catch(() => null)
            : Promise.resolve(null),
          printOn
            ? printingService.getAllHistory().catch(() => [])
            : Promise.resolve([]),
          gamesOn
            ? gamesService.getCatalog().catch(() => [])
            : Promise.resolve([]),
          productsOn
            ? productsService.getCatalog().catch(() => [])
            : Promise.resolve([]),
        ]);

      if (controller.signal.aborted) return;

      setLoanHistory(loanResp);
      setSales(salesResp);
      setCashStatus(cashResp);
      setPrintHistory(printResp);
      setProducts(productsResp.filter((p) => p.is_active));

      if (isSuperAdmin) {
        try {
          const { items } = await usersService.getAll("admin");
          if (!controller.signal.aborted) {
            setPendingAdmins(
              items.filter((u) => !u.managed_cubiculo_id && !u.is_super_admin)
                .length,
            );
          }
        } catch {
          // non-critical
        }
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [gamesOn, printOn, productsOn, isSuperAdmin]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
      return () => {
        abortRef.current?.abort();
      };
    }, [loadDashboard]),
  );

  // ── Derived metrics ──────────────────────────────────────────────────────────
  const activeLoans = loanHistory.filter((l) => l.status === "active").length;
  const overdueLoans = loanHistory.filter((l) => {
    if (l.status === "overdue") return true;
    if (l.status !== "active" || !l.due_at) return false;
    return new Date(l.due_at).getTime() < Date.now();
  }).length;
  const todaySales = sales.filter((s) => isSameDay(s.sold_at));
  const todaySalesTotal = todaySales.reduce((sum, s) => sum + s.total, 0);
  const todayPrints = printHistory.filter((h) => isSameDay(h.printed_at));
  const todayPrintPages = todayPrints.reduce((sum, h) => sum + h.pages, 0);
  const lowStockProducts = products.filter(
    (p) => p.stock > 0 && p.stock <= 3,
  ).length;

  // ── Critical items ───────────────────────────────────────────────────────────
  const criticalItems: CriticalItem[] = [
    overdueLoans > 0 && {
      key: "overdue-loans",
      title: `${overdueLoans} préstamos vencidos`,
      description: "Revisa devoluciones pendientes y seguimiento.",
      accent: "#b91c1c",
      soft: "#fee2e2",
      icon: "alert-circle-outline",
      screen: "LoanHistory",
    },
    lowStockProducts > 0 && {
      key: "low-stock",
      title: `${lowStockProducts} productos con stock bajo`,
      description: "Repón inventario antes de quedarte sin venta.",
      accent: "#b45309",
      soft: "#ffedd5",
      icon: "package-variant-closed-alert",
      screen: "InventoryProduct",
    },
    cashStatus?.status === "open" && {
      key: "cash-open",
      title: "Caja pendiente de cierre",
      description: "Hay una caja abierta que sigue operando.",
      accent: "#15803d",
      soft: "#dcfce7",
      icon: "cash-clock",
      screen: "CashRegister",
    },
    isSuperAdmin &&
      pendingAdmins > 0 && {
        key: "pending-admins",
        title: `${pendingAdmins} admin${
          pendingAdmins !== 1 ? "s" : ""
        } sin cubículo asignado`,
        description: "Asigna un cubículo para que puedan operar.",
        accent: "#7c3aed",
        soft: "#f3e8ff",
        icon: "account-clock-outline",
        screen: "UsersAdmin",
      },
  ].filter(Boolean) as CriticalItem[];

  // ── Metric cards ─────────────────────────────────────────────────────────────
  const metricCards: MetricCard[] = [
    {
      key: "active-loans",
      title: "Préstamos activos",
      value: `${activeLoans}`,
      accent: PURPLE,
      soft: "#ede9fe",
      icon: "hand-coin-outline",
    },
    {
      key: "cash-status",
      title: "Caja",
      value: cashStatus?.status === "open" ? "Abierta" : "Cerrada",
      accent: cashStatus?.status === "open" ? "#15803d" : "#b45309",
      soft: cashStatus?.status === "open" ? "#dcfce7" : "#ffedd5",
      icon: cashStatus?.status === "open" ? "cash-check" : "cash-remove",
    },
    {
      key: "today-sales",
      title: "Ventas de hoy",
      value: `$${todaySalesTotal.toFixed(2)}`,
      accent: "#059669",
      soft: "#d1fae5",
      icon: "cart-check",
    },
    {
      key: "today-prints",
      title: "Impresiones de hoy",
      value: `${todayPrintPages}`,
      accent: "#0284c7",
      soft: "#e0f2fe",
      icon: "printer-outline",
    },
  ];

  // ── Quick action cards ────────────────────────────────────────────────────────
  const quickCards: QuickCard[] = [
    gamesOn && {
      screen: "RegisterLoan",
      title: "Préstamo",
      icon: "hand-pointing-right",
      bg: PURPLE,
      subtitle: "Registrar salida",
    },
    gamesOn &&
      activeLoans > 0 && {
        screen: "RegisterReturn",
        title: "Devolución",
        icon: "hand-okay",
        bg: "#D97706",
        subtitle: `${activeLoans} por recibir`,
      },
    printOn && {
      screen: "RegisterPrint",
      title: "Impresión",
      icon: "printer",
      bg: "#0891B2",
      subtitle: "Cargar páginas",
    },
    productsOn &&
      (cashStatus?.status === "open"
        ? {
            screen: "RegisterSale",
            title: "Venta",
            icon: "cart",
            bg: "#059669",
            subtitle: "Cobro rápido",
          }
        : {
            screen: "CashRegister",
            title: "Abrir caja",
            icon: "cash-register",
            bg: "#BE123C",
            subtitle: "Ventas bloqueadas",
          }),
  ].filter(Boolean) as QuickCard[];

  return { loading, criticalItems, metricCards, quickCards, cashStatus };
}
