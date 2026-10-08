import { expect, test } from '@playwright/test';
import { FIRST_DAY, open, pickStatus } from './helpers.ts';

/**
 * The brief of 2026-10-07: the five roadmap.sh roadmaps as checklists with coverage, the research cadence as a
 * stack of its own on Projects, and the quarterly review that closes each quarter with research.
 */
test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

test('a roadmap node ticked by hand counts, and stays ticked', async ({ page }) => {
  await open(page, './#/plan?view=credentials');
  const row = page.getByRole('button', { name: /^Inference Engineering 0 %/ });
  await expect(row).toContainText(/Priority 1 · 0 of \d+ nodes/);
  for (const title of ['AI Engineer', 'AI Agents', 'Software Architect', 'Game Developer']) {
    await expect(page.getByRole('button', { name: new RegExp('^' + title + ' 0 %') })).toBeVisible();
  }
  await row.click();

  const sheet = page.getByRole('dialog', { name: 'Inference Engineering' });
  await expect(sheet.getByText(/Mastered at \d+ nodes with the .* row of the credential map done \(not yet\)/)).toBeVisible();
  await sheet.getByRole('checkbox', { name: 'Inference vs. Training' }).click();
  await expect(sheet.getByText(/^0 % · 1 of \d+ nodes, optional ones left out$/)).toBeVisible();

  await page.reload();
  await expect(sheet.getByRole('checkbox', { name: 'Inference vs. Training' })).toHaveAttribute('aria-checked', 'true');
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('button', { name: /^Inference Engineering 0 %/ })).toContainText(/1 of \d+ nodes/);
});

test('finishing a resource ticks the nodes it covers, which cannot be unticked by hand', async ({ page }) => {
  await open(page, './#/library/vllm-docs');
  await pickStatus(page, page.getByRole('dialog').getByRole('button', { name: /^Status of vLLM documentation/ }), 'Done');

  await open(page, './#/plan?view=credentials&roadmap=inference-engineering');
  const sheet = page.getByRole('dialog', { name: 'Inference Engineering' });
  const node = sheet.getByRole('checkbox', { name: 'Continuous Batching' });
  await expect(node).toHaveAttribute('aria-checked', 'true');
  await expect(node).toHaveAttribute('aria-disabled', 'true');
  await expect(sheet.getByRole('listitem').filter({ hasText: 'Continuous Batching' })).toContainText('From vLLM documentation and source');
  await node.click({ force: true });
  await expect(node).toHaveAttribute('aria-checked', 'true');
});

test('Projects has a research stack that names the first research card before research starts', async ({ page }) => {
  await open(page, './#/plan?view=projects');
  await expect(page.getByRole('heading', { name: 'Research' })).toBeVisible();
  const row = page.getByRole('button', { name: /^Research starts in year 2 First: Three reproductions/ });
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.getByRole('dialog', { name: /^Three reproductions/ })).toBeVisible();
});

test('the quarterly review keeps its research question and is marked reviewed', async ({ page }) => {
  await open(page, './#/reviews?tab=quarter');
  const row = page.getByRole('button', { name: /^2026 Q3 0 h logged · no research shipped/ });
  await expect(row).toContainText('This quarter');
  await row.click();

  const sheet = page.getByRole('dialog', { name: '2026 Q3' });
  await expect(sheet.getByRole('link', { name: /^No research card this quarter/ })).toBeVisible();
  const question = sheet.getByRole('textbox', { name: "This quarter's research question" });
  await question.fill('Does speculative decoding help more on code than on prose?');
  await question.blur();
  await sheet.getByRole('textbox', { name: 'What changes next quarter' }).fill('Start the reproductions.');
  await sheet.getByRole('textbox', { name: 'What changes next quarter' }).blur();
  await sheet.getByRole('button', { name: 'Mark this quarter reviewed' }).click();
  await expect(sheet.getByText('Reviewed on 21 September.')).toBeVisible();

  await page.reload();
  await expect(question).toHaveValue('Does speculative decoding help more on code than on prose?');
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('button', { name: /^2026 Q3 0 h logged · a question asked Reviewed$/ })).toBeVisible();
});
