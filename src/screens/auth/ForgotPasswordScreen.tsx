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
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import { authService } from "../../services/authService";
import { extractApiErrorMessage } from "../../utils/apiError";

const PURPLE = "#5C35D9";

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [email, setEmail] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleRequestCode = async () => {
    if (!email.trim()) {
      Toast.show({ type: "error", text1: "Ingresa tu correo" });
      return;
    }
    setLoading(true);
    try {
      await authService.requestPasswordReset(email.trim().toLowerCase());
      Toast.show({
        type: "success",
        text1: "Código enviado",
        text2: "Revisa tu correo institucional.",
      });
      setStep(2);
    } catch (err: any) {
      const msg = extractApiErrorMessage(err, "No se pudo enviar el código.");
      Toast.show({ type: "error", text1: "Error", text2: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!pin.trim() || !newPassword || !confirmPassword) {
      Toast.show({ type: "error", text1: "Campos incompletos" });
      return;
    }
    if (newPassword !== confirmPassword) {
      Toast.show({ type: "error", text1: "Las contraseñas no coinciden" });
      return;
    }
    if (newPassword.length < 8) {
      Toast.show({
        type: "error",
        text1: "Contraseña muy corta",
        text2: "Mínimo 8 caracteres.",
      });
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(
        email.trim().toLowerCase(),
        pin.trim(),
        newPassword,
      );
      Toast.show({
        type: "success",
        text1: "Contraseña actualizada",
        text2: "Ya puedes iniciar sesión.",
      });
      navigation.navigate("Login");
    } catch (err: any) {
      const msg = extractApiErrorMessage(
        err,
        "No se pudo restablecer. Verifica el código.",
      );
      Toast.show({ type: "error", text1: "Error", text2: msg });
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
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (step === 2 ? setStep(1) : navigation.goBack())}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color={PURPLE}
            />
          </TouchableOpacity>

          <View style={styles.logoWrap}>
            <MaterialCommunityIcons
              name="lock-reset"
              size={36}
              color={PURPLE}
            />
          </View>
          <Text style={styles.title}>Recuperar contraseña</Text>

          {step === 1 ? (
            <>
              <Text style={styles.subtitle}>
                Ingresa tu correo institucional y te enviaremos un código de 6
                dígitos.
              </Text>

              <Text style={styles.label}>Correo institucional</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="matricula@alm.buap.mx o matricula@alumno.buap.mx"
                placeholderTextColor="#aaa"
                editable={!loading}
              />

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleRequestCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Enviar código</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>
                Ingresa el código que enviamos a{" "}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>

              <Text style={styles.label}>Código (6 dígitos)</Text>
              <TextInput
                style={styles.input}
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="123456"
                placeholderTextColor="#aaa"
                editable={!loading}
              />

              <Text style={styles.label}>Nueva contraseña</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNew}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor="#aaa"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowNew((v) => !v)}
                >
                  <MaterialCommunityIcons
                    name={showNew ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#888"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirmar contraseña</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  placeholder="Repite la contraseña"
                  placeholderTextColor="#aaa"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirm((v) => !v)}
                >
                  <MaterialCommunityIcons
                    name={showConfirm ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#888"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleReset}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Restablecer contraseña</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendLink}
                onPress={() => {
                  setPin("");
                  handleRequestCode();
                }}
                disabled={loading}
              >
                <Text style={styles.resendText}>
                  ¿No recibiste el código? Reenviar
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F5F5" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  backBtn: { marginBottom: 8, alignSelf: "flex-start" },
  logoWrap: { alignItems: "center", marginBottom: 12 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a2e",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  emailHighlight: { fontWeight: "700", color: PURPLE },
  label: { fontSize: 13, fontWeight: "600", color: "#444", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1a1a2e",
    marginBottom: 16,
    backgroundColor: "#fafafa",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#fafafa",
    marginBottom: 16,
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1a1a2e",
  },
  eyeBtn: { padding: 4 },
  btn: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  resendLink: { alignItems: "center", marginTop: 16 },
  resendText: { color: PURPLE, fontSize: 13 },
});
