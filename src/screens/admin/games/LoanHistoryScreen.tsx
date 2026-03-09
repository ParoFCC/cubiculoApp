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
import { gamesService } from "../../../services/gamesService";
import { GameLoan } from "../../../types/games.types";

const STATUS_LABEL: Record<string, string> = {
  active: "Activo",
  returned: "Devuelto",
  overdue: "Vencido",
};

const STATUS_COLOR: Record<string, string> = {
  active: "#1565C0",
  returned: "#2E7D32",
  overdue: "#C62828",
};

export default function LoanHistoryScreen() {
  const [loans, setLoans] = useState<GameLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLoans = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await gamesService.getLoanHistory();
      setLoans(data);
    } catch {
      // keep existing list on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <FlatList
      data={loans}
      keyExtractor={(l) => l.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadLoans(true);
          }}
          colors={[PURPLE]}
        />
      }
      ListEmptyComponent={
        <Text style={styles.empty}>Sin préstamos registrados.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.body}>
            <Text style={styles.gameName}>{item.game?.name ?? "—"}</Text>
            <Text style={styles.meta}>
              {format(new Date(item.borrowed_at), "d MMM yyyy", { locale: es })}
              {item.returned_at
                ? ` → ${format(new Date(item.returned_at), "d MMM yyyy", {
                    locale: es,
                  })}`
                : ""}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: STATUS_COLOR[item.status] + "20" },
            ]}
          >
            <Text
              style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}
            >
              {STATUS_LABEL[item.status] ?? item.status}
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
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
  },
  body: { flex: 1 },
  gameName: { fontSize: 15, fontWeight: "700", color: "#1a1a2e" },
  meta: { fontSize: 12, color: "#888", marginTop: 3 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
});
