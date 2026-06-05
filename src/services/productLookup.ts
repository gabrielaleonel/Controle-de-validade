import { BARCODE_LOOKUP_API } from "../constants";
import { ProductLookupResult } from "../types";
import { getSettings } from "./database";

export async function lookupProductByBarcode(
  barcode: string
): Promise<ProductLookupResult | null> {
  const cleanBarcode = barcode.replace(/\s/g, "");
  if (!/^\d{8,14}$/.test(cleanBarcode)) {
    return null;
  }

  const settings = await getSettings();

  if (settings.googleApiKey && settings.googleCx) {
    const result = await lookupGoogleCustomSearch(cleanBarcode, settings.googleApiKey, settings.googleCx);
    if (result) return result;
  }

  const result = await lookupUPCItemDB(cleanBarcode);
  if (result) return result;

  const result2 = await lookupOpenFoodFacts(cleanBarcode);
  if (result2) return result2;

  const result3 = await lookupDuckDuckGo(cleanBarcode);
  if (result3) return result3;

  return null;
}

async function lookupUPCItemDB(barcode: string): Promise<ProductLookupResult | null> {
  try {
    const response = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
      {
        method: "GET",
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
    const result: ProductLookupResult = {
      nome: item.title || item.description || "",
      marca: item.brand || undefined,
    };

    if (item.images?.length > 0) {
      result.imagem = item.images[0];
    }

    return result.nome ? result : null;
  } catch {
    return null;
  }
}

async function lookupOpenFoodFacts(barcode: string): Promise<ProductLookupResult | null> {
  try {
    const response = await fetch(`${BARCODE_LOOKUP_API}/${barcode}.json`, {
      method: "GET",
      headers: {
        "User-Agent": "ValidadeApp/1.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.status === 0 || !data.product) return null;

    const product = data.product;
    const nome = product.product_name || product.product_name_en || "";
    if (!nome) return null;

    const result: ProductLookupResult = { nome };

    if (product.brands) {
      result.marca = product.brands;
    }

    const imageUrl =
      product.image_url ||
      product.image_front_url ||
      product.image_small_url ||
      null;
    if (imageUrl) {
      result.imagem = imageUrl;
    }

    return result;
  } catch {
    return null;
  }
}

async function lookupDuckDuckGo(barcode: string): Promise<ProductLookupResult | null> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(barcode + " product")}&format=json&no_html=1&skip_disambig=1`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const nome = data.AbstractTitle || data.Heading || "";
    if (!nome) return null;

    return { nome };
  } catch {
    return null;
  }
}

async function lookupGoogleCustomSearch(
  barcode: string,
  apiKey: string,
  cx: string
): Promise<ProductLookupResult | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(barcode + " product")}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.items?.length) return null;

    const first = data.items[0];
    const result: ProductLookupResult = {
      nome: first.title || "",
    };

    if (first.pagemap?.cse_image?.length > 0) {
      result.imagem = first.pagemap.cse_image[0].src;
    }

    return result.nome ? result : null;
  } catch {
    return null;
  }
}
