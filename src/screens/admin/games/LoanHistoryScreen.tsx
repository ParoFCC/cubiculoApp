import React, { useState, useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import Toast from "react-native-toast-message";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { gamesService } from "../../../services/gamesService";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
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
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "returned" | "overdue"
  >("all");

  const abortRef = useRef<AbortController | null>(null);

  const loadLoans = useCallback(async (quiet = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (!quiet) setLoading(true);
    try {
      const data = await gamesService.getLoanHistory();
      if (!controller.signal.aborted) {
        setLoans(data);
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        Toast.show({
          type: "error",
          text1: "Error al cargar historial",
          text2: err?.response?.data?.detail ?? "Intenta de nuevo.",
        });
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLoans();
      return () => {
        abortRef.current?.abort();
      };
    }, [loadLoans]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  const filtered =
    statusFilter === "all"
      ? loans
      : loans.filter((l) => l.status === statusFilter);

  const FILTERS: {
    key: "all" | "active" | "returned" | "overdue";
    label: string;
  }[] = [
    { key: "all", label: "Todos" },
    { key: "active", label: "Activos" },
    { key: "returned", label: "Devueltos" },
    { key: "overdue", label: "Vencidos" },
  ];

  return (
    <View style={styles.root}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              statusFilter === f.key && styles.filterChipActive,
            ]}
            onPress={() => setStatusFilter(f.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === f.key && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
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
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons
              name="gamepad-variant-outline"
              size={52}
              color="#d1d5db"
            />
            <Text style={styles.empty}>
              {statusFilter === "all"
                ? "Sin préstamos registrados"
                : `Sin préstamos ${STATUS_LABEL[statusFilter]?.toLowerCase()}s`}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.body}>
              <Text style={styles.gameName}>{item.game_name ?? "—"}</Text>
              <Text style={styles.studentLine}>
                {item.student_name
                  ? `${item.student_name} · ${item.student_id}`
                  : `Matrícula: ${item.student_id}`}
              </Text>
              <Text style={styles.meta}>
                {format(new Date(item.borrowed_at), "d MMM yyyy", {
                  locale: es,
                })}
                {item.returned_at
                  ? ` → ${format(new Date(item.returned_at), "d MMM yyyy", {
                      locale: es,
                    })}`
                  : ""}
              </Text>
              {!item.pieces_complete && (
                <View style={styles.piecesRow}>
                  <MaterialCommunityIcons
                    name="puzzle-remove-outline"
                    size={12}
                    color="#F59E0B"
                  />
                  <Text style={styles.piecesWarn}>Piezas incompletas</Text>
                </View>
              )}
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
    </View>
  );
}

const PURPLE = "#5C35D9";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F7FF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F8F7FF",
  },
  filterChip: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  filterChipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  filterChipText: { fontSize: 13, color: "#555", fontWeight: "600" },
  filterChipTextActive: { color: "#fff" },
  list: { padding: 16, gap: 10 },
  emptyWrap: { alignItems: "center", marginTop: 48, gap: 12 },
  empty: { textAlign: "center", color: "#9ca3af", fontSize: 14 },
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
  studentLine: { fontSize: 12, color: "#4b5563", marginTop: 2 },
  meta: { fontSize: 12, color: "#888", marginTop: 3 },
  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  adminName: { fontSize: 12, color: "#9ca3af" },
  piecesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  piecesWarn: { fontSize: 12, color: "#F59E0B", fontWeight: "600" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
});
