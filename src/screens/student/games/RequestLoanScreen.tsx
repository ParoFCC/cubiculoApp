import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Toast from "react-native-toast-message";
import { useNavigation, useRoute } from "@react-navigation/native";
import { gamesService } from "../../../services/gamesService";
import { Game } from "../../../types/games.types";

export default function RequestLoanScreen() {
  const navigation = useNavigation<any>();
  const { game } = useRoute<any>().params as { game: Game };
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await gamesService.requestLoan({ game_id: game.id });
      Toast.show({
        type: "success",
        text1: "¡Listo!",
        text2: "Tu solicitud de préstamo fue registrada.",
      });
      timerRef.current = setTimeout(
        () => navigation.navigate("GameCatalog"),
        1500,
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ?? "No se pudo registrar el préstamo.";
      Toast.show({ type: "error", text1: "Error", text2: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name="hand-extended-outline"
            size={42}
            color={PURPLE}
          />
        </View>
        <Text style={styles.title}>Confirmar préstamo</Text>
        <Text style={styles.gameName}>{game.name}</Text>
        <Text style={styles.info}>
          Al confirmar, se registrará un préstamo a tu nombre. Recuerda devolver
          el juego en buen estado.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleConfirm}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={19}
              color="#fff"
              style={{ marginRight: 7 }}
            />
            <Text style={styles.btnText}>Confirmar</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelBtn}
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <Text style={styles.cancelText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}

const PURPLE = "#5C35D9";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7FF",
    padding: 24,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginBottom: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: "#EEE9FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#1a1a2e", marginBottom: 6 },
  gameName: {
    fontSize: 17,
    color: PURPLE,
    fontWeight: "600",
    marginBottom: 12,
  },
  info: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20 },
  btn: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelText: { color: "#888", fontSize: 15 },
});
