import { useRef } from "react";
import type { OctopusWorkerEnvironmentOperatorAction } from "../../electron";
import { OcButton, OcDialog, OcDialogFooter, OcDialogHeader } from "../../design-system/components";
import { Glyph } from "../IconGlyphs";

export type WorktreeOperatorConfirmation = {
  action: Extract<OctopusWorkerEnvironmentOperatorAction, "apply" | "revert">;
  paths: string[];
};

type ConfirmProps = {
  confirmation: WorktreeOperatorConfirmation;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function WorktreeOperatorConfirm({ confirmation, pending, onCancel, onConfirm }: ConfirmProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const applying = confirmation.action === "apply";
  return (
    <OcDialog
      ariaLabelledBy="we-operator-confirm-title"
      backdropClassName="we-operator-confirm-backdrop"
      busy={pending}
      initialFocusRef={cancelRef}
      onClose={onCancel}
      open
      panelClassName="we-operator-confirm"
    >
        <OcDialogHeader
          description={applying ? "選択した内容をワークツリーに書き込みます。" : "選択した変更をワークツリーから取り除きます。"}
          leading={<span className={`we-operator-confirm-icon${applying ? "" : " is-danger"}`}><Glyph name={applying ? "changes" : "warning"} size={17} /></span>}
          title={applying ? "選択した変更を適用しますか？" : "変更を元に戻しますか？"}
          titleId="we-operator-confirm-title"
        />
        <div className="we-operator-confirm-body">
          <p><Glyph name="warning" size={13} />これはユーザーによる手動操作です。Octopus の成果物、移動、検証記録、モデルのツール呼び出しとしては扱いません。</p>
          <div className="we-operator-confirm-paths">
            {confirmation.paths.slice(0, 8).map((filePath) => <span key={filePath}>{filePath}</span>)}
            {confirmation.paths.length > 8 ? <em>+{confirmation.paths.length - 8} 件の追加ファイル</em> : null}
          </div>
        </div>
        <OcDialogFooter>
          <OcButton buttonRef={cancelRef} disabled={pending} onClick={onCancel} variant="ghost">キャンセル</OcButton>
          <OcButton disabled={pending} onClick={onConfirm} tone={applying ? "neutral" : "danger"} variant="primary">
            {pending ? "処理しています…" : applying ? "適用" : "確認"}
          </OcButton>
        </OcDialogFooter>
    </OcDialog>
  );
}
