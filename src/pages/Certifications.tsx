import { useState } from 'react';
import { Icon } from '../components/Icon.tsx';
import { Page } from '../components/Page.tsx';
import { editCertState, editMilestoneState, setCertStatus, setMilestoneStatus, useCertStates, useMilestoneStates } from '../db/credentials.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { credentialRows, describeQuarter, expiryWarnings } from '../lib/credentials.ts';
import type { SubjectRow } from '../lib/credentials.ts';
import { today as todayDate } from '../lib/dates.ts';
import { isHttpUrl } from '../seed/schema.ts';
import type { CertStatus, MilestoneStatus } from '../db/types.ts';
import { Link, useQueryParam } from '../router/router.tsx';

const CERT_STATUS: Record<CertStatus, string> = {
  investigating: 'Investigating',
  planned: 'Planned',
  studying: 'Studying',
  scheduled: 'Exam booked',
  earned: 'Earned',
  skipped: 'Skipped',
};
const MILESTONE_STATUS: Record<MilestoneStatus, string> = { todo: 'Not started', active: 'In progress', done: 'Done' };
const MODE_LABEL = { committed: 'On the plan', optional: 'Optional', investigate: 'Check eligibility first' } as const;

function tone(status: CertStatus | MilestoneStatus): string {
  if (status === 'earned' || status === 'done') return 'text-good-text border-good/40';
  if (status === 'studying' || status === 'scheduled' || status === 'active') return 'text-accent-text border-accent/40';
  if (status === 'skipped') return 'text-ink-3 border-line line-through';
  if (status === 'investigating') return 'text-warning-text border-warning/50';
  return 'text-ink-2 border-line';
}

/** Sets an optional text field, or removes it when the value is empty, so empty strings never get stored. */
function withField<T extends object, K extends keyof T>(state: T, key: K, value: string): T {
  const next = { ...state };
  if (value.trim()) next[key] = value.trim() as T[K];
  else delete next[key];
  return next;
}

function LinkInput({ label, value, onSave }: { label: string; value: string | undefined; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value ?? '';
  const bad = text.trim() !== '' && !isHttpUrl(text.trim());
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="input"
        value={text}
        placeholder="https://…"
        aria-invalid={bad || undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== null && !bad) {
            onSave(draft.trim());
            setDraft(null);
          }
        }}
      />
      {bad && <span className="mt-1 block text-xs text-critical-text">Use the full address, starting with https://</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ cards */

function CertCard({ cert, onOpenPrep }: { cert: SubjectRow['certs'][number]; onOpenPrep: (id: string) => string }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="card flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-ink-3">{cert.vendor}</p>
          <h3 className="mt-0.5 font-medium leading-snug">{cert.title}</h3>
        </div>
        <span className={'chip shrink-0 ' + tone(cert.status)}>{CERT_STATUS[cert.status]}</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-ink-3">Target</dt>
          <dd className="num">{describeQuarter(cert.state?.targetQuarter ?? cert.targetQuarter)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-3">Cost</dt>
          <dd>{cert.cost ?? <span className="text-ink-3">Not published</span>}</dd>
        </div>
      </dl>
      <p className="mt-2">
        <span className={'chip ' + (cert.mode === 'investigate' ? 'border-warning/50 text-warning-text' : '')}>{MODE_LABEL[cert.mode]}</span>
      </p>
      {cert.notes && <p className="mt-2 text-xs leading-relaxed text-ink-2">{cert.notes}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
        {cert.url ? (
          <a href={cert.url} target="_blank" rel="noreferrer noopener" className="btn btn-sm">
            <Icon name="external" size={13} />
            Exam page
          </a>
        ) : (
          <span className="chip border-warning/50 text-warning-text">find link</span>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? 'Less' : 'Track it'}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-line pt-3">
          <label className="block">
            <span className="label">Status</span>
            <select className="input" value={cert.status} onChange={(e) => void setCertStatus(cert.id, e.target.value as CertStatus)}>
              {(Object.keys(CERT_STATUS) as CertStatus[]).map((s) => (
                <option key={s} value={s}>
                  {CERT_STATUS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Target quarter</span>
            <input
              className="input num"
              defaultValue={cert.state?.targetQuarter ?? cert.targetQuarter}
              pattern="20[0-9][0-9]-Q[1-4]"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (/^20\d{2}-Q[1-4]$/.test(v)) void editCertState(cert.id, (s) => ({ ...s, targetQuarter: v }));
              }}
            />
          </label>
          {cert.status === 'earned' && (
            <>
              <LinkInput label="Credential link" value={cert.state?.credentialUrl} onSave={(v) => void editCertState(cert.id, (s) => withField(s, 'credentialUrl', v))} />
              <label className="block">
                <span className="label">Expires</span>
                <input
                  type="date"
                  className="input"
                  defaultValue={cert.state?.expiresAt ?? ''}
                  onBlur={(e) => void editCertState(cert.id, (s) => withField(s, 'expiresAt', e.target.value))}
                />
                {cert.validityYears && !cert.state?.expiresAt && (
                  <span className="mt-1 block text-xs text-ink-3">Valid for {cert.validityYears} years from the day you earned it.</span>
                )}
              </label>
            </>
          )}
          {cert.prepResources.length > 0 && (
            <div>
              <p className="label">Prepare with</p>
              <ul className="space-y-0.5 text-sm">
                {cert.prepResources.map((id) => (
                  <li key={id}>
                    <Link to={'/library/' + id} className="text-accent-text hover:underline">
                      {onOpenPrep(id)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cert.lastVerified && <p className="text-xs text-ink-3">Name, price and availability checked {cert.lastVerified}.</p>}
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ the credential map */

function MilestoneCell({ milestone }: { milestone: SubjectRow['milestones'][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-line p-2.5">
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="text-left text-sm leading-snug hover:text-accent-text" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {milestone.title}
        </button>
        <span className={'chip shrink-0 ' + tone(milestone.status)} title={milestone.derived ? 'Worked out from the projects below' : undefined}>
          {MILESTONE_STATUS[milestone.status]}
        </span>
      </div>
      {milestone.url && (
        <a href={milestone.url} target="_blank" rel="noreferrer noopener" className="mt-1 inline-flex items-center gap-1 text-xs text-accent-text hover:underline">
          <Icon name="external" size={11} />
          Repo or demo
        </a>
      )}
      {open && (
        <div className="mt-2 space-y-2 border-t border-line pt-2">
          {milestone.projects.length > 0 && (
            <ul className="space-y-0.5 text-xs">
              {milestone.projects.map((p) => (
                <li key={p.id} className="flex items-center gap-1.5">
                  <Icon name={p.done ? 'check' : 'target'} size={12} className={p.done ? 'text-good-text' : 'text-ink-3'} />
                  <Link to={'/library/' + p.id} className="hover:text-accent-text">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-1">
            {(['todo', 'active', 'done'] as const).map((s) => (
              <button key={s} type="button" className={'btn btn-sm' + (milestone.status === s && !milestone.derived ? ' btn-primary' : '')} onClick={() => void setMilestoneStatus(milestone.id, s)}>
                {MILESTONE_STATUS[s]}
              </button>
            ))}
          </div>
          <LinkInput label="Repo or demo link" value={milestone.url} onSave={(v) => void editMilestoneState(milestone.id, (s) => withField(s, 'url', v))} />
        </div>
      )}
    </div>
  );
}

function CredentialMap({ rows, highlight }: { rows: SubjectRow[]; highlight: string | null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] border-separate border-spacing-0 text-left">
        <caption className="sr-only">Every subject, its certificate and its portfolio milestone</caption>
        <thead>
          <tr className="text-xs text-ink-3">
            <th scope="col" className="border-b border-line px-3 py-2 font-medium">Subject</th>
            <th scope="col" className="border-b border-line px-3 py-2 font-medium">Certificate or exam</th>
            <th scope="col" className="border-b border-line px-3 py-2 font-medium">Portfolio milestone</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.subject.id} id={'subject-' + row.subject.id} className={'align-top' + (highlight === row.subject.id ? ' bg-accent-wash' : '')}>
              <th scope="row" className="border-b border-line px-3 py-3 text-sm font-medium">
                {row.subject.title}
                {row.plannedItems > 0 && <span className="num mt-0.5 block text-xs font-normal text-ink-3">{row.plannedItems} items on the roadmap</span>}
              </th>
              <td className="border-b border-line px-3 py-3">
                {row.certs.length === 0 ? (
                  <p className="text-sm text-ink-3">{row.subject.certNote ?? 'None'}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {row.certs.map((cert) => (
                      <li key={cert.id} className="flex items-start justify-between gap-2 text-sm">
                        <span>
                          {cert.title}
                          {cert.mode !== 'committed' && <span className="ml-1 text-xs text-ink-3">({MODE_LABEL[cert.mode].toLowerCase()})</span>}
                        </span>
                        <span className={'chip shrink-0 ' + tone(cert.status)}>{CERT_STATUS[cert.status]}</span>
                      </li>
                    ))}
                    {row.subject.certNote && <li className="text-xs text-ink-3">{row.subject.certNote}</li>}
                  </ul>
                )}
              </td>
              <td className="border-b border-line px-3 py-3">
                {row.milestones.length === 0 ? (
                  <p className="text-sm text-ink-3">Not needed for this row</p>
                ) : (
                  <div className="space-y-1.5">
                    {row.milestones.map((m) => (
                      <MilestoneCell key={m.id} milestone={m} />
                    ))}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Certifications() {
  const atlas = useAtlas();
  const certStates = useCertStates();
  const milestoneStates = useMilestoneStates();
  const [view, setView] = useQueryParam('view');
  const [subjectParam] = useQueryParam('subject');
  const [yearFilter, setYearFilter] = useQueryParam('year');

  if (!atlas || !certStates || !milestoneStates) {
    return (
      <Page title="Certifications">
        <p className="text-sm text-ink-3">Loading…</p>
      </Page>
    );
  }

  const rows = credentialRows(atlas.seed, certStates, milestoneStates, atlas.states);
  const showMap = view === 'map' || Boolean(subjectParam);
  const allCerts = rows.flatMap((r) => r.certs).sort((a, b) => a.targetQuarter.localeCompare(b.targetQuarter));
  const certs = yearFilter ? allCerts.filter((c) => String(c.targetYear) === yearFilter) : allCerts;
  const warnings = expiryWarnings(atlas.seed.certs, certStates, todayDate());
  const earned = allCerts.filter((c) => c.status === 'earned').length;
  const milestonesDone = rows.flatMap((r) => r.milestones).filter((m) => m.status === 'done').length;
  const milestonesTotal = rows.flatMap((r) => r.milestones).length;
  const titleOf = (id: string): string => atlas.seed.resources.find((r) => r.id === id)?.title ?? id;

  return (
    <Page
      title="Certifications"
      lead="Every subject ends in a certificate, a portfolio milestone, or both."
      actions={
        <div className="flex gap-1" role="tablist" aria-label="View">
          <button type="button" role="tab" aria-selected={!showMap} className={'btn btn-sm' + (!showMap ? ' btn-primary' : '')} onClick={() => setView(null)}>
            Cards
          </button>
          <button type="button" role="tab" aria-selected={showMap} className={'btn btn-sm' + (showMap ? ' btn-primary' : '')} onClick={() => setView('map')}>
            Credential map
          </button>
        </div>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="card px-3 py-2.5">
          <div className="eyebrow">Certificates earned</div>
          <div className="num mt-0.5 text-lg font-semibold">
            {earned} <span className="text-sm font-normal text-ink-3">of {allCerts.filter((c) => c.mode === 'committed').length} planned</span>
          </div>
        </div>
        <div className="card px-3 py-2.5">
          <div className="eyebrow">Milestones done</div>
          <div className="num mt-0.5 text-lg font-semibold">
            {milestonesDone} <span className="text-sm font-normal text-ink-3">of {milestonesTotal}</span>
          </div>
        </div>
        <div className="card px-3 py-2.5">
          <div className="eyebrow">Subjects</div>
          <div className="num mt-0.5 text-lg font-semibold">{rows.length}</div>
        </div>
        <div className="card px-3 py-2.5">
          <div className="eyebrow">Next exam</div>
          <div className="mt-0.5 truncate text-sm font-semibold">
            {allCerts.find((c) => c.status !== 'earned' && c.status !== 'skipped' && c.mode === 'committed')?.title ?? '—'}
          </div>
        </div>
      </div>

      {warnings.length > 0 && (
        <section className="mb-4 rounded-lg border border-warning/50 bg-warning/10 p-3" role="status">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-warning-text">
            <Icon name="alert" size={15} />
            Renewal due
          </h2>
          <ul className="mt-1 text-sm">
            {warnings.map((w) => (
              <li key={w.certId}>
                {w.title}: {w.daysLeft < 0 ? 'expired ' + -w.daysLeft + ' days ago' : 'expires in ' + w.daysLeft + ' days'} ({w.expiresAt})
              </li>
            ))}
          </ul>
        </section>
      )}

      {showMap ? (
        <section className="card p-2">
          <CredentialMap rows={rows} highlight={subjectParam} />
        </section>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-1">
            <button type="button" className={'btn btn-sm' + (!yearFilter ? ' btn-primary' : '')} onClick={() => setYearFilter(null)}>
              All years
            </button>
            {[1, 2, 3, 4, 5].map((y) => (
              <button key={y} type="button" className={'btn btn-sm' + (yearFilter === String(y) ? ' btn-primary' : '')} onClick={() => setYearFilter(String(y))}>
                Year {y}
              </button>
            ))}
          </div>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {certs.map((cert) => (
              <CertCard key={cert.id} cert={cert} onOpenPrep={titleOf} />
            ))}
          </ul>
        </>
      )}
    </Page>
  );
}
