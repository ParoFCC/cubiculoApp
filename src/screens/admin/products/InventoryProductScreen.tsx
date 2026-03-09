import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl,
  ScrollView,
} from "react-native";
import Toast from "react-native-toast-message";
import { productsService } from "../../../services/productsService";
import { Product } from "../../../types/products.types";

export default function InventoryProductScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    price: "",
    stock: "",
    category: "otro",
  });

  const fetchProducts = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await productsService.getCatalog();
      setProducts(data);
    } catch {
      // keep existing list on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.price || !form.stock) {
      Toast.show({
        type: "error",
        text1: "Campos incompletos",
        text2: "Completa nombre, precio y stock.",
      });
      return;
    }
    const price = parseFloat(form.price);
    const stock = parseInt(form.stock, 10);
    if (isNaN(price) || price <= 0) {
      Toast.show({
        type: "error",
        text1: "Precio inválido",
        text2: "Ingresa un precio válido.",
      });
      return;
    }
    if (isNaN(stock) || stock < 0) {
      Toast.show({
        type: "error",
        text1: "Stock inválido",
        text2: "Ingresa un stock válido.",
      });
      return;
    }
    setSaving(true);
    try {
      await productsService.createProduct({
        name: form.name.trim(),
        price,
        stock,
        category: form.category,
        is_active: true,
      });
      setForm({ name: "", price: "", stock: "", category: "otro" });
      setShowModal(false);
      fetchProducts();
      Toast.show({
        type: "success",
        text1: "Producto creado",
        text2: `"${form.name.trim()}" agregado al inventario.`,
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err?.response?.data?.detail ?? "No se pudo crear el producto.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  const categoryEmoji = (cat: string) => {
    switch (cat) {
      case "bebida":
        return "🧃";
      case "comida":
        return "🍫";
      default:
        return "📦";
    }
  };

  return (
    <View style={styles.root}>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchProducts(true);
            }}
            colors={[PURPLE]}
          />
        }
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowModal(true)}
          >
            <Text style={styles.addBtnText}>+ Agregar Producto</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Sin productos registrados.</Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, !item.is_active && styles.inactiveCard]}>
            <Text style={styles.emoji}>{categoryEmoji(item.category)}</Text>
            <View style={styles.info}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.category}>{item.category}</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.price}>${item.price.toFixed(2)}</Text>
              <View
                style={[styles.stockBadge, item.stock < 5 && styles.lowStock]}
              >
                <Text style={styles.stockText}>Stock: {item.stock}</Text>
              </View>
              {!item.is_active && <Text style={styles.inactive}>Inactivo</Text>}
            </View>
          </View>
        )}
      />

      {/* Create Product Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Nuevo Producto</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Nombre del producto"
              placeholderTextColor="#aaa"
            />
            <TextInput
              style={styles.input}
              value={form.price}
              onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
              placeholder="Precio ($)"
              keyboardType="decimal-pad"
              placeholderTextColor="#aaa"
            />
            <TextInput
              style={styles.input}
              value={form.stock}
              onChangeText={(v) => setForm((f) => ({ ...f, stock: v }))}
              placeholder="Stock inicial"
              keyboardType="number-pad"
              placeholderTextColor="#aaa"
            />
            <Text style={styles.catLabel}>Categoría:</Text>
            <View style={styles.catRow}>
              {["bebida", "comida", "otro"].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    form.category === cat && styles.catChipActive,
                  ]}
                  onPress={() => setForm((f) => ({ ...f, category: cat }))}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      form.category === cat && styles.catChipTextActive,
                    ]}
                  >
                    {categoryEmoji(cat)} {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.disabled]}
                onPress={handleCreate}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveText}>Crear</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const PURPLE = "#5C35D9";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F7FF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 14 },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
  },
  inactiveCard: { opacity: 0.55 },
  emoji: { fontSize: 30, marginRight: 12 },
  info: { flex: 1 },
  productName: { fontSize: 15, fontWeight: "700", color: "#222" },
  category: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
    textTransform: "capitalize",
  },
  right: { alignItems: "flex-end" },
  price: { fontSize: 16, fontWeight: "800", color: PURPLE },
  stockBadge: {
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  lowStock: { backgroundColor: "#FFEBEE" },
  stockText: { fontSize: 12, fontWeight: "600", color: "#444" },
  inactive: { fontSize: 11, color: "#999", marginTop: 4 },
  addBtn: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    margin: 4,
    marginTop: 8,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a2e",
    marginBottom: 16,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#222",
    marginBottom: 12,
    backgroundColor: "#FAFAFA",
  },
  catLabel: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 8 },
  catRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  catChip: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  catChipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  catChipText: { fontSize: 13, color: "#555" },
  catChipTextActive: { color: "#fff", fontWeight: "700" },
  modalActions: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F0F0F0",
  },
  cancelText: { color: "#555", fontWeight: "600" },
  saveBtn: {
    flex: 2,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: PURPLE,
  },
  disabled: { opacity: 0.6 },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
