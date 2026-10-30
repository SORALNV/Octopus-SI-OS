import { useId, useRef } from "react";
import type { OctopusChatgptAccount } from "../../electron";
import { OcButton, OcDialog, OcIconButton } from "../../design-system/components";
import "./account.css";

export function AccountLogoutDialog({ account, open, busy, onClose, onConfirm }:
  { account: OctopusChatgptAccount | null; open: boolean; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  return <OcDialog open={open} onClose={onClose} busy={busy} size="narrow" ariaLabelledBy={titleId} initialFocusRef={cancelRef}>
    <form className="account-logout-form" onSubmit={(event) => {
      event.preventDefault();
      if (busy || !account?.signedIn) return;
      onClose();
      onConfirm();
    }}>
      <header className="account-logout-header">
        <h2 id={titleId}>ログアウトしますか？</h2>
        {account?.email ? <p title={account.email}>ログイン中のアカウント {account.email}</p> : null}
        <OcIconButton className="account-logout-close" glyph="close" label="ダイアログを閉じる" onClick={onClose} disabled={busy} variant="ghost" />
      </header>
      <div className="account-logout-description">
        <p>Octopus で ChatGPT を使い続けるには、もう一度ログインする必要があります。</p>
        <p>次の認証情報の保存先を使うアプリケーションとホームは、このログインを共有しています：<code>{account?.credentialHome ?? "このネイティブの認証情報の保存先"}</code>。ログアウトすると保存済みのログイン情報が削除され、ChatGPT に新たにリクエストする際に再ログインが必要になります。</p>
        <p>Octopus のホームとローカルの管理者アクセスは保持されます。</p>
      </div>
      <footer className="account-logout-actions">
        <OcButton buttonRef={cancelRef} variant="ghost" onClick={onClose} disabled={busy}>キャンセル</OcButton>
        <OcButton type="submit" tone="danger" disabled={busy || !account?.signedIn}>ログアウト</OcButton>
      </footer>
    </form>
  </OcDialog>;
}
