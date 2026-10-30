import { APP_LOCALE } from "../../locale";
import type { GlyphName } from "../IconGlyphs";
import type { ActivityKind, MarkActivityItem } from "./markActivity";

export type ActivityPresentation = { label: string; category: string; glyph: GlyphName; description: string };

const requestKinds: ReadonlySet<ActivityKind> = new Set(["approval", "user_input", "elicitation"]);

const kindPresentation: Record<Exclude<ActivityKind, "mark">, ActivityPresentation> = {
  message: { label: "新しい応答", category: "Message", glyph: "chat", description: "タスクから応答が届きました。開いて内容を確認し、会話を続けられます。" },
  approval: { label: "承認が必要", category: "Request", glyph: "lock", description: "操作を許可するか拒否するか、回答を待っています。" },
  user_input: { label: "回答が必要", category: "Request", glyph: "user", description: "タスクからの質問に回答してください。" },
  elicitation: { label: "詳細の入力待ち", category: "Request", glyph: "chat", description: "タスクを続けるには、追加の情報が必要です。" },
};

const markPresentations: Record<string, ActivityPresentation> = {
  "tool.call.allowed": { label: "ツールの呼び出しを許可", category: "Policy", glyph: "tool", description: "実行時にツールの呼び出しを権限と照合し、実行を許可しました。" },
  "tool.result.corresponds": { label: "ツールの結果を照合済み", category: "Tools", glyph: "tool", description: "ツールの結果が、要求した呼び出しに対応することを検証しました。" },
  "emit.tool_call.present": { label: "ツールの呼び出しを出力", category: "Tools", glyph: "tool", description: "モデルの出力に、正しい形式のツール呼び出しが含まれていました。" },
  "memory.experience.admitted": { label: "経験をメモリに受け付け", category: "Memory", glyph: "memory", description: "完了した実行を、メモリの監視処理が扱う経験として受け付けました。" },
  "memory.capture.completed": { label: "メモリへの保存が完了", category: "Memory", glyph: "memory", description: "受け付けた経験を処理し、今後の作業に役立つ情報をメモリに保存しました。" },
  "operator.approval": { label: "ユーザーの承認を記録", category: "Approvals", glyph: "check", description: "承認を記録し、実行に返しました。" },
  "operator.input.provided": { label: "ユーザーの回答を記録", category: "Approvals", glyph: "user", description: "回答を記録し、実行に返しました。" },
  "task.summary.received": { label: "タスクの概要を受信", category: "Tasks", glyph: "taskSummary", description: "タスクを開始した実行に、タスクの概要が届きました。" },
  "coder.build.ok": { label: "ビルドの検証に合格", category: "Code", glyph: "code", description: "プロジェクトのビルド検証に合格しました。" },
  "context.recipe.valid": { label: "コンテキストの構成を検証済み", category: "Context", glyph: "layers", description: "実行に渡すコンテキストを構成し、その定義と照合しました。" },
  "email.authorization.requested": { label: "メールへのアクセス許可を要求", category: "Access", glyph: "lock", description: "実行からメールを使うための許可が求められました。" },
  "lifecycle.decision.allowed": { label: "ライフサイクルの操作を許可", category: "Checks", glyph: "check", description: "ライフサイクルの確認により、次のステップを許可しました。" },
  "ocr.text.contains": { label: "画面の文字を照合済み", category: "Computer Use", glyph: "desktop", description: "画面上で期待された文字を認識しました。" },
};

const sourcePresentations: Record<string, string> = {
  system_worker_memory_observer: "Memory",
  system_worker_memory_projection: "Memory",
  system_worker_memory_consolidation: "Memory",
  system_worker_operator_home: "Home",
  system_worker_operator_task: "Task",
  system_worker_cron: "Triggers",
  system_worker_computer_use: "Computer Use",
};

export function isActivityRequest(item: MarkActivityItem): boolean {
  return requestKinds.has(item.kind);
}

export function activityPresentation(item: MarkActivityItem): ActivityPresentation {
  if (item.kind !== "mark") return kindPresentation[item.kind];
  return markPresentations[item.name] ?? {
    label: sentence(item.name.replaceAll(/[._]+/g, " ")),
    category: "Activity",
    glyph: "activity",
    description: "作業中に Octopus がこのステップを記録しました。",
  };
}

export function activityTitle(item: MarkActivityItem): string {
  return activityPresentation(item).label;
}

export function activityHeadline(item: MarkActivityItem): string {
  return item.kind === "mark" ? activityPresentation(item).label : item.sourceTitle ?? activityPresentation(item).label;
}

export function activitySummary(item: MarkActivityItem): string {
  if (item.kind === "mark") return `${activitySource(item)} · ${item.name}`;
  if (item.kind === "message") return item.excerpt ?? activityPresentation(item).label;
  return activityPresentation(item).label;
}

export function activitySource(item: MarkActivityItem): string {
  if (item.agentName) return item.agentName;
  if (item.kind !== "mark" && item.sourceTitle) return item.sourceTitle;
  const original = item.workerOriginal || item.worker;
  if (sourcePresentations[original]) return sourcePresentations[original];
  const readable = original.replace(/^(?:lab_)?system_worker_/, "").replace(/_[0-9a-f]{8,}.*$/, "").replaceAll(/[._]+/g, " ").trim();
  return readable ? sentence(readable) : "Octopus";
}

export type ActivityRowGroup = { id: string; lead: MarkActivityItem; items: MarkActivityItem[] };
export type ActivitySection = { key: string; label: string; rows: ActivityRowGroup[] };

export function activityRows(items: readonly MarkActivityItem[]): ActivityRowGroup[] {
  const rows: ActivityRowGroup[] = [];
  for (const item of items) {
    const previous = rows.at(-1);
    if (previous && item.kind === "mark" && previous.lead.kind === "mark" && previous.lead.name === item.name
      && activitySource(previous.lead) === activitySource(item) && previous.lead.runId === item.runId) {
      previous.items.push(item);
      continue;
    }
    rows.push({ id: item.id, lead: item, items: [item] });
  }
  return rows;
}

export function activitySections(items: readonly MarkActivityItem[], now: number): ActivitySection[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();
  const yesterday = today - 86_400_000;
  const buckets: Array<{ key: string; label: string; items: MarkActivityItem[] }> = [
    { key: "requests", label: "対応待ち", items: [] },
    { key: "today", label: "今日", items: [] },
    { key: "yesterday", label: "昨日", items: [] },
    { key: "earlier", label: "以前", items: [] },
  ];
  for (const item of items) {
    const at = item.createdAt ?? -1;
    const bucket = isActivityRequest(item) ? buckets[0] : at >= today ? buckets[1] : at >= yesterday ? buckets[2] : buckets[3];
    bucket.items.push(item);
  }
  return buckets.filter((bucket) => bucket.items.length).map((bucket) => ({ key: bucket.key, label: bucket.label, rows: activityRows(bucket.items) }));
}

export function relativeActivityTime(at: number | null, now: number): string {
  if (at === null) return "";
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat(APP_LOCALE, { month: "short", day: "numeric" }).format(at);
}

export function activityMoment(at: number, now: number): string {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  const time = new Intl.DateTimeFormat(APP_LOCALE, { timeStyle: "short" }).format(at);
  if (at >= day.getTime()) return time;
  if (at >= day.getTime() - 86_400_000) return `Yesterday, ${time}`;
  const date = new Intl.DateTimeFormat(APP_LOCALE, { month: "short", day: "numeric" }).format(at);
  return `${date}, ${time}`;
}

function sentence(value: string): string {
  return value ? value[0].toLocaleUpperCase() + value.slice(1) : value;
}
