import { APP_LOCALE } from "../../locale";
import { settingsTargetProps } from "./settingsCatalog";
import { useEffect, useMemo, useState } from "react";
import { useClientPreferences, useSetClientPreferences, type DictationProvider } from "../../clientPreferences";
import { OcButton, OcCard, OcGroup, OcSelect, OcSettingsRow, OcStatus, OcSwitch, OcTextField } from "../../design-system/components";
import { Glyph } from "../IconGlyphs";
import type { OctopusClientAccessProfile } from "../../electron";
import { appToast, useAppErrorToast } from "../../toasts";
import { SettingsHeading } from "./SettingsHeading";
import { formatKeyboardShortcuts, useKeyboardShortcuts } from "../../keyboardShortcuts";
import { DictationRecordings } from "../chat/DictationRecordings";

export function VoiceAudioSection({ accessProfile, recordingId, onShowAllRecordings }: { accessProfile: OctopusClientAccessProfile; recordingId?: string; onShowAllRecordings?: () => void }) {
  const preferences = useClientPreferences();
  const setClientPreferences = useSetClientPreferences();
  const keyboardShortcuts = useKeyboardShortcuts(accessProfile);
  const [audioInputs, setAudioInputs] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [audioOutputs, setAudioOutputs] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [deviceError, setDeviceError] = useState("");
  const [deviceLoading, setDeviceLoading] = useState(true);
  const [dictionaryExpanded, setDictionaryExpanded] = useState(false);
  const [dictionaryDraft, setDictionaryDraft] = useState<{ id: string; phrase: string; replacement: string } | null>(null);
  useAppErrorToast(deviceError);

  useEffect(() => {
    let cancelled = false;
    const mediaDevices = navigator.mediaDevices;
    const refresh = async () => {
      setDeviceLoading(true);
      if (accessProfile === "lab") {
        if (!cancelled) {
          setAudioInputs([{ deviceId: "test-microphone", label: "マイクをテスト" }]);
          setAudioOutputs([{ deviceId: "test-speaker", label: "スピーカーをテスト" }]);
          setDeviceError("");
          setDeviceLoading(false);
        }
        return;
      }
      if (!mediaDevices?.enumerateDevices) {
        if (!cancelled) {
          setDeviceError("Audio device enumeration is unavailable in this client host.");
          setDeviceLoading(false);
        }
        return;
      }
      try {
        const devices = await mediaDevices.enumerateDevices();
        if (cancelled) return;
        setAudioInputs(settingsAudioDevices(devices.filter((device) => device.kind === "audioinput"), "Microphone"));
        setAudioOutputs(settingsAudioDevices(devices.filter((device) => device.kind === "audiooutput"), "Speaker"));
        setDeviceError("");
      } catch (failure) {
        if (!cancelled) setDeviceError(failure instanceof Error ? failure.message : String(failure));
      } finally {
        if (!cancelled) setDeviceLoading(false);
      }
    };
    void refresh();
    const onDeviceChange = () => void refresh();
    mediaDevices?.addEventListener?.("devicechange", onDeviceChange);
    return () => {
      cancelled = true;
      mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
    };
  }, [accessProfile]);

  const inputOptions = useMemo(
    () => settingsAudioOptions(audioInputs, preferences.audioInputDeviceId, "システムの既定値"),
    [audioInputs, preferences.audioInputDeviceId],
  );
  const outputOptions = useMemo(
    () => settingsAudioOptions(audioOutputs, preferences.audioOutputDeviceId, "システムの既定値"),
    [audioOutputs, preferences.audioOutputDeviceId],
  );

  function beginDictionaryEntry(id = "") {
    const existing = preferences.dictationDictionary.find((entry) => entry.id === id);
    setDictionaryExpanded(true);
    setDictionaryDraft(existing
      ? { ...existing }
      : { id: "", phrase: "", replacement: "" });
  }

  function saveDictionaryEntry() {
    if (!dictionaryDraft) return;
    const phrase = dictionaryDraft.phrase.trim();
    const replacement = dictionaryDraft.replacement.trim();
    if (!phrase || !replacement) return;
    const duplicate = preferences.dictationDictionary.some((entry) => (
      entry.id !== dictionaryDraft.id && entry.phrase.toLocaleLowerCase() === phrase.toLocaleLowerCase()
    ));
    if (duplicate) return;
    const id = dictionaryDraft.id || `dict_${Date.now().toString(36)}_${crypto.getRandomValues(new Uint32Array(1))[0]?.toString(36)}`;
    const next = preferences.dictationDictionary.some((entry) => entry.id === id)
      ? preferences.dictationDictionary.map((entry) => entry.id === id ? { id, phrase, replacement } : entry)
      : [...preferences.dictationDictionary, { id, phrase, replacement }];
    setClientPreferences({ dictationDictionary: next });
    setDictionaryDraft(null);
  }

  const dictionaryDraftDuplicate = Boolean(dictionaryDraft?.phrase.trim()) && preferences.dictationDictionary.some((entry) => (
    entry.id !== dictionaryDraft?.id
      && entry.phrase.toLocaleLowerCase() === dictionaryDraft?.phrase.trim().toLocaleLowerCase()
  ));

  return (
    <section className="settings-section">
      <SettingsHeading
        description="マイク、音声入力、アプリ内での通話の動作を設定します。"
        title="音声"
      />

      <OcGroup title="デバイス" description="音声通話に使う録音・再生デバイスです。">
        <OcCard>
          <OcSettingsRow {...settingsTargetProps("voice.microphone")}
            control={(
              <OcSelect<string>
                disabled={deviceLoading || inputOptions.length === 0}
                label="マイク"
                onChange={(audioInputDeviceId) => setClientPreferences({ audioInputDeviceId })}
                options={inputOptions}
                value={preferences.audioInputDeviceId}
              />
            )}
            description="音声入力と音声通話に使います。"
            label="マイク"
          />
          <OcSettingsRow {...settingsTargetProps("voice.speaker")}
            control={(
              <OcSelect<string>
                disabled={deviceLoading || outputOptions.length === 0}
                label="スピーカー"
                onChange={(audioOutputDeviceId) => setClientPreferences({ audioOutputDeviceId })}
                options={outputOptions}
                value={preferences.audioOutputDeviceId}
              />
            )}
            description="音声の応答や音声の成果物を再生するデバイスです。"
            label="スピーカー"
          />
          <OcSettingsRow {...settingsTargetProps("voice.agent-voice")}
            control={<OcStatus label="未定義" tone="muted" />}
            description="音声インターフェースで対応する声が定義されている場合に、合成音声を選べます。"
            label="エージェントの声"
          />
        </OcCard>
      </OcGroup>

      <OcGroup title="音声入力">
        <OcCard>
          <OcSettingsRow {...settingsTargetProps("voice.transcription-provider")}
            control={(
              <OcSelect<DictationProvider>
                label="プロバイダー"
                onChange={(dictationProvider) => setClientPreferences({ dictationProvider })}
                options={[{ value: "codex", label: "Codex" }]}
                value={preferences.dictationProvider}
              />
            )}
            description="ローカルの Codex アプリで認証済みの ChatGPT セッションを使います。Octopus は音声専用の API キーを保存しません。"
            label="文字起こしのプロバイダー"
          />
          <OcSettingsRow {...settingsTargetProps("voice.toggle-dictation")}
            control={<ShortcutKeys keys={formatKeyboardShortcuts(keyboardShortcuts.start_dictation ?? []) || "Unassigned"} />}
            description="現在の入力欄で音声入力を開始・停止します。"
            label="音声入力を切り替え"
          />
          <OcSettingsRow {...settingsTargetProps("voice.global-dictation")}
            control={(
              <OcSwitch
                checked={preferences.globalQuickDictation}
                disabled={(keyboardShortcuts.start_dictation ?? []).length === 0}
                label="どこからでも音声入力"
                onCheckedChange={(globalQuickDictation) => setClientPreferences({ globalQuickDictation })}
              />
            )}
            description="どこからでも Octopus を手前に表示し、現在のタスクで音声入力を始められます。"
            label="どこからでも音声入力"
            meta={(keyboardShortcuts.start_dictation ?? []).length ? "Only active while this profile is unlocked." : "Assign Toggle dictation first."}
          />
          <OcSettingsRow {...settingsTargetProps("voice.hold-dictate")}
            control={<OcStatus label="入力欄のマイク" tone="success" />}
            description="マイクボタンを押している間録音し、離すと文字起こしを挿入します。デスクトップ全体での長押し入力には、ネイティブのキー解放イベントへの対応が必要です。"
            label="長押しで音声入力"
          />
          <OcSettingsRow {...settingsTargetProps("voice.dictionary")}
            control={(
              <div className="settings-inline-actions">
                {preferences.dictationDictionary.length ? (
                  <OcStatus label={`${preferences.dictationDictionary.length} ${preferences.dictationDictionary.length === 1 ? "entry" : "entries"}`} tone="neutral" />
                ) : null}
                <OcButton onClick={() => {
                  if (preferences.dictationDictionary.length && !dictionaryExpanded) {
                    setDictionaryExpanded(true);
                    return;
                  }
                  beginDictionaryEntry();
                }}>
                  {preferences.dictationDictionary.length && !dictionaryExpanded ? "管理" : "項目を追加"}
                </OcButton>
              </div>
            )}
            description="認識した単語やフレーズを、入力欄に挿入する前に置き換えます。"
            label="音声入力の辞書"
          />
          {dictionaryExpanded ? (
            <div className="mx-3 mb-3 grid gap-1 rounded-xl bg-token-foreground/3 p-1.5">
              {preferences.dictationDictionary.map((entry) => (
                <div className="group flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 hover:bg-token-list-hover-background" key={entry.id}>
                  <button className="min-w-0 flex-1 cursor-interaction text-left" onClick={() => beginDictionaryEntry(entry.id)} type="button">
                    <span className="block truncate text-sm text-token-foreground">{entry.replacement}</span>
                    <span className="mt-0.5 block truncate text-xs text-token-description-foreground">認識した言葉：「{entry.phrase}”</span>
                  </button>
                  <OcButton onClick={() => beginDictionaryEntry(entry.id)} size="sm">編集</OcButton>
                  <OcButton
                    onClick={() => {
                      const previous = preferences.dictationDictionary;
                      setClientPreferences({ dictationDictionary: previous.filter((candidate) => candidate.id !== entry.id) });
                      if (dictionaryDraft?.id === entry.id) setDictionaryDraft(null);
                      appToast.info(`Removed “${entry.phrase}”`, 8, {
                        action: { label: "元に戻す", onSelect: () => setClientPreferences({ dictationDictionary: previous }) },
                        dedupeKey: `dictation-dictionary-remove:${entry.id}`,
                      });
                    }}
                    size="sm"
                  >
                    削除
                  </OcButton>
                </div>
              ))}
              {dictionaryDraft ? (
                <div className="grid gap-2 rounded-lg bg-token-main-surface-primary px-2.5 py-2.5">
                  <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
                    <OcTextField
                      autoFocus
                      label="認識する言葉"
                      maxLength={120}
                      onChange={(event) => setDictionaryDraft({ ...dictionaryDraft, phrase: event.currentTarget.value })}
                      placeholder="話す言葉"
                      showLabel
                      value={dictionaryDraft.phrase}
                    />
                    <OcTextField
                      label="挿入"
                      maxLength={120}
                      onChange={(event) => setDictionaryDraft({ ...dictionaryDraft, replacement: event.currentTarget.value })}
                      placeholder="置き換え後の表記"
                      showLabel
                      value={dictionaryDraft.replacement}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs ${dictionaryDraftDuplicate ? "text-token-error-foreground" : "text-token-description-foreground"}`}>
                      {dictionaryDraftDuplicate ? "そのフレーズは登録済みです。" : "大文字・小文字を区別せず、単語の区切りを考慮して照合します。"}
                    </span>
                    <div className="settings-inline-actions">
                      <OcButton onClick={() => setDictionaryDraft(null)} size="sm">キャンセル</OcButton>
                      <OcButton
                        disabled={!dictionaryDraft.phrase.trim() || !dictionaryDraft.replacement.trim() || dictionaryDraftDuplicate}
                        onClick={saveDictionaryEntry}
                        size="sm"
                        variant="primary"
                      >
                        保存
                      </OcButton>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between gap-2 px-2 py-1.5">
                  <OcButton onClick={() => beginDictionaryEntry()} size="sm">項目を追加</OcButton>
                  <OcButton onClick={() => setDictionaryExpanded(false)} size="sm">完了</OcButton>
                </div>
              )}
            </div>
          ) : null}
          <div {...settingsTargetProps("voice.recordings")}>
            <DictationRecordings recordingId={recordingId} onShowAll={onShowAllRecordings} />
          </div>
        </OcCard>
      </OcGroup>

      <OcGroup title="通話" description="ホーム以外の画面での通話の動作を設定します。">
        <OcCard>
          <OcSettingsRow {...settingsTargetProps("voice.floating-call")}
            control={(
              <OcSwitch
                checked={preferences.floatingCallPuck}
                label="フローティング通話ウィジェット"
                onCheckedChange={(floatingCallPuck) => setClientPreferences({ floatingCallPuck })}
              />
            )}
            description="通話中にホームから離れると、球体、ミュート、終了ボタンを備えた小さなウィジェットに切り替わります。ウィジェットは移動できます。"
            label="フローティング通話ウィジェット"
          />
          <OcSettingsRow {...settingsTargetProps("voice.incoming-audio")}
            control={(
              <OcSelect<"ask" | "play" | "never">
                label="受信した音声の成果物"
                onChange={(incomingAudioArtifactBehavior) => setClientPreferences({ incomingAudioArtifactBehavior })}
                options={[
                  { value: "ask", label: "毎回確認する" },
                  { value: "play", label: "自動再生する" },
                  { value: "never", label: "再生しない" },
                ]}
                value={preferences.incomingAudioArtifactBehavior}
              />
            )}
            description="セッション中に音声の成果物を受信したときの動作です。"
            label="受信した音声の成果物"
          />
        </OcCard>
      </OcGroup>


    </section>
  );
}

function settingsAudioDevices(devices: MediaDeviceInfo[], fallback: string): Array<{ deviceId: string; label: string }> {
  const seen = new Set<string>();
  return devices.flatMap((device, index) => {
    if (!device.deviceId || device.deviceId === "default" || seen.has(device.deviceId)) return [];
    seen.add(device.deviceId);
    return [{ deviceId: device.deviceId, label: device.label || `${fallback} ${index + 1}` }];
  });
}

function settingsAudioOptions(devices: Array<{ deviceId: string; label: string }>, selected: string, defaultLabel: string) {
  const options: Array<{ value: string; label: string; disabled?: boolean }> = [
    { value: "default", label: defaultLabel },
    ...devices.map((device) => ({ value: device.deviceId, label: device.label })),
  ];
  if (selected && !options.some((option) => option.value === selected)) {
    options.push({ value: selected, label: `${selected} · 利用できません`, disabled: true });
  }
  return options;
}

function ShortcutKeys({ keys }: { keys: string }) {
  return (
    <span className="flex min-h-8 items-center gap-1 text-sm text-token-text-secondary">
      <kbd className="inline-flex !rounded-md !border-0 !bg-current/10 !px-2 !py-1 !font-sans !text-sm !leading-none !text-current !shadow-none">
        {keys}
      </kbd>
    </span>
  );
}
