export type ScheduledSuggestion = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  instructions: string;
  schedule: string;
  templateInterfaceId?: string;
};

export const scheduledSuggestions: readonly ScheduledSuggestion[] = [
  {
    id: "daily-brief", emoji: "☀️", title: "毎日のまとめ",
    description: "最近の進捗と対応が必要なことを確認して、一日を始めます。",
    instructions: "Prepare a concise daily brief from the projects and evidence available to this run. Summarize recent progress, outstanding decisions, and priorities for today.",
    schedule: "Weekdays at 9:00 AM in my local timezone",
  },
  {
    id: "project-check-in", emoji: "📋", title: "プロジェクトの状況確認",
    description: "進行中の作業を確認し、重要な変化を報告します。",
    instructions: "Check the project work available to this run. Report meaningful progress, unresolved blockers, and decisions that need my attention. Cite the evidence for changes.",
    schedule: "Weekdays at 4:00 PM in my local timezone",
  },
  {
    id: "weekly-review", emoji: "📖", title: "一週間の振り返り",
    description: "毎週金曜日に、一週間の成果と残っている作業をまとめます。",
    instructions: "Review this week's work using the evidence available to this run. Summarize completed outcomes, unfinished work, and useful next steps.",
    schedule: "Fridays at 4:00 PM in my local timezone",
  },
  {
    id: "research-update", emoji: "🔎", title: "調査の最新情報",
    description: "継続中の調査について、毎週新しい知見を確認します。",
    instructions: "Review the research goals and sources available to this run. Summarize new findings, material changes, and open questions, with source references.",
    schedule: "Wednesdays at 10:00 AM in my local timezone",
  },
  {
    id: "follow-up", emoji: "🔔", title: "フォローアップ",
    description: "未決定の事項や返事待ちの内容を確認します。",
    instructions: "Review the pending decisions and follow-ups available to this run. Identify what changed and what still needs attention. Do not send external messages without authorization.",
    schedule: "Weekdays at 10:00 AM in my local timezone",
  },
  {
    id: "plan-week", emoji: "🗓️", title: "一週間の計画",
    description: "毎週月曜日に優先順位を確認し、一週間の計画を立てます。",
    instructions: "Review the goals, deadlines, and outstanding work available to this run. Prepare a focused weekly plan, explaining the priorities and decisions that need my input.",
    schedule: "Mondays at 8:00 AM in my local timezone",
  },
];
