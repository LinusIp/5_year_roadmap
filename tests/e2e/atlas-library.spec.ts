import { expect, test } from '@playwright/test';
import { FIRST_DAY, open, reload, showMoreUntil, writesSettled } from './helpers.ts';

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

/** A count as the screen writes it: with its thousands separator (ATLAS-UI-POLISH). */
const fmt = (n: number): string => n.toLocaleString('en-GB');

test('the Papers shelf filters by level, and every row is of that level', async ({ page }) => {
  await open(page, './#/library?type=paper');
  const count = page.locator('main section .section-label').last();
  const all = Number((await count.innerText()).split(' of ')[1]!.replace(/,/g, ''));
  expect(all).toBeGreaterThan(700);
  const chips = page.getByRole('group', { name: 'Level and roadmap' });
  await chips.getByRole('button', { name: 'Beginner' }).click();
  await expect(page).toHaveURL(/lvl=intro/);
  const beginners = Number((await count.innerText()).split(' of ')[0]!.replace(/,/g, ''));
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
  await page.getByRole('button', { name: /^Research Year 3 · [\d,]+ to read$/ }).click();
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
    const text = await page.getByRole('heading', { name: /^[\d,]+ of [\d,]+$/ }).innerText();
    return text.split(' of ').map((n) => Number(n.replace(/,/g, ''))) as [number, number];
  };
  const [, all] = await counted();
  await page.getByRole('button', { name: 'Track', exact: true }).click();
  const picker = page.getByRole('dialog', { name: 'Track' });
  await picker.getByRole('searchbox', { name: 'Search tracks' }).fill('aerospace');
  await picker.getByRole('button', { name: 'Electrical, mechanical & aerospace' }).click();
  await expect(page).toHaveURL(/track=engineering/);
  // Every track has blogs now (the 11,389-row file): the engineering ones are a few of the shelf's.
  await expect(page.getByRole('heading', { name: /^[\d,]+ of [\d,]+$/ })).not.toHaveText(all + ' of ' + all);
  const [shown, total] = await counted();
  expect(total).toBe(all);
  expect(shown).toBeGreaterThan(5);
  expect(shown).toBeLessThan(all);
  await expect(page.locator('main ul.rows > *').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Electrical, mechanical & aerospace' })).toBeVisible();
});

test('Developer essentials gathers the terminal, Git, Linux, SQL and web resources from every shelf, and filters by track', async ({ page }) => {
  await open(page, './#/library');
  const row = page.getByRole('button', { name: /^Developer essentials \d+$/ });
  await expect(row).toBeVisible();
  const count = Number((await row.innerText()).replace(/\D/g, ''));
  expect(count).toBeGreaterThan(300);
  await row.click();
  await expect(page).toHaveURL(/pick=essentials/);
  await expect(page.getByRole('heading', { level: 1, name: 'Developer essentials' })).toBeVisible();
  await expect(page.getByRole('heading', { name: new RegExp('^' + fmt(count) + ' of ' + fmt(count) + '$') })).toBeVisible();
  // Git and SQL from the sixth file, on different shelves.
  await page.getByRole('searchbox', { name: 'Search developer essentials' }).fill('Pro Git');
  await expect(page.getByRole('button', { name: /^Pro Git/ })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search developer essentials' }).fill('');
  await page.getByRole('button', { name: 'Track', exact: true }).click();
  await page.getByRole('dialog', { name: 'Track' }).getByRole('button', { name: 'DevOps & MLOps' }).click();
  await expect(page).toHaveURL(/track=devops/);
  const [shown, total] = (await page.getByRole('heading', { name: /^[\d,]+ of [\d,]+$/ }).innerText()).split(' of ').map((n) => Number(n.replace(/,/g, '')));
  expect(total).toBe(count);
  expect(shown).toBeGreaterThan(50);
  expect(shown).toBeLessThan(count);
  // A title that only contains one of the words is not an essential.
  await page.getByRole('button', { name: 'DevOps & MLOps' }).click();
  await page.getByRole('dialog', { name: 'Track' }).getByRole('button', { name: 'Every track' }).click();
  await page.getByRole('searchbox', { name: 'Search developer essentials' }).fill('Digital Design');
  await expect(page.getByRole('button', { name: /^Digital Design and Computer Architecture/ })).toHaveCount(0);
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
  await showMoreUntil(page, page.getByRole('button', { name: /^Containers from Scratch/ }).first());

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
  await showMoreUntil(page, page.getByRole('button', { name: /^OpenQASM 3 Spec/ }));
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
  const outline = page.getByLabel('The post, in Markdown');
  await expect(outline).toContainText('Import AI');
  await expect(outline).toContainText('https://importai.substack.com');
});

test('shelves read in the plan\'s order: priority 1 first', async ({ page }) => {
  await open(page, './#/library?type=article');
  const first = page.locator('main ul.rows > *').first();
  await first.getByRole('button').click();
  await expect(page.getByRole('dialog').getByText(/^Priority 1 · /)).toBeVisible();
});

test('the Engineering path offers area chips that narrow its optional list, in the URL', async ({ page }) => {
  await open(page, './#/library?path=engineering');
  await expect(page.getByRole('heading', { level: 1, name: 'Electrical, mechanical & aerospace' })).toBeVisible();
  const areas = page.getByRole('group', { name: 'Area' });
  for (const label of ['Mechanics', 'Materials', 'Thermo-fluids', 'Design & CAD', 'Manufacturing', 'Electronics & PCB', 'Power & energy', 'Control', 'Aerospace', 'Chemical & nuclear', 'Practice']) {
    await expect(areas.getByRole('button', { name: new RegExp('^' + label.replace(/[&]/g, '\\$&') + ' [\\d,]+$') })).toBeVisible();
  }
  const optional = page.getByRole('button', { name: /^Optional for this path/ });
  const all = Number((await optional.innerText()).replace(/\D/g, ''));
  await areas.getByRole('button', { name: /^Aerospace \d+$/ }).click();
  await expect(page).toHaveURL(/topic=aerospace/);
  await expect(areas.getByRole('button', { name: /^Aerospace \d+$/ })).toHaveAttribute('aria-pressed', 'true');
  const some = Number((await optional.innerText()).replace(/\D/g, ''));
  expect(some).toBeGreaterThan(40);
  expect(some).toBeLessThan(all);
  await expect(optional).toHaveAttribute('aria-expanded', 'true');
  await showMoreUntil(page, page.getByRole('button', { name: /Rocket Propulsion/ }));
  // The chip again clears it.
  await areas.getByRole('button', { name: /^Aerospace \d+$/ }).click();
  await expect(page).not.toHaveURL(/topic=/);
  expect(Number((await optional.innerText()).replace(/\D/g, ''))).toBe(all);
});

test('Compact power & energy conversion gathers fusion, superconductors and plasma from the energy tracks', async ({ page }) => {
  await open(page, './#/library');
  const row = page.getByRole('button', { name: /^Compact power & energy conversion \d+$/ });
  await expect(row).toBeVisible();
  const count = Number((await row.innerText()).replace(/\D/g, ''));
  expect(count).toBeGreaterThan(50);
  await row.click();
  await expect(page).toHaveURL(/pick=energy/);
  await expect(page.getByRole('heading', { level: 1, name: 'Compact power & energy conversion' })).toBeVisible();
  await expect(page.getByRole('heading', { name: new RegExp('^' + fmt(count) + ' of ' + fmt(count) + '$') })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search power and energy conversion' }).fill('Tokamak');
  await expect(page.getByRole('button', { name: /Tokamak/ }).first()).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search power and energy conversion' }).fill('');
  // Kernel fusion is not fusion energy: the AI track stays out.
  await page.getByRole('button', { name: 'Track', exact: true }).click();
  await page.getByRole('dialog', { name: 'Track' }).getByRole('button', { name: 'Simulation' }).click();
  await expect(page).toHaveURL(/track=simulation/);
  const [shown, total] = (await page.getByRole('heading', { name: /^[\d,]+ of [\d,]+$/ }).innerText()).split(' of ').map((n) => Number(n.replace(/,/g, '')));
  expect(total).toBe(count);
  expect(shown).toBeGreaterThan(20);
});

test('Security & defence gathers the cyber defence rows, with area chips over the list', async ({ page }) => {
  await open(page, './#/library');
  const row = page.getByRole('button', { name: /^Security & defence \d+$/ });
  await expect(row).toBeVisible();
  const count = Number((await row.innerText()).replace(/\D/g, ''));
  expect(count).toBeGreaterThan(600);
  await row.click();
  await expect(page).toHaveURL(/pick=security/);
  await expect(page.getByRole('heading', { level: 1, name: 'Security & defence' })).toBeVisible();
  await expect(page.getByRole('heading', { name: new RegExp('^' + fmt(count) + ' of ' + fmt(count) + '$') })).toBeVisible();
  const areas = page.getByRole('group', { name: 'Area' });
  for (const label of ['Foundations', 'Hardening', 'Malware', 'Detection & response', 'Network & web', 'Secure development', 'AI for defence']) {
    await expect(areas.getByRole('button', { name: new RegExp('^' + label.replace(/[&]/g, '\\$&') + ' [\\d,]+$') })).toBeVisible();
  }
  await areas.getByRole('button', { name: /^Malware \d+$/ }).click();
  await expect(page).toHaveURL(/area=malware/);
  const [shown, total] = (await page.getByRole('heading', { name: /^[\d,]+ of [\d,]+$/ }).innerText()).split(' of ').map((n) => Number(n.replace(/,/g, '')));
  expect(total).toBe(count);
  expect(shown).toBeGreaterThan(60);
  expect(shown).toBeLessThan(count);
  await page.getByRole('searchbox', { name: 'Search security and defence' }).fill('YARA');
  await expect(page.getByRole('button', { name: /YARA/ }).first()).toBeVisible();
  // Object detection is not security: the AI track's vision papers stay out.
  await page.getByRole('searchbox', { name: 'Search security and defence' }).fill('');
  await areas.getByRole('button', { name: /^Malware \d+$/ }).click();
  await expect(page).not.toHaveURL(/area=/);
  await page.getByRole('searchbox', { name: 'Search security and defence' }).fill('object detection');
  await expect(page.getByText('No matches. Clear filters.')).toBeVisible();
});


test('the Books shelf has a Free / Paid chip, a paid book wears its badge, and "I own this" survives a reload', async ({ page }) => {
  await open(page, './#/library?type=book');
  const costs = page.getByRole('group', { name: 'Cost' });
  const free = costs.getByRole('button', { name: /^Free \d+$/ });
  const paid = costs.getByRole('button', { name: /^Paid \d+$/ });
  await expect(free).toBeVisible();
  await expect(paid).toBeVisible();
  const paidCount = Number((await paid.innerText()).replace(/\D/g, ''));
  expect(paidCount).toBeGreaterThan(200);
  await paid.click();
  await expect(page).toHaveURL(/cost=paid/);
  await expect(page.getByRole('heading', { name: new RegExp('^' + paidCount + ' of [\\d,]+$') })).toBeVisible();
  // Every row shown is a paid book, and says so first.
  const firstRow = page.getByRole('list').getByRole('button').first();
  await expect(firstRow).toContainText('Paid ·');
  await page.getByRole('searchbox', { name: 'Search books' }).fill('Eureka Machine');
  const eureka = page.getByRole('button', { name: /Eureka Machine/ }).first();
  await expect(eureka).toContainText('Paid');
  await eureka.click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByText('Paid', { exact: true }).first()).toBeVisible();
  const own = sheet.getByRole('switch', { name: 'I own this' });
  await expect(own).toHaveAttribute('aria-checked', 'false');
  await own.click();
  await expect(own).toHaveAttribute('aria-checked', 'true');
  await expect(sheet.getByText('Suggested like a free book')).toBeVisible();
  await writesSettled(page);
  await reload(page);
  await expect(page.getByRole('dialog').getByRole('switch', { name: 'I own this' })).toHaveAttribute('aria-checked', 'true');
  // Free shows the free books only, as many as its chip says; All (nothing pressed) shows them all.
  await open(page, './#/library?type=book&cost=free');
  const freeCount = Number((await page.getByRole('group', { name: 'Cost' }).getByRole('button', { name: /^Free \d+$/ }).innerText()).replace(/\D/g, ''));
  await expect(page.getByRole('heading', { name: new RegExp('^' + freeCount + ' of ' + fmt(freeCount + paidCount) + '$') })).toBeVisible();
  await expect(page.getByRole('button', { name: /Eureka Machine/ })).toHaveCount(0);
  await open(page, './#/library?type=book');
  await expect(page.getByRole('heading', { name: new RegExp('^' + fmt(freeCount + paidCount) + ' of ' + fmt(freeCount + paidCount) + '$') })).toBeVisible();
});

test('Agents & MCP gathers the agents, MCP and harnesses rows, with area chips over the list', async ({ page }) => {
  await open(page, './#/library');
  const row = page.getByRole('button', { name: /^Agents & MCP [\d,]+$/ });
  await expect(row).toBeVisible();
  const count = Number((await row.innerText()).replace(/\D/g, ''));
  expect(count).toBeGreaterThan(800);
  await row.click();
  await expect(page).toHaveURL(/pick=agents/);
  await expect(page.getByRole('heading', { level: 1, name: 'Agents & MCP' })).toBeVisible();
  await expect(page.getByRole('heading', { name: new RegExp('^' + fmt(count) + ' of ' + fmt(count) + '$') })).toBeVisible();
  const areas = page.getByRole('group', { name: 'Area' });
  for (const label of ['MCP', 'Harness & loop', 'Tools & sandbox', 'Evals', 'Frameworks', 'Books']) {
    await expect(areas.getByRole('button', { name: new RegExp('^' + label.replace(/[&]/g, '\\$&') + ' [\\d,]+$') })).toBeVisible();
  }
  await areas.getByRole('button', { name: /^MCP [\d,]+$/ }).click();
  await expect(page).toHaveURL(/area=mcp/);
  const [shown, total] = (await page.getByRole('heading', { name: /^[\d,]+ of [\d,]+$/ }).innerText()).split(' of ').map((n) => Number(n.replace(/,/g, '')));
  expect(total).toBe(count);
  expect(shown).toBeGreaterThan(10);
  expect(shown).toBeLessThan(count);
  await page.getByRole('searchbox', { name: 'Search agents and MCP' }).fill('rmcp');
  await expect(page.getByRole('button', { name: /rmcp|Rust SDK/i }).first()).toBeVisible();
  // An RL agent in robotics is not the cluster.
  await page.getByRole('searchbox', { name: 'Search agents and MCP' }).fill('');
  await areas.getByRole('button', { name: /^MCP [\d,]+$/ }).click();
  await page.getByRole('searchbox', { name: 'Search agents and MCP' }).fill('Training with an RL Agent');
  await expect(page.getByRole('button', { name: /^Training with an RL Agent/ })).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search agents and MCP' }).fill('GPUDrive');
  await expect(page.getByRole('button', { name: /GPUDrive/ })).toHaveCount(0);
});

test('Build & ship gathers the executables, installers and GitHub Actions rows, with area chips over the list', async ({ page }) => {
  await open(page, './#/library');
  const row = page.getByRole('button', { name: /^Build & ship [\d,]+$/ });
  await expect(row).toBeVisible();
  const count = Number((await row.innerText()).replace(/\D/g, ''));
  expect(count).toBeGreaterThan(120);
  await row.click();
  await expect(page).toHaveURL(/pick=buildship/);
  await expect(page.getByRole('heading', { level: 1, name: 'Build & ship' })).toBeVisible();
  await expect(page.getByRole('heading', { name: new RegExp('^' + fmt(count) + ' of ' + fmt(count) + '$') })).toBeVisible();
  const areas = page.getByRole('group', { name: 'Area' });
  for (const label of ['Executables', 'Installers & signing', 'Desktop apps', 'Game builds', 'GitHub Actions', 'Releases & deploys']) {
    await expect(areas.getByRole('button', { name: new RegExp('^' + label.replace(/[&]/g, '\\$&') + ' [\\d,]+$') })).toBeVisible();
  }
  await areas.getByRole('button', { name: /^GitHub Actions [\d,]+$/ }).click();
  await expect(page).toHaveURL(/area=actions/);
  const [shown, total] = (await page.getByRole('heading', { name: /^[\d,]+ of [\d,]+$/ }).innerText()).split(' of ').map((n) => Number(n.replace(/,/g, '')));
  expect(total).toBe(count);
  expect(shown).toBeGreaterThan(40);
  expect(shown).toBeLessThan(count);
  await page.getByRole('searchbox', { name: 'Search build and ship' }).fill('matrix');
  await expect(page.getByRole('button', { name: /matrix/i }).first()).toBeVisible();
  // A single-file RL implementation is not a single-file deployment: not the cluster.
  await areas.getByRole('button', { name: /^GitHub Actions [\d,]+$/ }).click();
  await page.getByRole('searchbox', { name: 'Search build and ship' }).fill('CleanRL');
  await expect(page.getByRole('button', { name: /^CleanRL/ })).toHaveCount(0);
});

test('Build it yourself gathers the from-scratch rows of the thirteenth file, with area chips over the list', async ({ page }) => {
  await open(page, './#/library');
  const row = page.getByRole('button', { name: /^Build it yourself [\d,]+$/ });
  await expect(row).toBeVisible();
  const count = Number((await row.innerText()).replace(/\D/g, ''));
  expect(count).toBeGreaterThan(200);
  await row.click();
  await expect(page).toHaveURL(/pick=buildyourself/);
  await expect(page.getByRole('heading', { level: 1, name: 'Build it yourself' })).toBeVisible();
  await expect(page.getByRole('heading', { name: new RegExp('^' + fmt(count) + ' of ' + fmt(count) + '$') })).toBeVisible();
  const areas = page.getByRole('group', { name: 'Area' });
  for (const label of ['Languages & compilers', 'OS & kernels', 'Networking', 'Databases & storage', 'Emulators & graphics', 'AI from scratch']) {
    await expect(areas.getByRole('button', { name: new RegExp('^' + label.replace(/[&]/g, '\\$&') + ' [\\d,]+$') })).toBeVisible();
  }
  await areas.getByRole('button', { name: /^Languages & compilers [\d,]+$/ }).click();
  await expect(page).toHaveURL(/area=languages/);
  const [shown, total] = (await page.getByRole('heading', { name: /^[\d,]+ of [\d,]+$/ }).innerText()).split(' of ').map((n) => Number(n.replace(/,/g, '')));
  expect(total).toBe(count);
  expect(shown).toBeGreaterThan(30);
  expect(shown).toBeLessThan(count);
  await page.getByRole('searchbox', { name: 'Search build it yourself' }).fill('Crafting Interpreters');
  await expect(page.getByRole('button', { name: /Crafting Interpreters/ }).first()).toBeVisible();
  // A single-file RL implementation is not a thing built from nothing: not the cluster.
  await areas.getByRole('button', { name: /^Languages & compilers [\d,]+$/ }).click();
  await page.getByRole('searchbox', { name: 'Search build it yourself' }).fill('CleanRL');
  await expect(page.getByRole('button', { name: /^CleanRL/ })).toHaveCount(0);
});

test('the other six filters of the thirteenth file open from the home; the four with areas show their chips, the two without show none', async ({ page }) => {
  const withAreas: [string, string, string[]][] = [
    ['lowlevel', 'Low-level & performance', ['Assembly & ISA', 'Microarchitecture', 'Debugging & profiling', 'Linux kernel', 'Networking']],
    ['science', 'Research & science', ['Rigorous math', 'ML theory', 'Physics', 'How science works', 'Research writing', 'Great lectures']],
    ['fusion', 'Fusion & accelerators', ['Plasma', 'Energy conversion', 'Magnets', 'Accelerators']],
    ['aerospace', 'Aerospace', ['Propulsion', 'Astrodynamics', 'GNC', 'Aero & structures', 'Space systems']],
  ];
  for (const [key, label, areaLabels] of withAreas) {
    await open(page, './#/library');
    const row = page.getByRole('button', { name: new RegExp('^' + label.replace(/[&]/g, '\\$&') + ' [\\d,]+$') });
    const count = Number((await row.innerText()).replace(/\D/g, ''));
    expect(count, label).toBeGreaterThan(200);
    await row.click();
    await expect(page).toHaveURL(new RegExp('pick=' + key));
    await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible();
    const areas = page.getByRole('group', { name: 'Area' });
    for (const a of areaLabels) await expect(areas.getByRole('button', { name: new RegExp('^' + a.replace(/[&]/g, '\\$&') + ' [\\d,]+$') })).toBeVisible();
    await areas.getByRole('button', { name: new RegExp('^' + areaLabels[0]!.replace(/[&]/g, '\\$&') + ' [\\d,]+$') }).click();
    const [shown, total] = (await page.getByRole('heading', { name: /^[\d,]+ of [\d,]+$/ }).innerText()).split(' of ').map((n) => Number(n.replace(/,/g, '')));
    expect(total, label).toBe(count);
    expect(shown, label).toBeGreaterThan(20);
    expect(shown, label).toBeLessThan(count);
  }
  for (const [key, label] of [['gpu', 'GPU & CUDA'], ['sdk', 'SDK & API design']] as const) {
    await open(page, './#/library');
    await page.getByRole('button', { name: new RegExp('^' + label.replace(/[&]/g, '\\$&') + ' [\\d,]+$') }).click();
    await expect(page).toHaveURL(new RegExp('pick=' + key));
    await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Area' })).toHaveCount(0);
  }
  // The GPU & CUDA search field: a CUDA Programming Guide section is in; the kernel's memory allocation guide is not.
  await open(page, './#/library');
  await page.getByRole('button', { name: /^GPU & CUDA [\d,]+$/ }).click();
  await page.getByRole('searchbox', { name: 'Search GPU and CUDA' }).fill('Writing SIMT Kernels');
  await expect(page.getByRole('button', { name: /SIMT Kernels/ }).first()).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search GPU and CUDA' }).fill('Memory Allocation Guide');
  await expect(page.getByRole('button', { name: /Memory Alloc/ })).toHaveCount(0);
});

test('the fourteenth file\'s filters: Mechanics & materials has its four chips, the other three none, and Research & science has Research writing', async ({ page }) => {
  await open(page, './#/library');
  const row = page.getByRole('button', { name: /^Mechanics & materials [\d,]+$/ });
  const count = Number((await row.innerText()).replace(/\D/g, ''));
  expect(count).toBeGreaterThan(800);
  await row.click();
  await expect(page).toHaveURL(/pick=mechanics/);
  await expect(page.getByRole('heading', { level: 1, name: 'Mechanics & materials' })).toBeVisible();
  const areas = page.getByRole('group', { name: 'Area' });
  for (const a of ['Fluids', 'Solids', 'Materials', 'Nuclear']) await expect(areas.getByRole('button', { name: new RegExp('^' + a + ' [\\d,]+$') })).toBeVisible();
  await areas.getByRole('button', { name: /^Nuclear [\d,]+$/ }).click();
  await expect(page).toHaveURL(/area=nuclear/);
  const [shown, total] = (await page.getByRole('heading', { name: /^[\d,]+ of [\d,]+$/ }).innerText()).split(' of ').map((n) => Number(n.replace(/,/g, '')));
  expect(total).toBe(count);
  expect(shown).toBeGreaterThan(100);
  expect(shown).toBeLessThan(count);
  await page.getByRole('searchbox', { name: 'Search mechanics and materials' }).fill('MCNP Primer');
  await expect(page.getByRole('button', { name: /MCNP/ }).first()).toBeVisible();
  for (const [key, label] of [['electronics', 'Electronics & EM'], ['scicomp', 'Scientific computing'], ['formal', 'Formal methods']] as const) {
    await open(page, './#/library');
    const r = page.getByRole('button', { name: new RegExp('^' + label.replace(/[&]/g, '\\$&') + ' [\\d,]+$') });
    expect(Number((await r.innerText()).replace(/\D/g, '')), label).toBeGreaterThan(120);
    await r.click();
    await expect(page).toHaveURL(new RegExp('pick=' + key));
    await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Area' })).toHaveCount(0);
  }
  await page.getByRole('searchbox', { name: 'Search formal methods' }).fill('TLA+');
  await expect(page.getByRole('button', { name: /TLA\+/ }).first()).toBeVisible();
  await open(page, './#/library?pick=science&area=writing');
  await expect(page.getByRole('group', { name: 'Area' }).getByRole('button', { name: /^Research writing [\d,]+$/ })).toHaveAttribute('aria-pressed', 'true');
  const [w] = (await page.getByRole('heading', { name: /^[\d,]+ of [\d,]+$/ }).innerText()).split(' of ').map((n) => Number(n.replace(/,/g, '')));
  expect(w).toBeGreaterThan(40);
});

test('the quality pass: canon rows wear a Canon badge, "Canon only" narrows a shelf, and a path folds the grade-3 rows under "More resources"', async ({ page }) => {
  await open(page, './#/library?type=course');
  const heading = page.getByRole('heading', { name: /^[\d,]+ of [\d,]+$/ });
  const [all] = (await heading.innerText()).split(' of ').map((n) => Number(n.replace(/,/g, '')));
  const toggle = page.getByRole('group', { name: 'Level and roadmap' }).getByRole('button', { name: 'Canon only' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(page).toHaveURL(/canon=1/);
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(async () => {
    const [shown] = (await heading.innerText()).split(' of ').map((n) => Number(n.replace(/,/g, '')));
    expect(shown).toBeGreaterThan(20);
    expect(shown).toBeLessThan(all!);
  }).toPass();
  // Every row shown is canon, and says so first.
  await expect(page.getByRole('list').getByRole('button').first()).toContainText('Canon ·');
  await page.getByRole('list').getByRole('button').first().click();
  await expect(page.getByRole('dialog').getByText('Canon', { exact: true })).toBeVisible();
  // DevOps has nothing on the plan: its optional list is open, and the grade-3 rows wait, folded, at its end.
  await open(page, './#/library?path=devops');
  const more = page.getByRole('button', { name: /^More resources [\d,]+$/ });
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  const before = await page.locator('ul.rows > li').count();
  await more.click();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  await expect(async () => expect(await page.locator('ul.rows > li').count()).toBeGreaterThan(before)).toPass();
});

test('the quick filters are one list on the home; Certificates wears its badge, Earned persists and Plan › Credentials counts it', async ({ page }) => {
  await open(page, './#/library');
  // The quick filters are the chips under the search (the redesign mockup).
  const list = page.getByRole('group', { name: 'Quick filters' });
  for (const label of ['Developer essentials', 'Compact power & energy conversion', 'Security & defence', 'Agents & MCP', 'Certificates', 'Career & interviews', 'Research skills', 'Communication', 'Open source', 'Mandarin (the language)', 'Build & ship', 'Build it yourself', 'Low-level & performance', 'Research & science', 'GPU & CUDA', 'SDK & API design', 'Fusion & accelerators', 'Aerospace', 'Electronics & EM', 'Mechanics & materials', 'Scientific computing', 'Formal methods']) {
    // The count carries a thousands separator past a thousand (ATLAS-UI-POLISH): "Agents & MCP 1,023".
    await expect(page.getByRole('button', { name: new RegExp('^' + label.replace(/[()&]/g, '\\$&') + ' [\\d,]+$') })).toBeVisible();
  }
  await expect(list).toBeVisible();
  const certs = page.getByRole('button', { name: /^Certificates \d+$/ });
  const count = Number((await certs.innerText()).replace(/\D/g, ''));
  expect(count).toBeGreaterThan(40);
  await certs.click();
  await expect(page).toHaveURL(/pick=certificates/);
  await expect(page.getByRole('heading', { level: 1, name: 'Certificates' })).toBeVisible();
  await expect(page.getByRole('heading', { name: new RegExp('^' + fmt(count) + ' of ' + fmt(count) + '$') })).toBeVisible();
  await expect(page.getByRole('list').getByRole('button').first()).toContainText('Certificate ·');
  await page.getByRole('searchbox', { name: 'Search certificates' }).fill('NCA-GENL');
  await page.getByRole('button', { name: /NCA-GENL/ }).first().click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByText('Certificate', { exact: true }).first()).toBeVisible();
  const earned = sheet.getByRole('switch', { name: 'Earned' });
  await expect(earned).toHaveAttribute('aria-checked', 'false');
  await earned.click();
  await expect(earned).toHaveAttribute('aria-checked', 'true');
  await sheet.getByLabel('Earned on').fill('2027-03-01');
  await expect(sheet.getByText('On 1 March 2027')).toBeVisible();
  await writesSettled(page);
  await reload(page);
  await expect(page.getByRole('dialog').getByRole('switch', { name: 'Earned' })).toHaveAttribute('aria-checked', 'true');
  await open(page, './#/plan?view=credentials');
  await expect(page.getByRole('link', { name: /Certificates in the Library/ })).toContainText('1 of ' + count + ' earned');
});

test('Mandarin is its own quick filter, on the languages track, and Research skills leaves the papers themselves out', async ({ page }) => {
  await open(page, './#/library?pick=mandarin');
  await expect(page.getByRole('heading', { level: 1, name: 'Mandarin (the language)' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Chinese Grammar Wiki|HSK|pinyin/i }).first()).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search Mandarin' }).fill('benchmark');
  await expect(page.getByRole('button', { name: /CRUD-RAG/ })).toHaveCount(0);
  await open(page, './#/library?pick=research');
  await expect(page.getByRole('heading', { level: 1, name: 'Research skills' })).toBeVisible();
  // The list is virtualised: search for a row rather than scrolling to it.
  await page.getByRole('searchbox', { name: 'Search research skills' }).fill('Research Problems');
  await expect(page.getByRole('button', { name: /Eisner: Find Problems/ }).first()).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search research skills' }).fill('Attention Is All You Need');
  await expect(page.getByRole('button', { name: /^Attention Is All You Need/ })).toHaveCount(0);
});
