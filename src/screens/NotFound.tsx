import { Button } from '../ui/Button.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { Header } from '../ui/Header.tsx';
import { Screen } from '../ui/Screen.tsx';

export function NotFound({ path }: { path: string }) {
  return (
    <Screen title="Not found">
      <Header title="Not found" />
      <EmptyState action={<Button to="/">Go to Today</Button>}>Nothing lives at {path}.</EmptyState>
    </Screen>
  );
}
