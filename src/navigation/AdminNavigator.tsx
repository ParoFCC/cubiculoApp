import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuthStore } from "../store/useAuthStore";
import { useCubiculoStore } from "../store/useCubiculoStore";
import { SUPER_ADMIN_ID } from "../types/auth.types";

// Admin — Dashboard
import DashboardScreen from "../screens/admin/dashboard/DashboardScreen";

// Admin — Games
import InventoryScreen from "../screens/admin/games/InventoryScreen";
import RegisterLoanScreen from "../screens/admin/games/RegisterLoanScreen";
import RegisterReturnScreen from "../screens/admin/games/RegisterReturnScreen";
import LoanHistoryScreen from "../screens/admin/games/LoanHistoryScreen";

// Admin — Printing
import RegisterPrintScreen from "../screens/admin/printing/RegisterPrintScreen";
import PrintHistoryAdminScreen from "../screens/admin/printing/PrintHistoryAdminScreen";

// Admin — Products
import RegisterSaleScreen from "../screens/admin/products/RegisterSaleScreen";
import CashRegisterScreen from "../screens/admin/products/CashRegisterScreen";
import InventoryProductScreen from "../screens/admin/products/InventoryProductScreen";
import SalesReportScreen from "../screens/admin/products/SalesReportScreen";

// Admin — Users
import UsersAdminScreen from "../screens/admin/users/UsersAdminScreen";

// Admin — Cubículos
import CubiculosManagerScreen from "../screens/admin/cubiculos/CubiculosManagerScreen";

// Admin — Attendance
import AttendanceScreen from "../screens/admin/attendance/AttendanceScreen";
import AttendanceHistoryScreen from "../screens/admin/attendance/AttendanceHistoryScreen";

// Admin — QR Codes
import QrCodesScreen from "../screens/admin/qrcodes/QrCodesScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const PURPLE = "#5C35D9";

const headerStyle = {
  backgroundColor: "#fff",
  elevation: 0,
  shadowOpacity: 0,
  borderBottomWidth: 1,
  borderBottomColor: "#F0EEFF",
};

const headerTintColor = "#1a1a2e";

function HeaderActions() {
  const logout = useAuthStore((s) => s.logout);
  const clearCubiculo = useCubiculoStore((s) => s.clearCubiculo);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginRight: 8,
      }}
    >
      <TouchableOpacity onPress={clearCubiculo} style={{ padding: 4 }}>
        <MaterialCommunityIcons
          name="office-building-outline"
          size={22}
          color={PURPLE}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={logout} style={{ padding: 4 }}>
        <MaterialCommunityIcons name="logout" size={22} color="#E53935" />
      </TouchableOpacity>
    </View>
  );
}

function HeaderCluster({ children }: { children?: React.ReactNode }) {
  return (
    <View style={styles.headerCluster}>
      {children}
      <HeaderActions />
    </View>
  );
}

function AdminBadge() {
  return (
    <View style={styles.adminBadge}>
      <Text style={styles.adminBadgeText}>ADMIN</Text>
    </View>
  );
}

const stackScreenOptions = {
  headerStyle,
  headerTintColor,
  headerTitleStyle: { fontWeight: "700" as const, fontSize: 16 },
  headerRight: () => <HeaderActions />,
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Inventory"
        component={InventoryScreen}
        options={({ navigation }) => ({
          title: "Juegos",
          headerRight: () => (
            <HeaderCluster>
              <TouchableOpacity
                onPress={() => navigation.navigate("QrCodes")}
                style={styles.headerIconBtn}
              >
                <MaterialCommunityIcons
                  name="qrcode"
                  size={20}
                  color={PURPLE}
                />
              </TouchableOpacity>
            </HeaderCluster>
          ),
        })}
      />
      <Stack.Screen
        name="RegisterLoan"
        component={RegisterLoanScreen}
        options={{ title: "Registrar Préstamo" }}
      />
      <Stack.Screen
        name="RegisterReturn"
        component={RegisterReturnScreen}
        options={{ title: "Devoluciones" }}
      />
      <Stack.Screen
        name="LoanHistory"
        component={LoanHistoryScreen}
        options={{ title: "Historial de Préstamos" }}
      />
      <Stack.Screen
        name="RegisterPrint"
        component={RegisterPrintScreen}
        options={({ navigation }) => ({
          title: "Registrar Impresión",
          headerRight: () => (
            <HeaderCluster>
              <TouchableOpacity
                onPress={() => navigation.navigate("PrintHistoryAdmin")}
                style={styles.headerPillBtn}
              >
                <MaterialCommunityIcons
                  name="history"
                  size={16}
                  color={PURPLE}
                />
                <Text style={styles.headerPillBtnText}>Historial</Text>
              </TouchableOpacity>
            </HeaderCluster>
          ),
        })}
      />
      <Stack.Screen
        name="PrintHistoryAdmin"
        component={PrintHistoryAdminScreen}
        options={{ title: "Historial de Impresiones" }}
      />
      <Stack.Screen
        name="InventoryProduct"
        component={InventoryProductScreen}
        options={{ title: "Productos" }}
      />
      <Stack.Screen
        name="RegisterSale"
        component={RegisterSaleScreen}
        options={({ navigation }) => ({
          title: "Registrar Venta",
          headerRight: () => (
            <HeaderCluster>
              <TouchableOpacity
                onPress={() => navigation.navigate("CashRegister")}
                style={styles.headerPillBtn}
              >
                <MaterialCommunityIcons
                  name="cash-register"
                  size={16}
                  color={PURPLE}
                />
                <Text style={styles.headerPillBtnText}>Caja</Text>
              </TouchableOpacity>
            </HeaderCluster>
          ),
        })}
      />
      <Stack.Screen
        name="CashRegister"
        component={CashRegisterScreen}
        options={{ title: "Caja" }}
      />
      <Stack.Screen
        name="SalesReport"
        component={SalesReportScreen}
        options={{ title: "Reporte de Ventas" }}
      />
      <Stack.Screen
        name="QrCodes"
        component={QrCodesScreen}
        options={{ title: "Códigos QR" }}
      />
      <Stack.Screen
        name="UsersAdmin"
        component={UsersAdminScreen}
        options={{ title: "Usuarios" }}
      />
      <Stack.Screen
        name="CubiculosAdmin"
        component={CubiculosManagerScreen}
        options={{ title: "Cubículos" }}
      />
    </Stack.Navigator>
  );
}

function AttendanceAdminStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{ title: "Asistencia" }}
      />
      <Stack.Screen
        name="AttendanceHistory"
        component={AttendanceHistoryScreen}
        options={{ title: "Historial" }}
      />
    </Stack.Navigator>
  );
}

export default function AdminNavigator() {
  const cubiculo = useCubiculoStore((s) => s.selectedCubiculo);
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.student_id === SUPER_ADMIN_ID;

  const gamesOn = cubiculo?.games_enabled !== false;
  const printOn = cubiculo?.printing_enabled !== false;
  const productsOn = cubiculo?.products_enabled !== false;
  const hasServiceTabs = isSuperAdmin || gamesOn || printOn || productsOn;

  if (!hasServiceTabs) {
    const logout = useAuthStore.getState().logout;
    const clearCubiculo = useCubiculoStore.getState().clearCubiculo;
    return (
      <View style={styles.noServices}>
        <MaterialCommunityIcons
          name="store-off-outline"
          size={52}
          color="#ccc"
        />
        <Text style={styles.noServicesText}>
          Este cubículo no tiene servicios activos.
        </Text>
        <TouchableOpacity
          onPress={clearCubiculo}
          style={[
            styles.logoutInline,
            { backgroundColor: "#EEE9FF", marginBottom: 12 },
          ]}
        >
          <Text style={[styles.logoutInlineText, { color: PURPLE }]}>
            Cambiar cubículo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={logout} style={styles.logoutInline}>
          <Text style={styles.logoutInlineText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: PURPLE,
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#F0EEFF",
          borderTopWidth: 1,
          height: 66,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            HomeTab: "view-grid-outline",
            AttendanceAdminTab: "clock-check-outline",
          };
          return (
            <MaterialCommunityIcons
              name={icons[route.name] ?? "circle"}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{ title: "Inicio" }}
      />
      <Tab.Screen
        name="AttendanceAdminTab"
        component={AttendanceAdminStack}
        options={{ title: "Asistencia" }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F5F3FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  headerPillBtnText: {
    color: PURPLE,
    fontSize: 12,
    fontWeight: "700",
  },
  adminBadge: {
    backgroundColor: "#111827",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  adminBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  noServices: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F8F7FF",
  },
  noServicesText: {
    marginTop: 16,
    fontSize: 15,
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
  },
  logoutInline: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#FFE5E5",
  },
  logoutInlineText: { color: "#C62828", fontWeight: "700" },
});
