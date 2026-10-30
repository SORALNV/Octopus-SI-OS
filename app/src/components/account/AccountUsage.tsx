import { APP_LOCALE } from "../../locale";
import type { HTMLAttributes, ReactNode } from "react";
import type { ChatgptUsageState } from "../../account/chatgptUsageState";
import { accountRemainingLabel, accountResetTime, accountUsageGroups } from "../../account/chatgptUsageModel";
import { OcButton, OcSettingsRow } from "../../design-system/components";
import { OcLoadingRows, OcLoadingText } from "../../design-system/LoadingSkeleton";
import "./account.css";

type UsageViewState = ChatgptUsageState & { refresh?: () => Promise<unknown> };

export function AccountSection({ title, description, actions, children, className = "", ...props }:
  Omit<HTMLAttributes<HTMLElement>, "title"> & { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return <section {...props} className={`account-section ${className}`}>
    <header className={`account-section-header${description ? " has-description" : ""}`}>
      <div className="account-section-heading"><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
      {actions ? <div className="account-section-actions">{actions}</div> : null}
    </header>
    <div className="account-section-content">{children}</div>
  </section>;
}

export function AccountRemainingProgress({ remaining, label, description, suffix = "残り" }: { remaining: number | null; label: string; description?: ReactNode; suffix?: string }) {
  return <div className="account-usage-progress" data-low={remaining !== null && remaining <= 10 || undefined}>
    <div className="account-usage-progress-meta"><span>{description}</span><span>{accountRemainingLabel(remaining, suffix)}</span></div>
    {remaining !== null ? <progress max={100} value={remaining} aria-label={label} /> : null}
  </div>;
}

function UsageNotice({ state }: { state: UsageViewState }) {
  return state.error ? <div className="account-inline-notice account-error" role="alert">
    <span>使用状況を取得できません。 {state.error}</span>
    <OcButton onClick={() => void state.refresh?.()}>再試行</OcButton>
  </div> : <OcLoadingRows label="使用状況を読み込んでいます…" rows={2} />;
}

export function AccountUsageSections({ state, signedIn, accountUnavailable = false, accountLoading = false }:
  { state: UsageViewState; signedIn: boolean; accountUnavailable?: boolean; accountLoading?: boolean }) {
  if (!signedIn || !state.value) return <AccountSection title="全体の使用上限">
    {accountLoading ? <OcLoadingRows label="アカウントを確認しています…" rows={2} /> : signedIn && (state.loading || state.error) ? <UsageNotice state={state} /> : <p className="account-section-footer" role="status">
      {accountUnavailable ? "アカウントを確認できるまで、使用状況を取得できません。"
        : signedIn ? "このアカウントの使用上限は報告されていません。" : "使用状況を表示するには、ChatGPT でログインしてください。"}
    </p>}
  </AccountSection>;
  const groups = accountUsageGroups(state.value);
  if (!groups.length) return <AccountSection title="全体の使用上限"><p className="account-section-footer">このアカウントの使用上限は報告されていません。</p></AccountSection>;
  return <>{groups.map((group) => <AccountSection key={group.key}
    title={group.limit.limitName ? `${group.label} 使用上限` : "全体の使用上限"}
    actions={group.limit.rateLimitReachedType || group.limit.spendControlReached ? <span className="account-limit-reached">上限に達しました</span> : undefined}>
    <div className="account-row-list account-usage-rows">
      {group.windows.filter((row) => row.reported).map((row) => <OcSettingsRow key={row.key} className="account-usage-row" label={row.label}
        control={<AccountRemainingProgress remaining={row.remaining} label={`${group.label}: ${row.label} 残り`}
          description={accountResetTime(row.resetsAt, row.durationMins)} />} />)}
      {group.limit.individualLimit ? <OcSettingsRow className="account-usage-row" label="月間の使用上限"
        control={<AccountRemainingProgress remaining={group.limit.individualLimit.remainingPercent} label={`${group.label}：月間の残り使用枠`} suffix="残り"
          description={<>{accountResetTime(group.limit.individualLimit.resetsAt, 43_200)} · {group.limit.individualLimit.used} / {group.limit.individualLimit.limit} クレジット使用済み</>} />} /> : null}
      {group.limit.credits ? <OcSettingsRow label="クレジット残高" control={<span className="account-value">
        {group.limit.credits.unlimited ? "無制限" : group.limit.credits.balance ?? (group.limit.credits.hasCredits ? "利用できません" : "なし")}
      </span>} /> : null}
      {!group.windows.some((row) => row.reported) && !group.limit.individualLimit && !group.limit.credits
        ? <p className="account-inline-notice">このアカウントの使用上限は報告されていません。</p> : null}
    </div>
    <p className="account-section-footer">この ChatGPT アカウントを使うアプリケーションとホームで共有されます。
      {state.loading ? <> <OcLoadingText label="使用状況を更新しています…" /></> : <span> 更新済み {new Intl.DateTimeFormat(APP_LOCALE, { timeStyle: "short" }).format(new Date(state.value!.observedAtMs))}</span>}
    </p>
  </AccountSection>)}</>;
}
