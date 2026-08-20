import { BodyModalLock, registerBodyModalChild } from '../lifecycle/BodyModalLock';
import type { SwarmwrightSaveV2, WorkshopProjectId } from '../progress';
import { ATLAS_ENTRIES, WORKSHOP_PROJECTS, dailyForUtcDate, utcDateString, workshopProjectAvailable, type DailyRescueDefinition } from './catalog';
import './workshop.css';

export interface WorkshopOverlayEvents {
  onContinue: () => void;
  onPurchase: (id: WorkshopProjectId, cost: number) => void;
  onDaily: (daily: DailyRescueDefinition, date: string) => void;
  onTestYard: () => void;
}

/** Returning/meta surface, dynamically imported after rescue play is established. */
export class WorkshopOverlay {
  private readonly root: HTMLDivElement;
  private modalLock: BodyModalLock | null = null;
  private save: SwarmwrightSaveV2 | null = null;

  constructor(private readonly events: WorkshopOverlayEvents) {
    this.root = document.createElement('div');
    this.root.className = 'workshop';
    this.root.hidden = true;
    document.body.append(this.root);
    registerBodyModalChild(this.root);
  }

  show(save: SwarmwrightSaveV2): void {
    this.save = save;
    this.render();
    this.root.hidden = false;
    this.modalLock?.release();
    this.modalLock = new BodyModalLock(this.root);
    this.root.querySelector<HTMLButtonElement>('[data-action="continue"]')?.focus({ preventScroll: true });
  }

  hide(): void {
    this.root.hidden = true;
    this.modalLock?.release();
    this.modalLock = null;
  }

  destroy(): void {
    this.modalLock?.release();
    this.modalLock = null;
    this.root.remove();
  }

  private render(): void {
    const save = this.save;
    if (!save) return;
    const today = utcDateString();
    const daily = dailyForUtcDate(today);
    const dailyDone = save.daily.rewardsByDate[today] !== undefined;
    const scanner = save.workshop.includes('archive-scanner');
    const completedSites = Object.values(save.sites).filter(({ completed }) => completed).length;
    const expeditionTitle = completedSites >= 9
      ? 'Hazard Line secured'
      : completedSites >= 6
        ? 'Pressure Works restored'
        : 'First Shift restored';
    const projectCards = WORKSHOP_PROJECTS.map((project) => {
      const complete = save.workshop.includes(project.id);
      const available = workshopProjectAvailable(project, save.workshop);
      const affordable = available && save.salvage >= project.cost;
      return `
        <article class="workshop__project ${complete ? 'is-complete' : 'is-incomplete'}">
          <span class="workshop__project-state" aria-hidden="true">${complete ? '◆' : '◇'}</span>
          <div><strong>${project.name}</strong><span>${complete ? project.change : 'Construction incomplete'}</span></div>
          ${complete
            ? '<span class="workshop__built">BUILT</span>'
            : `<button type="button" data-project="${project.id}" data-cost="${project.cost}" ${affordable ? '' : 'disabled'}>${available ? `${project.cost} Salvage` : 'Build first'}</button>`}
        </article>`;
    }).join('');
    const atlasCards = ATLAS_ENTRIES.map((entry) => {
      const found = save.atlas.includes(entry.id);
      return `
        <article class="workshop__atlas-entry ${found ? 'is-found' : 'is-missing'}">
          <span class="workshop__atlas-mark" aria-hidden="true">${found ? '✦' : '?'}</span>
          <strong>${found ? entry.name : 'Unknown interaction'}</strong>
          <span>${found || scanner ? entry.clue : 'Experiment with living materials to reveal this.'}</span>
        </article>`;
    }).join('');

    this.root.innerHTML = `
      <main class="workshop__shell" role="dialog" aria-modal="true" aria-labelledby="workshop-title">
        <header class="workshop__header">
          <div>
            <span class="workshop__kicker">Workshop</span>
            <h1 id="workshop-title">${expeditionTitle}</h1>
            <p>${save.rescuedTotal} crew rescued · ${save.workshop.length}/6 projects built</p>
          </div>
          <div class="workshop__wallet"><span>Salvage</span><strong>${save.salvage}</strong></div>
          <button class="workshop__continue" type="button" data-action="continue">BACK TO CAMPAIGN</button>
        </header>

        <section class="workshop__scene" aria-label="Restored Workshop">
          <div class="workshop__beacon ${save.workshop.includes('signal-lamp') ? 'is-built' : ''}"><span></span></div>
          <div class="workshop__quarters ${save.workshop.includes('crew-quarters') ? 'is-built' : ''}">
            <i></i><i></i><i></i>
          </div>
          <div class="workshop__crane ${save.workshop.includes('salvage-crane') ? 'is-built' : ''}"></div>
          <div class="workshop__archive ${save.workshop.includes('archive-scanner') ? 'is-built' : ''}"></div>
          <div class="workshop__paint ${save.workshop.includes('paint-locker') ? 'is-built' : ''}"></div>
          <div class="workshop__gantry ${save.workshop.includes('yard-gantry') ? 'is-built' : ''}"></div>
          <p>Every lit structure is a permanent change. The next empty frame remains visible.</p>
        </section>

        <section class="workshop__section">
          <header><div><span class="workshop__kicker">Build one next</span><h2>Workshop projects</h2></div><p>Convenience and expression only—campaign routes never require a project.</p></header>
          <div class="workshop__projects">${projectCards}</div>
        </section>

        <div class="workshop__lower">
          <section class="workshop__section workshop__daily">
            <header><div><span class="workshop__kicker">UTC ${today}</span><h2>Daily Rescue</h2></div><span class="workshop__chain">Chain ${save.daily.currentChain}</span></header>
            <div class="workshop__daily-card">
              <div><strong>${daily.title}</strong><span>${daily.rule}</span><small>Mastery: ${daily.mastery}</small></div>
              <div><span>${dailyDone ? 'Reward banked' : '24 + 4 mastery'}</span><button type="button" data-action="daily">${dailyDone ? 'REPLAY' : 'START DAILY'}</button></div>
            </div>
          </section>

          <section class="workshop__section workshop__atlas-section">
            <header><div><span class="workshop__kicker">${save.atlas.length}/${ATLAS_ENTRIES.length} discovered</span><h2>Material Atlas</h2></div><div><button type="button" data-action="atlas">OPEN ATLAS</button><button type="button" data-action="yard">TEST YARD</button></div></header>
            <div class="workshop__atlas">${atlasCards}</div>
          </section>
        </div>
      </main>`;

    this.root.querySelector('[data-action="continue"]')?.addEventListener('click', this.events.onContinue);
    this.root.querySelector('[data-action="daily"]')?.addEventListener('click', () => this.events.onDaily(daily, today));
    this.root.querySelector('[data-action="yard"]')?.addEventListener('click', this.events.onTestYard);
    this.root.querySelector<HTMLButtonElement>('[data-action="atlas"]')?.addEventListener('click', (event) => {
      const expanded = this.root.classList.toggle('is-atlas-expanded');
      (event.currentTarget as HTMLButtonElement).textContent = expanded ? 'CLOSE ATLAS' : 'OPEN ATLAS';
    });
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-project]')) {
      button.addEventListener('click', () => {
        this.events.onPurchase(button.dataset.project as WorkshopProjectId, Number(button.dataset.cost));
      });
    }
  }
}
