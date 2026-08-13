import { describe, expect, it } from 'vitest';
import { resolveSandboxMode } from '../src/runtimeMode';

describe('runtime mode', () => {
  it('keeps the canonical player experience when no sandbox preference exists', () => {
    expect(resolveSandboxMode({
      playerBuild: true,
      sandboxAvailable: true,
      storedPreference: null,
    })).toBe(false);
  });

  it('allows the local development server to enter Sandbox', () => {
    expect(resolveSandboxMode({
      playerBuild: true,
      sandboxAvailable: true,
      storedPreference: 'enabled',
    })).toBe(true);
  });

  it('fails closed when a compiled build contains a stale Sandbox preference', () => {
    expect(resolveSandboxMode({
      playerBuild: true,
      sandboxAvailable: false,
      storedPreference: 'enabled',
    })).toBe(false);
  });

  it('keeps the internal test build in Sandbox mode', () => {
    expect(resolveSandboxMode({
      playerBuild: false,
      sandboxAvailable: false,
      storedPreference: null,
    })).toBe(true);
  });
});
