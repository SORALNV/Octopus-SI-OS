import type { OctopusDictationLocalResult, OctopusDictationRequest } from "./electron";

export const DICTATION_RECORDINGS_CHANGED = "octopus:dictation-recordings-changed";

export async function dictationResult<T>(result: Promise<OctopusDictationLocalResult<T>>): Promise<T> {
  let outcome: OctopusDictationLocalResult<T>;
  try { outcome = await result; }
  catch { throw new Error("音声入力を利用できません。Octopus を開き直して、もう一度お試しください。"); }
  if (!outcome.ok) throw Object.assign(new Error(outcome.error.message), { code: outcome.error.code });
  return outcome.value;
}

export function dictationHost() {
  if (!window.octopusTransport?.readDictationRecordings) throw new Error("録音履歴はデスクトップアプリで利用できます。");
  return window.octopusTransport;
}

export function dictationAudioRequest(bytes: ArrayBuffer, durationMs: number): OctopusDictationRequest {
  return { attemptId: crypto.randomUUID(), bytes, durationMs, mediaType: "audio/wav", sampleRateHz: 24_000, provider: "codex", timeoutMs: 120_000 };
}

export function notifyDictationRecordingsChanged() {
  window.dispatchEvent(new CustomEvent(DICTATION_RECORDINGS_CHANGED));
}

export function dictationAudioBlob(bytes: Uint8Array): Blob {
  return new Blob([new Uint8Array(bytes).buffer], { type: "audio/wav" });
}

export function dictationMessage(error: unknown): string {
  return error instanceof Error ? error.message : "音声入力の記録を開けませんでした。もう一度お試しください。";
}
