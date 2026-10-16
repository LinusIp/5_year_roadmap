# Edge inference: an int4 model on a laptop or phone, measured

**Goal.** A 1–3B language model quantized to int4 and running on a laptop or a phone through llama.cpp or ONNX Runtime, measured for speed, memory and energy, with its quality checked against the full-precision model on a small eval.

**Why.** Inference Engineering roadmap: `inference-engineering/desktop-inference`, `inference-engineering/mobile-inference` and `inference-engineering/onnx-runtime`, with `inference-engineering/measuring-quality-impact` behind the eval. Skills: quantization, llama.cpp and ONNX Runtime. Data-centre habits break on a device: memory is shared with everything else, the CPU throttles when it gets hot, and the battery is the real budget.

**Scope.** MVP: one model (for example Llama 3.2 3B or Qwen2.5 1.5B) in full precision as the reference, an int4 GGUF (Q4_K_M) for llama.cpp, the same model on at least one device, a harness that measures prompt processing and generation speed, peak memory and energy, and a quality eval. Stretch: the ONNX Runtime int4 build of the same model as a second runtime; a phone and a laptop both; Q8 and Q3 points to draw the size-quality curve.

**Architecture.** A conversion step produces the quantized files from the Hugging Face checkpoint. A benchmark harness runs the same prompts on each device and runtime, records timings from the runtime's own counters, samples memory and power alongside, and writes results to JSON. An eval runner scores the reference and the quantized model on the same questions, and a report script joins everything into one table.

```
HF checkpoint ─▶ convert + quantize ─▶ GGUF Q4 / ONNX int4
                                            │
          device (laptop / phone) ◀─────────┘
             │ tokens/s, memory, power
             ▼
         results.json ◀── eval (fp16 vs int4) ─▶ report
```

**Stack.** llama.cpp (llama-bench, llama-perplexity) and its Android build or an iOS app around it, ONNX Runtime GenAI, Python for the harness, `powermetrics` on macOS or RAPL counters on Linux, Android battery statistics on a phone, a 200-question multiple-choice eval such as an ARC-Easy subset.

**Milestones.** Full-precision baseline and eval set on a desktop GPU (4 h) · int4 quantization with llama.cpp and ONNX Runtime (5 h) · Running on a laptop or a phone (6 h) · Harness for speed, memory and energy (5 h) · Quality comparison and the write-up on what fits where (5 h). Total 25 h.

**Done when.** The int4 model generates on the target device from a script in the repository. The harness reports prompt-processing and generation tokens per second for a 512-token prompt and 128 generated tokens, averaged over 5 runs after warm-up, peak resident memory, and joules per generated token (or battery percentage per 1,000 tokens on a phone). The int4 model's eval accuracy is within 3 points of full precision, and its perplexity increase on WikiText-2 is reported.

**Measure and report.** Tokens per second for prompt and generation on each device and runtime; peak memory against model file size; energy per token and sustained speed after 10 minutes of generation (thermal throttling); eval accuracy and perplexity for full precision, Q8 and Q4; a fits-on table by device memory.

**Pitfalls.** Measuring the first run, which includes loading and page-faulting the weights. Ignoring thermal throttling, so a 30-second benchmark overstates sustained speed. Comparing runtimes with different thread counts or context sizes. Evaluating with different chat templates for the two models. Reading energy from a phone plugged into a charger.

**References.** llama-cpp, onnx-runtime-docs, gptq, awq, mit-6-5940, m-quant-study.

**Write-up.** A table of speed, memory, energy and quality per device and format, a chart of sustained tokens per second over 10 minutes, a short video of the model running on the device, and the fits-on table with your recommendation.
