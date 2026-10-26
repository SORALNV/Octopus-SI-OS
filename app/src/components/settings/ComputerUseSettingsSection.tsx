import { useEffect, useState } from "react";
import { OcButton, OcCard, OcGroup, OcSettingsRow, OcStatus, OcSwitch } from "../../design-system/components";
import { Glyph } from "../IconGlyphs";
import { SettingsHeading } from "./SettingsHeading";
import { SavedApplicationPermissionsSection } from "./SavedPermissionsSection";
import { settingsTargetProps } from "./settingsCatalog";

type ComputerUseStatus = { enabled: boolean; ready: boolean; permissions: Array<{ kind: "screen_capture" | "accessibility"; status: string }> };

export function ComputerUseSettingsSection() {
  const [status, setStatus] = useState<ComputerUseStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      try {
        if (!window.octopusTransport?.desktopComputerUseSettings) throw new Error("Computer Use Settings is unavailable.");
        const value = await window.octopusTransport.desktopComputerUseSettings({ operation: "status" });
        if (!cancelled) { setStatus(value); setError(""); }
      } catch (failure) { if (!cancelled) { setStatus(null); setError(failure instanceof Error ? failure.message : String(failure)); } }
    };
    void read();
    const refresh = () => { void read(); };
    window.addEventListener("focus", refresh);
    return () => { cancelled = true; window.removeEventListener("focus", refresh); };
  }, [revision]);

  async function setup() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (!window.octopusTransport?.desktopComputerUseSettings) throw new Error("Computer Use Settings is unavailable.");
      await window.octopusTransport.desktopComputerUseSettings({ operation: "setup" });
    } catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)); }
    finally { setBusy(false); setRevision(value => value + 1); }
  }
  async function toggle(enabled: boolean) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (!window.octopusTransport?.desktopComputerUseSettings) throw new Error("Computer Use Settings is unavailable.");
      const value = await window.octopusTransport.desktopComputerUseSettings({ operation: "set_enabled", enabled });
      setStatus(value);
      if (value.enabled && !value.ready) await window.octopusTransport.desktopComputerUseSettings({ operation: "setup" });
    } catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)); }
    finally { setBusy(false); setRevision(value => value + 1); }
  }

  return <section className="settings-section">
    <SettingsHeading title="コンピューター操作" description="Octopus がこのコンピューターの他のアプリを操作する方法を管理します。" />
    <OcGroup title="操作">
      <OcCard {...settingsTargetProps("computer-use.setup")}>
        <OcSettingsRow label={<span className="flex items-center gap-3"><Glyph name="desktop" size={20} />すべてのアプリ</span>}
          description="Octopus にコンピューター上のアプリを操作させます。アクセスを許可するアプリは自分で選べます。"
          control={<div className="settings-inline-actions">
            <OcSwitch label="コンピューター操作を有効にする" checked={status?.enabled ?? false} disabled={busy || !status} onCheckedChange={enabled => void toggle(enabled)} />
          </div>} />
        {status?.enabled ? <OcSettingsRow label="macOS の権限" description={status.ready ? "許可したアプリを操作する準備ができています。" : "タスクを始める前に、画面収録とアクセシビリティを許可してください。"}
          control={<OcButton disabled={busy} onClick={() => void setup()} variant="secondary">{busy ? "開いています…" : "管理"}</OcButton>} /> : null}
        {status?.permissions.map(permission => <OcSettingsRow key={permission.kind}
          label={permission.kind === "screen_capture" ? "画面収録" : "アクセシビリティ"}
          control={<OcStatus label={permission.status === "granted" ? "許可済み" : "オフ"} tone={permission.status === "granted" ? "success" : "muted"} />} />)}
      </OcCard>
      {error ? <div className="px-3 text-sm text-token-description-foreground" role="alert"><p>コンピューター操作を利用できません。</p><details><summary>エラーの詳細</summary><p>{error}</p></details>
        <OcButton onClick={() => setRevision(value => value + 1)} variant="ghost" size="sm">再試行</OcButton></div> : null}
    </OcGroup>
    <SavedApplicationPermissionsSection />
  </section>;
}
