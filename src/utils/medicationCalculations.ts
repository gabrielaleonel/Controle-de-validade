import { CalculateEndDateInput, CalculateEndDateResult } from "../types/medications";

export function calculateEndDate(input: CalculateEndDateInput): CalculateEndDateResult {
  const {
    quantidadeEstoque,
    quantidadePorDose,
    dosesPorDia,
    startDate = new Date(),
  } = input;

  if (quantidadeEstoque <= 0 || quantidadePorDose <= 0 || dosesPorDia <= 0) {
    return {
      consumoDiario: 0,
      diasAteAcabar: 0,
      dataPrevistaAcabar: null,
    };
  }

  const consumoDiario = quantidadePorDose * dosesPorDia;
  const diasAteAcabar = Math.floor(quantidadeEstoque / consumoDiario);

  const dataPrevistaAcabar = new Date(startDate);
  dataPrevistaAcabar.setDate(dataPrevistaAcabar.getDate() + diasAteAcabar);

  return {
    consumoDiario,
    diasAteAcabar,
    dataPrevistaAcabar,
  };
}
