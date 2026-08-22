import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Vite rejects requests whose Host header it does not recognise. The dev
    // server is reached over the LAN by mDNS name, so that name is allowed here.
    allowedHosts: ['harmony.local'],
  },
  test: {
    globals: true,
    // The formatting engines are pure and run far faster without a DOM; only
    // the component tests need one.
    environment: 'node',
    environmentMatchGlobs: [['**/*.test.tsx', 'jsdom']],
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
