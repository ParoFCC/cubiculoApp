import React, { useEffect, useState } from "react";
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
import { useRoute } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { printingService } from "../../../services/printingService";
import { usersService } from "../../../services/usersService";
import { User } from "../../../types/auth.types";
import { extractApiErrorMessage } from "../../../utils/apiError";
import { PrintBalance } from "../../../types/printing.types";

export default function RegisterPrintScreen() {
  const routeParams = useRoute<any>().params as
    | { preselectedStudentId?: string }
    | undefined;
  const [studentId, setStudentId] = useState("");
  const [pages, setPages] = useState("");
  const [loading, setLoading] = useState(false);
  const [studentInfo, setStudentInfo] = useState<User | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [hasLookupResult, setHasLookupResult] = useState(false);
  const [balance, setBalance] = useState<PrintBalance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [lastResult, setLastResult] = useState<{
    type: "free" | "paid";
    pages: number;
    cost: number;
    studentId: string;
  } | null>(null);

  const lookupStudent = async (id: string) => {
    const normalizedId = id.trim().toLowerCase();
    if (!normalizedId) {
      setStudentInfo(null);
      setBalance(null);
      setHasLookupResult(false);
      return;
    }
    setLookingUp(true);
    setLoadingBalance(true);
    setHasLookupResult(false);
    try {
      const [userResult, balanceResult] = await Promise.allSettled([
        usersService.lookupByStudentId(normalizedId),
        printingService.getStudentBalance(normalizedId),
      ]);

      setStudentInfo(userResult.status === "fulfilled" ? userResult.value : null);
      setBalance(balanceResult.status === "fulfilled" ? balanceResult.value : null);
    } finally {
      setLoadingBalance(false);
      setLookingUp(false);
      setHasLookupResult(true);
    }
  };

  const handleStudentIdChange = (value: string) => {
    setStudentId(value);
    setStudentInfo(null);
    setBalance(null);
    setHasLookupResult(false);
  };

  useEffect(() => {
    if (routeParams?.preselectedStudentId) {
      setStudentId(routeParams.preselectedStudentId);
      lookupStudent(routeParams.preselectedStudentId);
    }
  }, [routeParams?.preselectedStudentId]);

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
        studentId: studentId.trim().toLowerCase(),
      });
      setStudentId("");
      setPages("");
      setStudentInfo(null);
      setBalance(null);
      setHasLookupResult(false);
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

  const parsedPages = parseInt(pages, 10);
  const previewPages = Number.isNaN(parsedPages) ? 0 : parsedPages;
  const freeRemaining = balance?.free_remaining ?? 0;
  const freeUsedPreview = Math.min(freeRemaining, Math.max(previewPages, 0));
  const paidPagesPreview = Math.max(previewPages - freeUsedPreview, 0);
  const estimatedTotal = paidPagesPreview * 0.5;

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
              {lastResult.studentId} · {" "}
              {lastResult.pages} página{lastResult.pages !== 1 ? "s" : ""} —{" "}
              {lastResult.type === "free"
                ? "Sin costo"
                : `$${lastResult.cost.toFixed(2)}`}
            </Text>
          </View>
        )}

        <Text style={styles.label}>ID del Estudiante</Text>
        <TextInput
          style={styles.input}
          value={studentId}
          onChangeText={handleStudentIdChange}
          onBlur={() => lookupStudent(studentId)}
          placeholder="Ej: be202300001"
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
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
                Se tomará la matrícula para controlar saldo y costo de esta impresión.
              </Text>
            </View>
          </View>
        )}
        {!lookingUp && hasLookupResult && !!studentId.trim() && (
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <MaterialCommunityIcons
                name="printer-check"
                size={18}
                color={PURPLE}
              />
              <Text style={styles.balanceTitle}>Saldo de impresiones</Text>
            </View>
            {loadingBalance ? (
              <View style={styles.balanceLoadingRow}>
                <ActivityIndicator size="small" color={PURPLE} />
                <Text style={styles.balanceLoadingText}>Consultando saldo...</Text>
              </View>
            ) : balance ? (
              <>
                <View style={styles.balanceStatsRow}>
                  <View style={styles.balanceStatBox}>
                    <Text style={styles.balanceStatLabel}>Gratis restantes</Text>
                    <Text style={styles.balanceStatValue}>{balance.free_remaining}</Text>
                  </View>
                  <View style={styles.balanceStatBox}>
                    <Text style={styles.balanceStatLabel}>Saldo total</Text>
                    <Text style={styles.balanceStatValue}>{balance.free_total}</Text>
                  </View>
                </View>
                <Text style={styles.balancePeriod}>Periodo: {balance.period}</Text>
              </>
            ) : (
              <Text style={styles.balanceLoadingText}>
                No se pudo consultar el saldo para esta matrícula.
              </Text>
            )}
          </View>
        )}
        {!lookingUp && hasLookupResult && studentId.trim() && !studentInfo && !loading && (
          <Text style={styles.studentNotFound}>
            No existe un usuario con esa matrícula, pero sí puedes registrar la impresión.
          </Text>
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

        {!!studentId.trim() && previewPages > 0 && balance && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Resumen de impresión</Text>
            <Text style={styles.previewSubtitle}>
              Matrícula: {studentId.trim().toLowerCase()}
            </Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Páginas solicitadas</Text>
              <Text style={styles.previewValue}>{previewPages}</Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Se descuentan gratis</Text>
              <Text style={styles.previewValue}>{freeUsedPreview}</Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Páginas con costo</Text>
              <Text style={styles.previewValue}>{paidPagesPreview}</Text>
            </View>
            <View style={[styles.previewRow, styles.previewRowTotal]}>
              <Text style={styles.previewTotalLabel}>Total estimado</Text>
              <Text style={styles.previewTotalValue}>
                {estimatedTotal <= 0 ? "Sin costo" : `$${estimatedTotal.toFixed(2)}`}
              </Text>
            </View>
          </View>
        )}

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
    </KeyboardAvoidingView>
  );
}

const PURPLE = "#5C35D9";

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#F8F7FF", flexGrow: 1 },
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
  studentCardGuest: { backgroundColor: "#FFF7ED" },
  studentCardText: { fontSize: 13, color: "#888" },
  studentCardName: { fontSize: 14, fontWeight: "700", color: "#1a1a2e" },
  studentCardSub: { fontSize: 12, color: "#666", marginTop: 1 },
  balanceCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E9E5FF",
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  balanceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  balanceLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  balanceLoadingText: { fontSize: 13, color: "#6b7280" },
  balanceStatsRow: { flexDirection: "row", gap: 10 },
  balanceStatBox: {
    flex: 1,
    backgroundColor: "#F8F7FF",
    borderRadius: 10,
    padding: 12,
  },
  balanceStatLabel: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  balanceStatValue: { fontSize: 20, fontWeight: "800", color: PURPLE },
  balancePeriod: { fontSize: 12, color: "#6b7280", marginTop: 10 },
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
  previewCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  previewSubtitle: { fontSize: 12, color: "#6b7280", marginBottom: 10 },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  previewRowTotal: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  previewLabel: { fontSize: 13, color: "#6b7280" },
  previewValue: { fontSize: 13, fontWeight: "700", color: "#111827" },
  previewTotalLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
  previewTotalValue: { fontSize: 16, fontWeight: "800", color: PURPLE },
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
