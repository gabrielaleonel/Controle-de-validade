import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  getDiasRestantesValidade,
  getDiasRestantesEstoque,
} from "../utils/medicationUtils";
import { DEFAULT_ALERTA_ACABAR_DIAS, DEFAULT_ALERTA_VALIDADE_DIAS } from "../constants/medications";

export async function scheduleMedicationNotifications(
  medicationId: number,
  medicationName: string,
  dataVencimento: string,
  dataPrevistaAcabar: string | null
): Promise<{ notificacaoIdEstoque: string | null; notificacaoIdValidade: string | null }> {
  if (Platform.OS === "web") {
    return { notificacaoIdEstoque: null, notificacaoIdValidade: null };
  }

  const notificacaoIdEstoque = await scheduleStockNotifications(medicationId, medicationName, dataPrevistaAcabar);
  const notificacaoIdValidade = await scheduleExpirationNotifications(medicationId, medicationName, dataVencimento);

  return { notificacaoIdEstoque, notificacaoIdValidade };
}

async function scheduleStockNotifications(
  medicationId: number,
  medicationName: string,
  dataPrevistaAcabar: string | null
): Promise<string | null> {
  if (!dataPrevistaAcabar) return null;

  const diasRestantes = getDiasRestantesEstoque(dataPrevistaAcabar);
  if (diasRestantes === null || diasRestantes <= 0) return null;

  const ids: string[] = [];
  const hoje = new Date();

  for (const dias of DEFAULT_ALERTA_ACABAR_DIAS) {
    if (diasRestantes <= dias) continue;
    const triggerDate = new Date(dataPrevistaAcabar);
    triggerDate.setDate(triggerDate.getDate() - dias);
    triggerDate.setHours(9, 0, 0, 0);

    if (triggerDate <= hoje) continue;

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Medicamento próximo de acabar",
          body: `"${medicationName}" — estoque vai acabar em ${dias} dia(s).`,
          data: { medicationId, type: "stock" },
          sound: "default",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
      ids.push(id);
    } catch {}
  }

  if (diasRestantes > 0) {
    try {
      const acabandoDate = new Date(dataPrevistaAcabar);
      acabandoDate.setHours(9, 0, 0, 0);
      if (acabandoDate > hoje) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Medicamento acabou",
            body: `O estoque de "${medicationName}" acabou hoje.`,
            data: { medicationId, type: "stock" },
            sound: "default",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: acabandoDate,
          },
        });
        ids.push(id);
      }
    } catch {}
  }

  return ids.length > 0 ? ids.join(",") : null;
}

async function scheduleExpirationNotifications(
  medicationId: number,
  medicationName: string,
  dataVencimento: string
): Promise<string | null> {
  const diasRestantes = getDiasRestantesValidade(dataVencimento);
  if (diasRestantes <= 0) return null;

  const ids: string[] = [];
  const hoje = new Date();

  for (const dias of DEFAULT_ALERTA_VALIDADE_DIAS) {
    if (diasRestantes <= dias) continue;
    const triggerDate = new Date(dataVencimento);
    triggerDate.setDate(triggerDate.getDate() - dias);
    triggerDate.setHours(9, 0, 0, 0);

    if (triggerDate <= hoje) continue;

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Medicamento próximo de vencer",
          body: `"${medicationName}" — vence em ${dias} dia(s).`,
          data: { medicationId, type: "expiration" },
          sound: "default",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
      ids.push(id);
    } catch {}
  }

  if (diasRestantes > 0) {
    try {
      const venceDate = new Date(dataVencimento);
      venceDate.setHours(9, 0, 0, 0);
      if (venceDate > hoje) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Medicamento venceu",
            body: `"${medicationName}" venceu hoje.`,
            data: { medicationId, type: "expiration" },
            sound: "default",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: venceDate,
          },
        });
        ids.push(id);
      }
    } catch {}
  }

  return ids.length > 0 ? ids.join(",") : null;
}

export async function cancelMedicationNotifications(
  notificacaoIdEstoque: string | null,
  notificacaoIdValidade: string | null
): Promise<void> {
  const allIds = [
    ...(notificacaoIdEstoque?.split(",") ?? []),
    ...(notificacaoIdValidade?.split(",") ?? []),
  ];
  for (const id of allIds) {
    await Notifications.cancelScheduledNotificationAsync(id.trim()).catch(() => {});
  }
}
