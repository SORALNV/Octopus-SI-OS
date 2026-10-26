export const statusKeys = ["projected", "active", "idle", "settled", "done", "blocked", "stale", "offline", "unknown"] as const;
export type FilterStatus = (typeof statusKeys)[number];

export type DashboardScope = "System" | "World";
export type DashboardTopologyMode = "drilldown" | "zones";

export type DashboardFilters = {
  statuses: Record<FilterStatus, boolean>;
};

export const statusLabels: Record<FilterStatus, string> = {
  projected: "表示中",
  active: "実行中",
  idle: "待機中",
  settled: "処理済み",
  done: "完了",
  blocked: "ブロック中",
  stale: "更新停止",
  offline: "オフライン",
  unknown: "不明",
};

export const defaultDashboardFilters: DashboardFilters = {
  statuses: {
    projected: true,
    active: true,
    idle: true,
    settled: true,
    done: true,
    blocked: true,
    stale: true,
    offline: true,
    unknown: true,
  },
};

export function enabledFilterCount(filters: DashboardFilters): number {
  return statusKeys.map((key) => filters.statuses[key]).filter(Boolean).length;
}
