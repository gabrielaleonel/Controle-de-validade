export interface Product {
  id: number;
  nome: string;
  codigoBarras: string | null;
  dataVencimento: string;
  fotoUri: string | null;
  observacoes: string | null;
  notificacaoId: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export type ProductStatus = "vencido" | "proximo" | "normal";

export interface ProductWithStatus extends Product {
  diasRestantes: number;
  status: ProductStatus;
}

export interface AppSettings {
  notificacoesAtivas: boolean;
  alertaNotificacao: boolean;
  alertaEmail: boolean;
  userEmail: string;
  deviceUuid: string;
  diasAntecedencia: number;
  googleApiKey?: string;
  googleCx?: string;
}

export interface ProductLookupResult {
  nome: string;
  marca?: string;
  imagem?: string;
}

export type FilterType = "todos" | "proximos" | "vencidos";
