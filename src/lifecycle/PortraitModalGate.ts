import { BodyModalLock } from './BodyModalLock';

export const PORTRAIT_MODAL_CHANGE_EVENT = 'lemmingx:portrait-modal-change';
export interface PortraitModalChangeDetail {
  readonly active: boolean;
  readonly previousFocus: HTMLElement | null;
}

interface PortraitQuery {
  readonly matches: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

/** Makes the visible rotate notice the sole keyboard and accessibility surface. */
export class PortraitModalGate {
  private lock: BodyModalLock | null = null;
  private previousFocus: HTMLElement | null = null;
  private started = false;
  private readonly handleChange = () => this.update();

  constructor(
    private readonly notice: HTMLElement,
    private readonly query: PortraitQuery,
  ) {}

  start(): void {
    if (this.started) return;
    this.started = true;
    this.query.addEventListener('change', this.handleChange);
    this.update();
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.query.removeEventListener('change', this.handleChange);
    this.leavePortrait(false);
  }

  private update(): void {
    if (this.query.matches) this.enterPortrait();
    else this.leavePortrait(true);
  }

  private enterPortrait(): void {
    if (this.lock) return;
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.notice.dataset.active = 'true';
    document.body.classList.add('is-portrait-modal');
    this.notice.removeAttribute('aria-hidden');
    this.notice.setAttribute('role', 'dialog');
    this.notice.setAttribute('aria-modal', 'true');
    this.lock = new BodyModalLock(this.notice);
    this.notice.focus({ preventScroll: true });
    this.dispatch(true, null);
  }

  private leavePortrait(restoreFocus: boolean): void {
    if (!this.lock) return;
    this.lock.release();
    this.lock = null;
    delete this.notice.dataset.active;
    document.body.classList.remove('is-portrait-modal');
    this.notice.setAttribute('aria-hidden', 'true');
    this.notice.removeAttribute('aria-modal');
    this.notice.setAttribute('role', 'status');
    if (restoreFocus && this.previousFocus?.isConnected && !this.previousFocus.inert) {
      this.previousFocus.focus({ preventScroll: true });
    }
    this.dispatch(false, this.previousFocus);
    this.previousFocus = null;
  }

  private dispatch(active: boolean, previousFocus: HTMLElement | null): void {
    window.dispatchEvent(new CustomEvent<PortraitModalChangeDetail>(PORTRAIT_MODAL_CHANGE_EVENT, {
      detail: { active, previousFocus },
    }));
  }
}
