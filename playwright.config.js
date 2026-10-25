import { defineConfig } from '@playwright/test';

// Tests de bout en bout sur les routes de développement /dev/* (données de test,
// sans connexion ni Supabase). Lancement : npm run test:e2e
const PORT = 5174;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'ordinateur',
      use: { viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'telephone',
      use: { viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true },
    },
  ],
});
