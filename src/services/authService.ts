import { Platform } from "react-native";
import { USE_MOCK_AUTH, AUTH_API_BASE_URL } from "../constants";
import { mockAuthApi } from "./authServiceMock";

export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthTokens {
  accessToken: string;
  user: User;
}

interface ApiError {
  detail: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = "Erro de conexão";
    try {
      const errorBody: ApiError = await response.json();
      detail = errorBody.detail || `Erro ${response.status}`;
    } catch {
      detail = `Erro ${response.status}`;
    }
    throw new Error(detail);
  }
  return response.json();
}

function getBaseUrl(): string {
  if (__DEV__ && Platform.OS === "web") {
    return "http://localhost:8000";
  }
  return AUTH_API_BASE_URL;
}

const realAuthApi = {
  async signup(name: string, email: string, password: string): Promise<AuthTokens> {
    const response = await fetch(`${getBaseUrl()}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    return handleResponse<AuthTokens>(response);
  },

  async login(email: string, password: string): Promise<AuthTokens> {
    const response = await fetch(`${getBaseUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<AuthTokens>(response);
  },

  async googleAuth(idToken: string): Promise<AuthTokens> {
    const response = await fetch(`${getBaseUrl()}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
    });
    return handleResponse<AuthTokens>(response);
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await fetch(`${getBaseUrl()}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return handleResponse<{ message: string }>(response);
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await fetch(`${getBaseUrl()}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: newPassword }),
    });
    return handleResponse<{ message: string }>(response);
  },

  async getMe(accessToken: string): Promise<User> {
    const response = await fetch(`${getBaseUrl()}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return handleResponse<User>(response);
  },
};

export const authApi = USE_MOCK_AUTH ? mockAuthApi : realAuthApi;
