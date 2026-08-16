import { DEVICE_PROFILE } from '../deviceProfile';
import { BodyModalLock, registerBodyModalChild } from '../lifecycle/BodyModalLock';
import { PORTRAIT_MODAL_CHANGE_EVENT } from '../lifecycle/PortraitModalGate';
import { IS_PLAYER_EXPERIENCE } from '../runtimeMode';

/** One-action boot splash; gameplay objects are created only after Start. */
export class TitleScreen {
  private readonly root: HTMLDivElement;
  private readonly startButton: HTMLButtonElement;
  private readonly modalLock: BodyModalLock;
  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
    if (this.root.inert || this.root.getAttribute('aria-hidden') === 'true' || this.portraitModalActive()) return;
    event.preventDefault();
    this.start();
  };
  private readonly handlePortraitModalChange = (event: Event) => {
    const active = (event as CustomEvent<{ active: boolean }>).detail.active;
    if (!active && this.root.isConnected && !this.root.inert) this.startButton.focus({ preventScroll: true });
  };

  constructor(private readonly onStart: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'title-screen';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-labelledby', 'lemmingx-title-heading');

    const art = document.createElement('img');
    art.className = 'title-screen__art';
    art.src = `${import.meta.env.BASE_URL}assets/title-splash.png`;
    art.alt = '';
    art.draggable = false;

    const content = document.createElement('main');
    content.className = 'title-screen__content';
    content.innerHTML = `
      <p class="title-screen__kicker">Living terrain. One brave swarm.</p>
      <h1 class="title-screen__title" id="lemmingx-title-heading"><span>Lemmings</span> <b>X</b></h1>
      <button class="title-screen__start" type="button">START</button>`;
    this.startButton = content.querySelector('.title-screen__start') as HTMLButtonElement;
    this.startButton.addEventListener('click', () => this.start());

    const debug = document.createElement('div');
    debug.className = 'title-screen__debug';
    debug.setAttribute('aria-label', 'Build information');
    for (const line of [
      `v${__APP_VERSION__} · ${__BUILD_TAG__} · ${__BUILD_COMMIT__}`,
      __BUILD_MESSAGE__,
      `${IS_PLAYER_EXPERIENCE ? 'player' : 'sandbox'} · ${DEVICE_PROFILE}`,
    ]) {
      const span = document.createElement('span');
      span.textContent = line;
      debug.append(span);
    }

    this.root.append(art, content, debug);
    document.body.append(this.root);
    registerBodyModalChild(this.root);
    this.modalLock = new BodyModalLock(this.root, (element) => element.classList.contains('rotate-notice'));
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener(PORTRAIT_MODAL_CHANGE_EVENT, this.handlePortraitModalChange);
    if (!this.portraitModalActive() && !this.root.inert) this.startButton.focus({ preventScroll: true });
  }

  private start(): void {
    if (!this.root.isConnected) return;
    this.hide();
    this.onStart();
  }

  hide(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener(PORTRAIT_MODAL_CHANGE_EVENT, this.handlePortraitModalChange);
    this.modalLock.release();
    this.root.remove();
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener(PORTRAIT_MODAL_CHANGE_EVENT, this.handlePortraitModalChange);
    this.modalLock.release();
    this.root.remove();
  }

  private portraitModalActive(): boolean {
    return document.querySelector('.rotate-notice[data-active="true"]') !== null;
  }
}
