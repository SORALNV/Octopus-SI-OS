export type ClientCommandId =
  | "new_chat"
  | "open_voice"
  | "open_settings"
  | "open_command_menu"
  | "focus_search"
  | "focus_composer"
  | "composer.queue"
  | "composer.steer"
  | "scroll_to_latest"
  | "navigate_back"
  | "navigate_forward"
  | "previous_surface"
  | "next_surface"
  | "toggle_sidebar"
  | "toggle_split"
  | "toggle_task_summary"
  | "open_terminal"
  | "open_browser"
  | "open_changes"
  | "review_changes"
  | "start_dictation"
  | "attach_files"
  | "attach_projected_file"
  | "copy_task_markdown"
  | "copy_run_id"
  | "copy_working_directory"
  | "toggle_pin_task"
  | "open_model_picker"
  | "open_side_task"
  | "previous_operator_message"
  | "next_operator_message"
  | "voice_primary"
  | "voice_end";

export type ClientCommandSource = "keyboard" | "gesture" | "surface";

export type ClientCommand = {
  id: ClientCommandId;
  label: string;
  detail: string;
};

export const clientCommands: readonly ClientCommand[] = [
  { id: "new_chat", label: "新しいタスク", detail: "選択中の Octopus OS の範囲で新しいタスクを開始します" },
  { id: "open_voice", label: "ホームを開く", detail: "現在の Octopus OS のホームを開きます" },
  { id: "open_settings", label: "設定を開く", detail: "アプリの設定を開きます" },
  { id: "open_command_menu", label: "コマンドメニューを開く", detail: "コマンド、画面、最近のタスクを検索します" },
  { id: "focus_search", label: "検索欄に移動", detail: "現在の画面の検索欄に移動します" },
  { id: "focus_composer", label: "入力欄に移動", detail: "現在のタスクの入力欄に移動します" },
  { id: "composer.queue", label: "メッセージを送信待ちに追加", detail: "現在の応答が終わってからメッセージを送信します" },
  { id: "composer.steer", label: "現在の応答に指示を追加", detail: "現在の応答を中断せず、入力中のメッセージをすぐに送信します" },
  { id: "scroll_to_latest", label: "最新の内容に移動", detail: "タスクの最新の動作記録に移動します" },
  { id: "navigate_back", label: "戻る", detail: "前に開いた画面に戻ります" },
  { id: "navigate_forward", label: "進む", detail: "次の画面に進みます" },
  { id: "previous_surface", label: "前の画面", detail: "前の画面に移動します" },
  { id: "next_surface", label: "次の画面", detail: "次の画面に移動します" },
  { id: "toggle_sidebar", label: "サイドバーの表示を切り替え", detail: "サイドバーを表示または非表示にします" },
  { id: "toggle_split", label: "分割表示を切り替え", detail: "サブペインを開くか閉じます" },
  { id: "toggle_task_summary", label: "タスクの概要の表示を切り替え", detail: "タスクの概要パネルを開くか閉じます" },
  { id: "open_terminal", label: "ターミナルを開く", detail: "サブペインに新しいターミナルを開きます" },
  { id: "open_browser", label: "ブラウザータブを開く", detail: "作業環境にある最初のブラウザーを開きます" },
  { id: "open_changes", label: "レビュータブを開く", detail: "作業環境にある最初の変更画面を開きます" },
  { id: "review_changes", label: "新しいタスクで変更をレビュー", detail: "現在の変更を添付し、読み取り専用のレビュータスクを開きます" },
  { id: "start_dictation", label: "音声入力を開始", detail: "現在の入力欄で音声入力を開始または停止します" },
  { id: "attach_files", label: "ファイルを添付", detail: "現在の入力欄に添付するファイルを選びます" },
  { id: "attach_projected_file", label: "作業環境のファイルを添付", detail: "現在の実行で読み取り可能なファイルを選んで添付します" },
  { id: "copy_task_markdown", label: "タスクを Markdown でコピー", detail: "出典を含めてタスクの会話をコピーします" },
  { id: "copy_run_id", label: "実行 ID をコピー", detail: "現在の実行の ID をコピーします" },
  { id: "copy_working_directory", label: "作業ディレクトリをコピー", detail: "現在の実行または選択中の作業環境にあるすべてのルートパスをコピーします" },
  { id: "toggle_pin_task", label: "タスクの固定を切り替え", detail: "現在のプロフィールでタスクの固定を切り替えます" },
  { id: "open_model_picker", label: "モデルを選択", detail: "プロバイダー、モデル、推論の強さを選びます" },
  { id: "open_side_task", label: "サブペインでタスクを開く", detail: "現在のタスクを分割表示のサブペインで開きます" },
  { id: "previous_operator_message", label: "前の自分のメッセージ", detail: "現在のタスクで前の自分のメッセージに移動します" },
  { id: "next_operator_message", label: "次の自分のメッセージ", detail: "現在のタスクで次の自分のメッセージに移動します" },
  { id: "voice_primary", label: "ホームの音声通話を開始・ミュート", detail: "ホームで音声通話を開始するか、ミュートを切り替えます" },
  { id: "voice_end", label: "ホームの音声通話を終了", detail: "ホームの音声通話を終了します" },
];

export const CLIENT_COMMAND_EVENT = "octopus:client-command";

export type ClientSettingsDestination = { sectionId?: string; dictationRecordingId?: string };

export function dispatchClientCommand(id: ClientCommandId, source: ClientCommandSource, settingsDestination?: ClientSettingsDestination): void {
  window.dispatchEvent(new CustomEvent(CLIENT_COMMAND_EVENT, { detail: { id, source, settingsDestination } }));
}

export function subscribeClientCommands(listener: (id: ClientCommandId, source: ClientCommandSource, settingsDestination?: ClientSettingsDestination) => void): () => void {
  const handle = (event: Event) => {
    if (!(event instanceof CustomEvent)) return;
    const id = event.detail?.id;
    const source = event.detail?.source;
    if (!clientCommands.some((command) => command.id === id)) return;
    if (source !== "keyboard" && source !== "gesture" && source !== "surface") return;
    listener(id, source, id === "open_settings" ? event.detail?.settingsDestination : undefined);
  };
  window.addEventListener(CLIENT_COMMAND_EVENT, handle);
  return () => window.removeEventListener(CLIENT_COMMAND_EVENT, handle);
}
