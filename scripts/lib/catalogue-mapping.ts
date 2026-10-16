/**
 * The reviewed keyword table behind `refs` (resource ids) and `covers` (roadmap.sh nodes) of the catalogue. Each rule
 * is a phrase that names one technique or tool unambiguously; an item gets a rule's ids only when its title, goal or
 * scenario, stack, architecture, components or approach say that phrase. Anything vaguer is left out: an empty
 * mapping is better than a wrong one. scripts/map-catalogue.ts writes the result into the JSONL files.
 *
 * Pure: the unit tests check it against the files.
 */
import type { RawCatalogueItem } from '../../src/seed/catalogue.ts';

interface Rule {
  /** Matched against the item's text, case-insensitively unless `exact`. */
  match: RegExp;
  refs?: string[];
  covers?: string[];
  /** Only the stack is searched (for language names that are common words). */
  stackOnly?: boolean;
}

const IE = 'inference-engineering/';
const AE = 'ai-engineer/';
const AG = 'ai-agents/';
const SA = 'software-architect/';
const GD = 'game-developer/';

export const RULES: Rule[] = [
  // Inference
  { match: /\bkv[- ]cache\b/i, covers: [IE + 'kv-cache'] },
  { match: /\bcontinuous batching\b/i, covers: [IE + 'continuous-batching'] },
  { match: /\bspeculative decoding\b/i, covers: [IE + 'speculation-algorithms', IE + 'draft-target-decoding'] },
  { match: /\bquantiz(?:e|ed|ation)\b|\bint8\b|\bint4\b|\bfp8\b/i, covers: [IE + 'post-training-quantization'] },
  { match: /\bflash[- ]?attention\b/i, covers: [IE + 'flashattention'] },
  { match: /\bpaged[- ]?attention\b|\bpaged kv\b/i, covers: [IE + 'pagedattention'] },
  { match: /\btensor parallel/i, covers: [IE + 'tensor-parallelism'] },
  { match: /\bpipeline parallel/i, covers: [IE + 'pipeline-parallelism'] },
  { match: /\broofline\b/i, covers: [IE + 'roofline-model'] },
  { match: /\btime to first token\b|\bTTFT\b/i, covers: [IE + 'time-to-first-token'] },
  { match: /\bprefix cach/i, covers: [IE + 'caching-approaches'] },
  { match: /\bautoscal/i, covers: [IE + 'autoscaling'] },
  { match: /\bvllm\b/i, refs: ['vllm-docs'], covers: [IE + 'vllm'] },
  { match: /\bsglang\b/i, refs: ['sglang-docs'], covers: [IE + 'sglang'] },
  { match: /\btensorrt[- ]llm\b/i, refs: ['tensorrt-llm-docs'], covers: [IE + 'tensorrt-llm'] },
  { match: /\bonnx\b/i, refs: ['onnx-runtime-docs'], covers: [IE + 'onnx-runtime'] },
  { match: /\bllama\.cpp\b|\bgguf\b/i, refs: ['llama-cpp'] },
  { match: /\bcuda\b/i, refs: ['cuda-guide', 'pmpp-book'], covers: [IE + 'cuda'] },
  { match: /\btriton\b/i, refs: ['triton-tutorials'], covers: [IE + 'writing-custom-kernels'] },
  { match: /\bnsight\b/i, refs: ['nsight-compute-docs'], covers: [IE + 'profiling-performance'] },
  // AI engineering and agents
  { match: /\bretrieval[- ]augmented\b|\bRAG\b/, covers: [AE + 'rag'] },
  { match: /\bvector (?:database|store|index)\b/i, covers: [AE + 'vector-databases'] },
  { match: /\bfaiss\b/i, covers: [AE + 'faiss'] },
  { match: /\bqdrant\b/i, covers: [AE + 'qdrant'] },
  { match: /\bchroma(?:db)?\b/i, covers: [AE + 'chroma'] },
  { match: /\bpgvector\b/i, covers: [AE + 'vector-databases'] },
  { match: /\bsentence[- ]transformers\b/i, covers: [AE + 'sentence-transformers'] },
  { match: /\bprompt injection\b/i, covers: [AE + 'prompt-injection-attacks', AG + 'prompt-injection-jailbreaks'] },
  { match: /\bPII\b/, covers: [AG + 'data-privacy-pii-redaction'] },
  { match: /\bmodel context protocol\b|\bMCP\b/, refs: ['hf-mcp-course'], covers: [AG + 'mcp-servers'] },
  { match: /\b(?:llm|ai|tool[- ]calling) agents?\b|\bagent loop\b|\bagentic\b/i, refs: ['hf-agents-course'], covers: [AG + 'agent-loop'] },
  { match: /\bfunction calling\b|\btool calling\b/i, covers: [AG + 'openai-functions-calling'] },
  { match: /\blangchain\b/i, covers: [AG + 'langchain'] },
  { match: /\bdiffusion model|\bstable diffusion\b|\bdenoising diffusion\b/i, refs: ['hf-diffusion-course'], covers: [IE + 'diffusion-models'] },
  { match: /\bhugging ?face\b|\btransformers library\b/i, refs: ['hf-llm-course'] },
  { match: /\bjax\b/i, refs: ['jax-docs'] },
  // Systems and architecture
  { match: /\bgrpc\b/i, covers: [SA + 'grpc'] },
  { match: /\bgraphql\b/i, covers: [SA + 'graphql'] },
  { match: /\bkafka\b|\brabbitmq\b|\bnats\b|\bmessage queue\b/i, covers: [SA + 'messaging-queues'] },
  { match: /\bmicroservices?\b/i, covers: [SA + 'microservices'] },
  { match: /\bcqrs\b|\bevent sourcing\b/i, covers: [SA + 'cqrs-eventual-consistency'] },
  { match: /\bservice mesh\b/i, covers: [SA + 'service-mesh'] },
  { match: /\braft\b|\bpaxos\b/i, refs: ['mit-6-5840'], covers: [SA + 'distributed-systems'] },
  { match: /\bb\+?-?tree\b|\bquery planner\b|\bstorage engine\b|\bwrite-ahead log\b/i, refs: ['cmu-15-445'] },
  { match: /\btcp\/ip stack\b|\btcp stack\b/i, refs: ['stanford-cs144'], covers: [SA + 'tcp-ip-model'] },
  { match: /\bkubernetes\b|\bk8s\b/i, refs: ['kubernetes-tutorials'], covers: [IE + 'kubernetes'] },
  { match: /\bdocker\b/i, refs: ['docker-get-started'], covers: [IE + 'docker'] },
  { match: /\bterraform\b/i, refs: ['terraform-tutorials'], covers: [SA + 'infrastructure-as-code'] },
  { match: /\bopentelemetry\b/i, refs: ['opentelemetry-docs'], covers: [IE + 'observability'] },
  { match: /\bprometheus\b/i, refs: ['prometheus-docs'], covers: [IE + 'observability'] },
  { match: /\bgithub actions\b/i, refs: ['github-actions-docs'], covers: [SA + 'ci-cd'] },
  { match: /\binterpreter\b|\bbytecode\b/i, refs: ['crafting-interpreters'] },
  { match: /\bOAuth\b|\bJWT\b/, covers: [SA + 'auth-strategies'] },
  // Graphics and games
  { match: /\bopengl\b/i, refs: ['learnopengl'], covers: [GD + 'opengl'] },
  { match: /\bvulkan\b/i, refs: ['vulkan-tutorial'], covers: [GD + 'vulkan'] },
  { match: /\bwebgl\b/i, covers: [GD + 'webgl'] },
  { match: /\bglsl\b/i, refs: ['book-of-shaders'], covers: [GD + 'glsl'] },
  { match: /\bray[- ]trac(?:er|ing)\b|\bpath[- ]trac(?:er|ing)\b/i, refs: ['rtiow'], covers: [GD + 'ray-tracing'] },
  { match: /\bphysically[- ]based rendering\b|\bPBR\b/, refs: ['pbr-book'], covers: [GD + 'physically-based-rendering'] },
  { match: /\bshadow map/i, covers: [GD + 'shadow-map'] },
  { match: /\bnormal map|\bbump map/i, covers: [GD + 'bump'] },
  { match: /\bparallax (?:occlusion )?mapping\b/i, covers: [GD + 'parallax'] },
  { match: /\bfrustum cull/i, covers: [GD + 'frustum', GD + 'culling'] },
  { match: /\bquaternions?\b/i, covers: [GD + 'quaternion'] },
  { match: /\bb[eé]zier\b/i, covers: [GD + 'bezier'] },
  { match: /\bcatmull[- ]rom\b/i, covers: [GD + 'catmull-rom'] },
  { match: /\bbvh\b|\bbounding volume hierarch/i, covers: [GD + 'bvh'] },
  { match: /\bgjk\b/i, covers: [GD + 'gjk'] },
  { match: /\bseparating axis\b/i, covers: [GD + 'sat'] },
  { match: /\bbroad[- ]phase\b/i, covers: [GD + 'broad-phase'] },
  { match: /\bbehaviou?r trees?\b/i, covers: [GD + 'behavior-tree'] },
  { match: /\bminimax\b|\balpha[- ]beta pruning\b/i, covers: [GD + 'minimax'] },
  { match: /\bmonte carlo tree search\b|\bMCTS\b/, covers: [GD + 'mcts'] },
  { match: /\braylib\b/i, refs: ['raylib'] },
  { match: /\bSDL2?\b/, refs: ['sdl'] },
  // Simulation, robotics, hardware
  { match: /\bmujoco\b/i, refs: ['mujoco-docs'] },
  { match: /\bros ?2\b/i, refs: ['ros2-tutorials'] },
  { match: /\bkicad\b/i, refs: ['kicad'] },
  { match: /\bngspice\b/i, refs: ['ngspice'] },
  { match: /\bltspice\b/i, refs: ['ltspice'] },
  { match: /\bfenics\b/i, refs: ['fenics'] },
  { match: /\bPID\b/, refs: ['feedback-systems'] },
  { match: /\bFFT\b|\bFIR filter\b|\bIIR filter\b/, refs: ['dspguide'] },
  { match: /\bSPH\b|\bsmoothed particle hydrodynamics\b|\bnavier[- ]stokes\b/i, refs: ['bridson-fluid-sim'] },
  // Languages, by the stack only
  { match: /\bRust\b/, refs: ['rust-book'], stackOnly: true },
  { match: /\bGo\b/, refs: ['tour-of-go'], stackOnly: true },
  { match: /\bC\+\+/, refs: ['learncpp'], stackOnly: true },
];

/** Challenge topics that a course teaches directly. */
const TOPIC_REFS: Record<string, string[]> = {
  graphs: ['mit-6-006'],
  dp: ['mit-6-006'],
  heaps: ['mit-6-006'],
  sorting: ['mit-6-006'],
  'binary-search': ['mit-6-006'],
  hashing: ['mit-6-006'],
  bst: ['mit-6-006'],
  trees: ['mit-6-006'],
};

function textOf(item: RawCatalogueItem): string {
  if (item.kind === 'challenge') return '';
  if (item.kind === 'build') return [item.title, item.goal, item.stack, ...item.approach].join('\n');
  return [item.title, item.scenario, item.architecture, ...item.components, item.stack, ...item.functional].join('\n');
}

export function mapItem(item: RawCatalogueItem): { refs: string[]; covers: string[] } {
  const refs: string[] = [];
  const covers: string[] = [];
  const add = (list: string[], ids: string[] | undefined): void => {
    for (const id of ids ?? []) if (!list.includes(id)) list.push(id);
  };
  if (item.kind === 'challenge') {
    add(refs, TOPIC_REFS[item.topic]);
  } else {
    const text = textOf(item);
    for (const rule of RULES) {
      if (!rule.match.test(rule.stackOnly ? item.stack : text)) continue;
      add(refs, rule.refs);
      add(covers, rule.covers);
    }
  }
  return { refs, covers };
}
