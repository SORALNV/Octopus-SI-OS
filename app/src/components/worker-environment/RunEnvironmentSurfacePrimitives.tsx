import { type ReactNode } from "react";
import { OcButton, OcDialog, OcDialogFooter, OcDialogHeader, OcEmptyState } from "../../design-system/components";
import type { GlyphName } from "../IconGlyphs";
import { Glyph } from "../IconGlyphs";
import { OctopusEmptyState } from "../OctopusSurface";

export function ManualRoomControlWarning({ glyph, onCancel, onContinue, open, title }: {
  glyph: GlyphName;
  onCancel: () => void;
  onContinue: () => void;
  open: boolean;
  title: string;
}) {
  return (
    <OcDialog
      ariaLabelledBy="we-manual-control-title"
      backdropClassName="we-manual-control-scrim"
      onClose={onCancel}
      open={open}
      panelClassName="we-manual-control-dialog !static !transform-none"
    >
        <div className="we-manual-control-dialog__icon"><Glyph name={glyph} size={20} /></div>
        <OcDialogHeader
          className="we-manual-control-dialog__copy p-0"
          description={<><span className="block">この作業環境のビューアーで行うクリック、入力、画面移動、スクロールは、Octopus の実行記録には残りません。</span><span className="block">操作後のページの状態をエージェントが確認することはありますが、手動操作は移動の記録には表示されません。</span></>}
          title={title}
          titleId="we-manual-control-title"
        />
        <OcDialogFooter className="we-manual-control-dialog__actions">
          <OcButton onClick={onCancel} variant="secondary">キャンセル</OcButton>
          <OcButton onClick={onContinue} variant="primary">手動操作を続ける</OcButton>
        </OcDialogFooter>
    </OcDialog>
  );
}

export function LiveSurfaceEmpty({ detail, glyph, illustration, title }: {
  detail: string;
  glyph?: GlyphName;
  illustration?: ReactNode;
  title: string;
}) {
  if (!illustration) {
    return (
      <OcEmptyState
        className="h-full min-h-0 flex-1 select-none"
        detail={detail}
        glyph={glyph ?? "ee"}
        title={title}
      />
    );
  }
  return (
    <OctopusEmptyState
      className="h-full min-h-0 flex-1 select-none"
      description={detail}
      icon={illustration ?? <Glyph name={glyph ?? "ee"} size={32} />}
      title={title}
    />
  );
}

export function dataText(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value.trim() : "";
}

export function dataOptionalNumber(data: Record<string, unknown>, key: string): number | null {
  const value = data[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function dataStringList(data: Record<string, unknown>, key: string): string[] {
  const value = data[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

export function dataRecordList(data: Record<string, unknown>, key: string): Array<Record<string, unknown>> {
  const value = data[key];
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

export function renderSurfaceData(value: unknown): ReactNode {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value == null) return "—";
  return JSON.stringify(value);
}

export function normalizeSurfaceStatus(status: string): string {
  const value = status.toLowerCase();
  if (["active", "ready", "running", "live"].includes(value)) return "active";
  if (["failed", "error", "broken", "denied"].includes(value)) return "error";
  if (["starting", "pending", "waiting"].includes(value)) return "pending";
  return "offline";
}

export function isViewerUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
