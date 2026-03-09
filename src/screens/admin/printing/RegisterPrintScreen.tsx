import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Toast from "react-native-toast-message";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { printingService } from "../../../services/printingService";
import { usersService } from "../../../services/usersService";
import { User } from "../../../types/auth.types";
import QRScannerModal from "../../../components/QRScannerModal";

export default function RegisterPrintScreen() {
  const [studentId, setStudentId] = useState("");
  const [pages, setPages] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [studentInfo, setStudentInfo] = useState<User | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lastResult, setLastResult] = useState<{
    type: "free" | "paid";
    pages: number;
    cost: number;
  } | null>(null);

  const lookupStudent = async (id: string) => {
    if (!id.trim()) {
      setStudentInfo(null);
      return;
    }
    setLookingUp(true);
    try {
      const user = await usersService.lookupByStudentId(id.trim());
      setStudentInfo(user);
    } catch {
      setStudentInfo(null);
    } finally {
      setLookingUp(false);
    }
  };

  const handleQRScan = (value: string) => {
    setShowQR(false);
    const id = value.trim();
    setStudentId(id);
    lookupStudent(id);
  };

  const handleStudentIdChange = (value: string) => {
    setStudentId(value);
    setStudentInfo(null);
  };

  const handleRegister = async () => {
    const pagesNum = parseInt(pages, 10);
    if (!studentId.trim()) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Ingresa el ID del estudiante.",
      });
      return;
    }
    if (isNaN(pagesNum) || pagesNum <= 0) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Ingresa un número válido de páginas.",
      });
      return;
    }
    setLoading(true);
    try {
      const result = await printingService.registerPrint({
        student_id: studentId.trim(),
        pages: pagesNum,
      });
      setLastResult({
        type: result.type,
        pages: result.pages,
        cost: result.cost,
      });
      setStudentId("");
      setPages("");
      setStudentInfo(null);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err?.response?.data?.detail ?? "No se pudo registrar.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {lastResult && (
          <View
            style={[
              styles.resultCard,
              lastResult.type === "free"
                ? styles.resultFree
                : styles.resultPaid,
            ]}
          >
            <Text style={styles.resultTitle}>
              {lastResult.type === "free"
                ? "✅ Impresión gratuita"
                : "💰 Impresión de pago"}
            </Text>
            <Text style={styles.resultBody}>
              {lastResult.pages} página{lastResult.pages !== 1 ? "s" : ""} —{" "}
              {lastResult.type === "free"
                ? "Sin costo"
                : `$${lastResult.cost.toFixed(2)}`}
            </Text>
          </View>
        )}

        <Text style={styles.label}>ID del Estudiante</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.inputFlex]}
            value={studentId}
            onChangeText={handleStudentIdChange}
            onBlur={() => lookupStudent(studentId)}
            placeholder="Ej: be202300001"
            placeholderTextColor="#aaa"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.qrBtn}
            onPress={() => setShowQR(true)}
            disabled={loading}
          >
            <MaterialCommunityIcons name="qrcode-scan" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        {lookingUp && (
          <View style={styles.studentCard}>
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
        {!lookingUp && studentId.trim() && !studentInfo && !loading && (
          <Text style={styles.studentNotFound}>Estudiante no encontrado</Text>
        )}

        <Text style={styles.label}>Número de Páginas</Text>
        <TextInput
          style={styles.input}
          value={pages}
          onChangeText={setPages}
          keyboardType="number-pad"
          placeholder="Ej: 5"
          placeholderTextColor="#aaa"
          editable={!loading}
        />

        <View style={styles.hint}>
          <Text style={styles.hintText}>
            💡 Primero se descuentan las páginas gratuitas. El excedente se
            cobra a $0.50/página.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Registrar Impresión</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <QRScannerModal
        visible={showQR}
        onScan={handleQRScan}
        onClose={() => setShowQR(false)}
      />
    </KeyboardAvoidingView>
  );
}

const PURPLE = "#5C35D9";

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#F8F7FF", flexGrow: 1 },
  inputRow: { flexDirection: "row", gap: 10, alignItems: "center" },
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
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
  },
  studentCardFound: { backgroundColor: "#F0FDF4" },
  studentCardText: { fontSize: 13, color: "#888" },
  studentCardName: { fontSize: 14, fontWeight: "700", color: "#1a1a2e" },
  studentCardSub: { fontSize: 12, color: "#666", marginTop: 1 },
  studentNotFound: {
    fontSize: 13,
    color: "#E53935",
    marginTop: 6,
    marginLeft: 4,
  },
  resultCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  resultFree: { backgroundColor: "#E8F5E9" },
  resultPaid: { backgroundColor: "#FFF3E0" },
  resultTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  resultBody: { fontSize: 14, color: "#555" },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#444",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 16,
  },
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
  hint: {
    backgroundColor: "#EEE9FF",
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
    marginBottom: 8,
  },
  hintText: { fontSize: 13, color: PURPLE, lineHeight: 18 },
  btn: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
