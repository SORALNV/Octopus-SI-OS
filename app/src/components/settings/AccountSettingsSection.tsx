import { useState } from "react";
import { OcLoadingText } from "../../design-system/LoadingSkeleton";
import { useChatgptAccount } from "../../account/useChatgptAccount";
import { useChatgptUsage } from "../../account/useChatgptUsage";
import { accountPlanLabel } from "../../account/chatgptUsageModel";
import { OcButton, OcSettingsRow } from "../../design-system/components";
import { AccountLogoutDialog } from "../account/AccountLogoutDialog";
import { AccountSection, AccountUsageSections } from "../account/AccountUsage";
import { SettingsHeading } from "./SettingsHeading";
import { settingsTargetProps } from "./settingsCatalog";

export function AccountSettingsSection() {
  const state = useChatgptAccount();
  const account = state.account;
  const usage = useChatgptUsage(account);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const busy = state.action !== "idle";
  const status = !account ? "Unavailable"
    : account.signedIn ? accountPlanLabel(account.planType) : "未ログイン";
  async function refresh() {
    const refreshed = await state.refresh?.();
    if (refreshed?.signedIn) await usage.refresh?.();
  }
  return <section className="settings-section account-settings">
    <SettingsHeading title="アカウント" actions={<OcButton disabled={busy || state.loading || usage.loading} onClick={() => void refresh()}>更新</OcButton>} />
    {state.error ? <div className="account-inline-notice account-error" role="alert"><span>{state.error}</span>
      <OcButton disabled={busy || state.loading} onClick={() => void state.refresh?.()}>アカウントの確認を再試行</OcButton>
    </div> : null}
    <AccountSection title="アカウント" {...settingsTargetProps("account.identity")}>
      <div className="account-row-list">
        <OcSettingsRow label="状態" control={<span className="account-value">{state.loading && !account ? <OcLoadingText label="アカウントを確認しています…">アカウントの状態</OcLoadingText> : status}</span>} />
        <OcSettingsRow label="メールアドレス" control={<span className="account-value">{state.loading && !account ? <OcLoadingText label="アカウントのメールアドレスを読み込んでいます…">アカウントのメールアドレス</OcLoadingText> : account?.email ?? "利用できません"}</span>} />
      </div>
    </AccountSection>
    <div {...settingsTargetProps("account.usage")} className="account-usage-sections">
      <AccountUsageSections state={usage} signedIn={Boolean(account?.signedIn)} accountUnavailable={!account && !state.loading} accountLoading={state.loading && !account} />
    </div>
    <AccountSection title="ログイン" {...settingsTargetProps("account.logout")}>
      {state.signInStatusError ? <div className="account-inline-notice account-error" role="alert"><span>{state.signInStatusError}</span></div> : null}
      {state.action === "waiting" || state.action === "cancelling" ? <div className="account-section-actions">
        {state.signInStatusError ? <OcButton onClick={() => void state.retrySignInStatus?.()}>ログインの確認を再試行</OcButton> : null}
        <OcButton disabled={state.action === "cancelling"} onClick={() => void state.cancel?.()}>ログインをキャンセル</OcButton>
      </div> : null}
      <div className="account-row-list">
        <OcSettingsRow label={account?.signedIn ? "ChatGPT からログアウト" : "ChatGPT でログイン"} control={account?.signedIn
          ? <OcButton disabled={busy || state.loading} onClick={() => setLogoutOpen(true)}>{state.action === "signing-out" ? "ログアウトしています…" : "ログアウト"}</OcButton>
          : <OcButton disabled={busy || state.loading || !state.signIn} onClick={() => void state.signIn?.()}>{state.action === "starting" ? "ブラウザーを開いています…" : "ChatGPT で続ける"}</OcButton>} />
      </div>
    </AccountSection>
    <AccountLogoutDialog account={account} open={logoutOpen} busy={busy || state.loading} onClose={() => setLogoutOpen(false)} onConfirm={() => void state.logout?.()} />
  </section>;
}
