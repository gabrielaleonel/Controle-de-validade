import { User, AuthTokens } from "./authService";

const MOCK_USER: User = {
  id: "mock-user-id-001",
  name: "Usuário Teste",
  email: "teste@email.com",
  created_at: new Date().toISOString(),
};

const MOCK_USER_GOOGLE: User = {
  id: "mock-google-id-001",
  name: "Usuário Google",
  email: "google@email.com",
  created_at: new Date().toISOString(),
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastCreatedUser: User = { ...MOCK_USER };

export const mockAuthApi = {
  async signup(name: string, email: string, password: string): Promise<AuthTokens> {
    await delay(1000);
    if (!name || !email || !password) {
      throw new Error("Todos os campos são obrigatórios");
    }
    if (password.length < 8) {
      throw new Error("Senha deve ter no mínimo 8 caracteres");
    }
    if (!email.includes("@")) {
      throw new Error("E-mail inválido");
    }
    lastCreatedUser = {
      id: "mock-" + Date.now(),
      name,
      email,
      created_at: new Date().toISOString(),
    };
    return {
      accessToken: "mock-token-signup-" + Date.now(),
      user: lastCreatedUser,
    };
  },

  async login(email: string, password: string): Promise<AuthTokens> {
    await delay(800);
    if (!email || !password) {
      throw new Error("Preencha todos os campos");
    }
    if (password.length < 8) {
      throw new Error("Senha deve ter no mínimo 8 caracteres");
    }
    if (!email.includes("@")) {
      throw new Error("E-mail inválido");
    }
    return {
      accessToken: "mock-token-login-" + Date.now(),
      user: { ...MOCK_USER, email },
    };
  },

  async googleAuth(idToken: string): Promise<AuthTokens> {
    await delay(800);
    if (!idToken) {
      throw new Error("Token do Google inválido");
    }
    return {
      accessToken: "mock-token-google-" + Date.now(),
      user: MOCK_USER_GOOGLE,
    };
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    await delay(800);
    return {
      message: "Se o e-mail estiver cadastrado, você receberá um link de recuperação",
    };
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    await delay(800);
    return { message: "Senha redefinida com sucesso" };
  },

  async getMe(accessToken: string): Promise<User> {
    await delay(300);
    if (!accessToken || accessToken === "expired") {
      throw new Error("Token inválido ou expirado");
    }
    if (accessToken.includes("google")) {
      return MOCK_USER_GOOGLE;
    }
    if (accessToken.includes("signup")) {
      return lastCreatedUser;
    }
    return MOCK_USER;
  },
};
