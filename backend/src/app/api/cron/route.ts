import { NextResponse } from "next/server";
import { validateEnv } from "../../../lib/env";
import { checkExpirations } from "../../../jobs/checkExpirations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const env = validateEnv();

    const isDev = process.env.NODE_ENV === "development";
    if (!isDev) {
      const authHeader = request.headers.get("authorization");
      const expectedToken = `Bearer ${env.cronSecret}`;

      if (!authHeader || authHeader !== expectedToken) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const slot = searchParams.get("slot");

    if (!slot) {
      return NextResponse.json(
        { error: "Parâmetro 'slot' é obrigatório (morning, afternoon, evening)" },
        { status: 400 }
      );
    }

    const result = await checkExpirations(slot);

    return NextResponse.json({ slot, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
