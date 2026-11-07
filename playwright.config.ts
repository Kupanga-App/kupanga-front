import { defineConfig } from '@playwright/test';

/**
 * Tests de bout en bout (phase 6 de la refonte). Edge du poste (`channel: 'msedge'`), aucun navigateur téléchargé.
 * Demande l'API locale (http://localhost:8089) et la base de démo : voir e2e/README.md.
 */

const ORDINATEUR = { width: 1440, height: 900 };
const TELEPHONE = { width: 390, height: 844 };

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  globalSetup: './e2e/outils/global-setup.ts',
  globalTeardown: './e2e/outils/global-teardown.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  // L'API de démo et `ng serve` tournent sur le poste : quatre onglets à la fois suffisent
  workers: 4,
  timeout: 60_000,
  expect: {
    // L'API de démo répond plus lentement quand quatre onglets la sollicitent
    timeout: 15_000,
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', scale: 'css', maxDiffPixelRatio: 0.01 },
    toMatchSnapshot: { maxDiffPixelRatio: 0.01 },
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  snapshotPathTemplate: '{testDir}/{testFileDir}/instantanes/{projectName}/{arg}{ext}',

  use: {
    baseURL: 'http://localhost:4200',
    channel: 'msedge',
    serviceWorkers: 'block',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 180_000,
  },

  projects: [
    // Connexion par l'écran /auth/login, une fois par compte, puis état de session réutilisé
    { name: 'connexion', testMatch: /outils\/connexion\.setup\.ts/, use: { viewport: ORDINATEUR } },

    {
      name: 'ordinateur',
      dependencies: ['connexion'],
      testMatch: [/parcours\/.*\.spec\.ts/, /visuel\/instantanes\.spec\.ts/],
      use: { viewport: ORDINATEUR },
    },
    {
      name: 'telephone',
      dependencies: ['connexion'],
      testMatch: [/parcours\/.*\.spec\.ts/, /visuel\/instantanes\.spec\.ts/],
      use: { viewport: TELEPHONE, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    },
    {
      // Non-régression des appels API : KP_CIBLE=reference enregistre la branche d'origine (voir e2e/README.md)
      name: 'reference',
      dependencies: ['connexion'],
      testMatch: /non-regression\/.*\.spec\.ts/,
      use: {
        viewport: ORDINATEUR,
        // La référence est servie par Playwright (route.fulfill) : sans ce drapeau, Edge refuse ses appels vers
        // localhost:8089 (contrôle « Local Network Access » d'une page sans espace d'adresse connu)
        launchOptions: { args: ['--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] },
      },
    },
    {
      // Comparaison aux maquettes : non bloquante (tableau de ratios), lancée à la demande
      name: 'conformite',
      dependencies: ['connexion'],
      testMatch: /visuel\/maquettes\.spec\.ts/,
      // Instantané attendu = PNG de la maquette (copié ou découpé dans e2e/visuel/maquettes/)
      snapshotPathTemplate: '{testDir}/visuel/maquettes/{arg}{ext}',
      use: { viewport: ORDINATEUR },
    },
  ],
});

