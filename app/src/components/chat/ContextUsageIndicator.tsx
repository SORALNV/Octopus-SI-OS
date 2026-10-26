import { MessageTooltip } from "./MessageTooltip";
import type { ContextUsage } from "./contextUsage";

export function ContextUsageIndicator({ usage }: { usage: ContextUsage | null }) {
  if (!usage) return null;
  const percent = Math.round(usage.percent);
  return <MessageTooltip side="top" label={<span className="flex w-38 flex-col gap-0.5 text-center">
    <span className="opacity-60">コンテキストの使用量：</span>
    <span>{percent >= 50 ? `${percent}% 使用` : `${percent}% 使用（${100 - percent}% 残り）`}</span>
    <span>{Math.round(usage.usedTokens / 1000)}k / {Math.round(usage.contextWindow / 1000)}千トークン使用済み</span>
  </span>}>
    <span role="img" aria-label={`コンテキストの使用量： ${percent}%`} className="inline-flex size-4 items-center justify-center text-token-description-foreground">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" pathLength="100" strokeDasharray={`${usage.percent} 100`} transform="rotate(-90 8 8)" />
      </svg>
    </span>
  </MessageTooltip>;
}
