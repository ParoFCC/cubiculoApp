import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { productsService } from "../../../services/productsService";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { Sale } from "../../../types/products.types";

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

export default function SalesReportScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>("today");
  const [productMap, setProductMap] = useState<Record<string, string>>({});

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

  const fetchSales = useCallback(
    async (p: Period = period, quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        let data: Sale[];
        if (p === "all") {
          data = await productsService.getSales();
        } else {
          const range = getPeriodRange(p);
          data = await productsService.getSalesReport(range.from!, range.to!);
        }
        setSales(data);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period],
  );

  useEffect(() => {
    fetchSales(period);
  }, [period]);

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalItems = sales.reduce(
    (sum, s) => sum + (s.items?.reduce((si, i) => si + i.quantity, 0) ?? 0),
    0,
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Period Selector */}
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
            <MaterialCommunityIcons name="receipt-text-outline" size={52} color="#d1d5db" />
            <Text style={styles.empty}>Sin ventas en el período seleccionado.</Text>
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
                <MaterialCommunityIcons name="account-outline" size={12} color="#9ca3af" />
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
});
