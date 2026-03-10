import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { productsService } from "../../../services/productsService";
import { Product } from "../../../types/products.types";

const PURPLE = "#5C35D9";

type CatDef = { icon: string; bg: string; color: string };
const CATEGORY_MAP: Record<string, CatDef> = {
  bebida: {
    icon: "bottle-soda-classic-outline",
    bg: "#E3F2FD",
    color: "#1565C0",
  },
  comida: { icon: "food-apple-outline", bg: "#FFF3E0", color: "#E65100" },
  papeleria: { icon: "pencil-box-outline", bg: "#F3E5F5", color: "#6A1B9A" },
  snack: { icon: "cookie-outline", bg: "#FFF9C4", color: "#F57F17" },
  default: { icon: "package-variant", bg: "#EEE9FF", color: PURPLE },
};

type CategoryFilter = string | "all";

const CATEGORY_CHIPS: { key: CategoryFilter; label: string; icon: string }[] = [
  { key: "all", label: "Todos", icon: "view-grid-outline" },
  { key: "bebida", label: "Bebidas", icon: "bottle-soda-classic-outline" },
  { key: "comida", label: "Comida", icon: "food-apple-outline" },
  { key: "snack", label: "Snacks", icon: "cookie-outline" },
  { key: "papeleria", label: "Papelería", icon: "pencil-box-outline" },
];

function getCat(category: string | null | undefined): CatDef {
  if (!category) return CATEGORY_MAP.default;
  return CATEGORY_MAP[category.toLowerCase()] ?? CATEGORY_MAP.default;
}

export default function ProductCatalogScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const loadProducts = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await productsService.getCatalog();
      setProducts(data.filter((p) => p.is_active));
    } catch {
      // keep existing list on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filtered = products.filter((p) => {
    const matchSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat =
      categoryFilter === "all" ||
      (p.category ?? "").toLowerCase() === categoryFilter;
    return matchSearch && matchCat;
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
      {/* Search */}
      <View style={styles.searchRow}>
        <MaterialCommunityIcons name="magnify" size={19} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar producto..."
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
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
      >
        {CATEGORY_CHIPS.map((chip) => {
          const active = categoryFilter === chip.key;
          const catDef =
            chip.key === "all"
              ? { color: PURPLE, bg: "#EEE9FF" }
              : CATEGORY_MAP[chip.key] ?? CATEGORY_MAP.default;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[
                styles.chip,
                active && {
                  backgroundColor: chip.key === "all" ? PURPLE : catDef.color,
                },
              ]}
              onPress={() => setCategoryFilter(chip.key)}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons
                name={chip.icon}
                size={14}
                color={active ? "#fff" : "#555"}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadProducts(true);
            }}
            colors={[PURPLE]}
          />
        }
        ListHeaderComponent={
          <Text style={styles.count}>
            {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons
              name="storefront-outline"
              size={52}
              color="#d1d5db"
            />
            <Text style={styles.empty}>
              {search ? "Sin resultados" : "No hay productos disponibles"}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const cat = getCat(item.category);
          const outOfStock = item.stock === 0;
          return (
            <View style={[styles.card, outOfStock && styles.outOfStock]}>
              <View style={[styles.iconBox, { backgroundColor: cat.bg }]}>
                <MaterialCommunityIcons
                  name={cat.icon}
                  size={26}
                  color={outOfStock ? "#9ca3af" : cat.color}
                />
              </View>
              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>
              {item.category ? (
                <Text style={styles.cat}>{item.category}</Text>
              ) : null}
              <View style={styles.bottomRow}>
                <Text style={[styles.price, outOfStock && styles.priceGrey]}>
                  ${item.price.toFixed(2)}
                </Text>
                {outOfStock ? (
                  <View style={styles.soldBadge}>
                    <Text style={styles.soldText}>Agotado</Text>
                  </View>
                ) : (
                  <View style={styles.stockBadge}>
                    <Text style={styles.stockText}>{item.stock}</Text>
                  </View>
                )}
              </View>
            </View>
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
  chipsScroll: { maxHeight: 48 },
  chipsRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0EFF5",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 13, fontWeight: "600", color: "#555" },
  chipTextActive: { color: "#fff" },
  count: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 2,
  },
  list: { padding: 16, paddingTop: 8 },
  row: { justifyContent: "space-between", marginBottom: 12, gap: 12 },
  emptyWrap: { alignItems: "center", marginTop: 48, gap: 12 },
  empty: { textAlign: "center", color: "#9ca3af", fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    flex: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  outOfStock: { opacity: 0.55 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 3,
    lineHeight: 18,
  },
  cat: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 6,
    textTransform: "capitalize",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  price: { fontSize: 15, fontWeight: "800", color: PURPLE },
  priceGrey: { color: "#9ca3af" },
  soldBadge: {
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  soldText: { fontSize: 10, fontWeight: "700", color: "#EF4444" },
  stockBadge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  stockText: { fontSize: 10, fontWeight: "700", color: "#16A34A" },
});
