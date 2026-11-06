import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { DEMO_TIME, demoBackupText } from '../../scripts/lib/demo.ts';
import { open, reload, writesSettled } from './helpers.ts';

/**
 * The portfolio (ATLAS-PORTFOLIO): nine flagship projects in a section of their own. Plan's row opens it; a ticked
 * milestone moves the card and is the same tick in the tech doc; every doc draws its diagram; the nine never appear
 * among the plan's, the Library's or the Internships screen's projects; time logged to one counts for the day and
 * leaves every lane's forecast as it was.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block', viewport: { width: 390, height: 844 } });

const NOVEMBER = new Date('2026-11-16T10:30:00+05:00');
const IDS = ['nanoserve', 'kernel-lab', 'minitrain', 'kvroute', 'forge', 'raftkv', 'splat', 'drive-perf', 'world-model-capstone'];
const TITLES = [
  'nanoserve: an LLM inference engine from scratch', 'Kernel lab: beat the baseline', 'minitrain: a distributed training framework', 'Cluster serving router', 'forge: an agent harness in Rust',
  'raftkv: a replicated key-value store', 'splat: a real-time Gaussian splatting renderer', 'drive-perf: a TensorRT perception pipeline', 'Research capstone: a small world model with an original result',
];

const section = (page: Page, name: string) => page.getByRole('radiogroup', { name: 'Section' }).getByRole('radio', { name });

async function mainText(page: Page): Promise<string> {
  return (await page.locator('main').innerText()).replace(/\s+/g, ' ');
}

test('Plan’s Portfolio row opens the screen: the header, the focus tile with its countdown, the timeline and the nine cards in order', async ({ page }) => {
  await page.clock.install({ time: NOVEMBER });
  await open(page, './#/plan');
  const row = page.getByRole('link', { name: /^Portfolio 9 projects · next: nanoserve/ });
  await expect(row).toBeVisible();
  await row.click();
  await expect(page).toHaveURL(/#\/portfolio$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Portfolio');
  await expect(page.getByText('0 of 47 milestones · 0 building')).toBeVisible();
  await expect(page.locator('section[aria-labelledby="portfolio-focus"]')).toContainText(/197\s*days to the application date/);
  await expect(page.getByText(/Projects 1, 2 and 5 matter most/)).toBeVisible();
  const cards = page.locator('[data-portfolio-card]');
  await expect(cards).toHaveCount(9);
  expect(await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-portfolio-card')))).toEqual(IDS);
  await expect(cards.first()).toContainText('Core for 2027');
  await expect(cards.first()).toContainText('Nov 2026 – Jun 2027');
  await expect(cards.nth(2)).not.toContainText('Core for 2027');
  // The timeline: a bar tells what its window is for; today's line and the application diamond are drawn from the data.
  await page.getByRole('button', { name: /^forge, Mar 2027 – May 2027: / }).click();
  await expect(page.getByRole('status').filter({ hasText: 'forge · Mar 2027 – May 2027:' })).toBeVisible();
  await expect(page.locator('[data-today-line]')).toHaveCount(1);
  await expect(page.locator('[data-event-diamond]')).toHaveCount(1);
  // A status cycles on a tap and stays.
  const status = page.getByRole('button', { name: /^Status of minitrain: Later/ });
  await status.click();
  await expect(page.getByRole('button', { name: /^Status of minitrain: Next/ })).toBeVisible();
  await reload(page);
  await expect(page.getByRole('button', { name: /^Status of minitrain: Next/ })).toBeVisible();
});

test('the nine stay apart: none in Plan › Projects, the Library’s Projects shelf, its counts or Internships › Projects; nothing else on the Portfolio screen', async ({ page }) => {
  await page.clock.install({ time: NOVEMBER });
  await open(page, './#/plan?view=projects');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  let text = await mainText(page);
  for (const t of TITLES) expect(text, t).not.toContain(t);
  await open(page, './#/internships?tab=projects');
  text = await mainText(page);
  for (const t of TITLES) expect(text, t).not.toContain(t);
  // The Projects shelf: its count is the shelf's own, and a search for a portfolio project finds none there.
  await open(page, './#/library');
  await page.getByRole('button', { name: /^Browse all/ }).click();
  const projectsTile = page.getByRole('button', { name: /Projects$/ });
  const tileCount = Number((await projectsTile.innerText()).split('\n').find((l) => /^[\d,]+$/.test(l.trim()))!.replace(/,/g, ''));
  await expect(page.getByRole('link', { name: 'Portfolio, 9 projects' })).toBeVisible();
  await open(page, './#/library?type=project');
  const n = tileCount.toLocaleString('en-GB');
  await expect(page.getByRole('heading', { name: n + ' of ' + n })).toBeVisible();
  for (const q of ['nanoserve', 'raftkv', 'Kernel lab: beat']) {
    await page.getByRole('searchbox').fill(q);
    await expect(page.getByRole('heading', { name: /^0 of / }).or(page.getByText('No matches. Clear filters.'))).toBeVisible();
  }
  // Library search lists them in a group of their own.
  await open(page, './#/library?q=raftkv');
  await expect(page.getByRole('list', { name: /^Portfolio · 1/ }).or(page.locator('section, div').filter({ has: page.getByText('Portfolio · 1') }).first())).toBeVisible();
  await expect(page.getByRole('link', { name: /^raftkv: a replicated key-value store/ })).toBeVisible();
  // The Portfolio screen holds the nine and nothing else.
  await open(page, './#/portfolio');
  await expect(page.locator('[data-portfolio-card]')).toHaveCount(9);
  await expect(page.getByText('Mini inference engine (flagship)')).toHaveCount(0);
});

test('ticking a milestone moves the card’s progress, survives a reload and is the same tick in the tech doc', async ({ page }) => {
  await page.clock.install({ time: NOVEMBER });
  await open(page, './#/portfolio/nanoserve');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('nanoserve');
  await page.getByRole('checkbox', { name: '1. Correct forward pass' }).click();
  await expect(page.getByText('56 of 336 h').first()).toBeVisible();
  await writesSettled(page);
  await reload(page);
  await expect(page.getByRole('checkbox', { name: '1. Correct forward pass' })).toBeChecked();
  await section(page, 'Tech doc').click();
  await expect(page.getByRole('img', { name: /^Diagram of nanoserve/ })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: '1. Correct forward pass' })).toBeChecked();
  // Ticked in the doc, it shows on the overview too.
  await page.getByRole('checkbox', { name: '2. KV cache and decode loop' }).click();
  await writesSettled(page);
  await section(page, 'Overview').click();
  await expect(page.getByRole('checkbox', { name: '2. KV cache and decode loop' })).toBeChecked();
  await open(page, './#/portfolio');
  await expect(page.locator('[data-portfolio-card="nanoserve"]')).toContainText('112 of 336 h');
  await expect(page.getByText('2 of 47 milestones · 0 building')).toBeVisible();
  // Every done-when item ticked offers done; it is never set silently.
  await open(page, './#/portfolio/nanoserve');
  for (const name of [/^Decode throughput is within 80%/, /^Time to first token/, /^Output matches the PyTorch reference/]) await page.getByRole('checkbox', { name }).click();
  await expect(page.getByText('Every check is ticked. Mark nanoserve done?')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Status of nanoserve: Next/ }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Mark done' }).click();
  await expect(page.getByRole('button', { name: /^Status of nanoserve: Done/ }).first()).toBeVisible();
});

test('every portfolio tech doc renders with its diagram, and the full doc in Claude is linked', async ({ page }) => {
  test.setTimeout(90_000);
  await page.clock.install({ time: NOVEMBER });
  for (const id of IDS) {
    await open(page, './#/portfolio/' + id + '?tab=doc');
    await expect(page.getByRole('heading', { name: 'How it works' }), id).toBeVisible();
    await expect(page.getByRole('img', { name: /^Diagram of / }), id).toBeVisible();
    await expect(page.getByRole('link', { name: /^Full tech doc in Claude/ }), id).toHaveAttribute('href', 'https://claude.ai/artifact/7t6dnEC5uk6GgxQY2NgVqQ');
  }
});

test('the project page: roles, Read first rows that open their sheet, the ship checklist and a checked repository field', async ({ page }) => {
  await page.clock.install({ time: NOVEMBER });
  await open(page, './#/portfolio/kernel-lab');
  await expect(page.getByRole('link', { name: /^JR2026307/ })).toHaveAttribute('href', /myworkdayjobs\.com/);
  await expect(page.getByText('JR2026170', { exact: true })).toBeVisible();
  await expect(page.getByText('Postings change often; re-check before applying.')).toBeVisible();
  await expect(page.getByRole('link', { name: /^GPU kernel ladder|^CUDA kernel ladder/ }).or(page.getByRole('list', { name: 'Also in Atlas' }))).toBeVisible();
  // A Read first row opens its paper's sheet on the page.
  await page.getByRole('button', { name: /^Roofline/ }).click();
  await expect(page.getByRole('dialog', { name: /Roofline/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await section(page, 'Ship').click();
  await expect(page.getByText('0 of 6 shipped')).toBeVisible();
  await page.getByRole('checkbox', { name: 'README with a results table first' }).click();
  await expect(page.getByText('1 of 6 shipped')).toBeVisible();
  const repo = page.getByRole('textbox', { name: 'GitHub repository' });
  await repo.fill('https://gitlab.com/me/kernel-lab');
  await repo.blur();
  await expect(page.getByText('A repository is https://github.com/owner/repo.')).toBeVisible();
  await repo.fill('https://github.com/me/kernel-lab');
  await repo.blur();
  await expect(page.getByRole('link', { name: 'me/kernel-lab' })).toBeVisible();
  await writesSettled(page);
  await reload(page);
  await expect(page.getByRole('textbox', { name: 'GitHub repository' })).toHaveValue('https://github.com/me/kernel-lab');
  await expect(page.getByText('1 of 6 shipped')).toBeVisible();
});

test('30 minutes logged to a portfolio project add to today’s hours and leave every lane’s forecast as it was', async ({ page }) => {
  await page.clock.setFixedTime(new Date(DEMO_TIME));
  await open(page, './#/settings');
  await page.getByLabel('Backup file to import').setInputFiles({ name: 'atlas-backup-demo.json', mimeType: 'application/json', buffer: Buffer.from(demoBackupText('light')) });
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await expect(page.getByText(/Restored \d+ records/)).toBeVisible();

  const lanes = async (): Promise<string[]> => {
    await open(page, './#/plan');
    const buttons = page.getByRole('button', { name: /^(ML Zoomcamp|GameDevHQ|Hugging Face|Coding lessons|Math and physics) / });
    await expect(buttons).toHaveCount(5);
    const texts = await buttons.allTextContents();
    await page.getByRole('button', { name: /^ML Zoomcamp / }).click();
    texts.push(await page.getByTestId('lane-forecast').innerText());
    return texts;
  };
  const hoursToday = async (): Promise<string> => {
    await open(page, './');
    return page.getByRole('region', { name: "Today's hours" }).innerText();
  };
  const beforeLanes = await lanes();
  const beforeHours = await hoursToday();

  await open(page, './#/portfolio/kernel-lab');
  await page.getByRole('button', { name: 'Log time' }).click();
  const sheet = page.getByRole('dialog', { name: 'Log time' });
  await expect(sheet.getByText('Portfolio · kernel-lab: counts toward today’s hours and the streak, never a lane’s pace.')).toBeVisible();
  // On a lane's own block, to show the lane still does not count it.
  await sheet.getByRole('button', { name: 'Block C' }).click();
  await sheet.getByRole('button', { name: 'Log 30 min' }).click();
  await writesSettled(page);

  expect(await hoursToday()).not.toBe(beforeHours);
  expect(await lanes()).toEqual(beforeLanes);
  // The day log names it.
  // Stats names it, and the day's log does too.
  await open(page, './#/activity');
  await expect(page.getByText(/^Portfolio time · /)).toBeVisible();
  await expect(page.getByRole('link', { name: /^Portfolio · kernel-lab 30 m/ })).toBeVisible();
});

test('the portfolio screens fit 360 px without overflow, keep 44 px targets and pass axe', async ({ page }) => {
  await page.clock.install({ time: NOVEMBER });
  await page.setViewportSize({ width: 360, height: 780 });
  for (const path of ['./#/portfolio', './#/portfolio/forge', './#/portfolio/forge?tab=doc', './#/portfolio/forge?tab=ship']) {
    await open(page, path);
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('main button, main a[href], main [role="checkbox"], main [role="radio"]')]
        .filter((el) => el.offsetParent !== null && !el.closest('[aria-hidden="true"]'))
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && (r.height < 43.5 || r.width < 43.5))
        .filter(({ el }) => !el.closest('p, li.prose') || el.tagName !== 'A')
        .map(({ el, r }) => (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)),
    );
    expect(small, path).toEqual([]);
    const axe = await new AxeBuilder({ page }).include('main').analyze();
    expect(axe.violations.map((v) => v.id + ': ' + v.nodes.length), path).toEqual([]);
  }
});
