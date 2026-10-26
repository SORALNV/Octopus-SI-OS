import { settingsTargetProps } from "./settingsCatalog";
import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from "react";
import { OcButton, OcCard, OcGroup, OcSettingsRow, OcStatus, OcTextField } from "../../design-system/components";
import type { OctopusClientAccessDetails, OctopusClientAccessProfile, OctopusTouchIdStatus } from "../../electron";
import { readClientAccessDetails, readTouchIdStatus, setTouchIdEnabled, updateClientAdministratorAccess, updateClientLabAccess } from "../../clientAccess";
import {
  clearClientProfileStorageWithRecovery,
  clientProfileOwnsStorageKey,
  clientProfileStorageEntries,
  replaceClientProfileStorageWithRecovery,
} from "../../clientLocalDataRecovery";
import { useAppErrorToast } from "../../toasts";
import { SettingsHeading } from "./SettingsHeading";
import { SavedPermissionsSection } from "./SavedPermissionsSection";

export function AccessSection({ accessProfile }: { accessProfile: OctopusClientAccessProfile }) {
  const [details, setDetails] = useState<OctopusClientAccessDetails | null>(null);
  const [currentAdministratorPassword, setCurrentAdministratorPassword] = useState("");
  const [administratorPassword, setAdministratorPassword] = useState("");
  const [administratorConfirmation, setAdministratorConfirmation] = useState("");
  const [testPassword, setTestPassword] = useState("");
  const [testConfirmation, setTestConfirmation] = useState("");
  const [administratorState, setAdministratorState] = useState<"idle" | "saving" | "saved">("idle");
  const [testState, setTestState] = useState<"idle" | "saving" | "saved">("idle");
  const [touchId, setTouchId] = useState<OctopusTouchIdStatus | null>(null);
  const [touchIdBusy, setTouchIdBusy] = useState(false);
  const [error, setError] = useState("");
  const [clearLocalState, setClearLocalState] = useState<"idle" | "confirm" | "clearing" | "error">("idle");
  const [exportState, setExportState] = useState<"idle" | "exported" | "error">("idle");
  const [importState, setImportState] = useState<"idle" | "reading" | "confirm" | "importing" | "error">("idle");
  const [pendingImport, setPendingImport] = useState<Array<[string, string]>>([]);
  const importInputRef = useRef<HTMLInputElement>(null);
  useAppErrorToast(error);

  useEffect(() => {
    let cancelled = false;
    readClientAccessDetails()
      .then((value) => {
        if (!cancelled) setDetails(value);
      })
      .catch((failure) => {
        if (!cancelled) {
          setTouchId({ available: false, enrolled: false, prompted: false });
          setError(failure instanceof Error ? failure.message : String(failure));
        }
      });
    return () => { cancelled = true; };
  }, [accessProfile]);

  useEffect(() => {
    if (accessProfile !== "live") return;
    let cancelled = false;
    readTouchIdStatus()
      .then((value) => {
        if (!cancelled) setTouchId(value);
      })
      .catch((failure) => {
        if (!cancelled) setError(failure instanceof Error ? failure.message : String(failure));
      });
    return () => { cancelled = true; };
  }, [accessProfile]);

  const minimumLength = details?.minimumLength ?? 8;
  const administratorManagedByEnvironment = details?.administrator.source === "environment";
  const testManagedByEnvironment = details?.test.source === "environment";

  async function saveAdministratorPassword() {
    setError("");
    if (administratorPassword !== administratorConfirmation) {
      setError("Administrator password confirmation does not match.");
      return;
    }
    setAdministratorState("saving");
    try {
      const next = await updateClientAdministratorAccess({
        currentPassword: currentAdministratorPassword,
        password: administratorPassword,
      });
      setDetails(next);
      setCurrentAdministratorPassword("");
      setAdministratorPassword("");
      setAdministratorConfirmation("");
      setAdministratorState("saved");
      setTouchId((current) => current ? { ...current, enrolled: false } : current);
    } catch (failure) {
      setAdministratorState("idle");
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  }

  async function saveTestPassword() {
    setError("");
    if (testPassword !== testConfirmation) {
      setError("Test password confirmation does not match.");
      return;
    }
    setTestState("saving");
    try {
      await updateClientLabAccess(testPassword);
      setDetails(await readClientAccessDetails());
      setTestPassword("");
      setTestConfirmation("");
      setTestState("saved");
    } catch (failure) {
      setTestState("idle");
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  }

  async function updateTouchId(enabled: boolean) {
    if (touchIdBusy) return;
    setError("");
    setTouchIdBusy(true);
    try {
      setTouchId(await setTouchIdEnabled(enabled));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setTouchIdBusy(false);
    }
  }

  async function exportLocalSettings() {
    try {
      const settings = Object.fromEntries(clientProfileStorageEntries(accessProfile));
      const payload = JSON.stringify({
        schema: "octopus.client_settings_export",
        schema_version: 1,
        profile: accessProfile,
        exported_at: new Date().toISOString(),
        settings,
      }, null, 2);
      const result = await window.octopusTransport?.saveClientFile({
        bytes: new TextEncoder().encode(payload),
        filename: `octopus-${accessProfile === "live" ? "administrator" : "test"}-settings.json`,
      });
      if (!result) throw new Error("Native file saving is unavailable.");
      if (!result.saved) return;
      setExportState("exported");
      window.setTimeout(() => setExportState("idle"), 1_500);
    } catch {
      setExportState("error");
    }
  }

  function clearLocalSettings() {
    if (clearLocalState !== "confirm") {
      setClearLocalState("confirm");
      return;
    }
    setClearLocalState("clearing");
    try {
      clearClientProfileStorageWithRecovery(accessProfile);
    } catch {
      setClearLocalState("error");
    }
  }

  async function chooseSettingsImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setImportState("reading");
    setPendingImport([]);
    setError("");
    try {
      if (file.size <= 0 || file.size > 4 * 1024 * 1024) throw new Error("Settings import must be a JSON file smaller than 4 MB.");
      const entries = parseClientSettingsImport(await file.text(), accessProfile);
      setPendingImport(entries);
      setImportState("confirm");
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : String(failure);
      setImportState("error");
      setError(message);
    }
  }

  function applySettingsImport() {
    if (importState !== "confirm" || pendingImport.length === 0) return;
    setImportState("importing");
    try {
      replaceClientProfileStorageWithRecovery(
        accessProfile,
        pendingImport,
        "merge",
        "Local settings imported",
      );
    } catch (failure) {
      setImportState("error");
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  }

  if (accessProfile === "lab") {
    return (
      <section className="settings-section">
        <SettingsHeading
          description="テスト用プロフィールはローカルのサンプルデータだけを扱い、実際の実行基盤、レジストリ、台帳、ファイル、接続先への権限を持ちません。"
          title="アクセスとプライバシー"
        />
        <OcGroup title="現在のプロフィール" description="各プロフィールの認証情報を変更できるのは管理者のみです。">
          <OcCard>
            <OcSettingsRow {...settingsTargetProps("access.test")}
              control={<OcStatus label="分離済み" tone="success" />}
              description="アクセスを管理するには、ログアウトして管理者パスワードでロックを解除してください。"
              label="テスト"
            />
          </OcCard>
        </OcGroup>
        <OcGroup title="ローカルデータ" description="テスト用の設定と下書きは、管理者のデータから分離されています。">
          <OcCard>
            <LocalDataRows
              clearState={clearLocalState}
              exportState={exportState}
              importCount={pendingImport.length}
              importInputRef={importInputRef}
              importState={importState}
              onApplyImport={applySettingsImport}
              onCancelClear={() => setClearLocalState("idle")}
              onCancelImport={() => { setPendingImport([]); setImportState("idle"); }}
              onChooseImport={chooseSettingsImport}
              onClear={clearLocalSettings}
              onExport={exportLocalSettings}
            />
          </OcCard>
        </OcGroup>
      </section>
    );
  }

  return (
    <section className="settings-section">
      <SettingsHeading
        description="認証情報とプライバシー設定はこのデバイスにのみ保存されます。分離されたテスト用プロフィールは管理者が管理します。"
        title="アクセスとプライバシー"
      />

      <SavedPermissionsSection />

      <OcGroup
        title="管理者"
        description={administratorManagedByEnvironment
          ? "通常のホームの .env ファイルから読み込んでいます。変更するにはそのファイルを編集し、アプリを再起動してください。"
          : "このパスワードを変更すると、このデバイスの他の管理者セッションはすべて無効になります。"}
      >
        <OcCard>
          <div {...settingsTargetProps("access.administrator")} className="settings-access-editor">
            <div className="settings-access-fields">
              <OcTextField
                autoComplete="current-password"
                disabled={administratorManagedByEnvironment}
                label="現在のパスワード"
                onChange={(event) => {
                  setCurrentAdministratorPassword(event.currentTarget.value);
                  setAdministratorState("idle");
                  setError("");
                }}
                showLabel
                type="password"
                value={currentAdministratorPassword}
              />
              <OcTextField
                autoComplete="new-password"
                disabled={administratorManagedByEnvironment}
                label="新しいパスワード"
                onChange={(event) => {
                  setAdministratorPassword(event.currentTarget.value);
                  setAdministratorState("idle");
                  setError("");
                }}
                placeholder={`最小 ${minimumLength} 文字`}
                showLabel
                type="password"
                value={administratorPassword}
              />
              <OcTextField
                autoComplete="new-password"
                disabled={administratorManagedByEnvironment}
                error={administratorConfirmation && administratorConfirmation !== administratorPassword ? "Passwords do not match" : undefined}
                label="新しいパスワードを再入力"
                onChange={(event) => {
                  setAdministratorConfirmation(event.currentTarget.value);
                  setAdministratorState("idle");
                  setError("");
                }}
                showLabel
                type="password"
                value={administratorConfirmation}
              />
            </div>
            <div className="settings-endpoint-actions">
              {administratorManagedByEnvironment ? <OcStatus label=".env で管理" tone="neutral" /> : null}
              {details?.administrator.updatedAt ? <OcStatus label="更新履歴あり" tone="muted" /> : null}
              {administratorState === "saved" ? <OcStatus label="更新済み" tone="success" /> : null}
              <OcButton
                disabled={
                  administratorManagedByEnvironment
                  || administratorState === "saving"
                  || !currentAdministratorPassword
                  || administratorPassword.length < minimumLength
                  || administratorPassword !== administratorConfirmation
                }
                onClick={() => void saveAdministratorPassword()}
                variant="primary"
              >
                管理者パスワードを変更
              </OcButton>
            </div>
          </div>
          {accessProfile === "live" ? (
            <OcSettingsRow {...settingsTargetProps("access.touch-id")}
              className="border-t border-token-border"
              control={(
                <div className="settings-inline-actions">
                  <OcStatus
                    label={!touchId ? "確認しています…" : touchId.enrolled ? "有効" : touchId.available ? "オフ" : "利用できません"}
                    tone={touchId?.enrolled ? "success" : "muted"}
                  />
                  {touchId?.available ? (
                    <OcButton
                      disabled={touchIdBusy}
                      onClick={() => void updateTouchId(!touchId.enrolled)}
                      variant="secondary"
                    >
                      {touchIdBusy ? "更新しています…" : touchId.enrolled ? "オフにする" : "有効にする"}
                    </OcButton>
                  ) : null}
                </div>
              )}
              description="管理者パスワードの設定後、この Mac の Touch ID を使えます。パスワードでも引き続き解除できます。"
              label="Touch ID"
            />
          ) : null}
        </OcCard>
      </OcGroup>

      <OcGroup
        title="テスト"
        description="テストではサンプルデータと実験的な画面のみを開けます。実際の実行基盤、レジストリ、台帳、ファイル、接続先、インストール済みの通常画面のデータは読み取れません。"
      >
        <OcCard>
          <div {...settingsTargetProps("access.test")} className="settings-access-editor">
            <div className="settings-access-fields is-two-column">
              <OcTextField
                autoComplete="new-password"
                disabled={testManagedByEnvironment}
                label="新しいテスト用パスワード"
                onChange={(event) => {
                  setTestPassword(event.currentTarget.value);
                  setTestState("idle");
                  setError("");
                }}
                placeholder={`最小 ${minimumLength} 文字`}
                showLabel
                type="password"
                value={testPassword}
              />
              <OcTextField
                autoComplete="new-password"
                disabled={testManagedByEnvironment}
                error={testConfirmation && testConfirmation !== testPassword ? "Passwords do not match" : undefined}
                label="テスト用パスワードを再入力"
                onChange={(event) => {
                  setTestConfirmation(event.currentTarget.value);
                  setTestState("idle");
                  setError("");
                }}
                showLabel
                type="password"
                value={testConfirmation}
              />
            </div>
            <div className="settings-endpoint-actions">
              {details?.test.source ? <OcStatus label={`継承元： ${details.test.source}`} tone="muted" /> : null}
              {testState === "saved" ? <OcStatus label="更新済み" tone="success" /> : null}
              <OcButton
                disabled={testManagedByEnvironment || testState === "saving" || testPassword.length < minimumLength || testPassword !== testConfirmation}
                onClick={() => void saveTestPassword()}
                variant="primary"
              >
                テスト用パスワードを変更
              </OcButton>
            </div>
          </div>
        </OcCard>
      </OcGroup>

      <OcGroup title="プライバシー" description="デスクトップの権限と、ローカルに保存されたアプリのデータです。">
        <OcCard>
          <PermissionRows />
          <OcSettingsRow {...settingsTargetProps("access.recordings")}
            control={<OcStatus label="成果物の規則に従う" tone="neutral" />}
            description="音声は許可された成果物ファイルとして扱います。会話記録は実行の証跡として保持され、ローカルの音声入力履歴はプロフィールごとに管理されます。"
            label="録音と文字起こし"
          />
          <LocalDataRows
            clearState={clearLocalState}
            exportState={exportState}
            importCount={pendingImport.length}
            importInputRef={importInputRef}
            importState={importState}
            onApplyImport={applySettingsImport}
            onCancelClear={() => setClearLocalState("idle")}
            onCancelImport={() => { setPendingImport([]); setImportState("idle"); }}
            onChooseImport={chooseSettingsImport}
            onClear={clearLocalSettings}
            onExport={exportLocalSettings}
          />
        </OcCard>
      </OcGroup>
    </section>
  );
}

function LocalDataRows({
  clearState,
  exportState,
  importCount,
  importInputRef,
  importState,
  onApplyImport,
  onCancelClear,
  onCancelImport,
  onChooseImport,
  onClear,
  onExport,
}: {
  clearState: "idle" | "confirm" | "clearing" | "error";
  exportState: "idle" | "exported" | "error";
  importCount: number;
  importInputRef: RefObject<HTMLInputElement | null>;
  importState: "idle" | "reading" | "confirm" | "importing" | "error";
  onApplyImport: () => void;
  onCancelClear: () => void;
  onCancelImport: () => void;
  onChooseImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onExport: () => void;
}) {
  return (
    <>
      <OcSettingsRow {...settingsTargetProps("access.clear")}
        control={(
          <div className="settings-inline-actions">
            {clearState === "confirm" ? <OcStatus label="確認が必要" tone="warning" /> : null}
            {clearState === "error" ? <OcStatus label="消去できませんでした" tone="danger" /> : null}
            <OcButton
              disabled={clearState === "clearing"}
              onClick={onClear}
              tone={clearState === "confirm" ? "danger" : "neutral"}
              variant={clearState === "confirm" ? "primary" : "secondary"}
            >
              {clearState === "confirm" ? "消去を確認" : clearState === "clearing" ? "消去しています…" : "データを消去"}
            </OcButton>
            {clearState === "confirm" ? <OcButton onClick={onCancelClear} variant="ghost">キャンセル</OcButton> : null}
          </div>
        )}
        description="このプロフィールのローカル設定、レイアウト、下書き、テストデータを削除します。実行記録は変更しません。"
        label="アプリのローカルデータを消去"
      />
      <OcSettingsRow {...settingsTargetProps("access.export")}
        control={(
          <div className="settings-inline-actions">
            {exportState === "exported" ? <OcStatus label="書き出しました" tone="success" /> : null}
            {exportState === "error" ? <OcStatus label="書き出しに失敗しました" tone="danger" /> : null}
            <OcButton onClick={onExport} variant="secondary">書き出す</OcButton>
          </div>
        )}
        description="このプロフィールのローカル設定を、バージョン情報付きの JSON ファイルに書き出します。認証情報と実行記録は含みません。"
        label="ローカル設定を書き出す"
      />
      <OcSettingsRow {...settingsTargetProps("access.import")}
        control={(
          <div className="settings-inline-actions">
            <input
              accept="application/json,.json"
              aria-label="設定ファイルを選択"
              className="sr-only"
              onChange={onChooseImport}
              ref={importInputRef}
              type="file"
            />
            {importState === "confirm" ? <OcStatus label={`${importCount} ready`} tone="warning" /> : null}
            {importState === "error" ? <OcStatus label="読み込みを拒否しました" tone="danger" /> : null}
            {importState === "confirm" ? (
              <>
                <OcButton onClick={onApplyImport}>適用して再読み込み</OcButton>
                <OcButton onClick={onCancelImport} variant="ghost">キャンセル</OcButton>
              </>
            ) : (
              <OcButton
                disabled={importState === "reading" || importState === "importing"}
                onClick={() => importInputRef.current?.click()}
                variant="secondary"
              >
                {importState === "reading" ? "読み込んでいます…" : importState === "importing" ? "読み込んでいます…" : "ファイルを選択"}
              </OcButton>
            )}
          </div>
        )}
        description="このプロフィールから書き出した設定だけを統合し、アプリを再読み込みします。不明な名前空間や不正な値は受け付けません。"
        label="ローカル設定を読み込む"
      />
    </>
  );
}

function PermissionRows() {
  const [camera, setCamera] = useState<{ granted: boolean; status: string } | null>(null);
  const [microphone, setMicrophone] = useState<{ granted: boolean; status: string } | null>(null);
  const [permissionError, setPermissionError] = useState("");
  useAppErrorToast(permissionError);

  useEffect(() => {
    let cancelled = false;
    window.octopusTransport?.cameraAccessStatus?.()
      .then((status) => {
        if (!cancelled) setCamera(status);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  async function requestCamera() {
    setPermissionError("");
    try {
      const status = await window.octopusTransport?.requestCameraAccess?.();
      if (status) setCamera(status);
    } catch (error) {
      setPermissionError(error instanceof Error ? error.message : String(error));
    }
  }

  async function requestMicrophone() {
    setPermissionError("");
    try {
      const status = await window.octopusTransport?.requestMicrophoneAccess?.();
      if (status) setMicrophone(status);
    } catch (error) {
      setPermissionError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <>
      <OcSettingsRow {...settingsTargetProps("access.camera")}
        control={(
          <div className="settings-inline-actions">
            <OcStatus
              label={camera ? (camera.granted ? "許可済み" : camera.status) : "未要求"}
              tone={camera?.granted ? "success" : "muted"}
            />
            {!camera?.granted ? <OcButton onClick={() => void requestCamera()}>要求</OcButton> : null}
          </div>
        )}
        description="ジェスチャー操作やカメラを使う画面で使用します。"
        label="カメラ"
      />
      <OcSettingsRow {...settingsTargetProps("access.microphone")}
        control={(
          <div className="settings-inline-actions">
            <OcStatus
              label={microphone ? (microphone.granted ? "許可済み" : microphone.status) : "未要求"}
              tone={microphone?.granted ? "success" : "muted"}
            />
            {!microphone?.granted ? <OcButton onClick={() => void requestMicrophone()}>要求</OcButton> : null}
          </div>
        )}
        description="音声入力と音声通話で使用します。"
        label="マイク"
      />
    </>
  );
}

function parseClientSettingsImport(source: string, accessProfile: OctopusClientAccessProfile): Array<[string, string]> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error("Settings import is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Settings import must be a JSON object.");
  const document = parsed as Record<string, unknown>;
  if (document.schema !== "octopus.client_settings_export" || document.schema_version !== 1) {
    throw new Error("Settings import does not satisfy octopus.client_settings_export@1.");
  }
  if (document.profile !== accessProfile) {
    throw new Error(`This export belongs to the ${document.profile === "lab" ? "Test" : "Administrator"} profile.`);
  }
  const settings = document.settings;
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) throw new Error("Settings import has no settings object.");
  const entries = Object.entries(settings);
  if (entries.length === 0 || entries.length > 500) throw new Error("Settings import must contain between 1 and 500 entries.");
  return entries.map(([key, value]) => {
    if (key.length > 256 || !clientProfileOwnsStorageKey(key, accessProfile)) {
      throw new Error(`Settings key is outside the ${accessProfile === "lab" ? "Test" : "Administrator"} profile: ${key.slice(0, 80)}`);
    }
    if (typeof value !== "string" || value.length > 1_000_000) throw new Error(`Settings value is invalid for ${key}.`);
    return [key, value];
  });
}
