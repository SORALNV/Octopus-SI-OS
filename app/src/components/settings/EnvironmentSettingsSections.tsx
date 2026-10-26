import { settingsTargetProps } from "./settingsCatalog";
import { useClientPreferences, useSetClientPreferences, type WorkerEnvironmentDefaultPanel } from "../../clientPreferences";
import { OcCard, OcGroup, OcSelect, OcSettingsRow, OcStatus, OcSwitch } from "../../design-system/components";
import type { OctopusClientAccessProfile } from "../../electron";
import { SettingsHeading } from "./SettingsHeading";
import { GestureManager } from "./GestureManager";

export function GesturesSection({ accessProfile }: { accessProfile: OctopusClientAccessProfile }) {
  return (
    <section {...settingsTargetProps("gestures.controls")} className="settings-section">
      <SettingsHeading
        description="カメラを使ったジェスチャー操作です。映像はローカルで処理され、このデバイスの外には送信されません。"
        title="ジェスチャー"
      />
      <GestureManager accessProfile={accessProfile} />
    </section>
  );
}

export function WorkerEnvironmentSettingsSection() {
  const preferences = useClientPreferences();
  const setClientPreferences = useSetClientPreferences();
  return (
    <section className="settings-section">
      <SettingsHeading
        description="ブラウザー、レビュー、デスクトップ、カスタム画面を、共通の作業環境ビューアーで開く方法を設定します。"
        title="作業環境"
      />

      <OcGroup title="ビューアー" description="ローカルのタブとプレビューの動作を設定します。作業環境の起動・終了状況は読み取り専用です。">
        <OcCard>
          <OcSettingsRow {...settingsTargetProps("worker-environments.default")}
            control={(
              <OcSelect<WorkerEnvironmentDefaultPanel>
                label="既定の画面"
                onChange={(workerEnvironmentDefaultPanel) => setClientPreferences({ workerEnvironmentDefaultPanel })}
                options={[
                  { value: "auto", label: "最適な画面" },
                  { value: "browser", label: "ブラウザー" },
                  { value: "changes", label: "変更" },
                ]}
                value={preferences.workerEnvironmentDefaultPanel}
              />
            )}
            description="保存済みのレイアウトやリンクによるタブ指定がない場合に使います。"
            label="既定の画面"
          />
          <OcSettingsRow {...settingsTargetProps("worker-environments.restore")}
            control={(
              <OcSwitch
                checked={preferences.restoreWorkerEnvironmentLayouts}
                label="タブとレイアウトを復元"
                onCheckedChange={(restoreWorkerEnvironmentLayouts) => setClientPreferences({ restoreWorkerEnvironmentLayouts })}
              />
            )}
            description="作業環境ごとに、開いているタブ、選択中のタブ、プレビュー、並び順、PR の分割幅を記憶します。"
            label="タブとレイアウトを復元"
          />
          <OcSettingsRow {...settingsTargetProps("worker-environments.preview")}
            control={(
              <OcSwitch
                checked={preferences.previewWorkerEnvironmentFiles}
                label="シングルクリックでファイルをプレビュー"
                onCheckedChange={(previewWorkerEnvironmentFiles) => setClientPreferences({ previewWorkerEnvironmentFiles })}
              />
            )}
            description="シングルクリックでは斜体のプレビュータブを再利用し、ダブルクリックではファイルを固定タブにします。"
            label="ファイルのプレビュータブ"
          />
        </OcCard>
      </OcGroup>

      <OcGroup title="安全性" description="リアルタイムの操作は、対象画面の記述子で許可された範囲に限られます。">
        <OcCard>
          <OcSettingsRow {...settingsTargetProps("worker-environments.browser-control")}
            control={<OcStatus label="毎回確認" tone="success" />}
            description="CDP によるブラウザー操作には、リアルタイムの画面を開くたびに確認が必要です。"
            label="ブラウザーの手動操作"
          />
          <OcSettingsRow {...settingsTargetProps("worker-environments.direct-viewers")}
            control={<OcStatus label="記述子の範囲内" tone="success" />}
            description="ファイルの読み取り、ターミナル接続、デスクトップ表示は、選択中の作業環境で許可されたものに限られます。"
            label="直接表示"
          />
        </OcCard>
      </OcGroup>
    </section>
  );
}
