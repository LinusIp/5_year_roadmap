/**
 * The Library's quick filters (ATLAS-LIBRARY): rows under the shelves that gather resources across every shelf by
 * what they are about, in the URL as `pick=`. Four have modules of their own (Developer essentials, Compact power &
 * energy conversion, Security & defence, Agents & MCP); the plan gap fill (15,961 rows) adds six: Certificates (by
 * id), Career & interviews, Research skills, Communication, Open source and Mandarin, each a set of words matched on
 * an item's title and summary, some held to the tracks the cluster lives in; the twelfth file (16,076 rows) adds
 * Build & ship, with a module of its own; the thirteenth file (17,283 rows) adds seven from `src/lib/craft.ts`: Build it
 * yourself, Low-level & performance, Research & science, GPU & CUDA, SDK & API design, Fusion & accelerators and
 * Aerospace; the fourteenth file (17,848 rows) adds four from `src/lib/foundations.ts`: Electronics & EM, Mechanics &
 * materials, Scientific computing and Formal methods (and Research & science gains a Research writing area). A filter can carry areas: chips over its list, each a set of words of its own (`area=` in the URL). The
 * list here is the order of the rows.
 */
import { AGENT_AREAS, agentAreasOf, isAgents } from './agents.ts';
import { BUILD_AREAS, buildAreasOf, isBuildShip } from './build-ship.ts';
import { AEROSPACE_AREAS, aerospaceAreasOf, BUILD_YOURSELF_AREAS, buildYourselfAreasOf, FUSION_AREAS, fusionAreasOf, isAerospace, isBuildYourself, isFusion, isGpuCuda, isLowLevel, isResearchScience, isSdkApi, LOW_LEVEL_AREAS, lowLevelAreasOf, RESEARCH_SCIENCE_AREAS, researchScienceAreasOf } from './craft.ts';
import { isElectronics, isFormalMethods, isMechanics, isScientificComputing, MECHANICS_AREAS, mechanicsAreasOf } from './foundations.ts';
import { isEnergy } from './energy.ts';
import { isEssential } from './essentials.ts';
import { isSecurity, SECURITY_AREAS, securityAreasOf } from './security.ts';
import type { IconName } from '../ui/Icon.tsx';

export interface QuickInput {
  id: string;
  title: string;
  summary?: string | undefined;
  /** The first track. */
  track?: string | undefined;
  tags?: readonly string[] | undefined;
  /** The shelf ("book", "paper", …). */
  shelf?: string | undefined;
}

export interface QuickFilter {
  key: string;
  label: string;
  icon: IconName;
  tone: 'blue' | 'ice';
  /** After the count, in the header: "… on the terminal, Git, Linux, SQL and the web". */
  sub: string;
  /** The search field's name: "Search developer essentials". */
  search: string;
  match: (item: QuickInput) => boolean;
  /** The areas, as chips over the list, and the areas an item of the pick is in (a row can be in several, or none). */
  areas?: readonly QuickArea[] | undefined;
  areasOf?: ((item: QuickInput) => string[]) | undefined;
}

export interface QuickArea {
  key: string;
  label: string;
}

const named = (areas: readonly QuickArea[]): QuickArea[] => areas.map((a) => ({ key: a.key, label: a.label }));

/** A word matched at its start in any case; an acronym or a proper name, as a whole word in its own case. */
function pattern(word: string, whole = false): RegExp {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return whole ? new RegExp('(^|[^A-Za-z])' + escaped + '(?![A-Za-z])') : new RegExp('(^|[^a-z])' + escaped, 'i');
}

function words(list: readonly string[], whole: readonly string[] = []): (text: string) => boolean {
  const patterns = [...list.map((w) => pattern(w)), ...whole.map((w) => pattern(w, true))];
  return (text) => patterns.some((re) => re.test(text));
}

const text = (item: QuickInput): string => item.title + ' ' + (item.summary ?? '');

/** A certificate row of the plan gap fill: its id starts with `cert-` (the plan's own certifications are not resources). */
export function isCertificate(id: string): boolean {
  return id.startsWith('cert-');
}

/** Career & interviews: the prompt's words, on every track. */
const career = words(['interview', 'resume', 'behavioral', 'negotiation', 'compensation', 'system design interview', 'Grind 75', 'Hello Interview', 'Tech Interview Handbook'], ['STAR']);

/**
 * Research skills: how research is done, not research itself. "research", "paper" and "checklist" alone would name
 * every paper, so they count only in a title that also says how (advice, a guide, a process, writing, reading…); the
 * rest of the prompt's words are specific enough on their own.
 */
const researchSpecific = words(['reviewer', 'reproducib', 'random seed', 'LaTeX', 'Overleaf', 'arXiv', 'cold email', 'research taste', 'research process', 'research problem', 'research advice', 'research skill', 'doing research', 'do research', 'write ml papers', 'write a paper', 'writing papers', 'writing a paper', 'reading papers', 'read a paper', 'read papers', 'paper reading', 'paper writing', 'best paper', 'peer review', 'scholarship', 'reporting standards', 'structuring papers', 'advice for authors', 'variance in'], ['PhD']);
const researchBroad = words(['research', 'paper', 'checklist']);
const howTo = /(^|[^a-z])(how to|how i|advice|guide|tips|rules|principles|process|taste|effective|write|writing|read|reading|find|film study|exercises|mindsets|structur)/i;
const research = (item: QuickInput): boolean => researchSpecific(text(item)) || (researchBroad(item.title) && howTo.test(item.title));

/**
 * Communication: speaking, pitching, fundraising and writing for people. "writing", "docs" and "blog" alone would
 * name every documentation row and every blog, so they count in their phrases (technical writing, a style guide,
 * writing error messages, blogging) rather than bare.
 */
const communication = words(['public speaking', 'speaking', 'speech', 'presentation', 'pitch', 'investor', 'fundrais', 'startup', 'technical writing', 'writing well', 'write well', 'style guide', 'error messages', 'Diátaxis', 'tech demo', 'nervous', 'talk to users', 'clear talks', 'great talks', 'giving talks', 'blogging', 'blog post', 'start a blog', 'writing for', 'writing effective', 'writing an engineering', 'writing in', 'write better', 'docs for developers', 'business plan', 'communicat'], ['SAFE', 'YC', 'CFP']);

/** Open source: contributing, in the software tracks. "fork" alone names a code fork (a Triton fork), so it counts as the act. */
const OPEN_SOURCE_TRACKS: ReadonlySet<string> = new Set(['devops', 'inference', 'ai', 'languages', 'systems', 'swe', 'architecture']);
const openSourceWords = words(['contributing', 'contribution', 'contribute to', 'contributor', 'pull request', 'good first issue', 'Google Summer of Code', 'Outreachy', 'fork a', 'forking', 'syncing a fork', 'from a fork', 'open source contribut', 'open-source contribut'], ['GSoC', 'LFX', 'DCO', 'CONTRIBUTING']);
const openSource = (item: QuickInput): boolean => OPEN_SOURCE_TRACKS.has(item.track ?? '') && openSourceWords(text(item));

/** Mandarin: the human language, on the languages track only (a Chinese benchmark in AI is not it). */
const mandarinWords = words(['Chinese', 'Mandarin', 'pinyin', 'tones'], ['HSK']);
const mandarin = (item: QuickInput): boolean => item.track === 'languages' && mandarinWords(text(item));

export const QUICK_FILTERS: readonly QuickFilter[] = [
  { key: 'essentials', label: 'Developer essentials', icon: 'code', tone: 'blue', sub: 'on the terminal, Git, Linux, SQL and the web', search: 'Search developer essentials', match: (i) => isEssential(i.title, i.tags) },
  { key: 'energy', label: 'Compact power & energy conversion', icon: 'zap', tone: 'ice', sub: 'on fusion, direct conversion, superconductors, pulsed power and plasma', search: 'Search power and energy conversion', match: (i) => isEnergy(i.title, i.summary, i.track) },
  { key: 'security', label: 'Security & defence', icon: 'shield', tone: 'blue', sub: 'on hardening, malware, detection and response, the network and the web, secure development and AI for defence', search: 'Search security and defence', match: (i) => isSecurity(i.title, i.summary, i.track, i.tags), areas: named(SECURITY_AREAS), areasOf: (i) => securityAreasOf(i.title, i.summary) },
  { key: 'agents', label: 'Agents & MCP', icon: 'bot', tone: 'ice', sub: 'on agent loops, MCP, tool calling, sandboxes, evals and frameworks', search: 'Search agents and MCP', match: (i) => isAgents(i.title, i.summary, i.track), areas: named(AGENT_AREAS), areasOf: (i) => agentAreasOf(i.title, i.summary, i.shelf) },
  { key: 'certificates', label: 'Certificates', icon: 'done', tone: 'blue', sub: 'that end in a certificate: exams, specializations and graded courses', search: 'Search certificates', match: (i) => isCertificate(i.id) },
  { key: 'career', label: 'Career & interviews', icon: 'briefcase', tone: 'ice', sub: 'on interviews, resumes, negotiation and compensation', search: 'Search career and interviews', match: (i) => career(text(i)) },
  { key: 'research', label: 'Research skills', icon: 'flask', tone: 'blue', sub: 'on doing research: reading and writing papers, reproducibility, reviewing, LaTeX', search: 'Search research skills', match: research },
  { key: 'communication', label: 'Communication', icon: 'doc', tone: 'ice', sub: 'on speaking, pitching, fundraising, technical writing and blogging', search: 'Search communication', match: (i) => communication(text(i)) },
  { key: 'opensource', label: 'Open source', icon: 'puzzle', tone: 'blue', sub: 'on contributing: forks, pull requests, first issues, mentorships', search: 'Search open source', match: openSource },
  { key: 'mandarin', label: 'Mandarin (the language)', icon: 'course', tone: 'ice', sub: 'of Mandarin Chinese: HSK, pinyin, tones, grammar', search: 'Search Mandarin', match: mandarin },
  { key: 'buildship', label: 'Build & ship', icon: 'hammer', tone: 'blue', sub: 'on executables, installers and signing, desktop and game builds, GitHub Actions, releases and deploys', search: 'Search build and ship', match: (i) => isBuildShip(i.title, i.summary, i.track), areas: named(BUILD_AREAS), areasOf: (i) => buildAreasOf(i.title, i.summary) },
  { key: 'buildyourself', label: 'Build it yourself', icon: 'cube', tone: 'ice', sub: 'written from scratch: interpreters, compilers, kernels, emulators, databases, networks and AI', search: 'Search build it yourself', match: (i) => isBuildYourself(i.title, i.summary, i.track), areas: named(BUILD_YOURSELF_AREAS), areasOf: (i) => buildYourselfAreasOf(i.title, i.summary) },
  { key: 'lowlevel', label: 'Low-level & performance', icon: 'chip', tone: 'blue', sub: 'on assembly, the ISA and ABI, microarchitecture, debuggers and profilers, the Linux kernel and the wire', search: 'Search low-level and performance', match: (i) => isLowLevel(i.title, i.summary, i.track), areas: named(LOW_LEVEL_AREAS), areasOf: (i) => lowLevelAreasOf(i.title, i.summary) },
  { key: 'science', label: 'Research & science', icon: 'sigma', tone: 'ice', sub: 'on rigorous mathematics, learning theory, physics, how science works and the great lectures', search: 'Search research and science', match: (i) => isResearchScience(i.title, i.summary, i.track), areas: named(RESEARCH_SCIENCE_AREAS), areasOf: (i) => researchScienceAreasOf(i.title, i.summary) },
  { key: 'gpu', label: 'GPU & CUDA', icon: 'cpu', tone: 'blue', sub: 'on CUDA, PTX and SASS, CUTLASS and CuTe, tensor cores, warps, Nsight, NCCL, HIP and Triton', search: 'Search GPU and CUDA', match: (i) => isGpuCuda(i.title, i.summary, i.track) },
  { key: 'sdk', label: 'SDK & API design', icon: 'layers', tone: 'ice', sub: 'on SDKs, API guidelines, versioning and deprecation, the ABI, FFI and bindings, protobuf and OpenAPI', search: 'Search SDK and API design', match: (i) => isSdkApi(i.title, i.summary, i.track) },
  { key: 'fusion', label: 'Fusion & accelerators', icon: 'atom', tone: 'blue', sub: 'on plasma, blankets and tritium, direct energy conversion, magnets, beams, linacs, SRF and FELs', search: 'Search fusion and accelerators', match: (i) => isFusion(i.title, i.summary, i.track), areas: named(FUSION_AREAS), areasOf: (i) => fusionAreasOf(i.title, i.summary) },
  { key: 'aerospace', label: 'Aerospace', icon: 'orbit', tone: 'ice', sub: 'on rockets and propulsion, astrodynamics, guidance and navigation, aerodynamics and structures, spacecraft', search: 'Search aerospace', match: (i) => isAerospace(i.title, i.summary, i.track), areas: named(AEROSPACE_AREAS), areasOf: (i) => aerospaceAreasOf(i.title, i.summary) },
  { key: 'electronics', label: 'Electronics & EM', icon: 'chip', tone: 'blue', sub: 'on circuits, op amps and data converters, RF and microwave, EMC and probing, fields and waves, detector front ends', search: 'Search electronics and EM', match: (i) => isElectronics(i.title, i.summary, i.track) },
  { key: 'mechanics', label: 'Mechanics & materials', icon: 'cube', tone: 'ice', sub: 'on fluids and turbulence, solids and fracture, materials science and the nuclear codes and standards', search: 'Search mechanics and materials', match: (i) => isMechanics(i.title, i.summary, i.track), areas: named(MECHANICS_AREAS), areasOf: (i) => mechanicsAreasOf(i.title, i.summary) },
  { key: 'scicomp', label: 'Scientific computing', icon: 'sigma', tone: 'blue', sub: 'on numerical methods and solvers, PETSc, SUNDIALS, AMReX and MFEM, HPC, uncertainty quantification and scientific ML', search: 'Search scientific computing', match: (i) => isScientificComputing(i.title, i.summary, i.track) },
  { key: 'formal', label: 'Formal methods', icon: 'check', tone: 'ice', sub: 'on TLA+, model checking, proof assistants, seL4, CompCert, Verus, Iris, SPARK and DO-178C', search: 'Search formal methods', match: (i) => isFormalMethods(i.title, i.summary, i.track) },
];

export const QUICK_FILTER_KEYS: readonly string[] = QUICK_FILTERS.map((f) => f.key);

/** The quick filters an item is in, by key. */
export function quickPicks(item: QuickInput): string[] {
  return QUICK_FILTERS.filter((f) => f.match(item)).map((f) => f.key);
}

export function quickFilterOf(key: string | null | undefined): QuickFilter | undefined {
  return key ? QUICK_FILTERS.find((f) => f.key === key) : undefined;
}
