interface SandboxModeInput {
  playerBuild: boolean;
  sandboxAvailable: boolean;
  storedPreference: string | null;
}

const SANDBOX_STORAGE_KEY = 'lemmingx.devSandbox.v1';

export function resolveSandboxMode(input: SandboxModeInput): boolean {
  if (!input.playerBuild) return true;
  return input.sandboxAvailable && input.storedPreference === 'enabled';
}

function readSandboxPreference(): string | null {
  if (!__DEV_SANDBOX_AVAILABLE__ || typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(SANDBOX_STORAGE_KEY);
  } catch {
    return null;
  }
}

export const DEV_SANDBOX_AVAILABLE = __DEV_SANDBOX_AVAILABLE__;
export const DEV_SANDBOX_ENABLED = resolveSandboxMode({
  playerBuild: __PLAYER_BUILD__,
  sandboxAvailable: DEV_SANDBOX_AVAILABLE,
  storedPreference: readSandboxPreference(),
});
export const IS_PLAYER_EXPERIENCE = !DEV_SANDBOX_ENABLED;

export function setDevSandboxEnabled(enabled: boolean): boolean {
  if (!DEV_SANDBOX_AVAILABLE || typeof window === 'undefined') return false;
  try {
    if (enabled) window.sessionStorage.setItem(SANDBOX_STORAGE_KEY, 'enabled');
    else window.sessionStorage.removeItem(SANDBOX_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
