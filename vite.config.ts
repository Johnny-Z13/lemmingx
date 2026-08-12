import { defineConfig } from 'vite';
import { BUILD_TAG } from './src/version';

export default defineConfig(({ mode }) => ({
  base: mode === 'crazygames' ? './' : '/',
  define: {
    __PLAYER_BUILD__: JSON.stringify(mode === 'crazygames'),
    __BUILD_TAG__: JSON.stringify(mode === 'crazygames' ? '' : BUILD_TAG),
  },
  server: {
    host: '127.0.0.1',
  },
  test: {
    environment: 'node',
  },
}));
