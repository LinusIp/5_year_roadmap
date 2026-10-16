import { useEffect, useState } from 'react';
import { parseDoc, readmeSkeleton } from '../../lib/project-doc.ts';
import type { DOC_SECTIONS } from '../../lib/project-doc.ts';
import type { ProjectDoc } from '../../lib/project-doc.ts';
import { Markdown } from '../../lib/markdown.tsx';
import { loadDoc } from '../../seed/index.ts';
import type { AppSeed, Project } from '../../seed/schema.ts';
import { Row, RowList } from '../../ui/Row.tsx';
import { criteriaUnits } from './Checklist.tsx';
import type { TechDocModel } from './TechDoc.tsx';

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

/** A reference id as a row: a resource, a project or a paper. */
function referenceOf(seed: AppSeed, id: string): { title: string; kind: string; to?: string } {
  const r = seed.resources.find((x) => x.id === id);
  if (r) return { title: r.title, kind: r.provider ?? 'Resource', to: '/library/' + id };
  const p = seed.projects.find((x) => x.id === id);
  if (p) return { title: p.title, kind: 'Project', to: '/library/' + id };
  const paper = seed.papers.find((x) => x.id === id);
  if (paper) return { title: paper.title, kind: 'Paper' + (paper.year ? ' · ' + paper.year : '') };
  return { title: id, kind: 'Reference' };
}

/** Plain text of a short Markdown section: the situation's numbers are stressed by the doc itself. */
function plain(md: string): string {
  return md.replace(/\*\*|`/g, '').replace(/\s+/g, ' ').trim();
}

const md = (source: string | undefined) => (source ? <Markdown source={source} className="doc-text text-body text-ink2" /> : undefined);

/**
 * A plan project's tech doc (data/projects/docs/<id>.md) in the redesigned sheet. Its Markdown keeps Goal, Why,
 * Scope, Stack, Milestones, Done when, Measure and report, Pitfalls, References and Write-up; the Architecture
 * section is replaced by the project's design (data/projects/design/<id>.yaml), which says the same in fields the
 * diagram and the step list are drawn from. Parts and budget stays in the sheet's own section, by the budget fields.
 */
export function planDocModel({ seed, project, doc, meta }: { seed: AppSeed; project: Pick<Project, 'id' | 'title' | 'brief' | 'acceptance'>; doc: ProjectDoc; meta: string }): TechDocModel {
  const extra = (title: string, section: (typeof DOC_SECTIONS)[number], as = title) => (doc.sections[section] ? [{ title: as, body: md(doc.sections[section]) }] : []);
  return {
    id: project.id,
    title: project.title,
    meta,
    light: false,
    situation: plain(doc.sections.Goal ?? project.brief),
    overviewMore: [...extra('Why', 'Why'), ...extra('Scope', 'Scope')],
    designMore: extra('Stack', 'Stack'),
    steps: { label: 'Milestones', units: doc.milestones.map((m) => ({ id: m.id, title: m.title, hours: m.hours })), hours: doc.milestones.reduce((sum, m) => sum + m.hours, 0) },
    buildMore: extra('Pitfalls', 'Pitfalls'),
    doneWhen: criteriaUnits(project.acceptance),
    checksMore: [...extra('Done when, in detail', 'Done when'), ...extra('Measure', 'Measure and report'), ...extra('Write-up', 'Write-up')],
    stretch: [],
    related:
      doc.references.length > 0 ? (
        <RowList label="References">
          {doc.references.map((id) => {
            const ref = referenceOf(seed, id);
            return <Row key={id} title={ref.title} meta={ref.kind} to={ref.to} />;
          })}
        </RowList>
      ) : undefined,
    readme: () => readmeSkeleton(doc),
  };
}
