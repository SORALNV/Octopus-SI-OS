import { useEffect, useState } from "react";
import { OcCard, OcSettingsRow, OcStatus } from "../../design-system/components";
import type { OctopusProviderInterface } from "../../electron";
import { readProviderInterfaces } from "../../projectionClient";
import { useProjectionGeneration } from "../../projectionLive";
import { ProviderUsage } from "../ProviderUsage";

export type ProviderState = {
  providers: OctopusProviderInterface[];
  repoRoot: string;
  registryRoot: string;
  loading: boolean;
  error: string;
};

function SettingsProviderFacts({ provider }: { provider: OctopusProviderInterface }) {
  return (
    <dl className="settings-provider-facts">
      <div><dt>モデル</dt><dd>{provider.model || "未定義"}</dd></div>
      <div><dt>推論の強さ</dt><dd>{provider.reasoningEffort || "未定義"}</dd></div>
      <div><dt>ドライバー</dt><dd title={provider.runtimeHandlerRef}>{provider.runtimeHandlerRef || "未定義"}</dd></div>
      <div><dt>インターフェース ID</dt><dd title={provider.id}>{provider.id}</dd></div>
    </dl>
  );
}

export function ProviderSummary({ provider, compact = false }: { provider: OctopusProviderInterface; compact?: boolean }) {
  return (
    <div className={`settings-provider-summary ${compact ? "is-compact" : ""}`}>
      <div className="settings-provider-title">
        <div>
          <strong>{provider.label}</strong>
          <span>{provider.sourceNames.length ? provider.sourceNames.join(", ") : "定義されたソース名がありません"}</span>
        </div>
        <OcStatus label="定義済み" tone="success" />
      </div>
      <SettingsProviderFacts provider={provider} />
    </div>
  );
}

export function ProviderCard({ provider }: { provider: OctopusProviderInterface }) {
  return (
    <OcCard className="settings-provider-card">
      <ProviderSummary provider={provider} />
      {provider.rateLimits ? <ProviderUsage rateLimits={provider.rateLimits} /> : null}
    </OcCard>
  );
}

export function FactRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <OcSettingsRow
      control={<span className={`settings-fact ${mono ? "is-mono" : ""}`}>{value}</span>}
      label={label}
    />
  );
}

export function useDeclaredProviders(): ProviderState {
  const generation = useProjectionGeneration();
  const [state, setState] = useState<ProviderState>({
    providers: [],
    repoRoot: "",
    registryRoot: "",
    loading: true,
    error: "",
  });

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: "" }));
    readProviderInterfaces()
      .then((response) => {
        if (cancelled) return;
        setState({
          providers: response.providers,
          repoRoot: response.repoRoot ?? "",
          registryRoot: response.registryRoot ?? "",
          loading: false,
          error: response.error ?? "",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({
          providers: [],
          repoRoot: "",
          registryRoot: "",
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [generation]);

  return state;
}
