import { OcLoadingRows } from "../../design-system/LoadingSkeleton";
import { useEffect, useState } from "react";
import { OcButton, OcCard, OcEmptyState, OcGroup, OcStatus, OcTextField } from "../../design-system/components";
import type { OctopusAppInfo, OctopusTransportDefaults } from "../../electron";
import { loadRuntimePrefs, saveRuntimePrefs, validateRuntimeEndpoint } from "../../runtimeClient";
import { useAppErrorToast } from "../../toasts";
import { SettingsHeading } from "./SettingsHeading";

import { FactRow, ProviderCard, useDeclaredProviders } from "./SettingsProviderState";
import { settingsTargetProps } from "./settingsCatalog";
export function ConnectionsSection() {
  const providerState = useDeclaredProviders();
  const [info, setInfo] = useState<OctopusAppInfo | null>(null);
  const [defaults, setDefaults] = useState<OctopusTransportDefaults | null>(null);
  const [endpoint, setEndpoint] = useState(() => loadRuntimePrefs().baseUrl);
  const [savedEndpoint, setSavedEndpoint] = useState(() => loadRuntimePrefs().baseUrl);
  const [saveState, setSaveState] = useState<"idle" | "checking" | "saved" | "error">("idle");
  const [endpointError, setEndpointError] = useState("");
  useAppErrorToast(endpointError);
  useAppErrorToast(providerState.error);

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

  async function persistEndpoint() {
    setSaveState("checking");
    setEndpointError("");
    try {
      await validateRuntimeEndpoint(endpoint);
      saveRuntimePrefs({ baseUrl: endpoint });
      const stored = loadRuntimePrefs().baseUrl;
      setEndpoint(stored);
      setSavedEndpoint(stored);
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      setEndpointError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section className="settings-section">
      <SettingsHeading
        description="デスクトップとレジストリから取得した接続の設定と情報です。"
        title="接続"
      />

      <OcGroup {...settingsTargetProps("connections.endpoint")} title="接続" description="このクライアントがチャットの成果物を送信する接続先です。">
        <OcCard>
          <div className="settings-endpoint-editor">
            <OcTextField
              error={endpointError || undefined}
              label="実行基盤の接続先"
              onChange={(event) => {
                setEndpoint(event.currentTarget.value);
                setSaveState("idle");
                setEndpointError("");
              }}
              placeholder="http://127.0.0.1:9800"
              showLabel
              value={endpoint}
            />
            <div className="settings-endpoint-actions">
              {saveState === "saved" ? <OcStatus label="保存済み" tone="success" /> : null}
              {saveState === "checking" ? <OcStatus label="確認中" tone="muted" /> : null}
              <OcButton
                disabled={saveState === "checking" || endpoint.trim() === savedEndpoint}
                onClick={() => void persistEndpoint()}
                variant="primary"
              >
                接続先を保存
              </OcButton>
            </div>
          </div>
        </OcCard>
      </OcGroup>

      <OcGroup {...settingsTargetProps("connections.facts")} title="アプリの情報" description="現在のデスクトッププロセスが報告する、読み取り専用の情報です。">
        <OcCard>
          <FactRow label="アプリケーション" value={info?.name ?? "Not reported in this environment"} />
          <FactRow label="バージョン" value={info ? `${info.version}${info.isPackaged ? "" : " · development"}` : "Not reported"} />
          <FactRow label="プラットフォーム" value={info?.platform ?? "Not reported"} />
          <FactRow label="Octopus のホーム" mono value={defaults?.octopusHome || "Not resolved"} />
          <FactRow label="有効なレジストリ" mono value={defaults?.registryRoot || providerState.registryRoot || "Not resolved"} />
          <FactRow label="実行基盤の状態" mono value={defaults?.stateRoot || "Not resolved"} />
          <FactRow label="移動台帳" mono value={defaults?.ledgerPath || "Not resolved"} />
          <FactRow label="ソースのチェックアウト先" mono value={defaults?.repoRoot || providerState.repoRoot || "Not resolved"} />
          <FactRow label="デスクトップの既定の接続先" mono value={defaults?.endpoint || "Not reported"} />
        </OcCard>
      </OcGroup>

      <OcGroup
        {...settingsTargetProps("connections.providers")}
        title="定義済みのプロバイダーインターフェース"
        description="このクライアントが参照できるレジストリの記述子です。ここで値を上書きすることはできません。"
      >
        <div className="settings-provider-grid">
          {providerState.providers.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}
          {providerState.loading && !providerState.providers.length ? <OcLoadingRows label="プロバイダーの記述子を読み込んでいます…" /> : null}
          {!providerState.loading && providerState.providers.length === 0 ? (
            <OcEmptyState
              className="min-h-0 py-6"
              detail={providerState.error || undefined}
              glyph={providerState.error ? "warning" : undefined}
              size="compact"
              title={providerState.error ? "プロバイダーのインターフェースを取得できません" : "プロバイダーのインターフェースが定義されていません。"}
              tone={providerState.error ? "danger" : "neutral"}
            />
          ) : null}
        </div>
      </OcGroup>
    </section>
  );
}
