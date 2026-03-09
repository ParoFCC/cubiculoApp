import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import Toast from "react-native-toast-message";
import { productsService } from "../../../services/productsService";
import { CashRegister } from "../../../types/products.types";

export default function CashRegisterScreen() {
  const [status, setStatus] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState("");

  const fetchStatus = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await productsService.getCashRegisterStatus();
      setStatus(data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setStatus(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const isOpen = status?.status === "open";

  const handleAction = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 0) {
      Toast.show({
        type: "error",
        text1: "Monto inválido",
        text2: "Ingresa un monto válido.",
      });
      return;
    }
    setSubmitting(true);
    try {
      if (isOpen) {
        await productsService.closeCashRegister(parsed);
        Toast.show({
          type: "success",
          text1: "Caja cerrada",
          text2: `Monto de cierre: $${parsed.toFixed(2)}`,
        });
      } else {
        await productsService.openCashRegister(parsed);
        Toast.show({
          type: "success",
          text1: "Caja abierta",
          text2: `Monto inicial: $${parsed.toFixed(2)}`,
        });
      }
      setAmount("");
      fetchStatus();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2:
          err?.response?.data?.detail ?? "No se pudo completar la operación.",
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

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        {/* Status Card */}
        <View
          style={[
            styles.statusCard,
            isOpen ? styles.statusOpen : styles.statusClosed,
          ]}
        >
          <Text style={styles.statusEmoji}>{isOpen ? "🟢" : "🔴"}</Text>
          <Text style={styles.statusTitle}>
            {isOpen ? "Caja Abierta" : "Caja Cerrada"}
          </Text>
          {status && isOpen && (
            <>
              <Text style={styles.statusDetail}>
                Monto inicial: ${Number(status.opening_balance ?? 0).toFixed(2)}
              </Text>
              {status.opened_at && (
                <Text style={styles.statusDetail}>
                  Apertura: {new Date(status.opened_at).toLocaleString("es-MX")}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Action Form */}
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>
            {isOpen ? "Monto de cierre ($)" : "Monto de apertura ($)"}
          </Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor="#aaa"
          />
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
                {isOpen ? "Cerrar Caja" : "Abrir Caja"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const PURPLE = "#5C35D9";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F7FF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { flex: 1, padding: 16 },
  statusCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    elevation: 2,
  },
  statusOpen: { backgroundColor: "#E8F5E9" },
  statusClosed: { backgroundColor: "#FFEBEE" },
  statusEmoji: { fontSize: 48, marginBottom: 8 },
  statusTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1a1a2e",
    marginBottom: 8,
  },
  statusDetail: { fontSize: 13, color: "#555", marginTop: 2 },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    elevation: 1,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
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
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  openBtn: { backgroundColor: "#2E7D32" },
  closeBtn: { backgroundColor: "#C62828" },
  disabled: { opacity: 0.6 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
