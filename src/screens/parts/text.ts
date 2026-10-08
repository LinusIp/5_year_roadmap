/**
 * How numbers and titles read in the interface. A number's meaning comes from the sentence it sits in, so
 * durations read like "3 h 20 m of 8 h".
 */
import { dayName, monthName, today } from '../../lib/dates.ts';

/** "Wednesday 7 October", with the year only when it is not this one. */
export function dateTitle(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const thisYear = today().slice(0, 4) === String(y);
  return dayName(date) + ' ' + d + ' ' + monthName(m - 1) + (thisYear ? '' : ' ' + y);
}

/** "1 September 2027", the year left out when it is this one. */
export function longDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return d + ' ' + monthName(m - 1) + (today().slice(0, 4) === String(y) ? '' : ' ' + y);
}

/** As the mockup writes durations: 200 -> "3 h 20 m", 485 -> "8 h 05 m", 45 -> "45 m", 480 -> "8 h", 0 -> "0 h". */
export function span(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (total === 0) return '0 h';
  if (h === 0) return m + ' m';
  return m === 0 ? h + ' h' : h + ' h ' + String(m).padStart(2, '0') + ' m';
}

/** Whole hours for large totals: 24720 -> "412 h". */
export function hours(minutes: number): string {
  return Math.round(minutes / 60).toLocaleString('en-GB') + ' h';
}

/**
 * "30 Days of Python (Asabeneh Yetayeh)" -> "30 Days of Python": the parenthetical is detail for the sheet.
 * "Finish a small game (2 of 3): a different genre" -> "Finish a small game: a different genre".
 */
export function shortTitle(title: string): string {
  const short = title
    .replace(/\s*\(\d+ of \d+\)/, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
  return short || title;
}

/** What a list calls an item: its short name if it has one, else its title without the parenthetical detail. */
export function nameOf(item: { title: string; short?: string }): string {
  return item.short ?? shortTitle(item.title);
}

/** "Finish a small game (1 of 3)" -> "part 1 of 3"; null for titles without a part number. */
export function partOf(title: string): string | null {
  const match = title.match(/\((\d+) of (\d+)\)/);
  return match ? 'part ' + match[1] + ' of ' + match[2] : null;
}

/** "Module 6: Decision trees" -> "module 6, decision trees"; a unit without a numbered prefix keeps its title. */
export function unitDetail(title: string): string {
  const colon = title.indexOf(':');
  if (colon < 0) return title;
  const head = unitShort(title.slice(0, colon + 1));
  const rest = title.slice(colon + 1).trim();
  return rest ? head + ', ' + rest.charAt(0).toLowerCase() + rest.slice(1) : head;
}

/** "Day 19: Introduction" -> "day 19"; a unit without a numbered prefix keeps its title. */
export function unitShort(title: string): string {
  const head = title.split(':')[0]!.trim();
  return /\d/.test(head) && head.length <= 20 ? head.charAt(0).toLowerCase() + head.slice(1) : title;
}

/** "Gamedev / Graphics / Simulation" -> "Gamedev"; "Math & physics" -> "Math"; "Core track" -> "Core". */
export function blockShort(name: string): string {
  return name.trim().split(/[\s/&]+/)[0] || name;
}

export function plural(n: number, one: string, many = one + 's'): string {
  return n + ' ' + (n === 1 ? one : many);
}
