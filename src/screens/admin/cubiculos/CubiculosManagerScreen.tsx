import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import {
  cubiculosService,
  CubiculoPayload,
} from "../../../services/cubiculosService";
import { usersService } from "../../../services/usersService";
import { Cubiculo } from "../../../types/cubiculo.types";
import { User } from "../../../types/auth.types";

const PURPLE = "#5C35D9";
const PURPLE_LIGHT = "#EEE9FF";

const SERVICE_DEFS = [
  { key: "games_enabled" as const, label: "Juegos", icon: "dice-multiple" },
  { key: "printing_enabled" as const, label: "Impresiones", icon: "printer" },
  { key: "products_enabled" as const, label: "Ventas", icon: "cart" },
];

interface FormState {
  name: string;
  slug: string;
  location: string;
  description: string;
}

export default function CubiculosManagerScreen() {
  const [cubiculos, setCubiculos] = useState<Cubiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    slug: "",
    location: "",
    description: "",
  });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await cubiculosService.getAllAdmin();
      setCubiculos(data);
    } catch {
      Alert.alert("Error", "No se pudieron cargar los cubículos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const toggleField = async (
    cubiculo: Cubiculo,
    field: keyof CubiculoPayload,
    value: boolean,
  ) => {
    // Optimistic update
    setCubiculos((prev) =>
      prev.map((c) => (c.id === cubiculo.id ? { ...c, [field]: value } : c)),
    );
    try {
      await cubiculosService.update(cubiculo.id, { [field]: value });
    } catch {
      // Revert on error
      setCubiculos((prev) =>
        prev.map((c) => (c.id === cubiculo.id ? { ...c, [field]: !value } : c)),
      );
      Alert.alert("Error", "No se pudo actualizar");
    }
  };

  const openCreateModal = () => {
    setForm({ name: "", slug: "", location: "", description: "" });
    setModalVisible(true);
  };

  const autoSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const handleNameChange = (text: string) => {
    setForm((f) => ({ ...f, name: text, slug: autoSlug(text) }));
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      Alert.alert("Error", "Nombre y slug son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const created = await cubiculosService.create({
        name: form.name.trim(),
        slug: form.slug.trim(),
        location: form.location.trim() || null,
        description: form.description.trim() || null,
      });
      setCubiculos((prev) => [...prev, created]);
      setModalVisible(false);
    } catch {
      Alert.alert("Error", "No se pudo crear el cubículo");
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
    <View style={styles.container}>
      <FlatList
        data={cubiculos}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PURPLE}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.headerTitle}>Cubículos</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
              <MaterialCommunityIcons name="plus" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Nuevo</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <CubiculoCard cubiculo={item} onToggle={toggleField} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Sin cubículos. Crea uno con el botón de arriba.
          </Text>
        }
      />

      {/* Create Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nuevo Cubículo</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nombre *</Text>
              <TextInput
                style={styles.input}
                placeholder="ej. Computación"
                value={form.name}
                onChangeText={handleNameChange}
              />
              <Text style={styles.inputLabel}>Slug *</Text>
              <TextInput
                style={styles.input}
                placeholder="ej. computacion"
                value={form.slug}
                onChangeText={(t) => setForm((f) => ({ ...f, slug: t }))}
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Ubicación</Text>
              <TextInput
                style={styles.input}
                placeholder="ej. Edificio A"
                value={form.location}
                onChangeText={(t) => setForm((f) => ({ ...f, location: t }))}
              />
              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput
                style={[styles.input, { height: 72, textAlignVertical: "top" }]}
                placeholder="Descripción opcional"
                value={form.description}
                onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
                multiline
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleCreate}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Crear</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CubiculoCard({
  cubiculo,
  onToggle,
}: {
  cubiculo: Cubiculo;
  onToggle: (c: Cubiculo, field: keyof CubiculoPayload, value: boolean) => void;
}) {
  const [admins, setAdmins] = useState<User[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [assigning, setAssigning] = useState(false);

  const loadAdmins = useCallback(async () => {
    try {
      const data = await cubiculosService.getAdmins(cubiculo.id);
      setAdmins(data);
    } catch {
      // silently fail
    }
  }, [cubiculo.id]);

  const handleExpand = () => {
    if (!expanded) loadAdmins();
    setExpanded((v) => !v);
  };

  const handleAssign = async () => {
    const sid = adminSearch.trim();
    if (!sid) return;
    setAssigning(true);
    try {
      const found = await usersService.lookupByStudentId(sid);
      await cubiculosService.assignAdmin(cubiculo.id, found.id);
      setAdminSearch("");
      await loadAdmins();
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        Alert.alert(
          "No encontrado",
          "No existe usuario con ese ID de estudiante",
        );
      } else {
        Alert.alert("Error", "No se pudo asignar el admin");
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = (admin: User) => {
    Alert.alert(
      "Remover admin",
      `¿Quitar a ${admin.name} como admin de este cubículo?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Quitar",
          style: "destructive",
          onPress: async () => {
            try {
              await cubiculosService.removeAdmin(cubiculo.id, admin.id);
              setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
            } catch {
              Alert.alert("Error", "No se pudo remover");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.card, !cubiculo.is_active && styles.cardInactive]}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <View
            style={[
              styles.dot,
              { backgroundColor: cubiculo.is_active ? "#22c55e" : "#d1d5db" },
            ]}
          />
          <Text style={styles.cardTitle}>{cubiculo.name}</Text>
          {cubiculo.location ? (
            <Text style={styles.cardLocation}> · {cubiculo.location}</Text>
          ) : null}
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Activo</Text>
          <Switch
            value={cubiculo.is_active}
            onValueChange={(v) => onToggle(cubiculo, "is_active", v)}
            trackColor={{ true: PURPLE, false: "#d1d5db" }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Service toggles */}
      <View style={styles.servicesRow}>
        {SERVICE_DEFS.map((s) => {
          const enabled = cubiculo[s.key];
          return (
            <View
              key={s.key}
              style={[
                styles.serviceChip,
                enabled ? styles.serviceChipOn : styles.serviceChipOff,
              ]}
            >
              <MaterialCommunityIcons
                name={s.icon}
                size={16}
                color={enabled ? PURPLE : "#9ca3af"}
              />
              <Text
                style={[
                  styles.serviceLabel,
                  { color: enabled ? PURPLE : "#9ca3af" },
                ]}
              >
                {s.label}
              </Text>
              <Switch
                value={enabled}
                onValueChange={(v) => onToggle(cubiculo, s.key, v)}
                trackColor={{ true: PURPLE_LIGHT, false: "#e5e7eb" }}
                thumbColor={enabled ? PURPLE : "#9ca3af"}
                style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
              />
            </View>
          );
        })}
      </View>

      {/* Admins section */}
      <TouchableOpacity style={styles.adminsToggle} onPress={handleExpand}>
        <MaterialCommunityIcons
          name="account-key-outline"
          size={15}
          color={PURPLE}
        />
        <Text style={styles.adminsToggleText}>Admins asignados</Text>
        <MaterialCommunityIcons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color="#6b7280"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.adminsBody}>
          {admins.length === 0 ? (
            <Text style={styles.adminsEmpty}>Sin admins asignados</Text>
          ) : (
            admins.map((a) => (
              <View key={a.id} style={styles.adminRow}>
                <MaterialCommunityIcons
                  name="account-circle-outline"
                  size={18}
                  color={PURPLE}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.adminName}>{a.name}</Text>
                  <Text style={styles.adminSub}>{a.student_id ?? a.email}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemove(a)}>
                  <MaterialCommunityIcons
                    name="close-circle-outline"
                    size={20}
                    color="#E53935"
                  />
                </TouchableOpacity>
              </View>
            ))
          )}

          <View style={styles.assignRow}>
            <TextInput
              style={styles.assignInput}
              placeholder="ID de estudiante"
              value={adminSearch}
              onChangeText={setAdminSearch}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.assignBtn}
              onPress={handleAssign}
              disabled={assigning}
            >
              {assigning ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.assignBtnText}>Asignar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6FB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, paddingBottom: 32 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#1a1a2e" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 40, fontSize: 14 },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardInactive: { opacity: 0.65 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  dot: { width: 9, height: 9, borderRadius: 5, marginRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a2e" },
  cardLocation: { fontSize: 12, color: "#6b7280", fontWeight: "500" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  toggleLabel: { fontSize: 12, color: "#6b7280", fontWeight: "600" },

  servicesRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  serviceChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  serviceChipOn: { backgroundColor: PURPLE_LIGHT },
  serviceChipOff: { backgroundColor: "#f3f4f6" },
  serviceLabel: { fontSize: 11, fontWeight: "600" },

  // Admins section
  adminsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingVertical: 4,
  },
  adminsToggleText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: PURPLE,
  },
  adminsBody: { gap: 6, paddingTop: 8 },
  adminsEmpty: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    paddingVertical: 4,
  },
  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  adminName: { fontSize: 13, fontWeight: "600", color: "#1a1a2e" },
  adminSub: { fontSize: 11, color: "#6b7280" },
  assignRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    alignItems: "center",
  },
  assignInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: "#1a1a2e",
    backgroundColor: "#f9fafb",
  },
  assignBtn: {
    backgroundColor: PURPLE,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  assignBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  // Modal
  modalOverlay: {
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
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#1a1a2e",
    backgroundColor: "#f9fafb",
  },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  cancelBtnText: { color: "#374151", fontWeight: "600", fontSize: 15 },
  saveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: PURPLE,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
