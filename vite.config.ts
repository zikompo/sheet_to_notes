/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Pinned so the OAuth redirect origin stays stable (must match Supabase's
  // allowlist). strictPort fails loudly instead of drifting to 5174.
  server: { port: 5173, strictPort: true },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
});
