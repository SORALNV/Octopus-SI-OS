import { useLayoutEffect, useRef, useState } from "react";
import { useChatgptAccount } from "../../account/useChatgptAccount";
import { OctopusLoadingState } from "../OctopusLoadingLogo";
import openaiLogo from "../../assets/openai-logo.svg?raw";
import "../account/account.css";

export function ChatGptSignInGate() {
  const state = useChatgptAccount();
  const waiting = state.action === "waiting" || state.action === "cancelling";
  const busy = state.action !== "idle";
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const copyAttempt = useRef({ url: state.signInUrl, generation: 0, mounted: false });
  useLayoutEffect(() => {
    const attempt = copyAttempt.current;
    attempt.url = state.signInUrl;
    attempt.generation += 1;
    attempt.mounted = true;
    setCopied(false);
    setCopyError("");
    return () => { attempt.mounted = false; attempt.generation += 1; };
  }, [state.signInUrl]);
  async function copySignInLink() {
    const url = state.signInUrl;
    if (!url || !copyAttempt.current.mounted) return;
    const generation = ++copyAttempt.current.generation;
    const isCurrent = () => copyAttempt.current.mounted && copyAttempt.current.url === url && copyAttempt.current.generation === generation;
    try {
      await navigator.clipboard.writeText(url);
      if (!isCurrent()) return;
      setCopied(true);
      setCopyError("");
    } catch (error) {
      if (!isCurrent()) return;
      setCopied(false);
      setCopyError(error instanceof Error ? error.message : String(error));
    }
  }
  if (state.loading && !state.account) return <main className="welcome">
    <OctopusLoadingState className="app-loading-state" label="ChatGPT アカウントを確認しています" />
  </main>;

  const error = state.error || state.signInStatusError || copyError;
  return <main className="chatgpt-signin" data-state={state.action} aria-labelledby="chatgpt-signin-title">
    <header className="welcome-top chatgpt-signin-brand">
      <div className="welcome-brand"><img className="welcome-brand-mark" src="./octopus-logo.png" alt="" /><span className="welcome-brand-name">Octopus&nbsp;OS</span></div>
    </header>
    <section className="chatgpt-signin-panel">
      <div className="chatgpt-signin-heading">
        <span className="chatgpt-signin-logo" aria-hidden="true" dangerouslySetInnerHTML={{ __html: openaiLogo }} />
        <h1 id="chatgpt-signin-title" className={waiting ? "sr-only" : "chatgpt-signin-title"}>{!state.account && state.error && !busy ? "ChatGPT アカウントを利用できません" : "ChatGPT にログイン"}</h1>
        {waiting ? <p className="chatgpt-signin-body">ブラウザーでログインを続けてください</p> : null}
      </div>
      {!waiting && (state.error || state.account?.authType === "apiKey" || state.account?.authType === "amazonBedrock") ? <p className="chatgpt-signin-body">
        {state.account?.authType === "apiKey" ? "この保存先は API キー認証を使っています。続けるには ChatGPT でログインしてください。"
          : state.account?.authType === "amazonBedrock" ? "この保存先は Amazon Bedrock 認証を使っています。続けるには ChatGPT でログインしてください。"
            : "アカウントを確認できませんでした。再確認するか、ChatGPT でログインしてください。"}
      </p> : null}
      {error ? <p className="chatgpt-signin-body account-error" role="alert">{error}</p> : null}
      <div className="chatgpt-signin-actions">
        {waiting ? <>
          {state.signInStatusError ? <button className="chatgpt-signin-button" type="button" onClick={() => void state.retrySignInStatus?.()}>ログインの確認を再試行</button> : null}
          <button className="chatgpt-signin-button is-secondary" type="button" disabled={state.action === "cancelling"} onClick={() => void state.cancel?.()}>{state.action === "cancelling" ? "キャンセルしています…" : "ログインをキャンセル"}</button>
          <div className="chatgpt-signin-copy-row"><span>ブラウザーが開きませんでしたか？</span><button className="chatgpt-signin-copy" type="button" disabled={!state.signInUrl || state.action === "cancelling"} onClick={() => void copySignInLink()}>{copied ? "コピーしました" : "ログイン用リンクをコピー"}</button></div>
        </> : <>
          <button className="chatgpt-signin-button" type="button" onClick={() => void state.signIn?.()} disabled={busy || state.loading || !state.signIn}>{state.action === "starting" ? "ブラウザーを開いています…" : "ChatGPT で続ける"}</button>
          {state.error ? <button className="chatgpt-signin-button is-secondary" type="button" disabled={busy || state.loading || !state.refresh} onClick={() => void state.refresh?.()}>アカウントの確認を再試行</button> : null}
        </>}
      </div>
    </section>
  </main>;
}
