export const TOOL_HOLD_DELAY_MS = 420;
export const TOOL_HOLD_MOVE_THRESHOLD_PX = 8;

export interface ToolHoldRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export function movedPastToolHoldThreshold(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
): boolean {
  return Math.hypot(currentX - startX, currentY - startY) >= TOOL_HOLD_MOVE_THRESHOLD_PX;
}

export function toolHoldLabelPosition(
  anchor: ToolHoldRect,
  label: Pick<ToolHoldRect, 'width' | 'height'>,
  viewportWidth: number,
  viewportHeight: number,
): { left: number; top: number } {
  const margin = 8;
  const gap = 8;
  const halfWidth = label.width / 2;
  const unclampedLeft = anchor.left + anchor.width / 2;
  const left = Math.min(
    viewportWidth - margin - halfWidth,
    Math.max(margin + halfWidth, unclampedLeft),
  );
  const above = anchor.top - label.height - gap;
  const below = anchor.bottom + gap;
  const top = above >= margin
    ? above
    : Math.min(viewportHeight - margin - label.height, below);
  return { left, top: Math.max(margin, top) };
}

interface ActiveToolHold {
  button: HTMLButtonElement;
  pointerId: number;
  startX: number;
  startY: number;
  label: string;
  timer: number;
  revealed: boolean;
}

/** Touch-only, transient capability label for the compact bottom ribbon. */
export class ToolHoldLabel {
  readonly element: HTMLDivElement;
  private active: ActiveToolHold | null = null;
  private readonly suppressedClicks = new WeakSet<HTMLButtonElement>();
  private readonly handlePointerMove = (event: PointerEvent) => {
    const active = this.active;
    if (!active || active.pointerId !== event.pointerId) return;
    if (movedPastToolHoldThreshold(active.startX, active.startY, event.clientX, event.clientY)) {
      this.finishActive();
    }
  };
  private readonly handlePointerEnd = (event: PointerEvent) => {
    if (this.active?.pointerId === event.pointerId) this.finishActive();
  };
  private readonly handleInterruption = () => this.finishActive();

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'hud__tool-hold-label';
    this.element.setAttribute('aria-hidden', 'true');
    this.element.hidden = true;
    parent.append(this.element);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerEnd);
    window.addEventListener('pointercancel', this.handlePointerEnd);
    window.addEventListener('blur', this.handleInterruption);
    window.addEventListener('resize', this.handleInterruption);
  }

  attach(button: HTMLButtonElement, label: string): void {
    button.dataset.holdLabel = label;
    button.addEventListener('pointerdown', (event) => this.begin(event, button, label));
    button.addEventListener('contextmenu', (event) => event.preventDefault());
    button.addEventListener('click', (event) => {
      if (!this.suppressedClicks.has(button)) return;
      this.suppressedClicks.delete(button);
      event.preventDefault();
      event.stopImmediatePropagation();
    }, { capture: true });
  }

  destroy(): void {
    this.finishActive();
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerEnd);
    window.removeEventListener('pointercancel', this.handlePointerEnd);
    window.removeEventListener('blur', this.handleInterruption);
    window.removeEventListener('resize', this.handleInterruption);
    this.element.remove();
  }

  private begin(
    event: PointerEvent,
    button: HTMLButtonElement,
    label: string,
  ): void {
    if (event.pointerType === 'mouse' || event.button !== 0 || button.disabled) return;
    this.finishActive();
    this.suppressedClicks.delete(button);
    const pointerId = event.pointerId;
    const active: ActiveToolHold = {
      button,
      pointerId,
      startX: event.clientX,
      startY: event.clientY,
      label,
      timer: 0,
      revealed: false,
    };
    active.timer = window.setTimeout(() => this.reveal(pointerId), TOOL_HOLD_DELAY_MS);
    this.active = active;
  }

  private reveal(pointerId: number): void {
    const active = this.active;
    if (!active || active.pointerId !== pointerId) return;
    active.revealed = true;
    this.suppressedClicks.add(active.button);
    this.element.textContent = active.label;
    this.element.hidden = false;
    const anchor = active.button.getBoundingClientRect();
    const label = this.element.getBoundingClientRect();
    const position = toolHoldLabelPosition(anchor, label, window.innerWidth, window.innerHeight);
    this.element.style.left = `${position.left}px`;
    this.element.style.top = `${position.top}px`;
  }

  private finishActive(): void {
    const active = this.active;
    if (!active) {
      this.element.hidden = true;
      return;
    }
    window.clearTimeout(active.timer);
    this.active = null;
    this.element.hidden = true;
    if (active.revealed) {
      window.setTimeout(() => this.suppressedClicks.delete(active.button), 500);
    }
  }
}
