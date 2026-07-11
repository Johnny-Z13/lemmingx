import type { Lemming, SimulationState, Skill } from '../sim/types';
import { ALL_SKILLS } from '../sim/types';
import { SKILL_DEFS } from '../sim/skills/registry';
import { MATERIAL, type Terrain } from '../sim/Terrain';
import type { AudioSettings } from '../audio/settings';

export type HudEvents = {
  onSelectSkill: (skill: Skill) => void;
  /** Pre-load hatch queue with selected skill (consumes stock). */
  onEnqueueRelease?: () => void;
  onPopQueue?: () => void;
  onNuke: () => void;
  onReleaseRate: (delta: number) => void;
  onRestart: () => void;
  onTogglePause: () => void;
  onCycleSpeed: () => void;
  onNext?: () => void;
  onLevelSelect?: () => void;
  onMinimapJump?: (fractionX: number, fractionY: number) => void;
  onAudioChange?: (settings: AudioSettings) => void;
  /** Select a landscape paint tool (campaign sandworld). */
  onSelectLandscape?: (kind: 'water' | 'sand' | 'dirt' | 'wood' | 'erase') => void;
};

/** Everything the minimap needs to draw one frame, in level coordinates. */
export interface MinimapData {
  terrain: Terrain;
  lemmings: ReadonlyArray<Lemming>;
  camera: { x: number; y: number; width: number; height: number };
  width: number;
  height: number;
}

/** Extra read-only display info the scene feeds the HUD each frame. */
export interface HudView {
  paused: boolean;
  speed: number;
  nukeReady: boolean;
  hoveredJob: string | null;
  levelName: string;
  hasNextLevel: boolean;
  labBrush: string | null;
  /** Campaign landscape brush, or null. */
  landscapeBrush: string | null;
  minimap: MinimapData | null;
}

/** Minimap display width in CSS px; height follows the level's aspect. */
const MINIMAP_WIDTH = 180;
/** Terrain layer redraw interval — dots/camera redraw every frame regardless. */
const MINIMAP_TERRAIN_MS = 100;

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
  private readonly queueBar: HTMLDivElement;
  private readonly landscapeBar: HTMLDivElement;
  private readonly overlay: HTMLDivElement;
  private readonly minimap: HTMLCanvasElement;
  /** Offscreen terrain layer so the cell sweep runs at ~10 Hz, not 60. */
  private readonly minimapTerrain = document.createElement('canvas');
  private minimapTerrainAt = 0;
  private readonly events: HudEvents;
  private readonly audio: AudioSettings;

  constructor(events: HudEvents, audio?: AudioSettings) {
    this.events = events;
    this.audio = audio ?? { musicMuted: true, musicVolume: 0.5, sfxMuted: false, sfxVolume: 0.5 };
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
      button.addEventListener('dblclick', () => events.onEnqueueRelease?.());
      tools.append(button);
      this.skillButtons.set(item.skill, button);
    }

    const queueBtn = this.makeButton('⬇ Queue (Q)', 'Add selected skill to hatch queue', () => events.onEnqueueRelease?.());
    queueBtn.className = 'hud__btn';
    const unqueueBtn = this.makeButton('⬆', 'Remove last from hatch queue', () => events.onPopQueue?.());
    unqueueBtn.className = 'hud__btn';
    tools.append(queueBtn, unqueueBtn);

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

    controls.append(release, this.pauseButton, this.speedButton, this.nukeButton, restartButton, this.makeAudioCluster());
    bar.append(tools, controls);
    this.root.append(bar);

    // --- Floating notice (selected skill / hovered job) ---
    this.notice = document.createElement('div');
    this.notice.className = 'hud__notice';
    this.root.append(this.notice);

    this.queueBar = document.createElement('div');
    this.queueBar.className = 'hud__queue';
    this.root.append(this.queueBar);

    this.landscapeBar = document.createElement('div');
    this.landscapeBar.className = 'hud__landscape';
    this.root.append(this.landscapeBar);

    // --- Minimap (scrolling levels only) ---
    this.minimap = document.createElement('canvas');
    this.minimap.className = 'hud__minimap';
    this.minimap.hidden = true;
    this.minimap.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.minimap.setPointerCapture(e.pointerId);
      this.minimapJump(e);
    });
    this.minimap.addEventListener('pointermove', (e) => {
      if (this.minimap.hasPointerCapture(e.pointerId)) this.minimapJump(e);
    });
    this.root.append(this.minimap);

    // --- Win/lose overlay (hidden until outcome resolves) ---
    this.overlay = document.createElement('div');
    this.overlay.className = 'hud__overlay';
    this.overlay.hidden = true;
    this.root.append(this.overlay);

    document.body.append(this.root);
  }

  /** Music + SFX mute toggles with volume sliders. */
  private makeAudioCluster(): HTMLDivElement {
    const cluster = document.createElement('div');
    cluster.className = 'hud__audio';

    const make = (label: string, mutedKey: 'musicMuted' | 'sfxMuted', volumeKey: 'musicVolume' | 'sfxVolume', title: string) => {
      const button = this.makeButton(label, title, () => {
        this.audio[mutedKey] = !this.audio[mutedKey];
        button.classList.toggle('is-muted', this.audio[mutedKey]);
        this.events.onAudioChange?.({ ...this.audio });
      });
      button.className = 'hud__btn hud__audio-toggle';
      button.classList.toggle('is-muted', this.audio[mutedKey]);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '100';
      slider.value = String(Math.round(this.audio[volumeKey] * 100));
      slider.title = `${title} volume`;
      slider.className = 'hud__audio-slider';
      slider.addEventListener('input', () => {
        this.audio[volumeKey] = Number(slider.value) / 100;
        this.events.onAudioChange?.({ ...this.audio });
      });
      cluster.append(button, slider);
    };

    make('♪', 'musicMuted', 'musicVolume', 'Music');
    make('🔊', 'sfxMuted', 'sfxVolume', 'Sound effects');
    return cluster;
  }

  private minimapJump(e: PointerEvent): void {
    const rect = this.minimap.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const fx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const fy = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    this.events.onMinimapJump?.(fx, fy);
  }

  /** Redraw the minimap: cached terrain layer + live dots + camera rectangle. */
  private drawMinimap(data: MinimapData): void {
    const scale = MINIMAP_WIDTH / data.width;
    const height = Math.max(24, Math.round(data.height * scale));

    if (this.minimap.width !== MINIMAP_WIDTH || this.minimap.height !== height) {
      this.minimap.width = MINIMAP_WIDTH;
      this.minimap.height = height;
      this.minimapTerrain.width = MINIMAP_WIDTH;
      this.minimapTerrain.height = height;
      this.minimapTerrainAt = 0; // force a terrain redraw
    }

    const now = performance.now();
    if (now - this.minimapTerrainAt >= MINIMAP_TERRAIN_MS) {
      this.minimapTerrainAt = now;
      const tctx = this.minimapTerrain.getContext('2d');
      if (tctx) {
        tctx.clearRect(0, 0, MINIMAP_WIDTH, height);
        data.terrain.forEachSolidCell((x, y, w, h, material) => {
          tctx.fillStyle =
            material === MATERIAL.steel ? '#8a93a6' :
            material === MATERIAL.sand ? '#d4a84a' :
            material === MATERIAL.water ? '#3a9fd8' :
            material === MATERIAL.dirt ? '#4d9674' : '#d9b84d';
          tctx.fillRect(x * scale, y * scale, Math.max(1, w * scale), Math.max(1, h * scale));
        });
      }
    }

    const ctx = this.minimap.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, MINIMAP_WIDTH, height);
    ctx.drawImage(this.minimapTerrain, 0, 0);

    ctx.fillStyle = '#9ef7c3';
    for (const l of data.lemmings) {
      if (l.state === 'dead' || l.state === 'exited') continue;
      ctx.fillRect(l.x * scale - 1, l.y * scale - 1, 2, 2);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      data.camera.x * scale + 0.5,
      data.camera.y * scale + 0.5,
      data.camera.width * scale - 1,
      data.camera.height * scale - 1,
    );
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
    const pct = Math.round((state.saved / Math.max(1, state.totalLemmings)) * 100);
    const timer =
      state.timeRemainingMs !== null
        ? `<span class="hud__timer${state.timeRemainingMs < 15000 ? ' is-low' : ''}">⏱ ${formatTime(state.timeRemainingMs)}</span>`
        : '';
    this.statusBar.innerHTML =
      `<span class="hud__level">${view.levelName}</span>` +
      `<span class="hud__stat hud__stat--pct">Success <strong>${pct}%</strong></span>` +
      `<span class="hud__stat">Saved <strong>${state.saved}/${state.targetSaved}</strong></span>` +
      `<span class="hud__stat">Out <strong>${state.spawned}/${state.totalLemmings}</strong></span>` +
      `<span class="hud__stat">Lost <strong>${state.lost}</strong></span>` +
      timer;

    this.releaseValue.textContent = `Rate ${state.releaseRate}`;

    const running = state.outcome === 'running';
    for (const [skill, button] of this.skillButtons) {
      const stock = button.querySelector('.hud__stock');
      if (stock) stock.textContent = String(state.skills[skill]);
      button.classList.toggle('is-active', skill === state.selectedSkill && !view.landscapeBrush);
      button.disabled = state.skills[skill] <= 0 || !running;
    }

    this.nukeButton.disabled = !view.nukeReady;
    this.pauseButton.classList.toggle('is-active', view.paused);
    this.pauseButton.textContent = view.paused ? '▶' : '▮▮';
    this.speedButton.textContent = view.speed > 1 ? `▶▶ ${view.speed}×` : '▶ 1×';
    this.speedButton.classList.toggle('is-active', view.speed > 1);

    // Hatch queue strip
    if (state.hatchQueue.length > 0) {
      this.queueBar.hidden = false;
      this.queueBar.innerHTML =
        '<span class="hud__queue-label">Hatch queue</span>' +
        state.hatchQueue.map((s) => `<span class="hud__queue-chip">${SKILL_DEFS[s].label}</span>`).join('');
    } else {
      this.queueBar.hidden = true;
      this.queueBar.innerHTML = '';
    }

    // Landscape tools (campaign charges)
    const land = state.landscape;
    const landKinds = (['water', 'sand', 'dirt', 'wood', 'erase'] as const).filter((k) => land[k] > 0 || view.labBrush);
    if (landKinds.some((k) => land[k] > 0) && !view.labBrush) {
      this.landscapeBar.hidden = false;
      this.landscapeBar.innerHTML = '';
      for (const kind of (['water', 'sand', 'dirt', 'wood', 'erase'] as const)) {
        if (land[kind] <= 0) continue;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'hud__btn' + (view.landscapeBrush === kind ? ' is-active' : '');
        b.textContent = `${kind} ${land[kind]}`;
        b.addEventListener('click', () => this.events.onSelectLandscape?.(kind));
        this.landscapeBar.append(b);
      }
    } else {
      this.landscapeBar.hidden = true;
    }

    this.notice.textContent = this.noticeText(state, view);
    this.notice.hidden = state.outcome !== 'running';

    this.minimap.hidden = view.minimap === null;
    if (view.minimap) this.drawMinimap(view.minimap);

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
        <p class="hud__panel-pct">${pct}%</p>
        <p class="hud__panel-sub">${won ? 'You met the rescue quota.' : 'Not enough made it home.'}</p>
        <div class="hud__panel-stats">
          <span>Saved <strong>${state.saved}/${state.targetSaved}</strong></span>
          <span>Home <strong>${state.saved}/${state.totalLemmings}</strong></span>
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
    if (this.events.onLevelSelect) {
      const select = this.makeButton('Level Select', 'Back to level select (Esc)', this.events.onLevelSelect);
      select.className = 'hud__btn';
      actions.append(select);
    }
  }

  destroy(): void {
    this.root.remove();
  }

  private noticeText(state: SimulationState, view: HudView): string {
    if (view.paused) return 'Paused';
    if (view.labBrush) {
      const labels: Record<string, string> = {
        sand: 'Paint sand (1) — drag to pour',
        water: 'Paint water (2)',
        dirt: 'Paint dirt (3)',
        erase: 'Erase (4)',
        bomb: 'Bomb (5) — click to blast',
        assign: 'Assign skill (6) — click a lemming',
      };
      return labels[view.labBrush] ?? 'Sand Lab';
    }
    if (view.landscapeBrush) {
      return `Landscape: ${view.landscapeBrush} — click/drag to paint · Esc skills`;
    }
    if (view.hoveredJob) return `${view.hoveredJob} — click to assign ${state.selectedSkill}`;
    return `${SKILL_DEFS[state.selectedSkill].label} — click lemming · Q = hatch queue · dbl-click skill = queue`;
  }
}
