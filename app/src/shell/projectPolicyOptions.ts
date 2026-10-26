export type ProjectPolicyOption = {
  id: string;
  label: string;
  description: string;
  source: string;
  goal: string;
  inheritsParentPolicy: boolean;
};

const PRESENTATIONS: Record<string, { label: string; description: string }> = {
  project: { label: "プロジェクトのプリセット", description: "インストール済みのプロジェクトポリシーを使います。" },
  operator_space: { label: "一般的な作業", description: "日常の作業と階層化したプロジェクトを整理します。" },
  operator_interaction: { label: "個別のタスク", description: "許可されたツールを使って、具体的な依頼を完了します。" },
  self_improvement: { label: "フレームワークの開発", description: "親の権限の範囲内で、Octopus の設定やソースを変更します。" },
  startup_management: { label: "起動とセットアップ", description: "起動と設定の作業を管理します。" },
  memory_maintenance: { label: "知識の管理", description: "このプロジェクトで使えるコンテキストの成果物を管理します。" },
  context_maintenance: { label: "コンテキストの管理", description: "継続的な作業に使うコンテキストを準備・管理します。" },
};

const ALLOWANCE_FIELDS = [
  "allowed_interfaces", "allowed_tools", "allowed_worker_environment_kinds",
  "allowed_root_slots", "allowed_artifact_verbs", "allowed_mark_outcomes",
] as const;

export function projectPolicyOption(value: unknown): ProjectPolicyOption | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || !row.id || row.bootstrap_root === true) return null;
  const inheritsParentPolicy = row.id === "project"
    && ALLOWANCE_FIELDS.every((field) => row[field] == null)
    && (row.hard_blocked_tools === undefined || Array.isArray(row.hard_blocked_tools) && row.hard_blocked_tools.length === 0)
    && (row.interface_policy_overrides === undefined || row.interface_policy_overrides !== null
      && typeof row.interface_policy_overrides === "object" && !Array.isArray(row.interface_policy_overrides)
      && Object.keys(row.interface_policy_overrides).length === 0);
  const presentation = PRESENTATIONS[row.id];
  const words = row.id.replace(/[_-]+/g, " ");
  return {
    id: row.id,
    label: inheritsParentPolicy ? "親と同じポリシー" : presentation?.label ?? `${words[0].toUpperCase()}${words.slice(1)}`,
    description: inheritsParentPolicy
      ? "親のアクセス制限をそのまま使い、追加の制限は設けません。"
      : presentation?.description ?? "親の権限の範囲内で、このインストール済みポリシーを使います。",
    source: `registry/ee_template/${row.id}/ee_template.json`,
    goal: typeof row.goal_class === "string" ? row.goal_class : "",
    inheritsParentPolicy,
  };
}

export function allowedProjectPolicies(
  templates: readonly ProjectPolicyOption[],
  allowedIds: readonly string[],
): ProjectPolicyOption[] {
  const allowed = new Set(allowedIds);
  return templates.filter((option) => allowed.has(option.id)).sort((left, right) => (
    Number(right.inheritsParentPolicy) - Number(left.inheritsParentPolicy) || left.label.localeCompare(right.label)
  ));
}
