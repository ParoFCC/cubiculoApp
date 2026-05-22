import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Share,
  Platform,
} from "react-native";
import { productsService } from "../../../services/productsService";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { Sale } from "../../../types/products.types";
import { generatePDF } from "react-native-html-to-pdf";
import Toast from "react-native-toast-message";

type Period = "today" | "week" | "month" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
  { key: "all", label: "Todo" },
];

function getPeriodRange(period: Period): { from?: string; to?: string } {
  const now = new Date();
  const fmtStart = (d: Date) => `${d.toISOString().split("T")[0]}T00:00:00`;
  const fmtEnd = (d: Date) => `${d.toISOString().split("T")[0]}T23:59:59`;
  if (period === "today") return { from: fmtStart(now), to: fmtEnd(now) };
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { from: fmtStart(d), to: fmtEnd(now) };
  }
  if (period === "month") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmtStart(d), to: fmtEnd(now) };
  }
  return {};
}

const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoy",
  week: "Última semana",
  month: "Este mes",
  all: "Todo el historial",
};

export default function SalesReportScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>("today");
  const [productMap, setProductMap] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    productsService
      .getCatalog()
      .then((prods) => {
        const map: Record<string, string> = {};
        prods.forEach((p) => {
          map[p.id] = p.name;
        });
        setProductMap(map);
      })
      .catch(() => {});
  }, []);

  const abortRef = useRef<AbortController | null>(null);

  const fetchSales = useCallback(
    async (p: Period = period, quiet = false) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (!quiet) setLoading(true);
      try {
        let data: Sale[];
        if (p === "all") {
          data = await productsService.getSales();
        } else {
          const range = getPeriodRange(p);
          data = await productsService.getSalesReport(range.from!, range.to!);
        }
        if (!controller.signal.aborted) {
          setSales(data);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [period],
  );

  useEffect(() => {
    fetchSales(period);
    return () => {
      abortRef.current?.abort();
    };
  }, [period]);

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalItems = sales.reduce(
    (sum, s) => sum + (s.items?.reduce((si, i) => si + i.quantity, 0) ?? 0),
    0,
  );

  const exportPDF = async () => {
    if (sales.length === 0) {
      Toast.show({
        type: "info",
        text1: "Sin datos",
        text2: "No hay ventas para exportar.",
      });
      return;
    }
    setExporting(true);
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const rows = sales
        .map((s) => {
          const itemLines = (s.items ?? [])
            .map(
              (i) =>
                `<tr><td style="padding:4px 12px">${
                  productMap[i.product_id] ?? i.product_id.slice(0, 8)
                }</td><td style="text-align:center">${
                  i.quantity
                }</td><td style="text-align:right">$${(
                  i.unit_price * i.quantity
                ).toFixed(2)}</td></tr>`,
            )
            .join("");
          return `<tr style="border-top:1px solid #e5e7eb"><td style="padding:6px 8px">${new Date(
            s.sold_at,
          ).toLocaleString("es-MX", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}</td><td style="padding:6px 8px">${
            s.student_id ?? "—"
          }</td><td style="padding:6px 8px"><table>${itemLines}</table></td><td style="padding:6px 8px;text-align:right;font-weight:bold">$${s.total.toFixed(
            2,
          )}</td></tr>`;
        })
        .join("");
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;padding:24px;color:#1a1a2e}h1{color:#5C35D9;margin-bottom:4px}h2{color:#444;font-size:14px;margin-top:0}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#5C35D9;color:#fff;padding:8px;text-align:left}.summary{display:flex;gap:24px;margin:16px 0;background:#F0EFF5;padding:12px 16px;border-radius:8px}.stat{font-size:13px;color:#555}.stat span{font-size:20px;font-weight:800;color:#5C35D9;display:block}</style></head><body><h1>Reporte de Ventas</h1><h2>Período: ${
        PERIOD_LABELS[period]
      } &nbsp;·&nbsp; Generado el ${dateStr}</h2><div class="summary"><div class="stat"><span>${
        sales.length
      }</span>Ventas</div><div class="stat"><span>${totalItems}</span>Artículos</div><div class="stat"><span>$${totalRevenue.toFixed(
        2,
      )}</span>Ingresos</div></div><table><thead><tr><th>Fecha/Hora</th><th>Matrícula</th><th>Productos</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
      const file = await generatePDF({
        html,
        fileName: `reporte_ventas_${now.toISOString().split("T")[0]}`,
        directory: "Documents",
      });
      if (file.filePath) {
        await Share.share({
          title: "Reporte de ventas",
          url:
            Platform.OS === "ios" ? file.filePath : `file://${file.filePath}`,
        });
      }
    } catch {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "No se pudo generar el PDF.",
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Period Selector + Export */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[
              styles.periodChip,
              period === p.key && styles.periodChipActive,
            ]}
            onPress={() => setPeriod(p.key)}
          >
            <Text
              style={[
                styles.periodText,
                period === p.key && styles.periodTextActive,
              ]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.exportBtn, exporting && styles.disabled]}
        onPress={exportPDF}
        disabled={exporting}
      >
        {exporting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <MaterialCommunityIcons
              name="file-pdf-box"
              size={18}
              color="#fff"
            />
            <Text style={styles.exportBtnText}>Exportar PDF</Text>
          </>
        )}
      </TouchableOpacity>

      <FlatList
        data={sales}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchSales(period, true);
            }}
            colors={[PURPLE]}
          />
        }
        ListHeaderComponent={
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{sales.length}</Text>
              <Text style={styles.summaryLabel}>Ventas</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalItems}</Text>
              <Text style={styles.summaryLabel}>Artículos</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: PURPLE }]}>
                ${totalRevenue.toFixed(2)}
              </Text>
              <Text style={styles.summaryLabel}>Ingresos</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons
              name="receipt-text-outline"
              size={52}
              color="#d1d5db"
            />
            <Text style={styles.empty}>
              Sin ventas en el período seleccionado.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.saleDate}>
                {new Date(item.sold_at).toLocaleString("es-MX", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <Text style={styles.saleTotal}>${item.total.toFixed(2)}</Text>
            </View>
            {item.items && item.items.length > 0 && (
              <View style={styles.itemsList}>
                {item.items.map((si, idx) => (
                  <Text key={idx} style={styles.saleItemLine}>
                    • {productMap[si.product_id] ?? si.product_id.slice(0, 8)} ×{" "}
                    {si.quantity} —{" "}
                    <Text style={{ color: PURPLE }}>
                      ${(si.unit_price * si.quantity).toFixed(2)}
                    </Text>
                  </Text>
                ))}
              </View>
            )}
            {item.student_id ? (
              <Text style={styles.studentLine}>
                {item.student_name
                  ? `Cliente: ${item.student_name} · ${item.student_id}`
                  : `Matrícula: ${item.student_id}`}
              </Text>
            ) : null}
            {item.admin_name ? (
              <View style={styles.adminRow}>
                <MaterialCommunityIcons
                  name="account-outline"
                  size={12}
                  color="#9ca3af"
                />
                <Text style={styles.adminName}>{item.admin_name}</Text>
              </View>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const PURPLE = "#5C35D9";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F7FF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  periodRow: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  periodChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "#F0EFF5",
  },
  periodChipActive: { backgroundColor: PURPLE },
  periodText: { fontSize: 13, fontWeight: "600", color: "#666" },
  periodTextActive: { color: "#fff" },
  list: { padding: 14 },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    justifyContent: "space-around",
    alignItems: "center",
  },
  summaryItem: { alignItems: "center" },
  summaryValue: { fontSize: 22, fontWeight: "800", color: "#1a1a2e" },
  summaryLabel: { fontSize: 12, color: "#888", marginTop: 2 },
  summaryDivider: { width: 1, height: 40, backgroundColor: "#eee" },
  emptyWrap: { alignItems: "center", marginTop: 48, gap: 12 },
  empty: { textAlign: "center", color: "#9ca3af", fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  saleDate: { fontSize: 13, color: "#666" },
  saleTotal: { fontSize: 17, fontWeight: "800", color: "#1a1a2e" },
  itemsList: { borderTopWidth: 1, borderTopColor: "#f0f0f0", paddingTop: 8 },
  saleItemLine: { fontSize: 13, color: "#555", marginBottom: 4 },
  studentLine: { fontSize: 12, color: "#4b5563", marginTop: 8 },
  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
  },
  adminName: { fontSize: 12, color: "#9ca3af" },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PURPLE,
    marginHorizontal: 14,
    marginBottom: 8,
    paddingVertical: 11,
    borderRadius: 12,
  },
  exportBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  disabled: { opacity: 0.6 },
});
