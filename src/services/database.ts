import {
  documentDirectory,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import { Product, AppSettings } from "../types";
import { DATABASE_NAME, SETTINGS_KEY } from "../constants";
import { syncSingleProduct, syncProducts } from "./apiClient";

interface StoreData {
  products: Product[];
  settings: AppSettings;
  nextId: number;
}

const DATA_FILE = `${documentDirectory}${DATABASE_NAME}.json`;

const defaultSettings: AppSettings = {
  notificacoesAtivas: true,
  alertaNotificacao: true,
  alertaEmail: false,
  userEmail: "",
  deviceUuid: "",
  diasAntecedencia: 7,
  googleApiKey: "",
  googleCx: "",
};

function getDefaultData(): StoreData {
  return {
    products: [],
    settings: { ...defaultSettings },
    nextId: 1,
  };
}

async function readData(): Promise<StoreData> {
  try {
    const exists = await getInfoAsync(DATA_FILE);
    if (!exists.exists) {
      return getDefaultData();
    }
    const content = await readAsStringAsync(DATA_FILE);
    return JSON.parse(content) as StoreData;
  } catch {
    return getDefaultData();
  }
}

async function writeData(data: StoreData): Promise<void> {
  await writeAsStringAsync(DATA_FILE, JSON.stringify(data));
}

function shouldSync(settings: AppSettings): boolean {
  return !!(settings.alertaEmail && settings.userEmail && settings.deviceUuid);
}

export async function insertProduct(
  product: Omit<Product, "id" | "criadoEm" | "atualizadoEm">
): Promise<number> {
  const data = await readData();
  const agora = new Date().toISOString();
  const newProduct: Product = {
    ...product,
    id: data.nextId,
    codigoBarras: product.codigoBarras ?? null,
    fotoUri: product.fotoUri ?? null,
    observacoes: product.observacoes ?? null,
    notificacaoId: product.notificacaoId ?? null,
    criadoEm: agora,
    atualizadoEm: agora,
  };
  data.products.push(newProduct);
  data.nextId++;
  await writeData(data);

  if (shouldSync(data.settings)) {
    syncSingleProduct(
      data.settings.deviceUuid,
      data.settings.userEmail,
      newProduct
    ).catch(() => {});
  }

  return newProduct.id;
}

export async function updateProduct(
  id: number,
  product: Partial<Omit<Product, "id" | "criadoEm">>
): Promise<void> {
  const data = await readData();
  const index = data.products.findIndex((p) => p.id === id);
  if (index === -1) return;
  data.products[index] = {
    ...data.products[index],
    ...product,
    atualizadoEm: new Date().toISOString(),
  };
  await writeData(data);

  if (shouldSync(data.settings)) {
    syncSingleProduct(
      data.settings.deviceUuid,
      data.settings.userEmail,
      data.products[index]
    ).catch(() => {});
  }
}

export async function deleteProduct(id: number): Promise<void> {
  const data = await readData();
  data.products = data.products.filter((p) => p.id !== id);
  await writeData(data);

  if (shouldSync(data.settings)) {
    syncProducts(data.settings.deviceUuid, data.settings.userEmail, data.products).catch(
      () => {}
    );
  }
}

export async function getProduct(id: number): Promise<Product | null> {
  const data = await readData();
  return data.products.find((p) => p.id === id) ?? null;
}

export async function getAllProducts(): Promise<Product[]> {
  const data = await readData();
  return data.products.sort(
    (a, b) =>
      new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime()
  );
}

export async function getProductByBarcode(
  codigoBarras: string
): Promise<Product | null> {
  const data = await readData();
  return data.products.find((p) => p.codigoBarras === codigoBarras) ?? null;
}

export async function searchProducts(query: string): Promise<Product[]> {
  const data = await readData();
  const q = query.toLowerCase();
  return data.products
    .filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        (p.codigoBarras && p.codigoBarras.includes(q))
    )
    .sort(
      (a, b) =>
        new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime()
    );
}

export async function getSettings(): Promise<AppSettings> {
  const data = await readData();
  return data.settings;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const data = await readData();
  data.settings = settings;
  await writeData(data);
}
