import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Toast from "react-native-toast-message";
import { usersService } from "../../../services/usersService";
import { cubiculosService } from "../../../services/cubiculosService";
import { User, UserRole } from "../../../types/auth.types";
import { Cubiculo } from "../../../types/cubiculo.types";
import { useAuthStore } from "../../../store/useAuthStore";

const PURPLE = "#5C35D9";
const PURPLE_LIGHT = "#EEE9FF";

type FilterTab = "all" | "student" | "admin";

export default function UsersAdminScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [cubiculos, setCubiculos] = useState<Cubiculo[]>([]);
  const [assignTarget, setAssignTarget] = useState<User | null>(null);
  const [assigning, setAssigning] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.is_super_admin === true;

  const fetchUsers = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const role: UserRole | undefined =
          filter === "all" ? undefined : (filter as UserRole);
        const { items } = await usersService.getAll(role);
        setUsers(items);
      } catch {
        Toast.show({ type: "error", text1: "Error al cargar usuarios" });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter],
  );

  const fetchCubiculos = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const data = await cubiculosService.getAllAdmin();
      setCubiculos(data);
    } catch {
      // non-critical
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchCubiculos();
  }, [fetchCubiculos]);

  const handleAssignCubiculo = async (cubiculoId: string | null) => {
    if (!assignTarget) return;
    setAssigning(true);
    try {
      await usersService.assignCubiculo(assignTarget.id, cubiculoId);
      Toast.show({
        type: "success",
        text1: cubiculoId ? "Cubículo asignado" : "Cubículo removido",
        text2: assignTarget.name,
      });
      setAssignTarget(null);
      fetchUsers(true);
    } catch {
      Toast.show({ type: "error", text1: "No se pudo asignar el cubículo" });
    } finally {
      setAssigning(false);
    }
  };

  const handleDeactivate = (user: User) => {
    if (user.id === currentUser?.id) {
      Toast.show({
        type: "error",
        text1: "No puedes desactivar tu propia cuenta",
      });
      return;
    }
    Alert.alert(
      "Desactivar usuario",
      `¿Desactivar la cuenta de ${user.name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desactivar",
          style: "destructive",
          onPress: async () => {
            try {
              await usersService.deactivate(user.id);
              Toast.show({ type: "success", text1: "Usuario desactivado" });
              fetchUsers(true);
            } catch {
              Toast.show({ type: "error", text1: "No se pudo desactivar" });
            }
          },
        },
      ],
    );
  };

  const handleToggleRole = (user: User) => {
    if (user.id === currentUser?.id) {
      Toast.show({ type: "error", text1: "No puedes cambiar tu propio rol" });
      return;
    }
    const newRole: UserRole = user.role === "student" ? "admin" : "student";
    const label = newRole === "admin" ? "hacer Admin" : "quitar Admin";
    Alert.alert(
      "Cambiar rol",
      `¿${label.charAt(0).toUpperCase() + label.slice(1)} a ${user.name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              await usersService.changeRole(user.id, newRole);
              Toast.show({
                type: "success",
                text1: `Rol actualizado a ${newRole}`,
              });
              fetchUsers(true);
            } catch {
              Toast.show({ type: "error", text1: "No se pudo cambiar el rol" });
            }
          },
        },
      ],
    );
  };

  const handleToggleSuperAdmin = (user: User) => {
    if (user.id === currentUser?.id) {
      Toast.show({
        type: "error",
        text1: "No puedes modificar tu propio superadmin",
      });
      return;
    }
    const action = user.is_super_admin
      ? "quitar superadmin a"
      : "promover a superadmin a";
    Alert.alert(
      user.is_super_admin ? "Quitar Superadmin" : "Promover a Superadmin",
      `¿${action.charAt(0).toUpperCase() + action.slice(1)} ${user.name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              await usersService.toggleSuperAdmin(user.id);
              Toast.show({
                type: "success",
                text1: user.is_super_admin
                  ? "Superadmin removido"
                  : "Superadmin asignado",
                text2: user.name,
              });
              fetchUsers(true);
            } catch {
              Toast.show({ type: "error", text1: "No se pudo actualizar" });
            }
          },
        },
      ],
    );
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "student", label: "Estudiantes" },
    { key: "admin", label: "Admins" },
  ];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {filterTabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.filterBtn,
              filter === t.key && styles.filterBtnActive,
            ]}
            onPress={() => setFilter(t.key)}
          >
            <Text
              style={[
                styles.filterText,
                filter === t.key && styles.filterTextActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Count */}
      <Text style={styles.count}>
        {users.length} usuario{users.length !== 1 ? "s" : ""}
      </Text>

      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchUsers(true);
            }}
            colors={[PURPLE]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="account-off-outline"
              size={48}
              color="#ccc"
            />
            <Text style={styles.emptyText}>Sin usuarios</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* Avatar */}
            <View
              style={[
                styles.avatar,
                item.role === "admin" && styles.avatarAdmin,
              ]}
            >
              <MaterialCommunityIcons
                name={item.role === "admin" ? "shield-account" : "account"}
                size={22}
                color={item.role === "admin" ? PURPLE : "#888"}
              />
            </View>

            {/* Info */}
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {item.student_id ?? item.email}
              </Text>
              <View
                style={[
                  styles.roleBadge,
                  item.role === "admin" && styles.roleBadgeAdmin,
                ]}
              >
                <Text
                  style={[
                    styles.roleText,
                    item.role === "admin" && styles.roleTextAdmin,
                  ]}
                >
                  {item.role === "admin"
                    ? item.is_super_admin
                      ? "⭐ Superadmin"
                      : "Admin"
                    : "Estudiante"}
                </Text>
              </View>
              {isSuperAdmin && item.role === "admin" && (
                <Text style={styles.cubiculoLine} numberOfLines={1}>
                  {"\u{1F3E2} "}
                  {item.managed_cubiculo_id
                    ? cubiculos.find((c) => c.id === item.managed_cubiculo_id)
                        ?.name ?? "Cubículo asignado"
                    : "Sin cubículo"}
                </Text>
              )}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              {isSuperAdmin && item.role === "admin" && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => setAssignTarget(item)}
                >
                  <MaterialCommunityIcons
                    name="office-building-cog-outline"
                    size={20}
                    color="#9333ea"
                  />
                </TouchableOpacity>
              )}
              {isSuperAdmin && item.role === "admin" && (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    item.is_super_admin && styles.superAdminBtn,
                  ]}
                  onPress={() => handleToggleSuperAdmin(item)}
                >
                  <MaterialCommunityIcons
                    name={
                      item.is_super_admin
                        ? "shield-star"
                        : "shield-star-outline"
                    }
                    size={20}
                    color={item.is_super_admin ? "#fff" : "#f59e0b"}
                  />
                </TouchableOpacity>
              )}
              {isSuperAdmin && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleToggleRole(item)}
                >
                  <MaterialCommunityIcons
                    name={
                      item.role === "admin"
                        ? "shield-remove-outline"
                        : "shield-account-outline"
                    }
                    size={20}
                    color={PURPLE}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => handleDeactivate(item)}
              >
                <MaterialCommunityIcons
                  name="account-remove-outline"
                  size={20}
                  color="#E53935"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Assign cubículo modal */}
      <Modal
        visible={!!assignTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignTarget(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.assignModal}>
            <Text style={styles.assignModalTitle}>Asignar cubículo</Text>
            {assignTarget && (
              <Text style={styles.assignModalSub}>{assignTarget.name}</Text>
            )}
            <ScrollView style={{ maxHeight: 320 }}>
              {/* Option: remove assignment */}
              <TouchableOpacity
                style={[
                  styles.cubiculoOption,
                  !assignTarget?.managed_cubiculo_id &&
                    styles.cubiculoOptionActive,
                ]}
                onPress={() => handleAssignCubiculo(null)}
                disabled={assigning}
              >
                <MaterialCommunityIcons
                  name="office-building-remove-outline"
                  size={20}
                  color={
                    !assignTarget?.managed_cubiculo_id ? PURPLE : "#6b7280"
                  }
                />
                <Text
                  style={[
                    styles.cubiculoOptionText,
                    !assignTarget?.managed_cubiculo_id &&
                      styles.cubiculoOptionTextActive,
                  ]}
                >
                  Sin cubículo
                </Text>
                {!assignTarget?.managed_cubiculo_id && (
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color={PURPLE}
                  />
                )}
              </TouchableOpacity>

              {cubiculos
                .filter((c) => c.is_active)
                .map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.cubiculoOption,
                      assignTarget?.managed_cubiculo_id === c.id &&
                        styles.cubiculoOptionActive,
                    ]}
                    onPress={() => handleAssignCubiculo(c.id)}
                    disabled={assigning}
                  >
                    <MaterialCommunityIcons
                      name="office-building-outline"
                      size={20}
                      color={
                        assignTarget?.managed_cubiculo_id === c.id
                          ? PURPLE
                          : "#6b7280"
                      }
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.cubiculoOptionText,
                          assignTarget?.managed_cubiculo_id === c.id &&
                            styles.cubiculoOptionTextActive,
                        ]}
                      >
                        {c.name}
                      </Text>
                      {c.location ? (
                        <Text style={styles.cubiculoOptionSub}>
                          {c.location}
                        </Text>
                      ) : null}
                    </View>
                    {assignTarget?.managed_cubiculo_id === c.id && (
                      <MaterialCommunityIcons
                        name="check"
                        size={16}
                        color={PURPLE}
                      />
                    )}
                  </TouchableOpacity>
                ))}
            </ScrollView>

            {assigning && (
              <ActivityIndicator color={PURPLE} style={{ marginTop: 12 }} />
            )}

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setAssignTarget(null)}
              disabled={assigning}
            >
              <Text style={styles.closeModalText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F7FF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0D9FF",
  },
  filterBtnActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  filterText: { fontSize: 12, fontWeight: "600", color: "#888" },
  filterTextActive: { color: "#fff" },
  count: {
    fontSize: 12,
    color: "#aaa",
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  empty: { alignItems: "center", marginTop: 60, gap: 10 },
  emptyText: { color: "#bbb", fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarAdmin: { backgroundColor: PURPLE_LIGHT },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: "700", color: "#1a1a2e" },
  sub: { fontSize: 12, color: "#888", marginTop: 2 },
  roleBadge: {
    alignSelf: "flex-start",
    marginTop: 5,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roleBadgeAdmin: { backgroundColor: PURPLE_LIGHT },
  roleText: { fontSize: 10, fontWeight: "700", color: "#999" },
  roleTextAdmin: { color: PURPLE },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PURPLE_LIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtn: { backgroundColor: "#FFEBEE" },
  superAdminBtn: { backgroundColor: "#f59e0b", borderColor: "#f59e0b" },
  cubiculoLine: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  assignModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 36,
  },
  assignModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1a1a2e",
    marginBottom: 2,
  },
  assignModalSub: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 14,
  },
  cubiculoOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4,
  },
  cubiculoOptionActive: { backgroundColor: PURPLE_LIGHT },
  cubiculoOptionText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  cubiculoOptionTextActive: { color: PURPLE },
  cubiculoOptionSub: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  closeModalBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
  },
  closeModalText: { color: "#555", fontWeight: "700", fontSize: 14 },
});
