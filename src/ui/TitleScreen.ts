import { DEVICE_PROFILE } from '../deviceProfile';
import { IS_PLAYER_EXPERIENCE } from '../runtimeMode';

/** One-action boot splash; gameplay objects are created only after Start. */
export class TitleScreen {
  private readonly root: HTMLDivElement;
  private readonly startButton: HTMLButtonElement;
  private readonly priorInert = new Map<HTMLElement, boolean>();
  private readonly priorAriaHidden = new Map<HTMLElement, string | null>();
  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
    event.preventDefault();
    this.start();
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
    for (const sibling of Array.from(document.body.children)) {
      if (!(sibling instanceof HTMLElement) || sibling === this.root || sibling.classList.contains('rotate-notice')) continue;
      this.priorInert.set(sibling, sibling.inert);
      this.priorAriaHidden.set(sibling, sibling.getAttribute('aria-hidden'));
      sibling.inert = true;
      sibling.setAttribute('aria-hidden', 'true');
    }
    window.addEventListener('keydown', this.handleKeyDown);
    this.startButton.focus({ preventScroll: true });
  }

  private start(): void {
    if (!this.root.isConnected) return;
    this.hide();
    this.onStart();
  }

  hide(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.restoreBackground();
    this.root.remove();
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.restoreBackground();
    this.root.remove();
  }

  private restoreBackground(): void {
    for (const [element, inert] of this.priorInert) element.inert = inert;
    for (const [element, ariaHidden] of this.priorAriaHidden) {
      if (ariaHidden === null) element.removeAttribute('aria-hidden');
      else element.setAttribute('aria-hidden', ariaHidden);
    }
    this.priorInert.clear();
    this.priorAriaHidden.clear();
  }
}
