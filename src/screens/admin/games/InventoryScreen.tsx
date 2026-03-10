import React, { useState, useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Share,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Toast from "react-native-toast-message";
import DocumentPicker from "react-native-document-picker";
import { gamesService } from "../../../services/gamesService";
import { uploadService } from "../../../services/uploadService";
import { Game } from "../../../types/games.types";
import { extractApiErrorMessage } from "../../../utils/apiError";

const PURPLE = "#5C35D9";
const PURPLE_LIGHT = "#EEE9FF";

interface GameForm {
  name: string;
  description: string;
  instructions: string;
  instructions_url: string;
  quantity_total: string;
}

export default function InventoryScreen() {
  const navigation = useNavigation<any>();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [qrGame, setQrGame] = useState<Game | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<GameForm>({
    name: "",
    description: "",
    instructions: "",
    instructions_url: "",
    quantity_total: "1",
  });

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
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGames();
      return () => {
        abortRef.current?.abort();
      };
    }, [fetchGames]),
  );

  const openModal = () => {
    setForm({
      name: "",
      description: "",
      instructions: "",
      instructions_url: "",
      quantity_total: "1",
    });
    setUploading(false);
    setShowModal(true);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.pickSingle({
        type: [
          DocumentPicker.types.images,
          DocumentPicker.types.video,
          DocumentPicker.types.pdf,
        ],
        copyTo: "cachesDirectory",
      });
      setUploading(true);
      const url = await uploadService.uploadFile(
        result.fileCopyUri ?? result.uri,
        result.name ?? "file",
        result.type ?? "application/octet-stream",
      );
      setForm((f) => ({ ...f, instructions_url: url }));
      Toast.show({ type: "success", text1: "Archivo subido correctamente" });
    } catch (err: any) {
      if (!DocumentPicker.isCancel(err)) {
        Toast.show({
          type: "error",
          text1: "Error al subir el archivo",
          text2: extractApiErrorMessage(err, "No se pudo subir el archivo."),
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      Toast.show({ type: "error", text1: "El nombre es obligatorio" });
      return;
    }
    const qty = parseInt(form.quantity_total, 10);
    if (isNaN(qty) || qty < 1) {
      Toast.show({ type: "error", text1: "La cantidad debe ser al menos 1" });
      return;
    }
    setSaving(true);
    try {
      await gamesService.createGame({
        name: form.name.trim(),
        description: form.description.trim() || "",
        instructions: form.instructions.trim() || "",
        instructions_url: form.instructions_url.trim() || undefined,
        quantity_total: qty,
        quantity_avail: qty,
      });
      setShowModal(false);
      fetchGames();
      Toast.show({ type: "success", text1: `"${form.name.trim()}" creado` });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: extractApiErrorMessage(err, "No se pudo crear el juego."),
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

  return (
    <View style={styles.root}>
      {/* Action row */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={openModal}>
          <MaterialCommunityIcons
            name="plus-circle-outline"
            size={17}
            color="#fff"
          />
          <Text style={styles.actionBtnText}>Nuevo juego</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.secondaryBtn]}
          onPress={() => navigation.navigate("RegisterLoan")}
        >
          <MaterialCommunityIcons
            name="hand-pointing-right"
            size={17}
            color={PURPLE}
          />
          <Text style={[styles.actionBtnText, styles.secondaryText]}>
            Préstamo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.secondaryBtn]}
          onPress={() => navigation.navigate("LoanHistory")}
        >
          <MaterialCommunityIcons name="history" size={17} color={PURPLE} />
          <Text style={[styles.actionBtnText, styles.secondaryText]}>
            Historial
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={games}
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
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons
              name="dice-multiple-outline"
              size={48}
              color="#d1d5db"
            />
            <Text style={styles.empty}>
              Sin juegos. Agrega uno con "Nuevo juego".
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const ratio =
            item.quantity_total > 0
              ? item.quantity_avail / item.quantity_total
              : 0;
          const dotColor =
            ratio === 0 ? "#EF4444" : ratio < 0.4 ? "#F59E0B" : "#22C55E";
          return (
            <View style={styles.card}>
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
              <View style={styles.cardBody}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.sub}>
                  {item.quantity_avail}/{item.quantity_total} disponibles
                </Text>
              </View>
              <TouchableOpacity
                style={styles.qrIconBtn}
                onPress={() => setQrGame(item)}
              >
                <MaterialCommunityIcons
                  name="qrcode"
                  size={20}
                  color={PURPLE}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.loanBtn}
                onPress={() =>
                  navigation.navigate("RegisterLoan", { preselectedGame: item })
                }
              >
                <MaterialCommunityIcons
                  name="hand-pointing-right"
                  size={16}
                  color={PURPLE}
                />
                <Text style={styles.loanBtnText}>Prestar</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* QR Code Modal */}
      <Modal
        visible={!!qrGame}
        transparent
        animationType="fade"
        onRequestClose={() => setQrGame(null)}
      >
        <View style={styles.qrOverlay}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>{qrGame?.name}</Text>
            <View style={styles.qrWrap}>
              <QRCode
                value={qrGame ? `cubiculoapp://loan?game_id=${qrGame.id}` : "x"}
                size={200}
                color="#1a1a2e"
                backgroundColor="#fff"
              />
            </View>
            <View style={styles.qrHintRow}>
              <MaterialCommunityIcons
                name="information-outline"
                size={14}
                color="#6b7280"
              />
              <Text style={styles.qrHintText}>
                Imprime o pega este código en el juego. Al escanearlo el usuario
                podrá solicitar el préstamo directamente.
              </Text>
            </View>
            <View style={styles.qrActions}>
              <TouchableOpacity
                style={styles.qrShareBtn}
                onPress={() =>
                  Share.share({
                    message: `Juego: ${qrGame?.name}\nEscanea este enlace para préstamo: cubiculoapp://loan?game_id=${qrGame?.id}`,
                    title: qrGame?.name,
                  })
                }
              >
                <MaterialCommunityIcons
                  name="share-variant"
                  size={16}
                  color="#fff"
                />
                <Text style={styles.qrShareText}>Compartir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.qrCloseBtn}
                onPress={() => setQrGame(null)}
              >
                <Text style={styles.qrCloseBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Game Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nuevo Juego</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                placeholder="ej. Ajedrez"
                value={form.name}
                onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
              />
              <Text style={styles.label}>Cantidad *</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                value={form.quantity_total}
                onChangeText={(t) =>
                  setForm((f) => ({ ...f, quantity_total: t }))
                }
                keyboardType="number-pad"
              />
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={styles.input}
                placeholder="Descripción opcional"
                value={form.description}
                onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
              />
              <Text style={styles.label}>Instrucciones (texto)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                placeholder="Instrucciones opcionales"
                value={form.instructions}
                onChangeText={(t) =>
                  setForm((f) => ({ ...f, instructions: t }))
                }
                multiline
              />
              <Text style={styles.label}>Recurso multimedia</Text>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={handlePickFile}
                disabled={uploading || saving}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="cloud-upload-outline"
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.uploadBtnText}>
                      Subir archivo (imagen / video / PDF)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              {form.instructions_url ? (
                <View style={styles.uploadedRow}>
                  <MaterialCommunityIcons
                    name="check-circle-outline"
                    size={14}
                    color="#22C55E"
                  />
                  <Text style={styles.uploadedUrl} numberOfLines={1}>
                    {form.instructions_url}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setForm((f) => ({ ...f, instructions_url: "" }))
                    }
                  >
                    <MaterialCommunityIcons
                      name="close-circle-outline"
                      size={16}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={styles.urlHint}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={14}
                  color="#6b7280"
                />
                <Text style={styles.urlHintText}>
                  O pega directamente un link de imagen, YouTube, Google Drive,
                  etc.
                </Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="https://..."
                value={form.instructions_url}
                onChangeText={(t) =>
                  setForm((f) => ({ ...f, instructions_url: t }))
                }
                autoCapitalize="none"
                keyboardType="url"
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleCreate}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F7FF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  actionRow: { flexDirection: "row", padding: 16, gap: 8 },
  actionBtn: {
    flex: 1,
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  secondaryBtn: { backgroundColor: PURPLE_LIGHT },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  secondaryText: { color: PURPLE },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  emptyWrap: { alignItems: "center", marginTop: 50, gap: 10 },
  empty: { textAlign: "center", color: "#999", fontSize: 13 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
    gap: 10,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: "#1a1a2e" },
  sub: { fontSize: 12, color: "#888", marginTop: 3 },
  loanBtn: {
    backgroundColor: PURPLE_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  loanBtnText: { color: PURPLE, fontWeight: "700", fontSize: 13 },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 5,
    marginTop: 12,
  },
  urlHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  urlHintText: { flex: 1, fontSize: 11, color: "#6b7280", lineHeight: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#1a1a2e",
    backgroundColor: "#f9fafb",
  },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  cancelText: { color: "#374151", fontWeight: "600", fontSize: 15 },
  saveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: PURPLE,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  uploadBtn: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  uploadBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  uploadedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  uploadedUrl: { flex: 1, fontSize: 11, color: "#374151" },
  // QR modal
  qrIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PURPLE_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  qrOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  qrCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
    gap: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a2e",
    textAlign: "center",
  },
  qrWrap: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  qrHintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    padding: 10,
  },
  qrHintText: {
    flex: 1,
    fontSize: 12,
    color: "#4b5563",
    lineHeight: 18,
  },
  qrActions: { flexDirection: "row", gap: 10, width: "100%" },
  qrShareBtn: {
    flex: 1,
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  qrShareText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  qrCloseBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  qrCloseBtnText: { color: "#374151", fontWeight: "600", fontSize: 14 },
});
