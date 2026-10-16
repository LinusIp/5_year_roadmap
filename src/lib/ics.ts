/**
 * "Add to my calendar": the next four weeks of blocks as an .ics file, one event per block per day, at the times
 * Calendar shows. Times are floating (no time zone), so a calendar app places them at the same clock time where
 * the file is opened, as Atlas does. Busy events are left out: they came from the user's calendar to begin with.
 *
 * Pure.
 */
import { addDays } from './dates.ts';
import type { IsoDate } from './dates.ts';

export interface IcsEvent {
  date: IsoDate;
  /** Minutes since midnight. */
  start: number;
  minutes: number;
  title: string;
  description?: string;
  uid: string;
}

/** RFC 5545 text: backslashes, semicolons, commas and newlines escaped. */
function escape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Lines longer than 75 octets fold onto continuation lines that start with a space. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  for (const ch of line) {
    if (new TextEncoder().encode(current + ch).length > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = '';
    }
    current += ch;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

/** 2026-10-20 at 570 -> 20261020T093000; past midnight rolls to the next date. */
function local(date: IsoDate, minutes: number): string {
  const day = addDays(date, Math.floor(minutes / 1440));
  const m = ((minutes % 1440) + 1440) % 1440;
  return day.replace(/-/g, '') + 'T' + String(Math.floor(m / 60)).padStart(2, '0') + String(m % 60).padStart(2, '0') + '00';
}

function utcStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function buildIcs(events: readonly IcsEvent[], now: Date = new Date()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Atlas//Calendar export//EN', 'CALSCALE:GREGORIAN'];
  const stamp = utcStamp(now);
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      'UID:' + e.uid,
      'DTSTAMP:' + stamp,
      'DTSTART:' + local(e.date, e.start),
      'DTEND:' + local(e.date, e.start + e.minutes),
      'SUMMARY:' + escape(e.title),
      ...(e.description ? ['DESCRIPTION:' + escape(e.description)] : []),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
