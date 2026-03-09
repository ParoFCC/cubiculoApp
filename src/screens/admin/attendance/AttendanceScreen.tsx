import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Toast from "react-native-toast-message";
import { attendanceService } from "../../../services/attendanceService";
import { useAuthStore } from "../../../store/useAuthStore";
import {
  AttendanceRecord,
  AttendanceStatus,
} from "../../../types/attendance.types";

const PURPLE = "#5C35D9";
const PURPLE_LIGHT = "#EEE9FF";
const GREEN = "#16a34a";
const GREEN_LIGHT = "#dcfce7";
const RED = "#dc2626";
const RED_LIGHT = "#fee2e2";

export default function AttendanceScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);

  const [statusData, setStatusData] = useState<AttendanceStatus | null>(null);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const loadData = useCallback(async () => {
    try {
      const [status, history] = await Promise.all([
        attendanceService.getStatus(),
        attendanceService.getHistory(user?.id, todayStr),
      ]);
      setStatusData(status);
      setTodayRecords(history);
    } catch {
      Toast.show({ type: "error", text1: "Error al cargar asistencia" });
    }
  }, [user?.id, todayStr]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleClock = async () => {
    setClocking(true);
    try {
      const result = await attendanceService.clock("button");
      setStatusData(result);
      // Refresh today's list
      const history = await attendanceService.getHistory(user?.id, todayStr);
      setTodayRecords(history);
      const action = result.status === "in" ? "entrada" : "salida";
      Toast.show({
        type: "success",
        text1: `✅ ${
          action.charAt(0).toUpperCase() + action.slice(1)
        } registrada`,
      });
    } catch {
      Toast.show({ type: "error", text1: "No se pudo registrar" });
    } finally {
      setClocking(false);
    }
  };

  const isIn = statusData?.status === "in";

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={PURPLE}
        />
      }
      ListHeaderComponent={
        <>
          {/* Status card */}
          <View
            style={[
              styles.statusCard,
              { backgroundColor: isIn ? GREEN_LIGHT : RED_LIGHT },
            ]}
          >
            <MaterialCommunityIcons
              name={isIn ? "check-circle" : "clock-outline"}
              size={48}
              color={isIn ? GREEN : RED}
            />
            <Text style={[styles.statusLabel, { color: isIn ? GREEN : RED }]}>
              {isIn ? "Actualmente dentro" : "Actualmente fuera"}
            </Text>
            {statusData?.last_record && (
              <Text style={styles.lastTime}>
                Último registro:{" "}
                {format(
                  new Date(statusData.last_record.recorded_at),
                  "HH:mm, d MMM",
                  { locale: es },
                )}
              </Text>
            )}
          </View>

          {/* Clock button */}
          <TouchableOpacity
            style={[
              styles.clockBtn,
              { backgroundColor: isIn ? RED : GREEN },
              clocking && styles.clockBtnDisabled,
            ]}
            onPress={handleClock}
            disabled={clocking}
            activeOpacity={0.85}
          >
            {clocking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name={isIn ? "exit-to-app" : "login"}
                  size={28}
                  color="#fff"
                />
                <Text style={styles.clockBtnText}>
                  {isIn ? "Registrar Salida" : "Registrar Entrada"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* History CTA */}
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => navigation.navigate("AttendanceHistory")}
          >
            <MaterialCommunityIcons name="history" size={18} color={PURPLE} />
            <Text style={styles.historyBtnText}>Ver historial completo</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color={PURPLE}
            />
          </TouchableOpacity>

          {/* Today's section header */}
          <Text style={styles.sectionTitle}>Hoy</Text>
        </>
      }
      data={todayRecords}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text style={styles.empty}>Sin registros hoy.</Text>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View
            style={[
              styles.dot,
              item.type === "entry" ? styles.dotEntry : styles.dotExit,
            ]}
          />
          <View style={styles.rowBody}>
            <Text style={styles.rowType}>
              {item.type === "entry" ? "Entrada" : "Salida"}
            </Text>
            <View style={styles.methodRow}>
              <MaterialCommunityIcons
                name={
                  item.method === "qr"
                    ? "qrcode-scan"
                    : item.method === "nfc"
                    ? "nfc"
                    : "gesture-tap-button"
                }
                size={12}
                color="#9ca3af"
              />
              <Text style={styles.methodText}>{item.method}</Text>
            </View>
          </View>
          <Text style={styles.rowTime}>
            {format(new Date(item.recorded_at), "HH:mm")}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F7FF" },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  statusCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  statusLabel: { fontSize: 18, fontWeight: "700" },
  lastTime: { fontSize: 13, color: "#6b7280" },
  clockBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 18,
    elevation: 2,
  },
  clockBtnDisabled: { opacity: 0.6 },
  clockBtnText: { fontSize: 18, fontWeight: "700", color: "#fff" },
  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PURPLE_LIGHT,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  historyBtnText: { flex: 1, fontSize: 14, fontWeight: "600", color: PURPLE },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9ca3af",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  empty: { textAlign: "center", color: "#999", marginTop: 12, fontSize: 14 },
  row: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  dotEntry: { backgroundColor: GREEN },
  dotExit: { backgroundColor: RED },
  rowBody: { flex: 1 },
  rowType: { fontSize: 15, fontWeight: "600", color: "#1a1a2e" },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  methodText: { fontSize: 12, color: "#9ca3af" },
  rowTime: { fontSize: 15, fontWeight: "700", color: "#374151" },
});
