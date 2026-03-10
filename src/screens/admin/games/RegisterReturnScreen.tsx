import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Toast from "react-native-toast-message";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { gamesService } from "../../../services/gamesService";
import { GameLoan } from "../../../types/games.types";
import { extractApiErrorMessage } from "../../../utils/apiError";

const PURPLE = "#5C35D9";
const PURPLE_LIGHT = "#EEE9FF";

interface ReturnModalState {
  loan: GameLoan;
  piecesComplete: boolean;
  notes: string;
}

export default function RegisterReturnScreen() {
  const [loans, setLoans] = useState<GameLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [returning, setReturning] = useState<string | null>(null);
  const [modal, setModal] = useState<ReturnModalState | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchLoans = useCallback(async (quiet = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (!quiet) setLoading(true);
    try {
      const all = await gamesService.getLoanHistory();
      if (!controller.signal.aborted) {
        setLoans(all.filter((l) => l.status === "active"));
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
    fetchLoans();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchLoans]);

  const openModal = (loan: GameLoan) => {
    setModal({ loan, piecesComplete: true, notes: "" });
  };

  const confirmReturn = () => {
    if (!modal) return;
    const { loan, piecesComplete, notes } = modal;
    setModal(null);
    setReturning(loan.id);
    gamesService
      .registerReturn(loan.id, {
        pieces_complete: piecesComplete,
        notes: notes.trim() || undefined,
      })
      .then(() => {
        setLoans((prev) => prev.filter((l) => l.id !== loan.id));
        Toast.show({
          type: "success",
          text1: "Devolución registrada",
          text2: piecesComplete
            ? loan.game_name ?? "Juego devuelto"
            : `⚠️ ${loan.game_name ?? "Juego"} — piezas incompletas`,
        });
      })
      .catch((err: any) =>
        Toast.show({
          type: "error",
          text1: "Error al registrar",
          text2: extractApiErrorMessage(
            err,
            "No se pudo registrar la devolución.",
          ),
        }),
      )
      .finally(() => setReturning(null));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <>
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
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={48}
              color="#d1d5db"
            />
            <Text style={styles.empty}>No hay préstamos activos.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.info}>
              <Text style={styles.gameName}>{item.game_name ?? "—"}</Text>
              <Text style={styles.meta}>
                Prestado:{" "}
                {format(new Date(item.borrowed_at), "d MMM yyyy", {
                  locale: es,
                })}
              </Text>
              <Text style={styles.meta}>Matrícula: {item.student_id}</Text>
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
                returning === item.id && styles.btnDisabled,
              ]}
              onPress={() => openModal(item)}
              disabled={returning === item.id}
            >
              {returning === item.id ? (
                <ActivityIndicator size="small" color={PURPLE} />
              ) : (
                <Text style={styles.returnBtnText}>Devolver</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Return confirmation modal */}
      <Modal
        visible={!!modal}
        transparent
        animationType="slide"
        onRequestClose={() => setModal(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Registrar devolución</Text>
            {modal && (
              <Text style={styles.modalGame}>
                {modal.loan.game_name ?? "Juego"}
              </Text>
            )}

            <Text style={styles.modalLabel}>¿Las piezas están completas?</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  modal?.piecesComplete && styles.toggleBtnActive,
                ]}
                onPress={() =>
                  setModal((m) => (m ? { ...m, piecesComplete: true } : m))
                }
              >
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={18}
                  color={modal?.piecesComplete ? "#fff" : "#6b7280"}
                />
                <Text
                  style={[
                    styles.toggleText,
                    modal?.piecesComplete && styles.toggleTextActive,
                  ]}
                >
                  Completo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  modal?.piecesComplete === false && styles.toggleBtnWarning,
                ]}
                onPress={() =>
                  setModal((m) => (m ? { ...m, piecesComplete: false } : m))
                }
              >
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={18}
                  color={modal?.piecesComplete === false ? "#fff" : "#6b7280"}
                />
                <Text
                  style={[
                    styles.toggleText,
                    modal?.piecesComplete === false && styles.toggleTextActive,
                  ]}
                >
                  Faltantes
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Notas (opcional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder={
                modal?.piecesComplete === false
                  ? "Ej: falta 1 dado, 3 cartas..."
                  : "Observaciones..."
              }
              placeholderTextColor="#aaa"
              value={modal?.notes ?? ""}
              onChangeText={(v) =>
                setModal((m) => (m ? { ...m, notes: v } : m))
              }
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                modal?.piecesComplete === false && styles.confirmBtnWarning,
              ]}
              onPress={confirmReturn}
            >
              <Text style={styles.confirmBtnText}>
                {modal?.piecesComplete === false
                  ? "Confirmar con faltante"
                  : "Confirmar devolución"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModal(null)}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, gap: 10 },
  emptyWrap: { alignItems: "center", marginTop: 60, gap: 12 },
  empty: { textAlign: "center", color: "#999", fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
    gap: 12,
  },
  info: { flex: 1 },
  gameName: { fontSize: 15, fontWeight: "700", color: "#1a1a2e" },
  meta: { fontSize: 12, color: "#666", marginTop: 3 },
  due: { fontSize: 12, color: "#E53935", marginTop: 2 },
  returnBtn: {
    backgroundColor: PURPLE_LIGHT,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  returnBtnText: { color: PURPLE, fontWeight: "700", fontSize: 13 },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1a1a2e",
    marginBottom: 2,
  },
  modalGame: { fontSize: 13, color: "#6b7280", marginBottom: 18 },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444",
    marginBottom: 8,
  },
  toggleRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  toggleBtnActive: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  toggleBtnWarning: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  toggleText: { fontSize: 13, fontWeight: "700", color: "#6b7280" },
  toggleTextActive: { color: "#fff" },
  notesInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#222",
    backgroundColor: "#fafafa",
    marginBottom: 18,
    textAlignVertical: "top",
    minHeight: 72,
  },
  confirmBtn: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 10,
  },
  confirmBtnWarning: { backgroundColor: "#D97706" },
  confirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cancelBtn: {
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelBtnText: { color: "#555", fontWeight: "700", fontSize: 14 },
});
