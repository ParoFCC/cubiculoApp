import React, { useState, useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
  Alert,
  Image,
} from "react-native";
import Toast from "react-native-toast-message";
import {
  launchCamera,
  launchImageLibrary,
  type ImagePickerResponse,
} from "react-native-image-picker";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { productsService } from "../../../services/productsService";
import { uploadService } from "../../../services/uploadService";
import { Product } from "../../../types/products.types";
import { extractApiErrorMessage } from "../../../utils/apiError";

type Props = { navigation: any };

export default function InventoryProductScreen({ navigation }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    price: "",
    stock: "",
    category: "otro",
    image_url: "",
  });

  const abortRef = useRef<AbortController | null>(null);

  const fetchProducts = useCallback(async (quiet = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (!quiet) setLoading(true);
    try {
      const data = await productsService.getCatalog();
      if (!controller.signal.aborted) {
        setProducts(data);
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

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
      return () => {
        abortRef.current?.abort();
      };
    }, [fetchProducts]),
  );

  const handleDelete = (item: Product) => {
    Alert.alert(
      "Eliminar producto",
      `¿Eliminar “${item.name}”? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await productsService.deleteProduct(item.id);
              Toast.show({
                type: "success",
                text1: "Producto eliminado",
                text2: item.name,
              });
              fetchProducts(true);
            } catch (err: any) {
              Toast.show({
                type: "error",
                text1: "Error",
                text2: extractApiErrorMessage(err, "No se pudo eliminar."),
              });
            }
          },
        },
      ],
    );
  };

  const handlePickImage = async () => {
    Alert.alert("Imagen del producto", "\u00bfCómo deseas agregar la imagen?", [
      { text: "Cámara", onPress: () => pickImage("camera") },
      { text: "Galería", onPress: () => pickImage("library") },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const pickImage = async (source: "camera" | "library") => {
    const options = { mediaType: "photo" as const, quality: 0.8 as const };
    let response: ImagePickerResponse;
    if (source === "camera") {
      response = await launchCamera(options);
    } else {
      response = await launchImageLibrary(options);
    }
    if (response.didCancel || response.errorCode) return;
    const asset = response.assets?.[0];
    if (!asset?.uri) return;
    setUploading(true);
    try {
      const url = await uploadService.uploadFile(
        asset.uri,
        asset.fileName ?? "product.jpg",
        asset.type ?? "image/jpeg",
      );
      setForm((f) => ({ ...f, image_url: url }));
      Toast.show({ type: "success", text1: "Imagen subida" });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Error al subir imagen",
        text2: extractApiErrorMessage(err, "No se pudo subir la imagen."),
      });
    } finally {
      setUploading(false);
    }
  };

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
        image_url: form.image_url || undefined,
        is_active: true,
      });
      setForm({
        name: "",
        price: "",
        stock: "",
        category: "otro",
        image_url: "",
      });
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
        text2: extractApiErrorMessage(err, "No se pudo crear el producto."),
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
      case "papeleria":
        return "📎";
      case "snack":
        return "🍿";
      default:
        return "📦";
    }
  };

  return (
    <View style={styles.root}>
      {/* Quick actions 2×2 grid */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.qaCard, styles.qaCardPrimary]}
          onPress={() => setShowModal(true)}
        >
          <MaterialCommunityIcons
            name="plus-circle-outline"
            size={24}
            color="#fff"
          />
          <Text style={styles.qaCardTextPrimary}>Agregar{"\n"}Producto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.qaCard}
          onPress={() => navigation.navigate("RegisterSale")}
        >
          <MaterialCommunityIcons name="cart-plus" size={24} color={PURPLE} />
          <Text style={styles.qaCardText}>Registrar{"\n"}Venta</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.qaCard}
          onPress={() => navigation.navigate("CashRegister")}
        >
          <MaterialCommunityIcons
            name="cash-register"
            size={24}
            color={PURPLE}
          />
          <Text style={styles.qaCardText}>Abrir{"\n"}Caja</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.qaCard}
          onPress={() => navigation.navigate("SalesReport")}
        >
          <MaterialCommunityIcons name="chart-bar" size={24} color={PURPLE} />
          <Text style={styles.qaCardText}>Ver{"\n"}Reportes</Text>
        </TouchableOpacity>
      </View>

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
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={56}
              color="#d1d5db"
            />
            <Text style={styles.empty}>Sin productos registrados</Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.emptyAddBtnText}>
                + Agregar primer producto
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, !item.is_active && styles.inactiveCard]}>
            {item.image_url ? (
              <Image
                source={{ uri: item.image_url }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.emoji}>{categoryEmoji(item.category)}</Text>
            )}
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
            <TouchableOpacity
              style={styles.trashBtn}
              onPress={() => handleDelete(item)}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={18}
                color="#E53935"
              />
            </TouchableOpacity>
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
              {["bebida", "comida", "papeleria", "snack", "otro"].map((cat) => (
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
            {/* Image */}
            <TouchableOpacity
              style={styles.imagePickerBtn}
              onPress={handlePickImage}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={PURPLE} />
              ) : form.image_url ? (
                <Image
                  source={{ uri: form.image_url }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.imagePickerText}>
                  📷 Agregar imagen (opcional)
                </Text>
              )}
            </TouchableOpacity>
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
  emptyWrap: { alignItems: "center", marginTop: 48, gap: 12 },
  empty: { textAlign: "center", color: "#9ca3af", fontSize: 14 },
  emptyAddBtn: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
    marginTop: 4,
  },
  emptyAddBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F8F7FF",
  },
  qaCard: {
    width: "47.5%",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8,
    elevation: 2,
    shadowColor: "#5C35D9",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "#F0EEFF",
  },
  qaCardPrimary: { backgroundColor: PURPLE, borderColor: PURPLE },
  qaCardText: {
    fontSize: 13,
    fontWeight: "700",
    color: PURPLE,
    textAlign: "center",
    lineHeight: 17,
  },
  qaCardTextPrimary: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    lineHeight: 17,
  },
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
  productImage: { width: 46, height: 46, borderRadius: 10, marginRight: 12 },
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
  trashBtn: {
    marginLeft: 10,
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
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
  imagePickerBtn: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderStyle: "dashed",
    borderRadius: 10,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  imagePickerText: { fontSize: 14, color: "#999" },
  imagePreview: { width: "100%", height: "100%" },
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
