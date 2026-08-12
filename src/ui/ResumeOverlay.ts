/** Blocking return surface used after the page loses visibility or focus. */
export class ResumeOverlay {
  private readonly root: HTMLDivElement;

  constructor(onResume: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'resume-overlay';
    this.root.hidden = true;
    this.root.innerHTML = `
      <section class="resume-overlay__panel" role="dialog" aria-modal="true" aria-labelledby="resume-title">
        <span class="resume-overlay__kicker">Run paused</span>
        <h2 id="resume-title">Ready when you are</h2>
        <p>The world and crew stay frozen while this tab is away.</p>
        <button class="resume-overlay__button" type="button">Resume</button>
      </section>`;
    const button = this.root.querySelector('.resume-overlay__button') as HTMLButtonElement;
    button.addEventListener('click', onResume);
    document.body.append(this.root);
  }

  show(): void {
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }

  destroy(): void {
    this.root.remove();
  }
}
