import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { printingService } from "../../../services/printingService";
import { PrintBalance } from "../../../types/printing.types";

export default function PrintBalanceScreen() {
  const navigation = useNavigation<any>();
  const [balance, setBalance] = useState<PrintBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalance = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await printingService.getMyBalance();
      setBalance(data);
    } catch {
      // keep previous data on refresh error; loading hides error on first load
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  const freeTotal = balance?.free_total ?? 10;
  const used = balance ? Math.max(0, freeTotal - balance.free_remaining) : 0;
  const pct = balance
    ? Math.max(0, Math.min(balance.free_remaining / freeTotal, 1))
    : 0;

  const barColor = pct > 0.5 ? "#22C55E" : pct > 0.2 ? "#F59E0B" : "#EF4444";
  const urgencyLabel =
    pct > 0.5 ? "Buen saldo"
    : pct > 0.2 ? "Pocas páginas"
    : "¡Casi sin impresiones!";
  const urgencyColor = pct > 0.5 ? "#16A34A" : pct > 0.2 ? "#D97706" : "#DC2626";
  const pctText = `${Math.round(pct * 100)}% restante`;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchBalance(true);
          }}
          colors={[PURPLE]}
        />
      }
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Período {balance?.period ?? "—"}</Text>

        {/* Progress bar */}
        <View style={styles.barLabelRow}>
          <Text style={[styles.urgencyLabel, { color: urgencyColor }]}>{urgencyLabel}</Text>
          <Text style={styles.pctLabel}>{pctText}</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { flex: pct, backgroundColor: barColor }]} />
          <View style={{ flex: Math.max(0, 1 - pct) }} />
        </View>

        <View style={styles.row}>
          <Stat
            label="Disponibles"
            value={balance?.free_remaining ?? 0}
            color={GREEN}
          />
          <Stat label="Usadas" value={used} color="#E53935" />
          <Stat label="Total" value={freeTotal} color="#555" />
        </View>
      </View>

      <TouchableOpacity
        style={styles.historyBtn}
        onPress={() => navigation.navigate("PrintHistory")}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons
          name="history"
          size={17}
          color={PURPLE}
          style={{ marginRight: 7 }}
        />
        <Text style={styles.historyBtnText}>Ver historial de impresiones</Text>
      </TouchableOpacity>

      <View style={styles.infoCard}>
        <View style={styles.infoTitle}>
          <MaterialCommunityIcons
            name="information-outline"
            size={16}
            color={PURPLE}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.infoTitleText}>¿Cómo funciona?</Text>
        </View>
        <Text style={styles.infoBody}>
          Cada período tienes{" "}
          <Text style={styles.bold}>10 impresiones gratuitas</Text>. Al
          agotarlas, cada página adicional tiene un costo de $0.50.
        </Text>
      </View>
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={statStyles.box}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const PURPLE = "#5C35D9";
const GREEN = "#2E7D32";

const statStyles = StyleSheet.create({
  box: { flex: 1, alignItems: "center" },
  value: { fontSize: 28, fontWeight: "800" },
  label: { fontSize: 12, color: "#888", marginTop: 2 },
});

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 20, backgroundColor: "#F8F7FF", flexGrow: 1 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    marginBottom: 16,
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: PURPLE,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 16,
    textAlign: "center",
  },
  barTrack: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#f3f4f6",
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 20,
  },
  barFill: { borderRadius: 7 },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  urgencyLabel: { fontSize: 13, fontWeight: "700" },
  pctLabel: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  row: { flexDirection: "row", justifyContent: "space-around" },
  historyBtn: {
    flexDirection: "row",
    backgroundColor: "#EEE9FF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  historyBtnText: { color: PURPLE, fontWeight: "600", fontSize: 14 },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 1,
  },
  infoTitle: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  infoTitleText: { fontSize: 14, fontWeight: "700", color: "#333" },
  infoBody: { fontSize: 13, color: "#555", lineHeight: 20 },
  bold: { fontWeight: "700" },
});
