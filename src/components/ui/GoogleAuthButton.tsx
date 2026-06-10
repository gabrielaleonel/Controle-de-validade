import React, { useEffect, useCallback } from "react";
import { Alert } from "react-native";
import * as AuthSession from "expo-auth-session";
import { Ionicons } from "@expo/vector-icons";
import { USE_MOCK_AUTH } from "../../constants";
import Button from "./Button";

interface GoogleAuthButtonProps {
  onSuccess: (idToken: string) => Promise<void>;
  title?: string;
  loading?: boolean;
}

const googleDiscovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
};

export default function GoogleAuthButton({
  onSuccess,
  title = "Entrar com Google",
  loading = false,
}: GoogleAuthButtonProps) {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "validade",
    preferLocalhost: true,
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: "YOUR_GOOGLE_CLIENT_ID",
      scopes: ["openid", "profile", "email"],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      extraParams: {
        nonce: Math.random().toString(36).substring(2, 15),
      },
    },
    googleDiscovery
  );

  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.params.id_token;
      if (idToken) {
        onSuccess(idToken).catch(() => {});
      }
    }
  }, [response]);

  const handleMockPress = useCallback(async () => {
    const fakeToken = "mock-google-token-" + Date.now();
    await onSuccess(fakeToken);
  }, [onSuccess]);

  if (USE_MOCK_AUTH) {
    return (
      <Button
        title={title}
        variant="google"
        icon={<Ionicons name="logo-google" size={20} color="#3C4043" />}
        onPress={handleMockPress}
        loading={loading}
      />
    );
  }

  return (
    <Button
      title={title}
      variant="google"
      icon={
        <Ionicons name="logo-google" size={20} color="#3C4043" />
      }
      onPress={() => promptAsync()}
      loading={loading || (request === null)}
      disabled={!request}
    />
  );
}
