import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../store/useAuthStore";
import { useCubiculoStore } from "../store/useCubiculoStore";
import AuthNavigator from "./AuthNavigator";
import StudentNavigator from "./StudentNavigator";
import AdminNavigator from "./AdminNavigator";
import CubiculoSelectScreen from "../screens/CubiculoSelectScreen";
import LoadingOverlay from "../components/common/LoadingOverlay";

const Stack = createNativeStackNavigator();

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
    <NavigationContainer>
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
