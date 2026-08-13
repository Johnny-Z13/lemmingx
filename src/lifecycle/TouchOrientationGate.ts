export const TOUCH_PORTRAIT_QUERY = '(orientation: portrait)';

interface OrientationQuery {
  readonly matches: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

/**
 * Reports portrait transitions for devices already classified as Mobile.
 * Desktop callers never construct this gate, regardless of viewport shape.
 * Leaving portrait deliberately does not resume the game; the player confirms
 * through the existing lifecycle overlay after rotating.
 */
export class TouchOrientationGate {
  private started = false;
  private readonly handleChange = () => {
    if (this.query.matches) this.onPortrait();
  };

  constructor(
    private readonly query: OrientationQuery,
    private readonly onPortrait: () => void,
  ) {}

  start(): void {
    if (this.started) return;
    this.started = true;
    this.query.addEventListener('change', this.handleChange);
    this.handleChange();
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.query.removeEventListener('change', this.handleChange);
  }

  isPortrait(): boolean {
    return this.query.matches;
  }
}
