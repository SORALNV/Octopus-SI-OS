import { useEffect, useRef, useState } from "react";
import { OcButton, OcDialog, OcDialogFooter, OcDialogHeader, OcEmptyState } from "../../design-system/components";
import { OcDropdown } from "../../design-system/OcDropdown";
import { OctopusLoadingState } from "../OctopusLoadingLogo";
import { formatEvidenceTime } from "./scheduleModel";
import { ScheduledDetail } from "./ScheduledDetail";
import { ScheduledDialog } from "./ScheduledDialog";
import { ScheduledLanding } from "./ScheduledLanding";
import { runTitle } from "./ScheduledRows";
import { ScheduledSidebar } from "./ScheduledSidebar";
import { useScheduledWorkspace } from "./ScheduledWorkspace";
import type { ScheduledDelivery } from "./types";

export function LiveScheduledView({ searchFocusTick, navigationInPane = false, onSelectChat }: { searchFocusTick: number; navigationInPane?: boolean; onSelectChat?: (runId: string) => void }) {
  const workspace = useScheduledWorkspace();
  const { selected, selectedId, editor, loading, error, pending, canEdit, requestSearch } = workspace;
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigationRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (searchFocusTick > 0) {
      if (navigationInPane) setNavigationOpen(true);
      requestSearch();
    }
  }, [searchFocusTick, requestSearch, navigationInPane]);

  return (
    <section aria-label="トリガー" className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden" data-scheduled-content="">
      {navigationInPane ? <div className="flex flex-none items-center px-3 py-2">
        <OcButton buttonRef={navigationRef} leadingIcon="scheduled" onClick={() => setNavigationOpen(!navigationOpen)} trailingIcon="chevronDown" variant="ghost">トリガー</OcButton>
        <OcDropdown anchorRef={navigationRef} aria-label="トリガー" className="flex h-[min(560px,calc(100vh-80px))] w-[340px] flex-col py-3" onOpenChange={setNavigationOpen} open={navigationOpen} role="dialog" surface="opaque">
          <ScheduledSidebar onNavigate={() => setNavigationOpen(false)} onSelectChat={onSelectChat} />
        </OcDropdown>
      </div> : null}
      {error ? (
        <OcEmptyState
          action={<OcButton onClick={() => void workspace.reload()} size="sm" variant="secondary">再試行</OcButton>}
          detail={error}
          glyph="warning"
          title="トリガーを読み込めませんでした"
          tone="danger"
        />
      ) : selected ? (
        <ScheduledDetail
          canEdit={canEdit}
          key={selected.interfaceId}
          onDelete={() => workspace.requestDelete(selected)}
          onEdit={() => workspace.startEdit(selected)}
          onToggle={() => workspace.toggleTask(selected)}
          pending={pending}
          scopeOptions={workspace.scopeOptions}
          task={selected}
        />
      ) : loading ? (
        <OctopusLoadingState className="flex min-h-0 flex-1 items-center justify-center" label="トリガーを読み込んでいます" />
      ) : selectedId ? (
        <OcEmptyState
          action={<OcButton onClick={() => workspace.selectTask("")} size="sm" variant="secondary">トリガー一覧に戻る</OcButton>}
          detail="このトリガーは削除されたか、このホームでは利用できなくなった可能性があります。"
          glyph="scheduled"
          title="トリガーを利用できません"
        />
      ) : (
        <ScheduledLanding disabledReason={workspace.createUnavailableReason} onCreate={workspace.startCreate} templates={workspace.templates} timeDisabledReason={workspace.timeSuggestionUnavailableReason} />
      )}
      {editor ? (
        <ScheduledDialog
          draft={editor.draft}
          error={workspace.editorError}
          key={`${editor.mode.kind}:${editor.revision}`}
          mode={editor.mode}
          onCancel={workspace.cancelEdit}
          onSave={workspace.save}
          pending={pending}
          scopeOptions={workspace.scopeOptions}
          templates={workspace.templates}
        />
      ) : null}
      <OcDialog ariaLabelledBy="scheduled-delete-title" busy={pending} onClose={workspace.cancelDelete} open={workspace.deleteCandidate !== null} panelClassName="max-w-md">
        <OcDialogHeader closeDisabled={pending} description="トリガーを完全に削除し、今後の実行を停止します。台帳の記録は保持されます。" onClose={workspace.cancelDelete} title={`削除 ${workspace.deleteCandidate?.displayName ?? "trigger"}?`} titleId="scheduled-delete-title" />
        <OcDialogFooter>
          <OcButton disabled={pending} onClick={workspace.cancelDelete} variant="ghost">キャンセル</OcButton>
          <OcButton disabled={!canEdit || pending} onClick={workspace.confirmDelete} tone="danger" variant="primary">{pending ? "削除しています…" : "トリガーを削除"}</OcButton>
        </OcDialogFooter>
      </OcDialog>
      <UndoDialog canEdit={canEdit} delivery={workspace.undoCandidate} onCancel={workspace.cancelUndo} onConfirm={workspace.confirmUndo} pending={pending} />
    </section>
  );
}

function UndoDialog({ canEdit, delivery, onCancel, onConfirm, pending }: { canEdit: boolean; delivery: ScheduledDelivery | null; onCancel: () => void; onConfirm: () => void; pending: boolean }) {
  const journal = delivery?.journal ?? null;
  return (
    <OcDialog ariaLabelledBy="scheduled-undo-title" busy={pending} onClose={onCancel} open={delivery !== null} panelClassName="max-w-md">
      <OcDialogHeader closeDisabled={pending} description="記録された各ファイルを実行前の内容に戻します。実行後にファイルが変更されている場合は、元に戻す操作を停止します。" onClose={onCancel} title="この実行による変更を元に戻しますか？" titleId="scheduled-undo-title" />
      {delivery && journal ? (
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-6 pb-4 text-sm" data-scheduled-journal="">
          <p className="m-0 text-token-text-secondary">{runTitle(delivery)} · {formatEvidenceTime(delivery.atMs)}</p>
          {journal.changes.length || journal.checks.length ? (
            <ul className="m-0 flex flex-col gap-2 rounded-2xl border border-default p-3 select-text">
              {journal.changes.map((change, index) => change.kind === "file" ? (
                <li className="flex min-w-0 list-none flex-col gap-0.5" key={`${change.path}:${index}`} title={change.reason}>
                  <span className="min-w-0 break-all text-default">{change.action} · {change.path}</span>
                  <span className="text-xs text-tertiary">{change.status === "applied" ? change.restorable ? "適用済み" : `適用済み · ${change.unrestorableReason}` : change.status === "undone" ? "復元済み" : "実行後に変更されています"}</span>
                </li>
              ) : (
                <li className="flex min-w-0 list-none flex-col gap-0.5" key={`other:${index}`}>
                  <span className="text-default">{change.description}</span>
                  {change.undo ? <span className="text-xs text-tertiary">元に戻す： {change.undo}</span> : null}
                </li>
              ))}
              {journal.checks.map((check, index) => (
                <li className="flex min-w-0 list-none items-baseline justify-between gap-3" key={`check:${index}`} title={check.evidence}>
                  <span className="text-default">{check.check}</span>
                  <span className="text-xs text-tertiary">{check.result}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <OcDialogFooter>
        <OcButton disabled={pending} onClick={onCancel} variant="ghost">キャンセル</OcButton>
        <OcButton disabled={!canEdit || pending} onClick={onConfirm} variant="primary">{pending ? "復元しています…" : "変更を元に戻す"}</OcButton>
      </OcDialogFooter>
    </OcDialog>
  );
}
