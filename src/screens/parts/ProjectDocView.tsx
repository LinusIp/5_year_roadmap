import { useEffect, useState } from 'react';
import { DOC_SECTIONS, parseDoc, readmeSkeleton } from '../../lib/project-doc.ts';
import type { ProjectDoc } from '../../lib/project-doc.ts';
import { Markdown } from '../../lib/markdown.tsx';
import { loadDoc } from '../../seed/index.ts';
import type { AppSeed } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { Checklist } from './Checklist.tsx';

/** Sections shown as text; Milestones become checkboxes and References become rows. Parts and budget is shown in the
 * sheet's own Parts and budget section, next to the budget fields. */
const PROSE = DOC_SECTIONS.filter((s) => s !== 'Milestones' && s !== 'References' && s !== 'Parts and budget');

/** A project's tech doc, parsed; undefined while it loads, null when the project has none. */
export function useProjectDoc(projectId: string): ProjectDoc | null | undefined {
  const [doc, setDoc] = useState<{ id: string; doc: ProjectDoc | null } | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void loadDoc(projectId).then((md) => live && setDoc({ id: projectId, doc: md ? parseDoc(md).doc : null }));
    return () => {
      live = false;
    };
  }, [projectId]);
  return doc?.id === projectId ? doc.doc : undefined;
}

/**
 * A project's tech doc (data/projects/docs/<id>.md) in its sheet: every section of the template, the milestones as
 * checkboxes that count toward the project's progress, the references as rows, and "Copy as README skeleton".
 */
export function ProjectDocView({ seed, projectId, doc, done }: { seed: AppSeed; projectId: string; doc: ProjectDoc | null | undefined; done: string[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  if (doc === undefined) return <p className="text-meta text-ink2">Loading the tech doc…</p>;
  if (doc === null) return null;

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(readmeSkeleton(doc));
      setCopied('Copied. Paste it into the README of the repository.');
    } catch {
      setCopied('Could not reach the clipboard. Allow it for this site and try again.');
    }
  };
  const total = doc.milestones.reduce((s, m) => s + m.hours, 0);
  const titleOf = (id: string): { title: string; kind: string; to?: string } => {
    const r = seed.resources.find((x) => x.id === id);
    if (r) return { title: r.title, kind: r.provider ?? 'Resource', to: '/library/' + id };
    const p = seed.projects.find((x) => x.id === id);
    if (p) return { title: p.title, kind: 'Project', to: '/library/' + id };
    const paper = seed.papers.find((x) => x.id === id);
    if (paper) return { title: paper.title, kind: 'Paper' + (paper.year ? ' · ' + paper.year : '') };
    return { title: id, kind: 'Reference' };
  };

  return (
    <section aria-labelledby={'doc-' + projectId} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={'doc-' + projectId} className="section-label mb-0">
          Tech doc
        </h3>
        <Button size="sm" onClick={() => void copy()}>
          Copy as README skeleton
        </Button>
      </div>
      {copied && (
        <p role="status" className="text-meta text-ink2">
          {copied}
        </p>
      )}
      {PROSE.slice(0, PROSE.indexOf('Done when')).map((s) =>
        doc.sections[s] ? (
          <div key={s}>
            <h3 className="section-label">{s}</h3>
            <Markdown source={doc.sections[s]!} className="doc-text text-body" />
          </div>
        ) : null,
      )}
      <Checklist label={'Milestones · ' + total + ' h'} refId={projectId} units={doc.milestones.map((m, i) => ({ id: m.id, title: i + 1 + '. ' + m.title + ' (' + m.hours + ' h)' }))} done={done} />
      {PROSE.slice(PROSE.indexOf('Done when')).map((s) =>
        doc.sections[s] ? (
          <div key={s}>
            <h3 className="section-label">{s}</h3>
            <Markdown source={doc.sections[s]!} className="doc-text text-body" />
          </div>
        ) : null,
      )}
      {doc.references.length > 0 && (
        <RowList label="References">
          {doc.references.map((id) => {
            const ref = titleOf(id);
            return <Row key={id} title={ref.title} meta={ref.kind} to={ref.to} />;
          })}
        </RowList>
      )}
    </section>
  );
}
