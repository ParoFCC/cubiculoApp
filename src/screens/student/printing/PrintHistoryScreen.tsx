import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { printingService } from "../../../services/printingService";
import { PrintHistoryItem } from "../../../types/printing.types";

type FilterTab = "all" | "free" | "paid";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "free", label: "Gratis" },
  { key: "paid", label: "Pagadas" },
];

export default function PrintHistoryScreen() {
  const [history, setHistory] = useState<PrintHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<FilterTab>("all");

  const abortRef = useRef<AbortController | null>(null);

  const fetchHistory = useCallback(async (quiet = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (!quiet) setLoading(true);
    try {
      const data = await printingService.getMyHistory();
      if (!controller.signal.aborted) {
        setHistory(data);
      }
    } catch {
      // keep existing list on error
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchHistory]);

  const filtered =
    tab === "all" ? history : history.filter((h) => h.type === tab);

  const totalPages = filtered.reduce((s, h) => s + h.pages, 0);
  const totalCost = filtered.reduce((s, h) => s + (h.cost ?? 0), 0);
  const freeCount = filtered.filter((h) => h.type === "free").length;
  const paidCount = filtered.filter((h) => h.type === "paid").length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Filter tabs */}
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text
              style={[styles.tabText, tab === t.key && styles.tabTextActive]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(h) => h.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchHistory(true);
            }}
            colors={[PURPLE]}
          />
        }
        ListHeaderComponent={
          filtered.length > 0 ? (
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryVal}>{totalPages}</Text>
                <Text style={styles.summaryLbl}>Páginas</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryVal, { color: "#2E7D32" }]}>
                  {freeCount}
                </Text>
                <Text style={styles.summaryLbl}>Gratis</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryVal, { color: "#C62828" }]}>
                  {paidCount}
                </Text>
                <Text style={styles.summaryLbl}>Pagadas</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryVal, { color: PURPLE }]}>
                  ${totalCost.toFixed(2)}
                </Text>
                <Text style={styles.summaryLbl}>Total</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Sin historial de impresiones.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View
              style={[
                styles.typeDot,
                item.type === "free" ? styles.free : styles.paid,
              ]}
            />
            <View style={styles.info}>
              <Text style={styles.pages}>
                {item.pages} página{item.pages !== 1 ? "s" : ""}
              </Text>
              <Text style={styles.date}>
                {format(new Date(item.printed_at), "d MMM yyyy, HH:mm", {
                  locale: es,
                })}
              </Text>
            </View>
            <View style={styles.right}>
              <Text
                style={[
                  styles.type,
                  item.type === "free" ? styles.freeText : styles.paidText,
                ]}
              >
                {item.type === "free" ? "Gratis" : `$${item.cost.toFixed(2)}`}
              </Text>
            </View>
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
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "#F0EFF5",
  },
  tabActive: { backgroundColor: PURPLE },
  tabText: { fontSize: 13, fontWeight: "600", color: "#666" },
  tabTextActive: { color: "#fff" },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    justifyContent: "space-around",
    alignItems: "center",
  },
  summaryItem: { alignItems: "center" },
  summaryVal: { fontSize: 20, fontWeight: "800", color: "#1a1a2e" },
  summaryLbl: { fontSize: 11, color: "#888", marginTop: 2 },
  summaryDivider: { width: 1, height: 36, backgroundColor: "#eee" },
  list: { padding: 16, gap: 10 },
  empty: { textAlign: "center", color: "#999", marginTop: 40, fontSize: 15 },
  row: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowColor: "#000",
  },
  typeDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  free: { backgroundColor: "#43A047" },
  paid: { backgroundColor: "#E53935" },
  info: { flex: 1 },
  pages: { fontSize: 15, fontWeight: "600", color: "#222" },
  date: { fontSize: 12, color: "#888", marginTop: 2 },
  right: { alignItems: "flex-end" },
  type: { fontSize: 14, fontWeight: "700" },
  freeText: { color: "#2E7D32" },
  paidText: { color: "#C62828" },
});
