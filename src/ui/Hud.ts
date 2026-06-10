import type { SimulationState, Skill } from '../sim/types';
import { ALL_SKILLS } from '../sim/types';
import { SKILL_DEFS } from '../sim/skills/registry';

export type HudEvents = {
  onSelectSkill: (skill: Skill) => void;
  onNuke: () => void;
  onReleaseRate: (delta: number) => void;
  onRestart: () => void;
  onTogglePause: () => void;
  onCycleSpeed: () => void;
  /** Advance to the next level (only meaningful from the win overlay). */
  onNext?: () => void;
};

/** Extra read-only display info the scene feeds the HUD each frame. */
export interface HudView {
  paused: boolean;
  speed: number; // 1 = normal, 2/3 = fast-forward
  nukeReady: boolean;
  hoveredJob: string | null; // label of the lemming under the cursor
  levelName: string;
  hasNextLevel: boolean;
}

const SKILLS = ALL_SKILLS.map((skill) => ({
  skill,
  label: SKILL_DEFS[skill].label,
  icon: SKILL_DEFS[skill].icon,
  hotkey: SKILL_DEFS[skill].hotkey,
}));

function formatTime(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export class Hud {
  private readonly root: HTMLDivElement;
  private readonly statusBar: HTMLDivElement;
  private readonly skillButtons = new Map<Skill, HTMLButtonElement>();
  private readonly releaseValue: HTMLSpanElement;
  private readonly nukeButton: HTMLButtonElement;
  private readonly pauseButton: HTMLButtonElement;
  private readonly speedButton: HTMLButtonElement;
  private readonly notice: HTMLDivElement;
  private readonly overlay: HTMLDivElement;
  private readonly events: HudEvents;

  constructor(events: HudEvents) {
    this.events = events;
    this.root = document.createElement('div');
    this.root.className = 'hud';

    // --- Top status bar: level name + live counters + timer ---
    this.statusBar = document.createElement('div');
    this.statusBar.className = 'hud__status';
    this.root.append(this.statusBar);

    // --- Bottom control bar ---
    const bar = document.createElement('div');
    bar.className = 'hud__bar';

    const tools = document.createElement('div');
    tools.className = 'hud__tools';
    for (const item of SKILLS) {
      const button = document.createElement('button');
      button.className = 'hud__tool';
      button.type = 'button';
      button.title = `${item.label} (${item.hotkey})`;
      button.setAttribute('aria-label', item.label);
      button.dataset.skill = item.skill;
      button.innerHTML =
        `<span class="hud__hotkey">${item.hotkey}</span>` +
        `<span class="hud__tool-name">${item.label}</span>` +
        `<span class="hud__stock">0</span>`;
      button.addEventListener('click', () => events.onSelectSkill(item.skill));
      tools.append(button);
      this.skillButtons.set(item.skill, button);
    }

    const controls = document.createElement('div');
    controls.className = 'hud__controls';

    const release = document.createElement('div');
    release.className = 'hud__release';
    const minus = this.makeButton('−', 'Slower release rate', () => events.onReleaseRate(-5));
    this.releaseValue = document.createElement('span');
    this.releaseValue.className = 'hud__release-value';
    const plus = this.makeButton('+', 'Faster release rate', () => events.onReleaseRate(5));
    release.append(minus, this.releaseValue, plus);

    this.pauseButton = this.makeButton('▮▮', 'Pause / resume (Space)', events.onTogglePause);
    this.pauseButton.className = 'hud__btn hud__pause';
    this.speedButton = this.makeButton('▶', 'Speed (F)', events.onCycleSpeed);
    this.speedButton.className = 'hud__btn hud__speed';

    this.nukeButton = document.createElement('button');
    this.nukeButton.className = 'hud__btn hud__nuke';
    this.nukeButton.type = 'button';
    this.nukeButton.title = 'Nuke all (N)';
    this.nukeButton.innerHTML = '<span>☢ Nuke</span>';
    this.nukeButton.addEventListener('click', events.onNuke);

    const restartButton = this.makeButton('⟲ Restart', 'Restart (R)', events.onRestart);
    restartButton.className = 'hud__btn hud__restart';

    controls.append(release, this.pauseButton, this.speedButton, this.nukeButton, restartButton);
    bar.append(tools, controls);
    this.root.append(bar);

    // --- Floating notice (selected skill / hovered job) ---
    this.notice = document.createElement('div');
    this.notice.className = 'hud__notice';
    this.root.append(this.notice);

    // --- Win/lose overlay (hidden until outcome resolves) ---
    this.overlay = document.createElement('div');
    this.overlay.className = 'hud__overlay';
    this.overlay.hidden = true;
    this.root.append(this.overlay);

    document.body.append(this.root);
  }

  private makeButton(text: string, title: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = title;
    b.setAttribute('aria-label', title);
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  }

  update(state: SimulationState, view: HudView): void {
    // Status bar.
    const timer =
      state.timeRemainingMs !== null
        ? `<span class="hud__timer${state.timeRemainingMs < 15000 ? ' is-low' : ''}">⏱ ${formatTime(state.timeRemainingMs)}</span>`
        : '';
    this.statusBar.innerHTML =
      `<span class="hud__level">${view.levelName}</span>` +
      `<span class="hud__stat">Saved <strong>${state.saved}/${state.targetSaved}</strong></span>` +
      `<span class="hud__stat">Out <strong>${state.spawned}/${state.totalLemmings}</strong></span>` +
      `<span class="hud__stat">Lost <strong>${state.lost}</strong></span>` +
      timer;

    this.releaseValue.textContent = `Rate ${state.releaseRate}`;

    const running = state.outcome === 'running';
    for (const [skill, button] of this.skillButtons) {
      const stock = button.querySelector('.hud__stock');
      if (stock) stock.textContent = String(state.skills[skill]);
      button.classList.toggle('is-active', skill === state.selectedSkill);
      button.disabled = state.skills[skill] <= 0 || !running;
    }

    this.nukeButton.disabled = !view.nukeReady;
    this.pauseButton.classList.toggle('is-active', view.paused);
    this.pauseButton.textContent = view.paused ? '▶' : '▮▮';
    this.speedButton.textContent = view.speed > 1 ? `▶▶ ${view.speed}×` : '▶ 1×';
    this.speedButton.classList.toggle('is-active', view.speed > 1);

    this.notice.textContent = this.noticeText(state, view);
    this.notice.hidden = state.outcome !== 'running';

    this.renderOverlay(state, view);
  }

  private renderOverlay(state: SimulationState, view: HudView): void {
    if (state.outcome === 'running') {
      this.overlay.hidden = true;
      this.overlay.innerHTML = '';
      return;
    }
    if (!this.overlay.hidden) return; // already built for this outcome

    const won = state.outcome === 'won';
    const pct = Math.round((state.saved / Math.max(1, state.totalLemmings)) * 100);
    this.overlay.hidden = false;
    this.overlay.innerHTML = `
      <div class="hud__panel ${won ? 'is-win' : 'is-lose'}">
        <h1>${won ? 'Level Cleared!' : 'Out of Lemmings'}</h1>
        <p class="hud__panel-sub">${won ? 'You met the rescue quota.' : 'Not enough made it home.'}</p>
        <div class="hud__panel-stats">
          <span>Saved <strong>${state.saved}/${state.targetSaved}</strong></span>
          <span>Rescued <strong>${pct}%</strong></span>
          <span>Lost <strong>${state.lost}</strong></span>
        </div>
        <div class="hud__panel-actions"></div>
      </div>`;
    const actions = this.overlay.querySelector('.hud__panel-actions') as HTMLDivElement;
    if (won && view.hasNextLevel && this.events.onNext) {
      const next = this.makeButton('Next Level →', 'Next level', this.events.onNext);
      next.className = 'hud__btn hud__primary';
      actions.append(next);
    }
    const retry = this.makeButton(won ? 'Replay' : 'Try Again', 'Restart', this.events.onRestart);
    retry.className = 'hud__btn';
    actions.append(retry);
  }

  destroy(): void {
    this.root.remove();
  }

  private noticeText(state: SimulationState, view: HudView): string {
    if (view.paused) return 'Paused';
    if (view.hoveredJob) return `${view.hoveredJob} — click to assign ${state.selectedSkill}`;
    return `${SKILL_DEFS[state.selectedSkill].label} selected — click a lemming`;
  }
}
