import { NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { products } from "../../../db/schema";
import { validateEnv } from "../../../lib/env";
import type { SyncRequest, SyncResponse } from "../../../types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const db = getDb();
    const env = validateEnv();

    const authHeader = request.headers.get("authorization");
    const expectedToken = `Bearer ${env.syncApiKey}`;

    if (!authHeader || authHeader !== expectedToken) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = (await request.json()) as SyncRequest;

    if (!body.deviceUuid || !body.userEmail || !Array.isArray(body.products)) {
      return NextResponse.json(
        { error: "Payload inválido. Esperado: { deviceUuid, userEmail, products[] }" },
        { status: 400 }
      );
    }

    let inserted = 0;
    let updated = 0;

    for (const p of body.products) {
      const existing = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.externalId, p.id),
            eq(products.deviceUuid, body.deviceUuid)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(products)
          .set({
            nome: p.nome,
            codigoBarras: p.codigoBarras,
            dataVencimento: p.dataVencimento,
            observacoes: p.observacoes,
            userEmail: body.userEmail,
            atualizadoEm: p.atualizadoEm,
            deletadoEm: p.deletadoEm ?? null,
          })
          .where(eq(products.id, existing[0].id));
        updated++;
      } else {
        await db.insert(products).values({
          externalId: p.id,
          nome: p.nome,
          codigoBarras: p.codigoBarras,
          dataVencimento: p.dataVencimento,
          observacoes: p.observacoes,
          deviceUuid: body.deviceUuid,
          userEmail: body.userEmail,
          criadoEm: p.criadoEm,
          atualizadoEm: p.atualizadoEm,
          deletadoEm: p.deletadoEm ?? null,
        });
        inserted++;
      }
    }

    const syncedIds = body.products.map((p) => p.id);
    const notInSync = await db
      .select({ id: products.id, externalId: products.externalId })
      .from(products)
      .where(
        and(
          eq(products.deviceUuid, body.deviceUuid),
          isNull(products.deletadoEm)
        )
      );

    let deleted = 0;
    for (const remote of notInSync) {
      if (!syncedIds.includes(remote.externalId)) {
        await db
          .update(products)
          .set({ deletadoEm: new Date().toISOString() })
          .where(eq(products.id, remote.id));
        deleted++;
      }
    }

    const response: SyncResponse = { inserted, updated, deleted };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
