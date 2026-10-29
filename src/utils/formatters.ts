import { getUserTimezone } from "./timezone";

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

export const formatTime = (date: Date | string, timezone?: string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Invalid Time";

  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone || getUserTimezone() || "Asia/Kolkata",
  });
};

export const formatDate = (date: Date | string, timezone?: string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Invalid Date";

  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: timezone || getUserTimezone() || "Asia/Kolkata",
  });
};

export const formatShortDate = (date: Date | string, timezone?: string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Invalid Date";

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: timezone || getUserTimezone() || "Asia/Kolkata",
  });
};
