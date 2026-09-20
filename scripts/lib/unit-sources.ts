/**
 * Where the unit checklist of each resource comes from. Read by scripts/fetch-units.ts.
 * Every source is the resource's own official page (or its official repository).
 */

interface Base {
  /** Resource id in /data/resources. The output file is data/units/<id>.yaml. */
  id: string;
  /** Fail instead of writing a file when fewer units than this are found (default 3). */
  expect?: number;
  /** Titles matching this are left out. */
  skip?: RegExp;
}

type Retitle = (title: string, index: number) => string;

export type UnitSource =
  | (Base & { kind: 'ocw-gallery'; pages: { url: string; section?: string }[]; sort?: boolean })
  | (Base & { kind: 'pattern'; pages: { url: string; section?: string }[]; pattern: RegExp })
  | (Base & { kind: 'ocw-nav'; url: string; skipSections?: RegExp; flat?: boolean })
  | (Base & { kind: 'ocw-table'; url: string; label?: string })
  | (Base & { kind: 'links'; url: string; link: RegExp; from?: string; to?: string; title?: Retitle; sectionFromPath?: number })
  | (Base & { kind: 'markdown'; url: string; base: string; link: RegExp; from?: string; to?: string; title?: Retitle; /** the book is published as .html pages built from these .md files */ html?: boolean })
  | (Base & { kind: 'hf-toctree'; url: string; base: string });

const OCW = 'https://ocw.mit.edu/courses/';
const RAW = 'https://raw.githubusercontent.com/';

const gallery = (id: string, slug: string, path = 'video_galleries/video-lectures/', extra: Partial<Extract<UnitSource, { kind: 'ocw-gallery' }>> = {}): UnitSource => ({
  id,
  kind: 'ocw-gallery',
  pages: [{ url: OCW + slug + '/' + path }],
  ...extra,
});

const NOT_A_UNIT =
  /^(syllabus|calendar|readings?|assignments?|exams?|download|instructor insights|related resources|study materials|resource index|online textbook|about the team|meet the (team|tas)|tools|projects?|recitations?|lecture notes|video lectures|labs?|course info|final exam)$/i;

const nav = (id: string, slug: string, extra: Partial<Extract<UnitSource, { kind: 'ocw-nav' }>> = {}): UnitSource => ({
  id,
  kind: 'ocw-nav',
  url: OCW + slug + '/',
  skipSections: NOT_A_UNIT,
  skip: /^(week \d+ introduction)$/i,
  ...extra,
});

const numbered =
  (label: string, from = 1): Retitle =>
  (title, index) =>
    label + ' ' + (index + from) + ': ' + title;

const Q804 = OCW + '8-04-quantum-physics-i-spring-2016/pages/video-lectures/';

export const UNIT_SOURCES: UnitSource[] = [
  /* ---- mathematics */
  gallery('mit-18-06', '18-06-linear-algebra-spring-2010', undefined, { expect: 30 }),
  nav('mit-18-01', '18-01sc-single-variable-calculus-fall-2010', { expect: 12 }),
  nav('mit-18-02', '18-02sc-multivariable-calculus-fall-2010', { expect: 12 }),
  nav('mit-18-03', '18-03sc-differential-equations-fall-2011', { expect: 20 }),
  nav('mit-6-041', '6-041sc-probabilistic-systems-analysis-and-applied-probability-fall-2013', { expect: 20 }),
  gallery('mit-18-065', '18-065-matrix-methods-in-data-analysis-signal-processing-and-machine-learning-spring-2018', undefined, { expect: 30 }),
  gallery('mit-6-042j', '6-042j-mathematics-for-computer-science-fall-2010', undefined, { expect: 20 }),

  /* ---- physics and chemistry */
  nav('mit-8-01', '8-01sc-classical-mechanics-fall-2016', { expect: 40 }),
  nav('mit-8-03', '8-03sc-physics-iii-vibrations-and-waves-fall-2016', { expect: 20 }),
  {
    id: 'mit-8-04',
    kind: 'pattern',
    expect: 20,
    pattern: /<strong>\s*(Lecture \d+:[^<]+)<\/strong>/g,
    pages: [
      { url: Q804 + 'part-1/', section: 'Part 1: Basic Concepts' },
      { url: Q804 + 'part-2/', section: 'Part 2: Quantum Physics in One-dimensional Potentials' },
      { url: Q804 + 'part-3/', section: 'Part 3: One-dimensional Scattering, Angular Momentum and Central Potentials' },
    ],
  },
  gallery('mit-8-05', '8-05-quantum-physics-ii-fall-2013', undefined, { expect: 20 }),
  nav('mit-3-091', '3-091sc-introduction-to-solid-state-chemistry-fall-2010', { expect: 25 }),
  nav('mit-5-111', '5-111sc-principles-of-chemical-science-fall-2014', { expect: 25 }),
  gallery('mit-5-60', '5-60-thermodynamics-kinetics-spring-2008', undefined, { expect: 25 }),

  /* ---- computer science */
  gallery('mit-6-006', '6-006-introduction-to-algorithms-spring-2020', 'video_galleries/lecture-videos/', { expect: 20 }),
  gallery('mit-6-046j', '6-046j-design-and-analysis-of-algorithms-spring-2015', 'video_galleries/lecture-videos/', { expect: 20 }),
  { id: 'cs50x', kind: 'links', url: 'https://cs50.harvard.edu/x/', link: /^weeks\/\d+\/?$/, expect: 10 },
  { id: 'missing-semester', kind: 'links', url: 'https://missing.csail.mit.edu/', link: /^\/2026\/[a-z-]+\/?$/, expect: 7, title: numbered('Lecture') },
  { id: 'mit-6-1810', kind: 'links', url: 'https://pdos.csail.mit.edu/6.1810/2025/schedule.html', link: /^labs\/(?!guidance)[a-z]+\.html$/, expect: 8 },
  { id: 'mit-6-5840', kind: 'links', url: 'https://pdos.csail.mit.edu/6.824/schedule.html', link: /^labs\/lab-[a-z0-9]+\.html$/, expect: 4 },
  {
    id: 'crafting-interpreters',
    kind: 'links',
    url: 'https://craftinginterpreters.com/contents.html',
    link: /^[a-z-]+\.html$/,
    from: 'dedication.html',
    skip: /Previous|Next|^Up$|Table of Contents|^(Dedication|Acknowledgements|Welcome|A Tree-Walk Interpreter|A Bytecode Virtual Machine|Backmatter)$/i,
    expect: 25,
  },

  /* ---- AI / ML */
  {
    id: 'ml-zoomcamp',
    kind: 'markdown',
    url: RAW + 'DataTalksClub/machine-learning-zoomcamp/master/README.md',
    base: 'https://github.com/DataTalksClub/machine-learning-zoomcamp/tree/master/',
    link: /^(\d{2}-[a-z-]+|projects)\/?$/,
    expect: 9,
  },
  { id: 'hf-llm-course', kind: 'hf-toctree', url: RAW + 'huggingface/course/main/chapters/en/_toctree.yml', base: 'https://huggingface.co/learn/llm-course/', skip: /^(0\. Setup|Course Events)/i, expect: 10 },
  { id: 'hf-agents-course', kind: 'hf-toctree', url: RAW + 'huggingface/agents-course/main/units/en/_toctree.yml', base: 'https://huggingface.co/learn/agents-course/', skip: /^(Live|When the next|Unit 0)/i, expect: 6 },
  { id: 'karpathy-zero-to-hero', kind: 'links', url: 'https://karpathy.ai/zero-to-hero.html', link: /youtu/, expect: 7, title: numbered('Video') },
  { id: 'fastai-practical-dl', kind: 'links', url: 'https://course.fast.ai/', link: /Lessons\/lesson\d+\.html$/, expect: 20, title: (t) => 'Lesson ' + t },

  /* ---- graphics */
  {
    id: 'learnopengl',
    kind: 'links',
    url: 'https://learnopengl.com/',
    link: /learnopengl\.com\/(Getting-started|Lighting|Model-Loading|Advanced-OpenGL|Advanced-Lighting|PBR|In-Practice)\//,
    sectionFromPath: 0,
    expect: 50,
  },
  { id: 'vulkan-tutorial', kind: 'links', url: 'https://vulkan-tutorial.com/', link: /^\/(Overview|Development_environment|Drawing_a_triangle|Vertex_buffers|Uniform_buffers|Texture_mapping|Depth_buffering|Loading_models|Generating_Mipmaps|Multisampling|Compute_Shader)/, sectionFromPath: 0, skip: /^\s*(Drawing a triangle|Vertex buffers|Uniform buffers|Texture mapping)\s*$/i, expect: 25 },

  /* ---- languages */
  {
    id: '30-days-of-python',
    kind: 'markdown',
    url: RAW + 'Asabeneh/30-Days-Of-Python/master/readme.md',
    base: 'https://github.com/Asabeneh/30-Days-Of-Python/blob/master/',
    link: /^\.\/(readme\.md|\d{2}_Day_[^)]+\.md)$/,
    expect: 30,
    title: numbered('Day'),
  },
  { id: 'rust-book', kind: 'markdown', url: RAW + 'rust-lang/book/main/src/SUMMARY.md', base: 'https://doc.rust-lang.org/book/', html: true, link: /^ch\d{2}-00-[a-z-]+\.md$/, expect: 18, title: (t, i) => 'Chapter ' + i + ': ' + t },
  { id: 'learn-go-with-tests', kind: 'markdown', url: RAW + 'quii/learn-go-with-tests/main/SUMMARY.md', base: 'https://github.com/quii/learn-go-with-tests/blob/main/', link: /^[a-z0-9-]+\.md$/, skip: /^(Learn Go with Tests|Chapter Template|Contributing|Anti-patterns)$/i, expect: 25 },
  { id: 'embedded-rust-book', kind: 'markdown', url: RAW + 'rust-embedded/book/master/src/SUMMARY.md', base: 'https://docs.rust-embedded.org/book/', html: true, link: /^\.\/[a-z-]+\/index\.md$/, expect: 8 },

  /* ---- electrical engineering */
  gallery('mit-6-002', '6-002-circuits-and-electronics-spring-2007', undefined, { expect: 20, sort: true }),
  gallery('mit-6-003', '6-003-signals-and-systems-fall-2011', 'video_galleries/lecture-videos/', { expect: 20 }),
  nav('mit-6-004', '6-004-computation-structures-spring-2017', { flat: true, skip: NOT_A_UNIT, expect: 15 }),

  /* ---- mechanical engineering */
  { id: 'mit-2-001', kind: 'ocw-table', url: OCW + '2-001-mechanics-materials-i-fall-2006/pages/lecture-notes/', expect: 20 },
  nav('mit-2-003', '2-003sc-engineering-dynamics-fall-2011', { flat: true, skip: NOT_A_UNIT, expect: 10 }),
  { id: 'mit-2-086', kind: 'ocw-table', url: OCW + '2-086-numerical-computation-for-mechanical-engineers-fall-2014/pages/calendar/', label: 'Week', expect: 10 },
];
