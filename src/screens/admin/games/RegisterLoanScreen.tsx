import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Switch,
} from "react-native";
import Toast from "react-native-toast-message";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { gamesService } from "../../../services/gamesService";
import { usersService } from "../../../services/usersService";
import { Game } from "../../../types/games.types";
import { User } from "../../../types/auth.types";
import QRScannerModal from "../../../components/QRScannerModal";
import { extractApiErrorMessage } from "../../../utils/apiError";

export default function RegisterLoanScreen() {
  const navigation = useNavigation<any>();
  const routeParams = useRoute<any>().params as
    | {
        preselectedGame?: Game;
        game_id?: string;
        preselectedStudentId?: string;
      }
    | undefined;

  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(
    routeParams?.preselectedGame ?? null,
  );
  const [studentId, setStudentId] = useState("");
  const [studentInfo, setStudentInfo] = useState<User | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [hasLookupResult, setHasLookupResult] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGames, setLoadingGames] = useState(true);
  const [piecesComplete, setPiecesComplete] = useState(true);

  useEffect(() => {
    gamesService
      .getCatalog()
      .then((data) => {
        const available = data.filter((g) => g.quantity_avail > 0);
        setGames(available);
        // Handle deep link: game_id param (UUID string from cubiculoapp://loan?game_id=<uuid>)
        if (routeParams?.game_id && !routeParams.preselectedGame) {
          const found = data.find((g) => g.id === routeParams.game_id);
          if (found) setSelectedGame(found);
        }
      })
      .finally(() => setLoadingGames(false));
  }, []);

  useEffect(() => {
    if (routeParams?.preselectedStudentId) {
      setStudentId(routeParams.preselectedStudentId);
      lookupStudent(routeParams.preselectedStudentId);
    }
  }, [routeParams?.preselectedStudentId]);

  const lookupStudent = async (id: string) => {
    const normalizedId = id.trim().toLowerCase();
    if (!normalizedId) {
      setStudentInfo(null);
      setHasLookupResult(false);
      return;
    }
    setLookingUp(true);
    setHasLookupResult(false);
    try {
      const user = await usersService.lookupByStudentId(normalizedId);
      setStudentInfo(user);
    } catch {
      setStudentInfo(null);
    } finally {
      setLookingUp(false);
      setHasLookupResult(true);
    }
  };

  const handleQRScan = (value: string) => {
    setShowQR(false);
    const id = value.trim();
    setStudentId(id);
    lookupStudent(id);
  };

  const handleRegister = async () => {
    if (!selectedGame) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Selecciona un juego.",
      });
      return;
    }
    if (!studentId.trim()) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Ingresa el ID del estudiante.",
      });
      return;
    }
    setLoading(true);
    try {
      await gamesService.registerLoan(
        studentId.trim(),
        selectedGame.id,
        piecesComplete,
      );
      Toast.show({
        type: "success",
        text1: "Préstamo registrado",
        text2: `${selectedGame.name} prestado con éxito.`,
      });
      setTimeout(() => navigation.goBack(), 1500);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: extractApiErrorMessage(err, "No se pudo registrar."),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionLabel}>ID del Estudiante</Text>
      {/* Input row + QR button */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, styles.inputFlex]}
          value={studentId}
          onChangeText={(v) => {
            setStudentId(v);
            setStudentInfo(null);
            setHasLookupResult(false);
          }}
          onBlur={() => lookupStudent(studentId)}
          placeholder="Ej: be202300001"
          placeholderTextColor="#aaa"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.qrBtn} onPress={() => setShowQR(true)}>
          <MaterialCommunityIcons name="qrcode-scan" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Student info preview */}
      {lookingUp && (
        <View style={styles.studentCard}>
          <ActivityIndicator size="small" color={PURPLE} />
          <Text style={styles.studentCardText}>Buscando...</Text>
        </View>
      )}
      {!lookingUp && studentInfo && (
        <View style={[styles.studentCard, styles.studentCardFound]}>
          <MaterialCommunityIcons
            name="account-check"
            size={20}
            color="#22C55E"
          />
          <View>
            <Text style={styles.studentCardName}>{studentInfo.name}</Text>
            <Text style={styles.studentCardSub}>{studentInfo.email}</Text>
          </View>
        </View>
      )}
      {!lookingUp && hasLookupResult && !studentInfo && !!studentId.trim() && (
        <View style={[styles.studentCard, styles.studentCardGuest]}>
          <MaterialCommunityIcons
            name="account-question"
            size={20}
            color="#D97706"
          />
          <View>
            <Text style={styles.studentCardName}>Alumno no registrado</Text>
            <Text style={styles.studentCardSub}>
              Se usará la matrícula para registrar el préstamo y la devolución.
            </Text>
          </View>
        </View>
      )}
      {!lookingUp && hasLookupResult && studentId.trim() && !studentInfo && (
        <Text style={styles.studentNotFound}>
          No existe un usuario con esa matrícula, pero sí puedes registrar el
          préstamo.
        </Text>
      )}

      <Text style={styles.sectionLabel}>Seleccionar Juego</Text>

      {selectedGame && (
        <View style={styles.selectedGameBanner}>
          <MaterialCommunityIcons
            name="gamepad-variant"
            size={18}
            color={PURPLE}
          />
          <Text style={styles.selectedGameBannerText}>{selectedGame.name}</Text>
          <TouchableOpacity onPress={() => setSelectedGame(null)}>
            <MaterialCommunityIcons
              name="close-circle-outline"
              size={18}
              color="#9ca3af"
            />
          </TouchableOpacity>
        </View>
      )}

      {loadingGames ? (
        <ActivityIndicator color={PURPLE} style={{ marginVertical: 20 }} />
      ) : (
        games.map((game) => (
          <TouchableOpacity
            key={game.id}
            style={[
              styles.gameRow,
              selectedGame?.id === game.id && styles.gameRowSelected,
            ]}
            onPress={() => setSelectedGame(game)}
          >
            <Text
              style={[
                styles.gameRowText,
                selectedGame?.id === game.id && styles.gameRowTextSelected,
              ]}
            >
              {game.name}{" "}
              <Text style={styles.avail}>
                ({game.quantity_avail} disponibles)
              </Text>
            </Text>
          </TouchableOpacity>
        ))
      )}

      {/* Pieces complete toggle */}
      <View style={styles.piecesRow}>
        <View style={styles.piecesLabel}>
          <MaterialCommunityIcons
            name="puzzle-check-outline"
            size={18}
            color="#374151"
          />
          <Text style={styles.piecesText}>Todas las piezas completas</Text>
        </View>
        <Switch
          value={piecesComplete}
          onValueChange={setPiecesComplete}
          trackColor={{ false: "#d1d5db", true: "#c4b5fd" }}
          thumbColor={piecesComplete ? PURPLE : "#9ca3af"}
        />
      </View>
      {!piecesComplete && (
        <Text style={styles.piecesWarning}>
          ⚠️ Se registrará que el juego tiene piezas faltantes.
        </Text>
      )}

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Registrar Préstamo</Text>
        )}
      </TouchableOpacity>

      <QRScannerModal
        visible={showQR}
        onScan={handleQRScan}
        onClose={() => setShowQR(false)}
      />
    </ScrollView>
  );
}

const PURPLE = "#5C35D9";

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#F8F7FF", flexGrow: 1 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#444",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 16,
  },
  inputRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    backgroundColor: "#fff",
    color: "#222",
  },
  inputFlex: { flex: 1 },
  qrBtn: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  studentCardFound: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  studentCardGuest: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  studentCardText: { color: "#6b7280", fontSize: 13 },
  studentCardName: { fontSize: 14, fontWeight: "700", color: "#1a1a2e" },
  studentCardSub: { fontSize: 12, color: "#6b7280" },
  studentNotFound: { fontSize: 12, color: "#EF4444", marginTop: 4 },
  gameRow: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
    elevation: 1,
  },
  gameRowSelected: { borderColor: PURPLE, backgroundColor: "#EEE9FF" },
  gameRowText: { fontSize: 15, color: "#333" },
  gameRowTextSelected: { fontWeight: "700", color: PURPLE },
  avail: { color: "#888", fontWeight: "400" },
  selectedGameBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EEE9FF",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: PURPLE,
  },
  selectedGameBannerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: PURPLE,
  },
  piecesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 20,
    elevation: 1,
  },
  piecesLabel: { flexDirection: "row", alignItems: "center", gap: 8 },
  piecesText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  piecesWarning: {
    fontSize: 12,
    color: "#F59E0B",
    marginTop: 6,
    marginLeft: 2,
  },
  btn: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
