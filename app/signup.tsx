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

const signupSchema = z
  .object({
    name: z.string().min(1, "Nome é obrigatório"),
    email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
    password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Senhas não conferem",
    path: ["confirmPassword"],
  });

export default function SignupScreen() {
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function validate(): boolean {
    const result = signupSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
    });
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

  async function handleSignup() {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp(name, email, password);
      router.replace("/");
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Falha ao criar conta");
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
                name="account-plus-outline"
                size={40}
                color="#1565C0"
              />
            </View>
            <Text style={styles.title}>Criar Conta</Text>
            <Text style={styles.subtitle}>
              Crie sua conta e comece a controlar as validades dos seus
              produtos
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Nome"
              leftIcon="account-outline"
              placeholder="Seu nome"
              autoCapitalize="words"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) {
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              error={errors.name}
            />

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
              placeholder="Mínimo 8 caracteres"
            />

            <PasswordInput
              label="Confirmar Senha"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) {
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }
              }}
              error={errors.confirmPassword}
              placeholder="Repita a senha"
            />

            <Button
              title="Criar conta"
              onPress={handleSignup}
              loading={loading}
              style={styles.primaryButton}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleAuthButton
              title="Cadastrar com Google"
              onSuccess={handleGoogleSuccess}
              loading={googleLoading}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Já tem uma conta?</Text>
            <Button
              title="Fazer login"
              variant="outline"
              onPress={() => router.push("/login")}
              style={styles.loginButton}
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
    marginBottom: 28,
    marginTop: 20,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
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
  footer: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 15,
    color: "#757575",
    marginBottom: 12,
  },
  loginButton: {
    width: "100%",
  },
});
