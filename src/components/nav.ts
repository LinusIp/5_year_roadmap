import type { IconName } from './Icon.tsx';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  /** Shown in the bottom bar on small screens; the rest sit behind "More". */
  primary: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Today', icon: 'today', primary: true },
  { to: '/activity', label: 'Activity', icon: 'activity', primary: true },
  { to: '/roadmap', label: 'Roadmap', icon: 'roadmap', primary: true },
  { to: '/projects', label: 'Projects', icon: 'projects', primary: true },
  { to: '/library', label: 'Library', icon: 'library', primary: false },
  { to: '/papers', label: 'Papers', icon: 'papers', primary: false },
  { to: '/certs', label: 'Certifications', icon: 'certs', primary: false },
  { to: '/reviews', label: 'Reviews', icon: 'reviews', primary: false },
  { to: '/stats', label: 'Stats', icon: 'stats', primary: false },
  { to: '/settings', label: 'Settings', icon: 'settings', primary: false },
];
