import { APP_LOCALE } from "../locale";
import type { OctopusChatgptLimit, OctopusChatgptUsage } from "../electron";

export type AccountUsageWindow = {
  key: string;
  label: string;
  compactLabel: string;
  durationMins: number | null;
  reported: boolean;
  remaining: number | null;
  resetsAt: number | null;
};
export type AccountUsageGroup = { key: string; label: string; limit: OctopusChatgptLimit; windows: AccountUsageWindow[] };

export function accountUsageGroups(usage: OctopusChatgptUsage): AccountUsageGroup[] {
  const entries: Array<[string, OctopusChatgptLimit]> = usage.rateLimitsByLimitId === null
    ? [[usage.rateLimits.limitId ?? "account", usage.rateLimits]]
    : Object.entries(usage.rateLimitsByLimitId);
  return entries.map(([key, limit]) => ({
    key, limit, label: limit.limitName || limit.limitId || "アカウントの使用状況",
    windows: (["primary", "secondary"] as const).map((slot) => {
      const window = limit[slot];
      const duration = window?.windowDurationMins ?? null;
      const label = duration === 300 ? "5 時間の使用上限" : duration === 10_080 ? "週間の使用上限"
        : duration === 1440 ? "一日の使用上限" : "使用上限";
      const compactLabel = duration === 300 ? "5 時間" : duration === 10_080 ? "週間"
        : duration === 1440 ? "一日" : duration && duration > 0 ? `${duration} 分` : "使用状況";
      return { key: slot, label, compactLabel, durationMins: duration, reported: window != null,
        remaining: window && Number.isFinite(window.usedPercent) ? Math.max(0, Math.min(100, 100 - window.usedPercent)) : null,
        resetsAt: window?.resetsAt != null && Number.isFinite(window.resetsAt) ? window.resetsAt : null };
    }),
  }));
}

export function accountResetTime(resetsAt: number | null, durationMins: number | null = null, nowMs = Date.now()): string {
  if (resetsAt === null) return "リセット時刻を取得できません";
  const date = new Date(resetsAt * 1000);
  if (Number.isNaN(date.getTime())) return "リセット時刻を取得できません";
  const seconds = Math.floor((date.getTime() - nowMs) / 1000);
  const time = durationMins === 10_080
    ? new Intl.DateTimeFormat(APP_LOCALE, { dateStyle: "medium", timeStyle: "short" }).format(date)
    : seconds <= 0 ? new Intl.RelativeTimeFormat(APP_LOCALE, { numeric: "auto" }).format(0, "second")
      : seconds < 86_400 ? new Intl.DateTimeFormat(APP_LOCALE, { timeStyle: "short" }).format(date)
        : new Intl.DateTimeFormat(APP_LOCALE, { month: "short", day: "numeric" }).format(date);
  return `${time} にリセット`;
}

export function accountPlanLabel(plan: string | null | undefined): string {
  const value = plan?.trim();
  if (!value) return "プランを取得できません";
  return value === "promax" ? "Pro Max" : value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function accountRemainingLabel(remaining: number | null, suffix = "残り"): string {
  return remaining === null ? "利用できません" : `${new Intl.NumberFormat(APP_LOCALE, { maximumFractionDigits: 0 }).format(remaining)}${suffix === "残り" ? "% 残り" : `% ${suffix}`}`;
}
