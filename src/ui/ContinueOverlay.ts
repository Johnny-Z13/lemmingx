export interface ContinueOverlayView {
  levelName: string;
  salvage: number;
  rescuedTotal: number;
  workshopBuilt: number;
  awayHours: number;
  awaySalvage: number;
  metaUnlocked: boolean;
}

/** Returning-player gate: one primary action into the next unsolved rescue. */
export class ContinueOverlay {
  private readonly root: HTMLDivElement;
  private readonly nextLabel: HTMLParagraphElement;
  private readonly returnLabel: HTMLParagraphElement;
  private readonly workshopButton: HTMLButtonElement;

  constructor(onContinue: () => void, onWorkshop: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'continue-overlay';
    this.root.hidden = true;
    this.root.innerHTML = `
      <section class="continue-overlay__panel" aria-label="Continue game">
        <span class="continue-overlay__kicker">The Workshop kept moving</span>
        <div class="continue-overlay__vignette" aria-hidden="true">
          <i class="continue-overlay__tower"></i>
          <i class="continue-overlay__cargo"></i>
          <i class="continue-overlay__crew"></i>
        </div>
        <h1>Back to the rescue</h1>
        <p class="continue-overlay__next"></p>
        <p class="continue-overlay__return"></p>
        <div class="continue-overlay__actions"></div>
      </section>`;
    this.nextLabel = this.root.querySelector('.continue-overlay__next') as HTMLParagraphElement;
    this.returnLabel = this.root.querySelector('.continue-overlay__return') as HTMLParagraphElement;
    const actions = this.root.querySelector('.continue-overlay__actions') as HTMLDivElement;
    const continueButton = document.createElement('button');
    continueButton.type = 'button';
    continueButton.className = 'continue-overlay__primary';
    continueButton.textContent = 'Continue';
    continueButton.addEventListener('click', onContinue);
    this.workshopButton = document.createElement('button');
    this.workshopButton.type = 'button';
    this.workshopButton.textContent = 'Workshop';
    this.workshopButton.addEventListener('click', onWorkshop);
    actions.append(continueButton, this.workshopButton);
    document.body.append(this.root);
  }

  show(view: ContinueOverlayView): void {
    this.nextLabel.textContent = `Next rescue: ${view.levelName}`;
    this.returnLabel.textContent = view.awaySalvage > 0
      ? `${view.awayHours}h away · ${view.awaySalvage} Salvage produced · ${view.salvage} ready`
      : `${view.rescuedTotal} crew home · ${view.workshopBuilt}/6 projects built · ${view.salvage} Salvage`;
    this.workshopButton.hidden = !view.metaUnlocked;
    this.root.classList.toggle('has-away-change', view.awaySalvage > 0);
    this.root.hidden = false;
    (this.root.querySelector('.continue-overlay__primary') as HTMLButtonElement).focus({ preventScroll: true });
  }

  hide(): void {
    this.root.hidden = true;
  }

  isVisible(): boolean {
    return !this.root.hidden;
  }

  destroy(): void {
    this.root.remove();
  }
}
