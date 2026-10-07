import { useState } from 'react';
import { editCertState, editMilestoneState, setCertStatus, setMilestoneStatus } from '../../db/credentials.ts';
import type { CertState, CertStatus, MilestoneState, MilestoneStatus } from '../../db/types.ts';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { credentialRows, describeQuarter, expiryWarnings } from '../../lib/credentials.ts';
import type { MilestoneView, SubjectRow } from '../../lib/credentials.ts';
import { today } from '../../lib/dates.ts';
import { useQueryParam } from '../../router/router.tsx';
import { Button } from '../../ui/Button.tsx';
import { Chips } from '../../ui/Chips.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { LinkField } from '../parts/ItemSheet.tsx';
import { StatusPill } from '../parts/StatusPill.tsx';
import { plural, shortTitle } from '../parts/text.ts';

const CERT_STATUSES: { value: CertStatus; label: string }[] = [
  { value: 'investigating', label: 'Investigating' },
  { value: 'planned', label: 'Planned' },
  { value: 'studying', label: 'Studying' },
  { value: 'scheduled', label: 'Exam booked' },
  { value: 'earned', label: 'Earned' },
  { value: 'skipped', label: 'Skipped' },
];
const MILESTONE_STATUSES: { value: MilestoneStatus; label: string }[] = [
  { value: 'todo', label: 'Not started' },
  { value: 'active', label: 'In progress' },
  { value: 'done', label: 'Done' },
];
const MODE_LABEL = { committed: 'On the plan', optional: 'Optional', investigate: 'Check eligibility first' } as const;

type CertRow = SubjectRow['certs'][number];

/** Sets an optional text field, or removes it when empty, so empty strings never get stored. */
function withField<T extends object, K extends keyof T>(state: T, key: K, value: string): T {
  const next = { ...state };
  if (value.trim()) next[key] = value.trim() as T[K];
  else delete next[key];
  return next;
}

/** A text field that saves on blur only when `valid` accepts it. */
function CheckedField({ label, value, valid, problem, hint, onSave }: { label: string; value: string; valid: (v: string) => boolean; problem: string; hint?: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value;
  const bad = draft !== null && text.trim() !== '' && !valid(text.trim());
  return (
    <TextField
      label={label}
      value={text}
      onChange={setDraft}
      error={bad ? problem : null}
      hint={hint}
      onBlur={() => {
        if (draft === null || bad) return;
        onSave(draft.trim());
        setDraft(null);
      }}
    />
  );
}

function CertSheet({ atlas, cert, onClose }: { atlas: Atlas; cert: CertRow | null; onClose: () => void }) {
  return (
    <Sheet open={cert !== null} title={cert?.title ?? ''} onClose={onClose}>
      {cert && (
        <div key={cert.id} className="space-y-5">
          <div>
            <p className="text-meta text-ink2">{[cert.vendor, MODE_LABEL[cert.mode], cert.cost ?? 'Price not published'].join(' · ')}</p>
            {cert.notes && <p className="mt-2 text-body text-ink2">{cert.notes}</p>}
            <div className="mt-4 flex items-center gap-2">
              {cert.url && (
                <Button href={cert.url} icon="external">
                  Exam page
                </Button>
              )}
              <span className="ml-auto">
                <StatusPill label={'Status of ' + cert.title} value={cert.status} options={CERT_STATUSES} onChange={(s) => void setCertStatus(cert.id, s)} done="earned" />
              </span>
            </div>
          </div>
          <CheckedField
            label="Target quarter"
            value={cert.state?.targetQuarter ?? cert.targetQuarter}
            valid={(v) => /^20\d{2}-Q[1-4]$/.test(v)}
            problem="Write it like 2027-Q3."
            hint={describeQuarter(cert.state?.targetQuarter ?? cert.targetQuarter)}
            onSave={(v) => v && void editCertState(cert.id, (s: CertState) => ({ ...s, targetQuarter: v }))}
          />
          {cert.status === 'earned' && (
            <>
              <LinkField label="Credential link" value={cert.state?.credentialUrl} onSave={(v) => void editCertState(cert.id, (s) => withField(s, 'credentialUrl', v))} />
              <CheckedField
                label="Expires on"
                value={cert.state?.expiresAt ?? ''}
                valid={(v) => /^\d{4}-\d{2}-\d{2}$/.test(v)}
                problem="Write the date like 2029-06-30."
                hint={cert.validityYears ? 'Valid for ' + plural(cert.validityYears, 'year') + ' from the day you earned it.' : undefined}
                onSave={(v) => void editCertState(cert.id, (s) => withField(s, 'expiresAt', v))}
              />
            </>
          )}
          {cert.prepResources.length > 0 && (
            <RowList label="Prepare with">
              {cert.prepResources.map((id) => (
                <Row key={id} title={shortTitle(atlas.seed.resources.find((r) => r.id === id)?.title ?? id)} to={'/library/' + id} />
              ))}
            </RowList>
          )}
          {cert.lastVerified && <p className="text-meta text-ink2">Name, price and availability checked {cert.lastVerified}.</p>}
        </div>
      )}
    </Sheet>
  );
}

function MilestoneSheet({ milestone, subject, onClose, onOpenItem }: { milestone: MilestoneView | null; subject: string; onClose: () => void; onOpenItem: (id: string) => void }) {
  return (
    <Sheet open={milestone !== null} title={milestone?.title ?? ''} onClose={onClose}>
      {milestone && (
        <div key={milestone.id} className="space-y-5">
          <div className="flex items-center gap-2">
            <p className="text-meta text-ink2">{subject + (milestone.derived ? ' · status from its projects' : '')}</p>
            <span className="ml-auto">
              <StatusPill label={'Status of ' + milestone.title} value={milestone.status} options={MILESTONE_STATUSES} onChange={(s) => void setMilestoneStatus(milestone.id, s)} />
            </span>
          </div>
          {milestone.projects.length > 0 && (
            <RowList label="Projects that make it">
              {milestone.projects.map((p) => (
                <Row key={p.id} title={shortTitle(p.title)} meta={p.done ? 'Shipped' : 'Not shipped yet'} onClick={() => onOpenItem(p.id)} />
              ))}
            </RowList>
          )}
          <LinkField label="Repo or demo link" value={milestone.url} onSave={(v) => void editMilestoneState(milestone.id, (s: MilestoneState) => withField(s, 'url', v))} />
        </div>
      )}
    </Sheet>
  );
}

/**
 * Credentials: every subject ends in a certificate, a portfolio milestone, or both. Certificates and milestones
 * are two lists with status pills; a subject from the Library narrows both.
 */
export function CredentialsView({
  atlas,
  certStates,
  milestoneStates,
  onOpenItem,
}: {
  atlas: Atlas;
  certStates: Map<string, CertState>;
  milestoneStates: Map<string, MilestoneState>;
  onOpenItem: (id: string) => void;
}) {
  const [subjectId, setSubject] = useQueryParam('subject');
  const [year, setYear] = useQueryParam('year');
  const [certId, setCertId] = useQueryParam('cert');
  const [milestoneId, setMilestoneId] = useQueryParam('milestone');
  const rows = credentialRows(atlas.seed, certStates, milestoneStates, atlas.states);
  const subject = rows.find((r) => r.subject.id === subjectId)?.subject;
  const inScope = subject ? rows.filter((r) => r.subject.id === subject.id) : rows;
  const allCerts = rows.flatMap((r) => r.certs);
  const certs = inScope
    .flatMap((r) => r.certs)
    .filter((c) => !year || String(c.targetYear) === year)
    .sort((a, b) => (a.state?.targetQuarter ?? a.targetQuarter).localeCompare(b.state?.targetQuarter ?? b.targetQuarter));
  const milestones = inScope.flatMap((r) => r.milestones.map((m) => ({ m, subject: r.subject.title })));
  const allMilestones = rows.flatMap((r) => r.milestones);
  const warnings = expiryWarnings(atlas.seed.certs, certStates, today());
  const openCert = certId ? (allCerts.find((c) => c.id === certId) ?? null) : null;
  const openMilestone = milestoneId ? (milestones.find((x) => x.m.id === milestoneId) ?? rows.flatMap((r) => r.milestones.map((m) => ({ m, subject: r.subject.title }))).find((x) => x.m.id === milestoneId)) : undefined;

  return (
    <div className="space-y-5">
      <p className="text-meta text-ink2">
        {allCerts.filter((c) => c.status === 'earned').length} of {plural(allCerts.filter((c) => c.mode === 'committed').length, 'certificate')} earned ·{' '}
        {allMilestones.filter((m) => m.status === 'done').length} of {plural(allMilestones.length, 'milestone')} done
      </p>

      {warnings.length > 0 && (
        <RowList label="Renewal due">
          {warnings.map((w) => (
            <Row key={w.certId} title={w.title} meta={(w.daysLeft < 0 ? 'Expired ' + -w.daysLeft + ' days ago' : 'Expires in ' + w.daysLeft + ' days') + ' · ' + w.expiresAt} onClick={() => setCertId(w.certId, { replace: false })} />
          ))}
        </RowList>
      )}

      <Chips
        label="Filter"
        items={[
          ...(subject ? [{ key: 'subject', label: subject.title, pressed: true, onClick: () => setSubject(null) }] : []),
          ...[1, 2, 3, 4, 5].map((y) => ({ key: 'y' + y, label: 'Year ' + y, pressed: year === String(y), onClick: () => setYear(year === String(y) ? null : String(y)) })),
        ]}
      />

      <RowList label="Certificates">
        {certs.map((cert) => (
          <Row
            key={cert.id}
            title={cert.title}
            meta={[cert.vendor, describeQuarter(cert.state?.targetQuarter ?? cert.targetQuarter), cert.mode === 'committed' ? null : MODE_LABEL[cert.mode]].filter(Boolean).join(' · ')}
            onClick={() => setCertId(cert.id, { replace: false })}
            action={<StatusPill label={'Status of ' + cert.title} value={cert.status} options={CERT_STATUSES} onChange={(s) => void setCertStatus(cert.id, s)} done="earned" />}
          />
        ))}
        {certs.length === 0 && <li className="py-3 text-meta text-ink2">{subject?.certNote ?? 'No certificate in this view.'}</li>}
      </RowList>

      {!year && (
        <RowList label="Portfolio milestones">
          {milestones.map(({ m, subject: subjectTitle }) => (
            <Row
              key={m.id}
              title={m.title}
              meta={subjectTitle + (m.projects.length ? ' · ' + m.projects.filter((p) => p.done).length + ' of ' + plural(m.projects.length, 'project') + ' shipped' : '')}
              onClick={() => setMilestoneId(m.id, { replace: false })}
              action={<StatusPill label={'Status of ' + m.title} value={m.status} options={MILESTONE_STATUSES} onChange={(s) => void setMilestoneStatus(m.id, s)} />}
            />
          ))}
        </RowList>
      )}

      <CertSheet atlas={atlas} cert={openCert} onClose={() => setCertId(null)} />
      <MilestoneSheet milestone={openMilestone?.m ?? null} subject={openMilestone?.subject ?? ''} onClose={() => setMilestoneId(null)} onOpenItem={onOpenItem} />
    </div>
  );
}
