import { APP_LOCALE } from "../locale";
import { useEffect, useRef, useState } from "react";
import { OcButton, OcCheckbox, OcTextArea } from "../design-system/components";

export type SupportReport = {
  report_id: string;
  captured_at: string;
  access: "live" | "lab" | "locked";
  application: { version: string; revision: string | null; platform: string; arch: string };
  [key: string]: unknown;
};
type ReportAction = { reportId: string; description: string };
declare global {
  interface Window {
    octopusSupport?: {
      collect(includeDetails: boolean): Promise<SupportReport>;
      copy(request: ReportAction): Promise<{ copied: boolean }>;
      save(request: ReportAction): Promise<{ saved: boolean }>;
      openIssue(request: ReportAction): Promise<{ opened: boolean }>;
    };
  }
}

export function SupportWindow() {
  const [report, setReport] = useState<SupportReport | null>(null);
  const [description, setDescription] = useState("");
  const [includeDetails, setIncludeDetails] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const generation = useRef(0);

  async function collect(details = includeDetails) {
    const attempt = ++generation.current;
    setBusy(true); setError(""); setNotice(""); setReport(null);
    try {
      if (!window.octopusSupport) throw new Error("不具合の報告は Octopus のデスクトップアプリで利用できます。");
      const result = await window.octopusSupport.collect(details);
      if (attempt === generation.current) setReport(result);
    } catch (failure) {
      if (attempt === generation.current) setError(failure instanceof Error ? failure.message : String(failure));
    } finally { if (attempt === generation.current) setBusy(false); }
  }

  useEffect(() => { void collect(false); return () => { generation.current++; }; }, []);

  async function act(action: "copy" | "save" | "openIssue") {
    if (!report || !window.octopusSupport) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await window.octopusSupport[action]({ reportId: report.report_id, description });
      setNotice(action === "copy" ? "報告内容をコピーしました。" : action === "openIssue" ? "ブラウザーで下書きを開きました。内容を確認して GitHub に送信してください。" : "saved" in result && result.saved ? "報告内容を保存しました。GitHub の Issue に添付できます。" : "");
    } catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)); }
    finally { setBusy(false); }
  }

  return (
    <main className="flex h-screen flex-col bg-token-main-surface-primary text-token-foreground">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
        <header>
          <h1 className="text-xl font-semibold">不具合を報告</h1>
          <p className="mt-2 text-sm text-token-description-foreground">起きた問題を教えてください。診断情報は、共有する前に内容を確認してください。</p>
        </header>
        <OcTextArea autoFocus label="どのような問題が起きましたか？" showLabel textareaClassName="min-h-32" id="support-description" maxLength={4000} onChange={(event) => setDescription(event.target.value)} placeholder="何をしていて、どのような動作を期待していましたか？" value={description} />
        <section aria-label="診断" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium">診断</h2>
            <OcButton disabled={busy} onClick={() => void collect()} size="sm" variant="ghost">更新</OcButton>
          </div>
          <p className="text-sm text-token-description-foreground">ビルド情報、セットアップの進捗、最近のアプリの動作を含めます。会話やプロジェクトのファイルは含まれず、自動で送信されることもありません。</p>
          <OcCheckbox checked={includeDetails} disabled={busy || (!includeDetails && report?.access !== "live")} label="エラーの詳細を含める" onCheckedChange={(checked) => { setIncludeDetails(checked); void collect(checked); }} showLabel />
          {includeDetails ? <p className="text-sm text-token-description-foreground">エラーの詳細には、個人のパス、要求内容、認証情報などが含まれる場合があります。共有する前にプレビューを確認してください。</p> : null}
          {report && report.access !== "live" ? <p className="text-sm text-token-description-foreground">この報告にはアプリの基本情報だけが含まれます。セットアップ情報やログを含めるには、管理者としてロックを解除し、この画面を開き直してください。</p> : null}
          {report ? <details className="rounded-xl border border-token-border p-3">
            <summary className="cursor-pointer text-sm">診断情報のプレビュー</summary>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs select-text">{JSON.stringify(report, null, 2)}</pre>
          </details> : <p aria-live="polite" className="text-sm text-token-description-foreground">{busy ? "診断情報を収集しています…" : "診断情報はまだ収集されていません。"}</p>}
          {report ? <p className="text-xs text-token-description-foreground">収集日時 {new Date(report.captured_at).toLocaleTimeString(APP_LOCALE)} · {report.application.version} · {report.application.revision?.slice(0, 8) ?? "ビルドのリビジョンは記録されていません"}</p> : null}
        </section>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <p aria-live="polite" className="text-sm text-token-description-foreground">{notice}</p>
      </div>
      <footer className="shrink-0 space-y-3 border-t border-token-border p-5">
        <p className="text-xs text-token-description-foreground">説明とビルド情報を含む公開 Issue の下書きを GitHub で開きます。診断情報を共有する場合は、保存した報告ファイルを添付してください。</p>
        <div className="flex flex-wrap justify-end gap-2">
          <OcButton disabled={busy || !report} onClick={() => void act("copy")} variant="ghost">報告内容をコピー</OcButton>
          <OcButton disabled={busy || !report} onClick={() => void act("save")} variant="secondary">報告内容を保存…</OcButton>
          <OcButton disabled={busy || !report} onClick={() => void act("openIssue")}>GitHub の下書きを開く</OcButton>
        </div>
      </footer>
    </main>
  );
}
