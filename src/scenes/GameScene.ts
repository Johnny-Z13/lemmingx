import Phaser from 'phaser';
import { LEVEL_COUNT, PROTOTYPE_LEVEL_INDICES, PROTOTYPE_START_INDEX, SAND_LAB_INDEX } from '../levels/catalog';
import { loadLevelAt } from '../levels/runtimeLoader';
import { GameSimulation } from '../sim/GameSimulation';
import { FixedStepClock } from '../sim/FixedStepClock';
import { MATERIAL } from '../sim/Terrain';
import type { Lemming, LevelDefinition, Skill, WorldEntityKind } from '../sim/types';
import { ALL_SKILLS } from '../sim/types';
import { SKILL_DEFS } from '../sim/skills/registry';
import type { SimEvent } from '../sim/types';
import { Hud, TERRAIN_TOOLS, type TerrainBrush } from '../ui/Hud';
import type { LevelCard, LevelSelect } from '../ui/LevelSelect';
import { Progress, safeBrowserStorage } from '../progress';
import { drawLemming } from '../render/LemmingSprite';
import {
  CREW_SALVAGER_FRAME_SIZE,
  CREW_SALVAGER_TEXTURE_KEY,
  CREW_SALVAGER_TEXTURE_PATH,
  CrewSpriteRenderer,
  canDrawSalvager,
  salvagerTargetMetric,
} from '../render/CrewSpriteRenderer';
import { layoutLemmingCrowds, SALVAGER_CROWD_SPACING, type LemmingDisplayPoint } from '../render/crowdLayout';
import { EXPLOSION_TUNING } from '../sim/terrainTuning';
import { Particles } from '../render/Particles';
import { ChunkedTerrainRenderer } from '../render/TerrainRenderer';
import { drawCampaignSetpieces } from '../render/CampaignSetpieces';
import { INDUSTRIAL_BACKDROP_KEY, WorldBackdrop } from '../render/WorldBackdrop';
import { drawIndustrialTorch, drawWorldLights, type WorldLightSource } from '../render/WorldLights';
import { drawEmitterSetpieces, drawExitSetpiece, drawHatchSetpiece, drawHazardSetpieces, drawTrapSetpieces } from '../render/WorldSetpieces';
import { RenderMotionPreference } from '../render/motionPreference';
import { WORLD_THEME } from '../render/visualTheme';
import { Sfx } from '../audio/Sfx';
import { Music } from '../audio/Music';
import { loadAudioSettings, saveAudioSettings, type AudioSettings } from '../audio/settings';
import { colorToCss, crewColor, crewLabel, skillPalette } from '../render/lemmingIdentity';
import { worldEntityLabels } from '../render/entityLabels';
import { loadUiSettings, saveUiSettings, type GraphicsQuality } from '../ui/settings';
import { ResumeOverlay, type ResumeReason } from '../ui/ResumeOverlay';
import { selectCrewTarget } from '../input/crewTargeting';
import { ContinueOverlay } from '../ui/ContinueOverlay';
import { interpolatePaintStroke } from '../input/paintStroke';
import { FocusLifecycle } from '../lifecycle/FocusLifecycle';
import { CrewActionFeedback } from '../input/crewActionFeedback';
import { canEdgeHoverScroll, canRestoreHeroCamera, canScriptPlayerCameraFocus, playerCameraAttentionFrame, playerCameraBottomSafeScroll, playerCameraCrewFocus, playerCameraFrame, playerCameraGestureFrame, playerCameraLandmarkFrame, playerCameraLockedHudSafeFrame, playerCameraMinimapFrame, playerCameraOccludedWorldHeight, playerCameraOcclusionInsets, playerCameraOcclusionRects, playerCameraPaddedBounds, type PlayerCameraSafeInsets } from '../render/playerCamera';
import { TouchCameraGesture } from '../input/TouchCameraGesture';
import { IS_PLAYER_EXPERIENCE } from '../runtimeMode';
import { IS_MOBILE_DEVICE } from '../deviceProfile';
import { heroMoveChargesForLevel, heroMoveControlState, type HeroMovePhase } from '../input/heroMove';
import type { PauseOptionsOverlay } from '../ui/PauseOptionsOverlay';
import { SITE2_POUR_ZONES, site2PourZoneAt, type Site2PourChoice } from '../onboarding/site2Pour';
import { platform } from '@platform-runtime';
import { ADS_ENABLED } from '../platform/productMode';
import { telemetry } from '../telemetry/Telemetry';
import type { DailyRescueDefinition } from '../meta/catalog';
import { configureDailyLevel } from '../meta/dailyRules';
import type { WorkshopOverlay } from '../meta/WorkshopOverlay';
import {
  FrameBudgetMonitor,
  lowerTier,
  particleBudgetScale,
  readBootPresentationTier,
  terrainAnimationIntervalMs,
  type PresentationTier,
} from '../performance/presentationTier';

/** Animation advances at this many frames per second (shared by all sprites). */
const ANIM_FPS = 12;
/** Pixels: how close the cursor must be to a lemming to hover/select it. */
const HOVER_RADIUS = 16;
const TOUCH_TARGET_RADIUS_CSS = 24;
const GESTURE_THRESHOLD_CSS = 8;
const CAMERA_EVENT_FOCUS_MS = 650;
const CAMERA_USER_GRACE_MS = 1600;
const HERO_MOVE_ZOOM = 3.2;
const HERO_MOVE_BEAT_MS = 650;

export class GameScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private sim!: GameSimulation;
  private hud!: Hud;
  private terrainRenderer?: ChunkedTerrainRenderer;
  private lightGraphics!: Phaser.GameObjects.Graphics;
  private setpieceGraphics!: Phaser.GameObjects.Graphics;
  private actorGraphics!: Phaser.GameObjects.Graphics;
  private crewSpriteRenderer?: CrewSpriteRenderer;
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
  private levelLoadToken = 0;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  /** Edge-scroll only engages once the mouse has actually entered the game. */
  private pointerSeen = false;
  /** Suppress scripted event pans briefly after deliberate user camera input. */
  private manualCameraUntilMs = 0;
  private minimapCameraActive = false;
  private readonly particles = new Particles();
  private readonly sfx = new Sfx();
  private readonly music = new Music();
  private readonly motionPreference = new RenderMotionPreference();
  private audioSettings = loadAudioSettings();
  private uiSettings = loadUiSettings();
  private readonly lemmingLabels = new Map<number, Phaser.GameObjects.Text>();
  private readonly entityLabels = new Map<string, Phaser.GameObjects.Text>();
  private onboardingMarkerLabels: Phaser.GameObjects.Text[] = [];
  private readonly progress = new Progress(safeBrowserStorage());
  private levelSelect?: LevelSelect;
  private selectOpen = false;
  private winRecorded = false;
  private lossRecorded = false;
  private celebrateFired = false;
  private firstExitFocusShown = false;
  private ambientAccMs = 0;
  private sessionActiveMs = 0;
  private siteActiveMs = 0;
  private returningSession = false;
  private expeditionSalvageEarned = 0;
  private expeditionsCompletedThisSession = 0;
  private lastRewardedOfferMs = -90_000;
  private rewardedHintAvailable = false;
  private rewardedDoubleAmount = 0;
  private pendingInterstitial = false;
  private advancingAfterInterstitial = false;
  private adMuted = false;
  private readonly frameBudget = new FrameBudgetMonitor(readBootPresentationTier(IS_MOBILE_DEVICE ? 'mobile' : 'desktop'));
  private presentationTier: PresentationTier = this.frameBudget.tier;
  private lastLongFrameReportMs = -10_000;
  private lastTerrainRedrawCount = 0;
  private hostMuted = false;
  private removePlatformMuteListener: (() => void) | null = null;
  private workshopOverlay?: WorkshopOverlay;
  private dailyRun: { definition: DailyRescueDefinition; date: string } | null = null;
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
  private pauseOptions?: PauseOptionsOverlay;
  private continueOverlay?: ContinueOverlay;
  private firstCommandAccepted = false;
  private site2PourChoice: Site2PourChoice | null = null;
  private routeChoiceRecorded = false;
  private commandsUsed = 0;
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
    if (IS_PLAYER_EXPERIENCE) this.uiSettings.debugLabels = false;
  }

  preload(): void {
    this.load.image(INDUSTRIAL_BACKDROP_KEY, `${import.meta.env.BASE_URL}assets/industrial-cavern-backdrop.webp`);
    this.load.spritesheet(CREW_SALVAGER_TEXTURE_KEY, `${import.meta.env.BASE_URL}${CREW_SALVAGER_TEXTURE_PATH}`, {
      frameWidth: CREW_SALVAGER_FRAME_SIZE,
      frameHeight: CREW_SALVAGER_FRAME_SIZE,
    });
  }

  create(): void {
    this.motionPreference.start();
    this.removePlatformMuteListener = platform.onMuteChange((muted) => {
      this.hostMuted = muted;
      this.applyAudioSettings(this.audioSettings);
    });
    void platform.init().then(() => {
      const tier = readBootPresentationTier(platform.systemInfo().deviceType);
      if (this.frameBudget.constrainTo(tier)) this.applyPresentationTier(this.frameBudget.tier, 'platform');
    });
    this.resumeOverlay = new ResumeOverlay(() => this.resumeFromLifecycle());
    if (IS_PLAYER_EXPERIENCE) {
      this.continueOverlay = new ContinueOverlay(
        () => {
          this.continueOverlay?.hide();
          this.paused = this.planning;
          if (!this.planning && this.sim?.state.outcome === 'running') platform.gameplayStart();
        },
        () => {
          this.continueOverlay?.hide();
          void this.openWorkshop();
        },
      );
    }
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('blur', this.handleWindowBlur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupLifecycle());
    this.installKeyboard();
    if (IS_PLAYER_EXPERIENCE && IS_MOBILE_DEVICE) this.input.addPointer(1);
    this.applyAudioSettings(this.audioSettings);
    this.applyGraphicsQuality(this.uiSettings.graphicsQuality);
    this.applyPresentationTier(this.uiSettings.graphicsQuality === 'low' ? 'low' : this.frameBudget.tier, 'boot');
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
          || this.pauseOptions?.isVisible()
          || this.isPlayerCameraLocked()
          || !this.sim
        ) return;
        const anchor = { x: pointer.x, y: pointer.y };
        this.applyPlayerCameraGesture(anchor, anchor, this.cameras.main.zoom * Math.exp(-dy * 0.0015));
        (pointer.event as WheelEvent | undefined)?.preventDefault();
      },
    );
    if (IS_PLAYER_EXPERIENCE) {
      const returning = this.progress.hasProgress();
      this.returningSession = returning;
      const away = this.progress.applyAwayAccrual(Date.now());
      telemetry.emit('storage_status', this.progress.status);
      this.levelIndex = this.nextUnsolvedLevelIndex();
      void this.startLevel().then(() => {
        telemetry.emitOnce('first_frame', { site: this.levelIndex + 1 });
        if (returning) {
          telemetry.emitOnce('return_session', { awayHours: away.hours, awaySalvage: away.salvageGranted });
          this.paused = true;
          const save = this.progress.snapshot();
          this.continueOverlay?.show({
            levelName: this.level.name ?? `Site ${this.levelIndex + 1}`,
            salvage: save.salvage,
            rescuedTotal: save.rescuedTotal,
            workshopBuilt: save.workshop.length,
            awayHours: away.hours,
            awaySalvage: away.salvageGranted,
            metaUnlocked: this.progress.get(2).completed,
          });
          platform.gameplayStop();
        }
      });
    } else {
      void this.openLevelSelect();
    }
  }

  /** Show the campaign screen (boot, Esc, or from the win/lose overlay). */
  private async openLevelSelect(): Promise<void> {
    this.lifecycle.clear();
    this.resumeOverlay.hide();
    this.pauseOptions?.hide(false);
    this.simClock.reset();
    this.paused = false;
    this.selectOpen = true;
    this.music.stop();
    platform.gameplayStop();
    if (!this.levelSelect) {
      const { LevelSelect } = await import('../ui/LevelSelect');
      this.levelSelect = new LevelSelect((index) => {
        this.unlockAudio();
        this.levelIndex = index;
        this.selectOpen = false;
        this.levelSelect?.hide();
        void this.startLevel();
      });
    }
    const campaignDefinitions = await Promise.all(
      Array.from({ length: LEVEL_COUNT }, (_, index) => loadLevelAt(index)),
    );
    const cards: LevelCard[] = campaignDefinitions.map((def, index) => {
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
      const def = await loadLevelAt(index);
      cards.push({
        index,
        name: def.name ?? `Prototype ${index + 1}`,
        unlocked: true,
        completed: false,
        bestSavedPct: 0,
        prototype: true,
      });
    }
    const lab = await loadLevelAt(SAND_LAB_INDEX);
    cards.push({
      index: SAND_LAB_INDEX,
      name: lab.name ?? 'Sand Lab',
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
    ) return false;
    if (!this.touchCameraGesture.begin(pointer.id, { x: pointer.x, y: pointer.y })) return false;
    this.cameras.main.panEffect.reset();
    this.cameras.main.zoomEffect.reset();
    this.heroReturnCamera = null;
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
      if (this.isPlayerCameraLocked()) return;
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
    if (!this.level || this.isPlayerCameraLocked()) return;
    const camera = this.cameras.main;
    camera.panEffect.reset();
    camera.zoomEffect.reset();
    this.heroReturnCamera = null;
    const current = { zoom: camera.zoom, scrollX: camera.worldView.x, scrollY: camera.worldView.y };
    const insets = this.playerCameraInsets();
    const worldHeight = playerCameraOccludedWorldHeight(this.level.height, insets.bottom, camera.zoom);
    this.setPlayerCameraBounds(worldHeight);
    const frame = playerCameraGestureFrame(
      current,
      previousAnchor,
      currentAnchor,
      requestedZoom,
      { x: camera.width, y: camera.height },
      { width: this.level.width, height: worldHeight },
      playerCameraCrewFocus(this.sim.state.lemmings, current, { x: camera.width, y: camera.height }),
    );
    this.setPlayerCameraFrame(frame);
    this.manualCameraUntilMs = this.animClockMs + CAMERA_USER_GRACE_MS;
  }

  private applyMinimapCamera(fractionX: number, fractionY: number): void {
    if (!IS_PLAYER_EXPERIENCE || this.isPlayerCameraLocked()) return;
    const camera = this.cameras.main;
    const insets = this.playerCameraInsets();
    const worldHeight = playerCameraOccludedWorldHeight(this.level.height, insets.bottom, camera.zoom);
    this.setPlayerCameraBounds(worldHeight);
    const frame = playerCameraMinimapFrame(
      this.level,
      { width: camera.width, height: camera.height },
      camera.zoom,
      insets.bottom,
      fractionX,
      fractionY,
    );
    this.setPlayerCameraFrame(frame);
  }

  private resetCameraGestures(): void {
    this.touchCameraGesture.reset();
    this.pendingTouchBrush = null;
    this.minimapCameraActive = false;
    // Lifecycle suspension may interrupt a focused/resolving Hero beat. Keep
    // its return frame; only deliberate user camera input invalidates it.
  }

  /** Pure camera helpers use visible-world top-left; Phaser stores zoom-offset raw scroll. */
  private setPlayerCameraFrame(frame: { zoom: number; scrollX: number; scrollY: number }): void {
    const camera = this.cameras.main;
    camera.setZoom(frame.zoom);
    camera.centerOn(
      frame.scrollX + camera.width / frame.zoom / 2,
      frame.scrollY + camera.height / frame.zoom / 2,
    );
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
    if (IS_PLAYER_EXPERIENCE && this.levelIndex === 1 && this.planning && brush === 'water') {
      if (this.site2PourChoice !== null) return;
      const zone = site2PourZoneAt(worldX, worldY);
      if (!zone) {
        telemetry.emit('tool_invalid', { site: 2, tool: 'water' });
        this.crewActionFeedback.show('missed-pour', this.animClockMs);
        this.particles.ring(worldX, worldY, 10, {
          color: 0xff5b7f,
          speed: 0.04,
          lifeMs: 240,
          size: 1.4,
        });
        return;
      }
      const x = zone.x + zone.width / 2;
      const y = zone.y + zone.height / 2;
      if (!this.sim.paintLandscape(x, y, zone.paintRadius, brush)) return;
      this.commandsUsed += 1;
      this.site2PourChoice = zone.id;
      this.routeChoiceRecorded = true;
      this.progress.markStarted();
      telemetry.emitOnce('first_input', { site: 2, tool: 'water' });
      telemetry.emit('route_choice', { site: 2, route: zone.id });
      this.lastStampX = x;
      this.lastStampY = y;
      this.brush = null;
      this.painting = false;
      this.sfx.play('assign');
      this.particles.ring(x, y, zone.paintRadius * 0.48, {
        color: [0x6ae1ff, 0xffffff],
        speed: 0.08,
        lifeMs: 420,
        size: 1.8,
      });
      return;
    }

    const painted = this.sim.paintLandscape(worldX, worldY, 16, brush);
    if (painted) {
      this.commandsUsed += 1;
      this.lastStampX = worldX;
      this.lastStampY = worldY;
      if (IS_PLAYER_EXPERIENCE && this.levelIndex >= 2 && !this.planning) this.paused = false;
      if (IS_PLAYER_EXPERIENCE && this.levelIndex < LEVEL_COUNT && !this.dailyRun) {
        this.progress.markStarted();
        telemetry.emitOnce('first_input', { site: this.levelIndex + 1, tool: brush });
        if (this.levelIndex === 2 && brush === 'sand' && !this.routeChoiceRecorded) {
          this.routeChoiceRecorded = true;
          telemetry.emit('route_choice', { site: 3, route: 'lossless-sand' });
        }
      }
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
    if (this.selectOpen || !this.sim) return; // frozen behind level select
    if (this.lifecycle.isSuspended()) return;
    const budget = this.frameBudget.observe(delta);
    if (budget.changed) this.applyPresentationTier(budget.tier, 'automatic');
    if (budget.longFrame && this.animClockMs - this.lastLongFrameReportMs >= 10_000) {
      this.lastLongFrameReportMs = this.animClockMs;
      telemetry.emit('long_frame', {
        frameMs: Math.round(delta),
        tier: this.presentationTier,
        particles: this.particles.count,
        redrawnChunks: this.lastTerrainRedrawCount,
      });
    }
    if (
      this.sim.state.outcome === 'running' &&
      !this.pauseOptions?.isVisible() &&
      !this.continueOverlay?.isVisible() &&
      (!this.paused || this.planning)
    ) {
      this.sessionActiveMs += delta;
      this.siteActiveMs += delta;
      if (this.sessionActiveMs >= 60_000) telemetry.emitOnce('active_60s');
      if (this.sessionActiveMs >= 90_000) telemetry.emitOnce('active_90s');
    }
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
      if (IS_PLAYER_EXPERIENCE && this.levelIndex < LEVEL_COUNT) {
        if (this.dailyRun) {
          const { definition, date } = this.dailyRun;
          const mastery = definition.variant === 'perfect'
            ? this.sim.state.lost === 0
            : definition.variant === 'rush'
              ? this.sim.state.timeMs <= 120_000
              : this.sim.state.saved === this.sim.state.totalLemmings;
          const score = `${definition.id}:${this.sim.state.saved}.${this.commandsUsed}.${Math.round(this.sim.state.timeMs / 100)}`;
          this.progress.completeDaily(date, mastery, score);
          telemetry.emit('site_complete', { daily: true, mastery, saved: this.sim.state.saved });
        } else {
          this.progress.recordWin(this.levelIndex, pct);
          telemetry.emit('site_complete', {
            site: this.levelIndex + 1,
            saved: this.sim.state.saved,
            total: this.sim.state.totalLemmings,
          });
          if (this.levelIndex === 2) telemetry.emitOnce('first_expedition_complete');
          if (this.isExpeditionBoundary()) {
            this.expeditionsCompletedThisSession += 1;
            const canOfferDouble = ADS_ENABLED
              && this.returningSession
              && this.sessionActiveMs >= 90_000
              && this.expeditionSalvageEarned > 0
              && this.sessionActiveMs - this.lastRewardedOfferMs >= 90_000;
            if (canOfferDouble) {
              this.rewardedDoubleAmount = this.expeditionSalvageEarned;
              this.lastRewardedOfferMs = this.sessionActiveMs;
              telemetry.emit('ad_offer', { placement: 'expedition-double', amount: this.rewardedDoubleAmount });
            } else if (ADS_ENABLED && this.returningSession && this.expeditionsCompletedThisSession >= 3) {
              this.pendingInterstitial = true;
            }
          }
        }
        platform.gameplayStop();
      }
    }
    if (this.sim.state.outcome === 'lost' && !this.lossRecorded) {
      this.lossRecorded = true;
      if (IS_PLAYER_EXPERIENCE && this.levelIndex < LEVEL_COUNT) {
        if (this.dailyRun) {
          telemetry.emit('site_fail', { daily: true, site: this.levelIndex + 1 });
        } else {
          const failures = this.progress.recordFailure(this.levelIndex);
          telemetry.emit('site_fail', { site: this.levelIndex + 1, failures });
          if (
            ADS_ENABLED && failures === 2 && this.siteActiveMs >= 90_000
            && this.sessionActiveMs - this.lastRewardedOfferMs >= 90_000
          ) {
            this.rewardedHintAvailable = true;
            this.lastRewardedOfferMs = this.sessionActiveMs;
            telemetry.emit('ad_offer', { placement: 'deeper-hint', site: this.levelIndex + 1 });
          }
        }
        platform.gameplayStop();
      }
    }
    if (this.sim.state.outcome === 'won' && !this.celebrateFired) {
      this.celebrateFired = true;
      this.fireWinCelebrate();
    }
    this.animClockMs += delta;
    this.worldBackdrop?.update(this.visualTime());
    this.particles.update(this.paused ? 0 : delta * this.speed);
    this.updateAmbient(delta);
    this.updateCamera(delta);
    this.lemmingDisplayPoints = layoutLemmingCrowds(
      this.sim.state.lemmings,
      this.visualTime(),
      SALVAGER_CROWD_SPACING,
      { minX: 22, maxX: this.level.width - 22 },
    );
    this.updateHover();
    this.drawWorld();
    this.hud.update(this.sim.state, this.hudView());
  }

  /** Camera pan: arrow keys + screen-edge scroll (drag pan lives in create()). */
  private updateCamera(deltaMs: number): void {
    const cam = this.cameras.main;
    if (this.pauseOptions?.isVisible() || this.isPlayerCameraLocked()) return;
    const insets = IS_PLAYER_EXPERIENCE ? this.playerCameraInsets() : null;
    if (insets) {
      this.setPlayerCameraBounds(playerCameraOccludedWorldHeight(this.level.height, insets.bottom, cam.zoom));
    }
    const pan = 420 * (deltaMs / 1000);

    let panX = 0;
    let panY = 0;
    if (this.cursors) {
      if (this.cursors.left.isDown) panX -= pan;
      if (this.cursors.right.isDown) panX += pan;
      if (this.cursors.up.isDown) panY -= pan;
      if (this.cursors.down.isDown) panY += pan;
    }

    if (canEdgeHoverScroll(this.pointerSeen, this.input.activePointer.wasTouch)) {
      const pointer = this.input.activePointer;
      const edge = 24;
      if (pointer.x >= 0 && pointer.y >= 0 && pointer.x <= this.scale.width && pointer.y <= this.scale.height) {
        if (pointer.x < edge) panX -= pan;
        else if (pointer.x > this.scale.width - edge) panX += pan;
        if (pointer.y < edge) panY -= pan;
        else if (pointer.y > this.scale.height - edge) panY += pan;
      }
    }
    if (panX !== 0 || panY !== 0) {
      cam.panEffect.reset();
      cam.zoomEffect.reset();
      this.heroReturnCamera = null;
      cam.scrollX += panX;
      cam.scrollY += panY;
      this.manualCameraUntilMs = this.animClockMs + CAMERA_USER_GRACE_MS;
    }
  }

  private playerCameraInsets(): PlayerCameraSafeInsets {
    const cam = this.cameras.main;
    return playerCameraOcclusionInsets(
      this.game.canvas.getBoundingClientRect(),
      { x: cam.width, y: cam.height },
      this.hud.gameplayEdgeOcclusions(),
    );
  }

  private setPlayerCameraBounds(worldHeight: number): void {
    const cam = this.cameras.main;
    const bounds = playerCameraPaddedBounds(
      { width: this.level.width, height: worldHeight },
      { width: cam.width, height: cam.height },
      { width: cam.displayWidth, height: cam.displayHeight },
    );
    cam.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  private frameScrollingRoomAboveHud(): void {
    if (!IS_PLAYER_EXPERIENCE) return;
    const cam = this.cameras.main;
    const insets = this.playerCameraInsets();
    const worldHeight = playerCameraOccludedWorldHeight(this.level.height, insets.bottom, cam.zoom);
    this.setPlayerCameraBounds(worldHeight);
    if (this.isPlayerCameraLocked()) {
      this.setPlayerCameraFrame(playerCameraLockedHudSafeFrame(
        this.level.height,
        cam.height,
        insets.bottom,
      ));
      return;
    }
    if (this.level.width > cam.width && this.level.height <= cam.height) {
      const scrollY = playerCameraBottomSafeScroll(this.level.height, cam.height, insets.bottom, cam.zoom);
      const initial = playerCameraFrame(this.level, { width: cam.width, height: cam.height });
      this.setPlayerCameraFrame({ zoom: cam.zoom, scrollX: initial.scrollX, scrollY });
    }
  }

  /** Route sim events to sound + particle feedback. */
  private consumeEvents(events: SimEvent[]): void {
    for (const e of events) {
      if (IS_PLAYER_EXPERIENCE && this.levelIndex < LEVEL_COUNT && !this.dailyRun) {
        if (e.kind === 'bash' && this.levelIndex === 0) {
          telemetry.emitOnce('first_chain_reaction', { site: 1 });
        }
        if (e.kind === 'exit') {
          const grant = this.progress.awardRescue(this.levelIndex, this.sim.state.saved);
          if (this.levelIndex === 0) this.progress.discover('blast-opens-floodgate');
          if (this.levelIndex === 1) this.progress.discover('wood-floats');
          if (grant.salvageGranted > 0) {
            this.expeditionSalvageEarned += grant.salvageGranted;
            telemetry.emitOnce('first_reward', { site: this.levelIndex + 1, salvage: grant.salvageGranted });
          }
        } else if (e.kind === 'clank') {
          this.progress.discover('steel-resists-tools');
        } else if (e.kind === 'splash') {
          this.progress.discover('water-breaks-falls');
        } else if (e.kind === 'explode') {
          this.progress.discover('blast-carves-terrain');
        } else if (e.kind === 'burn') {
          this.progress.discover('fire-burns-crew');
        } else if (e.kind === 'material' && e.interaction) {
          this.progress.discover(e.interaction);
        }
      }
      if (e.kind === 'trap') this.sfx.playTrap(e.trapKind);
      else if (e.kind !== 'material') this.sfx.play(e.kind);
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
            this.focusPlayerCameraEvent(e.x, e.y);
          }
          break;
        case 'splat':
          if (IS_PLAYER_EXPERIENCE) {
            this.particles.burst(e.x, e.y + 7, 12, {
              color: [0xffd96b, WORLD_THEME.dirtSpeck, WORLD_THEME.steelLight],
              speed: 0.11,
              spread: Math.PI,
              lifeMs: 520,
              size: 2.2,
            });
          } else {
            this.particles.bloodSplat(e.x, e.y + 8);
            if (!this.reducedMotion) this.cameras.main.flash(90, 145, 0, 20);
          }
          this.addShake(9);
          this.focusPlayerCameraEvent(e.x, e.y);
          break;
        case 'drown':
          this.particles.burst(e.x, e.y, 10, { color: [0x4ab6ff, 0xffffff], speed: 0.1, lifeMs: 550, size: 2, upward: true });
          this.focusPlayerCameraEvent(e.x, e.y);
          break;
        case 'splash':
          this.particles.burst(e.x, e.y - 2, 9, { color: [0x8ad4ff, 0x3a9fd8, 0xffffff], speed: 0.12, spread: Math.PI * 0.9, angle: -Math.PI / 2, lifeMs: 420, size: 2 });
          break;
        case 'burn':
          this.particles.burst(e.x, e.y, 18, { color: [0xff3d21, 0xff7a2d, 0xffd96b, 0x5e6575], speed: 0.16, lifeMs: 820, size: 2.8, upward: true });
          this.addShake(4);
          this.focusPlayerCameraEvent(e.x, e.y);
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
          this.focusPlayerCameraEvent(e.x, e.y);
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
        case 'material':
          this.particles.ring(e.x, e.y, 7, { color: [0x6ae1ff, 0x78ffd6], speed: 0.04, lifeMs: 360, size: 1.4 });
          break;
      }
    }
  }

  private addShake(amount: number): void {
    if (this.reducedMotion) return;
    // Phaser camera shake: duration ms, intensity as fraction of viewport.
    const intensity = Math.min(0.018, amount * 0.0018);
    this.cameras.main.shake(160 + amount * 18, intensity);
  }

  /** Soft ambient sparkles at the exit so the goal always reads alive. */
  private updateAmbient(deltaMs: number): void {
    if (
      this.reducedMotion ||
      this.uiSettings.graphicsQuality === 'low' ||
      this.paused ||
      this.sim.state.outcome !== 'running'
    ) return;
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
    const heroControl = this.heroMoveControl();
    const cam = this.cameras.main;
    const scrolls = this.level.width > this.scale.width || this.level.height > this.scale.height;
    const levelPrefix = this.dailyRun
      ? 'Daily'
      : this.isLab()
      ? 'Lab'
      : this.isPrototype()
        ? `Prototype ${this.levelIndex + 1}`
        : this.levelIndex <= 2
          ? `First Shift · ${this.levelIndex + 1}/3`
          : this.levelIndex <= 5
            ? `Pressure Works · ${this.levelIndex - 2}/3`
            : this.levelIndex <= 8
              ? `Hazard Line · ${this.levelIndex - 5}/3`
              : 'The Last Crossing';
    return {
      paused: this.paused || this.lifecycle.isSuspended(),
      planning: this.planning,
      salvage: this.progress.salvage,
      atlasFound: this.progress.atlasCount,
      atlasTotal: 14,
      showSpeed: !IS_PLAYER_EXPERIENCE || this.levelIndex !== 0 || this.firstCommandAccepted,
      showStart: !IS_PLAYER_EXPERIENCE || this.levelIndex !== 1 || this.site2PourChoice !== null,
      startLabel: IS_PLAYER_EXPERIENCE && this.levelIndex === 1 ? 'RELEASE' : IS_MOBILE_DEVICE ? 'PLAY' : 'START RUN',
      showMission: !IS_PLAYER_EXPERIENCE || this.levelIndex !== 1 || this.site2PourChoice !== null,
      compactMission: IS_PLAYER_EXPERIENCE && this.levelIndex === 1,
      speed: this.speed,
      nukeReady: this.sim.state.outcome === 'running' && !this.planning && !this.sim.state.nuking,
      hoveredJob: hovered ? SKILL_DEFS[hovered.state as Skill]?.label ?? this.titleCase(hovered.state) : null,
      levelName: `${levelPrefix} · ${this.dailyRun?.definition.title ?? this.level.name ?? (IS_PLAYER_EXPERIENCE ? 'Swarmwright' : 'LemmingX')}`,
      objective: this.dailyRun?.definition.rule ?? this.level.objective ?? `Save ${this.level.targetSaved} crew.`,
      hint: this.dailyRun?.definition.mastery ?? this.level.hint ?? 'Choose a tool, then change the route.',
      hasNextLevel: !this.dailyRun && !this.isLab() && !this.isPrototype() && this.levelIndex < LEVEL_COUNT - 1,
      showWorkshop: this.progress.get(2).completed,
      signalLampActive: this.progress.hasProject('signal-lamp'),
      deeperHint: this.deepHintForLevel(),
      freeDeeperHint: !this.dailyRun && this.progress.getSite(this.levelIndex).failures >= 3,
      rewardedHintAvailable: this.rewardedHintAvailable,
      rewardedDoubleAmount: this.rewardedDoubleAmount,
      brush: this.brush,
      crewPlacement: this.crewPlacement,
      worldTool: this.worldTool,
      canPlaceWorldEntities: this.planning && this.sim.state.spawned === 0,
      prompt: this.planningPrompt(),
      hasTerrainTools: IS_PLAYER_EXPERIENCE
        ? (this.playerVisibleTerrainTools()?.length ?? 0) > 0
        : this.hasOpenToolbox() || Object.values(this.level.landscape ?? {}).some((n) => (n ?? 0) > 0),
      actionCue: this.playerActionCue(),
      heroMove: {
        phase: this.heroMovePhase,
        charges: this.heroMoveCharges,
        visible: heroControl.visible,
        canArm: heroControl.canArm,
        skillLabel: SKILL_DEFS[this.sim.state.selectedSkill].label,
        crewLabel: heroTarget ? crewLabel(heroTarget) : null,
      },
      minimap: scrolls && (!IS_PLAYER_EXPERIENCE || this.levelIndex >= 3)
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
    if (IS_PLAYER_EXPERIENCE && this.planning && this.levelIndex === 1) {
      return this.site2PourChoice === null
        ? 'Choose one glowing pour and predict how the timber will rise.'
        : 'The lock is filling. Release the crew when the crossing looks ready.';
    }
    return this.prototypePrompt();
  }

  private playerActionCue(): string | null {
    if (!IS_PLAYER_EXPERIENCE) return null;
    const feedback = this.crewActionFeedback.current(this.animClockMs);
    if (feedback) return feedback;
    if (this.levelIndex === 0 && !this.firstCommandAccepted && this.sim.state.skills.basher > 0) {
      return 'TAP THE CREW';
    }
    if (this.levelIndex === 1 && this.planning && this.site2PourChoice === null) {
      return 'POUR WATER';
    }
    if (this.levelIndex === 1 && this.planning && this.site2PourChoice !== null) return null;
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

  private visualTime(): number {
    return this.reducedMotion ? 0 : this.animClockMs;
  }

  private get reducedMotion(): boolean {
    return this.motionPreference.reduced;
  }

  /** Track which lemming the cursor is over, for the selection ring. */
  private updateHover(): void {
    const pointer = this.input.activePointer;
    const target = this.findNearestLemming(pointer.worldX, pointer.worldY, HOVER_RADIUS);
    this.hoveredId = target?.id ?? null;
  }

  private async startLevel(): Promise<void> {
    const loadToken = ++this.levelLoadToken;
    this.lifecycle.clear();
    this.resumeOverlay.hide();
    this.pauseOptions?.hide(false);
    const level = await loadLevelAt(this.levelIndex);
    if (loadToken !== this.levelLoadToken) return;
    this.level = level;
    if (this.dailyRun) configureDailyLevel(this.level, this.dailyRun.definition);
    this.sim = new GameSimulation(this.level);
    this.winRecorded = false;
    this.lossRecorded = false;
    this.firstExitFocusShown = false;
    this.siteActiveMs = 0;
    this.rewardedHintAvailable = false;
    this.rewardedDoubleAmount = 0;
    this.pendingInterstitial = false;
    if (!this.dailyRun && [0, 3, 6, 9].includes(this.levelIndex)) this.expeditionSalvageEarned = 0;

    this.crewSpriteRenderer?.clear();
    this.crewSpriteRenderer = undefined;
    this.terrainRenderer?.clear();
    this.terrainRenderer = undefined;
    this.children.removeAll(true);
    this.lemmingLabels.clear();
    this.entityLabels.clear();
    this.onboardingMarkerLabels = [];
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
      this.setPlayerCameraBounds(this.level.height);
      this.setPlayerCameraFrame(frame);
    } else {
      camera.setZoom(1);
      camera.centerOn(this.level.spawn.x, this.level.spawn.y);
    }

    this.worldBackdrop = new WorldBackdrop(this, this.level.width, this.level.height);
    this.terrainRenderer = new ChunkedTerrainRenderer(this, 0);
    this.terrainRenderer.setAnimationIntervalMs(terrainAnimationIntervalMs(this.presentationTier));
    this.lightGraphics = this.add.graphics().setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
    this.setpieceGraphics = this.add.graphics().setDepth(10);
    if (IS_PLAYER_EXPERIENCE && this.levelIndex === 1) {
      this.onboardingMarkerLabels = SITE2_POUR_ZONES.map((zone, index) => this.add.text(
        zone.x + zone.width / 2,
        zone.y + zone.height / 2,
        index === 0 ? 'FAST' : 'HIGH',
        {
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: index === 0 ? '#d7f6ff' : '#d9fff0',
          stroke: '#061019',
          strokeThickness: 3,
        },
      ).setOrigin(0.5).setDepth(11));
    }
    this.actorGraphics = this.add.graphics().setDepth(21);
    this.crewSpriteRenderer = new CrewSpriteRenderer(this);
    this.fxGraphics = this.add.graphics().setDepth(30);

    this.particles.clear();
    this.simClock.reset();
    this.crewActionFeedback.reset();
    this.firstCommandAccepted = false;
    this.site2PourChoice = null;
    this.routeChoiceRecorded = false;
    this.commandsUsed = 0;
    this.planning = !this.isLab() && (!IS_PLAYER_EXPERIENCE || this.levelIndex === 1);
    this.paused = this.planning;
    this.speed = 1;
    this.heroMovePhase = 'idle';
    this.heroMoveCharges = IS_PLAYER_EXPERIENCE ? 0 : heroMoveChargesForLevel(this.levelIndex, LEVEL_COUNT);
    this.heroMoveTargetId = null;
    this.heroMoveBeatRemainingMs = 0;
    this.manualCameraUntilMs = 0;
    this.minimapCameraActive = false;
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
        this.pauseForTargeting();
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
        this.pauseForTargeting();
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
      onRestart: () => this.restartLevel(),
      onOpenOptions: () => this.openPauseOptions(),
      onCycleSpeed: () => this.cycleSpeed(),
      onArmHeroMove: () => this.armHeroMove(),
      onCommitHeroMove: () => this.commitHeroMove(),
      onCancelHeroMove: () => this.cancelHeroMove(),
      onNext: () => this.nextLevel(),
      onMinimapControlStart: () => {
        this.minimapCameraActive = true;
        this.cameras.main.panEffect.reset();
        this.cameras.main.zoomEffect.reset();
        this.heroReturnCamera = null;
      },
      onMinimapJump: (fx, fy) => {
        this.cameras.main.panEffect.reset();
        this.applyMinimapCamera(fx, fy);
      },
      onMinimapControlEnd: () => {
        this.minimapCameraActive = false;
        this.manualCameraUntilMs = this.animClockMs + CAMERA_USER_GRACE_MS;
      },
      onLevelSelect: () => this.openPlayerNavigation(),
      onRewardedHint: () => this.requestRewardedHint(),
      onRewardedDouble: () => this.requestRewardedDouble(),
      onDebugLabelsChange: (enabled) => this.setDebugLabels(enabled),
    }, {
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
    this.frameScrollingRoomAboveHud();

    this.music.play(this.levelIndex);
    if (IS_PLAYER_EXPERIENCE && this.levelIndex < LEVEL_COUNT) {
      if (this.dailyRun) {
        telemetry.emit('site_start', { daily: true, site: this.levelIndex + 1 });
      } else {
        this.progress.setCurrentSite(this.levelIndex);
        telemetry.emit('site_start', { site: this.levelIndex + 1 });
        if (this.levelIndex === 3) telemetry.emitOnce('second_expedition_started');
      }
      platform.gameplayStart();
    }
  }

  private unlockAudio(): void {
    this.sfx.unlock();
    this.music.unlock();
  }

  private applyAudioSettings(settings: AudioSettings): void {
    this.audioSettings = settings;
    this.sfx.setMuted(settings.sfxMuted || this.hostMuted || this.adMuted);
    this.sfx.setVolume(settings.sfxVolume);
    this.music.setMuted(settings.musicMuted || this.hostMuted || this.adMuted);
    this.music.setVolume(settings.musicVolume);
  }

  private applyGraphicsQuality(quality: GraphicsQuality): void {
    const effective = quality === 'low' ? 'low' : this.frameBudget.tier;
    this.applyPresentationTier(effective, 'setting');
  }

  private setGraphicsQuality(quality: GraphicsQuality): void {
    this.uiSettings.graphicsQuality = quality;
    saveUiSettings(this.uiSettings);
    this.applyGraphicsQuality(quality);
  }

  private applyPresentationTier(tier: PresentationTier, reason: 'boot' | 'platform' | 'automatic' | 'setting'): void {
    const effective = this.uiSettings.graphicsQuality === 'low' ? 'low' : lowerTier(tier, this.frameBudget.tier);
    this.presentationTier = effective;
    document.body.dataset.presentationTier = effective;
    document.body.classList.toggle('graphics-low', effective === 'low');
    document.body.classList.toggle('graphics-medium', effective === 'medium');
    this.particles.setBudgetScale(particleBudgetScale(effective));
    this.terrainRenderer?.setAnimationIntervalMs(terrainAnimationIntervalMs(effective));
    if (effective === 'low') this.lightGraphics?.clear();
    if (reason === 'automatic') telemetry.emit('quality_step_down', { tier: effective });
  }

  private setDebugLabels(enabled: boolean): void {
    if (IS_PLAYER_EXPERIENCE) return;
    this.uiSettings.debugLabels = enabled;
    saveUiSettings(this.uiSettings);
    this.hud?.setDebugLabels(enabled);
  }

  /** Advance to the next level; from the finale, back to the level select. */
  private nextLevel(): void {
    if (this.pendingInterstitial && !this.advancingAfterInterstitial) {
      this.pendingInterstitial = false;
      const requested = this.requestAdBreak('midgame', 'expedition-interstitial', () => {
        this.advancingAfterInterstitial = true;
        this.nextLevel();
        this.advancingAfterInterstitial = false;
      }, true);
      if (requested) return;
    }
    if (IS_PLAYER_EXPERIENCE && [2, 5, 8, 9].includes(this.levelIndex)) {
      void this.openWorkshop();
      return;
    }
    if (this.isLab() || this.isPrototype() || this.levelIndex + 1 >= LEVEL_COUNT) {
      this.openPlayerNavigation();
      return;
    }
    this.levelIndex += 1;
    this.startLevel();
  }

  private openPlayerNavigation(): void {
    if (IS_PLAYER_EXPERIENCE && this.progress.get(2).completed) {
      void this.openWorkshop();
      return;
    }
    this.openLevelSelect();
  }

  private async openWorkshop(): Promise<void> {
    if (!IS_PLAYER_EXPERIENCE) {
      this.openLevelSelect();
      return;
    }
    this.paused = true;
    this.painting = false;
    this.canvasGesture = null;
    this.pauseOptions?.hide(false);
    platform.gameplayStop();
    if (!this.workshopOverlay) {
      const { WorkshopOverlay } = await import('../meta/WorkshopOverlay');
      this.workshopOverlay = new WorkshopOverlay({
        onContinue: () => {
          this.workshopOverlay?.hide();
          this.dailyRun = null;
          this.levelIndex = this.nextUnsolvedLevelIndex();
          this.startLevel();
        },
        onPurchase: (id, cost) => {
          if (!this.progress.purchaseProject(id, cost)) return;
          telemetry.emitOnce('first_project_purchased', { project: id, cost });
          this.workshopOverlay?.show(this.progress.snapshot());
        },
        onDaily: (definition, date) => {
          this.workshopOverlay?.hide();
          this.dailyRun = { definition, date };
          this.progress.startDaily(date);
          this.levelIndex = definition.baseSite;
          this.startLevel();
        },
        onTestYard: () => {
          this.workshopOverlay?.hide();
          this.dailyRun = null;
          this.levelIndex = SAND_LAB_INDEX;
          this.startLevel();
        },
      });
    }
    this.workshopOverlay.show(this.progress.snapshot());
  }

  private isExpeditionBoundary(): boolean {
    return !this.dailyRun && [2, 5, 8, 9].includes(this.levelIndex);
  }

  private deepHintForLevel(): string {
    const hints = [
      'Order the lead crew to Bash before the dirt face; the breach releases the reservoir.',
      'Pour into the lower FAST zone for the quickest timber lift, then release the hatch.',
      'Hold the crowd with a Blocker, then choose a Bomber breach or a three-pour Sand ramp.',
      'Save one Basher for each of the three dirt walls; the marsh itself is safe to wade.',
      'Dig just before the steel cap so the shaft passes beneath its protected edge.',
      'Build a Sand berm over the crusher trigger before the crowd reaches the machines.',
      'Ignite both timber doors while the hatch is still safe; water protects the route.',
      'Assign Miner on the lower mountain face so the diagonal tunnel meets the exit shelf.',
      'Give each crew member Floater and Climber before the first fatal drop.',
      'Bash, build twice over the first gap, bash again, then dig the final shelf.',
    ];
    return hints[this.levelIndex] ?? this.level.hint ?? 'Change one material relationship at a time.';
  }

  private requestRewardedHint(): void {
    if (!ADS_ENABLED || !this.rewardedHintAvailable) return;
    this.rewardedHintAvailable = false;
    telemetry.emit('ad_accept', { placement: 'deeper-hint' });
    this.requestAdBreak('rewarded', 'deeper-hint', () => {
      this.hud.showDeeperHint(this.deepHintForLevel());
    });
  }

  private requestRewardedDouble(): void {
    const amount = this.rewardedDoubleAmount;
    if (!ADS_ENABLED || amount <= 0) return;
    this.rewardedDoubleAmount = 0;
    this.pendingInterstitial = false;
    telemetry.emit('ad_accept', { placement: 'expedition-double', amount });
    this.requestAdBreak('rewarded', 'expedition-double', () => {
      this.progress.grantBonusSalvage(amount);
      this.hud.invalidateOutcome();
    });
  }

  private requestAdBreak(
    kind: 'rewarded' | 'midgame',
    placement: string,
    onSuccess: () => void,
    continueOnError = false,
  ): boolean {
    let settled = false;
    const finish = (success: boolean, error?: unknown) => {
      if (settled) return;
      settled = true;
      this.adMuted = false;
      this.applyAudioSettings(this.audioSettings);
      if (success) {
        telemetry.emit('ad_complete', { placement });
        onSuccess();
      } else {
        telemetry.emit('ad_error', { placement, error: error instanceof Error ? error.name : 'unavailable' });
        if (continueOnError) onSuccess();
      }
    };
    const requested = platform.requestAd(kind, {
      onStarted: () => {
        this.adMuted = true;
        this.applyAudioSettings(this.audioSettings);
        platform.gameplayStop();
        telemetry.emit('ad_started', { placement });
      },
      onFinished: () => finish(true),
      onError: (error) => finish(false, error),
    });
    if (!requested) return false;
    return true;
  }

  private selectSkill(skill: Skill): void {
    this.sim.setSelectedSkill(skill);
  }

  private pauseForTargeting(): void {
    if (
      !IS_PLAYER_EXPERIENCE || this.levelIndex < 2 || this.planning ||
      this.sim.state.outcome !== 'running'
    ) return;
    this.paused = true;
    this.simClock.reset();
  }

  private triggerNuke(): void {
    if (this.planning || this.sim.state.outcome !== 'running' || this.sim.state.nuking) return;
    this.sim.nukeAll();
  }

  private startRun(): void {
    if (this.lifecycle.isSuspended() || !this.planning || this.sim.state.outcome !== 'running') return;
    if (IS_PLAYER_EXPERIENCE && this.levelIndex === 1 && this.site2PourChoice === null) return;
    this.planning = false;
    this.paused = false;
    this.simClock.reset();
    this.worldTool = null;
    platform.gameplayStart();
    this.focusPlayerCamera(this.level.spawn.x);
  }

  private restartLevel(): void {
    if (IS_PLAYER_EXPERIENCE && this.sim?.state.outcome === 'lost') {
      telemetry.emit('site_retry', { site: this.levelIndex + 1 });
    }
    this.startLevel();
  }

  private isPlayerCameraLocked(): boolean {
    return IS_PLAYER_EXPERIENCE && this.levelIndex < 2;
  }

  /** Briefly present a horizontal landmark without undoing the HUD-safe route height. */
  private focusPlayerCamera(focusX: number): void {
    if (!IS_PLAYER_EXPERIENCE || this.levelIndex < 2 || this.levelIndex >= LEVEL_COUNT) return;
    if (!canScriptPlayerCameraFocus(this.minimapCameraActive, this.animClockMs, this.manualCameraUntilMs)) return;
    const camera = this.cameras.main;
    const frame = playerCameraLandmarkFrame(
      this.level,
      { width: camera.width, height: camera.height },
      camera.zoom,
      focusX,
    );
    const visibleWidth = camera.width / frame.zoom;
    camera.pan(
      frame.scrollX + visibleWidth / 2,
      camera.midPoint.y,
      CAMERA_EVENT_FOCUS_MS,
      'Sine.easeInOut',
      true,
    );
  }

  /** Event pans make the smallest HUD-safe correction and always yield to the player. */
  private focusPlayerCameraEvent(x: number, y: number): void {
    if (!IS_PLAYER_EXPERIENCE || this.levelIndex < 2 || this.levelIndex >= LEVEL_COUNT) return;
    if (!canScriptPlayerCameraFocus(this.minimapCameraActive, this.animClockMs, this.manualCameraUntilMs)) return;
    const camera = this.cameras.main;
    if (camera.panEffect.isRunning) return;
    const canvasRect = this.game.canvas.getBoundingClientRect();
    const viewport = { x: camera.width, y: camera.height };
    const occluders = this.hud.gameplayOcclusions();
    const insets = playerCameraOcclusionInsets(canvasRect, viewport, this.hud.gameplayEdgeOcclusions());
    const occlusions = playerCameraOcclusionRects(canvasRect, viewport, occluders);
    const worldHeight = playerCameraOccludedWorldHeight(this.level.height, insets.bottom, camera.zoom);
    const current = { zoom: camera.zoom, scrollX: camera.worldView.x, scrollY: camera.worldView.y };
    const frame = playerCameraAttentionFrame(
      [{ x, y, state: 'faller', fuseMs: null }],
      current,
      { x: camera.width, y: camera.height },
      { width: this.level.width, height: worldHeight },
      insets,
      occlusions,
    );
    if (Math.abs(frame.scrollX - current.scrollX) < 0.5 && Math.abs(frame.scrollY - current.scrollY) < 0.5) return;
    this.setPlayerCameraBounds(worldHeight);
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
    if (this.pauseOptions?.isVisible()) {
      this.closePauseOptions();
      return;
    }
    if (this.planning) {
      this.startRun();
      return;
    }
    this.openPauseOptions();
  }

  private async openPauseOptions(): Promise<void> {
    if (this.sim.state.outcome !== 'running' || this.pauseOptions?.isVisible()) return;
    if (this.heroMovePhase !== 'idle') return;
    this.painting = false;
    this.pendingTouchBrush = null;
    this.canvasGesture = null;
    this.resetCameraGestures();
    this.paused = true;
    this.simClock.reset();
    platform.gameplayStop();
    if (!this.pauseOptions) {
      const { PauseOptionsOverlay } = await import('../ui/PauseOptionsOverlay');
      this.pauseOptions ??= new PauseOptionsOverlay({
        onResume: () => this.closePauseOptions(),
        onRestart: () => {
          this.closePauseOptions(false);
          this.restartLevel();
        },
        onLevelSelect: () => {
          this.closePauseOptions(false);
          this.openPlayerNavigation();
        },
        onAudioChange: (settings) => {
          this.applyAudioSettings(settings);
          saveAudioSettings(settings);
        },
        onGraphicsQualityChange: (quality) => this.setGraphicsQuality(quality),
        onDeleteSaveData: () => this.deleteSaveData(),
      });
    }
    this.pauseOptions.show({
      audio: this.audioSettings,
      graphicsQuality: this.uiSettings.graphicsQuality,
      campaignAvailable: !IS_PLAYER_EXPERIENCE || this.progress.get(2).completed,
    });
  }

  private closePauseOptions(restoreFocus = true): void {
    if (!this.pauseOptions?.isVisible()) return;
    this.pauseOptions.hide(restoreFocus);
    this.paused = this.planning;
    this.simClock.reset();
    if (!this.planning) platform.gameplayStart();
  }

  private deleteSaveData(): void {
    this.progress.reset();
    this.levelIndex = 0;
    this.closePauseOptions(false);
    this.startLevel();
  }

  private cycleSpeed(): void {
    if (IS_PLAYER_EXPERIENCE && this.levelIndex === 0 && !this.firstCommandAccepted) return;
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
      if (this.pauseOptions?.isVisible()) return; // the modal owns its controls
      const key = event.key.toLowerCase();

      if (!IS_PLAYER_EXPERIENCE && key === 'q' && this.level.playMode?.spawn !== 'tray-drop') {
        this.sim.enqueueRelease(this.sim.state.selectedSkill);
        return;
      } else if (!IS_PLAYER_EXPERIENCE && key === 'backspace') {
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
          this.pauseForTargeting();
          return;
        }
      }

      // Skill hotkeys (1–9) map to the registry's declared hotkeys.
      const skill = ALL_SKILLS.find((s) => SKILL_DEFS[s].hotkey === key);
      if (skill) {
        this.brush = null;
        this.worldTool = null;
        this.selectSkill(skill);
        this.pauseForTargeting();
        this.crewPlacement = this.level.playMode?.spawn === 'tray-drop' ? skill : null;
        return;
      }
      if (key === ' ' || key === 'spacebar') {
        event.preventDefault();
        this.togglePause();
      } else if (key === 'f') {
        this.cycleSpeed();
      } else if (key === 'e' && !IS_PLAYER_EXPERIENCE) {
        this.armHeroMove();
      } else if (key === 'n') {
        this.triggerNuke();
      } else if (key === 'h') {
        this.hud.toggleCollapsed();
      } else if (key === 'l' && !IS_PLAYER_EXPERIENCE) {
        this.setDebugLabels(!this.uiSettings.debugLabels);
      } else if (key === 'r') {
        this.restartLevel();
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
    this.lifecycle.suspend();
  }

  private resumeFromLifecycle(): void {
    this.lifecycle.resume();
  }

  private cleanupLifecycle(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    this.crewSpriteRenderer?.clear();
    this.crewSpriteRenderer = undefined;
    this.terrainRenderer?.clear();
    this.terrainRenderer = undefined;
    this.motionPreference.stop();
    this.resumeOverlay.destroy();
    this.pauseOptions?.destroy();
    this.continueOverlay?.destroy();
    this.workshopOverlay?.destroy();
    this.workshopOverlay = undefined;
    this.removePlatformMuteListener?.();
    this.removePlatformMuteListener = null;
    document.body.classList.remove('graphics-low');
  }

  private assignSelectedSkillTo(target: Lemming): void {
    if (this.sim.state.outcome !== 'running') return;
    if (this.sim.assignSkill(target.id, this.sim.state.selectedSkill)) {
      this.commandsUsed += 1;
      if (IS_PLAYER_EXPERIENCE && this.levelIndex >= 2 && !this.planning) this.paused = false;
      if (IS_PLAYER_EXPERIENCE && this.levelIndex < LEVEL_COUNT) {
        const skill = this.sim.state.selectedSkill;
        this.progress.markStarted();
        telemetry.emitOnce('first_input', { site: this.levelIndex + 1, tool: skill });
        telemetry.emit('tool_assigned', { site: this.levelIndex + 1, tool: skill });
        if (this.levelIndex === 2 && skill === 'bomber' && !this.routeChoiceRecorded) {
          this.routeChoiceRecorded = true;
          telemetry.emit('route_choice', { site: 3, route: 'fast-charge' });
        }
      }
      if (IS_PLAYER_EXPERIENCE && this.levelIndex === 0) {
        this.firstCommandAccepted = true;
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
      if (IS_PLAYER_EXPERIENCE) {
        telemetry.emit('tool_invalid', { site: this.levelIndex + 1, tool: this.sim.state.selectedSkill });
      }
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
      this.sim.state.outcome !== 'running' || !this.heroMoveControl().canArm
    ) return;
    this.heroMovePhase = 'armed';
    this.canvasGesture = null;
  }

  private heroMoveControl() {
    const selectedSkill = this.sim.state.selectedSkill;
    const hasAssignableSkill = this.hasOpenToolbox() || this.sim.state.skills[selectedSkill] > 0;
    return heroMoveControlState(
      this.heroMoveCharges,
      hasAssignableSkill,
      Boolean(this.brush || this.crewPlacement || this.worldTool || this.minimapCameraActive),
    );
  }

  private focusHeroMove(target: Lemming): void {
    if (
      this.heroMovePhase !== 'armed' || this.minimapCameraActive ||
      target.state === 'dead' || target.state === 'exited'
    ) return;
    const camera = this.cameras.main;
    this.heroReturnCamera = { zoom: camera.zoom, scrollX: camera.worldView.x, scrollY: camera.worldView.y };
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
    if (canRestoreHeroCamera(
      frame !== null,
      this.minimapCameraActive,
    ) && frame) {
      const camera = this.cameras.main;
      const visibleWidth = camera.width / frame.zoom;
      const visibleHeight = camera.height / frame.zoom;
      camera.pan(frame.scrollX + visibleWidth / 2, frame.scrollY + visibleHeight / 2, 320, 'Sine.easeInOut', true);
      camera.zoomTo(frame.zoom, 320, 'Sine.easeInOut', true);
    }
    this.heroReturnCamera = null;
  }

  private findNearestLemming(worldX: number, worldY: number, radius = 26): Lemming | null {
    return selectCrewTarget(
      this.sim.state.lemmings,
      this.lemmingDisplayPoints,
      worldX,
      worldY,
      radius,
      (lemming, point) => canDrawSalvager(lemming) ? point.y - 3 : point.y + 4,
      (lemming, point, targetX, targetY, centerY) =>
        canDrawSalvager(lemming)
          ? salvagerTargetMetric(lemming, point, targetX, targetY, centerY)
          : { distanceSq: (point.x - targetX) ** 2 + (centerY - targetY) ** 2, visualPriority: 0 },
    );
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
    const bySite: ReadonlyArray<readonly Skill[]> = [
      ['basher'],
      [],
      ['blocker', 'bomber'],
      ['basher'],
      ['digger'],
      [],
      [],
      ['miner'],
      ['floater', 'climber'],
      ['basher', 'builder', 'digger'],
    ];
    return bySite[this.levelIndex] ?? [];
  }

  private playerVisibleTerrainTools(): readonly TerrainBrush[] | undefined {
    if (!IS_PLAYER_EXPERIENCE) return undefined;
    const bySite: ReadonlyArray<readonly TerrainBrush[]> = [
      [],
      ['water'],
      ['sand'],
      [],
      [],
      ['sand'],
      ['fire'],
      [],
      [],
      [],
    ];
    return bySite[this.levelIndex] ?? [];
  }

  private drawWorld(): void {
    // Persistent chunks redraw only where material cells or animated surfaces
    // changed; setpieces and actors remain on their independent frame layers.
    if (this.terrainRenderer) {
      const result = this.terrainRenderer.render(this.level.terrain, this.visualTime());
      this.fireLights = result.fireLights;
      this.lastTerrainRedrawCount = result.redrawnChunks;
    }
    this.setpieceGraphics.clear();
    this.drawOnboardingMarkers();
    drawCampaignSetpieces(this.setpieceGraphics, this.levelIndex, this.visualTime());
    if (this.level.playMode?.spawn !== 'tray-drop') {
      this.drawHatch();
      const torch = this.torchPosition();
      drawIndustrialTorch(this.setpieceGraphics, torch.x, torch.y, this.visualTime());
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
    const pulse = 0.62 + Math.sin(this.visualTime() * 0.006) * 0.18;
    if (this.site2PourChoice !== null) {
      for (const label of this.onboardingMarkerLabels) label.setVisible(false);
      this.setpieceGraphics.lineStyle(4, 0xffd96b, pulse);
      this.setpieceGraphics.strokeCircle(this.level.spawn.x, this.level.spawn.y - 10, 30);
      this.setpieceGraphics.fillStyle(0xffd96b, pulse);
      this.setpieceGraphics.fillTriangle(
        this.level.spawn.x - 7,
        this.level.spawn.y - 48,
        this.level.spawn.x + 7,
        this.level.spawn.y - 48,
        this.level.spawn.x,
        this.level.spawn.y - 37,
      );
      return;
    }
    for (const label of this.onboardingMarkerLabels) label.setVisible(true);
    for (const [index, zone] of SITE2_POUR_ZONES.entries()) {
      const color = index === 0 ? 0x6ae1ff : 0x78ffd6;
      this.setpieceGraphics.fillStyle(color, 0.14);
      this.setpieceGraphics.fillRoundedRect(zone.x, zone.y, zone.width, zone.height, 7);
      this.setpieceGraphics.lineStyle(3, color, pulse);
      this.setpieceGraphics.strokeRoundedRect(zone.x, zone.y, zone.width, zone.height, 7);
    }
  }

  private torchPosition(): { x: number; y: number } {
    return { x: this.level.spawn.x + 42, y: this.level.spawn.y - 18 };
  }

  /** Render-only emissive pools for active materials and powered setpieces. */
  private drawLighting(): void {
    if (this.presentationTier === 'low') {
      this.lightGraphics.clear();
      return;
    }
    const exit = this.level.exit;
    const sources: WorldLightSource[] = [
      {
        x: exit.x + exit.width / 2,
        y: exit.y + exit.height / 2,
        color: WORLD_THEME.mint,
        radius: 82,
        strength: this.planning ? 0.48 : 1,
      },
    ];

    if (this.level.playMode?.spawn !== 'tray-drop') {
      const torch = this.torchPosition();
      sources.push(
        { x: this.level.spawn.x, y: this.level.spawn.y - 22, color: WORLD_THEME.sand, radius: 66, strength: 0.72 },
        { x: torch.x, y: torch.y - 8, color: WORLD_THEME.fire, radius: 54, strength: 0.9 },
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
      const advancing = !this.planning && !this.paused && this.sim.state.outcome === 'running';
      const clear = this.level.terrain.materialAt(emitter.def.x, emitter.def.y) === MATERIAL.empty;
      if (!advancing || !emitter.active || emitter.budgetLeft <= 0 || !clear) continue;
      sources.push({
        x: emitter.def.x,
        y: emitter.def.y - 6,
        color: emitter.def.material === 'water' ? WORLD_THEME.cyan : WORLD_THEME.sand,
        radius: 24,
        strength: 0.32,
      });
    }

    sources.push(...this.fireLights);

    drawWorldLights(
      this.lightGraphics,
      this.presentationTier === 'medium' ? sources.slice(0, 14) : sources,
      this.visualTime(),
    );
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
    if (this.reducedMotion) return;
    const cam = this.cameras.main;
    const g = this.fxGraphics;
    g.lineStyle(1, 0xffffff, 0.06 * this.speed);
    for (let i = 0; i < 6; i += 1) {
      const y = cam.scrollY + ((this.animClockMs * 0.2 * this.speed + i * 70) % cam.height);
      g.lineBetween(cam.scrollX, y, cam.scrollX + cam.width, y - 12);
    }
  }

  private drawTraps(): void {
    drawTrapSetpieces(this.setpieceGraphics, this.sim.state.traps, this.visualTime());
  }

  private drawExit(): void {
    drawExitSetpiece(this.setpieceGraphics, {
      exit: this.level.exit,
      powered: !this.planning,
      saved: this.sim.state.saved,
      targetSaved: this.level.targetSaved,
      timeMs: this.visualTime(),
    });
  }

  private drawHatch(): void {
    drawHatchSetpiece(this.setpieceGraphics, {
      spawn: this.level.spawn,
      planning: this.planning,
      hatchOpenMs: this.sim.state.hatchOpenMs,
      hatchTotalMs: this.sim.state.hatchTotalMs,
      timeMs: this.visualTime(),
    });
  }

  private drawHazards(): void {
    drawHazardSetpieces(this.setpieceGraphics, this.level.hazards ?? [], this.visualTime());
  }

  private drawEmitters(): void {
    drawEmitterSetpieces(
      this.setpieceGraphics,
      this.sim.state.emitters,
      this.visualTime(),
      !this.planning && !this.paused && this.sim.state.outcome === 'running',
      (emitter) => this.level.terrain.materialAt(emitter.def.x, emitter.def.y) === MATERIAL.empty,
    );
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
    this.crewSpriteRenderer?.beginFrame();
    const frame = this.animFrame();
    const visibleLabels = new Set<number>();
    const cachedCrew: Array<{ lemming: Lemming; point: LemmingDisplayPoint; selected: boolean }> = [];
    const cueTargetId = IS_PLAYER_EXPERIENCE && this.levelIndex === 0 && this.sim.state.skills.basher > 0
      ? this.sim.state.lemmings
          .filter((lemming) => lemming.state === 'walker')
          .sort((a, b) => b.x - a.x || a.id - b.id)[0]?.id ?? null
      : null;
    for (const lemming of this.sim.state.lemmings) {
      if (lemming.state === 'exited') continue;
      const point = this.lemmingDisplayPoints.get(lemming.id) ?? lemming;
      const selected = lemming.id === this.hoveredId;
      const cachedSprite = this.crewSpriteRenderer?.draw(lemming, frame, point) ?? false;
      if (!cachedSprite) {
        drawLemming(this.actorGraphics, lemming, frame, selected, point);
      } else {
        cachedCrew.push({ lemming, point, selected });
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

    // Keep canopy lines below live water/fuse effects; generated body and tool
    // silhouettes already share one cached sprite and deterministic depth.
    for (const { lemming, point } of cachedCrew) {
      this.crewSpriteRenderer?.drawBaseOverlays(this.actorGraphics, lemming, point);
    }
    for (const { lemming, point } of cachedCrew) {
      this.crewSpriteRenderer?.drawGearOverlays(this.actorGraphics, lemming, frame, point);
    }
    for (const { point, selected } of cachedCrew) {
      if (!selected) continue;
      const pulse = 14 + Math.sin(frame * 0.6) * 1.5;
      this.actorGraphics.lineStyle(2, 0xffffff, 0.9);
      this.actorGraphics.strokeCircle(point.x, point.y + 6, pulse);
      this.actorGraphics.lineStyle(1, 0x6ae1ff, 0.45);
      this.actorGraphics.strokeCircle(point.x, point.y + 6, pulse + 3);
    }
    if (cueTargetId !== null) {
      const cueTarget = this.sim.state.lemmings.find(({ id }) => id === cueTargetId);
      if (cueTarget) {
        const point = this.lemmingDisplayPoints.get(cueTarget.id) ?? cueTarget;
        const pulse = 13 + Math.sin(this.animClockMs / 150) * 2;
        this.actorGraphics.lineStyle(2, 0xffd96b, 0.9);
        this.actorGraphics.strokeCircle(point.x, point.y + 3, pulse);
      }
    }

    for (const [id, label] of this.lemmingLabels) {
      if (!visibleLabels.has(id)) label.setVisible(false);
    }
  }

}
