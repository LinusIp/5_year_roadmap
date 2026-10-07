import { useState } from 'react';
import { Button } from '../ui/Button.tsx';
import { Chips } from '../ui/Chips.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { Header } from '../ui/Header.tsx';
import { Heatmap } from '../ui/Heatmap.tsx';
import type { HeatmapCell } from '../ui/Heatmap.tsx';
import { ProgressLine } from '../ui/ProgressLine.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { SegmentedControl } from '../ui/SegmentedControl.tsx';
import { Sheet } from '../ui/Sheet.tsx';
import { TextField } from '../ui/TextField.tsx';
import { layoutGrid } from '../lib/heatmap.ts';
import type { HeatLevel } from '../lib/streaks.ts';

function demoCells(): { cells: HeatmapCell[]; columns: number; months: ReturnType<typeof layoutGrid>['months'] } {
  const layout = layoutGrid('2027-01-01', '2027-12-31', 1);
  const cells = layout.slots.map((slot, i) => ({ ...slot, level: ((i * 7) % 11 > 6 ? (i * 3) % 5 : 0) as HeatLevel }));
  return { cells, columns: layout.columns, months: layout.months };
}

/**
 * Every component of the design system with its variants, at #/dev/components. Not linked from the app: it
 * is the place to check a change to a component before it reaches a screen.
 */
export function DevComponents() {
  const [chips, setChips] = useState<string[]>(['reading']);
  const [segment, setSegment] = useState<'timeline' | 'projects' | 'papers'>('timeline');
  const [text, setText] = useState('');
  const [filled, setFilled] = useState('Linear algebra');
  const [checked, setChecked] = useState(true);
  const [on, setOn] = useState(true);
  const [picked, setPicked] = useState('swe');
  const [sheet, setSheet] = useState(false);
  const grid = demoCells();

  return (
    <Screen title="Components">
      <Header title="Components" sub="Every part of the design system, in both themes." />

      <RowList label="Button" flat>
        <li className="flex flex-wrap gap-2 py-3">
          <Button variant="filled" icon="play">
            Start
          </Button>
          <Button>Log time</Button>
          <Button icon="check" label="Mark done" />
          <Button variant="icon" icon="gear" label="Settings" />
          <Button disabled>Disabled</Button>
        </li>
      </RowList>

      <RowList label="Row" className="mt-6">
        <Row title="30 Days of Python · day 19" meta="Languages · 0 m of 1 h" onClick={() => undefined} />
        <Row title="Lecture 3: Multiplication and inverse matrices" check={{ checked, onChange: setChecked }} />
        <Row title="Spend freezes automatically" toggle={{ on, onChange: setOn }} />
        <Row title="Vulkan Guide" meta="Graphics" edge="var(--track-graphics)" trailing="50 h" onClick={() => undefined} />
        {['swe', 'ai'].map((id) => (
          <Row key={id} title={id === 'swe' ? 'Software engineering' : 'AI and ML'} selected={picked === id} onClick={() => setPicked(id)} />
        ))}
      </RowList>

      <RowList label="ProgressLine" className="mt-6" flat>
        <li className="space-y-3 py-3">
          <ProgressLine value={0} label="Nothing yet" />
          <ProgressLine value={0.4} label="Forty percent" />
          <ProgressLine value={1} label="Done" />
        </li>
      </RowList>

      <RowList label="Chips" className="mt-6" flat>
        <li className="py-3">
          <Chips
            label="Status"
            items={[
              { key: 'queued', label: 'Queued', count: 42 },
              { key: 'reading', label: 'Reading', count: 1 },
              { key: 'read', label: 'Read', count: 0 },
            ].map((c) => ({
              ...c,
              pressed: chips.includes(c.key),
              onClick: () => setChips((all) => (all.includes(c.key) ? all.filter((k) => k !== c.key) : [...all, c.key])),
            }))}
          />
        </li>
      </RowList>

      <RowList label="SegmentedControl" className="mt-6" flat>
        <li className="py-3">
          <SegmentedControl
            label="View"
            value={segment}
            onChange={setSegment}
            options={[
              { value: 'timeline', label: 'Timeline' },
              { value: 'projects', label: 'Projects' },
              { value: 'papers', label: 'Papers' },
            ]}
          />
        </li>
      </RowList>

      <RowList label="TextField" className="mt-6" flat>
        <li className="space-y-3 py-3">
          <TextField label="Search the library" value={text} onChange={setText} type="search" />
          <TextField label="Title" value={filled} onChange={setFilled} />
          <TextField label="Minutes" value="0" onChange={() => undefined} type="numeric" error="Enter at least one minute." />
          <TextField label="Notes" value="" onChange={() => undefined} multiline />
        </li>
      </RowList>

      <RowList label="Heatmap" className="mt-6" flat>
        <li className="py-3">
          <Heatmap cells={grid.cells} columns={grid.columns} months={grid.months} title="A year of made-up days" label={(c) => c.date + ': level ' + c.level} onSelect={() => undefined} />
        </li>
      </RowList>

      <RowList label="EmptyState" className="mt-6" flat>
        <li>
          <EmptyState action={<Button to="/plan">Open Plan</Button>}>Nothing scheduled. Open Plan to pick what you&apos;re learning.</EmptyState>
        </li>
      </RowList>

      <RowList label="Sheet" className="mt-6" flat>
        <li className="py-3">
          <Button onClick={() => setSheet(true)}>Open a sheet</Button>
        </li>
      </RowList>
      <Sheet open={sheet} title="How was today?" onClose={() => setSheet(false)}>
        <TextField label="One line about today" value="" onChange={() => undefined} />
      </Sheet>
    </Screen>
  );
}
