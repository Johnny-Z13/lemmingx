import Phaser from 'phaser';
import { createLevelAt, LEVEL_COUNT, PROTOTYPE_LEVEL_INDICES, PROTOTYPE_START_INDEX, SAND_LAB_INDEX } from '../levels';
import { GameSimulation } from '../sim/GameSimulation';
import { FixedStepClock } from '../sim/FixedStepClock';
import type { Lemming, LevelDefinition, Skill, WorldEntityKind } from '../sim/types';
import { ALL_SKILLS } from '../sim/types';
import { SKILL_DEFS } from '../sim/skills/registry';
import type { SimEvent } from '../sim/types';
import { Hud, TERRAIN_TOOLS, type TerrainBrush } from '../ui/Hud';
import { LevelSelect, type LevelCard } from '../ui/LevelSelect';
import { Progress } from '../progress';
import { drawLemming } from '../render/LemmingSprite';
import { layoutLemmingCrowds, type LemmingDisplayPoint } from '../render/crowdLayout';
import { EXPLOSION_TUNING } from '../sim/terrainTuning';
import { Particles } from '../render/Particles';
import { drawTerrain as drawTerrainLayer } from '../render/TerrainRenderer';
import { INDUSTRIAL_BACKDROP_KEY, WorldBackdrop } from '../render/WorldBackdrop';
import { drawIndustrialTorch, drawWorldLights, type WorldLightSource } from '../render/WorldLights';
import { WORLD_THEME } from '../render/visualTheme';
import { Sfx } from '../audio/Sfx';
import { Music } from '../audio/Music';
import { loadAudioSettings, saveAudioSettings, type AudioSettings } from '../audio/settings';
import { colorToCss, crewColor, crewLabel, skillPalette } from '../render/lemmingIdentity';
import { worldEntityLabels } from '../render/entityLabels';
import { loadUiSettings, saveUiSettings } from '../ui/settings';
import { ResumeOverlay, type ResumeReason } from '../ui/ResumeOverlay';
import { selectCrewTarget } from '../input/crewTargeting';
import { ContinueOverlay } from '../ui/ContinueOverlay';
import { interpolatePaintStroke } from '../input/paintStroke';
import { FocusLifecycle } from '../lifecycle/FocusLifecycle';
import { CrewActionFeedback } from '../input/crewActionFeedback';
import { TOUCH_PORTRAIT_QUERY, TouchOrientationGate } from '../lifecycle/TouchOrientationGate';
import { playerCameraAttentionFrame, playerCameraCrewFocus, playerCameraFrame, playerCameraGestureFrame, playerCameraLandmarkFrame, playerCameraOcclusionInsets } from '../render/playerCamera';
import { TouchCameraGesture } from '../input/TouchCameraGesture';
import { IS_PLAYER_EXPERIENCE } from '../runtimeMode';
import { IS_MOBILE_DEVICE } from '../deviceProfile';
import { heroMoveChargesForLevel, type HeroMovePhase } from '../input/heroMove';

/** Animation advances at this many frames per second (shared by all sprites). */
const ANIM_FPS = 12;
/** Pixels: how close the cursor must be to a lemming to hover/select it. */
const HOVER_RADIUS = 16;
const TOUCH_TARGET_RADIUS_CSS = 24;
const GESTURE_THRESHOLD_CSS = 8;
const CAMERA_EVENT_FOCUS_MS = 650;
const HERO_MOVE_ZOOM = 3.2;
const HERO_MOVE_BEAT_MS = 650;

export class GameScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private sim!: GameSimulation;
  private hud!: Hud;
  private terrainGraphics!: Phaser.GameObjects.Graphics;
  private lightGraphics!: Phaser.GameObjects.Graphics;
  private setpieceGraphics!: Phaser.GameObjects.Graphics;
  private actorGraphics!: Phaser.GameObjects.Graphics;
  private fxGraphics!: Phaser.GameObjects.Graphics;
  private worldBackdrop?: WorldBackdrop;
  private fireLights: WorldLightSource[] = [];
  private animClockMs = 0;
  private hoveredId: number | null = null;
  private lemmingDisplayPoints = new Map<number, LemmingDisplayPoint>();
  private paused = false;
  private planning = false;
  private readonly simClock = new FixedStepClock();
  private readonly crewActionFeedback = new CrewActionFeedback();
  private speed = 1;
  private heroMovePhase: HeroMovePhase = 'idle';
  private heroMoveCharges = 0;
  private heroMoveTargetId: number | null = null;
  private heroMoveBeatRemainingMs = 0;
  private heroReturnCamera: { zoom: number; scrollX: number; scrollY: number } | null = null;
  private levelIndex = 0;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  /** Edge-scroll only engages once the mouse has actually entered the game. */
  private pointerSeen = false;
  private readonly particles = new Particles();
  private readonly sfx = new Sfx();
  private readonly music = new Music();
  private audioSettings = loadAudioSettings();
  private uiSettings = IS_PLAYER_EXPERIENCE ? { debugLabels: false } : loadUiSettings();
  private readonly lemmingLabels = new Map<number, Phaser.GameObjects.Text>();
  private readonly entityLabels = new Map<string, Phaser.GameObjects.Text>();
  private readonly progress = new Progress(localStorage);
  private levelSelect!: LevelSelect;
  private selectOpen = false;
  private winRecorded = false;
  private celebrateFired = false;
  private firstExitFocusShown = false;
  private ambientAccMs = 0;
  private brush: TerrainBrush | null = null;
  private crewPlacement: Skill | null = null;
  private worldTool: WorldEntityKind | null = null;
  private readonly placedWorldEntities = new Set<WorldEntityKind>();
  private painting = false;
  private canvasGesture: {
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    targetId: number | null;
    panning: boolean;
  } | null = null;
  private pendingTouchBrush: {
    pointerId: number;
    brush: TerrainBrush;
    startX: number;
    startY: number;
    worldX: number;
    worldY: number;
    cancelled: boolean;
  } | null = null;
  private readonly touchCameraGesture = new TouchCameraGesture();
  /** Last paint stamp, used to space stamps when a level has limited charges. */
  private lastStampX = 0;
  private lastStampY = 0;
  private resumeOverlay!: ResumeOverlay;
  private continueOverlay?: ContinueOverlay;
  private touchOrientationGate?: TouchOrientationGate;
  private lifecycleReason: ResumeReason = 'focus';
  private readonly lifecycle = new FocusLifecycle({
    onSuspend: () => {
      this.painting = false;
      this.canvasGesture = null;
      this.resetCameraGestures();
      this.simClock.reset();
      this.input.keyboard?.resetKeys();
      this.resumeOverlay.show(this.lifecycleReason);
    },
    onResume: () => {
      this.unlockAudio();
      this.simClock.reset();
      this.resumeOverlay.hide();
    },
  });
  private readonly handleVisibilityChange = () => {
    if (document.hidden) this.suspendForLifecycle('focus');
  };
  private readonly handleWindowBlur = () => this.suspendForLifecycle('focus');

  constructor() {
    super('GameScene');
  }

  preload(): void {
    this.load.image(INDUSTRIAL_BACKDROP_KEY, `${import.meta.env.BASE_URL}assets/industrial-cavern-backdrop.png`);
  }

  create(): void {
    this.resumeOverlay = new ResumeOverlay(() => this.resumeFromLifecycle());
    if (IS_PLAYER_EXPERIENCE && IS_MOBILE_DEVICE) {
      this.touchOrientationGate = new TouchOrientationGate(
        window.matchMedia(TOUCH_PORTRAIT_QUERY),
        () => this.suspendForLifecycle('orientation'),
      );
      this.continueOverlay = new ContinueOverlay(
        () => this.continueOverlay?.hide(),
        () => {
          this.continueOverlay?.hide();
          this.openLevelSelect();
        },
      );
    }
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('blur', this.handleWindowBlur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupLifecycle());
    this.installKeyboard();
    if (IS_PLAYER_EXPERIENCE && IS_MOBILE_DEVICE) this.input.addPointer(1);
    this.applyAudioSettings(this.audioSettings);
    // Audio contexts need a user gesture; unlock on the first pointer/key.
    this.input.on('pointerdown', () => this.unlockAudio());
    this.input.keyboard?.on('keydown', () => this.unlockAudio());
    // Click-to-assign / terrain paint. Left button only — right/middle drag-pan.
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.lifecycle.isSuspended()) return;
      if (pointer.button !== 0) return;
      if (this.beginTouchCameraGesture(pointer)) return;
      const brush = this.brush;
      if (brush && pointer.wasTouch) {
        this.pendingTouchBrush = {
          pointerId: pointer.id,
          brush,
          startX: pointer.x,
          startY: pointer.y,
          worldX: pointer.worldX,
          worldY: pointer.worldY,
          cancelled: false,
        };
        return;
      }
      if (brush === 'bomb') {
        this.applyBomb(pointer.worldX, pointer.worldY);
        return;
      }
      if (brush) {
        this.painting = true;
        this.paintStamp(pointer.worldX, pointer.worldY, brush);
        return;
      }
      if (this.worldTool) {
        this.placeWorldEntity(this.worldTool, pointer.worldX, pointer.worldY);
        return;
      }
      if (this.crewPlacement) {
        this.placeCrew(pointer.worldX, pointer.worldY, this.crewPlacement);
        return;
      }
      const target = this.findNearestLemming(
        pointer.worldX,
        pointer.worldY,
        this.crewTargetRadiusWorld(),
      );
      this.canvasGesture = {
        pointerId: pointer.id,
        startX: pointer.x,
        startY: pointer.y,
        lastX: pointer.x,
        lastY: pointer.y,
        targetId: target?.id ?? null,
        panning: false,
      };
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.endTouchCameraGesture(pointer)) return;
      const pendingTouchBrush = this.pendingTouchBrush;
      if (pendingTouchBrush?.pointerId === pointer.id) {
        this.pendingTouchBrush = null;
        this.painting = false;
        if (!pendingTouchBrush.cancelled) {
          if (pendingTouchBrush.brush === 'bomb') {
            this.applyBomb(pointer.worldX, pointer.worldY);
          } else {
            this.paintStamp(pointer.worldX, pointer.worldY, pendingTouchBrush.brush);
          }
        }
        return;
      }
      const brush = this.brush;
      if (
        this.painting &&
        brush &&
        brush !== 'bomb' &&
        !this.hasOpenToolbox() &&
        this.sim.state.landscape[brush] > 0 &&
        Math.hypot(pointer.worldX - this.lastStampX, pointer.worldY - this.lastStampY) >= 6
      ) {
        this.paintStamp(pointer.worldX, pointer.worldY, brush);
      }
      this.painting = false;
      const gesture = this.canvasGesture;
      this.canvasGesture = null;
      if (!gesture || gesture.pointerId !== pointer.id || gesture.panning) return;
      if (gesture.targetId === null) {
        if (IS_PLAYER_EXPERIENCE && this.levelIndex === 0 && this.sim.state.skills.basher > 0) {
          this.crewActionFeedback.show('missed', this.animClockMs);
        }
        return;
      }
      const target = this.sim.state.lemmings.find(({ id }) => id === gesture.targetId);
      if (target) {
        if (this.heroMovePhase === 'armed') this.focusHeroMove(target);
        else if (this.heroMovePhase === 'idle') this.assignSelectedSkillTo(target);
      }
    });
    this.input.mouse?.disableContextMenu();
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.lifecycle.isSuspended()) return;
      if (this.updateTouchCameraGesture(pointer)) return;
      this.pointerSeen = true;
      const brush = this.brush;
      const pendingTouchBrush = this.pendingTouchBrush;
      if (pendingTouchBrush?.pointerId === pointer.id && pointer.isDown) {
        const moved = Math.hypot(pointer.x - pendingTouchBrush.startX, pointer.y - pendingTouchBrush.startY);
        if (moved >= this.gestureThresholdGamePx()) {
          if (pendingTouchBrush.brush === 'bomb') {
            pendingTouchBrush.cancelled = true;
            return;
          }
          this.pendingTouchBrush = null;
          this.painting = true;
          this.paintStamp(pendingTouchBrush.worldX, pendingTouchBrush.worldY, pendingTouchBrush.brush);
        }
      }
      if (this.painting && pointer.isDown && brush && brush !== 'bomb') {
        // Limited tools stamp once per brush radius; open toolboxes spray freely.
        const dist = Math.hypot(pointer.worldX - this.lastStampX, pointer.worldY - this.lastStampY);
        if (this.hasOpenToolbox()) {
          this.paintStamp(pointer.worldX, pointer.worldY, brush);
        } else if (dist >= 12) {
          const from = { x: this.lastStampX, y: this.lastStampY };
          for (const point of interpolatePaintStroke(from, { x: pointer.worldX, y: pointer.worldY }, 12)) {
            if (this.sim.state.landscape[brush] <= 1) break;
            this.paintStamp(point.x, point.y, brush);
          }
        }
      }
      const gesture = this.canvasGesture;
      if (gesture && gesture.pointerId === pointer.id && pointer.isDown && !brush) {
        if (!gesture.panning && Math.hypot(pointer.x - gesture.startX, pointer.y - gesture.startY) >= this.gestureThresholdGamePx()) {
          gesture.panning = true;
        }
        if (gesture.panning) {
          this.panCamera(
            { x: gesture.lastX, y: gesture.lastY },
            { x: pointer.x, y: pointer.y },
          );
        }
        gesture.lastX = pointer.x;
        gesture.lastY = pointer.y;
      }
      if (pointer.middleButtonDown() || pointer.rightButtonDown()) {
        this.panCamera(
          { x: pointer.prevPosition.x, y: pointer.prevPosition.y },
          { x: pointer.position.x, y: pointer.position.y },
        );
      }
    });
    this.input.on(
      'wheel',
      (pointer: Phaser.Input.Pointer, _over: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
        if (
          !IS_PLAYER_EXPERIENCE
          || this.lifecycle.isSuspended()
          || this.selectOpen
          || this.continueOverlay?.isVisible()
          || this.isPlayerCameraLocked()
          || this.cameras.main.panEffect.isRunning
          || !this.sim
        ) return;
        const anchor = { x: pointer.x, y: pointer.y };
        this.applyPlayerCameraGesture(anchor, anchor, this.cameras.main.zoom * Math.exp(-dy * 0.0015));
        (pointer.event as WheelEvent | undefined)?.preventDefault();
      },
    );
    this.levelSelect = new LevelSelect((index) => {
      this.unlockAudio();
      this.levelIndex = index;
      this.selectOpen = false;
      this.levelSelect.hide();
      this.startLevel();
    });
    if (IS_PLAYER_EXPERIENCE) {
      this.levelIndex = this.nextUnsolvedLevelIndex();
      this.startLevel();
      if (this.levelIndex > 0) this.continueOverlay?.show(this.level.name ?? `Level ${this.levelIndex + 1}`);
    } else {
      this.openLevelSelect();
    }
    this.touchOrientationGate?.start();
  }

  /** Show the campaign screen (boot, Esc, or from the win/lose overlay). */
  private openLevelSelect(): void {
    this.lifecycle.clear();
    this.resumeOverlay.hide();
    this.simClock.reset();
    this.selectOpen = true;
    this.music.stop();
    const cards: LevelCard[] = Array.from({ length: LEVEL_COUNT }, (_, index) => {
      const def = createLevelAt(index);
      const result = this.progress.get(index);
      return {
        index,
        name: def.name ?? `Level ${index + 1}`,
        unlocked: this.progress.isUnlocked(index),
        completed: result.completed,
        bestSavedPct: result.bestSavedPct,
      };
    });
    for (const index of PROTOTYPE_LEVEL_INDICES) {
      const def = createLevelAt(index);
      cards.push({
        index,
        name: def.name ?? `Prototype ${index + 1}`,
        unlocked: true,
        completed: false,
        bestSavedPct: 0,
        prototype: true,
      });
    }
    cards.push({
      index: SAND_LAB_INDEX,
      name: 'Sand Lab',
      unlocked: !IS_PLAYER_EXPERIENCE || this.progress.get(2).completed,
      completed: false,
      bestSavedPct: 0,
      sandLab: true,
    });
    this.levelSelect.show(cards);
  }

  private isLab(): boolean {
    return !!this.level?.sandLab;
  }

  private isPrototype(): boolean {
    return this.levelIndex >= PROTOTYPE_START_INDEX && this.levelIndex < SAND_LAB_INDEX;
  }

  private isFreePlay(): boolean {
    return this.isLab() || this.level?.playMode?.goal === 'free-play';
  }

  private hasOpenToolbox(): boolean {
    return this.level?.openToolbox === true || this.isLab();
  }

  private nextUnsolvedLevelIndex(): number {
    for (let index = 0; index < LEVEL_COUNT; index += 1) {
      if (this.progress.isUnlocked(index) && !this.progress.get(index).completed) return index;
    }
    return LEVEL_COUNT - 1;
  }

  private clientToWorld(clientX: number, clientY: number): Phaser.Math.Vector2 {
    const rect = this.game.canvas.getBoundingClientRect();
    const screenX = (clientX - rect.left) * (this.scale.width / rect.width);
    const screenY = (clientY - rect.top) * (this.scale.height / rect.height);
    return this.cameras.main.getWorldPoint(screenX, screenY);
  }

  private isOverGame(clientX: number, clientY: number): boolean {
    const rect = this.game.canvas.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }

  private beginTouchCameraGesture(pointer: Phaser.Input.Pointer): boolean {
    if (
      !IS_PLAYER_EXPERIENCE
      || !IS_MOBILE_DEVICE
      || !pointer.wasTouch
      || this.isPlayerCameraLocked()
      || this.cameras.main.panEffect.isRunning
    ) return false;
    if (!this.touchCameraGesture.begin(pointer.id, { x: pointer.x, y: pointer.y })) return false;
    this.painting = false;
    this.pendingTouchBrush = null;
    this.canvasGesture = null;
    return true;
  }

  private updateTouchCameraGesture(pointer: Phaser.Input.Pointer): boolean {
    if (!IS_PLAYER_EXPERIENCE || !IS_MOBILE_DEVICE || !pointer.wasTouch) return false;
    const move = this.touchCameraGesture.move(pointer.id, { x: pointer.x, y: pointer.y });
    if (!move.owned) return false;
    if (move.previousCenter && move.currentCenter && move.scale) {
      this.applyPlayerCameraGesture(
        move.previousCenter,
        move.currentCenter,
        this.cameras.main.zoom * move.scale,
      );
    }
    return move.owned;
  }

  private endTouchCameraGesture(pointer: Phaser.Input.Pointer): boolean {
    return IS_PLAYER_EXPERIENCE && IS_MOBILE_DEVICE && pointer.wasTouch
      ? this.touchCameraGesture.end(pointer.id)
      : false;
  }

  private panCamera(previous: { x: number; y: number }, current: { x: number; y: number }): void {
    const camera = this.cameras.main;
    if (IS_PLAYER_EXPERIENCE) {
      if (this.isPlayerCameraLocked() || camera.panEffect.isRunning) return;
      this.applyPlayerCameraGesture(previous, current, camera.zoom);
      return;
    }
    camera.scrollX -= (current.x - previous.x) / camera.zoom;
    camera.scrollY -= (current.y - previous.y) / camera.zoom;
  }

  private applyPlayerCameraGesture(
    previousAnchor: { x: number; y: number },
    currentAnchor: { x: number; y: number },
    requestedZoom: number,
  ): void {
    if (!this.level || this.isPlayerCameraLocked() || this.cameras.main.panEffect.isRunning) return;
    const camera = this.cameras.main;
    const current = { zoom: camera.zoom, scrollX: camera.scrollX, scrollY: camera.scrollY };
    const frame = playerCameraGestureFrame(
      current,
      previousAnchor,
      currentAnchor,
      requestedZoom,
      { x: camera.width, y: camera.height },
      { width: this.level.width, height: this.level.height },
      playerCameraCrewFocus(this.sim.state.lemmings, current, { x: camera.width, y: camera.height }),
    );
    camera.setZoom(frame.zoom);
    camera.setScroll(frame.scrollX, frame.scrollY);
  }

  private resetCameraGestures(): void {
    this.touchCameraGesture.reset();
    this.pendingTouchBrush = null;
  }

  private placeCrew(worldX: number, worldY: number, skill: Skill): void {
    if (!this.sim.placeLemming(worldX, worldY, skill)) {
      this.particles.ring(worldX, worldY, 10, { color: 0xff5b7f, speed: 0.04, lifeMs: 220, size: 1.5 });
      return;
    }
    this.brush = null;
    this.worldTool = null;
    this.sim.setSelectedSkill(skill);
    this.crewPlacement = skill;
    this.consumeEvents(this.sim.drainEvents());
  }

  private placeWorldEntity(kind: WorldEntityKind, worldX: number, worldY: number): void {
    if (!this.planning || !this.sim.placeWorldEntity(kind, worldX, worldY)) return;
    this.brush = null;
    this.crewPlacement = null;
    this.placedWorldEntities.add(kind);
    this.worldTool = kind;
    this.sfx.play('assign');
    this.particles.ring(worldX, worldY, 14, {
      color: kind === 'hatch' ? [0xffd96b, 0xffffff] : [0x78ffd6, 0xffffff],
      speed: 0.08,
      lifeMs: 360,
      size: 1.8,
    });
  }

  /**
   * Paint one terrain stamp. Limited levels disarm an exhausted brush so clicks
   * return to skill assignment; open-toolbox campaign levels paint freely.
   */
  private paintStamp(worldX: number, worldY: number, brush: Exclude<TerrainBrush, 'bomb'>): void {
    const painted = this.sim.paintLandscape(worldX, worldY, 16, brush);
    if (painted) {
      this.lastStampX = worldX;
      this.lastStampY = worldY;
    }
    if (!this.hasOpenToolbox() && this.sim.state.landscape[brush] <= 0) {
      this.brush = null;
      this.painting = false;
    }
  }

  private applyBomb(worldX: number, worldY: number): void {
    if (!this.sim || this.sim.state.outcome !== 'running' || !this.hasOpenToolbox()) return;
    this.sim.labBomb(worldX, worldY);
    this.sfx.play('explode');
    this.particles.burst(worldX, worldY, 20, { color: [0xff7a3a, 0xffd96b, 0xd4a84a], speed: 0.2, lifeMs: 700, size: 2.5 });
    this.addShake(6);
  }

  update(_time: number, delta: number): void {
    if (this.selectOpen || !this.sim) return; // frozen behind the level select
    if (this.lifecycle.isSuspended()) return;
    if (this.planning) {
      // Planning freezes the run, not the living world the player is shaping.
      this.simClock.advance(delta, 1, () => this.sim.stepLivingTerrain());
    } else if (this.heroMovePhase === 'resolving') {
      const beatDelta = Math.min(delta, this.heroMoveBeatRemainingMs);
      this.simClock.advance(beatDelta, 1, (stepMs) => {
        this.sim.step(stepMs);
        this.consumeEvents(this.sim.drainEvents());
      });
      this.heroMoveBeatRemainingMs -= beatDelta;
      if (this.heroMoveBeatRemainingMs <= 0 || this.sim.state.outcome !== 'running') this.finishHeroMove();
    } else if (!this.paused) {
      // Fast-forward increases fixed-tick throughput; rendering stays once per frame.
      this.simClock.advance(delta, this.speed, (stepMs) => {
        this.sim.step(stepMs);
        this.consumeEvents(this.sim.drainEvents());
      });
    }
    if (this.sim.state.outcome === 'won' && !this.winRecorded) {
      this.winRecorded = true;
      const pct = (this.sim.state.saved / Math.max(1, this.sim.state.totalLemmings)) * 100;
      this.progress.recordWin(this.levelIndex, pct);
    }
    if (this.sim.state.outcome === 'won' && !this.celebrateFired) {
      this.celebrateFired = true;
      this.fireWinCelebrate();
    }
    this.animClockMs += delta;
    this.worldBackdrop?.update(this.animClockMs);
    this.particles.update(this.paused ? 0 : delta * this.speed);
    this.updateAmbient(delta);
    this.updateCamera(delta);
    this.lemmingDisplayPoints = layoutLemmingCrowds(this.sim.state.lemmings, this.animClockMs);
    this.updateHover();
    this.drawWorld();
    this.hud.update(this.sim.state, this.hudView());
  }

  /** Camera pan: arrow keys + screen-edge scroll (drag pan lives in create()). */
  private updateCamera(deltaMs: number): void {
    const cam = this.cameras.main;
    if (this.isPlayerCameraLocked() || cam.panEffect.isRunning) return;
    const pan = 420 * (deltaMs / 1000);

    if (this.cursors) {
      if (this.cursors.left.isDown) cam.scrollX -= pan;
      if (this.cursors.right.isDown) cam.scrollX += pan;
      if (this.cursors.up.isDown) cam.scrollY -= pan;
      if (this.cursors.down.isDown) cam.scrollY += pan;
    }

    if (this.pointerSeen) {
      const pointer = this.input.activePointer;
      const edge = 24;
      if (pointer.x >= 0 && pointer.y >= 0 && pointer.x <= this.scale.width && pointer.y <= this.scale.height) {
        if (pointer.x < edge) cam.scrollX -= pan;
        else if (pointer.x > this.scale.width - edge) cam.scrollX += pan;
        if (pointer.y < edge) cam.scrollY -= pan;
        else if (pointer.y > this.scale.height - edge) cam.scrollY += pan;
      }
    }

    if (IS_PLAYER_EXPERIENCE && this.heroMovePhase === 'idle') {
      const current = { zoom: cam.zoom, scrollX: cam.scrollX, scrollY: cam.scrollY };
      const viewport = { x: cam.width, y: cam.height };
      const insets = playerCameraOcclusionInsets(
        this.game.canvas.getBoundingClientRect(),
        viewport,
        this.hud.gameplayOcclusions(),
      );
      const attention = playerCameraAttentionFrame(
        this.sim.state.lemmings,
        current,
        viewport,
        { width: this.level.width, height: this.level.height },
        insets,
      );
      const ease = Math.min(1, deltaMs / 180);
      cam.scrollX += (attention.scrollX - cam.scrollX) * ease;
      cam.scrollY += (attention.scrollY - cam.scrollY) * ease;
    }
  }

  /** Route sim events to sound + particle feedback. */
  private consumeEvents(events: SimEvent[]): void {
    for (const e of events) {
      if (e.kind === 'trap') this.sfx.playTrap(e.trapKind);
      else this.sfx.play(e.kind);
      switch (e.kind) {
        case 'assign':
          this.particles.ring(e.x, e.y, 10, { color: [0xffffff, 0x6ae1ff, 0x5ef2a1], speed: 0.14, lifeMs: 320, size: 2 });
          break;
        case 'dig':
          this.particles.burst(e.x, e.y, 6, { color: [WORLD_THEME.dirt, WORLD_THEME.dirtSpeck, WORLD_THEME.moss], speed: 0.06, lifeMs: 420, size: 2 });
          break;
        case 'bash':
          this.particles.burst(e.x, e.y, 7, { color: [WORLD_THEME.dirt, WORLD_THEME.dirtSpeck, WORLD_THEME.sandLight], speed: 0.11, spread: Math.PI, lifeMs: 400, size: 2.2 });
          break;
        case 'build':
          this.particles.burst(e.x, e.y, 3, { color: [0x6ae1ff, 0xffffff], speed: 0.05, lifeMs: 340, size: 1.8, upward: true });
          break;
        case 'shrug':
          this.particles.burst(e.x, e.y - 8, 4, { color: [0xff9ec8, 0xffffff], speed: 0.04, lifeMs: 500, size: 1.5, upward: true, gravity: -0.00005 });
          break;
        case 'land':
          this.particles.burst(e.x, e.y, 5, { color: [WORLD_THEME.steelLight, WORLD_THEME.dirtSpeck], speed: 0.05, spread: Math.PI * 0.8, angle: -Math.PI / 2, lifeMs: 280, size: 1.5 });
          break;
        case 'exit':
          this.particles.burst(e.x, e.y - 6, 14, { color: [0x78ffd6, 0x6ae1ff, 0xffffff], speed: 0.14, lifeMs: 750, size: 2.5, gravity: -0.0002, upward: true });
          this.addShake(2.5);
          if (!this.firstExitFocusShown) {
            this.firstExitFocusShown = true;
            this.focusPlayerCamera(this.level.exit.x + this.level.exit.width / 2);
          }
          break;
        case 'splat':
          this.particles.bloodSplat(e.x, e.y + 8);
          this.cameras.main.flash(90, 145, 0, 20);
          this.addShake(9);
          break;
        case 'drown':
          this.particles.burst(e.x, e.y, 10, { color: [0x4ab6ff, 0xffffff], speed: 0.1, lifeMs: 550, size: 2, upward: true });
          break;
        case 'splash':
          this.particles.burst(e.x, e.y - 2, 9, { color: [0x8ad4ff, 0x3a9fd8, 0xffffff], speed: 0.12, spread: Math.PI * 0.9, angle: -Math.PI / 2, lifeMs: 420, size: 2 });
          break;
        case 'burn':
          this.particles.burst(e.x, e.y, 18, { color: [0xff3d21, 0xff7a2d, 0xffd96b, 0x5e6575], speed: 0.16, lifeMs: 820, size: 2.8, upward: true });
          this.addShake(4);
          break;
        case 'clank':
          this.particles.burst(e.x, e.y, 8, { color: [0xffffff, 0xffd96b, 0x9aa6c2], speed: 0.16, lifeMs: 340, size: 1.6 });
          this.addShake(1.5);
          break;
        case 'trap':
          this.particles.burst(e.x, e.y, 16, {
            color: e.trapKind === 'zapper' ? [0x8be9ff, 0xffffff, 0x6ae1ff] : [0xff5b7f, 0x5e6575, 0x2c333f],
            speed: 0.15,
            lifeMs: 580,
            size: 2.2,
          });
          this.addShake(6);
          break;
        case 'explode':
          this.particles.burst(e.x, e.y, 28, { color: [0xff7a3a, 0xffd96b, 0x5e6575, 0xff5b7f], speed: 0.26, lifeMs: 900, size: 3.2 });
          this.particles.ring(e.x, e.y, 14, { color: [0xffd96b, 0xff7a3a], speed: 0.2, lifeMs: 500, size: 2 });
          this.addShake(10);
          break;
        case 'nuke':
          this.particles.burst(e.x, e.y, 20, { color: [0xff5b7f, 0xffd96b], speed: 0.2, lifeMs: 750, size: 3 });
          this.music.duck(1500);
          this.addShake(8);
          break;
        case 'spawn':
          this.particles.burst(e.x, e.y, 3, { color: [0xffd96b, 0xffffff], speed: 0.04, lifeMs: 280, size: 1.4, upward: true });
          break;
      }
    }
  }

  private addShake(amount: number): void {
    // Phaser camera shake: duration ms, intensity as fraction of viewport.
    const intensity = Math.min(0.018, amount * 0.0018);
    this.cameras.main.shake(160 + amount * 18, intensity);
  }

  /** Soft ambient sparkles at the exit so the goal always reads alive. */
  private updateAmbient(deltaMs: number): void {
    if (this.paused || this.sim.state.outcome !== 'running') return;
    this.ambientAccMs += deltaMs * this.speed;
    if (this.ambientAccMs < 220) return;
    this.ambientAccMs = 0;
    const exit = this.level.exit;
    this.particles.burst(exit.x + exit.width * Math.random(), exit.y + 8 + Math.random() * 20, 1, {
      color: [0x78ffd6, 0xffffff, 0x6ae1ff],
      speed: 0.03,
      lifeMs: 900,
      size: 1.4,
      gravity: -0.00015,
      upward: true,
    });
  }

  private fireWinCelebrate(): void {
    const exit = this.level.exit;
    const cx = exit.x + exit.width / 2;
    const cy = exit.y + exit.height / 2;
    this.particles.burst(cx, cy, 40, { color: [0x78ffd6, 0x6ae1ff, 0xffd96b, 0xffffff, 0x5ef2a1], speed: 0.22, lifeMs: 1200, size: 3, upward: true, gravity: 0.00015 });
    this.particles.ring(cx, cy, 18, { color: [0x78ffd6, 0xffd96b], speed: 0.18, lifeMs: 700, size: 2.5 });
    this.addShake(5);
  }

  /** Snapshot of scene-side display state the HUD needs each frame. */
  private hudView() {
    const hovered = this.hoveredId
      ? this.sim.state.lemmings.find((l) => l.id === this.hoveredId)
      : null;
    const heroTarget = this.heroMoveTargetId === null
      ? null
      : this.sim.state.lemmings.find(({ id }) => id === this.heroMoveTargetId) ?? null;
    const cam = this.cameras.main;
    const scrolls = this.level.width > this.scale.width || this.level.height > this.scale.height;
    const levelPrefix = this.isLab()
      ? 'Lab'
      : this.isPrototype()
        ? `Prototype ${this.levelIndex + 1}`
        : `${this.levelIndex + 1}/${LEVEL_COUNT}`;
    return {
      paused: this.paused || this.lifecycle.isSuspended(),
      planning: this.planning,
      speed: this.speed,
      nukeReady: this.sim.state.outcome === 'running' && !this.planning && !this.sim.state.nuking,
      hoveredJob: hovered ? SKILL_DEFS[hovered.state as Skill]?.label ?? this.titleCase(hovered.state) : null,
      levelName: `${levelPrefix} · ${this.level.name ?? 'LemmingX'}`,
      objective: this.level.objective ?? `Save ${this.level.targetSaved} lemmings.`,
      hint: this.level.hint ?? 'Queue roles or reshape the terrain before release.',
      hasNextLevel: !this.isLab() && !this.isPrototype() && this.levelIndex < LEVEL_COUNT - 1,
      brush: this.brush,
      crewPlacement: this.crewPlacement,
      worldTool: this.worldTool,
      canPlaceWorldEntities: this.planning && this.sim.state.spawned === 0,
      prompt: this.planningPrompt(),
      hasTerrainTools: this.hasOpenToolbox() || Object.values(this.level.landscape ?? {}).some((n) => (n ?? 0) > 0),
      actionCue: this.playerActionCue(),
      heroMove: {
        phase: this.heroMovePhase,
        charges: this.heroMoveCharges,
        skillLabel: SKILL_DEFS[this.sim.state.selectedSkill].label,
        crewLabel: heroTarget ? crewLabel(heroTarget) : null,
      },
      minimap: scrolls
        ? {
            terrain: this.level.terrain,
            lemmings: this.sim.state.lemmings,
            camera: {
              x: cam.worldView.x,
              y: cam.worldView.y,
              width: cam.worldView.width,
              height: cam.worldView.height,
            },
            width: this.level.width,
            height: this.level.height,
          }
        : null,
    };
  }

  private prototypePrompt(): string | null {
    if (!this.planning || !this.isPrototype()) return null;
    if (this.level.playMode?.spawn === 'tray-drop') {
      if (this.sim.state.spawned === 0) return 'Place your first crew member — drag a coloured role into the world, or select one and click.';
      const remaining = this.sim.state.totalLemmings - this.sim.state.spawned;
      return remaining > 0
        ? `${this.sim.state.spawned} placed · ${remaining} left in the tray. Add more, reshape the terrain, or press Start.`
        : 'The whole crew is placed. Press Start to bring the scene to life.';
    }
    if (this.level.playMode?.worldTools?.length) {
      if (!this.placedWorldEntities.has('hatch')) return 'Place the hatch — drag it from the World row, or select it and click the map.';
      if (!this.placedWorldEntities.has('exit')) return 'Now place the exit somewhere the crew can reach.';
      if (this.sim.state.hatchQueue.length === 0) return 'Choose a crew colour and Queue it, or use Random. Then press Start.';
      return 'World ready. Add more queued roles, reshape the terrain, or press Start.';
    }
    return null;
  }

  private planningPrompt(): string | null {
    if (IS_PLAYER_EXPERIENCE && this.planning && this.levelIndex === 0) {
      return IS_MOBILE_DEVICE
        ? 'Tap Play fullscreen when you are ready. The hatch and timer stay frozen until then.'
        : 'Press Start when you are ready. The hatch and timer stay frozen until then.';
    }
    return this.prototypePrompt();
  }

  private playerActionCue(): string | null {
    if (!IS_PLAYER_EXPERIENCE || this.planning) return null;
    const feedback = this.crewActionFeedback.current(this.animClockMs);
    if (feedback) return feedback;
    if (this.levelIndex === 0 && this.sim.state.skills.basher > 0) {
      return 'CLICK A WALKER — BASHER FIRES AT THE DAM';
    }
    if (this.levelIndex === 2 && this.sim.state.outcome === 'running') {
      const blocker = this.sim.state.lemmings.find(({ state }) => state === 'blocker');
      if (!blocker) return 'HOLD THEM — TAP A WALKER NEAR THE WALL';
      if (this.sim.state.landscape.sand === 0 && blocker.fuseMs === null) {
        return 'PATH READY — TAP THE BLOCKER AGAIN TO RELEASE';
      }
      return 'MAKE A PATH — CHOOSE BOMBER OR SAND';
    }
    return null;
  }

  private titleCase(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /** Current shared animation frame index. */
  private animFrame(): number {
    return Math.floor((this.animClockMs / 1000) * ANIM_FPS);
  }

  /** Track which lemming the cursor is over, for the selection ring. */
  private updateHover(): void {
    const pointer = this.input.activePointer;
    const target = this.findNearestLemming(pointer.worldX, pointer.worldY, HOVER_RADIUS);
    this.hoveredId = target?.id ?? null;
  }

  private startLevel(): void {
    this.lifecycle.clear();
    this.resumeOverlay.hide();
    this.level = createLevelAt(this.levelIndex);
    this.sim = new GameSimulation(this.level);
    this.winRecorded = false;
    this.firstExitFocusShown = false;

    this.children.removeAll(true);
    this.lemmingLabels.clear();
    this.entityLabels.clear();
    this.lemmingDisplayPoints.clear();
    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.level.width, this.level.height);
    camera.setBackgroundColor('#12171f');
    if (IS_PLAYER_EXPERIENCE) {
      const frame = playerCameraFrame(
        this.level,
        { width: camera.width, height: camera.height },
        { locked: this.isPlayerCameraLocked() },
      );
      camera.setZoom(frame.zoom);
      camera.setScroll(frame.scrollX, frame.scrollY);
    } else {
      camera.setZoom(1);
      camera.centerOn(this.level.spawn.x, this.level.spawn.y);
    }

    this.worldBackdrop = new WorldBackdrop(this, this.level.width, this.level.height);
    this.terrainGraphics = this.add.graphics().setDepth(0);
    this.lightGraphics = this.add.graphics().setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
    this.setpieceGraphics = this.add.graphics().setDepth(10);
    this.actorGraphics = this.add.graphics().setDepth(20);
    this.fxGraphics = this.add.graphics().setDepth(30);

    this.particles.clear();
    this.simClock.reset();
    this.crewActionFeedback.reset();
    this.planning = !this.isLab();
    this.paused = this.planning;
    this.speed = 1;
    this.heroMovePhase = 'idle';
    this.heroMoveCharges = heroMoveChargesForLevel(this.levelIndex, LEVEL_COUNT);
    this.heroMoveTargetId = null;
    this.heroMoveBeatRemainingMs = 0;
    this.heroReturnCamera = null;
    this.celebrateFired = false;
    this.ambientAccMs = 0;
    const terrainOnlyChallenge =
      !this.hasOpenToolbox() &&
      !ALL_SKILLS.some((skill) => this.level.skills[skill] > 0) &&
      (this.level.landscape?.fire ?? 0) > 0;
    this.brush = IS_PLAYER_EXPERIENCE && this.levelIndex === 1
      ? 'water'
      : this.isLab() ? 'sand' : terrainOnlyChallenge ? 'fire' : null;
    if (IS_PLAYER_EXPERIENCE && this.levelIndex === 2) this.sim.setSelectedSkill('blocker');
    this.crewPlacement = null;
    this.worldTool = null;
    this.placedWorldEntities.clear();
    this.painting = false;
    this.canvasGesture = null;
    this.resetCameraGestures();

    this.hud?.destroy();
    this.hud = new Hud({
      onSelectSkill: (skill) => {
        this.brush = null;
        this.worldTool = null;
        this.selectSkill(skill);
        this.crewPlacement = this.level.playMode?.spawn === 'tray-drop' ? skill : null;
      },
      onStart: () => this.startRun(),
      onEnqueueRelease: () => this.sim.enqueueRelease(this.sim.state.selectedSkill),
      onEnqueueRandomRelease: () => this.sim.enqueueRandomRelease(),
      onPopQueue: () => this.sim.popReleaseQueue(),
      onSelectBrush: (kind) => {
        this.brush = kind;
        this.crewPlacement = null;
        this.worldTool = null;
      },
      onSelectWorldTool: (kind) => {
        this.brush = null;
        this.crewPlacement = null;
        this.worldTool = kind;
      },
      onDropCrew: (skill, clientX, clientY) => {
        if (!this.isOverGame(clientX, clientY)) return;
        const point = this.clientToWorld(clientX, clientY);
        this.placeCrew(point.x, point.y, skill);
      },
      onDropWorldTool: (kind, clientX, clientY) => {
        if (!this.isOverGame(clientX, clientY)) return;
        const point = this.clientToWorld(clientX, clientY);
        this.placeWorldEntity(kind, point.x, point.y);
      },
      onNuke: () => this.triggerNuke(),
      onReleaseRate: (delta) => this.sim.changeReleaseRate(delta),
      onRestart: () => this.startLevel(),
      onTogglePause: () => this.togglePause(),
      onCycleSpeed: () => this.cycleSpeed(),
      onArmHeroMove: () => this.armHeroMove(),
      onCommitHeroMove: () => this.commitHeroMove(),
      onCancelHeroMove: () => this.cancelHeroMove(),
      onNext: () => this.nextLevel(),
      onMinimapJump: (fx, fy) => {
        if (!this.cameras.main.panEffect.isRunning) {
          this.cameras.main.centerOn(fx * this.level.width, fy * this.level.height);
        }
      },
      onLevelSelect: () => this.openLevelSelect(),
      onAudioChange: (settings) => {
        this.applyAudioSettings(settings);
        saveAudioSettings(settings);
      },
      onDebugLabelsChange: (enabled) => this.setDebugLabels(enabled),
    }, this.audioSettings, {
      openToolbox: this.hasOpenToolbox(),
      freePlay: this.isFreePlay(),
      debugLabels: this.uiSettings.debugLabels,
      allowDebugLabels: !IS_PLAYER_EXPERIENCE,
      spawnMode: this.level.playMode?.spawn,
      worldTools: this.level.playMode?.worldTools,
      playerBuild: IS_PLAYER_EXPERIENCE,
      availableSkills: this.playerVisibleSkills(),
      availableTerrainTools: this.playerVisibleTerrainTools(),
    });
    this.hud.update(this.sim.state, this.hudView());

    this.music.play(this.levelIndex);
  }

  private unlockAudio(): void {
    this.sfx.unlock();
    this.music.unlock();
  }

  private applyAudioSettings(settings: AudioSettings): void {
    this.audioSettings = settings;
    this.sfx.setMuted(settings.sfxMuted);
    this.sfx.setVolume(settings.sfxVolume);
    this.music.setMuted(settings.musicMuted);
    this.music.setVolume(settings.musicVolume);
  }

  private setDebugLabels(enabled: boolean): void {
    if (IS_PLAYER_EXPERIENCE) return;
    this.uiSettings.debugLabels = enabled;
    saveUiSettings(this.uiSettings);
    this.hud?.setDebugLabels(enabled);
  }

  /** Advance to the next level; from the finale, back to the level select. */
  private nextLevel(): void {
    if (this.isLab() || this.isPrototype() || this.levelIndex + 1 >= LEVEL_COUNT) {
      this.openLevelSelect();
      return;
    }
    this.levelIndex += 1;
    this.startLevel();
  }

  private selectSkill(skill: Skill): void {
    this.sim.setSelectedSkill(skill);
  }

  private triggerNuke(): void {
    if (this.planning || this.sim.state.outcome !== 'running' || this.sim.state.nuking) return;
    this.sim.nukeAll();
  }

  private startRun(): void {
    if (this.lifecycle.isSuspended() || !this.planning || this.sim.state.outcome !== 'running') return;
    this.planning = false;
    this.paused = false;
    this.simClock.reset();
    this.worldTool = null;
    this.focusPlayerCamera(this.level.spawn.x);
  }

  private isPlayerCameraLocked(): boolean {
    return IS_PLAYER_EXPERIENCE && this.levelIndex < 2;
  }

  /** Briefly present a key hatch/exit landmark, then return control to input. */
  private focusPlayerCamera(focusX: number): void {
    if (!IS_PLAYER_EXPERIENCE || this.levelIndex < 2 || this.levelIndex >= LEVEL_COUNT) return;
    const camera = this.cameras.main;
    const frame = playerCameraLandmarkFrame(
      this.level,
      { width: camera.width, height: camera.height },
      camera.zoom,
      focusX,
    );
    const visibleWidth = camera.width / frame.zoom;
    const visibleHeight = camera.height / frame.zoom;
    camera.pan(
      frame.scrollX + visibleWidth / 2,
      frame.scrollY + visibleHeight / 2,
      CAMERA_EVENT_FOCUS_MS,
      'Sine.easeInOut',
      true,
    );
  }

  private togglePause(): void {
    if (this.sim.state.outcome !== 'running') return;
    if (this.planning) {
      this.startRun();
      return;
    }
    this.paused = !this.paused;
    this.simClock.reset();
  }

  private cycleSpeed(): void {
    // 1× → 2× → 3× → 1×
    this.speed = this.speed >= 3 ? 1 : this.speed + 1;
  }

  /** Keyboard bindings: skill hotkeys, pause, speed, nuke, restart. */
  private installKeyboard(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    this.cursors = kb.createCursorKeys();
    kb.on('keydown', (event: KeyboardEvent) => {
      if (this.lifecycle.isSuspended()) return;
      if (this.selectOpen) return; // the level select owns the keyboard
      const key = event.key.toLowerCase();

      if (key === 'q' && this.level.playMode?.spawn !== 'tray-drop') {
        this.sim.enqueueRelease(this.sim.state.selectedSkill);
        return;
      } else if (key === 'backspace') {
        this.sim.popReleaseQueue();
        return;
      }

      // Terrain brush hotkeys (Z/X/C/V/B, open toolbox adds M) arm a tool.
      const tool = TERRAIN_TOOLS.find((t) => t.hotkey === key);
      if (tool && (!tool.openOnly || this.hasOpenToolbox())) {
        const stock = tool.kind === 'bomb' ? 0 : this.sim.state.landscape[tool.kind];
        if (this.hasOpenToolbox() || stock > 0) {
          this.brush = tool.kind;
          this.crewPlacement = null;
          this.worldTool = null;
          return;
        }
      }

      // Skill hotkeys (1–9) map to the registry's declared hotkeys.
      const skill = ALL_SKILLS.find((s) => SKILL_DEFS[s].hotkey === key);
      if (skill) {
        this.brush = null;
        this.worldTool = null;
        this.selectSkill(skill);
        this.crewPlacement = this.level.playMode?.spawn === 'tray-drop' ? skill : null;
        return;
      }
      if (key === ' ' || key === 'spacebar') {
        event.preventDefault();
        this.togglePause();
      } else if (key === 'f') {
        this.cycleSpeed();
      } else if (key === 'e') {
        this.armHeroMove();
      } else if (key === 'n') {
        this.triggerNuke();
      } else if (key === 'h') {
        this.hud.toggleCollapsed();
      } else if (key === 'l' && !IS_PLAYER_EXPERIENCE) {
        this.setDebugLabels(!this.uiSettings.debugLabels);
      } else if (key === 'r') {
        this.startLevel();
      } else if (key === 'escape' && !this.selectOpen && !IS_PLAYER_EXPERIENCE) {
        // First Esc disarms a brush; the next one leaves the level.
        if (this.brush || this.crewPlacement || this.worldTool) {
          this.brush = null;
          this.crewPlacement = null;
          this.worldTool = null;
          return;
        }
        this.openLevelSelect();
      }
    });
  }

  private suspendForLifecycle(reason: ResumeReason): void {
    this.sfx.suspend();
    this.music.suspend();
    if (this.selectOpen || !this.sim) return;
    this.lifecycleReason = reason;
    if (!this.lifecycle.suspend() && reason === 'orientation') {
      this.resumeOverlay.show(reason);
    }
  }

  private resumeFromLifecycle(): void {
    if (this.touchOrientationGate?.isPortrait()) return;
    this.lifecycle.resume();
  }

  private cleanupLifecycle(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    this.touchOrientationGate?.stop();
    this.resumeOverlay.destroy();
    this.continueOverlay?.destroy();
  }

  private assignSelectedSkillTo(target: Lemming): void {
    if (this.sim.state.outcome !== 'running') return;
    if (this.sim.assignSkill(target.id, this.sim.state.selectedSkill)) {
      if (IS_PLAYER_EXPERIENCE && this.levelIndex === 0) {
        this.crewActionFeedback.show('accepted', this.animClockMs);
      }
      const point = this.lemmingDisplayPoints.get(target.id) ?? target;
      this.particles.ring(point.x, point.y, 12, {
        color: skillPalette(this.sim.state.selectedSkill).trim,
        speed: 0.045,
        lifeMs: 260,
        size: 1.5,
      });
    } else {
      const point = this.lemmingDisplayPoints.get(target.id) ?? target;
      this.particles.ring(point.x, point.y, 9, {
        color: 0xff5b7f,
        speed: 0.035,
        lifeMs: 220,
        size: 1.25,
      });
    }
  }

  private armHeroMove(): void {
    if (
      this.heroMovePhase !== 'idle' || this.heroMoveCharges <= 0 || this.planning || this.paused ||
      this.sim.state.outcome !== 'running' || this.brush || this.crewPlacement || this.worldTool
    ) return;
    this.heroMovePhase = 'armed';
    this.canvasGesture = null;
  }

  private focusHeroMove(target: Lemming): void {
    if (this.heroMovePhase !== 'armed' || target.state === 'dead' || target.state === 'exited') return;
    const camera = this.cameras.main;
    this.heroReturnCamera = { zoom: camera.zoom, scrollX: camera.scrollX, scrollY: camera.scrollY };
    this.heroMoveTargetId = target.id;
    this.heroMovePhase = 'focused';
    this.paused = true;
    this.simClock.reset();
    camera.pan(target.x, target.y, 280, 'Sine.easeOut', true);
    camera.zoomTo(HERO_MOVE_ZOOM, 280, 'Sine.easeOut', true);
  }

  private commitHeroMove(): void {
    if (this.heroMovePhase !== 'focused' || this.heroMoveTargetId === null) return;
    const target = this.sim.state.lemmings.find(({ id }) => id === this.heroMoveTargetId);
    if (!target || !this.sim.assignSkill(target.id, this.sim.state.selectedSkill)) return;
    this.heroMoveCharges -= 1;
    this.heroMovePhase = 'resolving';
    this.heroMoveBeatRemainingMs = HERO_MOVE_BEAT_MS;
    this.paused = false;
    this.simClock.reset();
    const point = this.lemmingDisplayPoints.get(target.id) ?? target;
    this.particles.ring(point.x, point.y, 18, {
      color: skillPalette(this.sim.state.selectedSkill).trim,
      speed: 0.055,
      lifeMs: 420,
      size: 2,
    });
  }

  private cancelHeroMove(): void {
    if (this.heroMovePhase === 'idle' || this.heroMovePhase === 'resolving') return;
    this.finishHeroMove();
  }

  private finishHeroMove(): void {
    const frame = this.heroReturnCamera;
    this.heroMovePhase = 'idle';
    this.heroMoveTargetId = null;
    this.heroMoveBeatRemainingMs = 0;
    this.paused = false;
    this.simClock.reset();
    if (frame) {
      const camera = this.cameras.main;
      const visibleWidth = camera.width / frame.zoom;
      const visibleHeight = camera.height / frame.zoom;
      camera.pan(frame.scrollX + visibleWidth / 2, frame.scrollY + visibleHeight / 2, 320, 'Sine.easeInOut', true);
      camera.zoomTo(frame.zoom, 320, 'Sine.easeInOut', true);
    }
    this.heroReturnCamera = null;
  }

  private findNearestLemming(worldX: number, worldY: number, radius = 26): Lemming | null {
    return selectCrewTarget(this.sim.state.lemmings, this.lemmingDisplayPoints, worldX, worldY, radius);
  }

  private crewTargetRadiusWorld(): number {
    const rect = this.game.canvas.getBoundingClientRect();
    if (rect.width <= 0) return 26;
    return TOUCH_TARGET_RADIUS_CSS * (this.scale.width / rect.width) / this.cameras.main.zoom;
  }

  private gestureThresholdGamePx(): number {
    const rect = this.game.canvas.getBoundingClientRect();
    return rect.width > 0
      ? GESTURE_THRESHOLD_CSS * (this.scale.width / rect.width)
      : GESTURE_THRESHOLD_CSS;
  }

  private playerVisibleSkills(): readonly Skill[] | undefined {
    if (!IS_PLAYER_EXPERIENCE) return undefined;
    if (this.levelIndex === 0) return ['basher'];
    if (this.levelIndex === 1) return [];
    if (this.levelIndex === 2) return ['blocker', 'bomber'];
    return ALL_SKILLS.filter((skill) => this.level.skills[skill] > 0);
  }

  private playerVisibleTerrainTools(): readonly TerrainBrush[] | undefined {
    if (!IS_PLAYER_EXPERIENCE) return undefined;
    if (this.levelIndex === 0) return [];
    if (this.levelIndex === 1) return ['water'];
    if (this.levelIndex === 2) return ['sand'];
    return TERRAIN_TOOLS
      .filter(({ kind, openOnly }) =>
        (!openOnly || this.hasOpenToolbox()) &&
        (this.hasOpenToolbox() || kind === 'bomb' || this.sim.state.landscape[kind] > 0),
      )
      .map(({ kind }) => kind);
  }

  private drawWorld(): void {
    // Terrain cells only when the bitmap changed — traps/hatch/exit animate
    // every frame on their own layer so we don't re-sweep thousands of cells.
    if (this.level.terrain.isDirty()) {
      this.fireLights = drawTerrainLayer(this.terrainGraphics, this.level.terrain, this.sim.state.timeMs).fireLights;
      this.level.terrain.consumeDirty();
    }
    this.setpieceGraphics.clear();
    this.drawOnboardingMarkers();
    if (this.level.playMode?.spawn !== 'tray-drop') {
      this.drawHatch();
      const torch = this.torchPosition();
      drawIndustrialTorch(this.setpieceGraphics, torch.x, torch.y, this.sim.state.timeMs);
    }
    this.drawExit();
    this.drawHazards();
    this.drawEmitters();
    this.drawTraps();
    this.drawLighting();
    this.drawEntityLabels();
    this.drawLemmings();
    this.fxGraphics.clear();
    this.particles.draw(this.fxGraphics);
    this.drawBrushCursor();
    this.drawPlacementCursor();
    if (this.speed > 1 && !this.paused) this.drawFastForwardTint();
  }

  private drawOnboardingMarkers(): void {
    if (!IS_PLAYER_EXPERIENCE || this.levelIndex !== 1 || !this.planning) return;
    this.setpieceGraphics.fillStyle(0x247ba4, 0.12);
    this.setpieceGraphics.fillRoundedRect(420, 372, 120, 108, 8);
    this.setpieceGraphics.lineStyle(2, 0x6ae1ff, 0.7);
    for (let x = 426; x < 534; x += 18) {
      this.setpieceGraphics.lineBetween(x, 382, Math.min(x + 10, 534), 382);
    }
    this.setpieceGraphics.lineBetween(420, 382, 420, 420);
    this.setpieceGraphics.lineBetween(540, 382, 540, 420);
    this.setpieceGraphics.fillStyle(0x6ae1ff, 0.75);
    this.setpieceGraphics.fillTriangle(416, 414, 424, 414, 420, 422);
    this.setpieceGraphics.fillTriangle(536, 414, 544, 414, 540, 422);
  }

  private torchPosition(): { x: number; y: number } {
    return { x: this.level.spawn.x + 42, y: this.level.spawn.y - 18 };
  }

  /** Render-only emissive pools for active materials and powered setpieces. */
  private drawLighting(): void {
    const exit = this.level.exit;
    const sources: WorldLightSource[] = [
      ...this.fireLights,
      {
        x: exit.x + exit.width / 2,
        y: exit.y + exit.height / 2,
        color: WORLD_THEME.mint,
        radius: 54,
        strength: 0.9,
      },
    ];

    if (this.level.playMode?.spawn !== 'tray-drop') {
      const torch = this.torchPosition();
      sources.push(
        { x: this.level.spawn.x, y: this.level.spawn.y - 22, color: WORLD_THEME.sand, radius: 34, strength: 0.45 },
        { x: torch.x, y: torch.y - 8, color: WORLD_THEME.fire, radius: 42, strength: 0.85 },
      );
    }

    for (const hazard of this.level.hazards ?? []) {
      if (hazard.kind !== 'lava') continue;
      sources.push({
        x: hazard.x + hazard.width / 2,
        y: hazard.y + 8,
        color: WORLD_THEME.fire,
        radius: Math.min(76, 28 + hazard.width * 0.28),
        strength: 0.85,
      });
    }

    for (const trap of this.sim.state.traps) {
      if (trap.def.kind !== 'zapper') continue;
      sources.push({
        x: trap.def.x + trap.def.width / 2,
        y: trap.def.y + trap.def.height / 2,
        color: WORLD_THEME.cyan,
        radius: 38,
        strength: trap.phase === 'killing' ? 1 : 0.42,
      });
    }

    for (const emitter of this.sim.state.emitters) {
      if (emitter.budgetLeft <= 0) continue;
      sources.push({
        x: emitter.def.x,
        y: emitter.def.y - 6,
        color: emitter.def.material === 'water' ? WORLD_THEME.cyan : WORLD_THEME.sand,
        radius: 24,
        strength: 0.32,
      });
    }

    drawWorldLights(this.lightGraphics, sources, this.sim.state.timeMs);
  }

  /** Tinted ring at the pointer while a terrain brush is armed. */
  private drawBrushCursor(): void {
    if (!this.brush || this.selectOpen) return;
    const tool = TERRAIN_TOOLS.find((t) => t.kind === this.brush);
    if (!tool) return;
    const pointer = this.input.activePointer;
    const radius = this.brush === 'bomb' ? EXPLOSION_TUNING.blastRadius : 16;
    const g = this.fxGraphics;
    g.fillStyle(tool.color, 0.08);
    g.fillCircle(pointer.worldX, pointer.worldY, radius);
    g.lineStyle(1.5, tool.color, 0.85);
    g.strokeCircle(pointer.worldX, pointer.worldY, radius);
  }

  /** World-space preview for click placement; native drag gets the OS drag ghost. */
  private drawPlacementCursor(): void {
    if (this.brush || this.selectOpen) return;
    const pointer = this.input.activePointer;
    const g = this.fxGraphics;
    if (this.worldTool) {
      const color = this.worldTool === 'hatch' ? 0xffd96b : 0x78ffd6;
      const width = this.worldTool === 'hatch' ? 66 : this.level.exit.width + 16;
      const height = this.worldTool === 'hatch' ? 38 : this.level.exit.height + 16;
      g.fillStyle(color, 0.08);
      g.fillRoundedRect(pointer.worldX - width / 2, pointer.worldY - height / 2, width, height, 6);
      g.lineStyle(2, color, 0.9);
      g.strokeRoundedRect(pointer.worldX - width / 2, pointer.worldY - height / 2, width, height, 6);
      return;
    }
    if (this.crewPlacement) {
      const color = skillPalette(this.crewPlacement).hair;
      g.fillStyle(color, 0.12);
      g.fillCircle(pointer.worldX, pointer.worldY, 12);
      g.lineStyle(2, color, 0.9);
      g.strokeCircle(pointer.worldX, pointer.worldY, 12);
      g.lineBetween(pointer.worldX, pointer.worldY - 18, pointer.worldX, pointer.worldY + 18);
    }
  }

  /** Subtle speed lines while fast-forwarding. */
  private drawFastForwardTint(): void {
    const cam = this.cameras.main;
    const g = this.fxGraphics;
    g.lineStyle(1, 0xffffff, 0.06 * this.speed);
    for (let i = 0; i < 6; i += 1) {
      const y = cam.scrollY + ((this.animClockMs * 0.2 * this.speed + i * 70) % cam.height);
      g.lineBetween(cam.scrollX, y, cam.scrollX + cam.width, y - 12);
    }
  }

  private drawTraps(): void {
    const g = this.setpieceGraphics;
    const t = this.sim.state.timeMs;
    for (const trap of this.sim.state.traps) {
      const { x, y, width, height, kind, cycleMs } = { cycleMs: 1400, ...trap.def };
      // 0 → just sprung, 1 → re-armed; idle traps sit at 1.
      const cycle = trap.phase === 'killing' ? 1 - trap.timerMs / cycleMs : 1;
      if (kind === 'crusher') {
        // Frame posts + a spiked block that slams down early in the cycle.
        g.fillStyle(0x2c333f, 1);
        g.fillRect(x - 3, y - 6, 3, height + 6);
        g.fillRect(x + width, y - 6, 3, height + 6);
        const drop = trap.phase === 'killing' ? (cycle < 0.25 ? cycle / 0.25 : 1 - (cycle - 0.25) / 0.75) : Math.sin(t / 500) * 0.04;
        const blockY = y - 6 + drop * (height - 8);
        g.fillStyle(0x8a93a6, 1);
        g.fillRect(x - 1, blockY, width + 2, 10);
        g.fillStyle(0x59617a, 1);
        for (let sx = x; sx < x + width; sx += 5) {
          g.fillTriangle(sx, blockY + 10, sx + 4, blockY + 10, sx + 2, blockY + 14);
        }
      } else if (kind === 'zapper') {
        // Two tesla posts; an arc flickers across while killing.
        g.fillStyle(0x2c333f, 1);
        g.fillRect(x - 2, y, 4, height);
        g.fillRect(x + width - 2, y, 4, height);
        g.fillStyle(0x8be9ff, 0.9);
        g.fillCircle(x, y + 2, 2.5);
        g.fillCircle(x + width, y + 2, 2.5);
        if (trap.phase === 'killing' || Math.floor(t / 700) % 4 === 0) {
          const alpha = trap.phase === 'killing' ? 0.95 : 0.25;
          g.lineStyle(1.5, 0x8be9ff, alpha);
          let px = x;
          let py = y + 3;
          const segs = 5;
          for (let s = 1; s <= segs; s += 1) {
            const nx = x + (width / segs) * s;
            const ny = y + 3 + (s === segs ? 0 : Math.sin(t / 30 + s * 7) * 4);
            g.lineBetween(px, py, nx, ny);
            px = nx;
            py = ny;
          }
        }
      } else {
        // Chomper: a jaw of teeth rising from the floor, snapping while killing.
        const open = trap.phase === 'killing' ? Math.abs(Math.sin(cycle * Math.PI * 6)) : 0.25 + Math.sin(t / 600) * 0.08;
        const gape = open * (height * 0.6);
        g.fillStyle(0x3a2c3f, 1);
        g.fillRect(x, y + height - 6, width, 6);
        g.fillStyle(0xd8e0ef, 1);
        for (let tx = x; tx < x + width - 2; tx += 6) {
          // Bottom teeth up, top teeth down with the jaw gap between.
          g.fillTriangle(tx, y + height - 5, tx + 5, y + height - 5, tx + 2.5, y + height - 12 - 2);
          const topY = y + height - 16 - gape;
          g.fillTriangle(tx, topY, tx + 5, topY, tx + 2.5, topY + 7);
        }
      }
    }
  }

  private drawExit(): void {
    const exit = this.level.exit;
    const g = this.setpieceGraphics;
    const t = this.sim.state.timeMs;
    // Slow shimmer so the goal reads as alive.
    const pulse = 0.75 + Math.sin(t / 420) * 0.2;
    g.fillStyle(WORLD_THEME.ink, 0.96);
    g.fillRoundedRect(exit.x - 8, exit.y - 8, exit.width + 16, exit.height + 16, 8);
    g.lineStyle(3, WORLD_THEME.mint, pulse);
    g.strokeRoundedRect(exit.x - 8, exit.y - 8, exit.width + 16, exit.height + 16, 8);
    g.lineStyle(1, WORLD_THEME.steelLight, 0.45);
    g.strokeRoundedRect(exit.x - 5, exit.y - 5, exit.width + 10, exit.height + 10, 6);
    // Inner light rays.
    g.lineStyle(1.5, WORLD_THEME.mint, 0.25 + pulse * 0.2);
    const cx = exit.x + exit.width / 2;
    const cy = exit.y + 10;
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI / 2 + (i - 2) * 0.28 + Math.sin(t / 600 + i) * 0.05;
      g.lineBetween(cx, cy, cx + Math.cos(a) * 22, cy + Math.sin(a) * 18);
    }
    g.fillStyle(WORLD_THEME.mint, 0.12 + pulse * 0.14);
    g.fillRect(exit.x, exit.y, exit.width, exit.height);
    g.fillStyle(0xeff7ff, 0.92);
    g.fillTriangle(exit.x + 11, exit.y + 34, exit.x + 30, exit.y + 22, exit.x + 11, exit.y + 10);
  }

  private drawHatch(): void {
    const hatchX = this.level.spawn.x - 33;
    const hatchY = this.level.spawn.y - 42;
    const state = this.sim.state;
    const g = this.setpieceGraphics;
    // 0 → shut, 1 → fully open.
    const open = state.hatchTotalMs > 0 ? 1 - state.hatchOpenMs / state.hatchTotalMs : 1;

    // Soft warm glow under the hatch while closed / opening.
    if (open < 1) {
      g.fillStyle(0xffd96b, 0.08 + open * 0.1);
      g.fillCircle(this.level.spawn.x, hatchY + 24, 30);
    }

    g.fillStyle(WORLD_THEME.steelDark, 1);
    g.fillRoundedRect(hatchX - 3, hatchY - 3, 72, 44, 6);
    g.fillStyle(WORLD_THEME.ink, 0.98);
    g.fillRoundedRect(hatchX, hatchY, 66, 38, 4);
    g.lineStyle(3, WORLD_THEME.sandLight, 1);
    g.strokeRoundedRect(hatchX, hatchY, 66, 38, 4);
    g.lineStyle(3, WORLD_THEME.sand, 0.72);
    for (let x = hatchX + 10; x < hatchX + 62; x += 11) {
      g.lineBetween(x, hatchY + 5, x - 15, hatchY + 33);
    }
    g.fillStyle(0xff3d21, 0.95);
    g.fillRect(this.level.spawn.x - 3, hatchY - 7, 6, 4);

    // Trapdoor doors slide apart from the centre as the hatch opens.
    const opening = 24;
    const doorWidth = (opening / 2) * (1 - open);
    if (doorWidth > 0.5) {
      g.fillStyle(0xffd96b, 0.95);
      g.fillRect(this.level.spawn.x - opening / 2, hatchY + 34, doorWidth, 5);
      g.fillRect(this.level.spawn.x + opening / 2 - doorWidth, hatchY + 34, doorWidth, 5);
    }
    if (open >= 1) {
      // Pulsing drop arrow once open.
      const bob = Math.sin(state.timeMs / 280) * 2;
      g.fillStyle(0xffd96b, 0.95);
      g.fillTriangle(
        this.level.spawn.x - 8,
        hatchY + 39 + bob,
        this.level.spawn.x + 8,
        hatchY + 39 + bob,
        this.level.spawn.x,
        hatchY + 51 + bob,
      );
    }
  }

  private drawHazards(): void {
    const hazards = this.level.hazards ?? [];
    const g = this.setpieceGraphics;
    for (const hazard of hazards) {
      const isLava = hazard.kind === 'lava';
      const surface = isLava ? 0xff5b3a : 0x4ab6ff;
      const deep = isLava ? 0x6e1410 : 0x123a63;
      // Dark basin.
      g.fillStyle(0x0a0d12, 0.85);
      g.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);
      // Molten/liquid body.
      g.fillStyle(deep, 0.9);
      g.fillRect(hazard.x, hazard.y + 6, hazard.width, hazard.height - 6);
      // Animated-looking surface ripples (offset by a slow time wave).
      const t = this.sim.state.timeMs / 240;
      g.fillStyle(surface, isLava ? 0.95 : 0.7);
      const step = 12;
      for (let x = hazard.x; x < hazard.x + hazard.width; x += step) {
        const wave = Math.sin((x + t) * 0.18) * 2;
        g.fillRect(x, hazard.y + 4 + wave, step - 2, 4);
      }
      // Occasional spark / bubble highlights.
      if (Math.floor(this.sim.state.timeMs / 180) % 3 === 0) {
        g.fillStyle(0xffffff, isLava ? 0.35 : 0.25);
        const hx = hazard.x + ((Math.floor(this.sim.state.timeMs / 90) * 17) % Math.max(1, hazard.width - 4));
        g.fillRect(hx, hazard.y + 6, 2, 2);
      }
    }
  }

  private drawEmitters(): void {
    const g = this.setpieceGraphics;
    for (const emitter of this.sim.state.emitters) {
      const { x, y, material } = emitter.def;
      const color = material === 'sand' ? 0xd4a84a : 0x3a9fd8;
      // Nozzle housing with a material-tinted lip.
      g.fillStyle(0x2c333f, 1);
      g.fillRect(x - 7, y - 12, 14, 8);
      g.fillStyle(color, 0.9);
      g.fillRect(x - 4, y - 5, 8, 3);
      // Falling drip while the emitter still has budget.
      if (emitter.budgetLeft > 0 && this.sim.state.outcome === 'running') {
        g.fillStyle(color, 0.8);
        g.fillRect(x - 1.5, y - 2 + ((this.sim.state.timeMs / 30) % 10), 3, 4);
      }
    }
  }

  private drawEntityLabels(): void {
    const visible = new Set<string>();
    if (this.uiSettings.debugLabels) {
      for (const descriptor of worldEntityLabels(this.level, this.sim.state)) {
        visible.add(descriptor.key);
        let label = this.entityLabels.get(descriptor.key);
        if (!label) {
          label = this.add.text(descriptor.x, descriptor.y, '', {
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
            fontSize: '9px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#0d1117dd',
            stroke: '#05070a',
            strokeThickness: 1,
          });
          label.setOrigin(0.5, 1);
          label.setPadding(3, 1, 3, 1);
          label.setDepth(49);
          this.entityLabels.set(descriptor.key, label);
        }
        label.setVisible(true);
        label.setPosition(descriptor.x, descriptor.y);
        label.setText(descriptor.text);
        label.setColor(colorToCss(descriptor.color));
        this.setpieceGraphics.lineStyle(1, descriptor.color, 0.35);
        this.setpieceGraphics.lineBetween(
          descriptor.anchorX,
          descriptor.anchorY,
          descriptor.x,
          descriptor.y + 1,
        );
      }
    }

    for (const [key, label] of this.entityLabels) {
      if (!visible.has(key)) label.setVisible(false);
    }
  }

  private drawLemmings(): void {
    this.actorGraphics.clear();
    const frame = this.animFrame();
    const visibleLabels = new Set<number>();
    const cueTargetId = IS_PLAYER_EXPERIENCE && this.levelIndex === 0 && this.sim.state.skills.basher > 0
      ? this.sim.state.lemmings
          .filter((lemming) => lemming.state === 'walker')
          .sort((a, b) => b.x - a.x || a.id - b.id)[0]?.id ?? null
      : null;
    for (const lemming of this.sim.state.lemmings) {
      if (lemming.state === 'exited') continue;
      const point = this.lemmingDisplayPoints.get(lemming.id) ?? lemming;
      drawLemming(this.actorGraphics, lemming, frame, lemming.id === this.hoveredId, point);
      if (lemming.id === cueTargetId) {
        const pulse = 13 + Math.sin(this.animClockMs / 150) * 2;
        this.actorGraphics.lineStyle(2, 0xffd96b, 0.9);
        this.actorGraphics.strokeCircle(point.x, point.y + 3, pulse);
      }

      if (!this.uiSettings.debugLabels) continue;
      visibleLabels.add(lemming.id);
      let label = this.lemmingLabels.get(lemming.id);
      if (!label) {
        label = this.add.text(point.x, point.y - 24, '', {
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#ffffff',
          backgroundColor: '#0d1117dd',
          stroke: '#05070a',
          strokeThickness: 1,
        });
        label.setOrigin(0.5, 1);
        label.setPadding(3, 1, 3, 1);
        label.setDepth(50);
        this.lemmingLabels.set(lemming.id, label);
      }
      label.setVisible(true);
      const labelY = point.y - 24 - ((lemming.id - 1) % 6) * 18;
      const color = crewColor(lemming);
      label.setPosition(point.x, labelY);
      label.setText(crewLabel(lemming));
      label.setColor(colorToCss(color));
      this.actorGraphics.lineStyle(1, color, 0.35);
      this.actorGraphics.lineBetween(point.x, point.y - 10, point.x, labelY + 1);
    }

    for (const [id, label] of this.lemmingLabels) {
      if (!visibleLabels.has(id)) label.setVisible(false);
    }
  }

}
