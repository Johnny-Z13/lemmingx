import type { SimulationState, Skill } from '../sim/types';
import { ALL_SKILLS } from '../sim/types';
import { SKILL_DEFS } from '../sim/skills/registry';

type HudEvents = {
  onSelectSkill: (skill: Skill) => void;
  onNuke: () => void;
  onReleaseRate: (delta: number) => void;
  onRestart: () => void;
};

const SKILLS: Array<{ skill: Skill; label: string; icon: string }> = ALL_SKILLS.map((skill) => ({
  skill,
  label: SKILL_DEFS[skill].label,
  icon: SKILL_DEFS[skill].icon,
}));

export class Hud {
  private readonly root: HTMLDivElement;
  private readonly counters: HTMLDivElement;
  private readonly releaseValue: HTMLSpanElement;
  private readonly skillButtons = new Map<Skill, HTMLButtonElement>();
  private readonly nukeButton: HTMLButtonElement;
  private readonly notice: HTMLDivElement;

  constructor(events: HudEvents) {
    this.root = document.createElement('div');
    this.root.className = 'hud';

    const bar = document.createElement('div');
    bar.className = 'hud__bar';

    const brand = document.createElement('div');
    brand.className = 'hud__brand';
    brand.innerHTML = '<strong>LemmingX</strong><span>Fun 1: Just Dig-ish</span>';

    const tools = document.createElement('div');
    tools.className = 'hud__tools';
    for (const item of SKILLS) {
      const button = document.createElement('button');
      button.className = 'hud__tool';
      button.type = 'button';
      button.title = item.label;
      button.setAttribute('aria-label', item.label);
      button.dataset.skill = item.skill;
      button.innerHTML = `<span class="hud__icon">${item.icon}</span><span class="hud__tool-name">${item.label}</span><span class="hud__stock">0</span>`;
      button.addEventListener('click', () => events.onSelectSkill(item.skill));
      tools.append(button);
      this.skillButtons.set(item.skill, button);
    }

    const release = document.createElement('div');
    release.className = 'hud__release';
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.title = 'Slower release rate';
    minus.setAttribute('aria-label', 'Slower release rate');
    minus.textContent = '-';
    minus.addEventListener('click', () => events.onReleaseRate(-5));
    this.releaseValue = document.createElement('span');
    this.releaseValue.className = 'hud__release-value';
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.title = 'Faster release rate';
    plus.setAttribute('aria-label', 'Faster release rate');
    plus.textContent = '+';
    plus.addEventListener('click', () => events.onReleaseRate(5));
    release.append(minus, this.releaseValue, plus);

    this.nukeButton = document.createElement('button');
    this.nukeButton.className = 'hud__nuke';
    this.nukeButton.type = 'button';
    this.nukeButton.title = 'Nuke all (mass self-destruct)';
    this.nukeButton.setAttribute('aria-label', 'Nuke all');
    this.nukeButton.innerHTML = '<span class="hud__icon">!</span><span>Nuke</span>';
    this.nukeButton.addEventListener('click', events.onNuke);

    const restartButton = document.createElement('button');
    restartButton.className = 'hud__restart';
    restartButton.type = 'button';
    restartButton.title = 'Restart';
    restartButton.setAttribute('aria-label', 'Restart');
    restartButton.textContent = 'Restart';
    restartButton.addEventListener('click', events.onRestart);

    this.counters = document.createElement('div');
    this.counters.className = 'hud__counters';

    bar.append(brand, tools, release, this.nukeButton, this.counters, restartButton);
    this.notice = document.createElement('div');
    this.notice.className = 'hud__notice';
    this.root.append(bar, this.notice);
    document.body.append(this.root);
  }

  update(state: SimulationState, nukeReady: boolean): void {
    this.counters.innerHTML = `
      <span>Saved <strong>${state.saved}/${state.targetSaved}</strong></span>
      <span>Out <strong>${state.spawned}/${state.totalLemmings}</strong></span>
      <span>Lost <strong>${state.lost}</strong></span>
    `;
    this.releaseValue.textContent = `Rate ${state.releaseRate}`;
    for (const [skill, button] of this.skillButtons) {
      const stock = button.querySelector('.hud__stock');
      if (stock) stock.textContent = String(state.skills[skill]);
      button.classList.toggle('is-active', skill === state.selectedSkill);
      button.disabled = state.skills[skill] <= 0 || state.outcome !== 'running';
    }
    this.nukeButton.disabled = !nukeReady;
    this.notice.textContent = this.noticeText(state);
  }

  destroy(): void {
    this.root.remove();
  }

  private noticeText(state: SimulationState): string {
    if (state.outcome === 'won') return 'Route secured';
    if (state.outcome === 'lost') return 'Crew lost';
    return `${state.selectedSkill.toUpperCase()} selected - click a lemming`;
  }
}
