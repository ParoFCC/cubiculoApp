import React from "react";
import { Text, StyleSheet, Animated, TouchableOpacity, Alert } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNetworkStore } from "../../store/useNetworkStore";

export function OfflineBanner() {
  const isOffline = useNetworkStore((s) => s.isOffline);
  const lastError = useNetworkStore((s) => s.lastError);
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: isOffline ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline, opacity]);

  if (!isOffline) return null;

  return (
    <Animated.View style={[styles.banner, { opacity }]}>
      <TouchableOpacity
        style={styles.inner}
        onPress={() =>
          Alert.alert(
            "Sin conexión",
            `No se pudo conectar al servidor.\nCódigo: ${lastError ?? "desconocido"}\nServidor: ${require("../../services/api").BASE_URL}`,
          )
        }
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="wifi-off" size={14} color="#fff" />
        <Text style={styles.text}>Sin conexión — toca para más info</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#991b1b",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 6,
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
