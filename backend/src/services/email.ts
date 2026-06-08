import { Resend } from "resend";
import { validateEnv } from "../lib/env";
import { getTemplate } from "./template";

export interface EmailPayload {
  to: string;
  productName: string;
  expirationDate: string;
  daysRemaining: number;
}

export async function sendExpirationEmail(
  payload: EmailPayload
): Promise<{ success: boolean; error?: string }> {
  const env = validateEnv();
  const resend = new Resend(env.resendApiKey);

  const { html, text } = getTemplate({
    productName: payload.productName,
    expirationDate: payload.expirationDate,
    daysRemaining: payload.daysRemaining,
    appName: env.appName,
    appUrl: env.appUrl,
  });

  try {
    const result = await resend.emails.send({
      from: env.emailFrom,
      to: payload.to,
      subject: `${payload.productName} — vence em ${payload.daysRemaining} dia(s)`,
      html,
      text,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido no envio";
    return { success: false, error: message };
  }
}
