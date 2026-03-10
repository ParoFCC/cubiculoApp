import * as React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Toast from "react-native-toast-message";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { authService } from "../../services/authService";
import { extractApiErrorMessage } from "../../utils/apiError";

const PURPLE = "#5C35D9";

/** Year from numeric matrícula — first 4 digits (e.g. "202329205" → "2023") */
function extractYear(mat: string): string | null {
  const m = mat.match(/^(\d{4})/);
  return m ? m[1] : null;
}

/** Build 2-letter initials prefix from both apellidos */
function buildPrefix(paterno: string, materno: string): string {
  const p = paterno.trim()[0]?.toLowerCase() ?? "";
  const m = materno.trim()[0]?.toLowerCase() ?? "";
  return p + m;
}

/** Full student_id = initials + numeric matricula (e.g. "be" + "202329205" = "be202329205") */
function buildStudentId(paterno: string, materno: string, mat: string): string {
  return buildPrefix(paterno, materno) + mat.trim().toLowerCase();
}

type Field =
  | "nombres"
  | "apPaterno"
  | "apMaterno"
  | "matricula"
  | "email"
  | "password"
  | "confirmPassword";

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const [form, setForm] = React.useState<Record<Field, string>>({
    nombres: "",
    apPaterno: "",
    apMaterno: "",
    matricula: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [emailIsAuto, setEmailIsAuto] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const set = (key: Field) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  // ── Derived state ──────────────────────────────────────────────────
  const prefix = buildPrefix(form.apPaterno, form.apMaterno); // e.g. "be"
  const fullStudentId = buildStudentId(
    form.apPaterno,
    form.apMaterno,
    form.matricula,
  ); // e.g. "be202329205"
  const autoEmail =
    prefix.length === 2 && form.matricula.trim()
      ? `${fullStudentId}@alm.buap.mx`
      : "";
  const derivedYear = extractYear(form.matricula);
  const derivedPeriod = derivedYear ? `${derivedYear}-1` : null;

  // Matricula valid = non-empty numeric string
  const matriculaOk = /^\d{6,}$/.test(form.matricula.trim());
  const matriculaStatus: "valid" | "invalid" | "empty" = !form.matricula.trim()
    ? "empty"
    : matriculaOk
    ? "valid"
    : "invalid";

  const handleApellidoChange =
    (key: "apPaterno" | "apMaterno") => (v: string) => {
      setForm((f) => {
        const newForm = { ...f, [key]: v };
        if (emailIsAuto) {
          const p = buildPrefix(
            key === "apPaterno" ? v : f.apPaterno,
            key === "apMaterno" ? v : f.apMaterno,
          );
          const sid = p + f.matricula.trim().toLowerCase();
          newForm.email =
            p.length === 2 && f.matricula.trim()
              ? `${sid}@alm.buap.mx`
              : f.email;
        }
        return newForm;
      });
    };

  const handleMatriculaChange = (value: string) => {
    // Only allow digits
    const digits = value.replace(/\D/g, "");
    setForm((f) => {
      const sid = prefix.length === 2 ? prefix + digits : digits;
      return {
        ...f,
        matricula: digits,
        email: emailIsAuto ? (digits ? `${sid}@alm.buap.mx` : "") : f.email,
      };
    });
  };

  const handleEmailChange = (v: string) => {
    setEmailIsAuto(false);
    set("email")(v);
  };

  const handleRegister = async () => {
    const {
      nombres,
      apPaterno,
      apMaterno,
      email,
      password,
      confirmPassword,
      matricula,
    } = form;
    const fullName =
      `${nombres.trim()} ${apPaterno.trim()} ${apMaterno.trim()}`.trim();
    if (!nombres.trim() || !apPaterno.trim() || !apMaterno.trim()) {
      Toast.show({
        type: "error",
        text1: "Campos requeridos",
        text2: "Ingresa nombre(s), apellido paterno y apellido materno.",
      });
      return;
    }
    if (matriculaStatus !== "valid") {
      Toast.show({
        type: "error",
        text1: "Matrícula inválida",
        text2: "Ingresa solo los dígitos de tu matrícula (mínimo 6).",
      });
      return;
    }
    if (prefix.length < 2) {
      Toast.show({
        type: "error",
        text1: "Campos requeridos",
        text2: "Ingresa ambos apellidos para generar tu correo.",
      });
      return;
    }
    const resolvedEmail = emailIsAuto ? autoEmail : email;
    if (
      !resolvedEmail ||
      !resolvedEmail.toLowerCase().endsWith("@alm.buap.mx")
    ) {
      Toast.show({
        type: "error",
        text1: "Correo inválido",
        text2: "Solo se permiten correos @alm.buap.mx",
      });
      return;
    }
    if (!resolvedEmail.split("@")[0].toLowerCase().includes(matricula.trim())) {
      Toast.show({
        type: "error",
        text1: "Correo inválido",
        text2: "La matrícula debe estar incluida en tu correo institucional.",
      });
      return;
    }
    if (password.length < 8) {
      Toast.show({
        type: "error",
        text1: "Contraseña débil",
        text2: "La contraseña debe tener al menos 8 caracteres.",
      });
      return;
    }
    if (password !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Contraseñas no coinciden",
        text2: "Verifica que ambas contraseñas sean iguales.",
      });
      return;
    }

    const finalEmail = (emailIsAuto ? autoEmail : email).trim().toLowerCase();
    const finalStudentId = fullStudentId.trim().toLowerCase();

    setLoading(true);
    try {
      await authService.register({
        name: fullName,
        email: finalEmail,
        password,
        student_id: finalStudentId,
        period: derivedPeriod || undefined,
      });
      navigation.navigate("VerifyEmail", {
        name: fullName,
        email: finalEmail,
        password,
        student_id: finalStudentId,
        period: derivedPeriod || undefined,
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: extractApiErrorMessage(err, "No se pudo enviar el código."),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.logoWrap}>
            <MaterialCommunityIcons
              name="account-plus-outline"
              size={38}
              color={PURPLE}
            />
          </View>
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Ingresa tus datos de la BUAP</Text>

          {/* ── Section: Datos personales ── */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLine} />
            <Text style={styles.sectionLabel}>Datos personales</Text>
            <View style={styles.sectionLine} />
          </View>

          {/* ── Nombre(s) ── */}
          <Text style={styles.label}>Nombre(s)</Text>
          <TextInput
            style={styles.input}
            value={form.nombres}
            onChangeText={set("nombres")}
            placeholder="Ej: Juan Carlos"
            placeholderTextColor="#aaa"
            autoCapitalize="words"
            editable={!loading}
          />

          {/* ── Apellidos en fila ── */}
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>Apellido paterno</Text>
              <TextInput
                style={styles.input}
                value={form.apPaterno}
                onChangeText={handleApellidoChange("apPaterno")}
                placeholder="Ej: Pérez"
                placeholderTextColor="#aaa"
                autoCapitalize="words"
                editable={!loading}
              />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Apellido materno</Text>
              <TextInput
                style={styles.input}
                value={form.apMaterno}
                onChangeText={handleApellidoChange("apMaterno")}
                placeholder="Ej: López"
                placeholderTextColor="#aaa"
                autoCapitalize="words"
                editable={!loading}
              />
            </View>
          </View>

          {/* ── Matrícula (solo dígitos) ── */}
          <Text style={[styles.label, { marginTop: 2 }]}>Matrícula</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                styles.inputIconPad,
                matriculaStatus === "valid" && styles.inputValid,
                matriculaStatus === "invalid" && styles.inputError,
              ]}
              value={form.matricula}
              onChangeText={handleMatriculaChange}
              placeholder="Ej: 202300001"
              placeholderTextColor="#aaa"
              keyboardType="number-pad"
              editable={!loading}
            />
            {matriculaStatus === "valid" && (
              <Text style={styles.statusIcon}>✅</Text>
            )}
          </View>
          {matriculaStatus === "invalid" && (
            <Text style={styles.errorText}>Solo dígitos (ej: 202300001)</Text>
          )}
          {matriculaStatus === "valid" && derivedPeriod && (
            <Text style={styles.successText}>
              ✓ Período de ingreso: {derivedPeriod}
            </Text>
          )}

          {/* ── Email (iniciales de apellidos + matrícula @alm.buap.mx) ── */}
          {/* ── Section: Información de acceso ── */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLine} />
            <Text style={styles.sectionLabel}>Información de acceso</Text>
            <View style={styles.sectionLine} />
          </View>

          <View style={styles.labelRow}>
            <Text style={styles.label}>Correo institucional</Text>
            {emailIsAuto && !!autoEmail && (
              <View style={styles.autoBadge}>
                <Text style={styles.autoBadgeText}>Auto</Text>
              </View>
            )}
          </View>
          {emailIsAuto && !autoEmail && (
            <View style={styles.formulaBox}>
              <Text style={styles.formulaText}>
                {"Formato: "}
                <Text style={styles.formulaBold}>
                  {`${
                    prefix.length === 1
                      ? prefix + "?"
                      : prefix.length === 0
                      ? "??"
                      : prefix
                  }${form.matricula || "matricula"}@alm.buap.mx`}
                </Text>
              </Text>
            </View>
          )}
          <TextInput
            style={[
              styles.input,
              emailIsAuto && !!autoEmail && styles.inputAuto,
            ]}
            value={emailIsAuto ? autoEmail : form.email}
            onChangeText={handleEmailChange}
            placeholder="iniciales+matricula@alm.buap.mx"
            placeholderTextColor="#aaa"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          {/* ── Password ── */}
          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, styles.inputIconPad]}
              value={form.password}
              onChangeText={set("password")}
              secureTextEntry={!showPassword}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor="#aaa"
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirmar contraseña</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                styles.inputIconPad,
                form.confirmPassword.length > 0 &&
                form.confirmPassword === form.password
                  ? styles.inputValid
                  : form.confirmPassword.length > 0
                  ? styles.inputError
                  : null,
              ]}
              value={form.confirmPassword}
              onChangeText={set("confirmPassword")}
              secureTextEntry={!showConfirm}
              placeholder="••••••••"
              placeholderTextColor="#aaa"
              editable={!loading}
              onSubmitEditing={handleRegister}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowConfirm((v) => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.eyeIcon}>{showConfirm ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
            {form.confirmPassword.length > 0 &&
              form.confirmPassword === form.password && (
                <Text style={[styles.statusIcon, { right: 38 }]}>✅</Text>
              )}
            {form.confirmPassword.length > 0 &&
              form.confirmPassword !== form.password && (
                <Text style={[styles.statusIcon, { right: 38 }]}>❌</Text>
              )}
          </View>
          {form.confirmPassword.length > 0 &&
            form.confirmPassword !== form.password && (
              <Text style={styles.errorText}>Las contraseñas no coinciden</Text>
            )}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Enviar código de verificación</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkText}>
              ¿Ya tienes cuenta?{" "}
              <Text style={styles.loginLinkBold}>Inicia sesión</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F0EEFF" },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 28,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  logo: { textAlign: "center", fontSize: 40, marginBottom: 6 },
  logoWrap: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: "#EEE9FF",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  title: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 13,
    color: "#888",
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
    gap: 10,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: "#e5e7eb" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#444", marginBottom: 4 },
  inputWithPrefix: {
    paddingLeft: 46,
  },
  prefixBox: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 4,
    width: 44,
    backgroundColor: PURPLE,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  prefixText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 1,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#F5F2FF",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  hintIcon: { fontSize: 13 },
  hintText: { fontSize: 12, color: "#555", flex: 1, lineHeight: 17 },
  hintBold: { fontWeight: "700", color: PURPLE },
  inputWrapper: { position: "relative", justifyContent: "center" },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 4,
    justifyContent: "center",
    zIndex: 2,
  },
  eyeIcon: { fontSize: 17 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#222",
    backgroundColor: "#fafafa",
    marginBottom: 4,
  },
  inputIconPad: { paddingRight: 38 },
  inputValid: { borderColor: "#22c55e", backgroundColor: "#f0fdf4" },
  inputError: { borderColor: "#ef4444", backgroundColor: "#fef2f2" },
  inputAuto: { borderColor: PURPLE, backgroundColor: "#F5F2FF", color: PURPLE },
  statusIcon: {
    position: "absolute",
    right: 12,
    top: 12,
    fontSize: 16,
  },
  errorText: { fontSize: 11, color: "#ef4444", marginBottom: 10, marginTop: 0 },
  successText: {
    fontSize: 11,
    color: "#16a34a",
    fontWeight: "600",
    marginBottom: 10,
  },
  autoBadge: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  autoBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  formulaBox: {
    backgroundColor: "#F5F2FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  formulaText: { fontSize: 12, color: "#666" },
  formulaBold: { fontWeight: "700", color: PURPLE },
  btn: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  loginLink: { marginTop: 16, alignItems: "center" },
  loginLinkText: { fontSize: 14, color: "#888" },
  loginLinkBold: { color: PURPLE, fontWeight: "700" },
});
