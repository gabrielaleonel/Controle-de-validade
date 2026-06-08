import { getDb } from "../../../db";
import { emailLogs } from "../../../db/schema";

export async function GET() {
  try {
    const db = getDb();

    const logs = await db
      .select()
      .from(emailLogs);

    return Response.json({
      totalLogs: logs.length,
      logs: logs,
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
