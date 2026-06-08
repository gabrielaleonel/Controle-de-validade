export type MedicationForm = "comprimido" | "capsula" | "gotas" | "ml" | "sache" | "ampola" | "outro";

export interface Medication {
  id: number;
  nome: string;
  dosagem: string | null;
  forma: MedicationForm;
  codigoBarras: string | null;
  fotoUri: string | null;
  quantidadeEstoque: number;
  quantidadePorDose: number;
  dosesPorDia: number;
  consumoDiario: number;
  dataVencimento: string;
  dataPrevistaAcabar: string | null;
  posologia: string | null;
  observacoes: string | null;
  barcodeSource: string | null;
  barcodeConfidence: number | null;
  barcodeLookupAt: string | null;
  notificacaoIdEstoque: string | null;
  notificacaoIdValidade: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export type MedicationStatus = "acabando" | "vencido" | "normal";

export interface MedicationWithStatus extends Medication {
  diasRestantesValidade: number;
  diasRestantesEstoque: number | null;
  statusValidade: MedicationStatus;
  statusEstoque: MedicationStatus;
}

export type MedicationFilterType = "todos" | "proximos_acabar" | "vencidos";

export interface CalculateEndDateInput {
  quantidadeEstoque: number;
  quantidadePorDose: number;
  dosesPorDia: number;
  startDate?: Date;
}

export interface CalculateEndDateResult {
  consumoDiario: number;
  diasAteAcabar: number;
  dataPrevistaAcabar: Date | null;
}
