import { settingsTargetProps } from "./settingsCatalog";
import { useEffect, useState } from "react";
import { useClientPreferences, useSetClientPreferences, type ClientPreferences, type NotificationSound } from "../../clientPreferences";
import { OcButton, OcCard, OcGroup, OcSelect, OcSettingsRow, OcStatus, OcSwitch, type OcTone } from "../../design-system/components";
import { useAppErrorToast } from "../../toasts";
import { SettingsHeading } from "./SettingsHeading";

export function MarkActivitySettingsRow() {
  const preferences = useClientPreferences();
  const setClientPreferences = useSetClientPreferences();
  return (
    <OcSettingsRow {...settingsTargetProps("notifications.mark-activity")}
      control={(
        <OcSelect<ClientPreferences["markNotifications"]>
          label="受信トレイの通知"
          onChange={(markNotifications) => setClientPreferences({ markNotifications })}
          options={[
            { value: "never", label: "通知しない" },
            { value: "unfocused", label: "ウィンドウが非アクティブのときのみ" },
            { value: "always", label: "常に通知" },
          ]}
          value={preferences.markNotifications}
        />
      )}
      description="受信トレイで選んだ新着メッセージ、リクエスト、検証記録を通知します。"
      label="受信トレイの通知"
    />
  );
}

export function NotificationSoundSettingsRow() {
  const preferences = useClientPreferences();
  const setClientPreferences = useSetClientPreferences();
  return (
    <OcSettingsRow {...settingsTargetProps("notifications.sound")}
      control={(
        <OcSelect<NotificationSound>
          label="通知音"
          onChange={(notificationSound) => setClientPreferences({ notificationSound })}
          options={[
            { value: "system", label: "システムの既定値" },
            { value: "silent", label: "サイレント" },
          ]}
          value={preferences.notificationSound}
        />
      )}
      description="デスクトップ通知と一緒に鳴らす音です。"
      label="音"
    />
  );
}

export function NotificationsSection() {
  const preferences = useClientPreferences();
  const setClientPreferences = useSetClientPreferences();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(readNotificationPermission);
  const [notificationError, setNotificationError] = useState("");
  useAppErrorToast(notificationError);

  useEffect(() => {
    function refreshPermission() {
      setPermission(readNotificationPermission());
    }
    window.addEventListener("focus", refreshPermission);
    return () => window.removeEventListener("focus", refreshPermission);
  }, []);

  async function requestNotificationPermission() {
    setNotificationError("");
    try {
      if (!("Notification" in window)) throw new Error("Desktop notifications are unavailable in this environment.");
      const next = await Notification.requestPermission();
      setPermission(next);
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section className="settings-section">
      <SettingsHeading
        description="実行やインターフェースの動作をデスクトップで通知する条件です。"
        title="通知"
      />

      <OcGroup title="実行" description="このデバイスでのチャットの作業に関する通知です。">
        <OcCard>
          <MarkActivitySettingsRow />
          <OcSettingsRow {...settingsTargetProps("notifications.operator-input")}
            control={(
              <OcSwitch
                checked={preferences.notifyOperatorInputRequired}
                label="ユーザーの入力が必要"
                onCheckedChange={(notifyOperatorInputRequired) => setClientPreferences({ notifyOperatorInputRequired })}
              />
            )}
            description="ユーザーへのリクエストで実行が一時停止したときに通知します。"
            label="ユーザーの入力が必要"
          />
          <OcSettingsRow {...settingsTargetProps("notifications.blocked")}
            control={(
              <OcSwitch
                checked={preferences.notifyBlockedOrDeliveryFailed}
                label="処理の停止・配信の失敗"
                onCheckedChange={(notifyBlockedOrDeliveryFailed) => setClientPreferences({ notifyBlockedOrDeliveryFailed })}
              />
            )}
            description="成果物の提出が拒否されたときや、チェックポイントで実行が停止したときに通知します。"
            label="処理の停止・配信の失敗"
          />
        </OcCard>
      </OcGroup>

      <OcGroup title="システム" description="作業環境とホームの音声通話に関するイベントです。">
        <OcCard>
          <OcSettingsRow {...settingsTargetProps("notifications.worker-environment")}
            control={(
              <OcSwitch
                checked={preferences.notifyWorkerEnvironmentDisconnected}
                label="作業環境が切断されたとき"
                onCheckedChange={(notifyWorkerEnvironmentDisconnected) => setClientPreferences({ notifyWorkerEnvironmentDisconnected })}
              />
            )}
            description="接続している作業環境の情報を取得できなくなったときに通知します。"
            label="作業環境が切断されたとき"
          />
          <OcSettingsRow {...settingsTargetProps("notifications.home-voice")}
            control={(
              <OcSwitch
                checked={preferences.notifyVoiceSession}
                label="ホームの音声通話"
                onCheckedChange={(notifyVoiceSession) => setClientPreferences({ notifyVoiceSession })}
              />
            )}
            description="ウィンドウが非アクティブの間にホームの音声通話が終了したときに通知します。"
            label="ホームの音声通話"
          />
          <NotificationSoundSettingsRow />
          <OcSettingsRow {...settingsTargetProps("notifications.permission")}
            control={(
              <div className="settings-inline-actions">
                <OcStatus
                  label={notificationPermissionLabel(permission)}
                  tone={notificationPermissionTone(permission)}
                />
                {permission === "default" ? (
                  <OcButton onClick={() => void requestNotificationPermission()}>許可</OcButton>
                ) : null}
              </div>
            )}
            description={notificationPermissionDescription(permission)}
            label="システムの権限"
          />
        </OcCard>
      </OcGroup>
    </section>
  );
}

function readNotificationPermission(): NotificationPermission | "unsupported" {
  return "Notification" in window ? Notification.permission : "unsupported";
}

function notificationPermissionLabel(permission: NotificationPermission | "unsupported"): string {
  if (permission === "granted") return "許可済み";
  if (permission === "denied") return "Denied by system";
  if (permission === "default") return "未要求";
  return "利用できません";
}

function notificationPermissionTone(permission: NotificationPermission | "unsupported"): OcTone {
  if (permission === "granted") return "success";
  if (permission === "denied") return "danger";
  return "muted";
}

function notificationPermissionDescription(permission: NotificationPermission | "unsupported"): string {
  if (permission === "granted") return "The desktop is allowed to display notifications.";
  if (permission === "denied") return "macOS or the browser has denied notification permission.";
  if (permission === "default") return "Permission has not been requested from this environment yet.";
  return "This environment does not expose the Notification API.";
}
