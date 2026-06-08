import { API_BASE_URL } from "../constants";
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
