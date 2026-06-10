import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import { authApi, User } from "../services/authService";

let SecureStore: { getItemAsync: (key: string) => Promise<string | null>; setItemAsync: (key: string, value: string) => Promise<void>; deleteItemAsync: (key: string) => Promise<void> } | null = null;

if (Platform.OS !== "web") {
  try {
    SecureStore = require("expo-secure-store");
  } catch {
  }
}

const TOKEN_KEY = "validade_auth_token";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function getStoredToken(): Promise<string | null> {
  if (SecureStore) {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function setStoredToken(token: string): Promise<void> {
  if (SecureStore) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
    }
  }
}

async function removeStoredToken(): Promise<void> {
  if (SecureStore) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } else {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    try {
      const token = await getStoredToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      const currentUser = await authApi.getMe(token);
      setUser(currentUser);
    } catch {
      await removeStoredToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const saveSessionAndSetUser = useCallback(async (token: string, userData: User) => {
    await setStoredToken(token);
    setUser(userData);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    await saveSessionAndSetUser(result.accessToken, result.user);
  }, [saveSessionAndSetUser]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const result = await authApi.signup(name, email, password);
    await saveSessionAndSetUser(result.accessToken, result.user);
  }, [saveSessionAndSetUser]);

  const signInWithGoogle = useCallback(async (idToken: string) => {
    const result = await authApi.googleAuth(idToken);
    await saveSessionAndSetUser(result.accessToken, result.user);
  }, [saveSessionAndSetUser]);

  const signOut = useCallback(async () => {
    await removeStoredToken();
    setUser(null);
  }, []);

  const forgotPassword = useCallback(async (email: string): Promise<string> => {
    const result = await authApi.forgotPassword(email);
    return result.message;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isLoading,
        user,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        forgotPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
