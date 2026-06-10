import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { z } from "zod";
import { useAuth } from "../src/contexts/AuthContext";
import Input from "../src/components/ui/Input";
import Button from "../src/components/ui/Button";

const forgotSchema = z.object({
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
});

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function validate(): boolean {
    const result = forgotSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return false;
    }
    setError("");
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      const message = await forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Falha ao enviar recuperação");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <MaterialCommunityIcons
                name="lock-reset"
                size={40}
                color="#1565C0"
              />
            </View>
            <Text style={styles.title}>Recuperar Senha</Text>
            <Text style={styles.subtitle}>
              Digite seu e-mail e enviaremos um link para redefinir sua senha
            </Text>
          </View>

          {sent ? (
            <View style={styles.successCard}>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={56}
                color="#388E3C"
              />
              <Text style={styles.successTitle}>E-mail enviado!</Text>
              <Text style={styles.successText}>
                Se o e-mail estiver cadastrado, você receberá um link de
                recuperação em breve. Verifique sua caixa de entrada.
              </Text>
              <Button
                title="Voltar para o login"
                onPress={() => router.push("/login")}
                style={styles.backButton}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <Input
                label="E-mail"
                leftIcon="email-outline"
                placeholder="seu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError("");
                }}
                error={error}
              />

              <Button
                title="Enviar link de recuperação"
                onPress={handleSubmit}
                loading={loading}
                style={styles.submitButton}
              />

              <View style={styles.backLink}>
                <Button
                  title="Voltar para o login"
                  variant="outline"
                  onPress={() => router.push("/login")}
                  style={styles.backLinkButton}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#212121",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
    maxWidth: 300,
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  submitButton: {
    marginTop: 4,
  },
  backLink: {
    marginTop: 16,
  },
  backLinkButton: {
    width: "100%",
  },
  successCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#212121",
    marginTop: 16,
  },
  successText: {
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  backButton: {
    width: "100%",
    marginTop: 24,
  },
});
