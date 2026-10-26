import { useMemo, useState } from "react";
import {
  useClientPreferences,
  useSetClientPreferences,
} from "../../clientPreferences";
import type { AdmittedClientSurfaceDocument, ClientSurfaceDocument } from "../../client-surfaces/types";
import { OcButton, OcCard, OcGroup, OcSettingsRow, OcStatus, OcSwitch } from "../../design-system/components";
import type { OctopusClientAccessProfile } from "../../electron";
import { copyText } from "../../runtimeFormat";
import { clientNavigationDestinations } from "../../shell/navigation";
import type { ClientSurfaceDescriptor } from "../../shell/surfaceTypes";
import { Glyph } from "../IconGlyphs";
import { SettingsHeading } from "./SettingsHeading";

type CopyState = "idle" | "root" | "document" | "template" | "error";

export function SurfacesSection({
  accessProfile,
  documentRoot,
  documents,
  surfaceErrors,
  surfaces,
}: {
  accessProfile: OctopusClientAccessProfile;
  documentRoot: string;
  documents: AdmittedClientSurfaceDocument[];
  surfaceErrors: string[];
  surfaces: ClientSurfaceDescriptor[];
}) {
  const preferences = useClientPreferences();
  const setClientPreferences = useSetClientPreferences();
  const [selectedDigest, setSelectedDigest] = useState("");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const navigationSurfaces = surfaces;
  const primaryDestinations = new Set(clientNavigationDestinations.map((destination) => destination.surfaceId));
  const hidden = new Set(preferences.hiddenSurfaceIds);
  const navigationSurfaceIds = new Set(navigationSurfaces.map((surface) => surface.id));
  const hiddenNavigationSurfaceIds = preferences.hiddenSurfaceIds.filter((surfaceId) => navigationSurfaceIds.has(surfaceId));
  const selected = useMemo(
    () => documents.find((document) => document.sourceDigest === selectedDigest) ?? documents[0] ?? null,
    [documents, selectedDigest],
  );

  const setSurfaceVisible = (surfaceId: string, visible: boolean) => {
    const next = new Set(preferences.hiddenSurfaceIds);
    if (visible) next.delete(surfaceId);
    else next.add(surfaceId);
    setClientPreferences({ hiddenSurfaceIds: [...next] });
  };

  async function copy(value: string, state: Exclude<CopyState, "idle" | "error">) {
    const copied = await copyText(value);
    setCopyState(copied ? state : "error");
    window.setTimeout(() => setCopyState("idle"), 1_500);
  }

  return (
    <section className="settings-section settings-surfaces-section">
      <SettingsHeading
        description="組み込みのナビゲーションと検証済みの文書は、共通の表示レジストリを使います。実行基盤の記録とは別に管理します。"
        title="画面"
      />

      <OcGroup
        actions={hiddenNavigationSurfaceIds.length > 0 ? (
          <OcButton onClick={() => setClientPreferences({ hiddenSurfaceIds: preferences.hiddenSurfaceIds.filter((surfaceId) => !navigationSurfaceIds.has(surfaceId)) })} variant="ghost">
            すべて表示
          </OcButton>
        ) : null}
        description="タスクとダッシュボードに追加で表示する画面を選びます。メインのナビゲーション項目は常に使えます。"
        title="ナビゲーション"
      >
        <OcCard>
          {navigationSurfaces.map((surface) => {
            const required = primaryDestinations.has(surface.id);
            const visible = required || !hidden.has(surface.id);
            return (
              <OcSettingsRow
                control={(
                  <OcSwitch
                    checked={visible}
                    disabled={required}
                    label={`表示 ${surface.label}`}
                    onCheckedChange={(checked) => setSurfaceVisible(surface.id, checked)}
                  />
                )}
                description={required ? "この画面はナビゲーションからいつでも開けます。" : surfaceDescription(surface)}
                key={surface.id}
                label={(
                  <span className="settings-surface-label">
                    <Glyph name={surface.glyph} size={16} />
                    <span>{surface.label}</span>
                  </span>
                )}
              />
            );
          })}
        </OcCard>
      </OcGroup>

      <OcGroup
        description="文書はワークスペース、音声通話、作業環境に表示する前に、スキーマ、リビジョン、ソースのダイジェスト、表示先を検証します。"
        title="画面レジストリ"
      >
        <OcCard>
          {documents.length ? documents.map((admitted) => {
            const document = admitted.document;
            return (
              <OcSettingsRow
                control={(
                  <div className="settings-inline-actions">
                    <OcStatus label={document.release_channel === "stable" ? "安定版" : "テスト"} tone={document.release_channel === "stable" ? "success" : "warning"} />
                    <OcButton onClick={() => setSelectedDigest(admitted.sourceDigest)} size="sm" variant="ghost">
                      詳細
                    </OcButton>
                  </div>
                )}
                description={`${surfaceTargetLabel(document)} · リビジョン ${document.revision} · ${admitted.sourcePath}`}
                key={admitted.sourceDigest}
                label={(
                  <span className="settings-surface-label">
                    <Glyph name={document.glyph} size={16} />
                    <span>{document.title}</span>
                  </span>
                )}
              />
            );
          }) : (
            <OcSettingsRow
              control={<OcStatus label="空" tone="muted" />}
              description={accessProfile === "live"
                ? "管理者では、保存済みの検証記録に基づく安定版の文書のみを受け付けます。"
                : "表示を試すには、テスト用の文書ルートに .surface.json ファイルを追加してください。"}
              label="表示が許可された文書がありません"
            />
          )}
        </OcCard>
      </OcGroup>

      {selected ? (
        <OcGroup
          actions={(
            <OcButton onClick={() => void copy(JSON.stringify(selected.document, null, 2), "document")} size="sm" variant="ghost">
              {copyState === "document" ? "コピーしました" : "文書をコピー"}
            </OcButton>
          )}
          description="選択した表示文書について、許可状況と出典を読み取り専用で確認します。"
          title={selected.document.title}
        >
          <OcCard>
            <SurfaceFact label="文書 ID" mono value={selected.document.id} />
            <SurfaceFact label="対象" value={surfaceTargetLabel(selected.document)} />
            <SurfaceFact label="リリース" value={selected.document.release_channel} />
            <SurfaceFact label="リビジョン" value={String(selected.document.revision)} />
            <SurfaceFact label="ソース" mono value={selected.sourcePath} />
            <SurfaceFact label="ダイジェスト" mono value={selected.sourceDigest} />
            <SurfaceFact label="表示形式" value={selected.document.render.kind} />
            <SurfaceFact label="検証済みのノード" value={`${selected.verdict.details.node_count} · depth ${selected.verdict.details.max_depth}`} />
            {selected.sourceArtifactId ? <SurfaceFact label="成果物" mono value={selected.sourceArtifactId} /> : null}
            {selected.sourceRunId ? <SurfaceFact label="実行" mono value={selected.sourceRunId} /> : null}
            {selected.sourceInterfaceId ? <SurfaceFact label="インターフェース" mono value={selected.sourceInterfaceId} /> : null}
          </OcCard>
        </OcGroup>
      ) : null}

      <OcGroup
        description={accessProfile === "lab"
          ? "テストではこのディレクトリを監視し、すべての検証に合格した文書だけを一括で再生成します。"
          : "管理者は検証記録から安定版の画面文書を読み取ります。ローカルでの作成・編集には対応していません。"}
        title="文書の転送"
      >
        <OcCard>
          <OcSettingsRow
            control={(
              <OcButton disabled={!documentRoot} onClick={() => void copy(documentRoot, "root")} size="sm" variant="secondary">
                {copyState === "root" ? "コピーしました" : "パスをコピー"}
              </OcButton>
            )}
            description={documentRoot || "現在のプロセスから文書のルートが報告されていません。"}
            label="文書のルート"
          />
          {accessProfile === "lab" ? (
            <OcSettingsRow
              control={(
                <OcButton onClick={() => void copy(JSON.stringify(testWidgetTemplate(), null, 2), "template")} size="sm" variant="secondary">
                  {copyState === "template" ? "コピーしました" : "テンプレートをコピー"}
                </OcButton>
              )}
              description="ルート階層の .surface.json ファイルとして保存できる、最小構成の音声ウィジェットをコピーします。"
              label="ひな形の文書"
            />
          ) : null}
          {copyState === "error" ? (
            <OcSettingsRow
              control={<OcStatus label="コピーできませんでした" tone="danger" />}
              description="デスクトップのクリップボードへの操作が拒否されました。"
              label="クリップボード"
            />
          ) : null}
          {surfaceErrors.slice(0, 4).map((error) => (
            <OcSettingsRow
              control={<OcStatus label="拒否されました" tone="danger" />}
              description={error}
              key={error}
              label="画面の文書"
            />
          ))}
        </OcCard>
      </OcGroup>
    </section>
  );
}

function SurfaceFact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <OcSettingsRow
      control={<span className={`settings-fact${mono ? " is-mono" : ""}`} title={value}>{value}</span>}
      label={label}
    />
  );
}

function surfaceTargetLabel(document: ClientSurfaceDocument): string {
  const target = document.target;
  if (target.kind === "voice.widget") return `Voice widget · ${target.slot}`;
  if (target.kind === "voice.window") return `Voice window · ${target.slot}`;
  if (target.kind === "workspace.surface") return `${target.placements.join(" + ")} placement`;
  return `Worker Environment · ${target.worker_environment_id}`;
}

function testWidgetTemplate(): ClientSurfaceDocument {
  return {
    schema: "octopus.client_surface",
    schema_version: 1,
    release_channel: "lab",
    id: "voice.example",
    revision: 1,
    title: "ウィジェットの例",
    glyph: "descriptor",
    target: {
      kind: "voice.widget",
      slot: "right",
      order: 50,
      layout: {
        min_width: 180,
        preferred_width: 240,
        max_width: 360,
        min_height: 120,
        preferred_height: 160,
        max_height: 240,
        content_fit: "reflow",
      },
    },
    data: { status: "Ready" },
    render: {
      kind: "native",
      density: "compact",
      root: {
        type: "stack",
        gap: "sm",
        children: [
          { type: "status", label: "文書を受け付けました", state: { path: "data.status" }, tone: "positive" },
          { type: "button", label: "設定を開く", glyph: "settings", variant: "secondary", action: { event: "client.command", payload: { command: "open_settings" } } },
        ],
      },
    },
  };
}

function surfaceDescription(surface: ClientSurfaceDescriptor): string {
  switch (surface.rendererKind) {
    case "builtin.dashboard":
      return "Execution environments, runs, bindings, and topology.";
    case "builtin.registry":
      return "Artifact, mark, run, and descriptor projections.";
    case "builtin.worker_environments":
      return "Declared worker environment kinds and live instances.";
    case "builtin.event_log":
      return "Artifact movements and evidence from the ledger.";
    case "builtin.applications":
      return "Installed interface-first packages and their project availability.";
    case "builtin.drivers":
      return "Worker-environment kinds, project setup, doors, tools, and live rooms.";
    default:
      return surface.description ?? (surface.source === "client"
        ? "Client-defined projection surface."
        : "Dashboard projection surface.");
  }
}
