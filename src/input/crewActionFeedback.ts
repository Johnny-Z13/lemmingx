export type CrewActionFeedbackKind = 'accepted' | 'missed';

const FEEDBACK_DURATION_MS = 1400;

const FEEDBACK_TEXT: Record<CrewActionFeedbackKind, string> = {
  accepted: 'ORDER SET — BASHER FIRES AT THE DAM',
  missed: 'MISSED — TAP INSIDE THE GOLD RING',
};

/** Small scene-side timer for explicit first-action acknowledgement. */
export class CrewActionFeedback {
  private text: string | null = null;
  private expiresAtMs = 0;

  show(kind: CrewActionFeedbackKind, nowMs: number): void {
    this.text = FEEDBACK_TEXT[kind];
    this.expiresAtMs = nowMs + FEEDBACK_DURATION_MS;
  }

  current(nowMs: number): string | null {
    if (this.text === null || nowMs >= this.expiresAtMs) return null;
    return this.text;
  }

  reset(): void {
    this.text = null;
    this.expiresAtMs = 0;
  }
}
