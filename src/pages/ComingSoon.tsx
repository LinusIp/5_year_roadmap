import { EmptyState, Page } from '../components/Page.tsx';
import type { IconName } from '../components/Icon.tsx';

interface ComingSoonProps {
  title: string;
  lead: string;
  icon: IconName;
  milestone: number;
}

/** Placeholder used while the build is still walking through its milestones (see PROGRESS.md). */
export function ComingSoon({ title, lead, icon, milestone }: ComingSoonProps) {
  return (
    <Page title={title} lead={lead}>
      <EmptyState icon={icon} title={'Built in milestone ' + milestone}>
        The scaffold, data pipeline and storage are in place. This page is next on the list in PROGRESS.md.
      </EmptyState>
    </Page>
  );
}
