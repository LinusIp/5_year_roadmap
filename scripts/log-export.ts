/**
 * npm run log:export -- [backup.json] [--out <folder>] [--reflections]
 *
 * Writes each logged day to <folder>/YYYY/MM/DD.md (default folder: learning-log), for committing to a public
 * repository so the GitHub graph shows the real work. The logs live in the browser, so this reads a backup
 * from Settings > Export. With no file named, it takes the newest atlas-backup-*.json in the current folder
 * or in ~/Downloads.
 *
 * It only writes. Files for days that no longer have time logged are listed, never deleted.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { parseBackup } from '../src/db/backup-file.ts';
import { buildLearningLog, existingLogFiles } from './lib/learning-log.ts';
import { loadSeedOrThrow, splitSeed } from './lib/load-seed.ts';

const HELP = `Usage: npm run log:export -- [backup.json] [--out <folder>] [--reflections]

Writes one Markdown file per day with time logged to <folder>/YYYY/MM/DD.md.

  backup.json     A backup from Atlas (Settings > Export everything). Default: the newest
                  atlas-backup-*.json in this folder or in your Downloads folder.
  --out <folder>  Where to write the log. Default: learning-log
  --reflections   Also write each day's reflection and energy rating (private by default).
`;

/** The newest backup in the current folder, else in ~/Downloads, where browsers save the export. */
function newestBackup(): string | null {
  for (const dir of [process.cwd(), join(homedir(), 'Downloads')]) {
    const candidates: { path: string; mtime: number }[] = [];
    let names: string[] = [];
    try {
      names = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      // Browsers rename a second download of the same day, e.g. "atlas-backup-2026-09-21 (1).json".
      if (!/^atlas-backup-\d{4}-\d{2}-\d{2}.*\.json$/.test(name)) continue;
      const path = join(dir, name);
      candidates.push({ path, mtime: statSync(path).mtimeMs });
    }
    candidates.sort((a, b) => b.mtime - a.mtime);
    if (candidates[0]) return candidates[0].path;
  }
  return null;
}

function main(): number {
  let args;
  try {
    args = parseArgs({
      allowPositionals: true,
      options: {
        out: { type: 'string', default: 'learning-log' },
        reflections: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    });
  } catch (err) {
    console.error((err instanceof Error ? err.message : String(err)) + '\n\n' + HELP);
    return 1;
  }
  if (args.values.help) {
    console.log(HELP);
    return 0;
  }

  const source = args.positionals[0] ?? newestBackup();
  if (!source) {
    console.error('No backup found. Export one from Atlas (Settings > Export everything), then run this again.\n\n' + HELP);
    return 1;
  }
  if (!existsSync(source)) {
    console.error('There is no file at ' + source + '.');
    return 1;
  }

  const parsed = parseBackup(readFileSync(source, 'utf8'));
  if (!parsed.ok) {
    console.error(source + ' could not be read:\n  - ' + parsed.errors.join('\n  - '));
    return 1;
  }

  const { app } = splitSeed(loadSeedOrThrow());
  const files = buildLearningLog(parsed.file, app, { reflections: args.values.reflections });
  const out = resolve(args.values.out);

  let written = 0;
  let unchanged = 0;
  for (const [path, content] of files) {
    const target = join(out, path);
    if (existsSync(target) && readFileSync(target, 'utf8') === content) {
      unchanged++;
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    written++;
  }

  const shown = relative(process.cwd(), out) || '.';
  console.log('Read ' + source + ' (exported ' + parsed.file.exportedAt.slice(0, 10) + ').');
  console.log(
    'Wrote ' + written + (written === 1 ? ' day' : ' days') + ' to ' + shown + ', ' + unchanged + ' unchanged' +
      (args.values.reflections ? ', with reflections.' : '.'),
  );

  const stale = existingLogFiles(out).filter((path) => !files.has(path));
  if (stale.length > 0) {
    console.log('\nThese days have no time logged in this backup. They were left alone; delete them if that is right:');
    for (const path of stale) console.log('  ' + join(shown, path));
  }

  if (files.size > 0 && !existsSync(join(out, '.git'))) {
    console.log(
      '\n' + shown + ' is not a git repository yet. To publish it, create an empty public repository on GitHub, then:\n' +
        '  cd ' + shown + '\n  git init\n  git add .\n  git commit -m "Learning log"\n  git branch -M main\n' +
        '  git remote add origin <your repository URL>\n  git push -u origin main',
    );
  }
  return 0;
}

process.exitCode = main();
