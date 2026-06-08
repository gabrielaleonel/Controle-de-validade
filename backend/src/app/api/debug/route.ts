import { getDb } from "../../../db";
import { products, emailLogs } from "../../../db/schema";
import { getDaysRemaining, isWithinAlertWindow } from "../../../lib/dateUtils";
import { validateEnv } from "../../../lib/env";
import { isNull } from "drizzle-orm";

export async function GET() {
  try {
    const db = getDb();
    const env = validateEnv();

    // Get all products
    const allProducts = await db
      .select()
      .from(products)
      .where(isNull(products.deletadoEm));

    // Analyze each product
    const analysis = allProducts.map((product) => {
      const daysRemaining = getDaysRemaining(
        product.dataVencimento,
        env.appTimezone
      );
      const withinWindow = isWithinAlertWindow(daysRemaining);

      return {
        id: product.id,
        nome: product.nome,
        dataVencimento: product.dataVencimento,
        daysRemaining,
        withinWindow,
        userEmail: product.userEmail || "SEM EMAIL",
        deviceUuid: product.deviceUuid,
      };
    });

    // Get email logs
    const emailLogData = await db.select().from(emailLogs);

    return Response.json({
      totalProducts: allProducts.length,
      timezone: env.appTimezone,
      todayISO: new Date().toISOString(),
      products: analysis,
      eligibleForAlert: analysis.filter((p) => p.withinWindow),
      emailLogs: emailLogData.length,
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
