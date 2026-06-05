import { Product, ProductStatus, ProductWithStatus } from "../types";

const MS_IN_A_DAY = 1000 * 60 * 60 * 24;

export function getDiasRestantes(dataVencimento: string): number {
  const vencimento = new Date(dataVencimento);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  vencimento.setHours(0, 0, 0, 0);
  const diff = vencimento.getTime() - hoje.getTime();
  return Math.ceil(diff / MS_IN_A_DAY);
}

export function getStatus(diasRestantes: number): ProductStatus {
  if (diasRestantes < 0) return "vencido";
  if (diasRestantes <= 7) return "proximo";
  return "normal";
}

export function enrichProduct(product: Product): ProductWithStatus {
  const diasRestantes = getDiasRestantes(product.dataVencimento);
  const status = getStatus(diasRestantes);
  return { ...product, diasRestantes, status };
}

export function sortProducts(products: ProductWithStatus[]): ProductWithStatus[] {
  return [...products].sort((a, b) => {
    const order = { vencido: 0, proximo: 1, normal: 2 };
    const statusDiff = order[a.status] - order[b.status];
    if (statusDiff !== 0) return statusDiff;
    return a.diasRestantes - b.diasRestantes;
  });
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR");
}

export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

export function isValidBarcode(code: string): boolean {
  return /^\d{8,14}$/.test(code.replace(/\s/g, ""));
}
