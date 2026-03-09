import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../store/useAuthStore";
import { extractApiErrorMessage } from "../../utils/apiError";

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({
        type: "error",
        text1: "Campos requeridos",
        text2: "Ingresa tu correo y contraseña.",
      });
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      const msg = extractApiErrorMessage(
        err,
        "Credenciales incorrectas. Intenta de nuevo.",
      );
      Toast.show({ type: "error", text1: "Error de acceso", text2: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        {/* Logo / Title */}
        <View style={styles.logoWrap}>
          <MaterialCommunityIcons name="domain" size={40} color={PURPLE} />
        </View>
        <Text style={styles.title}>Cubículo Estudiantil</Text>
        <Text style={styles.subtitle}>Inicia sesión para continuar</Text>

        {/* Email */}
        <Text style={styles.label}>Correo</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="matricula@alm.buap.mx"
          placeholderTextColor="#aaa"
          editable={!loading}
        />

        {/* Password */}
        <Text style={styles.label}>Contraseña</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="••••••••"
            placeholderTextColor="#aaa"
            editable={!loading}
            onSubmitEditing={handleLogin}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword((v) => !v)}
          >
            <MaterialCommunityIcons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#888"
            />
          </TouchableOpacity>
        </View>

        {/* Forgot password */}
        <TouchableOpacity
          onPress={() => navigation.navigate("ForgotPassword")}
          style={styles.forgotLink}
          disabled={loading}
        >
          <Text style={styles.forgotLinkText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons
                name="login"
                size={18}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.btnText}>Entrar</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Register link */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Register")}
          style={styles.registerLink}
          disabled={loading}
        >
          <Text style={styles.registerLinkText}>
            ¿No tienes cuenta?{" "}
            <Text style={{ color: PURPLE, fontWeight: "700" }}>
              Crear cuenta
            </Text>
          </Text>
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
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  logo: { textAlign: "center", fontSize: 48, marginBottom: 8 },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#EEE9FF",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 14,
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
    fontSize: 14,
    color: "#888",
    marginBottom: 24,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#444", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#222",
    backgroundColor: "#fafafa",
    marginBottom: 16,
  },
  btn: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  registerLink: { marginTop: 18, alignItems: "center" },
  registerLinkText: { fontSize: 14, color: "#888" },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#fafafa",
    marginBottom: 4,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#222",
  },
  eyeBtn: { paddingHorizontal: 12 },
  forgotLink: { alignSelf: "flex-end", marginBottom: 16, marginTop: 6 },
  forgotLinkText: { fontSize: 13, color: PURPLE, fontWeight: "600" },
});
