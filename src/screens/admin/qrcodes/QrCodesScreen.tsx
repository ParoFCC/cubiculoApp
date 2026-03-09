import * as React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Modal,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const PURPLE = "#5C35D9";
const PURPLE_LIGHT = "#EEE9FF";
const BG = "#F8F7FF";
const QR_CARD_BG = "#ffffff";

interface QrItem {
  key: string;
  group: "operacion" | "control";
  label: string;
  description: string;
  url: string;
  icon: string;
  accent: string;
  accentSoft: string;
}

const QR_ITEMS: QrItem[] = [
  {
    key: "return",
    group: "operacion",
    label: "Devolución de juego",
    description: "Abre directamente la pantalla de registro de devolución.",
    url: "cubiculoapp://return",
    icon: "hand-okay",
    accent: "#D97706",
    accentSoft: "#FEF3C7",
  },
  {
    key: "print",
    group: "operacion",
    label: "Impresión",
    description: "Abre directamente la pantalla de registro de impresión.",
    url: "cubiculoapp://print",
    icon: "printer",
    accent: "#0284C7",
    accentSoft: "#E0F2FE",
  },
  {
    key: "sale",
    group: "operacion",
    label: "Venta",
    description: "Abre directamente la pantalla de registro de venta.",
    url: "cubiculoapp://sale",
    icon: "cart",
    accent: "#059669",
    accentSoft: "#D1FAE5",
  },
  {
    key: "attendance",
    group: "control",
    label: "Asistencia",
    description: "Abre directamente la pantalla de entrada/salida del admin.",
    url: "cubiculoapp://attendance",
    icon: "clock-check-outline",
    accent: "#7C3AED",
    accentSoft: "#F3E8FF",
  },
];

function QrSection({
  title,
  items,
  onPreview,
}: {
  title: string;
  items: QrItem[];
  onPreview: (item: QrItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <View key={item.key} style={styles.card}>
          <View style={styles.cardHeader}>
            <View
              style={[styles.iconBox, { backgroundColor: item.accentSoft }]}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={22}
                color={item.accent}
              />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardLabel}>{item.label}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
            </View>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.qrWrap}>
              <QRCode
                value={item.url}
                size={132}
                color="#1a1a2e"
                backgroundColor="#fff"
              />
            </View>
            <View style={styles.metaColumn}>
              <View
                style={[styles.urlBadge, { backgroundColor: item.accentSoft }]}
              >
                <Text style={[styles.urlBadgeText, { color: item.accent }]}>
                  URL lista
                </Text>
              </View>
              <Text style={styles.urlText}>{item.url}</Text>
              <Text style={styles.helperText}>
                Ideal para imprimir, plastificar o compartir por mensaje.
              </Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => onPreview(item)}
            >
              <MaterialCommunityIcons
                name="magnify-plus-outline"
                size={16}
                color={PURPLE}
              />
              <Text style={styles.viewBtnText}>Vista grande</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: item.accent }]}
              onPress={() =>
                Share.share({
                  message: `${item.label}\nEscanea con la app CubiculoApp: ${item.url}`,
                  title: item.label,
                })
              }
            >
              <MaterialCommunityIcons
                name="share-variant"
                size={16}
                color="#fff"
              />
              <Text style={styles.shareBtnText}>Compartir</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function QrCodesScreen() {
  const [selectedItem, setSelectedItem] = React.useState<QrItem | null>(null);
  const operationalItems = QR_ITEMS.filter(
    (item) => item.group === "operacion",
  );
  const controlItems = QR_ITEMS.filter((item) => item.group === "control");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Códigos QR listos para imprimir</Text>
        <Text style={styles.heroText}>
          Centraliza accesos rápidos para operaciones recurrentes. Los QR de
          préstamo por juego siguen viviendo dentro del catálogo de juegos.
        </Text>
        <View style={styles.tipRow}>
          <View style={styles.tipBadge}>
            <MaterialCommunityIcons
              name="printer-outline"
              size={14}
              color={PURPLE}
            />
            <Text style={styles.tipText}>Úsalos en mostrador o pared</Text>
          </View>
          <View style={styles.tipBadge}>
            <MaterialCommunityIcons
              name="share-variant"
              size={14}
              color={PURPLE}
            />
            <Text style={styles.tipText}>Compártelos por WhatsApp</Text>
          </View>
        </View>
      </View>
      <View style={styles.infoBox}>
        <MaterialCommunityIcons
          name="information-outline"
          size={16}
          color={PURPLE}
        />
        <Text style={styles.infoText}>
          Si necesitas un QR que abra un préstamo con juego específico, ese se
          genera desde la pantalla de Juegos para incluir el identificador del
          juego.
        </Text>
      </View>

      <QrSection
        title="Operaciones"
        items={operationalItems}
        onPreview={setSelectedItem}
      />
      <QrSection
        title="Control interno"
        items={controlItems}
        onPreview={setSelectedItem}
      />

      {/* Large QR Modal */}
      <Modal
        visible={!!selectedItem}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedItem?.label}</Text>
            <View style={styles.modalQrWrap}>
              <QRCode
                value={selectedItem?.url ?? "x"}
                size={240}
                color="#1a1a2e"
                backgroundColor="#fff"
              />
            </View>
            <Text style={styles.modalUrl}>{selectedItem?.url}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.shareBtn,
                  { backgroundColor: selectedItem?.accent ?? PURPLE },
                ]}
                onPress={() => {
                  if (!selectedItem) return;
                  Share.share({
                    message: `${selectedItem.label}\nEscanea con la app CubiculoApp: ${selectedItem.url}`,
                    title: selectedItem.label,
                  });
                }}
              >
                <MaterialCommunityIcons
                  name="share-variant"
                  size={16}
                  color="#fff"
                />
                <Text style={styles.shareBtnText}>Compartir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedItem(null)}
              >
                <Text style={styles.closeBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 32, gap: 16 },

  hero: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#5C35D9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1a1a2e",
  },
  heroText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#6b7280",
  },
  tipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  tipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: PURPLE_LIGHT,
  },
  tipText: {
    fontSize: 12,
    fontWeight: "700",
    color: PURPLE,
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: PURPLE_LIGHT,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: PURPLE,
    lineHeight: 19,
  },

  section: { gap: 12 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingLeft: 2,
  },

  card: {
    backgroundColor: QR_CARD_BG,
    borderRadius: 14,
    padding: 16,
    shadowColor: "#5C35D9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: 12,
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: PURPLE_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: "700", color: "#1a1a2e" },
  cardDesc: { fontSize: 12, color: "#6b7280", marginTop: 2 },

  qrWrap: {
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0EEFF",
  },
  metaColumn: { flex: 1, gap: 8 },
  urlBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  urlBadgeText: { fontSize: 11, fontWeight: "800" },

  urlText: {
    fontSize: 12,
    color: "#6b7280",
    fontFamily: "monospace",
  },
  helperText: {
    fontSize: 12,
    color: "#9ca3af",
    lineHeight: 18,
  },

  cardActions: {
    flexDirection: "row",
    gap: 10,
    alignSelf: "stretch",
  },
  viewBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: PURPLE,
    backgroundColor: "#fff",
  },
  viewBtnText: { fontSize: 14, fontWeight: "600", color: PURPLE },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: PURPLE,
  },
  shareBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    width: "100%",
    alignItems: "center",
    gap: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  modalQrWrap: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0EEFF",
  },
  modalUrl: {
    fontSize: 13,
    color: "#6b7280",
    fontFamily: "monospace",
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    alignSelf: "stretch",
  },
  closeBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  closeBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },
});
