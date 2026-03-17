import { TIMEZONE } from "./constants";

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (value === 0) return "$0";

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${sign}$${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    const k = abs / 1_000;
    return `${sign}$${Number.isInteger(k) ? k : k.toFixed(0)}K`;
  }
  return `${sign}$${abs.toLocaleString()}`;
}

export function getTodayCT(): string {
  const now = new Date();
  const ct = new Date(
    now.toLocaleString("en-US", { timeZone: TIMEZONE })
  );
  return ct.toISOString().split("T")[0];
}

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeDate(
  isoDate: string | null | undefined,
  today?: string
): string {
  if (!isoDate) return "—";

  const todayStr = today ?? getTodayCT();
  const todayDate = new Date(todayStr + "T00:00:00");
  const targetDate = new Date(isoDate + "T00:00:00");

  const diffMs = targetDate.getTime() - todayDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `Overdue (${Math.abs(diffDays)}d)`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 14) return `In ${diffDays}d`;
  return formatDate(isoDate);
}

export function computeDateOffset(
  offset: string,
  today?: string
): string {
  const todayStr = today ?? getTodayCT();
  const date = new Date(todayStr + "T00:00:00");

  switch (offset) {
    case "today":
      return todayStr;
    case "tomorrow":
      date.setDate(date.getDate() + 1);
      return date.toISOString().split("T")[0];
    case "+3d":
      date.setDate(date.getDate() + 3);
      return date.toISOString().split("T")[0];
    case "next_mon": {
      const dayOfWeek = date.getDay();
      const daysUntilMon = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;
      date.setDate(date.getDate() + daysUntilMon);
      return date.toISOString().split("T")[0];
    }
    case "next_fri": {
      const dow = date.getDay();
      const daysUntilFri = dow === 0 ? 5 : dow <= 5 ? 5 - dow : 12 - dow;
      const days = daysUntilFri === 0 ? 7 : daysUntilFri;
      date.setDate(date.getDate() + days);
      return date.toISOString().split("T")[0];
    }
    case "+1w":
      date.setDate(date.getDate() + 7);
      return date.toISOString().split("T")[0];
    case "+2w":
      date.setDate(date.getDate() + 14);
      return date.toISOString().split("T")[0];
    default:
      return todayStr;
  }
}

export function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}
