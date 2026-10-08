/**
 * The authoritative data model, copied verbatim from section 5 of the build brief.
 *
 * Nothing imports these at runtime. `schema.ts` defines the Zod schemas that the YAML
 * is validated against, and `tests/unit/model.test.ts` proves at compile time that every
 * validated seed object and every stored user object is assignable to these interfaces.
 * The schemas may add optional fields; they may never drop or retype a field below.
 */

export type TrackId =
  | 'ai' | 'swe' | 'systems' | 'graphics' | 'simulation' | 'gamedev'
  | 'languages' | 'math' | 'physics' | 'ee' | 'embedded' | 'controls' | 'mech' | 'robotics' | 'chem' | 'career';

export type BlockId = 'A' | 'B' | 'C' | 'D' | 'E';

export interface Resource {
  id: string;                 // stable slug, e.g. "mit-18-06"
  title: string;
  provider: string;           // "MIT OCW", "Stanford Online", ...
  type: 'course' | 'lectures' | 'book' | 'tutorial' | 'article' | 'paper' | 'repo' | 'cert';
  url: string | null;         // null if not verified
  urlVerified: boolean;
  searchHint?: string;        // exact query to find it when url is null
  tracks: TrackId[];
  level: 'intro' | 'intermediate' | 'advanced';
  cost: 'free' | 'audit-free' | 'paid';
  estHours: number;
  prerequisites: string[];    // resource ids
  units?: { id: string; title: string }[]; // lectures / chapters / labs
}

export interface Phase { id: string; year: 1 | 2 | 3 | 4 | 5; title: string; start: string; end: string; goal: string; }

export interface PlanItem { id: string; phaseId: string; block: BlockId; resourceId?: string; projectId?: string; order: number; }

export interface Project {
  id: string; title: string; cadence: 'weekly' | 'monthly' | 'research' | 'capstone';
  tracks: TrackId[]; brief: string; acceptance: string[]; source?: string; estHours: number; phaseId?: string;
}

export interface DayLog {
  date: string;               // YYYY-MM-DD, local time
  entries: { block: BlockId; track: TrackId; refId?: string; minutes: number; note?: string }[];
  reflection?: string; energy?: 1 | 2 | 3 | 4 | 5; frozen?: boolean;
}

export interface UserItemState { refId: string; status: 'todo' | 'active' | 'done' | 'dropped'; unitsDone: string[]; notes?: string; repoUrl?: string; }
