import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { TouchableOpacity, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { requestNotificationPermissions } from "../src/services/notifications";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    requestNotificationPermissions().catch(() => {});
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="add-product" />
      <Stack.Screen name="edit-product/[id]" />
      <Stack.Screen name="details/[id]" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
