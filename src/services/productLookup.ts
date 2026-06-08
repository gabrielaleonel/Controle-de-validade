import { API_BASE_URL, BARCODE_LOOKUP_API } from "../constants";
import { ProductLookupResult } from "../types";

const PRODUCT_LOOKUP_BACKEND_URL = `${API_BASE_URL}/api/product-lookup-pharmacy`;

export async function lookupProductByBarcode(
  barcode: string
): Promise<ProductLookupResult | null> {
  const cleanBarcode = barcode.replace(/\D/g, "");

  console.log("[productLookup] Código recebido:", cleanBarcode);

  if (!/^\d{8,14}$/.test(cleanBarcode)) {
    console.log("[productLookup] Código inválido:", cleanBarcode);
    return null;
  }

  const backendResult = await lookupPharmacyBackend(cleanBarcode);
  if (backendResult) {
    return backendResult;
  }

  const eanResult = await lookupEanSearch(cleanBarcode);
  if (eanResult) {
    return eanResult;
  }

  const upcResult = await lookupUPCItemDB(cleanBarcode);
  if (upcResult) {
    return upcResult;
  }

  const openFoodResult = await lookupOpenFoodFacts(cleanBarcode);
  if (openFoodResult) {
    return openFoodResult;
  }

  const duckResult = await lookupDuckDuckGo(cleanBarcode);
  if (duckResult) {
    return duckResult;
  }

  console.log("[productLookup] Nenhum resultado encontrado");
  return null;
}

async function lookupPharmacyBackend(
  barcode: string
): Promise<ProductLookupResult | null> {
  try {
    const url = `${PRODUCT_LOOKUP_BACKEND_URL}?barcode=${encodeURIComponent(
      barcode
    )}`;

    console.log("[productLookup] Chamando backend:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    console.log("[productLookup] Status backend:", response.status);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    console.log("[productLookup] Resposta backend:", data);

    if (!data.success || !data.product?.nome) {
      return null;
    }

    return {
      nome: data.product.nome,
      imagem: data.product.imagem || undefined,
      marca: data.product.marca || undefined,
    };
  } catch (error) {
    console.log("[productLookup] Erro ao chamar backend:", error);
    return null;
  }
}

async function lookupEanSearch(
  barcode: string
): Promise<ProductLookupResult | null> {
  try {
    const response = await fetch(
      `https://www.ean-search.org/api/1/json?barcode=${barcode}&key=test`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "ValidadeApp/1.0",
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (!data.name || data.name === "error") return null;

    return {
      nome: data.name || data.title,
      imagem: data.image || undefined,
      marca: data.brand || undefined,
    };
  } catch {
    return null;
  }
}

async function lookupUPCItemDB(
  barcode: string
): Promise<ProductLookupResult | null> {
  try {
    const response = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "ValidadeApp/1.0",
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (data.code !== "OK" || !data.items?.length) return null;

    const item = data.items[0];

    return {
      nome: item.title || item.description,
      marca: item.brand || undefined,
      imagem: item.images?.[0] || undefined,
    };
  } catch {
    return null;
  }
}

async function lookupOpenFoodFacts(
  barcode: string
): Promise<ProductLookupResult | null> {
  try {
    const response = await fetch(`${BARCODE_LOOKUP_API}/${barcode}.json`, {
      headers: {
        "User-Agent": "ValidadeApp/1.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (data.status === 0 || !data.product) return null;

    const product = data.product;
    const nome = product.product_name || product.product_name_en;

    if (!nome) return null;

    return {
      nome,
      marca: product.brands || undefined,
      imagem:
        product.image_url ||
        product.image_front_url ||
        product.image_small_url ||
        undefined,
    };
  } catch {
    return null;
  }
}

async function lookupDuckDuckGo(
  barcode: string
): Promise<ProductLookupResult | null> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(
        `${barcode} medicamento comprar`
      )}&format=json&no_html=1&skip_disambig=1`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const nome = data.AbstractTitle || data.Heading || "";

    if (!nome) return null;

    return { nome, imagem: data.Image || undefined };
  } catch {
    return null;
  }
}
