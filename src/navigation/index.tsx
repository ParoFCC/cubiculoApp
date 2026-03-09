import React, { useEffect } from "react";
import { NavigationContainer, LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../store/useAuthStore";
import { useCubiculoStore } from "../store/useCubiculoStore";
import AuthNavigator from "./AuthNavigator";
import StudentNavigator from "./StudentNavigator";
import AdminNavigator from "./AdminNavigator";
import CubiculoSelectScreen from "../screens/CubiculoSelectScreen";
import LoadingOverlay from "../components/common/LoadingOverlay";

const Stack = createNativeStackNavigator();

const linking: LinkingOptions<any> = {
  prefixes: ["cubiculoapp://"],
  config: {
    screens: {
      Admin: {
        screens: {
          // All operational screens live under HomeTab → HomeStack
          HomeTab: {
            screens: {
              RegisterLoan: { path: "loan" }, // cubiculoapp://loan?game_id=<uuid>
              RegisterReturn: { path: "return" }, // cubiculoapp://return
              RegisterPrint: { path: "print" }, // cubiculoapp://print
              RegisterSale: { path: "sale" }, // cubiculoapp://sale
            },
          },
          // Asistencia: cubiculoapp://attendance
          AttendanceAdminTab: {
            screens: {
              Attendance: { path: "attendance" },
            },
          },
        },
      },
    },
  },
};

export default function RootNavigator() {
  const { isAuthenticated, isLoading, user, rehydrate } = useAuthStore();
  const { selectedCubiculo, clearCubiculo } = useCubiculoStore();

  useEffect(() => {
    rehydrate();
  }, []);

  // Clear cubiculo selection when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      clearCubiculo();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <LoadingOverlay />;
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !selectedCubiculo ? (
          <Stack.Screen
            name="CubiculoSelect"
            component={CubiculoSelectScreen}
          />
        ) : user?.role === "admin" ? (
          <Stack.Screen name="Admin" component={AdminNavigator} />
        ) : (
          <Stack.Screen name="Student" component={StudentNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
