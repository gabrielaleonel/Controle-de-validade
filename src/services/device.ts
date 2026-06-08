import {
  documentDirectory,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import { DEVICE_UUID_FILE } from "../constants";

function generateUuid(): string {
  const hex = "0123456789abcdef";
  const pattern = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return pattern.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return hex[v];
  });
}

export async function getDeviceUuid(): Promise<string> {
  const filePath = `${documentDirectory}${DEVICE_UUID_FILE}`;
  try {
    const exists = await getInfoAsync(filePath);
    if (exists.exists) {
      const uuid = await readAsStringAsync(filePath);
      if (uuid && uuid.length > 10) return uuid.trim();
    }
  } catch {
    // Will generate new UUID
  }

  const uuid = generateUuid();
  await writeAsStringAsync(filePath, uuid);
  return uuid;
}
