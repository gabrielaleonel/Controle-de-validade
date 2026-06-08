import {
  documentDirectory,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import { Medication, MedicationForm } from "../types/medications";
import { MEDICATION_DATABASE_NAME } from "../constants/medications";

interface MedicationStoreData {
  medications: Medication[];
  nextId: number;
}

const DATA_FILE = `${documentDirectory}${MEDICATION_DATABASE_NAME}.json`;

function getDefaultData(): MedicationStoreData {
  return {
    medications: [],
    nextId: 1,
  };
}

async function readData(): Promise<MedicationStoreData> {
  try {
    const exists = await getInfoAsync(DATA_FILE);
    if (!exists.exists) {
      return getDefaultData();
    }
    const content = await readAsStringAsync(DATA_FILE);
    return JSON.parse(content) as MedicationStoreData;
  } catch {
    return getDefaultData();
  }
}

async function writeData(data: MedicationStoreData): Promise<void> {
  await writeAsStringAsync(DATA_FILE, JSON.stringify(data));
}

export async function insertMedication(
  medication: Omit<Medication, "id" | "criadoEm" | "atualizadoEm">
): Promise<number> {
  const data = await readData();
  const agora = new Date().toISOString();
  const newMedication: Medication = {
    ...medication,
    id: data.nextId,
    forma: medication.forma ?? "comprimido",
    dosagem: medication.dosagem ?? null,
    codigoBarras: medication.codigoBarras ?? null,
    fotoUri: medication.fotoUri ?? null,
    dataPrevistaAcabar: medication.dataPrevistaAcabar ?? null,
    posologia: medication.posologia ?? null,
    observacoes: medication.observacoes ?? null,
    barcodeSource: medication.barcodeSource ?? null,
    barcodeConfidence: medication.barcodeConfidence ?? null,
    barcodeLookupAt: medication.barcodeLookupAt ?? null,
    notificacaoIdEstoque: medication.notificacaoIdEstoque ?? null,
    notificacaoIdValidade: medication.notificacaoIdValidade ?? null,
    criadoEm: agora,
    atualizadoEm: agora,
  };
  data.medications.push(newMedication);
  data.nextId++;
  await writeData(data);
  return newMedication.id;
}

export async function updateMedication(
  id: number,
  medication: Partial<Omit<Medication, "id" | "criadoEm">>
): Promise<void> {
  const data = await readData();
  const index = data.medications.findIndex((m) => m.id === id);
  if (index === -1) return;
  data.medications[index] = {
    ...data.medications[index],
    ...medication,
    atualizadoEm: new Date().toISOString(),
  };
  await writeData(data);
}

export async function deleteMedication(id: number): Promise<void> {
  const data = await readData();
  data.medications = data.medications.filter((m) => m.id !== id);
  await writeData(data);
}

export async function getMedication(id: number): Promise<Medication | null> {
  const data = await readData();
  return data.medications.find((m) => m.id === id) ?? null;
}

export async function getMedicationByBarcode(
  codigoBarras: string
): Promise<Medication | null> {
  const data = await readData();
  return data.medications.find((m) => m.codigoBarras === codigoBarras) ?? null;
}

export async function getAllMedications(): Promise<Medication[]> {
  const data = await readData();
  return data.medications.sort(
    (a, b) =>
      new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime()
  );
}

export async function searchMedications(query: string): Promise<Medication[]> {
  const data = await readData();
  const q = query.toLowerCase();
  return data.medications
    .filter(
      (m) =>
        m.nome.toLowerCase().includes(q) ||
        (m.codigoBarras && m.codigoBarras.includes(q))
    )
    .sort(
      (a, b) =>
        new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime()
    );
}
