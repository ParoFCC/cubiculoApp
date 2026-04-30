/**
 * API URL indicator — visible in all builds so users can confirm which server they're hitting.
 * Tap to copy the URL and show an alert.
 */
import React from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Clipboard,
  Alert,
} from "react-native";
import { BASE_URL } from "../../services/api";

export function ApiUrlBanner() {
  const isProd = BASE_URL.includes("castelancarpinteyro");

  const handlePress = () => {
    Clipboard.setString(BASE_URL);
    Alert.alert("API URL", BASE_URL);
  };

  return (
    <TouchableOpacity
      style={[styles.banner, isProd ? styles.bannerProd : styles.bannerLocal]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Text style={styles.label}>{isProd ? "🟢 PROD" : "🟡 LOCAL"}</Text>
      <Text style={styles.url} numberOfLines={1}>
        {BASE_URL}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 8,
  },
  bannerProd: { backgroundColor: "#14532d" },
  bannerLocal: { backgroundColor: "#78350f" },
  label: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
  },
  url: {
    color: "#d1fae5",
    fontSize: 10,
    flex: 1,
  },
});
