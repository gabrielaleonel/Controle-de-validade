import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getSettings } from "./database";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
  if (!settings.notificacoesAtivas) return undefined;

  const diasAntecedencia = settings.diasAntecedencia || 7;
  const expiry = new Date(expiryDate);
  const notifDate = new Date(expiry);
  notifDate.setDate(notifDate.getDate() - diasAntecedencia);
  notifDate.setHours(9, 0, 0, 0);

  const now = new Date();
  if (notifDate <= now) {
    notifDate.setTime(now.getTime() + 60 * 1000);
  }

  const daysUntilExpiry = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  let body: string;
  if (daysUntilExpiry <= 0) {
    body = `O produto "${productName}" já venceu!`;
  } else if (daysUntilExpiry === 1) {
    body = `O produto "${productName}" vence amanhã!`;
  } else {
    body = `O produto "${productName}" vence em ${daysUntilExpiry} dias.`;
  }

  if (settings.alertaNotificacao) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Produto próximo do vencimento",
        body,
        data: { productId },
        sound: "default",
      },
      trigger: notifDate,
    });
    return id;
  }

  return undefined;
}

export async function cancelNotification(notificacaoId: string): Promise<void> {
  if (notificacaoId) {
    await Notifications.cancelScheduledNotificationAsync(notificacaoId);
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
