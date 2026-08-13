import { defineConfig } from 'vite';
import { BUILD_TAG } from './src/version';

export default defineConfig(({ command, mode }) => ({
  base: command === 'build' ? './' : '/',
  define: {
    __PLAYER_BUILD__: JSON.stringify(mode !== 'test'),
    __DEV_SANDBOX_AVAILABLE__: JSON.stringify(command === 'serve' && mode !== 'crazygames'),
    __BUILD_TAG__: JSON.stringify(BUILD_TAG),
  },
  server: {
    host: '127.0.0.1',
  },
  test: {
    environment: 'node',
  },
}));
