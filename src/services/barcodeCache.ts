import {
  documentDirectory,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";

interface BarcodeCacheEntry {
  nome: string;
  fotoUri: string | null;
  atualizadoEm: string;
}

interface BarcodeCacheData {
  entries: Record<string, BarcodeCacheEntry>;
}

const CACHE_FILE = `${documentDirectory}barcode-cache.json`;

function getDefaultData(): BarcodeCacheData {
  return { entries: {} };
}

async function readData(): Promise<BarcodeCacheData> {
  try {
    const exists = await getInfoAsync(CACHE_FILE);
    if (!exists.exists) {
      return getDefaultData();
    }
    const content = await readAsStringAsync(CACHE_FILE);
    return JSON.parse(content) as BarcodeCacheData;
  } catch {
    return getDefaultData();
  }
}

async function writeData(data: BarcodeCacheData): Promise<void> {
  await writeAsStringAsync(CACHE_FILE, JSON.stringify(data));
}

export async function getBarcodeCache(
  barcode: string
): Promise<BarcodeCacheEntry | null> {
  const data = await readData();
  return data.entries[barcode] ?? null;
}

export async function setBarcodeCache(
  barcode: string,
  nome: string,
  fotoUri: string | null
): Promise<void> {
  const data = await readData();
  data.entries[barcode] = {
    nome,
    fotoUri,
    atualizadoEm: new Date().toISOString(),
  };
  await writeData(data);
}

export async function clearBarcodeCache(): Promise<void> {
  await writeData(getDefaultData());
}
