import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "../../../../db";
import { medicationBarcodeCache } from "../../../../db/schema";
import { eq } from "drizzle-orm";

const bodySchema = z.object({
  barcode: z
    .string()
    .min(8, "Código deve ter no mínimo 8 dígitos")
    .max(14, "Código deve ter no máximo 14 dígitos")
    .regex(/^\d+$/, "Código deve conter apenas dígitos"),
  name: z.string().min(1, "Nome é obrigatório").max(200),
  dosage: z.string().max(50).optional().nullable(),
  form: z
    .enum([
      "comprimido",
      "capsula",
      "gotas",
      "ml",
      "sache",
      "ampola",
      "pomada",
      "spray",
      "outro",
    ])
    .optional()
    .nullable(),
  deviceUuid: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON inválido no corpo da requisição" },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dados inválidos",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { barcode, name, dosage, form, deviceUuid } = parsed.data;

  try {
    const db = getDb();
    const now = new Date().toISOString();

    const existing = await db
      .select()
      .from(medicationBarcodeCache)
      .where(eq(medicationBarcodeCache.barcode, barcode))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(medicationBarcodeCache)
        .set({
          name,
          dosage: dosage ?? null,
          form: form ?? null,
          confirmedBy: deviceUuid ?? existing[0].confirmedBy,
          confirmedAt: now,
          updatedAt: now,
        })
        .where(eq(medicationBarcodeCache.barcode, barcode));
    } else {
      await db.insert(medicationBarcodeCache).values({
        barcode,
        name,
        dosage: dosage ?? null,
        form: form ?? null,
        source: "manual-user-confirmed",
        confidence: 0.5,
        confirmedBy: deviceUuid ?? null,
        confirmedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[barcode-cache] Erro ao salvar:", error);
    return NextResponse.json(
      { error: "Erro interno ao salvar vínculo" },
      { status: 500 }
    );
  }
}
