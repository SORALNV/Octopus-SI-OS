import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { OctopusClientAccessProfile } from "../electron";
import { dispatchClientCommand } from "../clientActions";
import {
  clientOsRootEeId,
  clientTaskTitle,
  recordClientTaskOpened,
  useClientTaskOrganization,
} from "../shell/clientWorkspaces";
import { appToast } from "../toasts";
import { ChatComposer } from "./chat/ChatComposer";
import { MessageContent } from "./chat/MessageContent";
import { QueuedMessageList } from "./chat/QueuedMessageList";
import { useChatWorkspace } from "./chat/useChatWorkspace";
import { Glyph } from "./IconGlyphs";
import "./chat/chat.css";

export function QuickTaskWindow({ accessProfile, runtimeReady, runtimeHome }: {
  accessProfile: OctopusClientAccessProfile;
  runtimeReady: boolean;
  runtimeHome: string;
}) {
  const chat = useChatWorkspace(accessProfile, true, runtimeReady, "quick", "task", runtimeHome);
  const organization = useClientTaskOrganization(accessProfile);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);
  const historyButtonRef = useRef<HTMLButtonElement>(null);
  const recentRank = useMemo(() => new Map(organization.recentRunIds.map((runId, index) => [runId, index])), [organization.recentRunIds]);
  const recentRuns = useMemo(() => [...chat.runs]
    .filter((run) => !run.archived)
    .sort((left, right) => {
      const leftRank = recentRank.get(left.runId) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = recentRank.get(right.runId) ?? Number.MAX_SAFE_INTEGER;
      return leftRank - rightRank || right.updatedAtMs - left.updatedAtMs;
    })
    .slice(0, 8), [chat.runs, recentRank]);
  const visibleMessages = useMemo(() => chat.renderedMessages.filter((message) => (
    message.eventKind !== "usage"
    && message.eventKind !== "hook"
    && (message.text.trim() || message.pending)
  )).slice(-8), [chat.renderedMessages]);
  const error = chat.error || chat.runsError || chat.newTaskAuthoringError || chat.providerInterfaceError;
  const osRootEeId = useMemo(() => clientOsRootEeId(chat.runs), [chat.runs]);
  const startNewTask = () => {
    chat.createChat();
    if (osRootEeId) chat.setEeId(osRootEeId);
  };

  useEffect(() => window.octopusTransport?.onNativeClientCommand?.((command) => {
    if (command === "new_chat") {
      startNewTask();
      return;
    }
    if (command === "open_model_picker" || command === "attach_files" || command === "start_dictation") {
      dispatchClientCommand(command, "keyboard");
    }
  }), [startNewTask]);

  useEffect(() => {
    if (!historyOpen) return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!historyRef.current?.contains(target) && !historyButtonRef.current?.contains(target)) setHistoryOpen(false);
    };
    const dismissWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHistoryOpen(false);
    };
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", dismissWithKeyboard);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", dismissWithKeyboard);
    };
  }, [historyOpen]);

  const activeTitle = chat.activeRun
    ? clientTaskTitle(chat.activeRun.runId, chat.activeRun.title, organization)
    : "クイックタスク";

  return (
    <main className="quick-task-window">
      <header className="quick-task-titlebar">
        <div className="quick-task-brand">
          <img alt="" src="./octopus-logo.png" />
          <span className="quick-task-title-copy">
            <strong>{activeTitle}</strong>
            <small>{chat.activeRun ? "Octopus OS のタスク" : "新しい Octopus OS タスク"}</small>
          </span>
        </div>
        <div className="quick-task-title-actions">
          <button
            aria-expanded={historyOpen}
            aria-haspopup="menu"
            aria-label="最近のタスク"
            onClick={() => setHistoryOpen((current) => !current)}
            ref={historyButtonRef}
            title="最近のタスク"
            type="button"
          >
            <Glyph name="viewAll" size={15} />
          </button>
          <button aria-label="別のクイックタスクを開始" onClick={startNewTask} title="新しいタスク" type="button"><Glyph name="newTask" size={15} /></button>
          {chat.activeRunId ? (
            <button
              aria-label="Octopus のメインウィンドウでタスクを開く"
              onClick={() => void window.octopusTransport?.openRunInMain?.(chat.activeRunId).catch((failure) => appToast.danger(formatFailure(failure)))}
              title="Octopus で開く"
              type="button"
            >
              <Glyph name="openExternal" size={15} />
            </button>
          ) : null}
          <button aria-label="クイックタスクを閉じる" onClick={() => window.octopusTransport?.windowControl("close")} title="閉じる" type="button"><Glyph name="close" size={15} /></button>
        </div>
        {historyOpen ? (
          <div aria-label="最近のタスク" className="quick-task-history" ref={historyRef} role="menu">
            <div className="quick-task-history-heading"><span>最近のタスク</span><small>{recentRuns.length}</small></div>
            {recentRuns.map((run) => (
              <button
                aria-current={run.runId === chat.activeRunId ? "page" : undefined}
                key={run.runId}
                onClick={() => {
                  chat.selectRun(run.runId);
                  recordClientTaskOpened(accessProfile, run.runId);
                  setHistoryOpen(false);
                }}
                role="menuitem"
                type="button"
              >
                <span>{clientTaskTitle(run.runId, run.title, organization)}</span>
                <small>{run.turnState === "working" ? "作業中" : run.messageCount ? `${run.messageCount} 件のメッセージ` : "メッセージがありません"}</small>
              </button>
            ))}
            {!recentRuns.length ? <div className="quick-task-history-empty">タスクはまだありません</div> : null}
          </div>
        ) : null}
      </header>

      <section aria-live="polite" className={`quick-task-transcript${visibleMessages.length ? " has-messages" : ""}`}>
        {!visibleMessages.length ? (
          <motion.div animate={{ opacity: 1, y: 0 }} className="quick-task-empty" initial={{ opacity: 0, y: 4 }}>
            <Glyph name="chat" size={19} />
            <div><strong>Octopus に何を頼みますか？</strong><span>設定されたユーザー用インターフェースを通じて通常のタスクを開きます。</span></div>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {visibleMessages.map((message) => (
              <motion.article
                animate={{ opacity: 1, y: 0 }}
                className={`quick-task-message is-${message.role}${message.error ? " is-error" : ""}`}
                exit={{ opacity: 0 }}
                initial={{ opacity: 0, y: 3 }}
                key={message.id}
                transition={{ duration: 0.14 }}
              >
                {message.pending && !message.text ? (
                  <span className="quick-task-working"><i /><span>作業中</span></span>
                ) : message.role === "assistant" ? (
                  <MessageContent text={message.text} />
                ) : (
                  <p>{message.text}</p>
                )}
              </motion.article>
            ))}
          </AnimatePresence>
        )}
      </section>

      {error ? <div className="quick-task-error" role="alert"><Glyph name="warning" size={14} /><span>{error}</span></div> : null}
      {!runtimeReady ? <div className="quick-task-runtime-state"><Glyph name="warning" size={14} />実行基盤を利用できません</div> : null}

      <footer className="quick-task-composer">
        <QueuedMessageList
          messages={chat.queuedTurns}
          paused={chat.queuePaused}
          sendNowAvailable={chat.canSendQueued}
          onDelete={chat.deleteQueuedTurn}
          onEdit={chat.editQueuedTurn}
          onSendNow={chat.steerQueuedTurn}
          onReorder={chat.reorderQueuedTurns}
          onResume={chat.resumeQueuedTurns}
          onRetry={chat.retryQueuedTurn}
        />
        <ChatComposer
          accessProfile={chat.accessProfile}
          activeProvider={chat.activeProvider}
          agentPresetId={chat.agentPresetId}
          accessMode={chat.accessMode}
          fullAccessUnavailableReason={chat.fullAccessUnavailableReason}
          agentPresets={chat.composerAgentPresets}
          attachments={chat.attachments}
          applicationIds={chat.applicationIds}
          applicationSelectionLocked={chat.applicationSelectionLocked}
          applicationSelectionLockReason={chat.applicationSelectionLockReason}
          canSubmit={chat.canSubmit}
          contextUsage={chat.contextUsage}
          hasQueuedMessages={chat.queuedTurns.length > 0}
          canQueue={chat.canQueue}
          onQueue={chat.queueCurrentTurn}
          editingQueuedTurn={chat.editingQueuedTurn}
          onCancelQueuedEdit={chat.cancelQueuedEdit}
          driverNames={chat.driverNames}
          eeId={chat.eeId}
          executionContextLocked={Boolean(chat.activeRunId)}
          executionContexts={chat.executionContexts}
          fileInputRef={chat.fileInputRef}
          interruptPending={chat.turnControlPending}
          isSubmitting={chat.submitting}
          onFilesPicked={chat.onFilesPicked}
          onAgentPresetChange={chat.setAgentPresetId}
          onAccessModeChange={chat.setAccessMode}
          onApplicationToggle={chat.toggleApplication}
          onDriverToggle={chat.toggleDriver}
          onEeChange={chat.setEeId}
          onKeyDown={chat.onComposerKeyDown}
          onInterrupt={chat.interruptActiveTurn}
          onResume={chat.resumeActiveTurn}
          onProviderInterfaceChange={chat.setProviderInterfaceId}
          onProviderModelChange={chat.setProviderModel}
          onProviderModelsRefresh={chat.refreshProviderModels}
          onReasoningEffortChange={chat.setReasoningEffort}
          onServiceTierChange={chat.chooseServiceTier}
          onRemoveAttachment={chat.removeAttachment}
          onResolvePausedQueueSubmission={chat.resolvePausedQueueSubmission}
          onSubmit={chat.submit}
          onTextChange={chat.setText}
          providerInterfaceId={chat.providerInterfaceId}
          pausedQueueSubmissionCount={chat.pausedQueueSubmissionCount}
          providerModel={chat.providerModel}
          providerInterfaces={chat.providerInterfaces}
          providerInterfacesLoaded={chat.providerInterfacesLoaded}
          providerInterfacesRefreshing={chat.providerInterfacesRefreshing}
          modelSelectionLoading={chat.modelSelectionLoading}
          reasoningEffort={chat.reasoningEffort}
          serviceTier={chat.serviceTier}
          resumeAvailable={chat.resumeAvailable}
          runId={chat.activeRunId}
          suggestionSourceSequence={chat.activeRun?.lastTerminalMessage?.movementSeq}
          runtimeHome={runtimeHome}
          submissionMode={chat.busy ? "queue" : "send"}
          canSteer={chat.canSteer}
          onSteer={chat.steerCurrentTurn}
          submitBlockReason={chat.submitBlockReason}
          text={chat.text}
          turnOpen={chat.turnOpen}
          workerEnvironmentRooms={chat.workerEnvironmentRooms}
          workerInterfaceId={chat.workerInterfaceId}
        />
      </footer>
    </main>
  );
}

export function QuickTaskAccessUnavailable() {
  return (
    <main className="quick-task-window is-unavailable">
      <header className="quick-task-titlebar"><div className="quick-task-brand"><img alt="" src="./octopus-logo.png" /><span>クイックタスク</span></div><button aria-label="クイックタスクを閉じる" onClick={() => window.octopusTransport?.windowControl("close")} type="button"><Glyph name="close" size={15} /></button></header>
      <div className="quick-task-empty"><Glyph name="lock" size={19} /><div><strong>Octopus はロックされています</strong><span>クイックタスクを開くには、メインアプリのロックを解除してください。</span></div></div>
    </main>
  );
}

function formatFailure(value: unknown): string {
  return value instanceof Error ? value.message : String(value);
}
