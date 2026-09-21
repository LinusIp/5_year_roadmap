import type { ReactNode } from 'react';

/** A small hand-drawn icon set: 24x24, 1.75 stroke, round joins. Decorative by default (aria-hidden). */
const ICONS = {
  today: (<><rect x="3" y="4.5" width="18" height="16.5" rx="2.5" /><path d="M8 2.5v4M16 2.5v4M3 10h18" /><circle cx="12" cy="15.5" r="1.6" fill="currentColor" stroke="none" /></>),
  activity: (<><rect x="3" y="3" width="4.5" height="4.5" rx="1" /><rect x="9.75" y="3" width="4.5" height="4.5" rx="1" /><rect x="16.5" y="3" width="4.5" height="4.5" rx="1" /><rect x="3" y="9.75" width="4.5" height="4.5" rx="1" /><rect x="9.75" y="9.75" width="4.5" height="4.5" rx="1" fill="currentColor" /><rect x="16.5" y="9.75" width="4.5" height="4.5" rx="1" /><rect x="3" y="16.5" width="4.5" height="4.5" rx="1" /><rect x="9.75" y="16.5" width="4.5" height="4.5" rx="1" /><rect x="16.5" y="16.5" width="4.5" height="4.5" rx="1" fill="currentColor" /></>),
  roadmap: (<><circle cx="6" cy="19" r="2.2" /><circle cx="18" cy="5" r="2.2" /><path d="M8.2 19h6.3a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7h6.3" /></>),
  library: (<><path d="M12 7v13.5" /><path d="M3 5.5a1 1 0 0 1 1-1h4a4 4 0 0 1 4 4 4 4 0 0 1 4-4h4a1 1 0 0 1 1 1V17a1 1 0 0 1-1 1h-5a3 3 0 0 0-3 2.5A3 3 0 0 0 9 18H4a1 1 0 0 1-1-1z" /></>),
  projects: (<><path d="M12 3 3.5 7.5v9L12 21l8.5-4.5v-9z" /><path d="m3.5 7.5 8.5 4.5 8.5-4.5M12 12v9" /></>),
  papers: (<><path d="M14 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-12z" /><path d="M14 2.5v5h5M9 13h6M9 17h6M9 9h2" /></>),
  certs: (<><circle cx="12" cy="9" r="6" /><path d="m8.5 14 -1.5 7.5 5-3 5 3-1.5-7.5" /></>),
  reviews: (<><rect x="8.5" y="2.5" width="7" height="4" rx="1" /><path d="M15.5 4.5H17a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h1.5" /><path d="m9 14 2.2 2.2L15.5 12" /></>),
  stats: (<><path d="M3 20.5h18" /><path d="M6.5 20.5v-7M12 20.5V4.5M17.5 20.5v-11" /></>),
  settings: (<><path d="M4 6h9M19 6h1M4 12h1M11 12h9M4 18h9M19 18h1" /><circle cx="16" cy="6" r="2.4" /><circle cx="8" cy="12" r="2.4" /><circle cx="16" cy="18" r="2.4" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="m20.5 20.5-4.6-4.6" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  play: <path d="M7 4.5v15l12-7.5z" fill="currentColor" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronUp: <path d="m6 15 6-6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  external: (<><path d="M14.5 3.5h6v6M20.5 3.5l-10 10" /><path d="M18 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5.2l3.2 2" /></>),
  flame: <path d="M12 2.5c.8 3.4 5.5 5.6 5.5 10.6a5.5 5.5 0 0 1-11 0c0-1.8.7-3.2 1.8-4.4.3 1.5 1 2.4 2 2.9-.6-3.2.1-6.6 1.7-9.1z" />,
  snowflake: <path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />,
  grip: (<><circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none" /><circle cx="15" cy="6" r="1.4" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="9" cy="18" r="1.4" fill="currentColor" stroke="none" /><circle cx="15" cy="18" r="1.4" fill="currentColor" stroke="none" /></>),
  arrowUp: <path d="M12 19.5V4.5M5.5 11 12 4.5 18.5 11" />,
  arrowDown: <path d="M12 4.5v15M5.5 13l6.5 6.5 6.5-6.5" />,
  arrowRight: <path d="M4.5 12h15M13 5.5l6.5 6.5-6.5 6.5" />,
  download: <path d="M12 3.5v12M6.5 10.5l5.5 5.5 5.5-5.5M4.5 20.5h15" />,
  upload: <path d="M12 16V4M6.5 9.5 12 4l5.5 5.5M4.5 20.5h15" />,
  trash: (<><path d="M3.5 6.5h17M9 6.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2.5" /><path d="m5.5 6.5 1 13a2 2 0 0 0 2 1.8h7a2 2 0 0 0 2-1.8l1-13M10 11v6M14 11v6" /></>),
  edit: (<><path d="M4 20h4.2L19.5 8.7a1.5 1.5 0 0 0 0-2.1l-2.1-2.1a1.5 1.5 0 0 0-2.1 0L4 15.8z" /><path d="m13.5 6.5 4 4" /></>),
  moon: <path d="M20 14.3A8.5 8.5 0 1 1 9.7 4a6.8 6.8 0 0 0 10.3 10.3z" />,
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>),
  link: (<><path d="M10 14a4 4 0 0 0 5.7 0l3.1-3.1a4 4 0 0 0-5.7-5.7l-1.1 1.1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3.1 3.1a4 4 0 0 0 5.7 5.7l1.1-1.1" /></>),
  alert: (<><path d="M12 3.5 2.5 20h19z" /><path d="M12 10v4.5M12 17.3v.2" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.7v.2" /></>),
  branch: (<><circle cx="6" cy="5.5" r="2.3" /><circle cx="6" cy="18.5" r="2.3" /><circle cx="18" cy="8" r="2.3" /><path d="M6 7.8v8.4M18 10.3c0 4.2-6.5 3-9.7 6.2" /></>),
  filter: <path d="M3.5 5h17l-6.5 8v6l-4 1.5V13z" />,
  more: (<><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" /></>),
  target: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></>),
  lock: (<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7.5a4 4 0 0 1 8 0V11" /></>),
  shuffle: <path d="M16 3.5h4.5V8M4 20 20.5 3.5M20.5 16v4.5H16M15 15l5.5 5.5M4 4l5 5" />,
  refresh: (<><path d="M3.5 12a8.5 8.5 0 0 1 14.7-5.8L20.5 8.5" /><path d="M20.5 3.5v5h-5M20.5 12a8.5 8.5 0 0 1-14.7 5.8L3.5 15.5" /><path d="M3.5 20.5v-5h5" /></>),
  menu: <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  keyboard: (<><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M6.5 14h.01M17.5 14h.01M9.5 14h5" /></>),
  calendar: (<><rect x="3" y="4.5" width="18" height="16.5" rx="2.5" /><path d="M8 2.5v4M16 2.5v4M3 10h18" /></>),
  note: (<><path d="M5 4.5h14a1 1 0 0 1 1 1V15l-5.5 5.5H5a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1z" /><path d="M20 15h-4.5a1 1 0 0 0-1 1v4.5" /></>),
  bolt: <path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  /** Provide a label only when the icon stands alone without visible text. */
  label?: string;
}

export function Icon({ name, size = 18, className, label }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      {ICONS[name]}
    </svg>
  );
}
