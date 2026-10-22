import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { open, reload, writesSettled } from './helpers.ts';

/**
 * The Internships screen (INTERNSHIPS): Plan's row opens it; a gate item ticked on the Roadmap tab moves the bar on
 * Targets and Today's card; the Roadmap tab lists the library items a phase names; interview ratings survive a reload.
 * The clock is set in November 2026, forty days before the first apply date.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block', viewport: { width: 390, height: 844 } });

const NOVEMBER = new Date('2026-11-18T10:30:00+05:00');

test('Plan has an Internships row under Next, and it opens the screen on Targets', async ({ page }) => {
  await page.clock.install({ time: NOVEMBER });
  await open(page, './#/plan');
  const row = page.getByRole('link', { name: /Internships · NVIDIA 2027/ });
  await expect(row).toContainText('AI Agent Engineer Intern · 13 days to apply · gate 0 of 5');
  await row.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Internships');
  await expect(page.getByText('NVIDIA internships 2027 · 3 targets · 5 phases')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Targets' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('heading', { name: 'AI Agent Engineer Intern, AI Enablement Process' })).toBeVisible();
  await expect(page.getByText('wave 1 of 3 · 13 days to apply · Early Dec 2026')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Gate to apply: 0 of 5 done' })).toBeVisible();
  // The targets in order, with their fit; one opens to its note and evidence.
  await expect(page.getByRole('button', { name: /^GPU Computing SW Engineering Intern/ })).toContainText('Medium fit');
  await page.getByRole('button', { name: /^AI Computing SW Development Intern/ }).click();
  await expect(page.getByText('Needs CUDA and inference depth plus a degree exception')).toBeVisible();
  await expect(page.getByText(/Evidence · CUDA kernel ladder/)).toBeVisible();
  // The roadmap summary marks the current phase.
  await expect(page.getByRole('button', { name: /^Phase 1 · Foundations/ })).toContainText('Now');
  // Open roadmap lands on the Roadmap tab at the current phase.
  await page.getByRole('button', { name: 'Open roadmap' }).click();
  await expect(page.getByRole('radio', { name: 'Roadmap' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('heading', { name: 'Phase 1 · Foundations' })).toBeVisible();
  await expect(page.getByText('Nov–Dec 2026 · week 3 of 9 · now')).toBeVisible();
});

test('ticking a gate item moves the bar on Targets and Today’s card, and the next phase says it is locked', async ({ page }) => {
  await page.clock.install({ time: NOVEMBER });
  await open(page, './#/internships?tab=roadmap');
  const item = page.getByRole('checkbox', { name: 'WSL2 Ubuntu with CUDA working' });
  await expect(item).toHaveAttribute('aria-checked', 'false');
  await item.click();
  await expect(item).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('progressbar', { name: 'Gate: 1 of 5 done' })).toBeVisible();
  await writesSettled(page);
  // Phase 2 is locked until Phase 1's gate is done, but opens.
  await page.getByRole('radio', { name: '2' }).click();
  await expect(page.getByRole('heading', { name: 'Phase 2 · Systems' })).toBeVisible();
  await expect(page.getByText(/Locked until the gate to Phase 2 is done \(4 left in Phase 1\)/)).toBeVisible();
  await page.getByRole('radio', { name: 'Targets' }).click();
  await expect(page.getByRole('progressbar', { name: 'Gate to apply: 1 of 5 done' })).toBeVisible();
  await open(page, './');
  const card = page.locator('section[aria-labelledby="intern-card-title"]');
  await expect(card).toContainText('AI Agent Engineer Intern · apply in 13 days');
  await expect(card).toContainText('Gate ticked 1 of 5 · Phase 1, week 3 of 9');
  await expect(card).toContainText('Today in Intern Prep');
  await expect(card).toContainText('Python fluency');
  await card.getByRole('link', { name: 'Checklist' }).click();
  await expect(page.getByRole('radio', { name: 'Roadmap' })).toHaveAttribute('aria-checked', 'true');
});

test('the Roadmap tab lists the library items a phase names, and one opens its sheet', async ({ page }) => {
  await page.clock.install({ time: NOVEMBER });
  await open(page, './#/internships?tab=roadmap&phase=p1');
  const list = page.getByRole('list', { name: 'From your library' }).or(page.locator('section', { hasText: 'From your library' }));
  await expect(page.getByText('Andrej Karpathy: Neural Networks, Zero to Hero')).toBeVisible();
  await expect(page.getByText('9 linked items')).toBeVisible();
  await expect(list.first()).toContainText('Lectures · Not started');
  await page.getByRole('button', { name: /Andrej Karpathy: Neural Networks, Zero to Hero/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Andrej Karpathy: Neural Networks, Zero to Hero');
});

test('interview ratings, the resume ticks and a project status persist after a reload', async ({ page }) => {
  await page.clock.install({ time: NOVEMBER });
  await open(page, './#/internships?tab=prep');
  await expect(page.getByText('0 of 7 ready')).toBeVisible();
  const cuda = page.getByRole('button', { name: /^Confidence in CUDA and GPU architecture/ });
  await cuda.click();
  await cuda.click();
  await cuda.click();
  await expect(cuda).toHaveAccessibleName('Confidence in CUDA and GPU architecture: Ready. Tap for the next');
  await expect(page.getByText('1 of 7 ready')).toBeVisible();
  await page.getByRole('checkbox', { name: 'One line with a number per project' }).click();
  await writesSettled(page);
  await reload(page);
  await expect(page.getByText('1 of 7 ready')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Confidence in CUDA and GPU architecture/ })).toHaveAccessibleName(/Ready/);
  await expect(page.getByRole('checkbox', { name: 'One line with a number per project' })).toHaveAttribute('aria-checked', 'true');
  // Projects: a tap on the status moves it on, and Building shows a bar.
  await page.getByRole('radio', { name: 'Projects' }).click();
  const status = page.getByRole('button', { name: /^Status of project 1: Next/ });
  await status.click();
  await expect(page.getByRole('button', { name: /^Status of project 1: Building/ })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Project 1 progress' })).toHaveAttribute('aria-valuenow', '0');
  await page.getByRole('button', { name: 'Project 1 progress up' }).click();
  await expect(page.getByRole('progressbar', { name: 'Project 1 progress' })).toHaveAttribute('aria-valuenow', '10');
  await writesSettled(page);
  await reload(page);
  await expect(page.getByRole('button', { name: /^Status of project 1: Building/ })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Project 1 progress' })).toHaveAttribute('aria-valuenow', '10');
});

test('every tab passes axe, light and dark', async ({ page }) => {
  await page.clock.install({ time: NOVEMBER });
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const tab of ['', '?tab=roadmap', '?tab=projects', '?tab=prep']) {
      await open(page, './#/internships' + tab);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, theme + ' ' + tab).toEqual([]);
    }
  }
});
