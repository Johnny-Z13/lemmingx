export interface MotionMediaQueryList {
  readonly matches: boolean;
  addEventListener?: (type: 'change', listener: (event: { matches: boolean }) => void) => void;
  removeEventListener?: (type: 'change', listener: (event: { matches: boolean }) => void) => void;
  addListener?: (listener: (event: { matches: boolean }) => void) => void;
  removeListener?: (listener: (event: { matches: boolean }) => void) => void;
}

export type MatchMediaLike = (query: string) => MotionMediaQueryList;

/** Live render-only accessibility preference; simulation time is never altered. */
export class RenderMotionPreference {
  reduced = false;
  private query?: MotionMediaQueryList;
  private readonly handleChange = (event: { matches: boolean }) => {
    this.reduced = event.matches;
  };

  start(matchMedia: MatchMediaLike | undefined = globalThis.matchMedia?.bind(globalThis)): void {
    this.stop();
    if (!matchMedia) {
      this.reduced = false;
      return;
    }
    this.query = matchMedia('(prefers-reduced-motion: reduce)');
    this.reduced = this.query.matches;
    if (this.query.addEventListener) this.query.addEventListener('change', this.handleChange);
    else this.query.addListener?.(this.handleChange);
  }

  stop(): void {
    if (this.query?.removeEventListener) this.query.removeEventListener('change', this.handleChange);
    else this.query?.removeListener?.(this.handleChange);
    this.query = undefined;
  }
}
