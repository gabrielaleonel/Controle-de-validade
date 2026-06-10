import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { Platform, ActivityIndicator, View, StyleSheet } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";
import { requestNotificationPermissions } from "../src/services/notifications";

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    requestNotificationPermissions().catch(() => {});
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "login" || segments[0] === "signup" || segments[0] === "forgot-password";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="index" />
      <Stack.Screen name="add-product" />
      <Stack.Screen name="edit-product/[id]" />
      <Stack.Screen name="details/[id]" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

function useWebCssReset() {
  useEffect(() => {
    if (Platform.OS !== "web") return;
    try {
      const global = globalThis as any;
      const doc = global.document;
      if (!doc || !doc.head) return;
      const id = "validade-web-reset";
      if (doc.getElementById(id)) return;
      const style = doc.createElement("style");
      style.id = id;
      style.textContent = `
        html, body, #root { height: 100%; margin: 0; padding: 0; }
        *, *::before, *::after { box-sizing: border-box; }
        body { -webkit-font-smoothing: antialiased; }
        input, textarea, button { font-family: inherit; }
      `;
      doc.head.appendChild(style);
    } catch {}
  }, []);
}

export default function RootLayout() {
  useWebCssReset();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
});
