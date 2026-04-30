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
import type {
  StudentGamesStackParamList,
  StudentPrintingStackParamList,
  StudentProductsStackParamList,
} from "./types";

const Tab = createBottomTabNavigator();

const GamesStackNav = createNativeStackNavigator<StudentGamesStackParamList>();
const PrintingStackNav =
  createNativeStackNavigator<StudentPrintingStackParamList>();
const ProductsStackNav =
  createNativeStackNavigator<StudentProductsStackParamList>();

const PURPLE = "#5C35D9";

const headerStyle = {
  backgroundColor: "#fff",
  elevation: 0,
  shadowOpacity: 0,
  borderBottomWidth: 1,
  borderBottomColor: "#F0EEFF",
};

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

const sharedScreenOptions = {
  headerStyle,
  headerTintColor: "#1a1a2e",
  headerTitleStyle: { fontWeight: "700" as const, fontSize: 16 },
  headerRight: () => <HeaderActions />,
};

function GamesStack() {
  return (
    <GamesStackNav.Navigator screenOptions={sharedScreenOptions}>
      <GamesStackNav.Screen
        name="GameCatalog"
        component={GameCatalogScreen}
        options={{ title: "Juegos" }}
      />
      <GamesStackNav.Screen
        name="GameDetail"
        component={GameDetailScreen}
        options={{ title: "Detalle" }}
      />
      <GamesStackNav.Screen
        name="RequestLoan"
        component={RequestLoanScreen}
        options={{ title: "Solicitar Préstamo" }}
      />
    </GamesStackNav.Navigator>
  );
}

function PrintingStack() {
  return (
    <PrintingStackNav.Navigator screenOptions={sharedScreenOptions}>
      <PrintingStackNav.Screen
        name="PrintBalance"
        component={PrintBalanceScreen}
        options={{ title: "Mis Impresiones" }}
      />
      <PrintingStackNav.Screen
        name="PrintHistory"
        component={PrintHistoryScreen}
        options={{ title: "Historial" }}
      />
    </PrintingStackNav.Navigator>
  );
}

function ProductsStack() {
  return (
    <ProductsStackNav.Navigator screenOptions={sharedScreenOptions}>
      <ProductsStackNav.Screen
        name="ProductCatalog"
        component={ProductCatalogScreen}
        options={{ title: "Tienda" }}
      />
    </ProductsStackNav.Navigator>
  );
}

export default function StudentNavigator() {
  const cubiculo = useCubiculoStore((s) => s.selectedCubiculo);
  const logout = useAuthStore((s) => s.logout);
  const clearCubiculo = useCubiculoStore((s) => s.clearCubiculo);

  const gamesOn = cubiculo?.games_enabled !== false;
  const printOn = cubiculo?.printing_enabled !== false;
  const productsOn = cubiculo?.products_enabled !== false;

  if (!gamesOn && !printOn && !productsOn) {
    return (
      <View style={styles.noServices}>
        <Text style={styles.noServicesText}>
          Este cubículo no tiene servicios activos para estudiantes.
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
