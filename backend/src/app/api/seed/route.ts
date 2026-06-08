import { getDb } from "../../../db";
import { products } from "../../../db/schema";
import { getTodayInTimezone } from "../../../lib/dateUtils";
import { validateEnv } from "../../../lib/env";

export async function POST() {
  try {
    const db = getDb();
    const env = validateEnv();

    // Get today's date in the configured timezone
    const todayStr = getTodayInTimezone(env.appTimezone);
    const today = new Date(todayStr + "T00:00:00");

    // Create test products with different expiration dates
    const testProducts = [
      {
        externalId: 1001,
        nome: "Leite Integral - Vence em 2 dias",
        codigoBarras: "7891000100101",
        dataVencimento: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        observacoes: "Produto de teste - vence em 2 dias",
        deviceUuid: "test-device-001",
        userEmail: "leonismo097@gmail.com",
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      },
      {
        externalId: 1002,
        nome: "Iogurte Natural - Vence em 5 dias",
        codigoBarras: "7891000100102",
        dataVencimento: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        observacoes: "Produto de teste - vence em 5 dias",
        deviceUuid: "test-device-001",
        userEmail: "leonismo097@gmail.com",
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      },
      {
        externalId: 1003,
        nome: "Queijo Meia Cura - Vence em 7 dias",
        codigoBarras: "7891000100103",
        dataVencimento: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        observacoes: "Produto de teste - vence em 7 dias",
        deviceUuid: "test-device-002",
        userEmail: "leonismo097@gmail.com",
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      },
      {
        externalId: 1004,
        nome: "Manteiga - Vence em 10 dias (fora da janela)",
        codigoBarras: "7891000100104",
        dataVencimento: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        observacoes: "Produto de teste - vence em 10 dias",
        deviceUuid: "test-device-002",
        userEmail: "leonismo097@gmail.com",
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      },
    ];

    // Insert test products
    const insertedProducts = await db
      .insert(products)
      .values(testProducts)
      .returning();

    return Response.json({
      message: "Produtos de teste inseridos com sucesso!",
      count: insertedProducts.length,
      products: insertedProducts,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
