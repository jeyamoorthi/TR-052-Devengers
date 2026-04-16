const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.resolve(__dirname, '..', 'qa-artifacts');
const BASE_URL = 'http://127.0.0.1:3000';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const checks = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(String(error));
  });

  const record = (name, passed, details = '') => {
    checks.push({ name, passed, details });
  };

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01-initial.png'), fullPage: true });
    record('App loads without crash', true);

    const languageHeading = page.getByText(/choose app language/i);
    if (await languageHeading.isVisible({ timeout: 5000 })) {
      await page.getByRole('button', { name: /english/i }).click();
      await page.waitForLoadState('networkidle');
      record('Language selector shown and selectable', true);
    } else {
      record('Language selector shown and selectable', false, 'Language selection modal was not visible.');
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02-login.png'), fullPage: true });
    const loginHeader = page.getByText(/farmer app login/i);
    if (await loginHeader.isVisible({ timeout: 5000 })) {
      record('Login screen visible', true);
    } else {
      record('Login screen visible', false, 'Login header missing.');
    }

    await page.getByPlaceholder('9876543210').fill('9876543210');
    await page.getByRole('button', { name: /send otp/i }).click();
    await page.getByPlaceholder('1234').fill('1234');
    await page.getByRole('button', { name: /verify and continue/i }).click();
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03-registration-step1.png'), fullPage: true });

    const setupHeader = page.getByRole('heading', { name: /set up your farm profile/i });
    if (await setupHeader.isVisible({ timeout: 15000 })) {
      record('Registration opens after first login', true);
    } else {
      record('Registration opens after first login', false, 'Registration heading missing.');
    }

    await page.getByPlaceholder('Your full name').fill('QA Farmer');
    await page.getByPlaceholder(/Village \/ area name|Detecting your location/i).fill('QA Village');
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04-registration-step2.png'), fullPage: true });

    await page.getByPlaceholder('2.5').fill('3');
    await page.getByPlaceholder('5', { exact: true }).fill('4');
    await page.getByRole('button', { name: /finish setup/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '05-dashboard.png'), fullPage: true });

    const dashboardHeading = page.getByText(/field command/i);
    if (await dashboardHeading.isVisible({ timeout: 10000 })) {
      record('Dashboard shown after onboarding', true);
    } else {
      record('Dashboard shown after onboarding', false, 'Dashboard home hero not visible.');
    }

    const plannerTab = page.getByRole('button', { name: /planner/i }).first();
    await plannerTab.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '06-planner.png'), fullPage: true });

    const plannerTitle = page.getByText(/daily farm planner/i);
    if (await plannerTitle.isVisible({ timeout: 5000 })) {
      record('Planner screen reachable from bottom nav', true);
    } else {
      record('Planner screen reachable from bottom nav', false, 'Planner title missing.');
    }

    await page.getByPlaceholder('Add a farm task...').fill('QA check irrigation valves');
    await page.getByRole('button', { name: /^add$/i }).click();
    await sleep(250);

    const newTask = page.getByText(/qa check irrigation valves/i);
    if (await newTask.isVisible({ timeout: 4000 })) {
      record('Planner can add task', true);
    } else {
      record('Planner can add task', false, 'Added task did not appear.');
    }

    await page.getByRole('button', { name: /profile/i }).first().click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '07-profile.png'), fullPage: true });

    await page.getByRole('button', { name: /logout/i }).click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '08-logout.png'), fullPage: true });

    if (await page.getByText(/farmer app login/i).isVisible({ timeout: 5000 })) {
      record('Logout returns to login', true);
    } else {
      record('Logout returns to login', false, 'Did not return to login screen.');
    }

    const manifestResponse = await page.request.get(`${BASE_URL}/manifest.webmanifest`);
    record('Manifest endpoint reachable', manifestResponse.ok(), `HTTP ${manifestResponse.status()}`);

    const swResponse = await page.request.get(`${BASE_URL}/sw.js`);
    record('Service worker script reachable', swResponse.ok(), `HTTP ${swResponse.status()}`);
  } catch (error) {
    record('QA script execution', false, String(error));
  } finally {
    await browser.close();
  }

  const summary = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    checks,
    consoleErrors,
    pageErrors,
    passCount: checks.filter((check) => check.passed).length,
    failCount: checks.filter((check) => !check.passed).length,
  };

  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'smoke-report.json'),
    JSON.stringify(summary, null, 2),
    'utf8'
  );

  console.log(JSON.stringify(summary, null, 2));
}

run().catch((error) => {
  console.error('Fatal QA runner failure:', error);
  process.exitCode = 1;
});
