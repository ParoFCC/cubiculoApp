import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Image,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Toast from "react-native-toast-message";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Game } from "../../../types/games.types";

const PURPLE = "#5C35D9";
const PURPLE_LIGHT = "#EEE9FF";

function getMediaType(url: string): "image" | "video" | "youtube" | "link" {
  const lower = url.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/.test(lower)) return "image";
  if (/youtube\.com|youtu\.be/.test(lower)) return "youtube";
  if (/\.(mp4|mov|avi|webm)(\?|$)/.test(lower)) return "video";
  return "link";
}

function MediaResource({ url }: { url: string }) {
  const type = getMediaType(url);
  const openUrl = () =>
    Linking.openURL(url).catch(() =>
      Toast.show({ type: "error", text1: "No se pudo abrir el enlace" }),
    );

  if (type === "image") {
    return (
      <TouchableOpacity onPress={openUrl} activeOpacity={0.85}>
        <Image
          source={{ uri: url }}
          style={styles.previewImage}
          resizeMode="cover"
        />
        <Text style={styles.tapHint}>Toca para abrir en pantalla completa</Text>
      </TouchableOpacity>
    );
  }

  const icons: Record<string, string> = {
    youtube: "youtube",
    video: "video-outline",
    link: "link-variant",
  };
  const labels: Record<string, string> = {
    youtube: "Ver en YouTube",
    video: "Ver video",
    link: "Abrir recurso",
  };

  return (
    <TouchableOpacity
      style={styles.linkBtn}
      onPress={openUrl}
      activeOpacity={0.8}
    >
      <MaterialCommunityIcons
        name={icons[type]}
        size={20}
        color={PURPLE}
        style={{ marginRight: 8 }}
      />
      <Text style={styles.linkBtnText}>{labels[type]}</Text>
      <MaterialCommunityIcons name="open-in-new" size={15} color={PURPLE} />
    </TouchableOpacity>
  );
}

export default function GameDetailScreen() {
  const navigation = useNavigation<any>();
  const { game } = useRoute<any>().params as { game: Game };

  const handleRequest = () => {
    if (game.quantity_avail <= 0) {
      Toast.show({
        type: "error",
        text1: "Sin stock",
        text2: "Este juego no está disponible actualmente.",
      });
      return;
    }
    navigation.navigate("RequestLoan", { game });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name="dice-multiple"
            size={44}
            color={PURPLE}
          />
        </View>
        <Text style={styles.title}>{game.name}</Text>
        <View
          style={[
            styles.badge,
            game.quantity_avail > 0 ? styles.available : styles.unavailable,
          ]}
        >
          <MaterialCommunityIcons
            name={
              game.quantity_avail > 0
                ? "check-circle-outline"
                : "close-circle-outline"
            }
            size={13}
            color={game.quantity_avail > 0 ? "#16A34A" : "#EF4444"}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.badgeText,
              { color: game.quantity_avail > 0 ? "#16A34A" : "#EF4444" },
            ]}
          >
            {game.quantity_avail > 0
              ? `${game.quantity_avail} disponible${
                  game.quantity_avail !== 1 ? "s" : ""
                }`
              : "Sin stock"}
          </Text>
        </View>
      </View>

      {/* Description */}
      {game.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.body}>{game.description}</Text>
        </View>
      ) : null}

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instrucciones</Text>
        {game.instructions ? (
          <Text style={styles.body}>{game.instructions}</Text>
        ) : null}
        {game.instructions_url ? (
          <MediaResource url={game.instructions_url} />
        ) : !game.instructions ? (
          <Text style={styles.body}>No hay instrucciones disponibles.</Text>
        ) : null}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.btn, game.quantity_avail <= 0 && styles.btnDisabled]}
        onPress={handleRequest}
        activeOpacity={0.85}
        disabled={game.quantity_avail <= 0}
      >
        <MaterialCommunityIcons
          name="hand-extended-outline"
          size={20}
          color="#fff"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.btnText}>Solicitar préstamo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#F8F7FF", flexGrow: 1 },
  header: { alignItems: "center", marginBottom: 24 },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: "#EEE9FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1a1a2e",
    textAlign: "center",
    marginBottom: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  available: { backgroundColor: "#DCFCE7" },
  unavailable: { backgroundColor: "#FEE2E2" },
  badgeText: { fontSize: 13, fontWeight: "600" },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: PURPLE,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  body: { fontSize: 15, color: "#333", lineHeight: 22 },
  btn: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: "#f3f4f6",
  },
  tapHint: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 4,
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PURPLE_LIGHT,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  linkBtnText: { flex: 1, fontSize: 14, fontWeight: "700", color: PURPLE },
});
