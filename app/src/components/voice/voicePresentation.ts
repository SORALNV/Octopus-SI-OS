import type { VoicePhase } from "./useVoiceSession";

export type VoiceTranscriptEntry = Readonly<{
  id: string;
  role: "user" | "assistant";
  text: string;
  final: boolean;
}>;

type CallPresentation = Readonly<{
  active: boolean;
  canMute: boolean;
  canEnd: boolean;
  canStart: boolean;
  title: string;
  detail: string;
}>;

const presentations: Record<VoicePhase, CallPresentation> = {
  idle: { active: false, canMute: false, canEnd: false, canStart: true, title: "ホームと話す", detail: "ホームとの音声通話を開始します。" },
  requesting: { active: true, canMute: false, canEnd: true, canStart: false, title: "マイクを準備しています", detail: "通話を始めるには、マイクへのアクセスを許可してください。" },
  connecting: { active: true, canMute: false, canEnd: true, canStart: false, title: "通話に接続しています", detail: "音声の接続を待っています。" },
  listening: { active: true, canMute: true, canEnd: true, canStart: false, title: "接続済み", detail: "音声通話に接続しています。" },
  muted: { active: true, canMute: true, canEnd: true, canStart: false, title: "マイクはミュート中", detail: "ホームの音声は引き続き聞こえます。話すにはミュートを解除してください。" },
  recovering: { active: true, canMute: false, canEnd: true, canStart: false, title: "通話に再接続しています", detail: "音声の接続が回復するのを待っています。" },
  ending: { active: false, canMute: false, canEnd: false, canStart: false, title: "接続を終了しています…", detail: "マイクはオフです。音声の接続はまだ終了処理中です。" },
  closure_unconfirmed: { active: false, canMute: false, canEnd: true, canStart: false, title: "終了を確認できません", detail: "マイクはオフです。別の通話を始める前に、この通話の終了を再試行してください。" },
  ended: { active: false, canMute: false, canEnd: false, canStart: true, title: "通話が終了しました", detail: "会話とタスクは引き続き利用できます。" },
  error: { active: false, canMute: false, canEnd: false, canStart: true, title: "音声通話を利用できません", detail: "文字で会話を続けるか、もう一度通話をお試しください。" },
};

export function voicePresentation(phase: VoicePhase): CallPresentation {
  return presentations[phase];
}

export function voiceTranscriptActivity(previous: VoiceTranscriptEntry | undefined, payload: Record<string, unknown>): boolean | null {
  if (typeof payload.text !== "string" || !payload.text.trim()) return null;
  if (payload.role === "user" && payload.final === true && !previous?.final && payload.provider_turn_complete !== false) return true;
  if (payload.role === "assistant" && previous?.text !== payload.text) return false;
  return null;
}

export function isVoiceCallActive(phase: VoicePhase): boolean {
  return presentations[phase].active;
}

export function formatCallDuration(elapsedMs: number): string {
  const seconds = Math.floor(Math.max(0, elapsedMs) / 1_000);
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds % 60)}` : `${minutes}:${pad(seconds % 60)}`;
}
