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
  email: string;
  notificacoesAtivas: boolean;
  alertaEmail: boolean;
  alertaNotificacao: boolean;
  diasAntecedencia: number;
  googleApiKey?: string;
  googleCx?: string;
  resendApiKey?: string;
}

export interface ProductLookupResult {
  nome: string;
  marca?: string;
  imagem?: string;
}

export type FilterType = "todos" | "proximos" | "vencidos";
