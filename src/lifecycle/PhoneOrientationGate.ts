export const PHONE_PORTRAIT_QUERY = '(orientation: portrait) and (max-width: 760px)';

interface OrientationQuery {
  readonly matches: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

/**
 * Reports the initial and subsequent phone-portrait states. Leaving portrait
 * deliberately does not resume the game; the player must confirm through the
 * existing lifecycle overlay after rotating.
 */
export class PhoneOrientationGate {
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
