import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Image,
  Modal,
  ScrollView,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { productsService } from "../../../services/productsService";
import { usersService } from "../../../services/usersService";
import { attendanceService } from "../../../services/attendanceService";
import { Product, CashRegister } from "../../../types/products.types";
import { User } from "../../../types/auth.types";
import { extractApiErrorMessage } from "../../../utils/apiError";

type CartItem = { product: Product; quantity: number };

type Props = { navigation: any };

export default function RegisterSaleScreen({ navigation }: Props) {
  const routeParams = useRoute<any>().params as
    | { preselectedStudentId?: string; preselectedProductId?: string }
    | undefined;
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [studentInfo, setStudentInfo] = useState<User | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [hasLookupResult, setHasLookupResult] = useState(false);
  const [cashStatus, setCashStatus] = useState<CashRegister | null | "loading">(
    "loading",
  );
  const [presetApplied, setPresetApplied] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [adminIsOut, setAdminIsOut] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchProducts = useCallback(async (quiet = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (!quiet) setLoading(true);
    try {
      const data = await productsService.getCatalog();
      if (!controller.signal.aborted) {
        setProducts(data.filter((p) => p.is_active && p.stock > 0));
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const fetchCash = useCallback(async () => {
    const [cashResult, attendanceResult] = await Promise.allSettled([
      productsService.getCashRegisterStatus(),
      attendanceService.getStatus(),
    ]);
    setCashStatus(cashResult.status === "fulfilled" ? cashResult.value : null);
    if (attendanceResult.status === "fulfilled") {
      setAdminIsOut(attendanceResult.value.status === "out");
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCash();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchProducts, fetchCash]);

  useEffect(() => {
    if (routeParams?.preselectedStudentId) {
      setStudentId(routeParams.preselectedStudentId);
      lookupStudent(routeParams.preselectedStudentId);
    }
  }, [routeParams?.preselectedStudentId]);

  useEffect(() => {
    if (
      !routeParams?.preselectedProductId ||
      presetApplied ||
      products.length === 0
    ) {
      return;
    }
    const product = products.find(
      (item) => item.id === routeParams.preselectedProductId,
    );
    if (product) {
      addToCart(product);
      setPresetApplied(true);
    }
  }, [routeParams?.preselectedProductId, presetApplied, products]);

  const cartTotal = cart.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0,
  );
  const CARD_COMMISSION_RATE = 0.04176;
  const cardCommission =
    paymentMethod === "card" ? cartTotal * CARD_COMMISSION_RATE : 0;
  const grandTotal = cartTotal + cardCommission;

  const lookupStudent = async (id: string) => {
    const normalizedId = id.trim().toLowerCase();
    if (!normalizedId) {
      setStudentInfo(null);
      setHasLookupResult(false);
      return;
    }
    setLookingUp(true);
    setHasLookupResult(false);
    try {
      const user = await usersService.lookupByStudentId(normalizedId);
      setStudentInfo(user);
    } catch {
      setStudentInfo(null);
    } finally {
      setLookingUp(false);
      setHasLookupResult(true);
    }
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === productId);
      if (!existing || existing.quantity <= 1) {
        return prev.filter((c) => c.product.id !== productId);
      }
      return prev.map((c) =>
        c.product.id === productId ? { ...c, quantity: c.quantity - 1 } : c,
      );
    });
  };

  const handleRegister = async () => {
    if (cart.length === 0) {
      Toast.show({
        type: "error",
        text1: "Carrito vacío",
        text2: "Agrega productos a la venta.",
      });
      return;
    }
    setRegistering(true);
    try {
      const saleItems = cart.map((c) => ({
        name: c.product.name,
        quantity: c.quantity,
        price: c.product.price,
      }));
      const saleTotal = cartTotal;
      const saleCommission = cardCommission;
      const salePaymentMethod = paymentMethod;
      const saleStudentId = studentId.trim() || undefined;
      const saleStudentName = studentInfo?.name;
      await productsService.registerSale({
        student_id: saleStudentId,
        payment_method: paymentMethod,
        items: cart.map((c) => ({
          product_id: c.product.id,
          quantity: c.quantity,
        })),
      });
      setCart([]);
      setStudentId("");
      setStudentInfo(null);
      setPaymentMethod("cash");
      fetchProducts();
      navigation.navigate("Receipt", {
        type: "sale",
        studentId: saleStudentId,
        studentName: saleStudentName,
        items: saleItems,
        total: saleTotal,
        paymentMethod: salePaymentMethod,
        cardCommission: saleCommission,
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: extractApiErrorMessage(err, "No se pudo registrar la venta."),
      });
    } finally {
      setRegistering(false);
    }
  };

  if (loading || cashStatus === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  // Cash register closed — block sales
  if (!cashStatus || cashStatus.status !== "open") {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="cash-remove" size={64} color="#d1d5db" />
        <Text style={styles.blockedTitle}>Caja cerrada</Text>
        <Text style={styles.blockedSub}>
          Debes abrir la caja antes de registrar ventas.
        </Text>
        <TouchableOpacity
          style={styles.openCashBtn}
          onPress={() => navigation.navigate("CashRegister")}
        >
          <MaterialCommunityIcons
            name="cash-register"
            size={18}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.openCashBtnText}>Ir a Caja</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchCash}>
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        numColumns={2}
        columnWrapperStyle={styles.row}
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
        ListHeaderComponent={
          <>
            <View
              style={[
                styles.cashStatusCard,
                cashStatus?.status === "open"
                  ? styles.cashStatusOpen
                  : styles.cashStatusClosed,
              ]}
            >
              <View style={styles.cashStatusLeft}>
                <MaterialCommunityIcons
                  name={
                    cashStatus?.status === "open" ? "cash-check" : "cash-remove"
                  }
                  size={18}
                  color={cashStatus?.status === "open" ? "#15803d" : "#b45309"}
                />
                <View>
                  <Text style={styles.cashStatusTitle}>
                    {cashStatus?.status === "open"
                      ? "Caja abierta"
                      : "Caja cerrada"}
                  </Text>
                  <Text style={styles.cashStatusSub}>
                    {cashStatus?.status === "open"
                      ? `Apertura: $${(cashStatus.opening_balance ?? 0).toFixed(
                          2,
                        )}`
                      : "Abre la caja para habilitar ventas."}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate("CashRegister")}
              >
                <Text style={styles.cashStatusLink}>Ver caja</Text>
              </TouchableOpacity>
            </View>

            {/* Student */}
            <View style={styles.studentSection}>
              <TextInput
                style={styles.studentInput}
                value={studentId}
                onChangeText={(v) => {
                  setStudentId(v);
                  setStudentInfo(null);
                  setHasLookupResult(false);
                }}
                onBlur={() => lookupStudent(studentId)}
                placeholder="ID del estudiante (opcional)"
                placeholderTextColor="#aaa"
                autoCapitalize="none"
              />
              {lookingUp && (
                <View style={styles.studentChip}>
                  <ActivityIndicator size="small" color={PURPLE} />
                  <Text style={styles.studentChipText}>Buscando...</Text>
                </View>
              )}
              {!lookingUp && studentInfo && (
                <View style={[styles.studentChip, styles.studentChipFound]}>
                  <MaterialCommunityIcons
                    name="account-check"
                    size={16}
                    color="#22C55E"
                  />
                  <Text style={styles.studentChipText}>{studentInfo.name}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setStudentId("");
                      setStudentInfo(null);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={16}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              )}
              {!lookingUp &&
                hasLookupResult &&
                !studentInfo &&
                !!studentId.trim() && (
                  <View style={[styles.studentChip, styles.studentChipGuest]}>
                    <MaterialCommunityIcons
                      name="account-question"
                      size={16}
                      color="#D97706"
                    />
                    <Text style={styles.studentChipText}>
                      Alumno no registrado
                    </Text>
                  </View>
                )}
              {!lookingUp &&
                hasLookupResult &&
                !studentInfo &&
                !!studentId.trim() && (
                  <Text style={styles.studentHint}>
                    La venta se registrará con esa matrícula aunque no exista
                    cuenta.
                  </Text>
                )}
            </View>

            {/* Cart summary */}
            {cart.length > 0 ? (
              <View style={styles.cartSummary}>
                <Text style={styles.cartTitle}>
                  🛒 {cart.reduce((s, c) => s + c.quantity, 0)} productos — $
                  {cartTotal.toFixed(2)}
                </Text>
                {cart.map((c) => (
                  <View key={c.product.id} style={styles.cartRow}>
                    <Text style={styles.cartItem}>
                      {c.product.name} × {c.quantity}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeFromCart(c.product.id)}
                    >
                      <Text style={styles.cartRemove}>−</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {/* Payment method toggle */}
                <View style={styles.paymentToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.paymentBtn,
                      paymentMethod === "cash" && styles.paymentBtnActive,
                    ]}
                    onPress={() => setPaymentMethod("cash")}
                  >
                    <MaterialCommunityIcons
                      name="cash"
                      size={16}
                      color={paymentMethod === "cash" ? "#fff" : "#6b7280"}
                    />
                    <Text
                      style={[
                        styles.paymentBtnText,
                        paymentMethod === "cash" && styles.paymentBtnTextActive,
                      ]}
                    >
                      Efectivo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.paymentBtn,
                      paymentMethod === "card" && styles.paymentBtnActiveCard,
                    ]}
                    onPress={() => setPaymentMethod("card")}
                  >
                    <MaterialCommunityIcons
                      name="credit-card-outline"
                      size={16}
                      color={paymentMethod === "card" ? "#fff" : "#6b7280"}
                    />
                    <Text
                      style={[
                        styles.paymentBtnText,
                        paymentMethod === "card" && styles.paymentBtnTextActive,
                      ]}
                    >
                      Tarjeta
                    </Text>
                  </TouchableOpacity>
                </View>
                {paymentMethod === "card" && (
                  <View style={styles.commissionRow}>
                    <MaterialCommunityIcons
                      name="percent"
                      size={13}
                      color="#b45309"
                    />
                    <Text style={styles.commissionText}>
                      Comisión 4.176%: +${cardCommission.toFixed(2)}
                    </Text>
                    <Text style={styles.grandTotalText}>
                      Cobrar: ${grandTotal.toFixed(2)}
                    </Text>
                  </View>
                )}
                {adminIsOut && (
                  <View style={styles.outWarning}>
                    <MaterialCommunityIcons
                      name="account-clock-outline"
                      size={18}
                      color="#92400e"
                    />
                    <Text style={styles.outWarningText}>
                      No estás registrado como presente. Registra tu entrada
                      antes de operar.
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    (registering || adminIsOut) && styles.disabled,
                  ]}
                  onPress={() => setConfirmVisible(true)}
                  disabled={registering || adminIsOut}
                >
                  {registering ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmBtnText}>
                      {paymentMethod === "card"
                        ? `Confirmar Venta (tarjeta) — $${grandTotal.toFixed(
                            2,
                          )}`
                        : `Confirmar Venta — $${cartTotal.toFixed(2)}`}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons
              name="storefront-outline"
              size={52}
              color="#d1d5db"
            />
            <Text style={styles.empty}>Sin productos disponibles</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productCard}
            onPress={() => addToCart(item)}
            activeOpacity={0.8}
          >
            {item.image_url ? (
              <Image
                source={{ uri: item.image_url }}
                style={styles.productThumb}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.productEmoji}>
                {item.category === "bebida"
                  ? "🧃"
                  : item.category === "comida"
                  ? "🍫"
                  : "📦"}
              </Text>
            )}
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
            <Text style={styles.productStock}>Stock: {item.stock}</Text>
            {cart.find((c) => c.product.id === item.id) && (
              <View style={styles.inCartBadge}>
                <Text style={styles.inCartBadgeText}>
                  {cart.find((c) => c.product.id === item.id)?.quantity}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={confirmVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Confirmar venta</Text>
            <ScrollView
              style={{ maxHeight: 220 }}
              showsVerticalScrollIndicator={false}
            >
              {cart.map((c) => (
                <View key={c.product.id} style={styles.modalRow}>
                  <Text style={styles.modalItem}>
                    {c.product.name} × {c.quantity}
                  </Text>
                  <Text style={styles.modalItemPrice}>
                    ${(c.product.price * c.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalDivider} />
            <View style={styles.modalRow}>
              <Text style={styles.modalTotal}>Subtotal</Text>
              <Text style={styles.modalTotalPrice}>
                ${cartTotal.toFixed(2)}
              </Text>
            </View>
            {paymentMethod === "card" && (
              <View style={styles.modalRow}>
                <Text
                  style={[
                    styles.modalTotal,
                    { fontSize: 13, color: "#b45309" },
                  ]}
                >
                  Comisión tarjeta (4.176%)
                </Text>
                <Text
                  style={[
                    styles.modalTotalPrice,
                    { fontSize: 14, color: "#b45309" },
                  ]}
                >
                  +${cardCommission.toFixed(2)}
                </Text>
              </View>
            )}
            {paymentMethod === "card" && (
              <View style={[styles.modalRow, { marginTop: 2 }]}>
                <Text style={styles.modalTotal}>Total a cobrar</Text>
                <Text style={[styles.modalTotalPrice, { color: "#0369a1" }]}>
                  ${grandTotal.toFixed(2)}
                </Text>
              </View>
            )}
            <View style={styles.modalPaymentBadge}>
              <MaterialCommunityIcons
                name={paymentMethod === "card" ? "credit-card-outline" : "cash"}
                size={15}
                color={paymentMethod === "card" ? "#0369a1" : "#15803d"}
              />
              <Text
                style={[
                  styles.modalPaymentText,
                  { color: paymentMethod === "card" ? "#0369a1" : "#15803d" },
                ]}
              >
                {paymentMethod === "card"
                  ? "Pago con tarjeta"
                  : "Pago en efectivo"}
              </Text>
            </View>
            {studentInfo && (
              <Text style={styles.modalStudent}>🎓 {studentInfo.name}</Text>
            )}
            <TouchableOpacity
              style={[
                styles.modalConfirmBtn,
                (registering || adminIsOut) && styles.disabled,
              ]}
              onPress={() => {
                setConfirmVisible(false);
                handleRegister();
              }}
              disabled={registering || adminIsOut}
            >
              {registering ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText}>Registrar venta</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setConfirmVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const PURPLE = "#5C35D9";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F7FF" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  blockedTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#444",
    marginTop: 16,
    marginBottom: 8,
  },
  blockedSub: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 20,
  },
  openCashBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 28,
    marginTop: 24,
  },
  openCashBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  retryBtn: { marginTop: 12 },
  retryBtnText: { color: PURPLE, fontWeight: "600", fontSize: 14 },
  list: { padding: 12 },
  row: { justifyContent: "space-between", marginBottom: 10 },
  emptyWrap: { alignItems: "center", marginTop: 48, gap: 12 },
  empty: { textAlign: "center", color: "#9ca3af", fontSize: 14 },
  cashStatusCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cashStatusOpen: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  cashStatusClosed: {
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  cashStatusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  cashStatusTitle: { fontSize: 14, fontWeight: "700", color: "#1f2937" },
  cashStatusSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  cashStatusLink: { color: PURPLE, fontSize: 12, fontWeight: "700" },
  // Student section
  studentSection: { marginBottom: 10 },
  inputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  inputFlex: { flex: 1 },
  studentInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#222",
    backgroundColor: "#fff",
  },
  qrBtn: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    padding: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  studentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  studentChipFound: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  studentChipGuest: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  studentChipText: { fontSize: 13, color: "#374151" },
  studentHint: { fontSize: 12, color: "#D97706", marginTop: 6, marginLeft: 2 },
  // Cart
  cartSummary: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },
  cartTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 8,
  },
  cartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  cartItem: { fontSize: 14, color: "#444" },
  cartRemove: { fontSize: 20, color: "#E53935", paddingHorizontal: 8 },
  // Payment method toggle
  paymentToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  paymentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  paymentBtnActive: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  paymentBtnActiveCard: {
    backgroundColor: "#0369a1",
    borderColor: "#0369a1",
  },
  paymentBtnText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  paymentBtnTextActive: { color: "#fff" },
  commissionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff7ed",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  commissionText: {
    fontSize: 12,
    color: "#b45309",
    fontWeight: "600",
    flex: 1,
  },
  grandTotalText: { fontSize: 13, color: "#0369a1", fontWeight: "800" },
  outWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff7ed",
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  outWarningText: {
    flex: 1,
    fontSize: 13,
    color: "#92400e",
    fontWeight: "600",
    lineHeight: 18,
  },
  // Modal payment badge
  modalPaymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
    alignSelf: "flex-start",
  },
  modalPaymentText: { fontSize: 13, fontWeight: "700" },
  confirmBtn: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  disabled: { opacity: 0.6 },
  confirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    width: "48%",
    alignItems: "center",
    elevation: 1,
  },
  productThumb: { width: 56, height: 56, borderRadius: 12, marginBottom: 8 },
  productEmoji: { fontSize: 32, marginBottom: 6 },
  productName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: PURPLE,
    marginTop: 4,
  },
  productStock: { fontSize: 11, color: "#999", marginTop: 2 },
  inCartBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: PURPLE,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  inCartBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  // Confirm modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1a1a2e",
    marginBottom: 14,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  modalItem: { fontSize: 14, color: "#374151", flex: 1 },
  modalItemPrice: { fontSize: 14, fontWeight: "700", color: "#374151" },
  modalDivider: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 10 },
  modalTotal: { fontSize: 15, fontWeight: "800", color: "#1a1a2e" },
  modalTotalPrice: { fontSize: 18, fontWeight: "800", color: PURPLE },
  modalStudent: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 8,
    marginBottom: 4,
  },
  modalConfirmBtn: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 10,
  },
  modalCancelBtn: {
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalCancelText: { color: "#555", fontWeight: "700", fontSize: 14 },
});
