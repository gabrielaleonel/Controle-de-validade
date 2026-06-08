import { useState, useCallback, useRef } from "react";
import { z } from "zod";
import { API_BASE_URL } from "../constants";

const barcodeSchema = z
  .string()
  .min(8, "Código muito curto")
  .max(14, "Código muito longo")
  .regex(/^\d+$/, "Apenas dígitos");

export interface BarcodeLookupResult {
  name: string;
  dosage: string | null;
  form: string | null;
  source: string;
  confidence: number;
}

export function useBarcodeLookup() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BarcodeLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const lookup = useCallback(async (barcode: string) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    const parsed = barcodeSchema.safeParse(barcode);
    if (!parsed.success) {
      setResult(null);
      setError(parsed.error.errors[0].message);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medications/lookup-barcode?barcode=${parsed.data}`,
        { signal: abortRef.current.signal }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setResult(null);
        setError(body?.error || "Erro ao buscar medicamento");
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      if (data.found && data.medication) {
        setResult({
          name: data.medication.name,
          dosage: data.medication.dosage,
          form: data.medication.form,
          source: data.source,
          confidence: data.confidence,
        });
        setError(null);
      } else {
        setResult(null);
        setError(data?.message || "Medicamento não encontrado");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setResult(null);
      setError("Erro de conexão ao buscar medicamento");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setResult(null);
    setError(null);
  }, []);

  return { isLoading, result, error, lookup, reset };
}
