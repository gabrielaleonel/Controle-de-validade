import { API_BASE_URL, SYNC_API_KEY } from "../constants";
import type { Product } from "../types";

interface SyncProductPayload {
  id: number;
  nome: string;
  codigoBarras: string | null;
  dataVencimento: string;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

interface SyncResponse {
  inserted: number;
  updated: number;
  deleted: number;
}

function toPayload(product: Product): SyncProductPayload {
  return {
    id: product.id,
    nome: product.nome,
    codigoBarras: product.codigoBarras,
    dataVencimento: product.dataVencimento,
    observacoes: product.observacoes,
    criadoEm: product.criadoEm,
    atualizadoEm: product.atualizadoEm,
  };
}

export async function syncProducts(
  deviceUuid: string,
  userEmail: string,
  products: Product[]
): Promise<SyncResponse | null> {
  if (!deviceUuid || !userEmail || !API_BASE_URL || !SYNC_API_KEY) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SYNC_API_KEY}`,
      },
      body: JSON.stringify({
        deviceUuid,
        userEmail,
        products: products.map(toPayload),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn("Sync failed:", response.status, text);
      return null;
    }

    const data = (await response.json()) as SyncResponse;
    return data;
  } catch (err) {
    console.warn("Sync network error:", err);
    return null;
  }
}

export async function syncSingleProduct(
  deviceUuid: string,
  userEmail: string,
  product: Product
): Promise<SyncResponse | null> {
  return syncProducts(deviceUuid, userEmail, [product]);
}
