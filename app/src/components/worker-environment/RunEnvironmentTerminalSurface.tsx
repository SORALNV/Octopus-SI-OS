import { useEffect, useMemo, useState } from "react";
import type { WorkerEnvironmentProjection, WorkerEnvironmentSurfaceProjection } from "../../data/topology";
import {
  OctopusTerminal,
  type OctopusTerminalSession,
  type OctopusTerminalSessionHandlers,
} from "../terminal/OctopusTerminal";
import {
  createProcessViewerTerminalSession,
  type ProcessViewerTerminalState,
  createTranscriptTerminalSession,
  createWebSocketTerminalSession,
  type WebSocketTerminalState,
} from "../terminal/webSocketSession";
import { Glyph } from "../IconGlyphs";
import { LiveSurfaceEmpty, dataText } from "./RunEnvironmentSurfacePrimitives";

export function TerminalSurface({ active, environment, surface }: {
  active: boolean;
  environment: WorkerEnvironmentProjection;
  surface?: WorkerEnvironmentSurfaceProjection;
}) {
  if (!surface) {
    return (
      <LiveSurfaceEmpty
        detail="作業環境から対話用の接続か保存済みの出力が提供されると、ターミナルを表示します。"
        glyph="terminal"
        title="ターミナル画面がありません"
      />
    );
  }

  const protocol = surface.protocol.trim().toLowerCase();
  const transcript = terminalTranscript(surface);
  if (surface.mode === "direct") {
    if (protocol === "process_session.direct.v1") {
      return <ProcessRoomTerminal active={active} environment={environment} surface={surface} />;
    }
    if (protocol !== "xterm.websocket" || surface.readOnly || !validWebSocketUrl(surface.viewerUrl)) {
      return (
        <LiveSurfaceEmpty
          detail={dataText(surface.data, "detail") || "このターミナルには、対応する書き込み可能な WebSocket 接続がありません。"}
          glyph="terminal"
          title="ターミナルを利用できません"
        />
      );
    }
    return <LiveTerminal active={active} environment={environment} surface={surface} />;
  }

  if (protocol === "terminal_transcript" || transcript || surface.mode === "fixture") {
    return <TranscriptTerminal active={active} environment={environment} surface={surface} transcript={transcript} />;
  }

  return (
    <LiveSurfaceEmpty
      detail={dataText(surface.data, "unavailable") || dataText(surface.data, "detail") || "この作業環境のターミナル記録は、クライアントで表示できない形式です。"}
      glyph="terminal"
      title="ターミナルの記録を取得できません"
    />
  );
}

function ProcessRoomTerminal({ active, environment, surface }: {
  active: boolean;
  environment: WorkerEnvironmentProjection;
  surface: WorkerEnvironmentSurfaceProjection;
}) {
  const [connectionError, setConnectionError] = useState("");
  const [viewer, setViewer] = useState<ProcessViewerTerminalState | null>(null);
  const [manualControlConfirmed, setManualControlConfirmed] = useState(() => (
    sessionStorage.getItem("octopus.process-viewer.manual-control-warning.v1") === "acknowledged"
  ));
  const session = useMemo(
    () => createProcessViewerTerminalSession(
      environment.id,
      surface.id,
      (next, error) => {
        setViewer(next);
        setConnectionError(error ?? "");
      },
    ),
    [environment.id, surface.id],
  );
  const warning = dataText(surface.data, "warning")
    || "Manual terminal control is direct room I/O and is not Octopus artifact evidence.";
  const state = viewer?.state;
  const status = state?.status || dataText(surface.data, "process_status") || surface.status;
  const tty = state ? state.tty && !surface.readOnly : surface.data.tty === true && !surface.readOnly;
  const mayStartFirstShell = Boolean(state && !state.processId && state.startNewShellAvailable);
  const manualControlAvailable = tty || mayStartFirstShell;
  const running = status === "running";
  const control = (action: () => void) => {
    if (!manualControlAvailable || !manualControlConfirmed) return;
    action();
  };
  const confirmManualControl = () => {
    sessionStorage.setItem("octopus.process-viewer.manual-control-warning.v1", "acknowledged");
    setManualControlConfirmed(true);
  };
  return (
    <div className="we-terminal-workspace">
      <div className="we-terminal-tabs-bar">
        <div className="we-terminal-meta">
          <span title={surface.root || environment.root || environment.label}>
            {surface.root || environment.root || environment.label}
          </span>
          <small>{tty ? statusLabel(status, state?.exitCode ?? null, state?.closed ?? false) : `出力 · ${statusLabel(status, state?.exitCode ?? null, state?.closed ?? false)}`}</small>
        </div>
        {manualControlAvailable ? <div className="we-terminal-actions">
          {running ? (
            <>
              <button onClick={() => control(() => session.interrupt())} type="button">中断</button>
              <button onClick={() => control(() => session.terminate())} type="button">終了</button>
            </>
          ) : null}
          {tty && state?.restartAvailable ? (
            <button onClick={() => control(() => {
              setConnectionError("");
              session.restart();
            })} type="button">再起動</button>
          ) : null}
          {state?.startNewShellAvailable ? (
            <button onClick={() => control(() => {
              setConnectionError("");
              session.startNewShell();
            })} type="button">新しいシェル</button>
          ) : null}
        </div> : null}
      </div>
      {manualControlAvailable && !manualControlConfirmed ? (
        <div className="we-terminal-manual-warning" role="note">
          <span>{warning}</span>
          <button onClick={confirmManualControl} type="button">続ける</button>
        </div>
      ) : null}
      <div className="we-terminal-session">
        <OctopusTerminal
          autoFocus={active && tty && manualControlConfirmed}
          id={`worker-environment-process-terminal-${environment.id}-${surface.id}`}
          readOnly={!tty || !manualControlConfirmed || !running}
          session={session}
        />
        {connectionError ? (
          <div className="we-terminal-connection-state" role="alert">
            <div><strong>{tty ? "ターミナルが切断されました" : "出力の接続が切断されました"}</strong><span>{connectionError}</span></div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function statusLabel(status: string, exitCode: number | null, closed: boolean): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "exited") return exitCode == null ? "Exited" : `Exited ${exitCode}`;
  if (normalized === "failed") return "失敗";
  if (closed || normalized === "closed") return "終了";
  if (normalized === "running") return "実行中";
  if (normalized === "ready") return "準備完了";
  if (!normalized || normalized === "unavailable" || normalized === "not projected") return "利用できません";
  return normalized.replaceAll("_", " ").replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function LiveTerminal({ active, environment, surface }: {
  active: boolean;
  environment: WorkerEnvironmentProjection;
  surface: WorkerEnvironmentSurfaceProjection;
}) {
  const [generation, setGeneration] = useState(0);
  const [connection, setConnection] = useState<WebSocketTerminalState>({
    detail: "作業環境のターミナルに接続しています…",
    state: "connecting",
  });
  const session = useMemo(
    () => createRestartableWebSocketTerminalSession(surface.viewerUrl, setConnection),
    [generation, surface.viewerUrl],
  );

  useEffect(() => {
    setConnection({ detail: "作業環境のターミナルに接続しています…", state: "connecting" });
  }, [generation, surface.id, surface.viewerUrl]);

  const retryable = connection.state === "failed" || connection.state === "disconnected";
  return (
    <div className="we-terminal-workspace">
      <TerminalSurfaceBar environment={environment} surface={surface} />
      <div className="we-terminal-session">
        <OctopusTerminal
          autoFocus={active}
          id={`worker-environment-terminal-${environment.id}-${surface.id}-${generation}`}
          session={session}
        />
        {connection.state !== "connected" ? (
          <div className="we-terminal-connection-state" role={retryable ? "alert" : "status"}>
            <div>
              <strong>{connection.state === "connecting" ? "作業環境のターミナルに接続しています" : "作業環境のターミナルが切断されました"}</strong>
              <span>{connection.detail}</span>
            </div>
            {retryable ? (
              <button className="we-terminal-reconnect" onClick={() => setGeneration((value) => value + 1)} type="button">
                <Glyph name="retry" size={12} />
                再試行
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TranscriptTerminal({ active, environment, surface, transcript }: {
  active: boolean;
  environment: WorkerEnvironmentProjection;
  surface: WorkerEnvironmentSurfaceProjection;
  transcript: string;
}) {
  const session = useMemo(
    () => createTranscriptTerminalSession(transcript),
    [surface.id, transcript],
  );
  return (
    <div className="we-terminal-workspace">
      <TerminalSurfaceBar environment={environment} surface={surface} />
      <div className="we-terminal-session">
        <OctopusTerminal
          autoFocus={active}
          id={`worker-environment-terminal-${environment.id}-${surface.id}`}
          readOnly
          session={session}
        />
      </div>
    </div>
  );
}

function TerminalSurfaceBar({ environment, surface }: {
  environment: WorkerEnvironmentProjection;
  surface: WorkerEnvironmentSurfaceProjection;
}) {
  const workspace = dataText(surface.data, "workspace") || surface.root || environment.root || environment.label;
  return (
    <div className="we-terminal-tabs-bar">
      <div className="we-terminal-meta">
        <span title={workspace}>{workspace}</span>
        <small>{surface.mode === "direct" ? surface.protocol : "読み取り専用"}</small>
      </div>
    </div>
  );
}

function terminalTranscript(surface: WorkerEnvironmentSurfaceProjection): string {
  const lines = Array.isArray(surface.data.lines)
    ? surface.data.lines.filter((value): value is string => typeof value === "string")
    : [];
  return lines.join("\r\n");
}

function validWebSocketUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "ws:" || url.protocol === "wss:";
  } catch {
    return false;
  }
}

function createRestartableWebSocketTerminalSession(
  socketUrl: string,
  onState: (state: WebSocketTerminalState) => void,
): OctopusTerminalSession {
  let handlers: OctopusTerminalSessionHandlers | null = null;
  let inner: OctopusTerminalSession | null = null;
  let unsubscribeInner: (() => void) | null = null;
  const disposeInner = () => {
    unsubscribeInner?.();
    unsubscribeInner = null;
    inner = null;
  };
  return {
    async open(dimensions) {
      disposeInner();
      inner = createWebSocketTerminalSession(socketUrl, onState);
      if (handlers) unsubscribeInner = inner.subscribe(handlers);
      await inner.open(dimensions);
    },
    resize(dimensions) {
      inner?.resize(dimensions);
    },
    subscribe(next) {
      handlers = next;
      return () => {
        if (handlers === next) handlers = null;
        disposeInner();
      };
    },
    write(data) {
      inner?.write(data);
    },
  };
}
