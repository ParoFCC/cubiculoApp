import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuthStore } from "../store/useAuthStore";
import { useCubiculoStore } from "../store/useCubiculoStore";

// Screens — Games
import GameCatalogScreen from "../screens/student/games/GameCatalogScreen";
import GameDetailScreen from "../screens/student/games/GameDetailScreen";
import RequestLoanScreen from "../screens/student/games/RequestLoanScreen";

// Screens — Printing
import PrintBalanceScreen from "../screens/student/printing/PrintBalanceScreen";
import PrintHistoryScreen from "../screens/student/printing/PrintHistoryScreen";

// Screens — Products
import ProductCatalogScreen from "../screens/student/products/ProductCatalogScreen";

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

function LogoutButton() {
  const logout = useAuthStore((s) => s.logout);
  return (
    <TouchableOpacity onPress={logout} style={{ marginRight: 16, padding: 4 }}>
      <MaterialCommunityIcons name="logout" size={22} color="#E53935" />
    </TouchableOpacity>
  );
}

const sharedScreenOptions = {
  headerStyle,
  headerTintColor: "#1a1a2e",
  headerTitleStyle: { fontWeight: "700" as const, fontSize: 16 },
  headerRight: () => <LogoutButton />,
};

function GamesStack() {
  return (
    <Stack.Navigator screenOptions={sharedScreenOptions}>
      <Stack.Screen
        name="GameCatalog"
        component={GameCatalogScreen}
        options={{ title: "Juegos" }}
      />
      <Stack.Screen
        name="GameDetail"
        component={GameDetailScreen}
        options={{ title: "Detalle" }}
      />
      <Stack.Screen
        name="RequestLoan"
        component={RequestLoanScreen}
        options={{ title: "Solicitar Préstamo" }}
      />
    </Stack.Navigator>
  );
}

function PrintingStack() {
  return (
    <Stack.Navigator screenOptions={sharedScreenOptions}>
      <Stack.Screen
        name="PrintBalance"
        component={PrintBalanceScreen}
        options={{ title: "Mis Impresiones" }}
      />
      <Stack.Screen
        name="PrintHistory"
        component={PrintHistoryScreen}
        options={{ title: "Historial" }}
      />
    </Stack.Navigator>
  );
}

function ProductsStack() {
  return (
    <Stack.Navigator screenOptions={sharedScreenOptions}>
      <Stack.Screen
        name="ProductCatalog"
        component={ProductCatalogScreen}
        options={{ title: "Tienda" }}
      />
    </Stack.Navigator>
  );
}

export default function StudentNavigator() {
  const cubiculo = useCubiculoStore((s) => s.selectedCubiculo);
  const logout = useAuthStore((s) => s.logout);

  const gamesOn = cubiculo?.games_enabled !== false;
  const printOn = cubiculo?.printing_enabled !== false;
  const productsOn = cubiculo?.products_enabled !== false;

  if (!gamesOn && !printOn && !productsOn) {
    return (
      <View style={styles.noServices}>
        <Text style={styles.noServicesText}>
          Este cubículo no tiene servicios activos para estudiantes.
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
            GamesTab: "dice-multiple",
            PrintingTab: "printer",
            ProductsTab: "storefront",
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
          name="GamesTab"
          component={GamesStack}
          options={{ title: "Juegos" }}
        />
      )}
      {cubiculo?.printing_enabled !== false && (
        <Tab.Screen
          name="PrintingTab"
          component={PrintingStack}
          options={{ title: "Impresiones" }}
        />
      )}
      {cubiculo?.products_enabled !== false && (
        <Tab.Screen
          name="ProductsTab"
          component={ProductsStack}
          options={{ title: "Tienda" }}
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
    fontSize: 15,
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  logoutInline: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#FFE5E5",
  },
  logoutInlineText: { color: "#C62828", fontWeight: "700" },
});
