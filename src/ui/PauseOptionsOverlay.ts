import type { AudioSettings } from '../audio/settings';
import { BodyModalLock, registerBodyModalChild } from '../lifecycle/BodyModalLock';
import type { GraphicsQuality } from './settings';

export interface PauseOptionsState {
  audio: AudioSettings;
  graphicsQuality: GraphicsQuality;
  campaignAvailable: boolean;
}

export interface PauseOptionsEvents {
  onResume: () => void;
  onRestart: () => void;
  onLevelSelect: () => void;
  onAudioChange: (settings: AudioSettings) => void;
  onGraphicsQualityChange: (quality: GraphicsQuality) => void;
  onDeleteSaveData: () => void;
}

/** Blocking pause surface for infrequent game commands and persisted options. */
export class PauseOptionsOverlay {
  private readonly root: HTMLDivElement;
  private readonly musicToggle: HTMLButtonElement;
  private readonly sfxToggle: HTMLButtonElement;
  private readonly musicVolume: HTMLInputElement;
  private readonly sfxVolume: HTMLInputElement;
  private readonly musicVolumeValue: HTMLOutputElement;
  private readonly sfxVolumeValue: HTMLOutputElement;
  private readonly highQualityButton: HTMLButtonElement;
  private readonly lowQualityButton: HTMLButtonElement;
  private readonly deleteButton: HTMLButtonElement;
  private readonly deleteConfirm: HTMLDivElement;
  private readonly cancelDeleteButton: HTMLButtonElement;
  private readonly resumeButton: HTMLButtonElement;
  private readonly campaignButton: HTMLButtonElement;
  private state: PauseOptionsState = {
    audio: { musicMuted: true, musicVolume: 0.5, sfxMuted: false, sfxVolume: 0.5 },
    graphicsQuality: 'high',
    campaignAvailable: false,
  };
  private modalLock: BodyModalLock | null = null;
  private previousFocus: HTMLElement | null = null;

  constructor(private readonly events: PauseOptionsEvents) {
    this.root = document.createElement('div');
    this.root.className = 'pause-options';
    this.root.hidden = true;
    this.root.innerHTML = `
      <section class="pause-options__panel" role="dialog" aria-modal="true" aria-labelledby="pause-options-title">
        <header class="pause-options__header">
          <span class="pause-options__kicker">Run paused</span>
          <h1 id="pause-options-title">Options</h1>
          <p>The crew and living terrain are frozen.</p>
        </header>

        <div class="pause-options__settings">
          <div class="pause-options__setting">
            <div>
              <strong>Music</strong>
              <span>Campaign soundtrack</span>
            </div>
            <button class="pause-options__toggle" type="button" data-audio-toggle="music" role="switch" aria-label="Music"></button>
            <label class="pause-options__volume">
              <span class="sr-only">Music volume</span>
              <input type="range" min="0" max="100" data-audio-volume="music">
              <output data-audio-value="music"></output>
            </label>
          </div>

          <div class="pause-options__setting">
            <div>
              <strong>Sound FX</strong>
              <span>Actions, hazards, and crew feedback</span>
            </div>
            <button class="pause-options__toggle" type="button" data-audio-toggle="sfx" role="switch" aria-label="Sound FX"></button>
            <label class="pause-options__volume">
              <span class="sr-only">Sound effects volume</span>
              <input type="range" min="0" max="100" data-audio-volume="sfx">
              <output data-audio-value="sfx"></output>
            </label>
          </div>

          <div class="pause-options__setting pause-options__setting--graphics">
            <div>
              <strong>Graphics</strong>
              <span>Low reduces lighting, ambient FX, and blur</span>
            </div>
            <div class="pause-options__choice" role="group" aria-label="Graphics quality">
              <button type="button" data-quality="high">High</button>
              <button type="button" data-quality="low">Low</button>
            </div>
          </div>
        </div>

        <div class="pause-options__actions">
          <button class="pause-options__resume" type="button">Resume</button>
          <button type="button" data-action="restart">Restart Level</button>
          <button type="button" data-action="levels">Campaign</button>
        </div>

        <div class="pause-options__save">
          <button class="pause-options__delete" type="button">Delete Save Data</button>
          <div class="pause-options__confirm" role="alert" hidden>
            <span><strong>Are you sure?</strong> Campaign progress and best scores will be erased.</span>
            <div>
              <button type="button" data-delete="cancel">No, keep it</button>
              <button class="pause-options__delete-confirm" type="button" data-delete="confirm">Yes, delete</button>
            </div>
          </div>
        </div>
      </section>`;

    this.musicToggle = this.root.querySelector('[data-audio-toggle="music"]') as HTMLButtonElement;
    this.sfxToggle = this.root.querySelector('[data-audio-toggle="sfx"]') as HTMLButtonElement;
    this.musicVolume = this.root.querySelector('[data-audio-volume="music"]') as HTMLInputElement;
    this.sfxVolume = this.root.querySelector('[data-audio-volume="sfx"]') as HTMLInputElement;
    this.musicVolumeValue = this.root.querySelector('[data-audio-value="music"]') as HTMLOutputElement;
    this.sfxVolumeValue = this.root.querySelector('[data-audio-value="sfx"]') as HTMLOutputElement;
    this.highQualityButton = this.root.querySelector('[data-quality="high"]') as HTMLButtonElement;
    this.lowQualityButton = this.root.querySelector('[data-quality="low"]') as HTMLButtonElement;
    this.deleteButton = this.root.querySelector('.pause-options__delete') as HTMLButtonElement;
    this.deleteConfirm = this.root.querySelector('.pause-options__confirm') as HTMLDivElement;
    this.cancelDeleteButton = this.root.querySelector('[data-delete="cancel"]') as HTMLButtonElement;
    this.resumeButton = this.root.querySelector('.pause-options__resume') as HTMLButtonElement;
    this.campaignButton = this.root.querySelector('[data-action="levels"]') as HTMLButtonElement;

    this.resumeButton.addEventListener('click', events.onResume);
    this.root.querySelector('[data-action="restart"]')?.addEventListener('click', events.onRestart);
    this.root.querySelector('[data-action="levels"]')?.addEventListener('click', events.onLevelSelect);
    this.musicToggle.addEventListener('click', () => this.toggleAudio('music'));
    this.sfxToggle.addEventListener('click', () => this.toggleAudio('sfx'));
    this.musicVolume.addEventListener('input', () => this.changeVolume('music'));
    this.sfxVolume.addEventListener('input', () => this.changeVolume('sfx'));
    this.highQualityButton.addEventListener('click', () => this.setGraphicsQuality('high'));
    this.lowQualityButton.addEventListener('click', () => this.setGraphicsQuality('low'));
    this.deleteButton.addEventListener('click', () => this.showDeleteConfirmation());
    this.cancelDeleteButton.addEventListener('click', () => this.hideDeleteConfirmation());
    this.root.querySelector('[data-delete="confirm"]')?.addEventListener('click', events.onDeleteSaveData);
    this.root.addEventListener('keydown', (event) => this.handleKeyDown(event));

    document.body.append(this.root);
    registerBodyModalChild(this.root);
  }

  show(state: PauseOptionsState): void {
    this.state = { audio: { ...state.audio }, graphicsQuality: state.graphicsQuality, campaignAvailable: state.campaignAvailable };
    this.syncControls();
    this.hideDeleteConfirmation(false);
    if (!this.root.hidden) return;
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.root.hidden = false;
    this.modalLock = new BodyModalLock(
      this.root,
      (element) => element.classList.contains('resume-overlay'),
    );
    this.resumeButton.focus({ preventScroll: true });
  }

  hide(restoreFocus = true): void {
    if (this.root.hidden) return;
    this.root.hidden = true;
    this.modalLock?.release();
    this.modalLock = null;
    if (
      restoreFocus &&
      this.previousFocus?.isConnected &&
      !this.previousFocus.inert &&
      this.previousFocus.getClientRects().length > 0
    ) {
      this.previousFocus.focus({ preventScroll: true });
    }
    this.previousFocus = null;
  }

  isVisible(): boolean {
    return !this.root.hidden;
  }

  destroy(): void {
    this.modalLock?.release();
    this.modalLock = null;
    this.root.remove();
  }

  private toggleAudio(kind: 'music' | 'sfx'): void {
    if (kind === 'music') this.state.audio.musicMuted = !this.state.audio.musicMuted;
    else this.state.audio.sfxMuted = !this.state.audio.sfxMuted;
    this.syncControls();
    this.events.onAudioChange({ ...this.state.audio });
  }

  private changeVolume(kind: 'music' | 'sfx'): void {
    if (kind === 'music') {
      this.state.audio.musicVolume = Number(this.musicVolume.value) / 100;
      if (this.state.audio.musicVolume > 0) this.state.audio.musicMuted = false;
    } else {
      this.state.audio.sfxVolume = Number(this.sfxVolume.value) / 100;
      if (this.state.audio.sfxVolume > 0) this.state.audio.sfxMuted = false;
    }
    this.syncControls();
    this.events.onAudioChange({ ...this.state.audio });
  }

  private setGraphicsQuality(quality: GraphicsQuality): void {
    if (this.state.graphicsQuality === quality) return;
    this.state.graphicsQuality = quality;
    this.syncControls();
    this.events.onGraphicsQualityChange(quality);
  }

  private syncControls(): void {
    this.syncToggle(this.musicToggle, !this.state.audio.musicMuted);
    this.syncToggle(this.sfxToggle, !this.state.audio.sfxMuted);
    this.musicVolume.value = String(Math.round(this.state.audio.musicVolume * 100));
    this.sfxVolume.value = String(Math.round(this.state.audio.sfxVolume * 100));
    this.musicVolumeValue.textContent = `${this.musicVolume.value}%`;
    this.sfxVolumeValue.textContent = `${this.sfxVolume.value}%`;
    this.highQualityButton.setAttribute('aria-pressed', String(this.state.graphicsQuality === 'high'));
    this.lowQualityButton.setAttribute('aria-pressed', String(this.state.graphicsQuality === 'low'));
    this.campaignButton.hidden = !this.state.campaignAvailable;
  }

  private syncToggle(button: HTMLButtonElement, enabled: boolean): void {
    button.textContent = enabled ? 'On' : 'Off';
    button.setAttribute('aria-checked', String(enabled));
    button.classList.toggle('is-on', enabled);
  }

  private showDeleteConfirmation(): void {
    this.deleteButton.hidden = true;
    this.deleteConfirm.hidden = false;
    this.cancelDeleteButton.focus({ preventScroll: true });
  }

  private hideDeleteConfirmation(restoreFocus = true): void {
    this.deleteConfirm.hidden = true;
    this.deleteButton.hidden = false;
    if (restoreFocus) this.deleteButton.focus({ preventScroll: true });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key !== 'Escape') return;
    event.preventDefault();
    if (!this.deleteConfirm.hidden) this.hideDeleteConfirmation();
    else this.events.onResume();
  }
}
