import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveMedicationByBarcode } from "../../../../server/medications/medication-barcode-resolver";

const querySchema = z.object({
  barcode: z
    .string()
    .min(1, "Código de barras é obrigatório")
    .regex(/^\d{8,14}$/, "Código deve ter entre 8 e 14 dígitos"),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("barcode");

  const parsed = querySchema.safeParse({ barcode: raw });
  if (!parsed.success) {
    return NextResponse.json(
      {
        found: false,
        error: "Código de barras inválido",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const barcode = parsed.data.barcode;

  try {
    const result = await resolveMedicationByBarcode(barcode);

    if (!result) {
      return NextResponse.json({
        found: false,
        barcode,
        message:
          "Medicamento não encontrado nas bases consultadas. Você pode preencher manualmente.",
      });
    }

    return NextResponse.json({
      found: true,
      barcode,
      medication: {
        name: result.name,
        dosage: result.dosage,
        form: result.form,
        imagem: result.imagem,
      },
      source: result.source,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error("[lookup-barcode] Erro interno:", error);
    return NextResponse.json(
      { found: false, error: "Erro interno ao buscar medicamento" },
      { status: 500 }
    );
  }
}
