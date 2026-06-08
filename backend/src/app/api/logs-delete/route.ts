import { getDb } from "../../../db";
import { emailLogs } from "../../../db/schema";

export async function DELETE() {
  try {
    const db = getDb();

    await db.delete(emailLogs);

    return Response.json({
      message: "Todos os logs de email foram deletados",
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
