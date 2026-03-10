import * as React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export type ReceiptParams =
  | {
      type: "loan";
      studentId: string;
      studentName?: string;
      gameName: string;
      piecesComplete: boolean;
      dueAt?: string;
    }
  | {
      type: "print";
      studentId: string;
      studentName?: string;
      pages: number;
      cost: number;
      printType: "free" | "paid";
    }
  | {
      type: "sale";
      studentId?: string;
      studentName?: string;
      items: Array<{ name: string; quantity: number; price: number }>;
      total: number;
      paymentMethod?: "cash" | "card";
      cardCommission?: number;
    };

const PURPLE = "#5C35D9";

const CONFIGS = {
  loan: {
    icon: "hand-coin-outline",
    iconBg: "#ede9fe",
    iconColor: PURPLE,
    title: "Préstamo registrado",
    accentColor: PURPLE,
  },
  print: {
    icon: "printer-check",
    iconBg: "#e0f2fe",
    iconColor: "#0284c7",
    title: "Impresión registrada",
    accentColor: "#0284c7",
  },
  sale: {
    icon: "cart-check",
    iconBg: "#d1fae5",
    iconColor: "#059669",
    title: "Venta registrada",
    accentColor: "#059669",
  },
};

function makeShareText(params: ReceiptParams, dateStr: string): string {
  const who = params.studentName
    ? `${params.studentName} (${params.studentId})`
    : params.studentId ?? "Sin matrícula";

  if (params.type === "loan") {
    const due = params.dueAt
      ? format(new Date(params.dueAt), "d MMM yyyy HH:mm", { locale: es })
      : "Sin fecha límite";
    const pieces = params.piecesComplete ? "Completo" : "Incompleto";
    return `📋 Recibo de Préstamo\n\nJuego: ${params.gameName}\nEstudiante: ${who}\nPiezas: ${pieces}\nDevolución máxima: ${due}\nFecha: ${dateStr}`;
  }
  if (params.type === "print") {
    const costStr =
      params.printType === "free" ? "Sin costo" : `$${params.cost.toFixed(2)}`;
    return `📋 Recibo de Impresión\n\nEstudiante: ${who}\nPáginas: ${
      params.pages
    }\nTipo: ${
      params.printType === "free" ? "Gratuita" : "Pagada"
    }\nCosto: ${costStr}\nFecha: ${dateStr}`;
  }
  const lines = params.items
    .map(
      (i) =>
        `  • ${i.name} × ${i.quantity}  $${(i.price * i.quantity).toFixed(2)}`,
    )
    .join("\n");
  const whoStr = who !== "Sin matrícula" ? `\nEstudiante: ${who}` : "";
  const commission =
    params.type === "sale" && params.paymentMethod === "card"
      ? params.cardCommission ?? 0
      : 0;
  const grandTotal = params.type === "sale" ? params.total + commission : 0;
  const payLine =
    params.type === "sale" && params.paymentMethod === "card"
      ? `\nComisión tarjeta (4.176%): +$${commission.toFixed(
          2,
        )}\nTotal a cobrar: $${grandTotal.toFixed(2)}`
      : "";
  return `📋 Recibo de Venta\n${whoStr}\n\nProductos:\n${lines}\n\nSubtotal: $${params.total.toFixed(
    2,
  )}${payLine}\nFecha: ${dateStr}`;
}

export default function ReceiptScreen() {
  const navigation = useNavigation<any>();
  const params = useRoute<any>().params as ReceiptParams;
  const cfg = CONFIGS[params.type];
  const now = new Date();
  const dateStr = format(now, "d 'de' MMMM yyyy, HH:mm", { locale: es });

  const handleShare = async () => {
    await Share.share({ message: makeShareText(params, dateStr) });
  };

  const handleDone = () => {
    navigation.navigate("Dashboard");
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Success icon */}
        <View style={styles.iconWrap}>
          <View style={[styles.iconCircle, { backgroundColor: cfg.iconBg }]}>
            <MaterialCommunityIcons
              name={cfg.icon as any}
              size={52}
              color={cfg.iconColor}
            />
          </View>
          <View style={[styles.checkBadge, { backgroundColor: cfg.iconColor }]}>
            <MaterialCommunityIcons name="check" size={14} color="#fff" />
          </View>
        </View>

        <Text style={styles.title}>{cfg.title}</Text>
        <Text style={styles.date}>{dateStr}</Text>

        {/* Detail card */}
        <View style={styles.card}>
          {/* Student row */}
          {(params.studentId || params.studentName) && (
            <Row
              icon="account-outline"
              label="Estudiante"
              value={
                params.studentName
                  ? `${params.studentName}\n${params.studentId}`
                  : params.studentId!
              }
              color={cfg.accentColor}
            />
          )}

          {params.type === "loan" && (
            <>
              <Row
                icon="dice-multiple-outline"
                label="Juego"
                value={params.gameName}
                color={cfg.accentColor}
              />
              <Row
                icon={
                  params.piecesComplete
                    ? "checkbox-marked-circle-outline"
                    : "alert-circle-outline"
                }
                label="Piezas"
                value={params.piecesComplete ? "Completo" : "Incompleto"}
                color={params.piecesComplete ? "#16a34a" : "#b45309"}
              />
              {params.dueAt && (
                <Row
                  icon="calendar-clock-outline"
                  label="Devolver antes de"
                  value={format(new Date(params.dueAt), "d MMM yyyy, HH:mm", {
                    locale: es,
                  })}
                  color={cfg.accentColor}
                />
              )}
            </>
          )}

          {params.type === "print" && (
            <>
              <Row
                icon="file-multiple-outline"
                label="Páginas"
                value={`${params.pages}`}
                color={cfg.accentColor}
              />
              <Row
                icon={
                  params.printType === "free" ? "gift-outline" : "cash-outline"
                }
                label="Tipo"
                value={params.printType === "free" ? "Gratuita" : "Pagada"}
                color={params.printType === "free" ? "#16a34a" : "#b45309"}
              />
              <Row
                icon="currency-usd"
                label="Costo"
                value={
                  params.printType === "free"
                    ? "Sin costo"
                    : `$${params.cost.toFixed(2)}`
                }
                color={cfg.accentColor}
              />
            </>
          )}

          {params.type === "sale" && (
            <>
              {params.items.map((item, i) => (
                <Row
                  key={i}
                  icon="package-variant-closed"
                  label={`${item.name} × ${item.quantity}`}
                  value={`$${(item.price * item.quantity).toFixed(2)}`}
                  color={cfg.accentColor}
                />
              ))}
              <View style={styles.divider} />
              {params.paymentMethod === "card" ? (
                <>
                  <Row
                    icon="cash"
                    label="Subtotal"
                    value={`$${params.total.toFixed(2)}`}
                    color={cfg.accentColor}
                  />
                  <Row
                    icon="percent"
                    label="Comisión tarjeta (4.176%)"
                    value={`+$${(params.cardCommission ?? 0).toFixed(2)}`}
                    color="#b45309"
                  />
                  <Row
                    icon="credit-card-outline"
                    label="Total a cobrar"
                    value={`$${(
                      params.total + (params.cardCommission ?? 0)
                    ).toFixed(2)}`}
                    color="#0369a1"
                    bold
                  />
                </>
              ) : (
                <Row
                  icon="cash"
                  label="Total"
                  value={`$${params.total.toFixed(2)}`}
                  color={cfg.accentColor}
                  bold
                />
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="share-variant-outline"
            size={18}
            color={PURPLE}
          />
          <Text style={styles.shareBtnText}>Compartir recibo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: cfg.accentColor }]}
          onPress={handleDone}
          activeOpacity={0.85}
        >
          <Text style={styles.doneBtnText}>Listo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  color,
  bold,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: `${color}18` }]}>
        <MaterialCommunityIcons name={icon as any} size={17} color={color} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, bold && styles.rowValueBold]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F7FF" },
  content: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: "center",
    gap: 16,
  },
  iconWrap: { position: "relative", marginBottom: 4 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F8F7FF",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  date: {
    fontSize: 13,
    color: "#9ca3af",
    textTransform: "capitalize",
    marginTop: -8,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    gap: 12,
    elevation: 2,
    shadowColor: "#5C35D9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowText: { flex: 1 },
  rowLabel: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rowValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
    marginTop: 2,
    lineHeight: 20,
  },
  rowValueBold: { fontSize: 18, fontWeight: "800" },
  divider: { height: 1, backgroundColor: "#f3f4f6" },
  actions: {
    padding: 20,
    paddingBottom: 32,
    gap: 12,
    backgroundColor: "#F8F7FF",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EEE9FF",
    borderRadius: 14,
    paddingVertical: 14,
  },
  shareBtnText: { color: PURPLE, fontWeight: "700", fontSize: 15 },
  doneBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  doneBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
