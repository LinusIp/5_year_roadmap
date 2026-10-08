import { expect, test } from '@playwright/test';
import { FIRST_DAY, open, pickStatus, reload } from './helpers.ts';

test.use({ timezoneId: 'Asia/Tashkent' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
});

test.describe('library', () => {
  test('search and filters narrow the list, and live in the URL', async ({ page }) => {
    await open(page, './#/library');
    const search = page.getByRole('searchbox', { name: 'Search the library' });
    await search.fill('linear algebra');
    await expect(page).toHaveURL(/q=linear/);
    await expect(page.getByRole('button', { name: /^18\.06 Linear Algebra/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^The Rust Programming Language/ })).toBeHidden();

    await search.fill('');
    await page.getByRole('button', { name: 'Track', exact: true }).click();
    await page.getByRole('dialog', { name: 'Track' }).getByRole('button', { name: 'Embedded' }).click();
    await expect(page).toHaveURL(/track=embedded/);
    await expect(page.getByRole('button', { name: /Embedded Rust Book/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^18\.06/ })).toBeHidden();

    await page.getByRole('button', { name: /^Courses \d+$/ }).click();
    await expect(page).toHaveURL(/type=course/);
    await expect(page.getByText(/^\d+ match(es)?$/)).toBeVisible();
  });

  test('an item without a checked link says so, and offers a search instead', async ({ page }) => {
    await open(page, './#/library?q=current+algorithms');
    await page.getByRole('button', { name: /Current algorithms and data structures course/ }).click();
    const sheet = page.getByRole('dialog', { name: /Current algorithms and data structures course/ });
    await expect(sheet.getByText(/No checked link yet/)).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'Find a link' })).toHaveAttribute('href', /duckduckgo\.com/);
  });

  test('notes are Markdown, saved on blur, and rendered safely', async ({ page }) => {
    await open(page, './#/library/mit-18-06');
    const sheet = page.getByRole('dialog', { name: /MIT 18\.06 Linear Algebra/ });
    const notes = sheet.getByRole('textbox', { name: 'Notes' });
    await notes.fill('## Lecture 3\n\nThe **four** subspaces. [Strang](javascript:alert(1)) and <b>raw</b>.');
    await notes.blur();

    await expect(sheet.getByRole('heading', { name: 'Lecture 3' })).toBeVisible();
    await expect(sheet.locator('strong', { hasText: 'four' })).toBeVisible();
    // The javascript: link is not a link, and the raw tag is shown as text rather than rendered.
    await expect(sheet.getByRole('link', { name: 'Strang' })).toHaveCount(0);
    await expect(sheet.getByText('<b>raw</b>', { exact: false })).toBeVisible();

    await reload(page);
    await expect(sheet.getByRole('heading', { name: 'Lecture 3' })).toBeVisible();
  });

  test('adds a resource of your own and opens it', async ({ page }) => {
    await open(page, './#/library');
    await page.getByRole('button', { name: 'Add a resource' }).click();
    const sheet = page.getByRole('dialog', { name: 'Add a resource' });
    await sheet.getByRole('textbox', { name: 'Title' }).fill('Computer Networking: A Top-Down Approach');
    await sheet.getByRole('textbox', { name: 'Provider' }).fill('Kurose and Ross');
    await sheet.getByRole('button', { name: /^Type/ }).click();
    await page.getByRole('dialog', { name: 'Type' }).getByRole('button', { name: 'Book' }).click();
    await sheet.getByRole('textbox', { name: 'Link' }).fill('not a url');
    await sheet.getByRole('button', { name: 'Add to the library' }).click();
    await expect(sheet.getByRole('alert')).toHaveText(/https:\/\//);

    await sheet.getByRole('textbox', { name: 'Link' }).fill('');
    await sheet.getByRole('button', { name: 'Add to the library' }).click();
    await expect(page).toHaveURL(/#\/library\/my-computer-networking/);
    const item = page.getByRole('dialog', { name: 'Computer Networking: A Top-Down Approach' });
    // No link was given, so it carries a search hint rather than an unchecked URL.
    await expect(item.getByText(/No checked link yet/)).toBeVisible();

    await open(page, './#/library?q=kurose');
    await expect(page.getByRole('button', { name: /Top-Down Approach Kurose and Ross/ })).toBeVisible();
  });

  test('estimated hours are editable, and the edit can be undone', async ({ page }) => {
    await open(page, './#/library/mit-18-06');
    const sheet = page.getByRole('dialog', { name: /MIT 18\.06 Linear Algebra/ });
    const hours = sheet.getByRole('textbox', { name: 'Estimated hours' });
    await expect(hours).toHaveValue('120');
    await hours.fill('140');
    await hours.blur();
    await expect(sheet.getByRole('button', { name: 'Undo my edits to this resource' })).toBeVisible();
    await reload(page);
    await expect(hours).toHaveValue('140');
  });
});

test.describe('projects', () => {
  test('a project can only be marked done once its repository link is in', async ({ page }) => {
    await open(page, './#/library/m02');
    const sheet = page.getByRole('dialog', { name: /CLI habit tracker/ });
    const pill = sheet.getByRole('button', { name: /^Status of CLI habit/ });

    // A tap skips Done while it is not allowed; the full list says why.
    await pill.click();
    await expect(pill).toHaveText('Active');
    await pill.click({ button: 'right' });
    const list = page.getByRole('dialog', { name: /^Status of CLI habit/ });
    await list.getByRole('button', { name: /^Done/ }).click();
    await expect(list.getByRole('alert')).toHaveText(/only done once its repository link is filled in/);
    await list.getByRole('button', { name: 'Close' }).click();
    await expect(pill).toHaveText('Active');

    const repo = sheet.getByRole('textbox', { name: 'Repository' });
    await repo.fill('https://github.com/me/tracker');
    await repo.blur();
    await pickStatus(page, pill, 'Done');
    await expect(pill).toHaveText('Done');

    // Clearing the repository reopens the project, so the rule keeps holding.
    await repo.fill('');
    await repo.blur();
    await expect(pill).toHaveText('Active');
  });
});

test.describe('papers', () => {
  test('moves a paper through the queue and keeps its summary', async ({ page }) => {
    await open(page, './#/plan?view=papers');
    const pill = page.getByRole('button', { name: /^Status of Attention Is All You Need/ }).first();
    await pill.click();
    await expect(pill).toHaveText('Reading');

    await page.getByRole('button', { name: /^Attention Is All You Need Vaswani/ }).last().click();
    const sheet = page.getByRole('dialog', { name: 'Attention Is All You Need' });
    await sheet.getByRole('textbox', { name: 'Summary in three sentences' }).fill('Recurrence is dropped. Attention alone is enough. It trains faster and translates better.');
    await sheet.getByRole('textbox', { name: 'Key idea' }).click();
    await expect(sheet.getByText(/^3 so far\./)).toBeVisible();
    await sheet.getByRole('button', { name: 'Close' }).click();

    await pill.click();
    await expect(pill).toHaveText('Read');
    await page.getByRole('button', { name: /^Read\s*1$/ }).click();
    await expect(page.getByRole('button', { name: /^Attention Is All You Need Vaswani/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /ResNet/ })).toBeHidden();

    await reload(page);
    await page.getByRole('button', { name: /^Attention Is All You Need Vaswani/ }).click();
    await expect(sheet.getByRole('textbox', { name: 'Summary in three sentences' })).toHaveValue(/^Recurrence is dropped/);
  });
});

test.describe('credentials', () => {
  test('certificates filter by year, and a status set in the sheet sticks', async ({ page }) => {
    await open(page, './#/plan?view=credentials');
    await page.getByRole('button', { name: 'Year 1', exact: true }).click();
    await page.getByRole('button', { name: /^PCEP: Certified Entry-Level Python Programmer/ }).click();
    const sheet = page.getByRole('dialog', { name: /^PCEP/ });
    await expect(sheet.getByText(/From \$69 \(exam\); from \$86 with a retake/)).toBeVisible();
    await pickStatus(page, sheet.getByRole('button', { name: /^Status of PCEP/ }), 'Studying');
    await sheet.getByRole('button', { name: 'Close' }).click();

    await reload(page);
    await expect(page.getByRole('button', { name: /^Status of PCEP/ })).toHaveText('Studying');
  });

  test('the FE exam is shown as something to investigate, not a goal', async ({ page }) => {
    await open(page, './#/plan?view=credentials&year=5');
    await expect(page.getByRole('button', { name: /NCEES FE exam.*Check eligibility first/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Status of NCEES FE/ })).toHaveText('Investigating');
  });

  test('a milestone follows its project until you set it yourself', async ({ page }) => {
    // Ship the shell in C (monthly project 7) with its repository.
    await open(page, './#/library/m07');
    const sheet = page.getByRole('dialog', { name: /Shell in C|shell/i });
    await sheet.getByRole('textbox', { name: 'Repository' }).fill('https://github.com/me/shell');
    await sheet.getByRole('textbox', { name: 'Repository' }).blur();
    await pickStatus(page, sheet.getByRole('button', { name: /^Status of / }).first(), 'Done');

    await open(page, './#/plan?view=credentials');
    await expect(page.getByRole('button', { name: /^Status of Shell in C/ })).toHaveText('Done');
  });

  test('a library item links to the subject it counts towards', async ({ page }) => {
    await open(page, './#/library/mit-18-06');
    await page.getByRole('link', { name: /Math, physics and chemistry prerequisites Counts towards/ }).click();
    await expect(page).toHaveURL(/view=credentials&subject=math-physics/);
    await expect(page.getByRole('button', { name: 'Math, physics and chemistry prerequisites', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });
});
