/** Returning-player gate: one primary action into the next unsolved puzzle. */
export class ContinueOverlay {
  private readonly root: HTMLDivElement;
  private readonly nextLabel: HTMLParagraphElement;

  constructor(onContinue: () => void, onCampaign: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'continue-overlay';
    this.root.hidden = true;
    this.root.innerHTML = `
      <section class="continue-overlay__panel" aria-label="Continue game">
        <span class="continue-overlay__kicker">Living terrain awaits</span>
        <h1>Continue</h1>
        <p class="continue-overlay__next"></p>
        <div class="continue-overlay__actions"></div>
      </section>`;
    this.nextLabel = this.root.querySelector('.continue-overlay__next') as HTMLParagraphElement;
    const actions = this.root.querySelector('.continue-overlay__actions') as HTMLDivElement;
    const continueButton = document.createElement('button');
    continueButton.type = 'button';
    continueButton.className = 'continue-overlay__primary';
    continueButton.textContent = 'Continue';
    continueButton.addEventListener('click', onContinue);
    const campaignButton = document.createElement('button');
    campaignButton.type = 'button';
    campaignButton.textContent = 'Campaign';
    campaignButton.addEventListener('click', onCampaign);
    actions.append(continueButton, campaignButton);
    document.body.append(this.root);
  }

  show(levelName: string): void {
    this.nextLabel.textContent = `Next puzzle: ${levelName}`;
    this.root.hidden = false;
    (this.root.querySelector('.continue-overlay__primary') as HTMLButtonElement).focus();
  }

  hide(): void {
    this.root.hidden = true;
  }

  destroy(): void {
    this.root.remove();
  }
}
