import { Glyph } from "../IconGlyphs";
import { MessageTooltip } from "../chat/MessageTooltip";

export type TasksView = "tasks" | "scheduled" | "archived";

export function TasksViewSwitcher({ value, onChange }: {
  value: TasksView;
  onChange: (view: TasksView) => void;
}) {
  return <div className="tasks-view-switcher" role="group" aria-label="タスクの表示">
    <button
      aria-pressed={value === "tasks"}
      className="tasks-view-filter"
      onClick={() => onChange("tasks")}
      type="button"
    >すべてのタスク</button>
    <div className="tasks-view-icon-controls">
      <MessageTooltip label="トリガー">
        <button
          aria-label="トリガー"
          aria-pressed={value === "scheduled"}
          className="tasks-view-filter is-icon"
          onClick={() => onChange("scheduled")}
          type="button"
        ><Glyph name="scheduled" size={16} /></button>
      </MessageTooltip>
      <MessageTooltip label="アーカイブ済みのタスク">
        <button
          aria-label="アーカイブ済みのタスク"
          aria-pressed={value === "archived"}
          className="tasks-view-filter is-icon"
          onClick={() => onChange("archived")}
          type="button"
        ><Glyph name="archive" size={16} /></button>
      </MessageTooltip>
    </div>
  </div>;
}
