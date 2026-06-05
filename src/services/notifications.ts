import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getSettings } from "./database";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("expiry-alerts", {
      name: "Alertas de Vencimento",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return true;
}

export async function scheduleExpiryNotification(
  productId: number,
  productName: string,
  expiryDate: string
): Promise<string | undefined> {
  const settings = await getSettings();
  if (!settings.notificacoesAtivas || !settings.alertaNotificacao) return undefined;

  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  const diasAntecedencia = settings.diasAntecedencia || 7;
  if (daysUntilExpiry > diasAntecedencia) return undefined;

  const times = [
    { hour: 9, minute: 0 },
    { hour: 14, minute: 0 },
    { hour: 19, minute: 0 },
  ];

  const scheduledIds: string[] = [];

  for (const time of times) {
    const body = daysUntilExpiry <= 0
      ? `O produto "${productName}" já venceu! Confira no app.`
      : `Confira o produto "${productName}" no app - vencimento está próximo!`;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Produto próximo do vencimento",
        body,
        data: { productId },
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
      },
    });
    scheduledIds.push(id);
  }

  return scheduledIds.join(",");
}

export async function cancelNotification(notificacaoId: string): Promise<void> {
  if (notificacaoId) {
    const ids = notificacaoId.split(",");
    for (const id of ids) {
      await Notifications.cancelScheduledNotificationAsync(id.trim()).catch(() => {});
    }
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function addNotificationResponseListener(
  handler: (productId: number) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (data?.productId) {
      handler(data.productId as number);
    }
  });
}
