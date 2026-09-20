import { EmptyState, Page } from '../components/Page.tsx';
import { Link } from '../router/router.tsx';

export function NotFound({ path }: { path: string }) {
  return (
    <Page title="Not found">
      <EmptyState icon="roadmap" title="This page is not on the map" action={<Link to="/" className="btn btn-primary">Go to Today</Link>}>
        Nothing lives at <code className="font-mono text-ink">{path}</code>.
      </EmptyState>
    </Page>
  );
}
