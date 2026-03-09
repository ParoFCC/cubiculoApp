import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { cubiculosService } from "../services/cubiculosService";
import { useCubiculoStore } from "../store/useCubiculoStore";
import { useAuthStore } from "../store/useAuthStore";
import { Cubiculo } from "../types/cubiculo.types";

const PURPLE = "#5C35D9";
const PURPLE_LIGHT = "#EEE9FF";

const SERVICE_CHIPS = [
  { key: "games_enabled" as const, label: "Juegos", icon: "dice-multiple" },
  { key: "printing_enabled" as const, label: "Impresiones", icon: "printer" },
  { key: "products_enabled" as const, label: "Ventas", icon: "cart" },
];

export default function CubiculoSelectScreen() {
  const [loading, setLoading] = useState(true);
  const { cubiculos, setCubiculos, setCubiculo } = useCubiculoStore();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    cubiculosService
      .getAll()
      .then((data) => {
        setCubiculos(data);
        // Regular admins with a managed cubículo are auto-routed to it
        if (user?.role === "admin" && user.managed_cubiculo_id) {
          const managed = data.find((c) => c.id === user.managed_cubiculo_id);
          if (managed) {
            setCubiculo(managed);
            return;
          }
        }
      })
      .catch(() => Alert.alert("Error", "No se pudieron cargar los cubículos"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.heroRow}>
        <MaterialCommunityIcons
          name="office-building"
          size={32}
          color={PURPLE}
        />
        <Text style={styles.title}>Cubículos</Text>
      </View>
      <Text style={styles.subtitle}>
        Selecciona a qué cubículo vas a ingresar
      </Text>

      <FlatList
        data={cubiculos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: Cubiculo }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => setCubiculo(item)}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardIcon}>
                <MaterialCommunityIcons
                  name="office-building-outline"
                  size={22}
                  color={PURPLE}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.name}</Text>
                {item.location ? (
                  <Text style={styles.cardLocation}>{item.location}</Text>
                ) : null}
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={PURPLE}
              />
            </View>

            {/* Service chips */}
            <View style={styles.chipsRow}>
              {SERVICE_CHIPS.map((s) =>
                item[s.key] ? (
                  <View key={s.key} style={styles.chip}>
                    <MaterialCommunityIcons
                      name={s.icon}
                      size={13}
                      color={PURPLE}
                    />
                    <Text style={styles.chipText}>{s.label}</Text>
                  </View>
                ) : null,
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons
              name="office-building-off"
              size={48}
              color="#d1d5db"
            />
            <Text style={styles.empty}>
              No hay cubículos disponibles.{"\n"}Contacta al administrador.
            </Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <MaterialCommunityIcons name="logout" size={18} color="#EF4444" />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6FB", paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 6,
  },
  title: { fontSize: 26, fontWeight: "700", color: "#1A1A2E" },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 28,
  },
  list: { paddingHorizontal: 20, gap: 14 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PURPLE_LIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  cardName: { fontSize: 16, fontWeight: "700", color: "#1A1A2E" },
  cardLocation: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  chipsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PURPLE_LIGHT,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: { fontSize: 11, fontWeight: "600", color: PURPLE },
  emptyWrap: { alignItems: "center", marginTop: 48, gap: 12 },
  empty: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 22,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 20,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fff5f5",
  },
  logoutText: { color: "#EF4444", fontWeight: "600", fontSize: 15 },
});
