import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { gamesService } from "../../../services/gamesService";
import { Game } from "../../../types/games.types";
import QRScannerModal from "../../../components/QRScannerModal";

const PURPLE = "#5C35D9";

// Rotating color palette for icon boxes
const PALETTES: Array<[string, string]> = [
  ["#EEE9FF", PURPLE],
  ["#FFF3E0", "#F59E0B"],
  ["#E8F5E9", "#22C55E"],
  ["#FCE4EC", "#E91E63"],
  ["#E3F2FD", "#1565C0"],
];

type AvailFilter = "all" | "available" | "unavailable";

export default function GameCatalogScreen() {
  const navigation = useNavigation<any>();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [availFilter, setAvailFilter] = useState<AvailFilter>("all");

  const handleQRScan = (value: string) => {
    setShowScanner(false);
    const id = value.trim();
    const game = games.find((g) => g.id === id);
    if (!game) {
      Toast.show({
        type: "error",
        text1: "Juego no encontrado",
        text2: "El código QR no corresponde a ningún juego.",
      });
      return;
    }
    navigation.navigate("GameDetail", { game });
  };

  const abortRef = useRef<AbortController | null>(null);

  const fetchGames = useCallback(async (quiet = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (!quiet) setLoading(true);
    try {
      const data = await gamesService.getCatalog();
      if (!controller.signal.aborted) {
        setGames(data);
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
    fetchGames();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchGames]);

  const filtered = games.filter((g) => {
    const matchSearch =
      !search || g.name.toLowerCase().includes(search.toLowerCase());
    const matchAvail =
      availFilter === "all" ||
      (availFilter === "available"
        ? g.quantity_avail > 0
        : g.quantity_avail === 0);
    return matchSearch && matchAvail;
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <MaterialCommunityIcons name="magnify" size={19} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar juego..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity
            onPress={() => setSearch("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={17}
              color="#9ca3af"
            />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.qrScanBtn}
          onPress={() => setShowScanner(true)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={20} color={PURPLE} />
        </TouchableOpacity>
      </View>

      <QRScannerModal
        visible={showScanner}
        onScan={handleQRScan}
        onClose={() => setShowScanner(false)}
      />

      {/* Availability filter chips */}
      <View style={styles.chipRow}>
        {(
          [
            { key: "all" as AvailFilter, label: "Todos" },
            { key: "available" as AvailFilter, label: "Disponibles" },
            { key: "unavailable" as AvailFilter, label: "Sin stock" },
          ] as const
        ).map((chip) => (
          <TouchableOpacity
            key={chip.key}
            style={[styles.chip, availFilter === chip.key && styles.chipActive]}
            onPress={() => setAvailFilter(chip.key)}
          >
            <Text
              style={[
                styles.chipText,
                availFilter === chip.key && styles.chipTextActive,
              ]}
            >
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchGames(true);
            }}
            colors={[PURPLE]}
          />
        }
        ListHeaderComponent={
          <Text style={styles.count}>
            {filtered.length} juego{filtered.length !== 1 ? "s" : ""}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons
              name="dice-multiple-outline"
              size={52}
              color="#d1d5db"
            />
            <Text style={styles.empty}>
              {search
                ? "Sin resultados para tu búsqueda"
                : "No hay juegos disponibles"}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const [bg, accent] = PALETTES[index % PALETTES.length];
          const avail = item.quantity_avail;
          const total = item.quantity_total ?? avail;
          const statusColor =
            avail === 0
              ? "#EF4444"
              : avail < total * 0.4
              ? "#F59E0B"
              : "#22C55E";
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("GameDetail", { game: item })}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: bg }]}>
                <MaterialCommunityIcons
                  name="dice-multiple"
                  size={26}
                  color={accent}
                />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.gameName}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.gameDesc} numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <View style={styles.stockCol}>
                <View
                  style={[styles.stockDot, { backgroundColor: statusColor }]}
                />
                <Text style={[styles.stockNum, { color: statusColor }]}>
                  {avail}
                </Text>
                <Text style={styles.stockLabel}>disp.</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F7FF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1a1a2e", padding: 0 },
  qrScanBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#EEE9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F0EFF5",
  },
  chipActive: { backgroundColor: PURPLE },
  chipText: { fontSize: 13, fontWeight: "600", color: "#555" },
  chipTextActive: { color: "#fff" },
  count: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 2,
  },
  list: { padding: 16, paddingTop: 8, gap: 10 },
  emptyWrap: { alignItems: "center", marginTop: 48, gap: 12 },
  empty: { textAlign: "center", color: "#9ca3af", fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  cardBody: { flex: 1 },
  gameName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 3,
  },
  gameDesc: { fontSize: 12, color: "#6b7280" },
  stockCol: { alignItems: "center", gap: 1 },
  stockDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  stockNum: { fontSize: 15, fontWeight: "800" },
  stockLabel: { fontSize: 10, color: "#9ca3af", fontWeight: "600" },
});
