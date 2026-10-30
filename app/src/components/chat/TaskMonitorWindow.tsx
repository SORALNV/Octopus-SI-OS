import { APP_LOCALE } from "../../locale";
import { useEffect, useMemo, useRef, useState } from "react";
import "../icon-glyphs/chat";
import { loadChatRunMessages, loadChatRuns, type ChatRun, type ChatRunMessage } from "../../chatRuns";
import type { OctopusClientAccessProfile } from "../../electron";
import type { RunProjection, WorkerEnvironmentProjection } from "../../data/topology";
import { useProjectionGeneration } from "../../projectionLive";
import { useRuntimeTopology } from "../../runtimeTopology";
import { appToast } from "../../toasts";
import { useClientSurfaceDocuments } from "../../client-surfaces/useClientSurfaceDocuments";
import { Glyph } from "../IconGlyphs";
import { ShellTooltip } from "../shell/ShellTooltip";
import { defaultWorkerEnvironmentPaneTarget } from "../worker-environment/workerEnvironmentPane";
import { MessageContent } from "./MessageContent";
import "./chat.css";

export function TaskMonitorWindow({ accessProfile }: { accessProfile: OctopusClientAccessProfile }) {
  const runId = useMemo(() => new URLSearchParams(window.location.search).get("runId")?.trim() ?? "", []);
  const generation = useProjectionGeneration();
  const topology = useRuntimeTopology(Boolean(runId), runId ? [runId] : []);
  const clientSurfaces = useClientSurfaceDocuments(accessProfile);
  const [run, setRun] = useState<ChatRun | null>(null);
  const [messages, setMessages] = useState<ChatRunMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pinned, setPinned] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const projection = useMemo(() => findRunProjection(topology, runId), [runId, topology]);
  const workerEnvironments = projection?.workerEnvironments.length
    ? projection.workerEnvironments
    : projection?.workerEnvironment.id
      ? [projection.workerEnvironment]
      : [];
  const visibleMessages = messages.filter((message) => (
    message.eventData._movement_evidence !== true
    && message.eventKind !== "usage"
    && message.eventKind !== "hook"
    && !["item_started", "turn_started", "turn_completed", "model_verification", "rate_limits"].includes(message.eventKind ?? "")
    && (message.text.trim() || message.attachments.length)
  )).slice(-14);
  const statusLabel = loading && !run
    ? "Reading task"
    : run?.turnState === "working"
      ? "Working"
      : run?.turnState === "waiting"
        ? "Waiting for output"
        : run?.turnState === "failed"
          ? "確認が必要"
      : error
        ? "Unavailable"
        : run
          ? "Ready"
          : visibleMessages.length
            ? "Recorded evidence"
            : "Unavailable";

  useEffect(() => {
    let cancelled = false;
    if (!runId) {
      setError("Task Monitor requires a projected run id.");
      setLoading(false);
      return () => { cancelled = true; };
    }
    setLoading(true);
    setError("");
    void Promise.all([loadChatRuns(), loadChatRunMessages(runId)])
      .then(([runs, projectedMessages]) => {
        if (cancelled) return;
        setRun(runs.find((candidate) => candidate.runId === runId) ?? null);
        setMessages(projectedMessages);
      })
      .catch((failure) => {
        if (!cancelled) setError(formatFailure(failure));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [generation, runId]);

  useEffect(() => {
    document.title = `${run?.title || "タスクモニター"} — Octopus`;
  }, [run?.title]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [visibleMessages.length, run?.turnState]);

  const openMain = () => {
    if (!runId) return;
    void window.octopusTransport?.openRunInMain?.(runId).catch((failure) => appToast.danger(formatFailure(failure)));
  };

  const togglePinned = () => {
    void window.octopusTransport?.setTaskMonitorWindowPinned?.(!pinned)
      .then((outcome) => setPinned(outcome.pinned))
      .catch((failure) => appToast.danger(formatFailure(failure)));
  };

  return (
    <main className="task-monitor-window">
      <header className="task-monitor-titlebar">
        <div className="task-monitor-titlebar-left">
          <ShellTooltip label="閉じる"><button aria-label="タスクモニターを閉じる" onClick={closeWindow} type="button"><Glyph name="close" size={15} /></button></ShellTooltip>
        </div>
        <div className="task-monitor-titlebar-title"><span>{run?.title || "タスクモニター"}</span></div>
        <div className="task-monitor-titlebar-actions">
          <ShellTooltip label={pinned ? "最前面表示を解除" : "最前面に表示"}><button aria-label={pinned ? "最前面表示を解除" : "最前面に表示"} aria-pressed={pinned} className={pinned ? "is-active" : ""} onClick={togglePinned} type="button"><Glyph name="pin" size={15} /></button></ShellTooltip>
          <ShellTooltip label="メインウィンドウで開く"><button aria-label="メインウィンドウで開く" onClick={openMain} type="button"><Glyph name="openExternal" size={15} /></button></ShellTooltip>
        </div>
      </header>

      <section className="task-monitor-status">
        <span className={`task-monitor-status-dot${run?.turnState === "working" ? " is-working" : run?.turnState === "failed" || error || (!loading && !run && !visibleMessages.length) ? " is-error" : ""}`} />
        <strong>{statusLabel}</strong>
        {run?.providerInterfaceId ? <span>{run.providerInterfaceId}</span> : null}
        {run?.turnState === "working" ? <span className="composer-spinner" /> : null}
      </section>

      <div className="task-monitor-scroll" ref={scrollRef}>
        {loading && !visibleMessages.length ? <TaskMonitorState label="タスクの情報を読み込んでいます…" loading /> : null}
        {!loading && error ? <TaskMonitorState label={error} /> : null}
        {!loading && !error && !visibleMessages.length ? <TaskMonitorState label="このタスクに表示できるメッセージはありません。" /> : null}
        {visibleMessages.map((message) => (
          <article className={`task-monitor-message is-${message.role}${message.error ? " is-error" : ""}`} key={message.id}>
            <header><span>{messageTitle(message)}</span><time>{formatTime(message.createdAtMs)}</time></header>
            {message.role === "assistant" ? <MessageContent text={message.text} /> : <p>{message.text}</p>}
            {message.attachments.length ? <small>{message.attachments.length} 添付ファイル{message.attachments.length === 1 ? "" : " 秒"}</small> : null}
          </article>
        ))}
        {run?.turnState === "working" ? <div className="task-monitor-live-edge"><span className="composer-spinner" />許可された出力を受信しています</div> : null}
      </div>

      {workerEnvironments.length ? (
        <section className="task-monitor-environments" aria-label="作業環境">
          <header><span>作業環境</span><small>{workerEnvironments.length}</small></header>
          <div>
            {workerEnvironments.map((environment) => (
              <button key={environment.id} onClick={() => openWorkerEnvironment(runId, environment, clientSurfaces.workerEnvironmentSurfaces)} type="button">
                <Glyph name="environment" size={14} />
                <span><strong>{environment.label}</strong><small>{environment.status}</small></span>
                <Glyph name="openExternal" size={12} />
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

export function TaskMonitorAccessUnavailable() {
  return (
    <main className="task-monitor-window">
      <header className="task-monitor-titlebar">
        <div className="task-monitor-titlebar-left"><button aria-label="タスクモニターを閉じる" onClick={closeWindow} type="button"><Glyph name="close" size={15} /></button></div>
        <div className="task-monitor-titlebar-title"><span>タスクモニター</span></div>
      </header>
      <TaskMonitorState label="タスクモニターを開くには、メインアプリのロックを解除してください。" />
    </main>
  );
}

function TaskMonitorState({ label, loading = false }: { label: string; loading?: boolean }) {
  return <div className="task-monitor-state">{loading ? <span className="composer-spinner" /> : <Glyph name="pulse" size={18} />}<span>{label}</span></div>;
}

function findRunProjection(topology: ReturnType<typeof useRuntimeTopology>, runId: string): RunProjection | null {
  for (const environment of topology.environments) {
    const run = environment.runs.find((candidate) => candidate.id === runId);
    if (run) return run;
  }
  return null;
}

function openWorkerEnvironment(
  runId: string,
  environment: WorkerEnvironmentProjection,
  surfaces: ReturnType<typeof useClientSurfaceDocuments>["workerEnvironmentSurfaces"],
) {
  const target = defaultWorkerEnvironmentPaneTarget(environment, surfaces);
  void window.octopusTransport?.openWorkerEnvironmentWindow?.({
    runId,
    workerEnvironmentId: environment.id,
    panelKind: target.panelKind === "file" ? "files" : target.panelKind ?? "overview",
    ...(target.surfaceId ? { surfaceId: target.surfaceId } : {}),
    ...(target.clientSurface ? { clientSurface: target.clientSurface } : {}),
  }).catch((failure) => appToast.danger(formatFailure(failure)));
}

function messageTitle(message: ChatRunMessage): string {
  if (message.eventKind === "steering") return "今すぐ送信";
  if (message.eventKind === "tool") return "Tool activity";
  if (message.eventKind === "plan") return "計画";
  if (message.eventKind === "web_search") return "ウェブ検索";
  if (message.eventKind === "approval" || message.eventKind === "elicitation" || message.eventKind === "user_input") return "Operator request";
  return message.role === "user" ? "ユーザー" : message.error ? "エラー" : "Octopus";
}

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  return new Intl.DateTimeFormat(APP_LOCALE, { hour: "numeric", minute: "2-digit" }).format(value);
}

function closeWindow() {
  window.octopusTransport?.windowControl("close");
}

function formatFailure(value: unknown): string {
  return value instanceof Error ? value.message : String(value);
}
