import { Medication, MedicationStatus, MedicationWithStatus } from "../types/medications";

const MS_IN_A_DAY = 1000 * 60 * 60 * 24;

export function getDiasRestantesValidade(dataVencimento: string): number {
  const vencimento = new Date(dataVencimento);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  vencimento.setHours(0, 0, 0, 0);
  const diff = vencimento.getTime() - hoje.getTime();
  return Math.ceil(diff / MS_IN_A_DAY);
}

export function getDiasRestantesEstoque(dataPrevistaAcabar: string | null): number | null {
  if (!dataPrevistaAcabar) return null;
  const fim = new Date(dataPrevistaAcabar);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  fim.setHours(0, 0, 0, 0);
  const diff = fim.getTime() - hoje.getTime();
  return Math.ceil(diff / MS_IN_A_DAY);
}

export function getStatusValidade(diasRestantes: number): MedicationStatus {
  if (diasRestantes < 0) return "vencido";
  if (diasRestantes <= 30) return "acabando";
  return "normal";
}

export function getStatusEstoque(diasRestantes: number | null): MedicationStatus {
  if (diasRestantes === null) return "normal";
  if (diasRestantes <= 0) return "vencido";
  if (diasRestantes <= 7) return "acabando";
  return "normal";
}

export function enrichMedication(medication: Medication): MedicationWithStatus {
  const diasRestantesValidade = getDiasRestantesValidade(medication.dataVencimento);
  const diasRestantesEstoque = getDiasRestantesEstoque(medication.dataPrevistaAcabar);
  const statusValidade = getStatusValidade(diasRestantesValidade);
  const statusEstoque = getStatusEstoque(diasRestantesEstoque);
  return {
    ...medication,
    diasRestantesValidade,
    diasRestantesEstoque,
    statusValidade,
    statusEstoque,
  };
}

export function sortMedications(medications: MedicationWithStatus[]): MedicationWithStatus[] {
  return [...medications].sort((a, b) => {
    const order = { vencido: 0, acabando: 1, normal: 2 };
    const statusA = a.statusValidade === "vencido" ? "vencido" : a.statusEstoque === "acabando" ? "acabando" : "normal";
    const statusB = b.statusValidade === "vencido" ? "vencido" : b.statusEstoque === "acabando" ? "acabando" : "normal";
    const diff = order[statusA] - order[statusB];
    if (diff !== 0) return diff;
    return (a.diasRestantesEstoque ?? 999) - (b.diasRestantesEstoque ?? 999);
  });
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR");
}
