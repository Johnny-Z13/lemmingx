/** Full-screen DOM level-select: a card per level with lock/best-% state. */

export interface LevelCard {
  index: number;
  name: string;
  unlocked: boolean;
  completed: boolean;
  bestSavedPct: number;
}

export class LevelSelect {
  private readonly root: HTMLDivElement;
  private readonly grid: HTMLDivElement;

  constructor(private readonly onPick: (index: number) => void) {
    this.root = document.createElement('div');
    this.root.className = 'select';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="select__panel">
        <h1 class="select__title">LemmingX</h1>
        <p class="select__sub">Pick a level — clear it to unlock the next.</p>
        <div class="select__grid"></div>
      </div>`;
    this.grid = this.root.querySelector('.select__grid') as HTMLDivElement;
    document.body.append(this.root);
  }

  show(cards: LevelCard[]): void {
    this.grid.innerHTML = '';
    for (const card of cards) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'select__card';
      button.disabled = !card.unlocked;
      button.classList.toggle('is-completed', card.completed);
      const status = !card.unlocked
        ? '<span class="select__lock">🔒</span>'
        : card.completed
          ? `<span class="select__best">★ ${card.bestSavedPct}%</span>`
          : '<span class="select__best select__best--new">NEW</span>';
      button.innerHTML =
        `<span class="select__num">${card.index + 1}</span>` +
        `<span class="select__name">${card.name}</span>` +
        status;
      button.addEventListener('click', () => this.onPick(card.index));
      this.grid.append(button);
    }
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }

  destroy(): void {
    this.root.remove();
  }
}
