import type { ChatRenderMessage, ChatToolPresentationDescriptor, ChatToolPresentationIndex } from "./types";
import catalogRows from "./toolActivityPresentationCatalog.json";

export type DynamicToolPresentationFamily = "exec" | "files" | "read" | "web" | "tool";

type ClientToolPresentationDescriptor = ChatToolPresentationDescriptor & {
  surface: "browser" | "web" | "integration" | null;
  targetKind: "file" | "artifact";
  resultTargetFields: string[];
  operationLabels: Record<string, string>;
  clientResultOperations: string[];
};

export type NativeRunOperationPresentation = {
  label: string;
  target: string;
  details: Array<[string, string]>;
};

export type DynamicToolPresentation = {
  surface: ClientToolPresentationDescriptor["surface"];
  conversationVisible: boolean;
  exactToolId: string;
  family: DynamicToolPresentationFamily;
  kind: ChatToolPresentationDescriptor["kind"];
  label: string;
  operationLabel: string;
  awaitsClientResult: boolean;
  path: string;
  pathLabel: string;
  query: string;
  target: string;
  targetKind: ClientToolPresentationDescriptor["targetKind"];
  operation: NativeRunOperationPresentation | null;
};

export type DynamicToolGlyph = "edit" | "folder" | "read" | "search" | "terminal" | "plugins" | "browserUse";

export function dynamicToolPresentation(
  message: ChatRenderMessage | undefined,
  descriptors: ChatToolPresentationIndex,
): DynamicToolPresentation {
  const data = record(message?.eventData);
  const rawToolId = text(data.tool) || text(data.name);
  const exactToolId = rawToolId;
  const baseToolId = baseDynamicToolId(exactToolId);
  const clientDescriptor = clientToolActivityPresentation(baseToolId);
  const descriptor = descriptors[exactToolId]
    ?? descriptors[baseToolId]
    ?? clientDescriptor
    ?? genericPresentation;
  const targetKind = clientDescriptor?.targetKind ?? "file";
  const argumentsValue = record(data.arguments);
  const family = clientDescriptor?.surface === "web" ? "web" : presentationFamily(descriptor.kind);
  const pathValue = firstArgument(argumentsValue, descriptor.targetArguments)
    ?? firstArgument(record(data.body), clientDescriptor?.resultTargetFields ?? []);
  const target = presentationTarget(pathValue);
  const path = targetKind === "file" && family !== "web" ? target : "";
  const queryValue = presentationTarget(firstArgument(argumentsValue, descriptor.queryArguments));
  const query = family === "web" ? webSearchQueryLabel(queryValue) : queryValue;
  const operation = nativeRunOperationPresentation(message);
  const calledOperation = text(argumentsValue.method) === "tools/call"
    ? text(record(argumentsValue.params).name)
    : text(argumentsValue.method);
  return {
    surface: clientDescriptor?.surface ?? null,
    conversationVisible: descriptor.conversationVisible,
    exactToolId,
    family,
    kind: descriptor.kind,
    label: descriptor.label,
    operationLabel: clientDescriptor?.operationLabels[calledOperation] ?? "",
    awaitsClientResult: Boolean(calledOperation && clientDescriptor?.clientResultOperations.includes(calledOperation)),
    path,
    pathLabel: targetKind === "artifact" ? artifactTargetLabel(target) : presentationPathLabel(pathValue),
    query,
    target: operation?.target ?? (family === "exec"
      ? target
      : descriptor.kind === "search"
        ? query || target
        : target || query),
    targetKind,
    operation,
  };
}

export function dynamicToolOperationLabel(presentation: DynamicToolPresentation): string {
  if (presentation.surface === "browser") return "ブラウザーを使用しました";
  if (presentation.operation) return presentation.operation.label;
  if (presentation.operationLabel) return presentation.operationLabel;
  const displayToolId = baseDynamicToolId(presentation.exactToolId);
  const fallback = displayToolId.split(".").filter(Boolean).at(-1) ?? displayToolId;
  if (presentation.family === "tool" && displayToolId.includes(".")) return humanize(displayToolId);
  return presentation.label || humanize(fallback || "tool");
}

export function dynamicToolSummary(presentation: DynamicToolPresentation): string {
  if (presentation.family === "web") return webSearchActivityLabel(presentation.query, false);
  const label = dynamicToolOperationLabel(presentation);
  return presentation.surface === "browser" ? label : [label, presentation.target].filter(Boolean).join(" · ");
}

export function dynamicToolGlyph(presentation: DynamicToolPresentation): DynamicToolGlyph {
  if (presentation.surface === "browser") return "browserUse";
  if (presentation.family === "exec") return "terminal";
  if (presentation.family === "files") return "edit";
  if (presentation.family === "web") return "search";
  if (presentation.family === "read") {
    if (presentation.kind === "search") return "search";
    if (presentation.kind === "list") return "folder";
    return "read";
  }
  return "plugins";
}

export function dynamicToolReadLabel(presentation: DynamicToolPresentation, active: boolean): string {
  const path = presentation.path;
  const artifacts = presentation.targetKind === "artifact";
  const objects = artifacts ? "成果物" : "ファイル";
  if (presentation.kind === "list") {
    return path
      ? `${path} のファイル一覧を${active ? "取得しています" : "取得しました"}`
      : `${objects}の一覧を${active ? "取得しています" : "取得しました"}`;
  }
  if (presentation.kind === "search") {
    if (presentation.query) {
      return `${path ? `${path} 内の` : ""}${objects}を${active ? "検索しています" : "検索しました"}：${presentation.query}`;
    }
    if (!active) return `${objects}を検索しました`;
    return presentation.pathLabel
      ? `${presentation.pathLabel} 内のファイルを検索しています`
      : `${objects}を検索しています`;
  }
  return `${presentation.pathLabel || (artifacts ? "対象の成果物を取得できません" : "ファイル")}を${active ? "読み込んでいます" : "読み取りました"}`;
}

export function nativeRunOperationPresentation(message: ChatRenderMessage | undefined): NativeRunOperationPresentation | null {
  const data = record(message?.eventData);
  if (data.namespace !== "formed_interfaces") return null;
  const argumentsValue = record(data.arguments);
  const body = record(data.body);
  const status = text(data.status) || text(data.lifecycle);
  const active = status === "started";
  const failed = message?.error === true || status === "failed" || data.ok === false || body.ok === false;
  const error = [...new Set([
    text(record(data.error).message) || text(data.error),
    text(record(body.error).message) || text(body.error),
  ].filter(Boolean))].join("\n");
  const peers = message?.relatedRuns?.map((run) => run.title).join(", ") || "";
  if (data.tool === "create_run") {
    const created = record(body.created);
    return { label: active ? "タスクを作成しています" : failed ? "タスクを作成できませんでした" : "タスクを作成しました",
      target: peers || text(created.run_id),
      details: [["Task", peers || text(created.run_id)], ["Message", text(argumentsValue.text)], ["Error", error]] };
  }
  if (data.tool === "list_runs") {
    return { label: active ? "接続されたタスクを確認しています" : failed ? "タスクを検索できませんでした" : "接続されたタスクを確認しました",
      target: peers,
      details: [["Tasks", peers], ["Interfaces", stringArray(body.declared_peer_interfaces).join("\n")], ["Error", error]] };
  }
  if (["followup_task", "send_message", "interrupt_run"].includes(text(data.tool))) {
    const target = text(argumentsValue.interface) || text(body.interface);
    const interrupt = data.tool === "interrupt_run";
    return { label: active ? (interrupt ? "停止を要求しています" : "メッセージを送信しています")
      : failed ? (interrupt ? "停止を要求できませんでした" : "メッセージの送信に失敗しました")
      : body.admitted === true ? (interrupt ? "停止を要求しました" : "メッセージを送信しました") : "メッセージの配信を確認できません",
      target: peers || target,
      details: [["To", peers || target], ["Interface", target], ["Message", text(argumentsValue.text)],
        ["Delivery", body.admitted === true ? "Accepted" : body.admitted === false ? "Refused" : "Unconfirmed"], ["Error", error]] };
  }
  if (data.tool === "wait_for_runs") {
    return { label: active ? "応答を待っています" : failed ? "応答の待機に失敗しました" : "応答を待ちました", target: peers,
      details: [["From", peers], ["Result", body.timed_out === true ? "時間内に応答がありませんでした"
        : Array.isArray(body.notifications) ? `${body.notifications.length} replies received` : ""], ["Error", error]] };
  }
  if (data.tool === "run_list") {
    const run = record(body.source_run);
    const target = text(run.run_id);
    return {
      label: active ? "実行を確認しています" : failed ? "実行を確認できませんでした" : target ? "実行を確認しました" : "実行を確認",
      target,
      details: [
        ["Run", target],
        ["Recorded status", humanize(text(run.recorded_status))],
        ["Provider activity", humanize(text(run.provider_activity))],
        ["Peer interfaces", stringArray(body.declared_peer_interfaces).join("\n")],
        ["Error", error],
      ],
    };
  }
  if (data.tool === "run_continue") {
    const target = text(argumentsValue.interface) || text(body.interface);
    return {
      label: active ? "実行の続行を要求しています" : failed ? "続行を要求できませんでした"
        : body.admitted === true ? "実行の続行を要求しました" : "実行の続行要求",
      target,
      details: [
        ["Interface", target],
        ["Message", text(argumentsValue.text)],
        ["Admission", body.admitted === true ? "Accepted" : body.admitted === false ? "Refused" : ""],
        ["Recipient action", body.recipient_action_confirmed === true ? "Confirmed" : body.recipient_action_confirmed === false ? "未確認" : ""],
        ["Work", body.work_completed === true ? "Completed" : body.work_completed === false ? "未完了" : ""],
        ["Error", error],
      ],
    };
  }
  return null;
}

export function webSearchActivityLabel(detail: string, active: boolean): string {
  return `${active ? "ウェブを検索しています" : "ウェブを検索しました"}${detail ? ` 対象 ${detail}` : ""}`;
}

export function webSearchActivityDetail(message: ChatRenderMessage | undefined): string {
  const data = record(message?.eventData);
  const action = record(data.action);
  let detail = "";
  if (action.kind === "search") {
    const queries = Array.isArray(action.queries) ? action.queries.map(text) : [];
    const query = text(action.query);
    const firstQuery = queries.find(Boolean) ?? "";
    detail = query ? webSearchQueryLabel(query) : `${webSearchQueryLabel(firstQuery)}${queries.length > 1 && firstQuery ? " ..." : ""}`;
  } else if (action.kind === "open_page") {
    detail = text(action.url);
  } else if (action.kind === "find_in_page") {
    const pattern = text(action.pattern);
    const url = text(action.url);
    detail = pattern && url ? `'${pattern}' in ${url}` : pattern ? `'${pattern}'` : url;
  }
  return detail || text(data.query);
}

function webSearchQueryLabel(query: string): string {
  const domains: string[] = [];
  const withoutSites = query.replace(/\bsite:([^\s]+)/giu, (match, domain: string) => {
    try {
      const hostname = new URL(`https://${domain}`).hostname.replace(/^www\./u, "");
      if (!domains.includes(hostname)) domains.push(hostname);
      return "";
    } catch {
      return match;
    }
  });
  if (!domains.length) return query;
  const terms = withoutSites.replace(/\bOR\b/gu, " ").replace(/\s+/gu, " ").trim();
  return terms ? `${terms} | ${domains.join(" · ")}` : query;
}

const genericPresentation: ClientToolPresentationDescriptor = {
  surface: null,
  conversationVisible: true,
  kind: "tool",
  label: "",
  queryArguments: [],
  targetArguments: [],
  targetKind: "file",
  resultTargetFields: [],
  operationLabels: {},
  clientResultOperations: [],
};

const clientToolPresentationCatalog = Object.freeze(Object.fromEntries(
  Object.entries(catalogRows).map(([toolId, value]) => {
    const presentation = parseClientToolActivityPresentation(value);
    if (!presentation) throw new Error(`Invalid client tool activity presentation for '${toolId}'.`);
    return [toolId, presentation];
  }),
)) as Readonly<Record<string, ClientToolPresentationDescriptor>>;

export function clientToolActivityPresentation(toolId: string): ClientToolPresentationDescriptor | null {
  return clientToolPresentationCatalog[toolId] ?? null;
}

export function baseDynamicToolId(exactToolId: string): string {
  const separator = exactToolId.indexOf("__");
  return separator > 0 ? exactToolId.slice(0, separator) : exactToolId;
}

function parseClientToolActivityPresentation(value: unknown): ClientToolPresentationDescriptor | null {
  const row = record(value);
  const kind = text(row.kind);
  if (!["command", "file_change", "list", "read", "search", "tool"].includes(kind)) return null;
  return {
    surface: row.surface === "browser" || row.surface === "web" || row.surface === "integration" ? row.surface : null,
    conversationVisible: row.conversation_visible !== false,
    kind: kind as ChatToolPresentationDescriptor["kind"],
    label: text(row.label),
    queryArguments: stringArray(row.query_arguments),
    targetArguments: stringArray(row.target_arguments),
    targetKind: row.target_kind === "artifact" ? "artifact" : "file",
    resultTargetFields: stringArray(row.result_target_fields),
    operationLabels: Object.fromEntries(Object.entries(record(row.operation_labels))
      .map(([name, label]) => [name, text(label)]).filter(([, label]) => label)),
    clientResultOperations: stringArray(row.client_result_operations),
  };
}

function presentationFamily(kind: ChatToolPresentationDescriptor["kind"]): DynamicToolPresentationFamily {
  if (kind === "command") return "exec";
  if (kind === "file_change") return "files";
  if (kind === "list" || kind === "read" || kind === "search") return "read";
  return "tool";
}

function firstArgument(argumentsValue: Record<string, unknown>, names: string[]): unknown {
  for (const name of names) {
    if (argumentsValue[name] !== undefined && argumentsValue[name] !== null) return argumentsValue[name];
  }
  return undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function humanize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/^./, (character) => character.toUpperCase());
}

function presentationTarget(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value)) return "";
  return value.every((item) => typeof item === "string")
    ? value.map(shellArgument).join(" ")
    : "";
}

function presentationPathLabel(value: unknown): string {
  if (typeof value === "string") return pathBasename(value);
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) return "";
  return value.map(pathBasename).filter(Boolean).join(", ");
}

function artifactTargetLabel(value: string): string {
  return value.match(/^(.+):[a-f0-9]{64}$/i)?.[1] ?? value;
}

function pathBasename(value: string): string {
  const normalized = value.trim().replaceAll("\\", "/").replace(/\/+$/, "");
  return normalized.split("/").filter(Boolean).at(-1) ?? normalized;
}

function shellArgument(value: string): string {
  if (/^[A-Za-z0-9_./:=+@%,-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
