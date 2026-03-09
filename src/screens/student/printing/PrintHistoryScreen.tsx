import React, { useEffect, useState, useCallback } from "react";
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
import { printingService } from "../../../services/printingService";
import { PrintHistoryItem } from "../../../types/printing.types";

export default function PrintHistoryScreen() {
  const [history, setHistory] = useState<PrintHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await printingService.getMyHistory();
      setHistory(data);
    } catch {
      // keep existing list on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

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
            fetch(true);
          }}
          colors={[PURPLE]}
        />
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
  );
}

const PURPLE = "#5C35D9";

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
