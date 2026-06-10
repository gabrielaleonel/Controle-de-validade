export const USE_MOCK_AUTH = true;

export const DEFAULT_DIAS_ANTECEDENCIA = 7;
export const DATABASE_NAME = "validade.db";
export const SETTINGS_KEY = "app_settings";
export const DEVICE_UUID_FILE = "device_uuid.txt";

export const API_BASE_URL = "https://validade-email-api.vercel.app";
export const AUTH_API_BASE_URL = "http://localhost:8000";
export const SYNC_API_KEY = "cole_a_chave_de_sync_aqui";

export const STATUS_LABELS = {
  vencido: "Vencido",
  proximo: "Próximo ao vencimento",
  normal: "Normal",
} as const;

export const STATUS_COLORS = {
  vencido: "#D32F2F",
  proximo: "#F57C00",
  normal: "#388E3C",
} as const;

export const FILTER_OPTIONS = [
  { label: "Todos", value: "todos" as const },
  { label: "Próximos de vencer", value: "proximos" as const },
  { label: "Vencidos", value: "vencidos" as const },
];

export const BARCODE_LOOKUP_API = "https://world.openfoodfacts.org/api/v2/product";
