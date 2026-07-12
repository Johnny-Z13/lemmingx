import type { Lemming, SimulationState, Skill } from '../sim/types';
import { ALL_SKILLS } from '../sim/types';
import { SKILL_DEFS } from '../sim/skills/registry';
import { MATERIAL, type Terrain } from '../sim/Terrain';
import type { AudioSettings } from '../audio/settings';
import { colorToCss, skillPalette, type CrewPalette } from '../render/lemmingIdentity';
import { createElement as createLucideIcon, Hand, Maximize2, Minus, type IconNode } from 'lucide';

/** Terrain paint tools — hotkeys mirror the skill row on the bottom letter row. */
export type TerrainBrush = 'water' | 'sand' | 'dirt' | 'wood' | 'fire' | 'erase' | 'bomb';

export const TERRAIN_TOOLS: readonly {
  kind: TerrainBrush;
  label: string;
  hotkey: string;
  color: number;
  openOnly?: boolean;
}[] = [
  { kind: 'water', label: 'Water', hotkey: 'z', color: 0x3a9fd8 },
  { kind: 'sand', label: 'Sand', hotkey: 'x', color: 0xd4a84a },
  { kind: 'dirt', label: 'Dirt', hotkey: 'c', color: 0x4d9674 },
  { kind: 'wood', label: 'Wood', hotkey: 'v', color: 0xa67c52 },
  { kind: 'fire', label: 'Fire', hotkey: 'g', color: 0xff6a2a },
  { kind: 'erase', label: 'Erase', hotkey: 'b', color: 0x59617a },
  { kind: 'bomb', label: 'Bomb', hotkey: 'm', color: 0xff7a3a, openOnly: true },
] as const;

export type HudEvents = {
  onSelectSkill: (skill: Skill) => void;
  /** Leave the pre-release planning phase and open the hatch clock. */
  onStart?: () => void;
  /** Pre-load hatch queue with selected skill (consumes stock). */
  onEnqueueRelease?: () => void;
  /** Pre-load one seeded-random available role and reveal it in the queue. */
  onEnqueueRandomRelease?: () => void;
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
  onDebugLabelsChange?: (enabled: boolean) => void;
  /** Arm a terrain paint brush (limited charges or open-toolbox infinite). */
  onSelectBrush?: (kind: TerrainBrush) => void;
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
  planning: boolean;
  speed: number;
  nukeReady: boolean;
  hoveredJob: string | null;
  levelName: string;
  objective: string;
  hint: string;
  hasNextLevel: boolean;
  /** Armed terrain brush, or null when assigning skills. */
  brush: TerrainBrush | null;
  /** Whether this level exposes the terrain toolbar at all. */
  hasTerrainTools: boolean;
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
  palette: skillPalette(skill),
}));

function crewIconMarkup(palette: CrewPalette | null): string {
  const className = palette ? 'hud__crew-icon' : 'hud__crew-icon is-random';
  const style = palette
    ? ` style="--crew-hair:${colorToCss(palette.hair)};--crew-body:${colorToCss(palette.body)};` +
      `--crew-shade:${colorToCss(palette.bodyShade)};--crew-trim:${colorToCss(palette.trim)}"`
    : '';
  return `<span class="${className}"${style} aria-hidden="true">` +
    '<span class="hud__crew-hair"></span><span class="hud__crew-head"></span>' +
    '<span class="hud__crew-body"></span><span class="hud__crew-feet"></span></span>';
}

function formatTime(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export class Hud {
  private readonly root: HTMLDivElement;
  private readonly statusBar: HTMLDivElement;
  private readonly mission: HTMLElement;
  private readonly missionObjective: HTMLElement;
  private readonly missionHint: HTMLParagraphElement;
  private readonly dock: HTMLDivElement;
  private readonly dragHandle: HTMLButtonElement;
  private readonly collapseButton: HTMLButtonElement;
  private collapsed = false;
  private dockAnchor: { x: number; y: number } | null = null;
  private expandedDockSize: { width: number; height: number } | null = null;
  private dockDrag: {
    startX: number;
    startY: number;
    anchorX: number;
    anchorY: number;
  } | null = null;
  private readonly skillButtons = new Map<Skill, HTMLButtonElement>();
  private readonly releaseValue: HTMLSpanElement;
  private readonly nukeButton: HTMLButtonElement;
  private readonly pauseButton: HTMLButtonElement;
  private readonly speedButton: HTMLButtonElement;
  private readonly debugLabelsButton: HTMLButtonElement;
  private readonly randomButton: HTMLButtonElement;
  private readonly queueBar: HTMLDivElement;
  private readonly terrainButtons = new Map<TerrainBrush, HTMLButtonElement>();
  private readonly terrainBar: HTMLDivElement;
  private readonly openToolbox: boolean;
  private readonly freePlay: boolean;
  private debugLabels: boolean;
  private readonly overlay: HTMLDivElement;
  private readonly minimap: HTMLCanvasElement;
  /** Offscreen terrain layer so the cell sweep runs at ~10 Hz, not 60. */
  private readonly minimapTerrain = document.createElement('canvas');
  private minimapTerrainAt = 0;
  private readonly events: HudEvents;
  private readonly audio: AudioSettings;
  private readonly handleDockMouseMove = (e: MouseEvent) => this.moveDock(e);
  private readonly handleDockMouseUp = () => this.endDockDrag();
  private readonly handleViewportResize = () => {
    if (this.dockAnchor) this.setDockAnchor(this.dockAnchor.x, this.dockAnchor.y);
  };

  constructor(
    events: HudEvents,
    audio?: AudioSettings,
    opts?: { openToolbox?: boolean; freePlay?: boolean; debugLabels?: boolean },
  ) {
    this.events = events;
    this.openToolbox = opts?.openToolbox ?? false;
    this.freePlay = opts?.freePlay ?? false;
    this.debugLabels = opts?.debugLabels ?? false;
    this.audio = audio ?? { musicMuted: true, musicVolume: 0.5, sfxMuted: false, sfxVolume: 0.5 };
    this.root = document.createElement('div');
    this.root.className = 'hud';

    // --- Top status bar: level name + live counters + timer ---
    this.statusBar = document.createElement('div');
    this.statusBar.className = 'hud__status';
    this.root.append(this.statusBar);

    // --- Pre-release mission briefing; controls remain usable for planning. ---
    this.mission = document.createElement('section');
    this.mission.className = 'hud__mission';
    this.mission.setAttribute('aria-label', 'Level briefing');
    this.mission.innerHTML =
      '<span class="hud__mission-kicker">Plan before release</span>' +
      '<strong class="hud__mission-objective"></strong>' +
      '<p class="hud__mission-hint"></p>';
    this.missionObjective = this.mission.querySelector('.hud__mission-objective') as HTMLElement;
    this.missionHint = this.mission.querySelector('.hud__mission-hint') as HTMLParagraphElement;
    const startButton = this.makeButton('Start run', 'Start run (Space)', () => events.onStart?.());
    startButton.className = 'hud__btn hud__primary hud__mission-start';
    this.mission.append(startButton);
    this.root.append(this.mission);

    // --- Bottom control dock ---
    const dock = document.createElement('div');
    dock.className = 'hud__dock';

    const bar = document.createElement('div');
    bar.className = 'hud__bar';

    const windowControls = document.createElement('div');
    windowControls.className = 'hud__window-controls';

    this.dragHandle = this.makeIconButton(Hand, 'Drag control panel', () => {});
    this.dragHandle.className = 'hud__btn hud__drag-handle';
    this.dragHandle.addEventListener('mousedown', (e) => this.beginDockDrag(e));
    window.addEventListener('mousemove', this.handleDockMouseMove);
    window.addEventListener('mouseup', this.handleDockMouseUp);
    this.dragHandle.addEventListener('keydown', (e) => this.moveDockWithKeyboard(e));

    this.collapseButton = this.makeIconButton(Minus, 'Hide controls (H)', () => this.toggleCollapsed());
    this.collapseButton.className = 'hud__btn hud__collapse';
    this.collapseButton.setAttribute('aria-expanded', 'true');
    windowControls.append(this.dragHandle, this.collapseButton);

    const tools = document.createElement('div');
    tools.className = 'hud__tools hud__tools--crew';
    tools.innerHTML = '<span class="hud__bar-label">Crew</span>';
    for (const item of SKILLS) {
      const button = document.createElement('button');
      button.className = 'hud__tool';
      button.type = 'button';
      button.title = `${item.label} (${item.hotkey})`;
      button.setAttribute('aria-label', item.label);
      button.dataset.skill = item.skill;
      button.innerHTML =
        `<span class="hud__hotkey">${item.hotkey}</span>` +
        crewIconMarkup(item.palette) +
        `<span class="hud__tool-name">${item.label}</span>` +
        `<span class="hud__stock">0</span>`;
      button.addEventListener('click', () => events.onSelectSkill(item.skill));
      button.addEventListener('dblclick', () => events.onEnqueueRelease?.());
      tools.append(button);
      this.skillButtons.set(item.skill, button);
    }

    this.randomButton = document.createElement('button');
    this.randomButton.className = 'hud__tool hud__tool--random';
    this.randomButton.type = 'button';
    this.randomButton.title = 'Queue random crew type';
    this.randomButton.setAttribute('aria-label', 'Queue random crew type');
    this.randomButton.innerHTML =
      '<span class="hud__hotkey">?</span>' + crewIconMarkup(null) +
      '<span class="hud__tool-name">Random</span><span class="hud__stock">↧</span>';
    this.randomButton.addEventListener('click', () => events.onEnqueueRandomRelease?.());
    tools.append(this.randomButton);

    const queueBtn = this.makeButton('⬇ Queue (Q)', 'Add selected skill to hatch queue', () => events.onEnqueueRelease?.());
    queueBtn.className = 'hud__btn';
    const unqueueBtn = this.makeButton('⬆', 'Remove last from hatch queue', () => events.onPopQueue?.());
    unqueueBtn.className = 'hud__btn';
    tools.append(queueBtn, unqueueBtn);

    // --- Terrain toolbar: paint the living world (limited charges / open ∞) ---
    this.terrainBar = document.createElement('div');
    this.terrainBar.className = 'hud__tools hud__tools--terrain';
    this.terrainBar.innerHTML = '<span class="hud__bar-label">Terrain</span>';
    for (const tool of TERRAIN_TOOLS) {
      if (tool.openOnly && !this.openToolbox) continue;
      const button = document.createElement('button');
      button.className = 'hud__tool';
      button.type = 'button';
      button.title = `${tool.label} (${tool.hotkey.toUpperCase()})`;
      button.setAttribute('aria-label', tool.label);
      button.innerHTML =
        `<span class="hud__hotkey">${tool.hotkey.toUpperCase()}</span>` +
        `<span class="hud__swatch"></span>` +
        `<span class="hud__tool-name">${tool.label}</span>` +
        `<span class="hud__stock">0</span>`;
      (button.querySelector('.hud__swatch') as HTMLSpanElement).style.background =
        `#${tool.color.toString(16).padStart(6, '0')}`;
      button.addEventListener('click', () => events.onSelectBrush?.(tool.kind));
      this.terrainBar.append(button);
      this.terrainButtons.set(tool.kind, button);
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

    this.debugLabelsButton = this.makeButton('Labels', 'Toggle debug labels (L)', () => {
      const enabled = !this.debugLabels;
      this.setDebugLabels(enabled);
      events.onDebugLabelsChange?.(enabled);
    });
    this.debugLabelsButton.className = 'hud__btn hud__debug-labels';
    this.setDebugLabels(this.debugLabels);

    controls.append(
      release,
      this.pauseButton,
      this.speedButton,
      this.nukeButton,
      restartButton,
      this.debugLabelsButton,
      this.makeAudioCluster(),
    );
    const panelContent = document.createElement('div');
    panelContent.className = 'hud__panel-content';
    panelContent.append(tools, this.terrainBar, controls);
    bar.append(panelContent, windowControls);
    dock.append(bar);
    this.dock = dock;
    this.root.append(dock);

    this.queueBar = document.createElement('div');
    this.queueBar.className = 'hud__queue';
    this.root.append(this.queueBar);

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
    window.addEventListener('resize', this.handleViewportResize);
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

  /** Collapse the bottom bar to a slim pill so it stops occluding gameplay. */
  toggleCollapsed(): void {
    const anchor = this.currentDockAnchor();
    if (!this.collapsed) {
      const rect = this.dock.getBoundingClientRect();
      this.expandedDockSize = { width: rect.width, height: rect.height };
    }
    this.collapsed = !this.collapsed;
    this.dock.classList.toggle('is-collapsed', this.collapsed);
    this.setButtonIcon(this.collapseButton, this.collapsed ? Maximize2 : Minus);
    const label = this.collapsed ? 'Show controls (H)' : 'Hide controls (H)';
    this.collapseButton.title = label;
    this.collapseButton.setAttribute('aria-label', label);
    this.collapseButton.setAttribute('aria-expanded', String(!this.collapsed));
    this.setDockAnchor(anchor.x, anchor.y);
  }

  private beginDockDrag(e: MouseEvent): void {
    if (e.button !== 0) return;
    const anchor = this.currentDockAnchor();
    this.dockDrag = {
      startX: e.clientX,
      startY: e.clientY,
      anchorX: anchor.x,
      anchorY: anchor.y,
    };
    this.dragHandle.classList.add('is-dragging');
    e.preventDefault();
    e.stopPropagation();
  }

  private moveDock(e: MouseEvent): void {
    const drag = this.dockDrag;
    if (!drag) return;
    this.setDockAnchor(
      drag.anchorX + e.clientX - drag.startX,
      drag.anchorY + e.clientY - drag.startY,
    );
    e.preventDefault();
  }

  private endDockDrag(): void {
    if (!this.dockDrag) return;
    this.dockDrag = null;
    this.dragHandle.classList.remove('is-dragging');
  }

  private moveDockWithKeyboard(e: KeyboardEvent): void {
    const directions: Partial<Record<string, { x: number; y: number }>> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const direction = directions[e.key];
    if (!direction) return;
    const anchor = this.currentDockAnchor();
    const step = e.shiftKey ? 32 : 12;
    this.setDockAnchor(anchor.x + direction.x * step, anchor.y + direction.y * step);
    e.preventDefault();
    e.stopPropagation();
  }

  private currentDockAnchor(): { x: number; y: number } {
    const rect = this.collapseButton.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  private setDockAnchor(x: number, y: number): void {
    const dockRect = this.dock.getBoundingClientRect();
    const toggleRect = this.collapseButton.getBoundingClientRect();
    const margin = 8;
    const toggleOffsetX = toggleRect.left - dockRect.left + toggleRect.width / 2;
    const toggleOffsetY = toggleRect.top - dockRect.top + toggleRect.height / 2;
    const effectiveWidth = this.collapsed ? this.expandedDockSize?.width ?? dockRect.width : dockRect.width;
    const effectiveHeight = this.collapsed ? this.expandedDockSize?.height ?? dockRect.height : dockRect.height;
    const minX = toggleOffsetX + margin;
    const maxX = window.innerWidth - (effectiveWidth - toggleOffsetX) - margin;
    const clampedX = minX <= maxX
      ? Math.min(maxX, Math.max(minX, x))
      : Math.min(window.innerWidth - margin, Math.max(margin, x));
    const minY = toggleOffsetY + margin;
    const maxY = window.innerHeight - (effectiveHeight - toggleOffsetY) - margin;
    const clampedY = minY <= maxY
      ? Math.min(maxY, Math.max(minY, y))
      : Math.min(window.innerHeight - margin, Math.max(margin, y));

    this.dockAnchor = { x: clampedX, y: clampedY };
    this.dock.style.left = `${clampedX - toggleOffsetX}px`;
    this.dock.style.top = `${clampedY - toggleOffsetY}px`;
    this.dock.style.right = 'auto';
    this.dock.style.bottom = 'auto';
    this.dock.style.transform = 'none';
  }

  setDebugLabels(enabled: boolean): void {
    this.debugLabels = enabled;
    this.debugLabelsButton?.classList.toggle('is-active', enabled);
    this.debugLabelsButton?.setAttribute('aria-pressed', String(enabled));
    if (this.debugLabelsButton) this.debugLabelsButton.title = `Debug labels ${enabled ? 'on' : 'off'} (L)`;
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
            material === MATERIAL.fire ? '#ff6a2a' :
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

  private makeIconButton(icon: IconNode, title: string, onClick: () => void): HTMLButtonElement {
    const button = this.makeButton('', title, onClick);
    this.setButtonIcon(button, icon);
    return button;
  }

  private setButtonIcon(button: HTMLButtonElement, icon: IconNode): void {
    const svg = createLucideIcon(icon);
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('aria-hidden', 'true');
    button.replaceChildren(svg);
  }

  update(state: SimulationState, view: HudView): void {
    const pct = Math.round((state.saved / Math.max(1, state.totalLemmings)) * 100);
    const timer =
      state.timeRemainingMs !== null
        ? `<span class="hud__timer${state.timeRemainingMs < 15000 ? ' is-low' : ''}">⏱ ${formatTime(state.timeRemainingMs)}</span>`
        : '';
    this.statusBar.innerHTML = this.freePlay
      ? `<span class="hud__level">${view.levelName}</span>` +
        '<span class="hud__stat hud__stat--pct"><strong>Free Play</strong></span>' +
        `<span class="hud__stat">Crew <strong>${state.spawned}/${state.totalLemmings}</strong></span>` +
        `<span class="hud__stat">Lost <strong>${state.lost}</strong></span>`
      : `<span class="hud__level">${view.levelName}</span>` +
        `<span class="hud__stat hud__stat--pct">Success <strong>${pct}%</strong></span>` +
        `<span class="hud__stat">Saved <strong>${state.saved}/${state.targetSaved}</strong></span>` +
        `<span class="hud__stat">Out <strong>${state.spawned}/${state.totalLemmings}</strong></span>` +
        `<span class="hud__stat">Lost <strong>${state.lost}</strong></span>` +
        timer;

    this.mission.hidden = !view.planning;
    if (view.planning) {
      this.missionObjective.textContent = view.objective;
      this.missionHint.textContent = view.hint;
    }

    this.releaseValue.textContent = `Rate ${state.releaseRate}`;

    const running = state.outcome === 'running';
    for (const [skill, button] of this.skillButtons) {
      const stock = button.querySelector('.hud__stock');
      if (stock) stock.textContent = this.openToolbox ? '∞' : String(state.skills[skill]);
      button.classList.toggle('is-active', skill === state.selectedSkill && !view.brush);
      button.disabled = !running || (!this.openToolbox && state.skills[skill] <= 0);
    }
    const releaseSlots = state.totalLemmings - state.spawned - state.hatchQueue.length;
    const hasRandomRole = this.openToolbox || ALL_SKILLS.some((skill) => state.skills[skill] > 0);
    this.randomButton.disabled = !running || releaseSlots <= 0 || !hasRandomRole;

    this.nukeButton.disabled = !view.nukeReady;
    this.pauseButton.classList.toggle('is-active', view.paused && !view.planning);
    this.pauseButton.textContent = view.planning ? 'Start' : view.paused ? '▶' : '▮▮';
    const pauseLabel = view.planning ? 'Start run (Space)' : 'Pause / resume (Space)';
    this.pauseButton.title = pauseLabel;
    this.pauseButton.setAttribute('aria-label', pauseLabel);
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

    // Terrain toolbar (limited charges / open infinite)
    this.terrainBar.hidden = !view.hasTerrainTools;
    if (view.hasTerrainTools) {
      for (const [kind, button] of this.terrainButtons) {
        const stockEl = button.querySelector('.hud__stock');
        const infinite = this.openToolbox;
        const stock = kind === 'bomb' ? 0 : state.landscape[kind];
        if (stockEl) stockEl.textContent = infinite ? '∞' : String(stock);
        button.classList.toggle('is-active', view.brush === kind);
        button.disabled = !running || (!infinite && stock <= 0);
      }
    }

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
    window.removeEventListener('mousemove', this.handleDockMouseMove);
    window.removeEventListener('mouseup', this.handleDockMouseUp);
    window.removeEventListener('resize', this.handleViewportResize);
    this.root.remove();
  }
}
