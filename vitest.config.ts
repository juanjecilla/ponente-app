import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/lib/firebase.ts', // SDK init, not unit-testable
        'src/lib/storage/firebase.ts', // SDK wrapper
        'src/lib/storage/supabase.ts', // SDK wrapper
        'src/main.tsx',
        '**/*.d.ts',
        'src/types/**',
        'src/i18n/**',
        'src/test/**',
        'scripts/**',
      ],
    },
  },
});
