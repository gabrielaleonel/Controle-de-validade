import React, { useState, useCallback } from "react";
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
import PasswordInput from "../src/components/ui/PasswordInput";
import Button from "../src/components/ui/Button";
import GoogleAuthButton from "../src/components/ui/GoogleAuthButton";

const loginSchema = z.object({
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function validate(): boolean {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string | undefined> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace("/");
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Falha ao entrar");
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleSuccess = useCallback(async (idToken: string) => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle(idToken);
      router.replace("/");
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Falha ao autenticar com Google");
    } finally {
      setGoogleLoading(false);
    }
  }, [signInWithGoogle, router]);

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
                name="shield-check-outline"
                size={40}
                color="#1565C0"
              />
            </View>
            <Text style={styles.title}>Bem-vindo ao Validade</Text>
            <Text style={styles.subtitle}>
              Controle a validade dos seus produtos de forma simples e
              organizada
            </Text>
          </View>

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
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              error={errors.email}
            />

            <PasswordInput
              label="Senha"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              error={errors.password}
              placeholder="Sua senha"
            />

            <Button
              title="Entrar"
              onPress={handleLogin}
              loading={loading}
              style={styles.primaryButton}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleAuthButton
              title="Entrar com Google"
              onSuccess={handleGoogleSuccess}
              loading={googleLoading}
            />

            <View style={styles.links}>
              <Button
                title="Esqueci minha senha"
                variant="outline"
                onPress={() => router.push("/forgot-password")}
                style={styles.linkButton}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Não tem uma conta?</Text>
            <Button
              title="Criar conta"
              variant="outline"
              onPress={() => router.push("/signup")}
              style={styles.signupButton}
            />
          </View>
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
    fontSize: 26,
    fontWeight: "700",
    color: "#212121",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#757575",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
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
  primaryButton: {
    marginTop: 4,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    color: "#9E9E9E",
  },
  links: {
    marginTop: 16,
  },
  linkButton: {
    width: "100%",
  },
  footer: {
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 15,
    color: "#757575",
    marginBottom: 12,
  },
  signupButton: {
    width: "100%",
  },
});
