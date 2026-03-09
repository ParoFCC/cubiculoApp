import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import Toast from "react-native-toast-message";
import { attendanceService } from "../../../services/attendanceService";
import { useAuthStore } from "../../../store/useAuthStore";
import { SUPER_ADMIN_ID } from "../../../types/auth.types";
import { AttendanceRecord } from "../../../types/attendance.types";

const PURPLE = "#5C35D9";
const GREEN = "#16a34a";
const RED = "#dc2626";

type GroupedDay = { dateLabel: string; records: AttendanceRecord[] };

function groupByDay(records: AttendanceRecord[]): GroupedDay[] {
  const map = new Map<string, AttendanceRecord[]>();
  for (const r of records) {
    const key = format(new Date(r.recorded_at), "yyyy-MM-dd");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return Array.from(map.entries()).map(([key, recs]) => {
    const d = new Date(key + "T12:00:00");
    let label: string;
    if (isToday(d)) label = "Hoy";
    else if (isYesterday(d)) label = "Ayer";
    else label = format(d, "EEEE, d 'de' MMMM yyyy", { locale: es });
    return { dateLabel: label.charAt(0).toUpperCase() + label.slice(1), records: recs };
  });
}

export default function AttendanceHistoryScreen() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.student_id === SUPER_ADMIN_ID;

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Super admin can toggle: own records vs all admins
  const [showAll, setShowAll] = useState(false);

  const loadRecords = useCallback(async () => {
    try {
      const adminId = isSuperAdmin && showAll ? undefined : user?.id;
      const data = await attendanceService.getHistory(adminId);
      setRecords(data);
    } catch {
      Toast.show({ type: "error", text1: "Error al cargar historial" });
    }
  }, [isSuperAdmin, showAll, user?.id]);

  useEffect(() => {
    setLoading(true);
    loadRecords().finally(() => setLoading(false));
  }, [loadRecords]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  };

  const grouped = groupByDay(records);

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
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={PURPLE} />
      }
      ListHeaderComponent={
        isSuperAdmin ? (
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, !showAll && styles.toggleBtnActive]}
              onPress={() => setShowAll(false)}
            >
              <Text style={[styles.toggleText, !showAll && styles.toggleTextActive]}>
                Mis registros
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, showAll && styles.toggleBtnActive]}
              onPress={() => setShowAll(true)}
            >
              <Text style={[styles.toggleText, showAll && styles.toggleTextActive]}>
                Todos los admins
              </Text>
            </TouchableOpacity>
          </View>
        ) : null
      }
      data={grouped}
      keyExtractor={(item) => item.dateLabel}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="calendar-clock" size={52} color="#d1d5db" />
          <Text style={styles.empty}>Sin registros de asistencia.</Text>
        </View>
      }
      renderItem={({ item: group }) => (
        <View style={styles.group}>
          <Text style={styles.dayLabel}>{group.dateLabel}</Text>
          {group.records.map((r) => (
            <View key={r.id} style={styles.row}>
              <View
                style={[
                  styles.dot,
                  r.type === "entry" ? styles.dotEntry : styles.dotExit,
                ]}
              />
              <View style={styles.rowBody}>
                <Text style={styles.rowType}>
                  {r.type === "entry" ? "Entrada" : "Salida"}
                </Text>
                {showAll && r.admin_name ? (
                  <View style={styles.adminRow}>
                    <MaterialCommunityIcons name="account-outline" size={12} color="#9ca3af" />
                    <Text style={styles.adminName}>{r.admin_name}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowTime}>
                  {format(new Date(r.recorded_at), "HH:mm")}
                </Text>
                <MaterialCommunityIcons
                  name={r.method === "qr" ? "qrcode-scan" : r.method === "nfc" ? "nfc" : "gesture-tap-button"}
                  size={13}
                  color="#d1d5db"
                />
              </View>
            </View>
          ))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F7FF" },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: "#F0EEFF",
    borderRadius: 12,
    padding: 4,
    marginBottom: 4,
  },
  toggleBtn: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 8,
    alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: "#fff", elevation: 1 },
  toggleText: { fontSize: 13, fontWeight: "600", color: "#9ca3af" },
  toggleTextActive: { color: PURPLE },
  emptyWrap: { alignItems: "center", marginTop: 48, gap: 12 },
  empty: { textAlign: "center", color: "#9ca3af", fontSize: 14 },
  group: { gap: 6 },
  dayLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 0.3,
    marginBottom: 2,
    marginTop: 4,
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
  dotEntry: { backgroundColor: GREEN },
  dotExit: { backgroundColor: RED },
  rowBody: { flex: 1 },
  rowType: { fontSize: 15, fontWeight: "600", color: "#1a1a2e" },
  adminRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  adminName: { fontSize: 12, color: "#9ca3af" },
  rowRight: { alignItems: "flex-end", gap: 2 },
  rowTime: { fontSize: 15, fontWeight: "700", color: "#374151" },
});
