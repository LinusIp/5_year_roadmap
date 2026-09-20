import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon.tsx';
import type { IconName } from './Icon.tsx';

interface PageProps {
  title: string;
  /** One line under the title: what this page answers. */
  lead?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function Page({ title, lead, actions, children }: PageProps) {
  useEffect(() => {
    document.title = title + ' · Atlas';
  }, [title]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {lead && <p className="mt-1 max-w-2xl text-sm text-ink-2">{lead}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </>
  );
}

interface EmptyStateProps {
  icon: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-raised text-ink-2">
        <Icon name={icon} size={22} />
      </span>
      <h2 className="text-base font-semibold">{title}</h2>
      {children && <div className="mt-1 max-w-md text-sm text-ink-2">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
