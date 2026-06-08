export interface EnvConfig {
  tursoDbUrl: string;
  tursoDbAuthToken: string;
  resendApiKey: string;
  cronSecret: string;
  syncApiKey: string;
  emailFrom: string;
  appUrl: string;
  appTimezone: string;
  appName: string;
}

export function validateEnv(): EnvConfig {
  const required = [
    "TURSO_DB_URL",
    "RESEND_API_KEY",
    "CRON_SECRET",
    "EMAIL_FROM",
    "APP_TIMEZONE",
  ] as const;

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias ausentes: ${missing.join(", ")}`
    );
  }

  return {
    tursoDbUrl: process.env.TURSO_DB_URL!,
    tursoDbAuthToken: process.env.TURSO_DB_AUTH_TOKEN ?? "",
    resendApiKey: process.env.RESEND_API_KEY!,
    cronSecret: process.env.CRON_SECRET!,
    syncApiKey: process.env.SYNC_API_KEY ?? "",
    emailFrom: process.env.EMAIL_FROM!,
    appUrl: process.env.APP_URL ?? "",
    appTimezone: process.env.APP_TIMEZONE!,
    appName: process.env.APP_NAME ?? "Validade",
  };
}
