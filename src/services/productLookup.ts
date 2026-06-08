import { API_BASE_URL, BARCODE_LOOKUP_API } from "../constants";
import { ProductLookupResult } from "../types";
import { getSettings } from "./database";

const PRODUCT_LOOKUP_BACKEND_URL = `${API_BASE_URL}/api/product-lookup-pharmacy`;

export async function lookupProductByBarcode(
  barcode: string
): Promise<ProductLookupResult | null> {
  const cleanBarcode = barcode.replace(/\s/g, "");
  console.log("[productLookup] Starting lookup for barcode:", cleanBarcode);

  if (!/^\d{8,14}$/.test(cleanBarcode)) {
    console.log("[productLookup] Invalid barcode format:", barcode);
    return null;
  }

  // 1. Primeiro tenta farmácias brasileiras via backend
  console.log("[productLookup] Trying pharmacy lookup via backend...");
  const pharmacyResult = await lookupPharmacyBackend(cleanBarcode);
  if (pharmacyResult) {
    console.log(
      "[productLookup] Found via pharmacy backend:",
      pharmacyResult.nome
    );
    return pharmacyResult;
  }

  const settings = await getSettings();

  // 2. Depois tenta Google Custom Search se tiver chave
  if (settings.googleApiKey && settings.googleCx) {
    console.log("[productLookup] Trying Google Custom Search...");
    const result = await lookupGoogleCustomSearch(
      cleanBarcode,
      settings.googleApiKey,
      settings.googleCx
    );
    if (result) {
      console.log("[productLookup] Found via Google Custom Search");
      return result;
    }
  }

  // 3. Tenta APIs públicas
  const eanResult = await lookupEanSearch(cleanBarcode);
  if (eanResult) {
    console.log("[productLookup] Found via EAN Search:", eanResult.nome);
    return eanResult;
  }

  const result = await lookupUPCItemDB(cleanBarcode);
  if (result) {
    console.log("[productLookup] Found via UPC ItemDB:", result.nome);
    return result;
  }

  const result2 = await lookupOpenFoodFacts(cleanBarcode);
  if (result2) {
    console.log("[productLookup] Found via OpenFoodFacts:", result2.nome);
    return result2;
  }

  console.log("[productLookup] Product not found for barcode:", cleanBarcode);
  return null;
}

async function lookupPharmacyBackend(
  barcode: string
): Promise<ProductLookupResult | null> {
  try {
    const response = await fetch(
      `${PRODUCT_LOOKUP_BACKEND_URL}?barcode=${encodeURIComponent(barcode)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.log("[productLookup] Backend retornou erro:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("[productLookup] Resposta do backend:", data);

    if (!data.success || !data.product?.nome) {
      return null;
    }

    return {
      nome: data.product.nome,
      imagem: data.product.imagem || undefined,
      marca: data.product.marca || undefined,
    };
  } catch (error) {
    console.log("[productLookup] Erro no backend:", error);
    return null;
  }
}

async function lookupEanSearch(barcode: string): Promise<ProductLookupResult | null> {
  try {
    console.log("[productLookup] Trying EAN Search API...");
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

    if (!response.ok) {
      console.log("[productLookup] EAN Search - Response not OK:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("[productLookup] EAN Search response:", data);
    
    if (!data.name || data.name === "error") {
      console.log("[productLookup] EAN Search - Product not found");
      return null;
    }

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
  } catch (err) {
    console.log("[productLookup] EAN Search error:", err);
    return null;
  }
}

async function lookupUPCItemDB(barcode: string): Promise<ProductLookupResult | null> {
  try {
    console.log("[productLookup] Trying UPC ItemDB...");
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
    
    console.log("[productLookup] UPC ItemDB - Response status:", response.status);
    if (!response.ok) {
      console.log("[productLookup] UPC ItemDB - Not OK");
      return null;
    }

    const data = await response.json();
    console.log("[productLookup] UPC ItemDB response:", data);
    
    if (data.code !== "OK" || !data.items?.length) {
      console.log("[productLookup] UPC ItemDB - No items found");
      return null;
    }

    const item = data.items[0];
    const result: ProductLookupResult = {
      nome: item.title || item.description || "",
      marca: item.brand || undefined,
    };

    if (item.images?.length > 0) {
      result.imagem = item.images[0];
    }

    return result.nome ? result : null;
  } catch (err) {
    console.log("[productLookup] UPC ItemDB error:", err);
    return null;
  }
}

async function lookupOpenFoodFacts(barcode: string): Promise<ProductLookupResult | null> {
  try {
    console.log("[productLookup] Trying OpenFoodFacts...");
    const response = await fetch(`${BARCODE_LOOKUP_API}/${barcode}.json`, {
      method: "GET",
      headers: {
        "User-Agent": "ValidadeApp/1.0",
        Accept: "application/json",
      },
    });

    console.log("[productLookup] OpenFoodFacts - Response status:", response.status);
    if (!response.ok) {
      console.log("[productLookup] OpenFoodFacts - Not OK");
      return null;
    }

    const data = await response.json();
    if (data.status === 0 || !data.product) {
      console.log("[productLookup] OpenFoodFacts - No product");
      return null;
    }

    const product = data.product;
    const nome = product.product_name || product.product_name_en || "";
    if (!nome) {
      console.log("[productLookup] OpenFoodFacts - No name");
      return null;
    }

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
  } catch (err) {
    console.log("[productLookup] OpenFoodFacts error:", err);
    return null;
  }
}

async function lookupDuckDuckGo(barcode: string): Promise<ProductLookupResult | null> {
  try {
    console.log("[productLookup] Trying DuckDuckGo...");
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(barcode + " product")}&format=json&no_html=1&skip_disambig=1`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    console.log("[productLookup] DuckDuckGo - Response status:", response.status);
    if (!response.ok) {
      console.log("[productLookup] DuckDuckGo - Not OK");
      return null;
    }

    const data = await response.json();
    const nome = data.AbstractTitle || data.Heading || "";
    if (!nome) {
      console.log("[productLookup] DuckDuckGo - No title");
      return null;
    }

    return { nome };
  } catch (err) {
    console.log("[productLookup] DuckDuckGo error:", err);
    return null;
  }
}

async function lookupBarcodeLookupAPI(barcode: string): Promise<ProductLookupResult | null> {
  try {
    console.log("[productLookup] Trying BarCode Lookup API...");
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

    console.log("[productLookup] BarCode Lookup - Response status:", response.status);
    if (!response.ok) {
      console.log("[productLookup] BarCode Lookup - Not OK");
      return null;
    }

    const data = await response.json();
    if (!data.products?.length) {
      console.log("[productLookup] BarCode Lookup - No products");
      return null;
    }

    const product = data.products[0];
    const nome = product.product_name || product.title || "";
    if (!nome) {
      console.log("[productLookup] BarCode Lookup - No name");
      return null;
    }

    const result: ProductLookupResult = { nome };

    if (product.brand) {
      result.marca = product.brand;
    }

    if (product.image_url) {
      result.imagem = product.image_url;
    }

    return result;
  } catch (err) {
    console.log("[productLookup] BarCode Lookup API error:", err);
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
