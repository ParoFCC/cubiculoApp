import * as React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Toast from "react-native-toast-message";
import { useNavigation, useRoute } from "@react-navigation/native";
import { authService } from "../../services/authService";
import { storage } from "../../utils/storage";
import { useAuthStore } from "../../store/useAuthStore";
import { extractApiErrorMessage } from "../../utils/apiError";

export default function VerifyEmailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { name, email, password, student_id, period } = route.params;

  const [code, setCode] = React.useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [countdown, setCountdown] = React.useState(60);
  const inputs = React.useRef<TextInput[]>([]);

  React.useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleDigit = (value: string, index: number) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < 5) inputs.current[index + 1]?.focus();
    if (!digit && index > 0) inputs.current[index - 1]?.focus();
    // Auto-submit when all filled
    if (digit && next.every((d) => d !== "") && index === 5) {
      handleVerify(next.join(""));
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const codeStr = fullCode ?? code.join("");
    if (codeStr.length < 6) {
      Toast.show({
        type: "error",
        text1: "Código incompleto",
        text2: "Ingresa los 6 dígitos.",
      });
      return;
    }
    setLoading(true);
    try {
      const tokens = await authService.verifyEmail({
        name,
        email,
        password,
        student_id,
        period,
        code: codeStr,
      });
      storage.setTokens(tokens.access_token, tokens.refresh_token);
      const user = await authService.me();
      useAuthStore.setState({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: extractApiErrorMessage(err, "Código incorrecto o expirado."),
      });
      setCode(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authService.register({ name, email, password, student_id, period });
      setCountdown(60);
      Toast.show({
        type: "success",
        text1: "Código enviado",
        text2: `Revisa tu correo ${email}`,
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: extractApiErrorMessage(err, "No se pudo reenviar."),
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.emoji}>📧</Text>
        <Text style={styles.title}>Verifica tu correo</Text>
        <Text style={styles.subtitle}>
          Ingresa el código de 6 dígitos enviado a{"\n"}
          <Text style={styles.email}>{email}</Text>
        </Text>

        <View style={styles.codeRow}>
          {code.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => {
                if (r) inputs.current[i] = r;
              }}
              style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
              value={digit}
              onChangeText={(v) => handleDigit(v, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!loading}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.btn,
            (loading || code.some((d) => !d)) && styles.btnDisabled,
          ]}
          onPress={() => handleVerify()}
          disabled={loading || code.some((d) => !d)}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Verificar y crear cuenta</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendRow}>
          {countdown > 0 ? (
            <Text style={styles.resendWait}>Reenviar en {countdown}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              {resending ? (
                <ActivityIndicator size="small" color={PURPLE} />
              ) : (
                <Text style={styles.resendLink}>
                  ¿No llegó? Reenviar código
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backLink}
        >
          <Text style={styles.backLinkText}>← Cambiar correo</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const PURPLE = "#5C35D9";

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F0EEFF",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emoji: { fontSize: 48, marginBottom: 10 },
  title: { fontSize: 22, fontWeight: "700", color: "#1a1a2e", marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  email: { fontWeight: "700", color: PURPLE },
  codeRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  codeInput: {
    width: 46,
    height: 56,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a2e",
    backgroundColor: "#fafafa",
  },
  codeInputFilled: { borderColor: PURPLE, backgroundColor: "#F0EEFF" },
  btn: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  resendRow: { marginTop: 16 },
  resendWait: { color: "#999", fontSize: 13 },
  resendLink: { color: PURPLE, fontSize: 13, fontWeight: "600" },
  backLink: { marginTop: 14 },
  backLinkText: { color: "#888", fontSize: 13 },
});
