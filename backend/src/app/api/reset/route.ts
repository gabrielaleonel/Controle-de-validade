import { getDb } from "../../../db";
import { products, emailLogs } from "../../../db/schema";

export async function DELETE() {
  try {
    const db = getDb();

    // Delete all logs and products for clean slate
    await db.delete(emailLogs);
    await db.delete(products);

    return Response.json({
      message: "Dados deletados com sucesso",
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
