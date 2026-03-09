import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuthStore } from "../store/useAuthStore";
import { useCubiculoStore } from "../store/useCubiculoStore";
import { SUPER_ADMIN_ID } from "../types/auth.types";

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

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const PURPLE = "#5C35D9";
const PURPLE_LIGHT = "#EEE9FF";

const headerStyle = {
  backgroundColor: "#fff",
  elevation: 0,
  shadowOpacity: 0,
  borderBottomWidth: 1,
  borderBottomColor: "#F0EEFF",
};

const headerTintColor = "#1a1a2e";

function LogoutButton() {
  const logout = useAuthStore((s) => s.logout);
  return (
    <TouchableOpacity onPress={logout} style={{ marginRight: 16, padding: 4 }}>
      <MaterialCommunityIcons name="logout" size={22} color="#E53935" />
    </TouchableOpacity>
  );
}

function AdminBadge() {
  return (
    <View style={styles.adminBadge}>
      <Text style={styles.adminBadgeText}>ADMIN</Text>
    </View>
  );
}

function GamesAdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle,
        headerTintColor,
        headerTitleStyle: { fontWeight: "700", fontSize: 16 },
        headerRight: () => <LogoutButton />,
      }}
    >
      <Stack.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{ title: "Juegos" }}
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
        options={{ title: "Historial" }}
      />
    </Stack.Navigator>
  );
}

function PrintingAdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle,
        headerTintColor,
        headerTitleStyle: { fontWeight: "700", fontSize: 16 },
        headerRight: () => <LogoutButton />,
      }}
    >
      <Stack.Screen
        name="RegisterPrint"
        component={RegisterPrintScreen}
        options={{ title: "Impresiones" }}
      />
      <Stack.Screen
        name="PrintHistoryAdmin"
        component={PrintHistoryAdminScreen}
        options={{ title: "Historial Global" }}
      />
    </Stack.Navigator>
  );
}

function ProductsAdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle,
        headerTintColor,
        headerTitleStyle: { fontWeight: "700", fontSize: 16 },
        headerRight: () => <LogoutButton />,
      }}
    >
      <Stack.Screen
        name="RegisterSale"
        component={RegisterSaleScreen}
        options={{ title: "Registrar Venta" }}
      />
      <Stack.Screen
        name="CashRegister"
        component={CashRegisterScreen}
        options={{ title: "Caja" }}
      />
      <Stack.Screen
        name="InventoryProduct"
        component={InventoryProductScreen}
        options={{ title: "Inventario" }}
      />
      <Stack.Screen
        name="SalesReport"
        component={SalesReportScreen}
        options={{ title: "Reportes" }}
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
    return (
      <View style={styles.noServices}>
        <MaterialCommunityIcons name="store-off-outline" size={52} color="#ccc" />
        <Text style={styles.noServicesText}>
          Este cubículo no tiene servicios activos.
        </Text>
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
        tabBarInactiveTintColor: "#aaa",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#F0EEFF",
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            GamesAdminTab: "dice-multiple",
            PrintingAdminTab: "printer",
            ProductsAdminTab: "cart",
            UsersAdminTab: "account-group",
            CubiculosAdminTab: "office-building-cog",
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
      {cubiculo?.games_enabled !== false && (
        <Tab.Screen
          name="GamesAdminTab"
          component={GamesAdminStack}
          options={{ title: "Juegos" }}
        />
      )}
      {cubiculo?.printing_enabled !== false && (
        <Tab.Screen
          name="PrintingAdminTab"
          component={PrintingAdminStack}
          options={{ title: "Impresiones" }}
        />
      )}
      {cubiculo?.products_enabled !== false && (
        <Tab.Screen
          name="ProductsAdminTab"
          component={ProductsAdminStack}
          options={{ title: "Ventas" }}
        />
      )}
      {isSuperAdmin && (
        <Tab.Screen
          name="UsersAdminTab"
          component={UsersAdminScreen}
          options={{
            title: "Usuarios",
            headerShown: true,
            headerStyle,
            headerTintColor: "#1a1a2e",
            headerTitleStyle: { fontWeight: "700", fontSize: 16 },
            headerRight: () => <LogoutButton />,
          }}
        />
      )}
      {isSuperAdmin && (
        <Tab.Screen
          name="CubiculosAdminTab"
          component={CubiculosManagerScreen}
          options={{
            title: "Cubículos",
            headerShown: true,
            headerStyle,
            headerTintColor: "#1a1a2e",
            headerTitleStyle: { fontWeight: "700", fontSize: 16 },
            headerRight: () => <LogoutButton />,
          }}
        />
      )}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
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
