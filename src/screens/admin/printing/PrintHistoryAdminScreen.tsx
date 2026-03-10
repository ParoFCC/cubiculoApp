import React, { useState, useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { printingService } from "../../../services/printingService";
import { PrintHistoryItem } from "../../../types/printing.types";

export default function PrintHistoryAdminScreen() {
  const [history, setHistory] = useState<PrintHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const fetchHistory = useCallback(async (quiet = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (!quiet) setLoading(true);
    try {
      const data = await printingService.getAllHistory();
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

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
      return () => {
        abortRef.current?.abort();
      };
    }, [fetchHistory]),
  );

  const totalPages = history.reduce((s, h) => s + h.pages, 0);
  const totalCost = history.reduce((s, h) => s + h.cost, 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <FlatList
      data={history}
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
        <View style={styles.summary}>
          <SummaryItem label="Total páginas" value={String(totalPages)} />
          <SummaryItem
            label="Ingresos cobrados"
            value={`$${totalCost.toFixed(2)}`}
          />
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>Sin registros.</Text>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View
            style={[
              styles.dot,
              item.type === "free" ? styles.free : styles.paid,
            ]}
          />
          <View style={styles.body}>
            <Text style={styles.pages}>{item.pages} pág.</Text>
            <Text style={styles.studentLine}>
              {item.student_name
                ? `${item.student_name} · ${item.student_id}`
                : `Matrícula: ${item.student_id}`}
            </Text>
            <Text style={styles.date}>
              {format(new Date(item.printed_at), "d MMM yyyy, HH:mm", {
                locale: es,
              })}
            </Text>
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
          <Text style={[styles.cost, item.type === "paid" && styles.costPaid]}>
            {item.type === "free" ? "Gratis" : `$${item.cost.toFixed(2)}`}
          </Text>
        </View>
      )}
    />
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={ss.box}>
      <Text style={ss.value}>{value}</Text>
      <Text style={ss.label}>{label}</Text>
    </View>
  );
}

const PURPLE = "#5C35D9";

const ss = StyleSheet.create({
  box: { flex: 1, alignItems: "center" },
  value: { fontSize: 22, fontWeight: "800", color: "#1a1a2e" },
  label: { fontSize: 12, color: "#888", marginTop: 2 },
});

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, gap: 10 },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  summary: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 1,
  },
  row: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  free: { backgroundColor: "#43A047" },
  paid: { backgroundColor: "#E53935" },
  body: { flex: 1 },
  pages: { fontSize: 15, fontWeight: "600", color: "#222" },
  studentLine: { fontSize: 12, color: "#4b5563", marginTop: 2 },
  date: { fontSize: 12, color: "#888", marginTop: 2 },
  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  adminName: { fontSize: 11, color: "#9ca3af" },
  cost: { fontSize: 14, fontWeight: "700", color: "#2E7D32" },
  costPaid: { color: "#C62828" },
});
