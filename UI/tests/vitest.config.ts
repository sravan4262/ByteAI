import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// __dirname of this file is UI/tests/ — walk up one level to reach UI/
const __dirname = dirname(fileURLToPath(import.meta.url))
const uiRoot = resolve(__dirname, '..')

export default defineConfig({
  root: uiRoot,
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/fixtures/**', 'tests/mocks/**', 'node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      // Only measure coverage for the code we actually test —
      // large API client stubs and type-only files would pull the total down
      include: [
        'lib/utils/**',
        'lib/validation/**',
        'lib/api/http.ts',
        'hooks/**',
        'components/features/auth/**',
        'components/features/feed/**',
        'components/features/notifications/**',
        'components/features/profile/**',
        'components/features/comments/**',
        'components/features/admin/**',
        'components/features/onboarding/**',
      ],
      exclude: ['node_modules', '.next', '**/*.d.ts', 'lib/api/__mocks__/**', 'tests/**'],
    },
  },
})
