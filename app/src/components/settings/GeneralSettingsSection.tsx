import { settingsTargetProps } from "./settingsCatalog";
import { useEffect, useMemo, useState } from "react";
import { useClientPreferences, useSetClientPreferences, type SendShortcut } from "../../clientPreferences";
import { OcCard, OcGroup, OcSelect, OcSlider, OcSettingsRow, OcStatus, OcSwitch } from "../../design-system/components";
import { type GlyphName } from "../IconGlyphs";
import type { OctopusClientAccessProfile } from "../../electron";
import { useAppErrorToast } from "../../toasts";
import { loadChatSettings, saveChatSettings } from "../chat/storage";
import { providerDefaultModel, providerDefaultReasoningEffort } from "../chat/chatWorkspaceCapabilities";
import type { ClientSurfaceDescriptor } from "../../shell/surfaceTypes";
import { clientNavigationDestinations } from "../../shell/navigation";
import { SettingsHeading } from "./SettingsHeading";
import { MarkActivitySettingsRow, NotificationSoundSettingsRow } from "./NotificationSettingsSection";

import { ProviderSummary, useDeclaredProviders } from "./SettingsProviderState";
export function GeneralSection({ accessProfile, surfaces }: { accessProfile: OctopusClientAccessProfile; surfaces: ClientSurfaceDescriptor[] }) {
  const preferences = useClientPreferences();
  const setClientPreferences = useSetClientPreferences();
  const providerState = useDeclaredProviders();
  const [providerInterfaceId, setProviderInterfaceId] = useState(
    () => loadChatSettings(accessProfile).providerInterfaceId,
  );
  const [loginItem, setLoginItem] = useState<{ supported: boolean; enabled: boolean; loading: boolean; error: string }>({
    supported: false,
    enabled: false,
    loading: accessProfile === "live",
    error: "",
  });
  const storedProviderMissing = Boolean(
    !providerState.loading && !providerState.error && providerInterfaceId
      && !providerState.providers.some((provider) => provider.id === providerInterfaceId),
  );
  useAppErrorToast(providerState.error || loginItem.error);

  useEffect(() => {
    if (accessProfile !== "live" || !window.octopusTransport?.loginItemSettings) return;
    let cancelled = false;
    window.octopusTransport.loginItemSettings()
      .then((state) => {
        if (!cancelled) setLoginItem({ ...state, loading: false, error: "" });
      })
      .catch((error) => {
        if (!cancelled) setLoginItem({ supported: false, enabled: false, loading: false, error: error instanceof Error ? error.message : String(error) });
      });
    return () => { cancelled = true; };
  }, [accessProfile]);

  async function setOpenAtLogin(enabled: boolean) {
    const bridge = window.octopusTransport;
    if (!bridge?.loginItemSettings) return;
    setLoginItem((current) => ({ ...current, loading: true, error: "" }));
    try {
      const state = await bridge.loginItemSettings({ enabled });
      setLoginItem({ ...state, loading: false, error: "" });
    } catch (error) {
      setLoginItem((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  }
  const providerOptions = useMemo(() => {
    const options = [
      { value: "", label: "ホームから引き継ぐ" },
      ...providerState.providers.map((provider) => ({ value: provider.id, label: provider.label })),
    ];
    if (storedProviderMissing) {
      return [{ value: providerInterfaceId, label: `${providerInterfaceId} · 未定義`, disabled: true }, ...options];
    }
    return options;
  }, [providerInterfaceId, providerState.providers, storedProviderMissing]);
  const selectedProvider = providerState.providers.find((provider) => provider.id === providerInterfaceId);
  const startupSurfaceOptions = useMemo(() => {
    const options: Array<{ value: string; label: string; glyph: GlyphName; disabled?: boolean }> = clientNavigationDestinations
      .filter((destination) => surfaces.some((surface) => surface.id === destination.surfaceId))
      .map((destination) => ({ value: destination.surfaceId, label: destination.label, glyph: destination.glyph }));
    for (const surface of surfaces) {
      if (options.some((option) => option.value === surface.id)) continue;
      options.push({ value: surface.id, label: surface.label, glyph: surface.glyph });
    }
    if (!options.some((option) => option.value === preferences.startupSurfaceId)) {
      options.unshift({ value: preferences.startupSurfaceId, label: `${preferences.startupSurfaceId} · 利用できません`, glyph: "descriptor", disabled: true });
    }
    return options;
  }, [preferences.startupSurfaceId, surfaces]);

  function selectProvider(next: string) {
    const provider = providerState.providers.find((candidate) => candidate.id === next);
    const model = provider ? providerDefaultModel(provider) : null;
    const reasoningEffort = provider && model
      ? providerDefaultReasoningEffort(provider, model.model)
      : "";
    setProviderInterfaceId(next);
    saveChatSettings({
      providerInterfaceId: next,
      providerModel: model?.model ?? "",
      reasoningEffort,
    }, accessProfile);
  }

  return (
    <section className="settings-section">
      <SettingsHeading
        description="このクライアントに保存するデスクトップの動作設定です。"
        title="一般"
      />

      <OcGroup title="起動とタスク" description="起動時の画面とタスクの表示方法を選びます。">
        <OcCard>
          <OcSettingsRow {...settingsTargetProps("general.first-surface")}
            control={(
              <OcSelect<string>
                label="起動時に開く画面"
                onChange={(startupSurfaceId) => setClientPreferences({ startupSurfaceId })}
                options={startupSurfaceOptions}
                value={preferences.startupSurfaceId}
              />
            )}
            description="起動時に開く画面を選びます。利用できる場合は、最後に開いた画面を復元します。"
            label="起動時に開く画面"
          />
          <OcSettingsRow {...settingsTargetProps("general.internal-runs")}
            control={(
              <OcSwitch
                checked={preferences.showInternalRuns}
                label="内部の実行を表示"
                onCheckedChange={(showInternalRuns) => setClientPreferences({ showInternalRuns })}
              />
            )}
            description="専用のクライアントインターフェースを持たない内部の実行も表示します。読み取り専用で開き、成果物の移動を確認できます。"
            label="内部の実行"
          />
          <OcSettingsRow {...settingsTargetProps("general.task-pane-width")}
            control={(
              <OcSlider
                className="settings-slider-control"
                formatValue={(value) => `${value}%`}
                label="タスクペインの幅"
                max={68}
                min={28}
                onChange={(secondaryTaskPaneWidthPercent) => setClientPreferences({ secondaryTaskPaneWidthPercent })}
                step={1}
                value={preferences.secondaryTaskPaneWidthPercent}
              />
            )}
            description="タスクペインの既定の幅を設定します。区切り線をドラッグしても変更できます。"
            label="タスクペインの幅"
          />
        </OcCard>
      </OcGroup>

      <OcGroup title="メッセージ入力" description="ローカルのチャット画面の動作を設定します。">
        <OcCard>
          <OcSettingsRow {...settingsTargetProps("general.send-shortcut")}
            control={(
              <OcSelect<SendShortcut>
                label="送信のショートカット"
                onChange={(sendShortcut) => setClientPreferences({ sendShortcut })}
                options={[
                  { value: "enter", label: "Enter" },
                  { value: "cmd-if-multiline", label: "複数行のときは ⌘ Enter" },
                  { value: "cmd-always", label: "常に ⌘ Enter" },
                ]}
                value={preferences.sendShortcut}
              />
            )}
            description="Enter で送信する条件と、改行する条件を選びます。"
            label="送信のショートカット"
          />
          <OcSettingsRow {...settingsTargetProps("general.spell-check")}
            control={(
              <OcSwitch
                checked={preferences.spellcheckEnabled}
                label="スペルチェック"
                onCheckedChange={(spellcheckEnabled) => setClientPreferences({ spellcheckEnabled })}
              />
            )}
            description="タスクの入力欄で、OS の辞書と修正候補を使います。"
            label="スペルチェック"
          />
          <OcSettingsRow {...settingsTargetProps("general.active-reply")}
            control={<span className="text-sm text-token-text-secondary">現在の応答に指示を追加</span>}
            description="送信すると、現在の応答にすぐに指示を追加します。送信待ちにするには、送信ボタンを右クリックするか、専用のショートカットを使ってください。"
            label="実行中の送信"
          />
          <OcSettingsRow {...settingsTargetProps("general.work-mode")}
            control={(
              <OcSelect<"detailed" | "concise">
                label="技術的な詳細"
                onChange={(technicalDetailLevel) => setClientPreferences({ technicalDetailLevel })}
                options={[
                  { value: "detailed", label: "詳細" },
                  { value: "concise", label: "簡潔" },
                ]}
                value={preferences.technicalDetailLevel}
              />
            )}
            description="「詳細」では推論、ツール、計画、検索、フックを会話内に表示します。「簡潔」では同じ記録を折りたたんだアクティビティ内にまとめます。"
            label="作業モード"
          />
        </OcCard>
      </OcGroup>

      <OcGroup
        title="既定のプロバイダー"
        description="ここで別のプロバイダーを選ばない限り、新しいタスクはホームのプロバイダーを引き継ぎます。"
      >
        <OcCard>
          <OcSettingsRow {...settingsTargetProps("general.provider")}
            control={(
              <OcSelect<string>
                className="settings-provider-select"
                disabled={providerState.loading || providerOptions.length === 0}
                error={providerState.error || (storedProviderMissing ? "This saved interface is unavailable. Choose a declared interface or Inherit from Home." : undefined)}
                label="既定のプロバイダー"
                onChange={selectProvider}
                options={providerOptions}
                placeholder={providerState.loading ? "レジストリを読み込んでいます…" : "インターフェースを選択"}
                value={providerInterfaceId}
              />
            )}
            description={providerInterfaceId
              ? "このインターフェース ID をチャットの既定値として保存しています。"
              : "上書き設定はありません。新しいタスクはホームのプロバイダーと推論の強さを引き継ぎます。"}
            label="プロバイダー"
          />
          {selectedProvider ? <ProviderSummary provider={selectedProvider} compact /> : null}
        </OcCard>
      </OcGroup>

      <OcGroup title="アプリケーション" description="デスクトップアプリの起動時の動作です。">
        <OcCard>
          <OcSettingsRow {...settingsTargetProps("general.on-launch")}
            control={<OcStatus label="前回の画面を復元" tone="neutral" />}
            description="アプリを閉じたときに表示していた画面を開きます。"
            label="起動時"
          />
          <OcSettingsRow {...settingsTargetProps("general.open-at-login")}
            control={accessProfile === "live" ? (
              <OcSwitch
                checked={loginItem.enabled}
                disabled={loginItem.loading || !loginItem.supported}
                label="ログイン時に起動"
                onCheckedChange={(enabled) => void setOpenAtLogin(enabled)}
              />
            ) : <OcStatus label="管理者のみ" tone="muted" />}
            description="OS へのログイン後に Octopus アプリを起動します。"
            label="ログイン時に起動"
            meta={accessProfile === "live" && !loginItem.loading && !loginItem.supported ? "Available in packaged builds." : undefined}
          />
          <OcSettingsRow {...settingsTargetProps("general.keep-awake")}
            control={(
              <OcSwitch
                checked={preferences.keepAwakeDuringRuns}
                label="実行中はスリープさせない"
                onCheckedChange={(keepAwakeDuringRuns) => setClientPreferences({ keepAwakeDuringRuns })}
              />
            )}
            description="タスクを実行している間、システムのスリープを防ぎます。"
            label="スリープを防止"
          />
        </OcCard>
      </OcGroup>
      <OcGroup title="通知">
        <OcCard>
          <MarkActivitySettingsRow />
          <NotificationSoundSettingsRow />
        </OcCard>
      </OcGroup>
    </section>
  );
}
