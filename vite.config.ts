import { defineConfig } from 'vite';
// @ts-expect-error This repo intentionally omits the full Node type package.
import { execFileSync } from 'node:child_process';
import packageJson from './package.json' with { type: 'json' };
import { BUILD_TAG } from './src/version.ts';

function gitValue(args: string[], fallback: string): string {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim() || fallback;
  } catch {
    return fallback;
  }
}

const BUILD_COMMIT = gitValue(['rev-parse', '--short', 'HEAD'], 'uncommitted');
const BUILD_MESSAGE = gitValue(['log', '-1', '--pretty=%s'], 'local build');

export default defineConfig(({ command, mode }) => ({
  base: command === 'build' ? './' : '/',
  resolve: {
    alias: {
      '@platform-runtime': new URL(
        mode === 'crazygames-full'
          ? './src/platform/PlatformAdapter.full.ts'
          : './src/platform/PlatformAdapter.ts',
        import.meta.url,
      ).pathname,
    },
  },
  define: {
    __PLAYER_BUILD__: JSON.stringify(mode !== 'test'),
    __DEV_SANDBOX_AVAILABLE__: JSON.stringify(command === 'serve' && mode !== 'crazygames'),
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_TAG__: JSON.stringify(BUILD_TAG),
    __BUILD_COMMIT__: JSON.stringify(BUILD_COMMIT),
    __BUILD_MESSAGE__: JSON.stringify(BUILD_MESSAGE),
    __PRODUCT_MODE__: JSON.stringify(mode === 'crazygames-full' ? 'full' : command === 'serve' ? 'local' : 'basic'),
  },
  server: {
    host: '127.0.0.1',
  },
  build: {
    // Phaser is the critical runtime. Its compressed chunk is measured by the
    // CrazyGames verifier instead of Vite's generic 500 kB raw-size warning.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'node',
  },
}));
