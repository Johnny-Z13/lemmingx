import { BodyModalLock, registerBodyModalChild } from '../lifecycle/BodyModalLock';

export type ResumeReason = 'focus';

const COPY: Record<ResumeReason, { kicker: string; title: string; body: string }> = {
  focus: {
    kicker: 'Run paused',
    title: 'Ready when you are',
    body: 'The world and crew stay frozen while this tab is away.',
  },
};

/** Blocking return surface used after focus loss or a phone rotation. */
export class ResumeOverlay {
  private readonly root: HTMLDivElement;
  private readonly kicker: HTMLSpanElement;
  private readonly title: HTMLHeadingElement;
  private readonly body: HTMLParagraphElement;
  private readonly button: HTMLButtonElement;
  private modalLock: BodyModalLock | null = null;
  private previousFocus: HTMLElement | null = null;

  constructor(onResume: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'resume-overlay';
    this.root.hidden = true;
    this.root.innerHTML = `
      <section class="resume-overlay__panel" role="dialog" aria-modal="true" aria-labelledby="resume-title">
        <span class="resume-overlay__kicker"></span>
        <h2 id="resume-title"></h2>
        <p></p>
        <button class="resume-overlay__button" type="button">Resume</button>
      </section>`;
    this.kicker = this.root.querySelector('.resume-overlay__kicker') as HTMLSpanElement;
    this.title = this.root.querySelector('#resume-title') as HTMLHeadingElement;
    this.body = this.root.querySelector('.resume-overlay__panel p') as HTMLParagraphElement;
    this.button = this.root.querySelector('.resume-overlay__button') as HTMLButtonElement;
    this.button.addEventListener('click', onResume);
    document.body.append(this.root);
    registerBodyModalChild(this.root);
    this.setReason('focus');
  }

  show(reason: ResumeReason = 'focus'): void {
    this.setReason(reason);
    if (!this.root.hidden) return;
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.root.hidden = false;
    this.modalLock = new BodyModalLock(this.root);
    if (!this.root.inert) this.button.focus({ preventScroll: true });
  }

  hide(): void {
    if (this.root.hidden) return;
    this.root.hidden = true;
    this.modalLock?.release();
    this.modalLock = null;
    if (this.previousFocus?.isConnected && !this.previousFocus.inert && this.previousFocus.getClientRects().length > 0) {
      this.previousFocus.focus({ preventScroll: true });
    }
    this.previousFocus = null;
  }

  destroy(): void {
    this.modalLock?.release();
    this.modalLock = null;
    this.root.remove();
  }

  private setReason(reason: ResumeReason): void {
    const copy = COPY[reason];
    this.kicker.textContent = copy.kicker;
    this.title.textContent = copy.title;
    this.body.textContent = copy.body;
  }
}
