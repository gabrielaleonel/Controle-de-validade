import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { products, emailLogs } from "../db/schema";
import { getDaysRemaining, isWithinAlertWindow } from "../lib/dateUtils";
import { sendExpirationEmail } from "../services/email";
import { getSlotConfig, isValidSlot } from "../services/slots";
import { validateEnv } from "../lib/env";
import type { CheckResult, SlotName } from "../types";

function nowISO(): string {
  return new Date().toISOString();
}

export async function checkExpirations(
  slot: string
): Promise<CheckResult> {
  const db = getDb();
  const result: CheckResult = {
    attempted: 0,
    sent: 0,
    duplicateIgnored: 0,
    businessRuleIgnored: 0,
    failed: 0,
    totalEligible: 0,
  };

  if (!isValidSlot(slot)) {
    throw new Error(`Slot inválido: "${slot}". Use morning, afternoon ou evening.`);
  }

  const env = validateEnv();
  const slots = getSlotConfig();

  const allProducts = await db
    .select()
    .from(products)
    .where(isNull(products.deletadoEm));

  const eligible: typeof allProducts = [];
  for (const product of allProducts) {
    const daysRemaining = getDaysRemaining(product.dataVencimento, env.appTimezone);
    if (isWithinAlertWindow(daysRemaining)) {
      eligible.push(product);
    }
  }

  result.totalEligible = eligible.length;

  for (const product of eligible) {
    const daysRemaining = getDaysRemaining(product.dataVencimento, env.appTimezone);

    if (!product.userEmail) {
      await db.insert(emailLogs).values({
        productId: product.id,
        deviceUuid: product.deviceUuid,
        userEmail: "",
        daysRemaining,
        slot: slot as SlotName,
        alertType: "expiration_warning",
        status: "business_rule_ignored",
        errorMessage: "Usuário sem e-mail cadastrado",
        attemptedAt: nowISO(),
      });
      result.businessRuleIgnored++;
      continue;
    }

    const existing = await db
      .select({ id: emailLogs.id })
      .from(emailLogs)
      .where(
        and(
          eq(emailLogs.productId, product.id),
          eq(emailLogs.daysRemaining, daysRemaining),
          eq(emailLogs.slot, slot),
          eq(emailLogs.alertType, "expiration_warning")
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db.insert(emailLogs).values({
        productId: product.id,
        deviceUuid: product.deviceUuid,
        userEmail: product.userEmail,
        daysRemaining,
        slot: slot as SlotName,
        alertType: "expiration_warning",
        status: "duplicate_ignored",
        attemptedAt: nowISO(),
      });
      result.duplicateIgnored++;
      continue;
    }

    result.attempted++;

    const { success, error } = await sendExpirationEmail({
      to: product.userEmail,
      productName: product.nome,
      expirationDate: product.dataVencimento,
      daysRemaining,
    });

    if (success) {
      await db.insert(emailLogs).values({
        productId: product.id,
        deviceUuid: product.deviceUuid,
        userEmail: product.userEmail,
        daysRemaining,
        slot: slot as SlotName,
        alertType: "expiration_warning",
        status: "sent",
        attemptedAt: nowISO(),
        sentAt: nowISO(),
      });
      result.sent++;
    } else {
      await db.insert(emailLogs).values({
        productId: product.id,
        deviceUuid: product.deviceUuid,
        userEmail: product.userEmail,
        daysRemaining,
        slot: slot as SlotName,
        alertType: "expiration_warning",
        status: "failed",
        errorMessage: error ?? "Erro desconhecido",
        attemptedAt: nowISO(),
      });
      result.failed++;
    }
  }

  return result;
}
