import { API_BASE_URL, BARCODE_LOOKUP_API } from "../constants";
import { ProductLookupResult } from "../types";
import { getSettings } from "./database";

export async function lookupMedicationByBarcode(
  barcode: string
): Promise<ProductLookupResult | null> {
  const cleanBarcode = barcode.replace(/\s/g, "");
  if (!/^\d{8,14}$/.test(cleanBarcode)) {
    return null;
  }

  const settings = await getSettings();
  const hasGoogleConfig = !!(settings.googleApiKey && settings.googleCx);

  if (hasGoogleConfig) {
    const googleResult = await lookupGoogleCustomSearch(
      cleanBarcode,
      settings.googleApiKey!,
      settings.googleCx!
    );
    if (googleResult?.imagem) return googleResult;
    if (googleResult?.nome) return googleResult;

    const googleImageResult = await lookupGoogleImageSearch(
      cleanBarcode,
      settings.googleApiKey!,
      settings.googleCx!
    );
    if (googleImageResult?.imagem) return googleImageResult;
    if (googleImageResult?.nome) return googleImageResult;
  }

  const results = await Promise.allSettled([
    lookupPharmacyBackend(cleanBarcode),
    lookupEanSearch(cleanBarcode),
    lookupUPCItemDB(cleanBarcode),
    lookupOpenFoodFacts(cleanBarcode),
    lookupDuckDuckGo(cleanBarcode),
    lookupBarcodeLookupAPI(cleanBarcode),
  ]);

  const fulfilledResults: ProductLookupResult[] = [];

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      fulfilledResults.push(result.value);
    }
  }

  if (fulfilledResults.length === 0) return null;

  const withImage = fulfilledResults.find((r) => r.imagem);
  if (withImage) return withImage;

  return fulfilledResults[0];
}

async function lookupPharmacyBackend(
  barcode: string
): Promise<ProductLookupResult | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/product-lookup-pharmacy?barcode=${barcode}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (!data.success || !data.product?.nome) return null;

    const result: ProductLookupResult = {
      nome: data.product.nome,
    };

    if (data.product.imagem) {
      result.imagem = data.product.imagem;
    }

    if (data.product.marca) {
      result.marca = data.product.marca;
    }

    return result;
  } catch {
    return null;
  }
}

async function lookupEanSearch(barcode: string): Promise<ProductLookupResult | null> {
  try {
    const response = await fetch(
      `https://www.ean-search.org/api/1/json?barcode=${barcode}&key=test`,
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

    if (!data.name || data.name === "error") return null;

    const result: ProductLookupResult = {
      nome: data.name || data.title || "",
    };

    if (data.brand) {
      result.marca = data.brand;
    }

    if (data.image) {
      result.imagem = data.image;
    }

    return result.nome ? result : null;
  } catch {
    return null;
  }
}

async function lookupBarcodeLookupAPI(barcode: string): Promise<ProductLookupResult | null> {
  try {
    const response = await fetch(
      `https://api.barcodelookup.com/v2/products?barcode=${barcode}&key=free`,
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
    if (!data.products?.length) return null;

    const product = data.products[0];
    const nome = product.product_name || product.title || "";
    if (!nome) return null;

    const result: ProductLookupResult = { nome };

    if (product.brand) {
      result.marca = product.brand;
    }

    if (product.image_url) {
      result.imagem = product.image_url;
    }

    return result;
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
    if (!item.title && !item.description) return null;

    const result: ProductLookupResult = {
      nome: item.title || item.description,
      marca: item.brand || undefined,
    };

    if (item.images?.length > 0) {
      result.imagem = item.images[0];
    }

    return result;
  } catch {
    return null;
  }
}

async function lookupOpenFoodFacts(
  barcode: string
): Promise<ProductLookupResult | null> {
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

async function lookupDuckDuckGo(
  barcode: string
): Promise<ProductLookupResult | null> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(
        `${barcode} medicamento comprar`
      )}&format=json&no_html=1&skip_disambig=1`,
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
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(
        `${barcode} medicamento remédio`
      )}`,
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

    if (first.pagemap?.cse_thumbnail?.length > 0 && !result.imagem) {
      result.imagem = first.pagemap.cse_thumbnail[0].src;
    }

    return result.nome ? result : null;
  } catch {
    return null;
  }
}

async function lookupGoogleImageSearch(
  barcode: string,
  apiKey: string,
  cx: string
): Promise<ProductLookupResult | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&searchType=image&q=${encodeURIComponent(
        `${barcode} medicamento`
      )}`,
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

    if (first.link) {
      result.imagem = first.link;
    }

    return result.nome ? result : null;
  } catch {
    return null;
  }
}
