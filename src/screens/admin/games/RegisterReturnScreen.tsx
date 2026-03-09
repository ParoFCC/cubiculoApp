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
import Toast from "react-native-toast-message";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { gamesService } from "../../../services/gamesService";
import { GameLoan } from "../../../types/games.types";
import { extractApiErrorMessage } from "../../../utils/apiError";

export default function RegisterReturnScreen() {
  const [loans, setLoans] = useState<GameLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [returning, setReturning] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);

  const fetchLoans = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const all = await gamesService.getLoanHistory();
      setLoans(all.filter((l) => l.status === "active"));
    } catch {
      // keep existing list on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const handleReturn = (loan: GameLoan) => {
    if (pendingConfirm === loan.id) {
      // Second tap — execute
      setPendingConfirm(null);
      setReturning(loan.id);
      gamesService
        .registerReturn(loan.id)
        .then(() => {
          setLoans((prev) => prev.filter((l) => l.id !== loan.id));
          Toast.show({
            type: "success",
            text1: "Devoluci\u00f3n registrada",
            text2: loan.game?.name ?? "Juego devuelto",
          });
        })
        .catch((err: any) =>
          Toast.show({
            type: "error",
            text1: "Error",
            text2: extractApiErrorMessage(err, "No se pudo registrar."),
          }),
        )
        .finally(() => setReturning(null));
    } else {
      // First tap — ask for confirm
      setPendingConfirm(loan.id);
      Toast.show({
        type: "info",
        text1: "Confirmar devoluci\u00f3n",
        text2: `Toca \"Confirmar\" para devolver ${
          loan.game?.name ?? "el juego"
        }.`,
      });
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
    <FlatList
      data={loans}
      keyExtractor={(l) => l.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchLoans(true);
          }}
          colors={[PURPLE]}
        />
      }
      ListEmptyComponent={
        <Text style={styles.empty}>No hay préstamos activos.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.info}>
            <Text style={styles.gameName}>{item.game?.name ?? "—"}</Text>
            <Text style={styles.meta}>
              Prestado:{" "}
              {format(new Date(item.borrowed_at), "d MMM yyyy", { locale: es })}
            </Text>
            <Text style={styles.meta}>ID: {item.student_id}</Text>
            {item.due_at && (
              <Text style={styles.due}>
                Vence:{" "}
                {format(new Date(item.due_at), "d MMM yyyy", { locale: es })}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.returnBtn,
              pendingConfirm === item.id && styles.returnBtnConfirm,
              returning === item.id && styles.btnDisabled,
            ]}
            onPress={() => handleReturn(item)}
            disabled={returning === item.id}
          >
            {returning === item.id ? (
              <ActivityIndicator size="small" color={PURPLE} />
            ) : (
              <Text
                style={[
                  styles.returnBtnText,
                  pendingConfirm === item.id && styles.returnBtnTextConfirm,
                ]}
              >
                {pendingConfirm === item.id ? "Confirmar" : "Devolver"}
              </Text>
            )}
          </TouchableOpacity>
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
  info: { flex: 1 },
  gameName: { fontSize: 15, fontWeight: "700", color: "#1a1a2e" },
  meta: { fontSize: 12, color: "#666", marginTop: 3 },
  due: { fontSize: 12, color: "#E53935", marginTop: 2 },
  returnBtn: {
    backgroundColor: "#EEE9FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  returnBtnText: { color: PURPLE, fontWeight: "700", fontSize: 13 },
  returnBtnConfirm: { backgroundColor: "#22C55E20" },
  returnBtnTextConfirm: { color: "#15803D" },
});
