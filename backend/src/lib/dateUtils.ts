export function getTodayInTimezone(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

export function getDaysRemaining(
  expirationDate: string,
  timezone: string
): number {
  const todayStr = getTodayInTimezone(timezone);
  const today = new Date(todayStr + "T00:00:00");
  const expiry = new Date(expirationDate + "T23:59:59");

  const diff = expiry.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isWithinAlertWindow(daysRemaining: number): boolean {
  return daysRemaining >= 1 && daysRemaining <= 7;
}
