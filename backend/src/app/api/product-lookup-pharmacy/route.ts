import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get("barcode");

  if (!barcode) {
    return NextResponse.json(
      { error: "Barcode é obrigatório" },
      { status: 400 }
    );
  }

  try {
    console.log("[product-lookup] Buscando:", barcode);
    
    // 1. Tenta MercadoLibre Brasil
    let product = await searchMercadoLibre(barcode);
    if (product) {
      console.log("[product-lookup] ✓ Encontrou no MercadoLibre");
      return NextResponse.json({ success: true, product });
    }

    // 2. Tenta farmácias brasileiras
    console.log("[product-lookup] Tentando farmácias...");
    product = await searchPharmacies(barcode);
    if (product) {
      console.log("[product-lookup] ✓ Encontrou em farmácia");
      return NextResponse.json({ success: true, product });
    }

    return NextResponse.json({ success: false, message: "Produto não encontrado" });
  } catch (error) {
    console.error("[product-lookup] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar produto", success: false },
      { status: 500 }
    );
  }
}

async function searchMercadoLibre(barcode: string): Promise<any> {
  try {
    console.log("[ML] Buscando:", barcode);
    const res = await fetch(
      `https://api.mercadolibre.com/sites/MLB/search?q=${barcode}&limit=1`,
      { headers: { "User-Agent": "ValidadeApp/1.0" } }
    );

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.results?.length) return null;

    const item = data.results[0];
    return {
      nome: item.title,
      imagem: item.thumbnail || item.pictures?.[0]?.url,
      marca: item.brand,
      preco: item.price,
      fonte: "MercadoLibre",
    };
  } catch (e) {
    console.log("[ML] Error:", e);
    return null;
  }
}

async function searchPharmacies(barcode: string): Promise<any> {
  const farmacies = [
    { name: "drogaraia", url: "drogaraia.com.br" },
    { name: "drogasil", url: "drogasil.com.br" },
    { name: "consultaremedios", url: "consultaremedios.com.br" },
    { name: "drogariaspacheco", url: "drogariaspacheco.com.br" },
    { name: "ultrafarma", url: "ultrafarma.com.br" },
    { name: "paguemenos", url: "paguemenos.com.br" },
  ];

  for (const farm of farmacies) {
    try {
      console.log(`[${farm.name}] Buscando...`);
      const query = `${barcode} site:${farm.url}`;
      const res = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`,
        { headers: { "User-Agent": "ValidadeApp/1.0" } }
      );

      if (!res.ok) continue;
      const data = await res.json();

      if (data.AbstractTitle && data.AbstractTitle !== "error" && data.AbstractTitle.length > 2) {
        console.log(`[${farm.name}] Encontrou:`, data.AbstractTitle);
        return {
          nome: data.AbstractTitle,
          imagem: data.Image,
          fonte: farm.name,
        };
      }
    } catch (e) {
      console.log(`[${farm.name}] Error:`, e);
    }
  }

  return null;
}
