import { settingsTargetProps } from "./settingsCatalog";
import { useEffect, useState } from "react";
import { OcButton, OcCard, OcGroup, OcSettingsRow, OcStatus } from "../../design-system/components";
import type { OctopusAppInfo, OctopusClientDoctorReport, OctopusTransportDefaults } from "../../electron";
import { useProjectionGeneration } from "../../projectionLive";
import { useAppErrorToast } from "../../toasts";
import { resetOnboardingState } from "../../onboarding/onboardingStorage";
import { SettingsHeading } from "./SettingsHeading";
import { OpenSourceLicensesDialog } from "./OpenSourceLicensesDialog";

import { FactRow, useDeclaredProviders } from "./SettingsProviderState";
export function AboutSection() {
  const providerState = useDeclaredProviders();
  const generation = useProjectionGeneration();
  const [info, setInfo] = useState<OctopusAppInfo | null>(null);
  const [defaults, setDefaults] = useState<OctopusTransportDefaults | null>(null);
  const [reportError, setReportError] = useState("");
  const [licensesOpen, setLicensesOpen] = useState(false);
  const [logsState, setLogsState] = useState<"idle" | "opening" | "opened" | "error">("idle");
  const [doctorReport, setDoctorReport] = useState<OctopusClientDoctorReport | null>(null);
  const [doctorState, setDoctorState] = useState<"idle" | "running" | "complete" | "error">("idle");
  const [welcomeState, setWelcomeState] = useState<"idle" | "ready" | "error">("idle");
  useAppErrorToast(welcomeState === "error" ? "Could not reset the welcome screen." : "");
  useAppErrorToast(logsState === "error" ? "Could not open the client logs directory." : "");
  useAppErrorToast(doctorState === "error" ? "Doctor could not inspect the current Octopus Home." : "");
  useAppErrorToast(reportError);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      window.octopusTransport?.appInfo?.() ?? Promise.resolve(null),
      window.octopusTransport?.defaults?.() ?? Promise.resolve(null),
    ])
      .then(([nextInfo, nextDefaults]) => {
        if (cancelled) return;
        setInfo(nextInfo);
        setDefaults(nextDefaults);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function openReport() {
    setReportError("");
    try {
      if (!window.octopusTransport?.openProblemReport) throw new Error("不具合の報告はデスクトップアプリで利用できます。");
      await window.octopusTransport.openProblemReport();
    } catch (error) { setReportError(error instanceof Error ? error.message : String(error)); }
  }

  async function runDoctor() {
    if (!window.octopusTransport?.runClientDoctor) {
      setDoctorState("error");
      return;
    }
    setDoctorState("running");
    try {
      setDoctorReport(await window.octopusTransport.runClientDoctor());
      setDoctorState("complete");
    } catch {
      setDoctorState("error");
    }
  }

  async function openLogs() {
    if (!window.octopusTransport?.openClientLogs) {
      setLogsState("error");
      return;
    }
    setLogsState("opening");
    try {
      await window.octopusTransport.openClientLogs();
      setLogsState("opened");
    } catch {
      setLogsState("error");
    }
  }

  function resetWelcome() {
    try {
      resetOnboardingState();
      setWelcomeState("ready");
    } catch {
      setWelcomeState("error");
    }
  }

  return (
    <section className="settings-section">
      <SettingsHeading
        description="アプリの情報、診断結果、ローカルの状態を確認できます。"
        title="アプリ情報と診断"
      />

      <OcGroup title="アプリケーション" description="現在のデスクトッププロセスが報告する、読み取り専用の情報です。">
        <OcCard>
          <FactRow label="アプリケーション" value={info?.name ?? "Not reported in this environment"} />
          <FactRow label="バージョン" value={info ? `${info.version}${info.isPackaged ? "" : " · development"}` : "Not reported"} />
          <FactRow label="プラットフォーム" value={info?.platform ?? "Not reported"} />
          <OcSettingsRow {...settingsTargetProps("about.update-channel")}
            control={<OcStatus label={info?.isPackaged ? "パッケージ版" : "開発版"} tone="neutral" />}
            description="更新機能やリリースチャンネルが未設定のため、現在のビルドモードを表示します。"
            label="更新チャンネル"
          />
          <OcSettingsRow {...settingsTargetProps("about.licenses")}
            control={<OcButton onClick={() => setLicensesOpen(true)} size="sm" variant="secondary">表示</OcButton>}
            description="アプリに同梱される表示処理の依存パッケージについて、ライセンスと告知を表示します。"
            label="オープンソースライセンス"
          />
        </OcCard>
      </OcGroup>

      <OcGroup title="診断" description="サポートやデバッグに使う現在の情報です。">
        <OcCard>
          <OcSettingsRow {...settingsTargetProps("about.diagnostics")}
            control={<OcButton onClick={() => void openReport()}>不具合を報告…</OcButton>}
            description="診断情報を確認して保存またはコピーし、GitHub の Issue の下書きを開きます。"
            label="診断レポート"
          />
          <OcSettingsRow
            control={(
              <div className="settings-inline-actions">
                {doctorState === "complete" ? <OcStatus label={doctorReport?.findings.length ? `${doctorReport.findings.length} finding${doctorReport.findings.length === 1 ? "" : " 秒"}` : "合格"} tone={doctorReport?.findings.length ? "warning" : "success"} /> : null}
                <OcButton disabled={doctorState === "running"} onClick={() => void runDoctor()}>
                  {doctorState === "running" ? "確認しています…" : "診断を実行"}
                </OcButton>
              </div>
            )}
            description="Octopus のホームを変更せず、実行、台帳、パッケージの所有情報、記録、紐付けられたコンテキストのダイジェストを確認します。"
            label="診断ツール"
          />
          {doctorReport?.findings.map((finding) => (
            <div className="mx-4 my-2 rounded-xl border border-token-border-default bg-token-main-surface-secondary px-4 py-3 text-sm" key={`${finding.code}:${finding.subject}`}>
              <div className="font-medium text-token-foreground">{finding.code} · {finding.subject}</div>
              <div className="mt-1 text-token-text-secondary">{finding.reason}</div>
              <div className="mt-2 text-token-text-secondary"><span className="font-medium text-token-foreground">次に手動で行うこと：</span> {finding.next_step}</div>
            </div>
          ))}
          <OcSettingsRow {...settingsTargetProps("about.logs")}
            control={(
              <div className="settings-inline-actions">
                {logsState === "opened" ? <OcStatus label="開きました" tone="success" /> : null}
                <OcButton disabled={logsState === "opening"} onClick={() => void openLogs()}>
                  {logsState === "opening" ? "開いています…" : "ログを開く"}
                </OcButton>
              </div>
            )}
            description="デスクトップアプリがローカルに記録する、ローテーション式の JSONL ログを開きます。"
            label="ログ"
          />
          <FactRow label="表示用データの世代" value={String(generation)} />
        </OcCard>
      </OcGroup>

      <OcGroup title="実行基盤の情報" description="デスクトップとレジストリから取得した読み取り専用の情報です。">
        <OcCard>
          <FactRow label="Octopus のホーム" mono value={defaults?.octopusHome || "Not resolved"} />
          <FactRow label="有効なレジストリ" mono value={defaults?.registryRoot || providerState.registryRoot || "Not resolved"} />
          <FactRow label="実行基盤の状態" mono value={defaults?.stateRoot || "Not resolved"} />
          <FactRow label="移動台帳" mono value={defaults?.ledgerPath || "Not resolved"} />
          <FactRow label="ソースのチェックアウト先" mono value={defaults?.repoRoot || providerState.repoRoot || "Not resolved"} />
          <FactRow label="デスクトップの既定の接続先" mono value={defaults?.endpoint || "Not reported"} />
        </OcCard>
      </OcGroup>

      <OcGroup title="ようこそ" description="初回案内の進行状況は、アプリ側で管理します。">
        <OcCard>
          <OcSettingsRow {...settingsTargetProps("about.welcome")}
            control={(
              <div className="settings-inline-actions">
                {welcomeState === "ready" ? <OcStatus label="次回の起動に設定済み" tone="success" /> : null}
                {welcomeState === "error" ? <OcStatus label="リセットできませんでした" tone="danger" /> : null}
                <OcButton onClick={resetWelcome} variant="secondary">次回起動時に表示</OcButton>
              </div>
            )}
            description="ローカルの完了記録を消去し、次回起動時に初回案内を表示します。"
            label="初回案内"
          />
        </OcCard>
      </OcGroup>
      <OpenSourceLicensesDialog onClose={() => setLicensesOpen(false)} open={licensesOpen} />
    </section>
  );
}
