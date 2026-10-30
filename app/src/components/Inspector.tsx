import { useEffect, useMemo, useState } from "react";
import type { AdmittedClientSurfaceDocument } from "../client-surfaces/types";
import { inspectorTabs } from "../data/topology";
import type {
  DetailRow,
  EnvironmentNode,
  EventLogRow,
  InterfaceSummary,
  RunProjection,
  SelectionRef,
  StatRow,
  TopologySnapshot,
  WorkerEnvironmentProjection,
} from "../data/topology";
import { Glyph } from "./IconGlyphs";
import { OctopusLoadingState } from "./OctopusLoadingLogo";
import { JsonPanel } from "./JsonPanel";
import { WorkerEnvironmentPreview } from "./worker-environment/WorkerEnvironmentPreview";
import { defaultWorkerEnvironmentPaneTarget, dispatchOpenWorkerEnvironmentPane } from "./worker-environment/workerEnvironmentPane";

type Props = {
  snapshot: TopologySnapshot;
  selection: SelectionRef | null;
  onSelect: (selection: SelectionRef | null) => void;
  onClose?: () => void;
  surfaces?: AdmittedClientSurfaceDocument[];
};

type InspectorTab = (typeof inspectorTabs)[number];

type ResolvedSelection =
  | { kind: "environment"; environment: EnvironmentNode }
  | { kind: "run"; environment: EnvironmentNode; run: RunProjection }
  | { kind: "interface"; summary: InterfaceSummary };

export function Inspector({ snapshot, selection, onSelect, onClose, surfaces = [] }: Props) {
  const [activeTab, setActiveTab] = useState<InspectorTab>("Overview");
  const resolved = useMemo(() => resolveSelection(snapshot, selection), [snapshot, selection]);

  useEffect(() => {
    setActiveTab("Overview");
  }, [selection?.kind, selection?.id]);

  return (
    <aside className="inspector">
      {resolved ? (
        <>
          <InspectorHead resolved={resolved} onClose={onClose ?? (() => onSelect(null))} />

          {resolved.kind === "interface" ? (
            <InterfaceOverview summary={resolved.summary} snapshot={snapshot} onSelect={onSelect} />
          ) : (
          <>
          <div className="inspector-tabs">
            {inspectorTabs.map((tab) => (
              <button
                className={tab === activeTab ? "is-active" : ""}
                type="button"
                aria-pressed={tab === activeTab}
                onClick={() => setActiveTab(tab)}
                key={({ Overview: "概要", Runs: "実行", Environments: "環境", Interfaces: "インターフェース", Policy: "ポリシー", "Event Log": "イベントログ" })[tab]}
              >
                {({ Overview: "概要", Runs: "実行", Environments: "環境", Interfaces: "インターフェース", Policy: "ポリシー", "Event Log": "イベントログ" })[tab]}
              </button>
            ))}
          </div>

          <InspectorPanel resolved={resolved} activeTab={activeTab} snapshot={snapshot} onSelect={onSelect} surfaces={surfaces} />
          </>
          )}
        </>
      ) : snapshot.projection.mode === "connecting" ? (
        <OctopusLoadingState className="surface-content-loading-state" label="構成図を読み込んでいます" />
      ) : (
        <EmptyInspector projectionLabel={snapshot.projection.label} projectionDetail={snapshot.projection.detail} />
      )}
    </aside>
  );
}

function InspectorHead({ resolved, onClose }: { resolved: ResolvedSelection; onClose: () => void }) {
  const title = resolved.kind === "environment"
    ? resolved.environment.name
    : resolved.kind === "interface"
      ? resolved.summary.id
      : resolved.run.worker;
  const subtitle = resolved.kind === "environment"
    ? resolved.environment.statusLabel
    : resolved.kind === "interface"
      ? `${resolved.summary.type} interface`
      : `${resolved.run.statusLabel} / ${resolved.environment.name}`;
  const accent = resolved.kind === "environment"
    ? resolved.environment.accent
    : resolved.kind === "interface"
      ? "blue"
      : statusAccent(resolved.run.statusLabel);
  return (
    <header className="inspector-head">
      <div className="inspector-id">
        <span className="inspector-cube"><Glyph name={resolved.kind === "environment" ? "ee" : resolved.kind === "interface" ? "interfaces" : "dashboard"} size={17} /></span>
        <span>
          <strong>{title}</strong>
          <small><i className={`status-dot ${accent}`} />{subtitle}</small>
        </span>
      </div>
      <div className="inspector-actions">
        <button className="chat-rail-icon" type="button" onClick={onClose} aria-label="選択を解除" title="選択を解除">
          <Glyph name="close" size={14} />
        </button>
      </div>
    </header>
  );
}

function InspectorPanel({
  resolved,
  activeTab,
  snapshot,
  onSelect,
  surfaces,
}: {
  resolved: Exclude<ResolvedSelection, { kind: "interface" }>;
  activeTab: InspectorTab;
  snapshot: TopologySnapshot;
  onSelect: (selection: SelectionRef) => void;
  surfaces: AdmittedClientSurfaceDocument[];
}) {
  if (activeTab === "Runs") {
    return resolved.kind === "environment"
      ? <EnvironmentRuns environment={resolved.environment} onSelect={onSelect} />
      : <RunCheckpoints run={resolved.run} />;
  }

  if (activeTab === "Environments") {
    return (
      <WorkerEnvironmentsPanel
        projections={resolved.kind === "environment" ? resolved.environment.workerEnvironments : resolved.run.workerEnvironments}
        surfaces={surfaces}
      />
    );
  }

  if (activeTab === "Interfaces") {
    return resolved.kind === "environment"
      ? <InterfacesPanel rows={resolved.environment.interfaces} bindings={resolved.environment.bindings} artifacts={resolved.environment.artifacts} onSelect={onSelect} />
      : <InterfacesPanel rows={resolved.run.interfaces} bindings={resolved.run.bindings} artifacts={resolved.run.artifacts} onSelect={onSelect} />;
  }

  if (activeTab === "Policy") {
    return (
      <PanelScroll>
        <JsonBlock title="ポリシー JSON" data={resolved.kind === "environment" ? resolved.environment.policyJson : resolved.run.policyJson} />
      </PanelScroll>
    );
  }

  if (activeTab === "Event Log") {
    return resolved.kind === "environment"
      ? <EventLogPanel events={resolved.environment.eventLog} marks={resolved.environment.marks} />
      : <EventLogPanel events={resolved.run.eventLog} marks={resolved.run.marks} />;
  }

  return resolved.kind === "environment"
    ? (
      <EnvironmentOverview
        environment={resolved.environment}
        childEnvironments={snapshot.environments.filter((env) => env.parentId === resolved.environment.id)}
        onSelect={onSelect}
      />
    )
    : <RunOverview environment={resolved.environment} run={resolved.run} onSelect={onSelect} />;
}

function EnvironmentOverview({
  environment,
  childEnvironments,
  onSelect,
}: {
  environment: EnvironmentNode;
  childEnvironments: EnvironmentNode[];
  onSelect: (selection: SelectionRef) => void;
}) {
  return (
    <PanelScroll>
      <section className="inspector-section">
        <h2>目標</h2>
        <p>{environment.goal}</p>
        <StatsTable rows={environment.stats} />
      </section>

      <section className="inspector-section">
        <h2>実行</h2>
        <RunList runs={environment.runs} onSelect={onSelect} />
      </section>

      {childEnvironments.length > 0 ? (
        <section className="inspector-section">
          <h2>子環境</h2>
          <div className="child-env-list">
            {childEnvironments.map((child) => (
              <button
                className="child-env-row"
                type="button"
                onClick={() => onSelect({ kind: "environment", id: child.id })}
                key={child.id}
              >
                <Glyph name="ee" size={13} />
                <span>
                  <strong>{child.name}</strong>
                  <small> · {child.runs.length} 実行{child.runs.length === 1 ? "" : " 秒"}</small>
                </span>
                <i className="chevron">›</i>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <JsonBlock title="表示用データの JSON" data={environment.runtimeJson} />

      <section className="inspector-section">
        <h2>インターフェース</h2>
        <DetailList rows={environment.interfaces} empty="no interfaces projected for this EE" onSelect={onSelect} />
      </section>

      <section className="inspector-section">
        <h2>ワーカー / 紐付け</h2>
        <TokenRows
          groups={[
            { label: "ワーカー", rows: environment.workers },
            { label: "紐付け", rows: environment.bindings },
          ]}
        />
      </section>

      <EventLogCompact events={environment.eventLog} />
    </PanelScroll>
  );
}

function RunOverview({ environment, run, onSelect }: { environment: EnvironmentNode; run: RunProjection; onSelect: (selection: SelectionRef) => void }) {
  return (
    <PanelScroll>
      <section className="inspector-section">
        <h2>目標</h2>
        <p>{run.goal}</p>
        <StatsTable rows={run.stats} />
      </section>

      <section className="inspector-section">
        <h2>チェックポイント</h2>
        <CheckpointList run={run} />
      </section>

      <section className="inspector-section">
        <h2>インターフェース</h2>
        <DetailList rows={run.interfaces} empty="no bound interfaces projected for this run" onSelect={onSelect} />
      </section>

      <JsonBlock title="表示用データの JSON" data={{ ...run.runtimeJson, environment: environment.name }} />
    </PanelScroll>
  );
}

function EnvironmentRuns({ environment, onSelect }: { environment: EnvironmentNode; onSelect: (selection: SelectionRef) => void }) {
  return (
    <PanelScroll>
      <section className="inspector-section">
        <h2>実行中のタスク</h2>
        <RunList runs={environment.runs} onSelect={onSelect} />
      </section>
    </PanelScroll>
  );
}

function RunCheckpoints({ run }: { run: RunProjection }) {
  return (
    <PanelScroll>
      <section className="inspector-section">
        <h2>チェックポイント</h2>
        <CheckpointList run={run} />
      </section>
    </PanelScroll>
  );
}

function WorkerEnvironmentsPanel({ projections, surfaces }: {
  projections: WorkerEnvironmentProjection[];
  surfaces: AdmittedClientSurfaceDocument[];
}) {
  const activeCount = projections.filter((projection) => projection.live).length;
  return (
    <PanelScroll>
      <section className="inspector-section">
        <header className="inspector-section-title">
          <h2>作業環境</h2>
          {projections.length ? <span>{activeCount ? `${activeCount} active` : `${projections.length} projected`}</span> : null}
        </header>
        {projections.length ? (
          <div className="inspector-worker-environment-previews">
            {projections.map((projection) => (
              <button
                aria-label={`開く ${projection.label || projection.id} をサイドパネルに表示`}
                className="inspector-worker-environment-open"
                key={projection.id}
                onClick={() => dispatchOpenWorkerEnvironmentPane(defaultWorkerEnvironmentPaneTarget(projection, surfaces))}
                type="button"
              >
                <WorkerEnvironmentPreview compact environment={projection} surfaces={surfaces} />
              </button>
            ))}
          </div>
        ) : <EmptyRow>作業環境の情報がありません</EmptyRow>}
      </section>
    </PanelScroll>
  );
}

function InterfacesPanel({ rows, bindings, artifacts, onSelect }: { rows: DetailRow[]; bindings: DetailRow[]; artifacts: DetailRow[]; onSelect?: (selection: SelectionRef) => void }) {
  return (
    <PanelScroll>
      <section className="inspector-section">
        <h2>インターフェース</h2>
        <DetailList rows={rows} empty="no interfaces projected" onSelect={onSelect} />
      </section>
      <section className="inspector-section">
        <h2>紐付け</h2>
        <DetailList rows={bindings} empty="no bindings projected" />
      </section>
      <section className="inspector-section">
        <h2>成果物</h2>
        <DetailList rows={artifacts} empty="no artifacts projected" />
      </section>
    </PanelScroll>
  );
}

function EventLogPanel({ events, marks }: { events: EventLogRow[]; marks: DetailRow[] }) {
  return (
    <PanelScroll>
      <EventLogCompact events={events} />
      <section className="inspector-section">
        <h2>検証記録</h2>
        <DetailList rows={marks} empty="no marks projected" />
      </section>
    </PanelScroll>
  );
}

function CheckpointList({ run }: { run: RunProjection }) {
  if (run.checkpoints.length === 0) return <EmptyRow>この実行にはチェックポイントの情報がありません</EmptyRow>;
  return (
    <div className="checkpoint-cards">
      {run.checkpoints.map((checkpoint) => {
        const artifactChips = dedupeChips([checkpoint.artifactLabel, checkpoint.tool]);
        const interfaceChips = dedupeChips([checkpoint.interfaceName]);
        return (
          <div className="checkpoint-card" key={checkpoint.id}>
            <div className="checkpoint-card-head">
              <strong>{checkpoint.label}</strong>
              <small className="checkpoint-io">入力 ↔ 出力</small>
              <span className="checkpoint-when">
                {checkpoint.time ? <span>{checkpoint.time}</span> : null}
                <i className={`status-dot ${checkpointAccent(checkpoint.status)}`} />
              </span>
            </div>
            <div className="checkpoint-bindings">
              <div>
                <span className="group">成果物の紐付け</span>
                {artifactChips.length ? artifactChips.map((chip) => <i title={chip} key={chip}>{chip}</i>) : <em>情報がありません</em>}
              </div>
              <div>
                <span className="group">インターフェースの紐付け</span>
                {interfaceChips.length ? interfaceChips.map((chip) => <i title={chip} key={chip}>{chip}</i>) : <em>情報がありません</em>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function checkpointAccent(status: string): string {
  const text = status.toLowerCase();
  if (text === "made") return "green";
  return "gray";
}

function dedupeChips(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.map((value) => (value ?? "").trim()).filter(Boolean)));
}

function RunList({ runs, onSelect }: { runs: RunProjection[]; onSelect: (selection: SelectionRef) => void }) {
  if (runs.length === 0) return <EmptyRow>この実行環境に実行中のタスクはありません</EmptyRow>;
  return (
    <div className="run-list">
      {runs.map((run) => (
        <button className="run-list-row" type="button" onClick={() => onSelect({ kind: "run", id: run.id })} key={run.id}>
          <span>
            <strong>{run.worker}</strong>
            <small>{run.goal}</small>
            <small className="run-counts">
              {run.checkpoints.length} チェックポイント{run.checkpoints.length === 1 ? "" : " 秒"} · {run.bindings.length} インターフェースの紐付け{run.bindings.length === 1 ? "" : " 秒"} · {run.artifacts.length} 成果物{run.artifacts.length === 1 ? "" : " 秒"}
            </small>
          </span>
          <em>{run.statusLabel.toLowerCase()} {run.runningFor}</em>
        </button>
      ))}
    </div>
  );
}

function TokenRows({ groups }: { groups: Array<{ label: string; rows: DetailRow[] }> }) {
  return (
    <div className="token-groups">
      {groups.map((group) => (
        <div className="token-group" key={group.label}>
          <span>{group.label}</span>
          <div className="token-line">
            {group.rows.length === 0 ? <em>なし</em> : group.rows.map((row) => <span key={`${group.label}:${row.name}`}>{row.name}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailList({ rows, empty, onSelect }: { rows: DetailRow[]; empty: string; onSelect?: (selection: SelectionRef) => void }) {
  if (rows.length === 0) return <EmptyRow>{empty}</EmptyRow>;
  return (
    <div className="list-stack">
      {rows.map((item) => {
        const body = (
          <>
            <span>
              <strong>{item.name}</strong>
              <small>{item.description}</small>
            </span>
            <span className={`right-meta ${item.tone ?? ""}`}>
              <i>{item.tag}</i>
              {item.status ? <em><b />{item.status}</em> : null}
            </span>
          </>
        );
        if (item.ref && onSelect) {
          const ref = item.ref;
          return (
            <button className="detail-row is-clickable" type="button" onClick={() => onSelect(ref)} key={`${item.name}:${item.status}`}>
              {body}
            </button>
          );
        }
        return (
          <div className="detail-row" key={`${item.name}:${item.status}`}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

// Interface card: the registry's own words — what it is, where it is bound, its descriptor.
function InterfaceOverview({ summary, snapshot, onSelect }: { summary: InterfaceSummary; snapshot: TopologySnapshot; onSelect: (selection: SelectionRef) => void }) {
  return (
    <PanelScroll>
      <section className="inspector-section">
        <h2>インターフェース</h2>
        <StatsTable rows={[
          { label: "種類", value: summary.type },
          { label: "ソース", value: summary.source },
          ...(summary.status ? [{ label: "モード", value: summary.status }] : []),
          ...(summary.artifactTransfer && summary.artifactTransfer.status !== "not_declared"
            ? [{
              label: "成果物の提出",
              value: interfaceArtifactTransferValue(summary.artifactTransfer),
              tone: interfaceArtifactTransferTone(summary.artifactTransfer),
            }]
            : []),
          { label: "紐付け先", value: summary.boundIn.length ? String(summary.boundIn.length) : "not bound" },
        ]} />
      </section>
      {summary.boundIn.length ? (
        <section className="inspector-section">
          <h2>紐付け先の領域</h2>
          <div className="child-env-list">
            {summary.boundIn.map((name) => {
              const environment = snapshot.environments.find((env) => env.name === name);
              return (
                <button
                  className="child-env-row"
                  type="button"
                  disabled={!environment}
                  onClick={() => environment && onSelect({ kind: "environment", id: environment.id })}
                  key={name}
                >
                  <Glyph name="ee" size={13} />
                  <span><strong>{name}</strong></span>
                  <i className="chevron">›</i>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
      <JsonBlock title="記述子" data={summary.descriptor} />
    </PanelScroll>
  );
}

function StatsTable({ rows, dense = false }: { rows: StatRow[]; dense?: boolean }) {
  return (
    <div className={`stat-table${dense ? " is-dense" : ""}`}>
      {rows.map((row) => (
        <div className="stat-line" key={`${row.label}:${row.value}`}>
          <span>{row.label}</span>
          <strong className={row.tone ? `${row.tone}-text` : ""}>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}

function interfaceArtifactTransferValue(transfer: InterfaceSummary["artifactTransfer"]): string {
  if (!transfer) return "unknown";
  if (transfer.status === "ready") return "ready";
  if (transfer.status === "unavailable") return "unavailable";
  if (transfer.status === "unbound") return "unbound";
  if (transfer.status === "policy_denied") return "policy denied";
  if (transfer.status === "unknown") return "unknown";
  return transfer.status;
}

function interfaceArtifactTransferTone(transfer: InterfaceSummary["artifactTransfer"]): StatRow["tone"] {
  if (transfer?.status === "ready") return "green";
  if (transfer?.status === "unavailable") return "red";
  if (transfer?.status === "policy_denied") return "red";
  if (transfer?.status === "unbound") return "amber";
  if (transfer?.status === "unknown") return "amber";
  return undefined;
}

function JsonBlock({ title, data }: { title: string; data: Record<string, unknown> }) {
  return (
    <section className="inspector-section json-section">
      <div className="section-title-row">
        <h2>{title}</h2>
      </div>
      <JsonPanel value={pruneUndefined(data)} preClassName="json-card" />
    </section>
  );
}

function EventLogCompact({ events }: { events: EventLogRow[] }) {
  return (
    <section className="inspector-section event-log-section">
      <h2>最近のイベント</h2>
      {events.length === 0 ? <EmptyRow>イベントログがありません</EmptyRow> : (
        <div className="event-list">
          {events.map((event, index) => (
            <div className="event-row" key={`${event.time}:${event.label}:${index}`}>
              <i className={`status-dot ${event.tone ?? "green"}`} />
              <time>{event.time}</time>
              <span>{event.label}</span>
              {event.detail ? <em>{event.detail}</em> : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PanelScroll({ children }: { children: React.ReactNode }) {
  return <div className="inspector-scroll">{children}</div>;
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <div className="detail-empty-row">{children}</div>;
}

function EmptyInspector({ projectionLabel, projectionDetail }: { projectionLabel: string; projectionDetail: string }) {
  return (
    <div className="inspector-empty">
      <Glyph name="ee" size={24} />
      <strong>{projectionLabel}</strong>
      <span>{projectionDetail}</span>
    </div>
  );
}

function resolveSelection(snapshot: TopologySnapshot, selection: SelectionRef | null): ResolvedSelection | null {
  if (!selection) return null;
  if (selection.kind === "environment") {
    const environment = snapshot.environments.find((item) => item.id === selection.id);
    return environment ? { kind: "environment", environment } : null;
  }
  if (selection.kind === "interface") {
    const summary = snapshot.interfaceIndex[selection.id];
    return summary ? { kind: "interface", summary } : null;
  }
  for (const environment of snapshot.environments) {
    const run = environment.runs.find((item) => item.id === selection.id);
    if (run) return { kind: "run", environment, run };
  }
  return null;
}

function statusAccent(statusLabel: string): string {
  const status = statusLabel.toLowerCase();
  if (status.includes("online")) return "green";
  if (status.includes("idle") || status === "待機中") return "blue";
  if (status.includes("blocked") || status === "ブロック中") return "amber";
  return "gray";
}

function pruneUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(pruneUndefined);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, pruneUndefined(entry)]));
  }
  return value;
}
