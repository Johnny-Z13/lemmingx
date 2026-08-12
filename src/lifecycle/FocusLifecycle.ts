export interface FocusLifecycleHooks {
  onSuspend: () => void;
  onResume: () => void;
}

/** Idempotent focus gate; wall-time reset/audio details stay in scene hooks. */
export class FocusLifecycle {
  private suspended = false;

  constructor(private readonly hooks: FocusLifecycleHooks) {}

  suspend(): boolean {
    if (this.suspended) return false;
    this.suspended = true;
    this.hooks.onSuspend();
    return true;
  }

  resume(): boolean {
    if (!this.suspended) return false;
    this.hooks.onResume();
    this.suspended = false;
    return true;
  }

  clear(): void {
    this.suspended = false;
  }

  isSuspended(): boolean {
    return this.suspended;
  }
}
