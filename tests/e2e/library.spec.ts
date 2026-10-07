import { expect, test } from '@playwright/test';

const FIRST_DAY = '2026-09-21T09:00:00+05:00';

test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

test.describe('library', () => {
  test('search and filters narrow the list, and live in the URL', async ({ page }) => {
    await page.goto('./#/library');
    // "N of total": read the total rather than pinning it, so a curriculum edit does not break the test.
    const count = page.getByText(/^\d+ of \d+$/);
    await expect(count).toBeVisible();
    const total = Number((await count.textContent())!.split(' of ')[1]);
    expect(total).toBeGreaterThan(200);
    await expect(count).toHaveText(total + ' of ' + total);

    await page.getByRole('searchbox').fill('linear algebra');
    await expect(page).toHaveURL(/q=linear/);
    await expect(page.getByRole('link', { name: /MIT 18\.06 Linear Algebra/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Rust Programming Language/ })).toBeHidden();
    await expect(count).not.toHaveText(total + ' of ' + total);

    await page.getByRole('searchbox').fill('');
    await page.getByLabel('Track').selectOption('embedded');
    await expect(page.getByRole('link', { name: /Embedded Rust Book/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /MIT 18\.06/ })).toBeHidden();

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(count).toHaveText(total + ' of ' + total);
  });

  test('an item without a verified link says so, and offers a search instead', async ({ page }) => {
    await page.goto('./#/library?q=current+algorithms');
    const row = page.getByRole('listitem').filter({ hasText: /Current algorithms and data structures course/ });
    await expect(row.getByText('find link')).toBeVisible();

    await row.getByRole('link').first().click();
    await expect(page.getByText('No verified link yet')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Find link' })).toHaveAttribute('href', /duckduckgo\.com/);
  });

  test('notes are Markdown, saved on blur, and rendered safely', async ({ page }) => {
    await page.goto('./#/library/mit-18-06');
    const notes = page.getByRole('textbox', { name: 'Notes' });
    await notes.fill('## Lecture 3\n\nThe **four** subspaces. [Strang](javascript:alert(1)) and <b>raw</b>.');
    await notes.blur();
    await page.getByRole('tab', { name: 'Preview' }).click();

    await expect(page.getByRole('heading', { name: 'Lecture 3' })).toBeVisible();
    await expect(page.locator('strong', { hasText: 'four' })).toBeVisible();
    // The javascript: link is not a link, and the raw tag is shown as text rather than rendered.
    await expect(page.getByRole('link', { name: 'Strang' })).toHaveCount(0);
    await expect(page.getByText('<b>raw</b>', { exact: false })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Lecture 3' })).toBeVisible();
  });

  test('adds a resource of your own and opens it', async ({ page }) => {
    await page.goto('./#/library');
    await page.getByRole('button', { name: 'Add resource' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add a resource' });
    await dialog.getByLabel('Title').fill('Computer Networking: A Top-Down Approach');
    await dialog.getByLabel('Provider').fill('Kurose and Ross');
    await dialog.getByLabel('Type').selectOption('book');
    await dialog.getByLabel('Link').fill('not a url');
    await dialog.getByRole('button', { name: 'Add to the library' }).click();
    await expect(dialog.getByRole('alert')).toHaveText(/https:\/\//);

    await dialog.getByLabel('Link').fill('');
    await dialog.getByRole('button', { name: 'Add to the library' }).click();
    await expect(page).toHaveURL(/#\/library\/my-computer-networking/);
    await expect(page.getByRole('heading', { level: 1, name: 'Computer Networking: A Top-Down Approach' })).toBeVisible();
    // No link was given, so it carries a search hint rather than an unverified URL.
    await expect(page.getByText('No verified link yet')).toBeVisible();

    await page.goto('./#/library?q=kurose');
    await expect(page.getByRole('link', { name: /Top-Down Approach/ })).toBeVisible();
  });

  test('estimated hours are editable', async ({ page }) => {
    await page.goto('./#/library/mit-18-06');
    await page.getByRole('button', { name: /120h/ }).click();
    const input = page.getByRole('spinbutton', { name: 'Estimated hours' }).or(page.getByRole('textbox', { name: 'Estimated hours' }));
    await input.fill('140');
    await input.press('Enter');
    await expect(page.getByRole('button', { name: /140h/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Undo my edits to this resource' })).toBeVisible();
  });

  test('fits a 380 px screen', async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 800 });
    for (const path of ['./#/library', './#/library/mit-18-06', './#/papers', './#/certs', './#/certs?view=map', './#/roadmap', './#/activity']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});

test.describe('projects', () => {
  test('a project can only be marked done once its repository link is in', async ({ page }) => {
    await page.goto('./#/library/m02');
    await expect(page.getByRole('heading', { level: 1, name: /CLI expense or habit tracker/ })).toBeVisible();

    // "Done" is aria-disabled but still clickable, so it can say why; Playwright treats aria-disabled as
    // disabled, hence force.
    await page.getByRole('radio', { name: 'Done' }).click({ force: true });
    await expect(page.getByRole('alert')).toHaveText(/only done once its repository link is filled in/);
    await expect(page.getByRole('radio', { name: 'Done' })).toHaveAttribute('aria-checked', 'false');

    await page.getByRole('textbox', { name: 'Repository' }).fill('https://github.com/me/tracker');
    await page.getByRole('textbox', { name: 'Repository' }).blur();
    await page.getByRole('radio', { name: 'Done' }).click();
    await expect(page.getByRole('radio', { name: 'Done' })).toHaveAttribute('aria-checked', 'true');

    // Clearing the repository reopens the project, so the rule keeps holding.
    await page.getByRole('textbox', { name: 'Repository' }).fill('');
    await page.getByRole('textbox', { name: 'Repository' }).blur();
    await expect(page.getByRole('radio', { name: 'In progress' })).toHaveAttribute('aria-checked', 'true');
  });

  test('the roadmap will not mark a project done without a repository either', async ({ page }) => {
    await page.goto('./#/roadmap');
    const select = page.getByRole('combobox', { name: /Status of ML Zoomcamp midterm/ });
    await expect(select.locator('option', { hasText: 'add a repo link first' })).toBeDisabled();
  });
});

test.describe('papers', () => {
  test('moves a paper through the queue and keeps its summary', async ({ page }) => {
    await page.goto('./#/papers');
    await page.getByRole('combobox', { name: /Status of Attention Is All You Need/ }).selectOption('reading');
    await expect(page.getByText(/Next up: Attention Is All You Need/)).toBeVisible();

    await page.getByRole('button', { name: 'Attention Is All You Need' }).click();
    await page.getByRole('textbox', { name: /Summary in three sentences/ }).fill('Recurrence is dropped. Attention alone is enough. It trains faster and translates better.');
    await page.getByRole('textbox', { name: 'Key idea' }).click();
    await expect(page.getByText(/\(3 so far\)/)).toBeVisible();

    await page.getByRole('combobox', { name: /Status of Attention Is All You Need/ }).selectOption('read');
    await page.getByRole('button', { name: /^Read\s*1$/ }).click();
    await expect(page.getByRole('button', { name: 'Attention Is All You Need' })).toBeVisible();
    await expect(page.getByRole('button', { name: /ResNet/ })).toBeHidden();
  });
});

test.describe('certifications', () => {
  test('shows cards by year and the credential map, with a status that sticks', async ({ page }) => {
    await page.goto('./#/certs');
    await page.getByRole('button', { name: 'Year 1', exact: true }).click();
    const pcep = page.getByRole('listitem').filter({ hasText: /PCEP: Certified Entry-Level Python Programmer/ });
    await expect(pcep).toBeVisible();
    await expect(pcep.getByText('From $69 (exam); from $86 with a retake')).toBeVisible();

    await pcep.getByRole('button', { name: 'Track it' }).click();
    await pcep.getByLabel('Status').selectOption('studying');
    await expect(pcep.getByText('Studying').first()).toBeVisible();

    await page.getByRole('tab', { name: 'Credential map' }).click();
    const python = page.getByRole('row', { name: /^Python/ });
    await expect(python.getByText('Studying')).toBeVisible();
    await expect(python.getByText('Published CLI tool with tests and CI')).toBeVisible();
  });

  test('the FE exam is shown as something to investigate, not a goal', async ({ page }) => {
    await page.goto('./#/certs?year=5');
    const fe = page.getByRole('listitem').filter({ hasText: /NCEES FE exam/ });
    await expect(fe.getByText('Check eligibility first', { exact: true })).toBeVisible();
    await expect(fe.getByText('Investigating')).toBeVisible();
  });

  test('a milestone follows its project until you set it yourself', async ({ page }) => {
    // Ship the shell in C (monthly project 7) with its repository.
    await page.goto('./#/library/m07');
    await page.getByRole('textbox', { name: 'Repository' }).fill('https://github.com/me/shell');
    await page.getByRole('textbox', { name: 'Repository' }).blur();
    await page.getByRole('radio', { name: 'Done' }).click();

    await page.goto('./#/certs?view=map');
    const row = page.getByRole('row', { name: /^C \/ C\+\+/ });
    const milestone = row.locator('div').filter({ hasText: /^Shell in C/ }).first();
    await expect(milestone.getByText('Done')).toBeVisible();
  });

  test('a link from a library item highlights its row in the map', async ({ page }) => {
    await page.goto('./#/library/mit-18-06');
    await page.getByRole('link', { name: /Math, physics and chemistry prerequisites/ }).click();
    await expect(page).toHaveURL(/subject=math-physics/);
    await expect(page.locator('#subject-math-physics')).toHaveClass(/bg-accent-wash/);
  });
});
