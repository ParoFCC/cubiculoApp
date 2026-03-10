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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Toast.show({
        type: "error",
        text1: "Campos requeridos",
        text2: "Ingresa tu matrícula y contraseña.",
      });
      return;
    }
    const raw = username.trim().toLowerCase();
    const fullEmail = raw;
    setLoading(true);
    try {
      await login(fullEmail, password);
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
        {/* Branded header strip */}
        <View style={styles.headerStrip}>
          <View style={styles.headerIconWrap}>
            <MaterialCommunityIcons name="domain" size={32} color="#fff" />
          </View>
          <Text style={styles.headerAppName}>CubiculoApp</Text>
          <Text style={styles.headerInst}>BUAP · Cubículo Estudiantil</Text>
        </View>

        <Text style={styles.title}>Bienvenido de vuelta</Text>
        <Text style={styles.subtitle}>Inicia sesión para continuar</Text>

        {/* Email */}
        <Text style={styles.label}>Matrícula o correo</Text>
        <View style={styles.emailRow}>
          <TextInput
            style={styles.emailInput}
            value={username}
            onChangeText={setUsername}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="matricula o correo completo"
            placeholderTextColor="#aaa"
            editable={!loading}
            returnKeyType="next"
          />
        </View>

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
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  headerStrip: {
    backgroundColor: PURPLE,
    paddingVertical: 24,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  headerIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  headerAppName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headerInst: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 3,
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
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 4,
    marginTop: 24,
    paddingHorizontal: 28,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 14,
    color: "#888",
    marginBottom: 24,
    paddingHorizontal: 28,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444",
    marginBottom: 4,
    paddingHorizontal: 28,
  },
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
    marginHorizontal: 28,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#fafafa",
    marginBottom: 16,
    marginHorizontal: 28,
  },
  emailInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#222",
  },
  emailSuffix: {
    fontSize: 14,
    color: "#888",
    paddingRight: 12,
    fontWeight: "500",
  },
  btn: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginHorizontal: 28,
    marginBottom: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  registerLink: { marginTop: 14, marginBottom: 24, alignItems: "center" },
  registerLinkText: { fontSize: 14, color: "#888" },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#fafafa",
    marginBottom: 4,
    marginHorizontal: 28,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#222",
  },
  eyeBtn: { paddingHorizontal: 12 },
  forgotLink: {
    alignSelf: "flex-end",
    marginBottom: 16,
    marginTop: 6,
    marginHorizontal: 28,
  },
  forgotLinkText: { fontSize: 13, color: PURPLE, fontWeight: "600" },
});
