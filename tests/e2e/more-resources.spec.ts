import { expect, test } from '@playwright/test';
import { FIRST_DAY, open, showMoreUntil } from './helpers.ts';

/**
 * The 507 more resources (MORE-RESOURCES): the Papers shelf in the plan's years with a level filter, search across
 * papers, blogs and articles, Software architecture and Robotics as paths of their own, a blog's sheet and its link.
 */
test.use({ timezoneId: 'Asia/Tashkent', serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

test('the Papers shelf lists Attention Is All You Need, year 1 first, and filters by level', async ({ page }) => {
  await open(page, './#/library');
  await page.getByRole('button', { name: /^Browse all/ }).click();
  await page.getByRole('button', { name: /^[\d,]+ Papers$/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Papers' })).toBeVisible();
  const rows = page.locator('main ul.rows > *');
  // In the plan's years: the first paper is one for year 1.
  await expect(rows.first()).toContainText('Year 1');
  const search = page.getByRole('searchbox', { name: 'Search papers' });
  await search.fill('Attention Is All You Need');
  const attention = page.getByRole('button', { name: /^Attention Is All You Need/ });
  await expect(attention).toBeVisible();
  await expect(attention).toContainText('Year 2');
  await search.fill('');
  const levels = page.getByRole('group', { name: 'Level and roadmap' });
  await levels.getByRole('button', { name: 'Advanced' }).click();
  await expect(page).toHaveURL(/lvl=advanced/);
  await search.fill('Attention Is All You Need');
  // The paper is intermediate, so the Advanced chip hides it (other papers carry its words: "Tensor Product
  // Attention Is All You Need" came with the whole Atlas Library).
  await expect(attention).toHaveCount(0);
  await levels.getByRole('button', { name: 'Intermediate' }).click();
  await expect(page).toHaveURL(/lvl=intermediate/);
  await expect(attention).toBeVisible();
  await attention.click();
  await expect(page.getByRole('dialog', { name: 'Attention Is All You Need' }).getByRole('link', { name: 'Read' })).toHaveAttribute('href', 'https://arxiv.org/abs/1706.03762');
});

test('search finds FlashAttention, Raft and Diffusion Policy', async ({ page }) => {
  await open(page, './#/library');
  const search = page.getByRole('searchbox', { name: 'Search the library' });
  for (const [query, row] of [
    ['FlashAttention', /^FlashAttention/],
    ['Raft', /^Raft/],
    ['Diffusion Policy', /^Diffusion Policy/],
  ] as const) {
    await search.fill(query);
    await expect(page.getByRole('heading', { name: /^Papers · \d+$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: row }).first()).toBeVisible();
  }
});

test('Robotics and Software architecture list their new resources under Optional', async ({ page }) => {
  await open(page, './#/library');
  // Architecture has nothing on the plan: the home offers it to browse, under the fold of more paths.
  await page.getByRole('button', { name: /^\d+ more paths/ }).click();
  const architecture = page.getByRole('button', { name: /^Software architecture Not on the plan · [\d,]+ to browse$/ });
  await expect(architecture).toBeVisible();
  await architecture.click();
  await expect(page).toHaveURL(/path=architecture/);
  await expect(page.getByRole('heading', { level: 1, name: 'Software architecture' })).toBeVisible();
  const optional = page.getByRole('button', { name: /^Optional for this path/ });
  await expect(optional).toHaveAttribute('aria-expanded', 'true');
  const noSilverBullet = page.getByRole('button', { name: /^No Silver Bullet/ });
  await showMoreUntil(page, noSilverBullet);
  await expect(noSilverBullet).toContainText('Year 1 · Paper');

  await open(page, './#/library?path=robotics');
  await expect(page.getByRole('heading', { level: 1, name: 'Robotics' })).toBeVisible();
  const more = page.getByRole('button', { name: /^Optional for this path/ });
  if ((await more.getAttribute('aria-expanded')) === 'false') await more.click();
  const underactuated = page.getByRole('button', { name: /^Underactuated Robotics/ });
  await showMoreUntil(page, underactuated);
  await expect(underactuated).toContainText('Year 2 · Book');
  // The fourth Atlas file adds a second row that starts "Diffusion Policy"; the paper is the first by fit.
  await showMoreUntil(page, page.getByRole('button', { name: /^Diffusion Policy/ }).first());
});

test('a blog opens its sheet with its link', async ({ page }) => {
  await open(page, './#/library?type=blog');
  await expect(page.getByRole('heading', { level: 1, name: 'Blogs to follow' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search blogs to follow' }).fill('Fowler');
  await page.getByRole('button', { name: /^Fowler's Bliki/ }).click();
  const sheet = page.getByRole('dialog', { name: /Bliki/ });
  await expect(sheet.getByRole('link', { name: 'Open' })).toHaveAttribute('href', 'https://martinfowler.com/bliki/');
  await expect(sheet.getByText(/Link checked 2026-10-19\./)).toBeVisible();
});
