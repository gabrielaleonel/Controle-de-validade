import { Linking } from "react-native";
import { ProductWithStatus } from "../types";
import { getSettings } from "./database";
import { isValidEmail } from "../utils";
import { STATUS_LABELS } from "../constants";

const BACKEND_URL = "https://backend-vert-six.vercel.app/api/send-email";

export async function sendExpiryAlertEmail(
  products: ProductWithStatus[]
): Promise<boolean> {
  const settings = await getSettings();
  if (!settings.email || !isValidEmail(settings.email)) return false;

  const emailData = buildEmailContent(settings.email, products);
  if (!emailData) return false;

  const sent = await sendViaBackend(emailData);
  if (sent) return true;

  if (settings.resendApiKey) {
    const sent2 = await sendViaResend(settings.resendApiKey, emailData);
    if (sent2) return true;
  }

  return sendViaMailTo(emailData);
}

function buildEmailContent(
  to: string,
  products: ProductWithStatus[]
): { to: string; subject: string; body: string } | null {
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR");

  const productList = products
    .map((p, i) => {
      const daysText =
        p.diasRestantes < 0
          ? `Vencido há ${Math.abs(p.diasRestantes)} dia(s)`
          : p.diasRestantes === 0
          ? "Vence hoje"
          : `Vence em ${p.diasRestantes} dia(s)`;
      return `${i + 1}. ${p.nome} - ${STATUS_LABELS[p.status]} - ${daysText}`;
    })
    .join("\n");

  const subject = "Alerta de Vencimento - Validade";
  const body = [
    "Olá,",
    "",
    `Segue o resumo dos produtos próximos ao vencimento em ${dateStr}:`,
    "",
    productList || "Nenhum produto próximo do vencimento.",
    "",
    "---",
    "App Validade - Controle de validade de produtos",
  ].join("\n");

  return { to, subject, body };
}

async function sendViaBackend(emailData: {
  to: string;
  subject: string;
  body: string;
}): Promise<boolean> {
  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: emailData.to, subject: emailData.subject, text: emailData.body }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function sendViaResend(
  apiKey: string,
  emailData: { to: string; subject: string; body: string }
): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Validade <onboarding@resend.dev>",
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.body,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function sendViaMailTo(emailData: {
  to: string;
  subject: string;
  body: string;
}): Promise<boolean> {
  try {
    const url = `mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
