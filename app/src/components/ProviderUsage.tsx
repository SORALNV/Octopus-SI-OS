import { APP_LOCALE } from "../locale";
import type { OctopusProviderRateLimits, OctopusProviderRateLimitWindow } from "../electron";

export function ProviderUsage({ rateLimits }: { rateLimits: OctopusProviderRateLimits }) {
  const rows = providerUsageRows(rateLimits);
  const observed = rateLimits.observedAtMs ? new Date(rateLimits.observedAtMs).toLocaleString(APP_LOCALE) : "";
  return (
    <div className="mx-[var(--padding-row-x)] mt-1 border-t border-token-border/70 pt-2 pb-1" title={observed ? `確認済み ${observed}` : undefined}>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-token-text-tertiary">
        <span>{rateLimits.limitName || rateLimits.planType || "プロバイダーの使用状況"}</span>
        {rateLimits.reachedType ? <span className="text-token-error-foreground">上限に達しました</span> : null}
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div className="flex min-w-0 flex-col gap-1" key={row.key}>
            <div className="flex min-w-0 items-center justify-between gap-2 text-xs">
              <span className="truncate text-token-text-secondary">{row.label}</span>
              <span className="shrink-0 tabular-nums text-token-text-tertiary">{row.remaining}% 残り</span>
            </div>
            <div className="flex items-center gap-2">
              <progress
                aria-label={`${row.label} 残り`}
                className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full [&::-moz-progress-bar]:bg-token-foreground [&::-ms-fill]:bg-token-foreground [&::-webkit-progress-bar]:bg-token-foreground/10 [&::-webkit-progress-value]:bg-token-foreground"
                max={100}
                value={row.remaining}
              />
              {row.reset ? <span className="shrink-0 text-[11px] text-token-input-placeholder-foreground">{row.reset}</span> : null}
            </div>
          </div>
        ))}
        {rateLimits.credits ? (
          <div className="flex items-center justify-between gap-2 text-xs text-token-text-secondary">
            <span>クレジット</span>
            <span className="tabular-nums text-token-text-tertiary">
              {rateLimits.credits.unlimited ? "無制限" : rateLimits.credits.balance ?? (rateLimits.credits.hasCredits ? "利用可能" : "なし")}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function providerUsageRows(rateLimits: OctopusProviderRateLimits): Array<{ key: string; label: string; remaining: number; reset: string }> {
  const windows: Array<[string, OctopusProviderRateLimitWindow | null]> = [
    ["primary", rateLimits.primary],
    ["secondary", rateLimits.secondary],
  ];
  return windows.flatMap(([key, window]) => {
    if (!window) return [];
    return [{
      key,
      label: rateLimitWindowLabel(window),
      remaining: Math.max(0, Math.min(100, Math.round(100 - window.usedPercent))),
      reset: rateLimitResetLabel(window.resetsAt),
    }];
  });
}

function rateLimitWindowLabel(window: OctopusProviderRateLimitWindow): string {
  const minutes = window.windowDurationMins ?? 0;
  if (minutes >= 9_500 && minutes <= 10_600) return "週間の使用上限";
  if (minutes >= 285 && minutes <= 315) return "5 時間の使用上限";
  if (minutes >= 1_360 && minutes <= 1_520) return "一日の使用上限";
  if (minutes >= 40_000 && minutes <= 46_000) return "月間の使用上限";
  return minutes > 0 ? `${formatDurationMinutes(minutes)}の使用上限` : "使用上限";
}

function formatDurationMinutes(minutes: number): string {
  if (minutes % 1_440 === 0) return `${minutes / 1_440} 日`;
  if (minutes % 60 === 0) return `${minutes / 60} 時間`;
  return `${minutes} 分`;
}

function rateLimitResetLabel(value: number | null): string {
  if (!value) return "";
  const milliseconds = value < 10_000_000_000 ? value * 1_000 : value;
  const date = new Date(milliseconds);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.toLocaleTimeString(APP_LOCALE, { hour: "numeric", minute: "2-digit" })} にリセット`;
}
