import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { medicationBarcodeCache } from "../../db/schema";

// ─── Tipos públicos ───────────────────────────────────────

export type MedicationSource =
  | "local-cache"
  | "external-pharmacy"
  | "ean-search"
  | "upc-itemdb"
  | "open-food-facts"
  | "duckduckgo"
  | "barcode-lookup-api"
  | "manual-user-confirmed";

export interface BarcodeLookupResult {
  name: string;
  dosage: string | null;
  form: string | null;
  imagem: string | null;
  source: MedicationSource;
  confidence: number;
}

// ─── Validação ────────────────────────────────────────────

const barcodeSchema = z
  .string()
  .min(8, "Código deve ter no mínimo 8 dígitos")
  .max(14, "Código deve ter no máximo 14 dígitos")
  .regex(/^\d+$/, "Código deve conter apenas dígitos");

export function normalizeBarcode(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-]/g, "");
  const result = barcodeSchema.safeParse(cleaned);
  return result.success ? result.data : null;
}

// ─── 1. Cache local (Turso) ──────────────────────────────

export async function findMedicationInLocalCache(
  barcode: string
): Promise<BarcodeLookupResult | null> {
  try {
    const db = getDb();
    const cached = await db
      .select()
      .from(medicationBarcodeCache)
      .where(eq(medicationBarcodeCache.barcode, barcode))
      .limit(1);

    if (cached.length === 0) return null;

    const entry = cached[0];
    return {
      name: entry.name,
      dosage: entry.dosage,
      form: entry.form,
      imagem: null,
      source: "local-cache",
      confidence: 0.95,
    };
  } catch {
    return null;
  }
}

// ─── 2. Provedores externos ──────────────────────────────

interface PharmacyProduct {
  nome: string;
  imagem?: string;
  marca?: string;
  fonte: string;
}

async function searchMercadoLibre(barcode: string): Promise<PharmacyProduct | null> {
  try {
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
      imagem: item.thumbnail,
      marca: item.brand,
      fonte: "MercadoLibre",
    };
  } catch {
    return null;
  }
}

async function searchPharmacies(barcode: string): Promise<PharmacyProduct | null> {
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
      const query = `${barcode} site:${farm.url}`;
      const res = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`,
        { headers: { "User-Agent": "ValidadeApp/1.0" } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.AbstractTitle && data.AbstractTitle !== "error" && data.AbstractTitle.length > 2) {
        return { nome: data.AbstractTitle, imagem: data.Image, fonte: farm.name };
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function searchEanSearch(barcode: string): Promise<PharmacyProduct | null> {
  try {
    const res = await fetch(
      `https://www.ean-search.org/api/1/json?barcode=${barcode}&key=test`,
      { headers: { Accept: "application/json", "User-Agent": "ValidadeApp/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.name || data.name === "error") return null;
    return { nome: data.name || data.title, marca: data.brand, imagem: data.image, fonte: "ean-search" };
  } catch {
    return null;
  }
}

async function searchUPCItemDB(barcode: string): Promise<PharmacyProduct | null> {
  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
      { headers: { Accept: "application/json", "User-Agent": "ValidadeApp/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "OK" || !data.items?.length) return null;
    const item = data.items[0];
    return {
      nome: item.title || item.description,
      marca: item.brand,
      imagem: item.images?.[0],
      fonte: "upc-itemdb",
    };
  } catch {
    return null;
  }
}

async function searchOpenFoodFacts(barcode: string): Promise<PharmacyProduct | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      { headers: { "User-Agent": "ValidadeApp/1.0", Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 0 || !data.product) return null;
    const product = data.product;
    const nome = product.product_name || product.product_name_en;
    if (!nome) return null;
    return {
      nome,
      marca: product.brands,
      imagem: product.image_url || product.image_front_url || null,
      fonte: "open-food-facts",
    };
  } catch {
    return null;
  }
}

async function searchDuckDuckGo(barcode: string): Promise<PharmacyProduct | null> {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(`${barcode} medicamento comprar`)}&format=json&no_html=1&skip_disambig=1`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const nome = data.AbstractTitle || data.Heading || "";
    if (!nome) return null;
    return { nome, fonte: "duckduckgo" };
  } catch {
    return null;
  }
}

async function searchBarcodeLookupAPI(barcode: string): Promise<PharmacyProduct | null> {
  try {
    const res = await fetch(
      `https://api.barcodelookup.com/v2/products?barcode=${barcode}&key=free`,
      { headers: { Accept: "application/json", "User-Agent": "ValidadeApp/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.products?.length) return null;
    const product = data.products[0];
    const nome = product.product_name || product.title;
    if (!nome) return null;
    return {
      nome,
      marca: product.brand,
      imagem: product.image_url,
      fonte: "barcode-lookup-api",
    };
  } catch {
    return null;
  }
}

// ─── 3. Extrair dosagem do texto ──────────────────────────

export function extractDosageFromText(
  text: string
): { name: string; dosage: string | null } {
  const dosageRegex = /\b(\d+[\.,]?\d*\s*(mg|mcg|g|ml|ui|%))\b/i;
  const match = text.match(dosageRegex);

  if (match) {
    const dosage = match[1].trim();
    const name = text.replace(dosageRegex, "").trim();
    return { name, dosage };
  }

  return { name: text, dosage: null };
}

// ─── 4. Extrair forma farmacêutica do texto ──────────────

const FORM_KEYWORDS: Record<string, string[]> = {
  comprimido: ["comprimido", "comp", "cp", "drágea", "dragea"],
  capsula: ["cápsula", "capsula", "caps", "cáp", "cáps", "liberação prolongada", "lp"],
  gotas: ["gotas", "gota", "solução oral"],
  ml: ["injetável", "injetavel", "solução injetável", "ampola"],
  sache: ["sachê", "sache", "pó oral", "granulado", "pó para suspensão"],
  pomada: ["pomada", "creme", "gel", "loção"],
  spray: ["spray", "aerossol", "nebulização"],
};

export function extractFormFromText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [form, keywords] of Object.entries(FORM_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return form;
    }
  }
  return null;
}

// ─── Mapear fonte para MedicationSource ───────────────────

function mapSource(fonte: string): MedicationSource {
  switch (fonte) {
    case "MercadoLibre":
    case "drogaraia":
    case "drogasil":
    case "consultaremedios":
    case "drogariaspacheco":
    case "ultrafarma":
    case "paguemenos":
      return "external-pharmacy";
    case "ean-search":
      return "ean-search";
    case "upc-itemdb":
      return "upc-itemdb";
    case "open-food-facts":
      return "open-food-facts";
    case "duckduckgo":
      return "duckduckgo";
    case "barcode-lookup-api":
      return "barcode-lookup-api";
    default:
      return "external-pharmacy";
  }
}

function mapConfidence(fonte: string): number {
  switch (fonte) {
    case "MercadoLibre":
      return 0.8;
    case "drogaraia":
    case "drogasil":
    case "consultaremedios":
    case "drogariaspacheco":
    case "ultrafarma":
    case "paguemenos":
      return 0.75;
    case "ean-search":
      return 0.7;
    case "upc-itemdb":
      return 0.6;
    case "open-food-facts":
      return 0.5;
    case "barcode-lookup-api":
      return 0.6;
    case "duckduckgo":
      return 0.3;
    default:
      return 0.4;
  }
}

// ─── 5. Resolver principal ────────────────────────────────

export async function resolveMedicationByBarcode(
  barcode: string
): Promise<BarcodeLookupResult | null> {
  const normalized = normalizeBarcode(barcode);
  if (!normalized) return null;

  // 1. Cache local (mais confiável)
  const cached = await findMedicationInLocalCache(normalized);
  if (cached) return cached;

  // 2. Provedores externos (paralelo)
  const externalResults = await Promise.allSettled([
    searchMercadoLibre(normalized),
    searchPharmacies(normalized),
    searchEanSearch(normalized),
    searchUPCItemDB(normalized),
    searchOpenFoodFacts(normalized),
    searchDuckDuckGo(normalized),
    searchBarcodeLookupAPI(normalized),
  ]);

  const fulfilled: PharmacyProduct[] = [];
  for (const result of externalResults) {
    if (result.status === "fulfilled" && result.value) {
      fulfilled.push(result.value);
    }
  }

  if (fulfilled.length === 0) return null;

  const withImage = fulfilled.find((r) => r.imagem);
  const best = withImage || fulfilled[0];

  const { name, dosage } = extractDosageFromText(best.nome);
  const form = extractFormFromText(best.nome);

  return {
    name,
    dosage: dosage || (best.marca ? best.marca : null),
    form,
    imagem: best.imagem || null,
    source: mapSource(best.fonte),
    confidence: mapConfidence(best.fonte),
  };
}
