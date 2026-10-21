import { expect, test } from '@playwright/test';
import { FIRST_DAY, open, showMoreUntil } from './helpers.ts';

/**
 * The whole Atlas Library (ATLAS-LIBRARY): about 2,400 resources, loaded after the first screen, in the plan's order
 * (priority, year, level), with Level and Roadmap chips, a Research view, Inference engineering, DevOps, Simulation,
 * Math, Engineering, Hardware and Quantum computing paths, roadmap.sh's pages at the head of their paths, "Write log
 * entry" on a resource's sheet, and the harness additions and the fourth file in search.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

test('the Papers shelf filters by level, and every row is of that level', async ({ page }) => {
  await open(page, './#/library?type=paper');
  const count = page.locator('main section .section-label').last();
  const all = Number((await count.innerText()).split(' of ')[1]);
  expect(all).toBeGreaterThan(700);
  const chips = page.getByRole('group', { name: 'Level and roadmap' });
  await chips.getByRole('button', { name: 'Beginner' }).click();
  await expect(page).toHaveURL(/lvl=intro/);
  const beginners = Number((await count.innerText()).split(' of ')[0]);
  expect(beginners).toBeGreaterThan(0);
  expect(beginners).toBeLessThan(all);
  await chips.getByRole('button', { name: 'Beginner' }).click();
  await expect(page).not.toHaveURL(/lvl=/);
});

test('search finds FlashAttention, Raft, Diffusion Policy and Dreamer', async ({ page }) => {
  await open(page, './#/library');
  const search = page.getByRole('searchbox', { name: 'Search the library' });
  for (const [query, row] of [
    ['FlashAttention', /^FlashAttention/],
    ['Raft', /^Raft/],
    ['Diffusion Policy', /^Diffusion Policy/],
    ['Dreamer', /^Dreamer/],
  ] as const) {
    await search.fill(query);
    await expect(page.getByRole('button', { name: row }).first()).toBeVisible();
  }
  // Search has the Level and Roadmap chips too.
  await search.fill('Dreamer');
  await page.getByRole('group', { name: 'Level and roadmap' }).getByRole('button', { name: /^Roadmap/ }).click();
  await page.getByRole('dialog', { name: 'Roadmap' }).getByRole('button', { name: /^Inference Engineering/ }).click();
  await expect(page).toHaveURL(/roadmap=inference-engineering/);
  await expect(page.getByRole('button', { name: /^Dreamer/ })).toHaveCount(0);
});

test('the Research view shows all four areas, papers first', async ({ page }) => {
  await open(page, './#/library');
  await page.getByRole('button', { name: /^Research Year 3 · \d+ to read$/ }).click();
  await expect(page).toHaveURL(/path=research/);
  await expect(page.getByRole('heading', { level: 1, name: 'Research' })).toBeVisible();
  for (const area of ['Inference', 'World models', 'Diffusion', 'Generative AI']) {
    await expect(page.getByRole('heading', { name: new RegExp('^' + area + ' · \\d+$') })).toBeVisible();
  }
  const worldModels = page.locator('section', { has: page.getByRole('heading', { name: /^World models/ }) });
  await expect(worldModels.getByRole('button').first()).toContainText('Paper');
});

test('search finds the harness additions: Meta-Harness, the Darwin Gödel Machine, under AI Agents', async ({ page }) => {
  await open(page, './#/library');
  const search = page.getByRole('searchbox', { name: 'Search the library' });
  await search.fill('Meta-Harness');
  await expect(page.getByRole('button', { name: /^Meta-Harness/ }).first()).toBeVisible();
  await search.fill('Darwin Gödel');
  await expect(page.getByRole('button', { name: /^Darwin Gödel Machine/ }).first()).toBeVisible();
  // Both serve roadmap.sh's AI Agents roadmap, so its chip keeps them.
  await page.getByRole('group', { name: 'Level and roadmap' }).getByRole('button', { name: /^Roadmap/ }).click();
  await page.getByRole('dialog', { name: 'Roadmap' }).getByRole('button', { name: /^AI Agents/ }).click();
  await expect(page).toHaveURL(/roadmap=ai-agents/);
  await expect(page.getByRole('button', { name: /^Darwin Gödel Machine/ }).first()).toBeVisible();
});

test('search reaches the fourth file, and keeps a title pair the matcher read as one apart', async ({ page }) => {
  await open(page, './#/library');
  const search = page.getByRole('searchbox', { name: 'Search the library' });
  // A full title finds a row listed by its short one: Gradient Episodic Memory is "GEM" (and not the GEM gym).
  await search.fill('Gradient Episodic');
  await expect(page.getByRole('button', { name: /^GEM/ }).first()).toBeVisible();
  await search.fill('Bullshark');
  // Bullshark and its partially synchronous version are two papers.
  await expect(page.getByRole('button', { name: /^Bullshark/ })).toHaveCount(2);
  await search.fill('Qwen2.5');
  await expect(page.getByRole('button', { name: /^Qwen2\.5-Coder report/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Qwen2\.5 Report/ })).toBeVisible();
});

test('the Blogs shelf filters by track, and the engineering track reads Electrical, mechanical & aerospace', async ({ page }) => {
  await open(page, './#/library?type=blog');
  await expect(page.getByRole('heading', { level: 1, name: 'Blogs to follow' })).toBeVisible();
  // The shelf's own count, "48 of 332": the list below it is virtualised, so its rows say nothing about the total.
  const counted = async (): Promise<[number, number]> => {
    const text = await page.getByRole('heading', { name: /^\d+ of \d+$/ }).innerText();
    return text.split(' of ').map(Number) as [number, number];
  };
  const [, all] = await counted();
  await page.getByRole('button', { name: 'Track', exact: true }).click();
  const picker = page.getByRole('dialog', { name: 'Track' });
  await picker.getByRole('searchbox', { name: 'Search tracks' }).fill('aerospace');
  await picker.getByRole('button', { name: 'Electrical, mechanical & aerospace' }).click();
  await expect(page).toHaveURL(/track=engineering/);
  // Every track has blogs now (the 11,389-row file): the engineering ones are a few of the shelf's.
  await expect(page.getByRole('heading', { name: /^\d+ of \d+$/ })).not.toHaveText(all + ' of ' + all);
  const [shown, total] = await counted();
  expect(total).toBe(all);
  expect(shown).toBeGreaterThan(5);
  expect(shown).toBeLessThan(all);
  await expect(page.locator('main ul.rows > *').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Electrical, mechanical & aerospace' })).toBeVisible();
});

test('the Inference engineering path opens with the roadmap.sh page', async ({ page }) => {
  await open(page, './#/library?path=inference');
  await expect(page.getByRole('heading', { level: 1, name: 'Inference engineering' })).toBeVisible();
  const first = page.locator('main').getByRole('button').filter({ hasNot: page.getByRole('link') }).nth(0);
  await expect(page.getByRole('heading', { name: 'roadmap.sh' })).toBeVisible();
  const roadmap = page.getByRole('button', { name: /^Inference Eng Roadmap The official roadmap · roadmap\.sh$/ });
  await expect(roadmap).toBeVisible();
  await expect(first).toHaveText(/Inference Eng Roadmap/);
  await roadmap.click();
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Open' })).toHaveAttribute('href', 'https://roadmap.sh/inference-engineering');
});

test('the DevOps and Simulation paths list their resources under Optional', async ({ page }) => {
  await open(page, './#/library?path=devops');
  await expect(page.getByRole('heading', { level: 1, name: 'DevOps' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Optional for this path/ })).toHaveAttribute('aria-expanded', 'true');
  await showMoreUntil(page, page.getByRole('button', { name: /^Containers from Scratch/ }));

  await open(page, './#/library?path=simulation');
  await expect(page.getByRole('heading', { level: 1, name: 'Simulation' })).toBeVisible();
  const optional = page.getByRole('button', { name: /^Optional for this path/ });
  if ((await optional.getAttribute('aria-expanded')) === 'false') await optional.click();
  await showMoreUntil(page, page.getByRole('button', { name: /^NVIDIA Warp Year/ }));
});

test('the Math and Engineering paths list their resources under Optional, and old Engineering links open', async ({ page }) => {
  await open(page, './#/library?path=math');
  await expect(page.getByRole('heading', { level: 1, name: 'Math and physics' })).toBeVisible();
  const math = page.getByRole('button', { name: /^Optional for this path/ });
  if ((await math.getAttribute('aria-expanded')) === 'false') await math.click();
  await showMoreUntil(page, page.getByRole('button', { name: /^Joy of Cryptography/ }));

  await open(page, './#/library?path=engineering');
  await expect(page.getByRole('heading', { level: 1, name: 'Electrical, mechanical & aerospace' })).toBeVisible();
  const engineering = page.getByRole('button', { name: /^Optional for this path/ });
  if ((await engineering.getAttribute('aria-expanded')) === 'false') await engineering.click();
  await showMoreUntil(page, page.getByRole('button', { name: /^Berkeley EECS 16A/ }));

  // Electrical and embedded and Mechanical are part of that path now.
  await open(page, './#/library?path=ee');
  await expect(page.getByRole('heading', { level: 1, name: 'Electrical, mechanical & aerospace' })).toBeVisible();
});

test('the Hardware and Quantum computing paths list their resources under Optional', async ({ page }) => {
  await open(page, './#/library?path=hardware');
  await expect(page.getByRole('heading', { level: 1, name: 'Hardware and chip design' })).toBeVisible();
  const hardware = page.getByRole('button', { name: /^Optional for this path/ });
  if ((await hardware.getAttribute('aria-expanded')) === 'false') await hardware.click();
  await showMoreUntil(page, page.getByRole('button', { name: /^Build a RISC-V Core/ }));

  await open(page, './#/library?path=quantum');
  await expect(page.getByRole('heading', { level: 1, name: 'Quantum computing' })).toBeVisible();
  const quantum = page.getByRole('button', { name: /^Optional for this path/ });
  if ((await quantum.getAttribute('aria-expanded')) === 'false') await quantum.click();
  await showMoreUntil(page, page.getByRole('button', { name: /^IBM Quantum Composer/ }));
});

test('a blog card opens its sheet with its link, and Write log entry starts the outline with it', async ({ page }) => {
  await open(page, './#/library?type=blog');
  await page.getByRole('searchbox', { name: 'Search blogs to follow' }).fill('Import AI');
  await page.getByRole('button', { name: /^Import AI/ }).click();
  const sheet = page.getByRole('dialog', { name: /Import AI/ });
  await expect(sheet.getByRole('link', { name: 'Open' })).toHaveAttribute('href', 'https://importai.substack.com');
  await expect(sheet.getByText(/^Priority 1 · /)).toBeVisible();
  await sheet.getByRole('link', { name: 'Write log entry' }).click();
  await expect(page).toHaveURL(/#\/blog\?ref=blog-import-ai/);
  const outline = page.getByLabel('The outline, in Markdown');
  await expect(outline).toContainText('Import AI');
  await expect(outline).toContainText('https://importai.substack.com');
});

test('shelves read in the plan\'s order: priority 1 first', async ({ page }) => {
  await open(page, './#/library?type=article');
  const first = page.locator('main ul.rows > *').first();
  await first.getByRole('button').click();
  await expect(page.getByRole('dialog').getByText(/^Priority 1 · /)).toBeVisible();
});
