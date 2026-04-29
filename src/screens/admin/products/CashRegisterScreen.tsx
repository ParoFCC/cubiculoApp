import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import Toast from "react-native-toast-message";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { productsService } from "../../../services/productsService";
import { CashRegister } from "../../../types/products.types";
import { extractApiErrorMessage } from "../../../utils/apiError";

const PURPLE = "#5C35D9";

function fmt(amount: number) {
  return `$${Number(amount ?? 0).toFixed(2)}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CashRegisterScreen() {
  const [status, setStatus] = useState<CashRegister | null>(null);
  const [history, setHistory] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (quiet = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (!quiet) setLoading(true);
    try {
      const [curr, hist] = await Promise.allSettled([
        productsService.getCashRegisterStatus(),
        productsService.getCashRegisterHistory(),
      ]);
      if (!controller.signal.aborted) {
        setStatus(curr.status === "fulfilled" ? curr.value : null);
        setHistory(hist.status === "fulfilled" ? hist.value : []);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchData]);

  const isOpen = status?.status === "open";

  const handleAction = async () => {
    setSubmitting(true);
    try {
      if (isOpen) {
        const parsed = parseFloat(amount);
        if (isNaN(parsed) || parsed < 0) {
          Toast.show({
            type: "error",
            text1: "Monto inválido",
            text2: "Ingresa un monto válido.",
          });
          return;
        }
        await productsService.closeCashRegister(parsed);
        Toast.show({
          type: "success",
          text1: "Caja cerrada",
          text2: `Monto de cierre: ${fmt(parsed)}`,
        });
      } else {
        await productsService.openCashRegister();
        Toast.show({
          type: "success",
          text1: "Caja abierta",
          text2: "Se usó el cierre del día anterior como apertura.",
        });
      }
      setAmount("");
      fetchData();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: extractApiErrorMessage(
          err,
          "No se pudo completar la operación.",
        ),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    const parsed = parseFloat(withdrawAmount);
    if (isNaN(parsed) || parsed <= 0) {
      Toast.show({
        type: "error",
        text1: "Monto inválido",
        text2: "Ingresa un retiro mayor a 0.",
      });
      return;
    }
    setSubmitting(true);
    try {
      await productsService.withdrawCashRegister(parsed);
      Toast.show({
        type: "success",
        text1: "Retiro registrado",
        text2: `Retiro: ${fmt(parsed)}`,
      });
      setWithdrawAmount("");
      fetchData(true);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: extractApiErrorMessage(err, "No se pudo registrar el retiro."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  const salesTotal = status?.sales_total ?? 0;
  const withdrawalsTotal = status?.withdrawals_total ?? 0;
  const estimated = (status?.opening_balance ?? 0) + salesTotal - withdrawalsTotal;
  const historyFiltered = history.filter((h) => h.id !== status?.id);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchData(true);
          }}
          colors={[PURPLE]}
        />
      }
    >
      {/* Status Card */}
      <View
        style={[
          styles.statusCard,
          isOpen ? styles.statusOpen : styles.statusClosed,
        ]}
      >
        <View style={styles.statusHeader}>
          <MaterialCommunityIcons
            name={isOpen ? "cash-register" : "cash-remove"}
            size={28}
            color={isOpen ? "#2E7D32" : "#C62828"}
          />
          <Text
            style={[
              styles.statusTitle,
              { color: isOpen ? "#2E7D32" : "#C62828" },
            ]}
          >
            {isOpen ? "Caja Abierta" : "Caja Cerrada"}
          </Text>
        </View>

        {status && isOpen && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Apertura</Text>
              <Text style={styles.statValue}>
                {fmt(status.opening_balance)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Ventas</Text>
              <Text style={[styles.statValue, { color: PURPLE }]}>
                {fmt(salesTotal)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Retiros</Text>
              <Text style={[styles.statValue, { color: "#C62828" }]}>
                -{fmt(withdrawalsTotal)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Estimado</Text>
              <Text style={[styles.statValue, { color: "#2E7D32" }]}>
                {fmt(estimated)}
              </Text>
            </View>
          </View>
        )}

        {status?.opened_at && (
          <Text style={styles.statusMeta}>
            {isOpen ? "Abierta" : "Última apertura"}:{" "}
            {fmtDate(status.opened_at)}
          </Text>
        )}
      </View>

      {/* Action Form */}
      <View style={styles.formCard}>
        {isOpen ? (
          <>
            <Text style={styles.formLabel}>Monto de cierre ($)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#aaa"
            />
          </>
        ) : (
          <Text style={styles.formHint}>
            Al abrir caja se toma automáticamente el cierre anterior.
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            isOpen ? styles.closeBtn : styles.openBtn,
            submitting && styles.disabled,
          ]}
          onPress={handleAction}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionBtnText}>
              {isOpen ? "Cerrar Caja" : "Abrir Caja con saldo anterior"}
            </Text>
          )}
        </TouchableOpacity>

        {isOpen && (
          <>
            <Text style={[styles.formLabel, { marginTop: 14 }]}>
              Registrar retiro de caja ($)
            </Text>
            <TextInput
              style={styles.input}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#aaa"
            />
            <TouchableOpacity
              style={[styles.actionBtn, styles.withdrawBtn, submitting && styles.disabled]}
              onPress={handleWithdraw}
              disabled={submitting}
            >
              <Text style={styles.actionBtnText}>Registrar retiro</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* History */}
      {historyFiltered.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial de sesiones</Text>
          {historyFiltered.map((reg) => {
            const regSalesTotal = reg.sales_total ?? 0;
            const regWithdrawals = reg.withdrawals_total ?? 0;
            const regEstimated = reg.opening_balance + regSalesTotal - regWithdrawals;
            const diff =
              reg.closing_balance != null
                ? reg.closing_balance - regEstimated
                : null;
            return (
              <View key={reg.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyDate}>
                    {fmtDate(reg.opened_at)}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      reg.status === "open"
                        ? styles.badgeOpen
                        : styles.badgeClosed,
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {reg.status === "open" ? "Abierta" : "Cerrada"}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyRow}>
                  <Text style={styles.historyLabel}>Apertura</Text>
                  <Text style={styles.historyValue}>
                    {fmt(reg.opening_balance)}
                  </Text>
                </View>
                <View style={styles.historyRow}>
                  <Text style={styles.historyLabel}>Ventas</Text>
                  <Text style={[styles.historyValue, { color: PURPLE }]}>
                    {fmt(regSalesTotal)}
                  </Text>
                </View>
                <View style={styles.historyRow}>
                  <Text style={styles.historyLabel}>Retiros</Text>
                  <Text style={[styles.historyValue, { color: "#C62828" }]}>
                    -{fmt(regWithdrawals)}
                  </Text>
                </View>
                {reg.closing_balance != null && (
                  <>
                    <View style={styles.historyRow}>
                      <Text style={styles.historyLabel}>Cierre real</Text>
                      <Text style={styles.historyValue}>
                        {fmt(reg.closing_balance)}
                      </Text>
                    </View>
                    {diff !== null && (
                      <View style={styles.historyRow}>
                        <Text style={styles.historyLabel}>Diferencia</Text>
                        <Text
                          style={[
                            styles.historyValue,
                            { color: diff >= 0 ? "#2E7D32" : "#C62828" },
                          ]}
                        >
                          {diff >= 0 ? "+" : ""}
                          {fmt(diff)}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F7FF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 40 },
  statusCard: { borderRadius: 16, padding: 20, marginBottom: 16, elevation: 2 },
  statusOpen: { backgroundColor: "#E8F5E9" },
  statusClosed: { backgroundColor: "#FFEBEE" },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  statusTitle: { fontSize: 20, fontWeight: "800" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  statItem: { alignItems: "center" },
  statLabel: { fontSize: 11, color: "#888", marginBottom: 4 },
  statValue: { fontSize: 17, fontWeight: "800", color: "#1a1a2e" },
  statDivider: { width: 1, backgroundColor: "#eee" },
  statusMeta: { fontSize: 12, color: "#777", marginTop: 4 },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    elevation: 1,
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  formHint: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: "#222",
    marginBottom: 14,
    backgroundColor: "#FAFAFA",
  },
  actionBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  openBtn: { backgroundColor: "#2E7D32" },
  closeBtn: { backgroundColor: "#C62828" },
  withdrawBtn: { backgroundColor: "#6D28D9" },
  disabled: { opacity: 0.6 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 12,
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  historyDate: { fontSize: 13, color: "#555", fontWeight: "600" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeOpen: { backgroundColor: "#E8F5E9" },
  badgeClosed: { backgroundColor: "#f0f0f0" },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#555" },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  historyLabel: { fontSize: 13, color: "#777" },
  historyValue: { fontSize: 13, fontWeight: "700", color: "#1a1a2e" },
});
