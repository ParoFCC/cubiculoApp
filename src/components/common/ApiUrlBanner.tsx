/**
 * API server indicator — visible in all builds.
 * Tap  → Alert with current URL (copies to clipboard).
 * Long-press → choose between available servers; change applies immediately.
 */
import React from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Clipboard,
  Alert,
} from "react-native";
import { useServerStore, SERVERS } from "../../store/useServerStore";

export function ApiUrlBanner() {
  const { serverId, setServer } = useServerStore();
  const server = SERVERS.find((s) => s.id === serverId) ?? SERVERS[0];

  const handlePress = () => {
    Clipboard.setString(server.url);
    Alert.alert("API URL", `${server.label}\n${server.url}\n\nCopiado al portapapeles.`);
  };

  const handleLongPress = () => {
    const options = SERVERS.map((s) => ({
      text: `${s.id === serverId ? "✓ " : ""}${s.label} — ${s.url}`,
      onPress: () => {
        setServer(s.id);
        Alert.alert("Servidor cambiado", `Ahora apuntando a:\n${s.url}`);
      },
    }));
    Alert.alert(
      "Seleccionar servidor",
      "El cambio aplica de inmediato sin reiniciar la app.",
      [...options, { text: "Cancelar", style: "cancel" as const }],
    );
  };

  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: server.color }]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
      delayLongPress={600}
    >
      <Text style={[styles.label, { color: server.textColor }]}>
        {server.label}
      </Text>
      <Text style={[styles.url, { color: server.textColor }]} numberOfLines={1}>
        {server.url}
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
  label: {
    fontWeight: "700",
    fontSize: 11,
  },
  url: {
    fontSize: 10,
    flex: 1,
  },
});
