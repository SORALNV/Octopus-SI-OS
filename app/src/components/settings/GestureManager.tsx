import { useEffect, useRef, useState } from "react";
import { clientCommands, type ClientCommandId } from "../../clientActions";
import { useCustomGestures, customGestureCommandLabel, type CustomGesture } from "../../customGestures";
import type { OctopusClientAccessProfile } from "../../electron";
import type { FingerCurls } from "../../airHandEngine";
import {
  attachGesturePreview,
  currentGestureState,
  readCameraPermission,
  refreshGestureCameras,
  requestCameraPermission,
  startGestureRecognition,
  subscribeGestureState,
  useGestureDevices,
  useGestureRecognitionCoarseState,
  type CameraPermission,
  type GestureRecognitionPhase,
} from "../../gestureRecognition";
import { airHandGestures, defaultAirHandGestureCommand, emitAirHandGesture, subscribeAirHandGestures, useGestureShortcutPreferences, useSetGestureShortcutPreferences, type AirHandGestureId, type GestureCommandId } from "../../gestureShortcuts";
import { OcButton, OcCard, OcEmptyState, OcGroup, OcSelect, OcSettingsRow, OcStatus, OcSwitch, OcTextField } from "../../design-system/components";
import { appToast } from "../../toasts";

const CURL_KEYS: readonly (keyof FingerCurls)[] = ["thumb", "index", "middle", "ring", "little"];
const RECORD_COUNTDOWN_STEPS = 3;
const RECORD_COUNTDOWN_STEP_MS = 700;
const RECORD_CAPTURE_MS = 900;
const RECORD_SAMPLE_MS = 40;
const RECORD_MIN_SAMPLES = 6;
const RECOGNIZED_GESTURE_MS = 2_200;
const GESTURE_MIN_CAMERA_FPS = 15;
const CURL_LABELS: Record<keyof FingerCurls, string> = {
  thumb: "Thumb",
  index: "Index",
  middle: "Middle",
  ring: "Ring",
  little: "Little",
};

export function GestureManager({ accessProfile }: { accessProfile: OctopusClientAccessProfile }) {
  const preferences = useGestureShortcutPreferences(accessProfile);
  const setPreferences = useSetGestureShortcutPreferences(accessProfile);
  const devicesView = useGestureDevices();
  const custom = useCustomGestures(accessProfile);
  const [permission, setPermission] = useState<CameraPermission | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const inlineCanvasRef = useRef<HTMLCanvasElement>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const [pip, setPip] = useState(false);

  useEffect(() => {
    let disposed = false;
    void readCameraPermission().then((value) => {
      if (!disposed) setPermission(value);
    });
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (devicesView.phase === "running") void refreshGestureCameras();
  }, [devicesView.phase]);

  const granted = permission?.granted ?? false;
  const cameraLive = devicesView.phase === "running";

  const setMapping = (gesture: AirHandGestureId, command: GestureCommandId) => {
    setPreferences((current) => ({ mappings: { ...current.mappings, [gesture]: command } }));
  };
  const removeBuiltin = (gesture: AirHandGestureId) => {
    const previousMapping = preferences.mappings[gesture];
    const label = airHandGestures.find((candidate) => candidate.id === gesture)?.label ?? gesture;
    setPreferences((current) => ({
      removedBuiltins: [...new Set([...current.removedBuiltins, gesture])],
      mappings: { ...current.mappings, [gesture]: "none" },
    }));
    appToast.info(`Removed ${label}`, 8, {
      dedupeKey: `builtin-gesture-remove:${accessProfile}:${gesture}`,
      action: {
        label: "元に戻す",
        onSelect: () => setPreferences((current) => current.removedBuiltins.includes(gesture) ? {
          removedBuiltins: current.removedBuiltins.filter((id) => id !== gesture),
          mappings: { ...current.mappings, [gesture]: previousMapping },
        } : {}),
      },
    });
  };
  const restoreBuiltin = (gesture: AirHandGestureId) => {
    setPreferences((current) => ({
      removedBuiltins: current.removedBuiltins.filter((id) => id !== gesture),
      mappings: { ...current.mappings, [gesture]: defaultAirHandGestureCommand(gesture) },
    }));
  };
  const visibleBuiltins = airHandGestures.filter((gesture) => !preferences.removedBuiltins.includes(gesture.id));
  const removedBuiltins = airHandGestures.filter((gesture) => preferences.removedBuiltins.includes(gesture.id));

  useEffect(() => {
    if (!preferences.enabled) {
      setPip(false);
      return;
    }
    const frame = previewFrameRef.current;
    if (!frame) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPip(!entry.isIntersecting),
      { threshold: 0.35 },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, [preferences.enabled]);

  useEffect(() => {
    if (!preferences.enabled) {
      attachGesturePreview(null);
      return;
    }
    attachGesturePreview(pip ? pipCanvasRef.current : inlineCanvasRef.current);
    return () => attachGesturePreview(null);
  }, [pip, preferences.enabled]);

  const requestPermission = async () => {
    setRequesting(true);
    try {
      const result = await requestCameraPermission();
      setPermission(result);
      if (result.granted && preferences.enabled) {
        void startGestureRecognition({
          cameraDeviceId: preferences.cameraDeviceId,
          mirrorX: preferences.mirrorX,
          sensitivity: preferences.sensitivity,
        });
      }
    } finally {
      setRequesting(false);
    }
  };

  return (
    <OcGroup
      description="手の動きでフォーカスを移動したり、ホームのウィジェットを操作できます。独自のジェスチャーをコマンドに割り当てることもできます。"
      title="ジェスチャー操作"
    >
      <div className="gesture-manager">
        <OcCard>
          <OcSettingsRow
            control={<OcSwitch checked={preferences.enabled} label="ジェスチャー操作を有効にする" onCheckedChange={(enabled) => setPreferences({ enabled })} />}
            description="ジェスチャーはこのアプリ内で認識し、割り当てられたコマンドだけを実行します。"
            label="ジェスチャー操作"
          />
          <OcSettingsRow
            control={granted ? (
              <OcStatus label="許可済み" tone="success" />
            ) : (
              <div className="settings-inline-actions">
                <OcStatus label={permissionLabel(permission)} tone={permission?.status === "denied" ? "danger" : "muted"} />
                <OcButton disabled={requesting || permission?.status === "denied"} onClick={() => void requestPermission()} size="sm">
                  {requesting ? "要求しています…" : "カメラへのアクセスを許可"}
                </OcButton>
              </div>
            )}
            description={permission?.status === "denied"
              ? "カメラへのアクセスが拒否されました。「システム設定 → プライバシーとセキュリティ → カメラ」で Octopus を有効にしてください。"
              : "カメラはローカルでの動作確認に使います。映像は手の認識のためにメモリ上で処理され、実行基盤には送信しません。"}
            label="カメラへのアクセス"
          />
          <div className="gesture-camera-setting">
            <div className="gesture-camera-head">
              <div className="gesture-camera-copy">
                <span className="gesture-camera-label">カメラ</span>
                <span className="gesture-camera-detail">手を認識するためのカメラを選びます。</span>
              </div>
              <div className="settings-inline-actions">
                <OcSelect<string>
                  disabled={!granted}
                  label="ジェスチャー用カメラ"
                  onChange={(cameraDeviceId) => setPreferences({ cameraDeviceId })}
                  options={[
                    { value: "", label: "自動" },
                    ...devicesView.devices.map((device) => ({ value: device.deviceId, label: device.label })),
                  ]}
                  value={preferences.cameraDeviceId}
                />
                <OcButton disabled={!granted} onClick={() => void refreshGestureCameras()} size="sm" variant="secondary">更新</OcButton>
              </div>
            </div>
            {preferences.enabled ? (
              <div className="gesture-preview-inline" ref={previewFrameRef}>
                <canvas ref={inlineCanvasRef} />
                <LivePoseBadge cameraLive={cameraLive} idleNote={previewNote(preferences.enabled, granted, devicesView.phase)} mappings={preferences.mappings} />
                {!cameraLive ? (
                  <span className="gesture-preview-note">{previewNote(preferences.enabled, granted, devicesView.phase)}</span>
                ) : null}
              </div>
            ) : null}
            {preferences.enabled && cameraLive ? <CameraRateNote /> : null}
          </div>
          <OcSettingsRow
            control={(
              <OcSelect
                label="ジェスチャーの反応"
                onChange={(sensitivity) => setPreferences({ sensitivity })}
                options={[
                  { value: "responsive", label: "すばやく" },
                  { value: "balanced", label: "標準" },
                  { value: "deliberate", label: "じっくり" },
                ]}
                value={preferences.sensitivity}
              />
            )}
            description="ポーズを保つ時間と、スワイプとして認識する距離を調整します。"
            label="回答"
          />
          <OcSettingsRow
            control={<OcSwitch checked={preferences.mirrorX} label="左右の動きを反転" onCheckedChange={(mirrorX) => setPreferences({ mirrorX })} />}
            description="鏡像のカメラプレビューに合わせて左右の方向を調整します。"
            label="左右反転"
          />
          <OcSettingsRow
            control={<OcSwitch checked={preferences.spatialControl} label="ホームのウィジェットを操作" onCheckedChange={(spatialControl) => setPreferences({ spatialControl })} />}
            description="ホームのウィジェットを指し、握ってドラッグし、つまんでサイズを変えられます。"
            label="手の動きでウィジェットを操作"
          />
        </OcCard>

        <OcGroup
          actions={<OcButton disabled={!cameraLive || recording} onClick={() => setRecording(true)} size="sm">ジェスチャーを登録</OcButton>}
          description="各ポーズにコマンドを割り当てます。既定の割り当てを変更・削除したり、独自のポーズを登録できます。"
          title="ジェスチャー"
        >
          <OcCard>
            {recording ? (
              <GestureRecorder
                onCancel={() => setRecording(false)}
                onMissed={() => {
                  setRecording(false);
                  appToast.warning("No hand was visible. Keep your hand in the camera preview and record again.");
                }}
                onCaptured={(curls) => {
                  setRecording(false);
                  const created = custom.add({ name: `Gesture ${custom.gestures.length + 1}`, definition: "", command: "none", curls });
                  setEditing(created.id);
                }}
              />
            ) : null}
            {visibleBuiltins.map((gesture) => (
              <OcSettingsRow
                control={(
                  <div className="settings-inline-actions">
                    <OcSelect<GestureCommandId>
                      label={`${gesture.label} command`}
                      onChange={(command) => setMapping(gesture.id, command)}
                      options={[
                        { value: "none", label: "操作なし" },
                        ...clientCommands.map((command) => ({ value: command.id, label: command.label })),
                      ]}
                      value={preferences.mappings[gesture.id]}
                    />
                    <OcButton aria-label={`削除 ${gesture.label}`} onClick={() => removeBuiltin(gesture.id)} size="sm" variant="secondary" tone="danger">削除</OcButton>
                  </div>
                )}
                description={gesture.detail}
                key={gesture.id}
                label={gesture.label}
              />
            ))}
            {custom.gestures.map((gesture) => (
              <CustomGestureRow
                editing={editing === gesture.id}
                gesture={gesture}
                key={gesture.id}
                onEditToggle={() => setEditing(editing === gesture.id ? null : gesture.id)}
                onRemoved={() => {
                  if (editing === gesture.id) setEditing(null);
                  const removed = custom.remove(gesture.id);
                  if (!removed) return;
                  appToast.info(`Removed ${gesture.name}`, 8, {
                    action: { label: "元に戻す", onSelect: () => custom.restore(removed.gesture, removed.index) },
                    dedupeKey: `custom-gesture-remove:${gesture.id}`,
                  });
                }}
                onUpdate={(patch) => custom.update(gesture.id, patch)}
              />
            ))}
            {visibleBuiltins.length === 0 && custom.gestures.length === 0 && !recording ? (
              <OcEmptyState className="min-h-0 py-6" detail="新しく登録するか、下の既定のジェスチャーを復元してください。" size="compact" title="ジェスチャーがありません" />
            ) : null}
            {removedBuiltins.length > 0 ? (
              <div className="gesture-restore-row">
                <span>削除した既定のジェスチャー</span>
                <div className="settings-inline-actions">
                  {removedBuiltins.map((gesture) => (
                    <OcButton key={gesture.id} onClick={() => restoreBuiltin(gesture.id)} size="sm" variant="secondary">＋ {gesture.label}</OcButton>
                  ))}
                </div>
              </div>
            ) : null}
          </OcCard>
        </OcGroup>

        {accessProfile === "lab" ? (
          <OcGroup description="カメラを使わず、テスト用のジェスチャーイベントを生成します。" title="シミュレーション">
            <OcCard>
              <div className="gesture-simulate-row">
                {airHandGestures.map((gesture) => (
                  <OcButton
                    disabled={!preferences.enabled}
                    key={gesture.id}
                    onClick={() => emitAirHandGesture(gesture.id, "test")}
                    size="sm"
                    variant="secondary"
                  >
                    {gesture.label}
                  </OcButton>
                ))}
              </div>
            </OcCard>
          </OcGroup>
        ) : null}
      </div>

      {pip && preferences.enabled ? (
        <div className="gesture-preview-pip">
          <canvas ref={pipCanvasRef} />
          <LivePoseBadge cameraLive={cameraLive} idleNote={previewNote(preferences.enabled, granted, devicesView.phase)} mappings={preferences.mappings} />
        </div>
      ) : null}
    </OcGroup>
  );
}

function LivePoseBadge({ cameraLive, idleNote, mappings }: { cameraLive: boolean; idleNote: string; mappings: Readonly<Record<AirHandGestureId, GestureCommandId>> }) {
  const recognition = useGestureRecognitionCoarseState();
  const [recognized, setRecognized] = useState<AirHandGestureId | null>(null);
  useEffect(() => {
    let timer = 0;
    const unsubscribe = subscribeAirHandGestures((gesture) => {
      window.clearTimeout(timer);
      setRecognized(gesture);
      timer = window.setTimeout(() => setRecognized(null), RECOGNIZED_GESTURE_MS);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);
  const command = recognized ? mappings[recognized] : "none";
  return (
    <div className={`gesture-preview-badge${recognized ? " is-recognized" : ""}`}>
      <span className={`gesture-preview-dot is-${cameraLive ? "live" : "idle"}`} />
      {recognized
        ? `${gestureLabel(recognized)} → ${command === "none" ? "操作なし" : commandLabel(command)} · 設定を閉じると動作します`
        : cameraLive ? poseLabel(recognition.pose) : idleNote}
    </div>
  );
}

function CameraRateNote() {
  const { cameraFps } = useGestureRecognitionCoarseState();
  if (cameraFps == null || cameraFps >= GESTURE_MIN_CAMERA_FPS) return null;
  return (
    <span className="gesture-camera-rate" role="status">
      カメラのフレームレート： {cameraFps} fps。スワイプの認識に必要な最小値： {GESTURE_MIN_CAMERA_FPS}。明るさを増すと改善することがあります。スマートフォンをカメラに使う場合は、発熱によって速度が落ちることがあります。
    </span>
  );
}

function gestureLabel(gesture: AirHandGestureId): string {
  return airHandGestures.find((candidate) => candidate.id === gesture)?.label ?? gesture;
}

function commandLabel(command: ClientCommandId): string {
  return clientCommands.find((candidate) => candidate.id === command)?.label ?? command;
}

function GestureRecorder({
  onCancel,
  onCaptured,
  onMissed,
}: {
  onCancel: () => void;
  onCaptured: (curls: FingerCurls) => void;
  onMissed: () => void;
}) {
  const [countdown, setCountdown] = useState(RECORD_COUNTDOWN_STEPS);
  const recognition = useGestureRecognitionCoarseState();
  const missedRef = useRef(onMissed);
  missedRef.current = onMissed;
  const capturedRef = useRef(onCaptured);
  capturedRef.current = onCaptured;

  useEffect(() => {
    const samples: FingerCurls[] = [];
    let sampler = 0;
    const ticker = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), RECORD_COUNTDOWN_STEP_MS);
    const capture = window.setTimeout(() => {
      window.clearInterval(ticker);
      setCountdown(0);
      sampler = window.setInterval(() => {
        const curls = currentGestureState().curls;
        if (curls) samples.push(curls);
      }, RECORD_SAMPLE_MS);
    }, RECORD_COUNTDOWN_STEPS * RECORD_COUNTDOWN_STEP_MS);
    const done = window.setTimeout(() => {
      window.clearInterval(sampler);
      const captured = steadyCurls(samples);
      if (captured) capturedRef.current(captured);
      else missedRef.current();
    }, RECORD_COUNTDOWN_STEPS * RECORD_COUNTDOWN_STEP_MS + RECORD_CAPTURE_MS);
    return () => {
      window.clearInterval(ticker);
      window.clearInterval(sampler);
      window.clearTimeout(capture);
      window.clearTimeout(done);
    };
  }, []);

  return (
    <div className="gesture-recorder">
      <div className="gesture-recorder-copy">
        <strong>ポーズを保ってください</strong>
        <span>{countdown > 0 ? `撮影まで ${countdown}…` : "撮影しています…"}</span>
      </div>
      <div className="gesture-recorder-live">
        {recognition.curls ? <CurlBars curls={recognition.curls} /> : <span className="gesture-preview-note">カメラに手を見せてください</span>}
      </div>
      <OcButton onClick={onCancel} size="sm" variant="secondary">キャンセル</OcButton>
    </div>
  );
}

function CustomGestureRow({
  editing,
  gesture,
  onEditToggle,
  onRemoved,
  onUpdate,
}: {
  editing: boolean;
  gesture: CustomGesture;
  onEditToggle: () => void;
  onRemoved: () => void;
  onUpdate: (patch: Partial<Omit<CustomGesture, "id">>) => void;
}) {
  return (
    <div className={`gesture-custom-row${editing ? " is-editing" : ""}`}>
      <div className="gesture-custom-main">
        <div className="gesture-custom-pose"><CurlBars curls={gesture.curls} /></div>
        <div className="gesture-custom-copy">
          <span className="gesture-custom-name">{gesture.name}</span>
          <span className="gesture-custom-command">{customGestureCommandLabel(gesture.command)}</span>
          {gesture.definition ? <span className="gesture-custom-definition">{gesture.definition}</span> : null}
        </div>
        <div className="settings-inline-actions">
          <OcButton onClick={onEditToggle} size="sm" variant="secondary">{editing ? "完了" : "編集"}</OcButton>
          <OcButton onClick={onRemoved} size="sm" variant="secondary" tone="danger">削除</OcButton>
        </div>
      </div>
      {editing ? (
        <div className="gesture-custom-edit">
          <OcTextField label="名前" onChange={(event) => onUpdate({ name: event.currentTarget.value })} showLabel value={gesture.name} />
          <OcTextField label="定義" onChange={(event) => onUpdate({ definition: event.currentTarget.value })} placeholder="このポーズの意味" showLabel value={gesture.definition} />
          <div className="gesture-field">
            <span>コマンド</span>
            <OcSelect<ClientCommandId | "none">
              label="コマンド"
              onChange={(command) => onUpdate({ command })}
              options={[
                { value: "none", label: "操作なし" },
                ...clientCommands.map((command) => ({ value: command.id, label: command.label })),
              ]}
              value={gesture.command}
            />
          </div>
          <OcButton
            onClick={() => {
              const curls = currentGestureState().curls;
              if (curls) onUpdate({ curls });
            }}
            size="sm"
            variant="secondary"
          >
            現在のポーズを撮り直す
          </OcButton>
        </div>
      ) : null}
    </div>
  );
}

function CurlBars({ curls }: { curls: FingerCurls }) {
  return (
    <div className="gesture-curl-bars" role="img" aria-label="指のポーズ">
      {CURL_KEYS.map((key) => (
        <span className="gesture-curl-bar" key={key} title={CURL_LABELS[key]}>
          <span style={{ height: `${Math.round(clampUnit(curls[key]) * 100)}%` }} />
        </span>
      ))}
    </div>
  );
}

function steadyCurls(samples: FingerCurls[]): FingerCurls | null {
  if (samples.length < RECORD_MIN_SAMPLES) return null;
  const median = (key: keyof FingerCurls) => {
    const values = samples.map((sample) => sample[key]).sort((left, right) => left - right);
    const middle = Math.floor(values.length / 2);
    return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
  };
  return { thumb: median("thumb"), index: median("index"), middle: median("middle"), ring: median("ring"), little: median("little") };
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function permissionLabel(permission: CameraPermission | null): string {
  if (!permission) return "未要求";
  if (permission.status === "denied") return "Denied";
  if (permission.status === "restricted") return "Restricted";
  return "未要求";
}

function previewNote(enabled: boolean, granted: boolean, phase: GestureRecognitionPhase): string {
  if (!enabled) return "ジェスチャー操作を有効にする";
  if (!granted) return "カメラへのアクセスを許可";
  return recognitionLabel(phase);
}

function recognitionLabel(phase: GestureRecognitionPhase): string {
  if (phase === "requesting") return "Requesting camera";
  if (phase === "loading") return "Loading recognition";
  if (phase === "running") return "Camera active";
  if (phase === "denied") return "Permission denied";
  if (phase === "error") return "利用できません";
  return "オフ";
}

function poseLabel(pose: string): string {
  if (pose === "open_palm") return "手のひらを開く";
  if (pose === "left_click") return "指を曲げる";
  if (pose === "mission_control") return "Two fingers";
  if (pose === "fist") return "握りこぶし";
  if (pose === "pinch") return "Pinch";
  if (pose === "aim") return "Aim";
  return "No hand";
}
