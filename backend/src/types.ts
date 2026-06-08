export type SlotName = "morning" | "afternoon" | "evening";

export interface SlotConfig {
  morning: string;
  afternoon: string;
  evening: string;
}

export interface CheckResult {
  attempted: number;
  sent: number;
  duplicateIgnored: number;
  businessRuleIgnored: number;
  failed: number;
  totalEligible: number;
}

export interface SyncProductPayload {
  id: number;
  nome: string;
  codigoBarras: string | null;
  dataVencimento: string;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
  deletadoEm?: string | null;
}

export interface SyncRequest {
  deviceUuid: string;
  userEmail: string;
  products: SyncProductPayload[];
}

export interface SyncResponse {
  inserted: number;
  updated: number;
  deleted: number;
}
