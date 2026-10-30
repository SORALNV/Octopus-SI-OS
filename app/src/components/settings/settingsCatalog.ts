import type { HTMLAttributes } from "react";
import type { OctopusClientAccessProfile } from "../../electron";
import type { GlyphName } from "../IconGlyphs";

export type SettingsSectionId =
  | "general"
  | "account"
  | "appearance"
  | "voice-audio"
  | "computer-use"
  | "gestures"
  | "shortcuts"
  | "access"
  | "extensions"
  | "connections"
  | "surfaces"
  | "worker-environments"
  | "about"
  | "test-lab";

export type SettingsSectionGroup = "Personal" | "Interaction" | "Octopus" | "Test";
export type SettingsDestinationKind = "setting" | "action" | "destination";

export type SettingsDestination = {
  id: string;
  sectionId: SettingsSectionId;
  label: string;
  description: string;
  kind: SettingsDestinationKind;
  terms?: readonly string[];
  profile?: OctopusClientAccessProfile;
  targetId?: string;
};

export type SettingsSectionDefinition = {
  id: SettingsSectionId;
  label: string;
  glyph: GlyphName;
  group: SettingsSectionGroup;
  profile?: OctopusClientAccessProfile;
};

export type SettingsSearchResult = {
  destination: SettingsDestination;
  section: SettingsSectionDefinition;
  score: number;
};

export type SettingsTargetAttributes = HTMLAttributes<HTMLElement> & {
  "data-settings-target": string;
};

export const SETTINGS_SECTION_GROUPS: readonly SettingsSectionGroup[] = ["Personal", "Interaction", "Octopus", "Test"];

export const SETTINGS_SECTIONS: readonly SettingsSectionDefinition[] = [
  { id: "general", label: "一般", glyph: "settings", group: "Personal" },
  { id: "account", label: "アカウント", glyph: "user", group: "Personal", profile: "live" },
  { id: "appearance", label: "外観", glyph: "sun", group: "Personal" },
  { id: "voice-audio", label: "音声", glyph: "microphone", group: "Interaction" },
  { id: "computer-use", label: "コンピューター操作", glyph: "desktop", group: "Interaction", profile: "live" },
  { id: "gestures", label: "ジェスチャー", glyph: "hand", group: "Interaction" },
  { id: "shortcuts", label: "キーボードショートカット", glyph: "keyboard", group: "Interaction" },
  { id: "access", label: "アクセスとプライバシー", glyph: "dataControls", group: "Octopus" },
  { id: "extensions", label: "拡張機能", glyph: "widgets", group: "Octopus" },
  { id: "connections", label: "接続", glyph: "interfaces", group: "Octopus", profile: "live" },
  { id: "surfaces", label: "画面", glyph: "descriptor", group: "Octopus" },
  { id: "worker-environments", label: "作業環境", glyph: "ee", group: "Octopus" },
  { id: "about", label: "アプリ情報と診断", glyph: "bug", group: "Octopus" },
  { id: "test-lab", label: "テストラボ", glyph: "flask", group: "Test", profile: "lab" },
];

export const SETTINGS_DESTINATIONS: readonly SettingsDestination[] = [
  destination("account.identity", "account", "ChatGPT account", "アカウントのメールアドレスと契約プランを確認します。", "destination", ["identity", "email", "subscription", "plan"], "live"),
  destination("account.usage", "account", "Usage limits", "残りの使用枠、クレジット、上限のリセット日時を確認します。", "destination", ["rate limits", "weekly", "5-hour", "credits"], "live"),
  destination("account.logout", "account", "ChatGPT からログアウト", "共有しているアカウントからログアウトします。続けて使うには再ログインが必要です。", "action", ["sign out", "sign in", "login"], "live"),
  destination("general.first-surface", "general", "First surface", "Octopus の起動時に開く画面を選びます。", "setting", ["launch", "startup", "open"]),
  destination("general.internal-runs", "general", "内部の実行", "対応するアプリ用インターフェースのない、読み取り専用の実行も表示します。", "setting", ["show internal runs"]),
  destination("general.task-pane-width", "general", "タスクペインの幅", "タスクの補助ペインの既定の幅を設定します。", "setting", ["split", "resize"]),
  destination("general.send-shortcut", "general", "送信のショートカット", "Enter で送信する条件と、改行する条件を選びます。", "setting", ["composer", "enter"]),
  destination("general.spell-check", "general", "スペルチェック", "タスクの入力欄で OS の辞書を使います。", "setting", ["composer", "dictionary"]),
  destination("general.active-reply", "general", "実行中の送信", "追加の指示をすぐに送信します。送信ボタンの右クリックやショートカットで送信待ちにもできます。", "setting", ["steer", "queue", "follow-up"]),
  destination("general.work-mode", "general", "作業モード", "タスクのチャットに表示する動作履歴の詳しさを選びます。", "setting", ["technical detail", "reasoning", "tools"]),
  destination("general.provider", "general", "プロバイダー", "新しいタスクで既定で使うプロバイダーのインターフェースを選びます。", "setting", ["model", "codex", "interface"]),
  destination("general.on-launch", "general", "起動時", "アプリを開くときに、最後に使った画面を復元します。", "destination", ["startup"]),
  destination("general.open-at-login", "general", "ログイン時に起動", "OS にログインした後、Octopus のアプリを起動します。", "setting", ["startup", "macos"]),
  destination("general.keep-awake", "general", "スリープを防止", "実行中にデバイスがスリープするのを防ぎます。", "setting", ["sleep", "run"]),
  destination("notifications.mark-activity", "general", "受信トレイの通知", "受信トレイで選んだ新着メッセージ、リクエスト、検証記録を通知します。", "setting", ["notifications", "messages", "requests", "marks", "worker", "unfocused"]),
  destination("notifications.sound", "general", "通知音", "デスクトップ通知で鳴らす音を選びます。", "setting", ["system", "silent", "activity"]),

  destination("appearance.theme", "appearance", "テーマ", "システム設定に合わせるか、ライトまたはダーク表示を選び、配色を編集します。", "setting", ["accent", "background", "foreground", "contrast"]),
  destination("appearance.preferences", "appearance", "表示の設定", "動き、表示の密度、フォント、差分の色、サイドバーの透過を設定します。", "setting", ["font", "motion", "density", "translucent", "diff"], undefined, "appearance.theme"),
  destination("appearance.transfer", "appearance", "テーマをコピー・読み込み", "テーマの設定を別のアプリ環境に移します。", "action", ["export", "share"], undefined, "appearance.theme"),

  destination("voice.microphone", "voice-audio", "マイク", "音声入力と通話に使うデバイスを選びます。", "setting", ["input", "recording"]),
  destination("voice.speaker", "voice-audio", "スピーカー", "音声での返答や音声ファイルの再生に使うデバイスを選びます。", "setting", ["output", "playback"]),
  destination("voice.agent-voice", "voice-audio", "エージェントの声", "音声インターフェースで使える声を確認します。", "destination", ["tts", "speech"]),
  destination("voice.transcription-provider", "voice-audio", "文字起こしのプロバイダー", "アプリの音声入力に使うプロバイダーを選びます。", "setting", ["speech to text", "codex"]),
  destination("voice.toggle-dictation", "voice-audio", "音声入力を切り替え", "音声入力を開始・停止するショートカットを確認します。", "action", ["shortcut", "microphone"]),
  destination("voice.global-dictation", "voice-audio", "どこからでも音声入力", "入力欄を開いて音声入力を開始する、デスクトップのショートカットを有効にします。", "setting", ["hotkey"]),
  destination("voice.hold-dictate", "voice-audio", "長押しで音声入力", "入力欄の音声入力ボタンの動作を確認します。", "destination", ["microphone"]),
  destination("voice.dictionary", "voice-audio", "音声入力の辞書", "文字起こしを入力欄に挿入する前に適用する、置換ルールを追加します。", "setting", ["phrase", "replacement"]),
  destination("voice.floating-call", "voice-audio", "フローティング通話ウィジェット", "ホームを離れても通話の操作画面を表示するか選びます。", "setting", ["voice", "home"]),
  destination("voice.incoming-audio", "voice-audio", "受信した音声の成果物", "音声画面を開いている間の、音声ファイルの扱いを選びます。", "setting", ["autoplay"]),
  destination("voice.recordings", "voice-audio", "最近の録音", "最近20件の録音をこのデバイスに保存します。", "destination", ["dictation", "history", "audio"]),

  destination("gestures.controls", "gestures", "ジェスチャー操作", "このデバイスのカメラで使う、ジェスチャーの割り当てと感度を設定します。", "setting", ["camera", "hand", "mapping", "sensitivity"]),

  destination("shortcuts.bindings", "shortcuts", "キーボードショートカットの割り当て", "アプリの操作を検索し、割り当ての編集・リセットや重複の解消を行います。", "setting", ["keys", "commands", "hotkey"]),
  destination("shortcuts.search-keys", "shortcuts", "キー操作で検索", "現在のショートカットを押して、割り当てられている操作を探します。", "action", ["key capture"], undefined, "shortcuts.bindings"),

  destination("access.administrator", "access", "管理者パスワード", "このデバイスの管理者パスワードを変更し、ほかのセッションを無効にします。", "action", ["security", "login"]),
  destination("access.touch-id", "access", "Touch ID", "この Mac で管理者としてロックを解除する Touch ID を有効・無効にします。", "action", ["security", "biometric", "fingerprint"]),
  destination("access.test", "access", "Test password", "独立したテスト用プロフィールのパスワードを設定します。", "action", ["lab", "security"]),
  destination("access.camera", "access", "カメラ", "ジェスチャーやアプリの画面で使う、カメラへのアクセス許可を確認・要求します。", "action", ["permission"]),
  destination("access.microphone", "access", "マイク", "音声入力と通話に使う、マイクへのアクセス許可を確認・要求します。", "action", ["permission"]),
  destination("access.browser-permissions", "access", "保存済みのブラウザー権限", "ファイルのアップロードや閲覧履歴に対する「常に許可」の保存内容を削除します。", "action", ["browser", "upload", "history", "approval"], "live"),
  destination("computer-use.setup", "computer-use", "コンピューター操作", "アプリへのアクセスを有効にし、macOS の権限を設定します。", "action", ["computer use", "screen recording", "accessibility", "permission"], "live"),
  destination("access.application-permissions", "computer-use", "常に許可するアプリ", "現在のコンピューター操作用の接続先で保存した「常に許可」を削除します。", "action", ["computer use", "application", "approval"], "live"),
  destination("access.clear", "access", "アプリのローカルデータを消去", "現在のプロフィールの設定、レイアウト、下書き、テストデータを削除します。", "action", ["reset", "delete"]),
  destination("access.export", "access", "ローカル設定を書き出す", "現在のプロフィールのアプリ設定を、バージョン付きの JSON で保存します。", "action", ["backup", "json"]),
  destination("access.import", "access", "ローカル設定を読み込む", "書き出した設定が現在のプロフィールに対応するか確認し、統合します。", "action", ["restore", "json"]),

  destination("extensions.catalog", "extensions", "拡張機能のカタログ", "インストール済み・利用可能なウィジェット、タブ、パネルを検索します。", "destination", ["widgets", "tabs", "panels"]),
  destination("extensions.sources", "extensions", "拡張機能のデータソース", "拡張機能でアプリが読み取るデータソースを設定します。", "setting", ["filesystem", "projection", "device"], undefined, "extensions.catalog"),
  destination("extensions.install", "extensions", "拡張機能のインストール・削除", "検出したパッケージを確認し、アプリ用のインストールを管理します。", "action", ["uninstall", "setup"], undefined, "extensions.catalog"),

  destination("connections.endpoint", "connections", "実行基盤の接続先", "チャットのデータ送信に使う接続先を確認して保存します。", "setting", ["connection", "localhost", "url"], "live"),
  destination("connections.providers", "connections", "定義済みのプロバイダーインターフェース", "このアプリに表示されているプロバイダーの定義を確認します。", "destination", ["model", "registry"], "live"),
  destination("connections.facts", "connections", "アプリの情報", "デスクトップアプリが報告したパスやプロセスの情報を確認します。", "destination", ["home", "registry", "ledger"], "live"),

  destination("surfaces.sidebar", "surfaces", "ダッシュボードのサイドバー", "組み込み・許可済みのシステム画面を表示・非表示にします。", "setting", ["navigation", "visibility"]),
  destination("surfaces.registry", "surfaces", "画面レジストリ", "利用が許可されたアプリ用文書と、その出所を確認します。", "destination", ["schema", "revision", "digest"], undefined, "surfaces.sidebar"),
  destination("surfaces.transport", "surfaces", "文書の転送", "アプリ用文書の取得に使うフォルダーや、実行基盤からの情報を確認します。", "destination", ["path", "copy"], undefined, "surfaces.sidebar"),

  destination("worker-environments.default", "worker-environments", "既定の画面", "作業環境で最初に開く画面を選びます。", "setting", ["browser", "changes"]),
  destination("worker-environments.restore", "worker-environments", "タブとレイアウトを復元", "作業環境ごとに、タブ、並び順、プレビューの状態、分割サイズを保存します。", "setting", ["persistence"]),
  destination("worker-environments.preview", "worker-environments", "ファイルのプレビュータブ", "ファイルを1回クリックしたときに、プレビュータブを再利用します。", "setting", ["single click", "pin"]),
  destination("worker-environments.browser-control", "worker-environments", "ブラウザーの手動操作", "実際のブラウザーを CDP で操作する際の確認範囲を確認します。", "destination", ["cdp", "safety"]),
  destination("worker-environments.direct-viewers", "worker-environments", "直接表示", "定義された範囲内で、ファイル、ターミナル、デスクトップの表示を確認します。", "destination", ["files", "terminal", "desktop"]),

  destination("about.update-channel", "about", "更新チャンネル", "このアプリが配布版か開発版かを確認します。", "destination", ["version", "release"]),
  destination("about.licenses", "about", "オープンソースライセンス", "アプリが使用する依存パッケージのライセンスと通知を開きます。", "action", ["dependencies", "notices"]),
  destination("about.diagnostics", "about", "診断レポート", "診断情報を確認・保存したり、GitHub で不具合を報告したりします。", "action", ["support", "debug", "help"]),
  destination("about.logs", "about", "ログ", "このデバイスに保存されるアプリのログフォルダーを開きます。", "action", ["debug", "jsonl"]),
  destination("about.welcome", "about", "初回案内", "次回の起動時に初回案内を再表示します。", "action", ["onboarding", "reset"]),

  destination("test.fixtures", "test-lab", "表示用のテストデータ", "独立したテスト用の表示データを確認します。", "destination", ["fake", "local"], "lab"),
  destination("test.widgets", "test-lab", "組み込みウィジェットの文書", "テスト用として許可されたウィジェットの文書を確認します。", "destination", ["surface"], "lab"),
  destination("test.voice", "test-lab", "音声動作のシミュレーション", "あらかじめ決められたテスト用の音声動作を確認します。", "destination", ["speaking", "thinking"], "lab"),
  destination("test.channel", "test-lab", "ラボ用チャンネル", "テスト専用のアプリ用文書の許可状態を確認します。", "destination", ["surface", "schema"], "lab"),
  destination("test.worker-environments", "test-lab", "作業環境のテストデータ", "あらかじめ決められた作業環境のテスト用データを確認します。", "destination", ["browser", "terminal", "desktop"], "lab"),
  destination("test.reset", "test-lab", "テストの状態をリセット", "テスト用のレイアウト、設定、スケジュール、ジェスチャーを消去します。", "action", ["delete", "fixtures"], "lab"),
];

const SECTION_BY_ID = new Map(SETTINGS_SECTIONS.map((section) => [section.id, section]));
const DESTINATION_BY_ID = new Map(SETTINGS_DESTINATIONS.map((destination) => [destination.id, destination]));

export function availableSettingsSections(profile: OctopusClientAccessProfile): SettingsSectionDefinition[] {
  return SETTINGS_SECTIONS.filter((section) => section.profile === undefined || section.profile === profile);
}

export function searchSettings(query: string, profile: OctopusClientAccessProfile): SettingsSearchResult[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  return SETTINGS_DESTINATIONS.flatMap((destination) => {
    if (destination.profile && destination.profile !== profile) return [];
    const section = SECTION_BY_ID.get(destination.sectionId);
    if (!section || (section.profile && section.profile !== profile)) return [];
    const label = normalize(destination.label);
    const sectionLabel = normalize(section.label);
    const body = normalize([destination.label, destination.description, section.label, ...(destination.terms ?? [])].join(" "));
    if (!tokens.every((token) => body.includes(token))) return [];
    const score = (label === normalizedQuery ? 1_000 : 0)
      + (label.startsWith(normalizedQuery) ? 500 : 0)
      + (label.includes(normalizedQuery) ? 250 : 0)
      + (sectionLabel.includes(normalizedQuery) ? 100 : 0)
      + tokens.reduce((total, token) => total + (label.includes(token) ? 20 : 5), 0);
    return [{ destination, section, score }];
  }).sort((left, right) => right.score - left.score
    || sectionOrder(left.section.id) - sectionOrder(right.section.id)
    || left.destination.label.localeCompare(right.destination.label));
}

export function settingsDestination(id: string): SettingsDestination {
  const found = DESTINATION_BY_ID.get(id);
  if (!found) throw new Error(`Unknown settings destination: ${id}`);
  return found;
}

export function settingsTargetProps(id: string): SettingsTargetAttributes {
  settingsDestination(id);
  return {
    "data-settings-target": id,
    id: settingsTargetDomId(id),
    tabIndex: -1,
  };
}

export function settingsTargetDomId(id: string): string {
  return `settings-target-${id.replace(/[^a-z0-9_-]+/gi, "-")}`;
}

function destination(
  id: string,
  sectionId: SettingsSectionId,
  label: string,
  description: string,
  kind: SettingsDestinationKind,
  terms?: readonly string[],
  profile?: OctopusClientAccessProfile,
  targetId?: string,
): SettingsDestination {
  return { id, sectionId, label, description, kind, terms, profile, targetId };
}

function normalize(value: string): string {
  return value.normalize("NFKD").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function sectionOrder(id: SettingsSectionId): number {
  return SETTINGS_SECTIONS.findIndex((section) => section.id === id);
}
