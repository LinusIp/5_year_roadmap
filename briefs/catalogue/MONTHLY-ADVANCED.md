# Monthly advanced: real-case projects (304)

## ai

### Support-ticket triage service for a SaaS helpdesk
`mx-ai-ticket-triage-llm` · Y1-P0 · level 2 · 30 h · Python, FastAPI, Pydantic, SQLite, an LLM API

**Scenario.** Brightdesk, a 30-person SaaS company, gets about 1,200 support tickets a day and two agents spend the morning hand-sorting them. They want automatic category, priority and suggested-team labels with a confidence score so low-confidence tickets still go to a human.

**Functional.** POST /triage accepts ticket text and returns category, priority, team and confidence; Structured JSON output validated against a schema with retry on invalid output; Low-confidence tickets flagged for human review; Batch endpoint for backfilling old tickets; Labeled eval set and a script that scores any prompt version

**Non-functional.** p95 latency under 3 s per ticket; Macro-F1 of at least 0.80 on 500 held-out tickets; Cost under $15/month at 1,200 tickets/day

**Constraints.** Hosted LLM API only, no fine-tuning; No customer PII sent unredacted

**Architecture.** A FastAPI service wraps a prompt with a JSON schema, validates output, and logs every call. An offline eval harness replays a labeled set against each prompt version. Components: API layer, Prompt/version registry, PII redactor, Output validator, Eval harness, Call log (SQLite)

**Data.** Public customer-support/complaint text datasets (e.g. Consumer Financial Protection complaints, Bitext customer-support set) relabeled into 8 invented categories

**Milestones.** Define label taxonomy and build 500-ticket labeled eval set (6 h) · Prompt v1 with schema-validated output (5 h) · FastAPI service, logging, PII redaction (6 h) · Eval harness with per-class report and prompt A/B (6 h) · Cost/latency tuning (few-shot, model choice, caching) (4 h) · README, demo, write-up (3 h)

**Deliverables.** repo with README; eval report comparing 3 prompt versions; demo GIF

**Done when.** Macro-F1 >= 0.80 on the held-out set, p95 < 3 s, projected monthly cost < $15 shown in a cost table.

**Measure.** Macro-F1, per-class confusion, p50/p95 latency, cost per 1k tickets, invalid-JSON retry rate

**Pitfalls.** Eval set leakage from few-shot examples; Label ambiguity inflating error; write labeling guide

**Stretch.** Add active-learning loop that surfaces uncertain tickets; Compare against a TF-IDF + logistic regression baseline

### Customer churn predictor with monthly retention list
`mx-ai-churn-telco-service` · Y1-P0 · level 2 · 28 h · Python, pandas, scikit-learn, XGBoost/LightGBM, SHAP

**Scenario.** Wavelink, a regional mobile carrier with 400k subscribers, loses about 2% of customers a month. The retention team can call only 3,000 people per month and wants the list ranked by churn risk with the reason attached.

**Functional.** Train and compare logistic regression and gradient boosting on churn labels; Rank customers by calibrated probability; Per-customer top-3 reason codes from feature attributions; Monthly batch scoring script writing a CSV; Model card with limitations

**Non-functional.** Precision@3000 at least 2x the base rate; Brier score under 0.10 after calibration; Scoring 400k rows in under 2 minutes on a laptop

**Constraints.** Runs offline on a laptop; Features must exclude post-churn leakage

**Architecture.** A training pipeline builds features with time-aware splits, fits models, calibrates, and exports a pickled pipeline. A batch scorer applies it and attaches SHAP reasons. Components: Feature builder, Time-aware splitter, Model trainer, Calibrator, Batch scorer, Reason-code generator

**Data.** Public Telco Customer Churn dataset, plus a synthetic generator scaling it to 400k rows with usage time series

**Milestones.** EDA and leakage audit (4 h) · Baselines and time-aware validation (5 h) · Gradient boosting, tuning, calibration (6 h) · Lift/precision@k and cost-benefit analysis (5 h) · SHAP reason codes and batch scorer (5 h) · Model card and write-up (3 h)

**Deliverables.** repo; model card; lift chart and cost-benefit notebook

**Done when.** Precision@3000 >= 2x base rate on the last held-out month, Brier < 0.10, 400k-row scoring < 2 min.

**Measure.** AUC, PR-AUC, precision@k, lift, Brier, calibration curve, scoring time

**Pitfalls.** Random split hides temporal drift; Treating high AUC as business value

**Stretch.** Uplift modelling to target persuadable customers; Drift monitor on monthly feature distributions

### Book recommender for an independent online bookshop
`mx-ai-reco-bookshop-cf` · Y1-P0 · level 2 · 28 h · Python, implicit or LightFM, Redis or SQLite, FastAPI

**Scenario.** Paperline, a small online bookshop with 30k users and 60k titles, wants a 'you may also like' row. They have purchase and rating history but no ML staff.

**Functional.** Popularity and item-item baselines; Matrix factorization or ALS model; Cold-start fallback for new users and new books; Offline evaluation with leave-last-out; Precomputed top-20 per user served via an API

**Non-functional.** Recall@20 at least 25% above popularity baseline; API p99 under 50 ms; Nightly rebuild under 15 minutes

**Constraints.** Single small VM, no GPU

**Architecture.** Nightly job trains models and writes top-N lists to a key-value store; the API reads them and falls back to popular-in-genre. Components: Data loader, Baselines, Factorization model, Cold-start logic, Offline evaluator, Serving API

**Data.** Public Book-Crossing or Goodreads ratings dataset

**Milestones.** Data cleaning and split design (4 h) · Baselines and metrics (5 h) · Factorization model and tuning (7 h) · Cold-start handling (4 h) · Serving API and latency test (5 h) · Write-up (3 h)

**Deliverables.** repo; offline eval report

**Done when.** Recall@20 >= 1.25x popularity, API p99 < 50 ms measured with a load test.

**Measure.** Recall@k, NDCG@k, coverage, novelty, p99 latency

**Pitfalls.** Popularity bias dominating metrics; Random split leaking future ratings

**Stretch.** Add a re-ranking diversity step; Run a simulated A/B test

### Offline meeting transcription and action-item extractor
`mx-ai-meeting-notes-whisper` · Y1-P0 · level 2 · 28 h · Python, faster-whisper, pyannote or similar, a local LLM via llama.cpp

**Scenario.** A 12-person law boutique cannot upload client calls to cloud services. They want recordings transcribed locally with speaker labels and a short list of action items.

**Functional.** Transcribe audio with a local speech model; Speaker diarization; Chunked summarization with action items and owners; Searchable transcript output; Word error rate evaluation

**Non-functional.** WER under 12% on clean meeting audio; Process 1 hour of audio in under 20 minutes on a laptop; Zero network calls at runtime

**Constraints.** Runs fully offline

**Architecture.** A pipeline runs VAD, ASR, diarization, then a local LLM for summaries, writing Markdown per meeting. Components: Audio preprocessor, ASR, Diarizer, Summarizer, Markdown writer, WER evaluator

**Data.** Public AMI meeting corpus or LibriSpeech subset

**Milestones.** Audio ingest and VAD (4 h) · ASR and WER evaluation (6 h) · Diarization (5 h) · Local summary and action items (6 h) · Throughput tuning (4 h) · Write-up (3 h)

**Deliverables.** repo; WER/throughput report

**Done when.** WER < 12% on a held-out AMI subset, 1 hour processed in < 20 min, offline verified.

**Measure.** WER, diarization error rate, real-time factor, action-item recall vs manual list

**Pitfalls.** Overlapping speech inflating errors; Long-context summaries losing items

**Stretch.** Real-time streaming mode; Custom vocabulary for legal terms

### HR policy Q&A with retrieval evals for a 600-person firm
`mx-ai-rag-hr-policy-evals` · Y1-P0 · level 3 · 30 h · Python, sentence-transformers, rank-bm25 or SQLite FTS, FAISS, LLM API

**Scenario.** Corvane Logistics has 140 pages of HR policy PDFs and HR answers the same 50 questions weekly. They want a cited Q&A bot but fear wrong answers about leave and pay, so retrieval quality must be measured, not assumed.

**Functional.** Ingest PDFs into chunks with page metadata; Hybrid retrieval (BM25 + embeddings) with reranking; Answers with page-level citations and refusal when evidence is weak; Gold set of 120 questions with source passages; Eval script reporting retrieval and answer metrics per configuration

**Non-functional.** Recall@5 of at least 0.90 on the gold set; Faithfulness (judged) at least 0.90; Answer p95 under 6 s; index rebuild under 5 minutes

**Constraints.** Documents stay local; only retrieved chunks go to the LLM; Under $10/month

**Architecture.** Ingest builds a dual index; the query path retrieves, reranks, prompts, then verifies citations. The eval harness sweeps chunk size, retriever and reranker. Components: PDF parser/chunker, BM25 index, Vector index, Reranker, Answer generator, Eval harness

**Data.** Synthetic policy handbook generated with an LLM then human-edited, plus a public employee handbook sample

**Milestones.** Create policy corpus and 120-question gold set (7 h) · Ingestion and chunking variants (5 h) · Hybrid retrieval and reranker (6 h) · Generation with citations and refusal logic (5 h) · Eval sweep and ablation table (5 h) · Write-up (2 h)

**Deliverables.** repo; ablation report; gold set with labeling notes

**Done when.** Recall@5 >= 0.90 and faithfulness >= 0.90 for the chosen config, with ablation table justifying it.

**Measure.** Recall@k, MRR, faithfulness, answer correctness, refusal precision, latency, cost

**Pitfalls.** Gold questions written from chunks bias retrieval; LLM-judge self-preference

**Stretch.** Add query rewriting for multi-hop questions; Track eval regressions in CI

### Invoice field extraction pipeline for an accounting practice
`mx-ai-invoice-extraction-llm` · Y1-P0 · level 3 · 30 h · Python, Tesseract or PaddleOCR, Pydantic, FastAPI, an LLM API

**Scenario.** Ledgerly, an accounting practice with 80 small-business clients, retypes supplier invoices into their ledger. They want vendor, date, totals and line items extracted with per-field confidence and a review UI only for doubtful fields.

**Functional.** OCR or text-layer extraction from PDFs and photos; LLM extraction to a strict schema; Arithmetic checks (line sums vs total, tax rate); Per-field confidence and review queue; Export to CSV for import

**Non-functional.** Field-level accuracy of at least 95% on header fields; At least 70% of invoices fully auto-accepted; Under 8 s per page and under $0.01 per invoice

**Constraints.** No invoice leaves the machine except the text sent to the LLM; Budget $20/month

**Architecture.** Pages pass through OCR, then a schema-constrained LLM call, then deterministic validators; failures route to a small review web page. Components: OCR step, Extraction prompt, Schema validator, Arithmetic checker, Review UI, CSV exporter

**Data.** Public invoice datasets (e.g. SROIE receipts, CORD) plus synthetic invoices rendered from templates with known ground truth

**Milestones.** Synthetic invoice generator with ground truth (6 h) · OCR and extraction baseline (6 h) · Validators and confidence scoring (6 h) · Review UI (6 h) · Evaluation by field and by template (4 h) · Write-up (2 h)

**Deliverables.** repo; field-accuracy report; demo GIF

**Done when.** Header-field accuracy >= 95%, >= 70% auto-accept at that accuracy, < $0.01 per invoice.

**Measure.** Field accuracy, auto-accept rate at fixed error rate, cost per invoice, latency

**Pitfalls.** OCR noise blamed on the LLM; Confidence scores that are not calibrated

**Stretch.** Layout-aware model comparison; Learn per-vendor templates from corrections

### Weekly demand forecasting for a 25-store grocery chain
`mx-ai-sales-forecast-retail` · Y1-P0 · level 3 · 30 h · Python, pandas, statsmodels, LightGBM

**Scenario.** Greenbasket, a 25-store grocery chain, over-orders perishables and wastes about 6% of produce. They want a weekly forecast per store and category to reduce waste without raising stockouts.

**Functional.** Ingest sales history into a tidy panel; Seasonal naive, ETS and gradient-boosted forecasters; Rolling-origin backtest; Prediction intervals; Forecast CSV for ordering

**Non-functional.** MASE under 0.85 vs seasonal naive; 80% interval coverage between 75 and 85%; Retrain and forecast all 500 series in under 10 minutes

**Constraints.** Runs on a laptop CPU

**Architecture.** A panel builder feeds multiple model families evaluated by rolling-origin backtest; the best per series group is chosen and exported with intervals. Components: Panel builder, Baseline models, GBM with lag features, Backtester, Interval calibrator, Exporter

**Data.** Public Favorita grocery sales or M5 Walmart dataset, subset to 25 stores

**Milestones.** Panel and holiday/promo features (5 h) · Baselines and backtest framework (6 h) · GBM with lags and calendar features (7 h) · Intervals and coverage check (5 h) · Business metric: waste vs stockout simulation (5 h) · Write-up (2 h)

**Deliverables.** repo; backtest report; waste simulation notebook

**Done when.** MASE < 0.85, coverage 75-85%, full run < 10 min.

**Measure.** MASE, sMAPE, coverage, simulated waste and stockout rate

**Pitfalls.** Look-ahead leakage in lag features; Evaluating only on easy fast-moving items

**Stretch.** Hierarchical reconciliation; Global neural model comparison

### Card-transaction fraud scorer with cost-based thresholding
`mx-ai-fraud-card-scoring` · Y1-P0 · level 3 · 30 h · Python, pandas, LightGBM, FastAPI

**Scenario.** Payfern, a small payments processor, sees 0.4% fraud and loses money on both fraud and falsely declined customers. They need a model plus a threshold chosen from real cost per error, not accuracy.

**Functional.** Feature engineering with velocity and aggregate features; Gradient boosting with imbalance handling; Cost-sensitive threshold selection; Time-based validation; Score endpoint returning probability and decision

**Non-functional.** Recall at least 70% at 1% false-positive rate; Scoring p99 under 20 ms per transaction; Retrain on 1M rows in under 10 minutes

**Constraints.** No use of protected attributes; CPU only

**Architecture.** Offline pipeline builds rolling-window features and trains the model; the online scorer computes velocity features from an in-memory store. Components: Feature pipeline, Trainer, Threshold optimizer, Online feature store, Scoring API

**Data.** Public Kaggle credit-card fraud (ULB) dataset or synthetic generator with fraud rings

**Milestones.** Data audit and time split (4 h) · Velocity features (6 h) · Model with imbalance handling (6 h) · Cost curve and threshold (5 h) · Scoring API and latency test (5 h) · Write-up (4 h)

**Deliverables.** repo; cost analysis notebook; API

**Done when.** Recall >= 70% at <= 1% FPR on last-period holdout; p99 < 20 ms.

**Measure.** PR-AUC, recall at fixed FPR, expected cost, latency

**Pitfalls.** Using ROC-AUC on a 0.4% positive rate; Leaky aggregate features

**Stretch.** Graph features for fraud rings; Concept-drift alerting

### Aspect-level sentiment analysis for hotel reviews
`mx-ai-review-sentiment-bert` · Y1-P0 · level 3 · 28 h · Python, Hugging Face Transformers, scikit-learn

**Scenario.** Staywell, a 60-hotel group, wants to know why scores drop: cleanliness, noise, staff or price. They have 200k free-text reviews and want per-aspect sentiment trends by property.

**Functional.** Aspect and sentiment labeling with an LLM on a sample; Fine-tune a small encoder on LLM labels; Compare against zero-shot LLM and TF-IDF baselines; Weekly aspect trend dashboard data; Agreement study against a human-labeled subset

**Non-functional.** Aspect F1 at least 0.80 vs human labels; Inference on 200k reviews in under 20 minutes on one GPU or 60 on CPU; Labeling cost under $25

**Constraints.** Free Colab or a single consumer GPU

**Architecture.** An LLM distills labels onto a sample; a small encoder is fine-tuned on them and run in bulk, with a human check set for trust. Components: Label generator, Human check set, Fine-tuning script, Bulk inference, Trend aggregator

**Data.** Public TripAdvisor or Yelp hotel review datasets

**Milestones.** Aspect taxonomy and sample labeling (5 h) · Human check set of 300 (4 h) · Baselines (4 h) · Fine-tuning the encoder (7 h) · Bulk inference and trends (4 h) · Write-up (4 h)

**Deliverables.** repo; comparison report

**Done when.** Fine-tuned model F1 >= 0.80 on the human set at < 10% of LLM labeling cost per review.

**Measure.** Aspect F1, agreement kappa, cost per 1k reviews, throughput

**Pitfalls.** Training on noisy LLM labels without checking; Class imbalance across aspects

**Stretch.** Active learning on disagreements; Multilingual reviews

### Prompt regression testing in CI for a content team
`mx-ai-prompt-regression-ci` · Y1-P0 · level 3 · 30 h · Python, asyncio, Pydantic, GitHub Actions-style YAML

**Scenario.** Quillstack, a marketing-tools startup, ships LLM-powered features and a prompt tweak last month broke tone and JSON format for a week. They want every prompt change tested before merge.

**Functional.** Dataset of test cases per prompt with rubric and assertions; Deterministic checks (schema, length, banned words) plus LLM-judge checks; Runner that compares candidate vs main branch; CI workflow failing on regression beyond a threshold; HTML report of diffs

**Non-functional.** Full suite of 200 cases runs in under 5 minutes; Judge agreement with humans at least 85% on 50 labeled outputs; Per-run cost under $1

**Constraints.** Provider-agnostic interface; Budget cap enforced in code

**Architecture.** A CLI loads cases, runs both prompt versions concurrently with caching, scores, and emits a report plus exit code. Components: Case format, Runner with cache, Deterministic assertions, Judge, Report generator, CI config

**Data.** Self-written test cases for three invented prompts (summarizer, tone rewriter, extractor)

**Milestones.** Case schema and 200 cases (6 h) · Runner with concurrency and caching (6 h) · Assertions and judge (7 h) · Judge calibration vs human labels (4 h) · CI integration and reports (5 h) · Write-up (2 h)

**Deliverables.** repo; CI workflow; calibration report

**Done when.** Suite < 5 min, judge agreement >= 85%, a seeded regression is caught and a seeded no-op is not.

**Measure.** Runtime, cost, judge agreement, false alarm and miss rate on seeded changes

**Pitfalls.** Flaky LLM outputs causing false alarms; Judge bias toward longer outputs

**Stretch.** Statistical significance testing across repeats; Pairwise judge mode

### MCP tool server exposing a small clinic's scheduling system
`mx-ai-mcp-ops-toolserver` · Y1-P0 · level 3 · 30 h · Python, MCP SDK, SQLite, pytest

**Scenario.** Harbor Physio, a 5-clinic physiotherapy group, wants staff to ask an assistant to find free slots, move appointments and list no-shows. Their booking system is a SQL database with no API.

**Functional.** MCP server with tools for find_slots, book, reschedule, list_no_shows; Read tools separate from write tools with explicit confirmation step; Argument validation and clear error messages the model can recover from; Audit log of every write; Test client scripting 30 scenarios

**Non-functional.** Tool call p95 under 300 ms; No write without confirmation token, verified by 30 scenario tests; Handles 20 concurrent sessions

**Constraints.** Local stdio and HTTP transports only; Synthetic data only

**Architecture.** An MCP server wraps a repository layer over SQLite. Write tools return a pending plan that a second confirm tool executes. Components: MCP server, Repository layer, Confirmation manager, Audit log, Scenario test client

**Data.** Synthetic clinic schedule generated by script

**Milestones.** Schema, seed data and repository layer (5 h) · Read tools and tool descriptions (5 h) · Write tools with confirm flow (6 h) · Scenario tests with an LLM client (6 h) · Concurrency and audit log (4 h) · Write-up (4 h)

**Deliverables.** repo; tool catalog doc; scenario test report

**Done when.** All 30 scenarios pass, zero unconfirmed writes, p95 < 300 ms at 20 concurrent sessions.

**Measure.** Scenario pass rate, tool-selection accuracy, p95 latency, error-recovery rate

**Pitfalls.** Vague tool descriptions leading to wrong tool choice; Double-booking race conditions

**Stretch.** Add auth scopes per role; Resource endpoints for daily summaries

### Developer-docs question answering with citation checks
`mx-ai-rag-code-docs-assistant` · Y1-P0 · level 3 · 30 h · Python, sentence-transformers, Chroma or FAISS, LLM API

**Scenario.** Pylon API, a payments-API vendor, receives 300 support questions a month that are answered in their docs. They want a docs bot whose citations are verified automatically, so wrong links never reach customers.

**Functional.** Crawl and chunk Markdown docs by heading; Embedding retrieval with metadata filters by API version; Answers with quoted snippets and links; Automatic citation verifier checking quote presence; Evaluation on 100 real-style questions

**Non-functional.** Citation validity 100% (verified quotes); Answer correctness at least 85% on gold set; p95 latency under 5 s

**Constraints.** Open embedding model locally; Under $10/month

**Architecture.** The index preserves heading paths and versions; the generator must output quotes and the verifier rejects answers whose quotes do not appear in retrieved chunks. Components: Docs ingester, Chunker, Vector store, Generator, Citation verifier, Eval set

**Data.** Public open-source project documentation (e.g. a permissively licensed framework's docs) as stand-in

**Milestones.** Ingest and heading-aware chunking (5 h) · Retrieval with version filters (5 h) · Generation and citation verifier (7 h) · Gold set and scoring (6 h) · Failure analysis (4 h) · Write-up (3 h)

**Deliverables.** repo; failure taxonomy

**Done when.** No unverified citation reaches output; correctness >= 85%.

**Measure.** Citation validity, correctness, retrieval recall, refusal rate, latency

**Pitfalls.** Chunks losing code-block context; Verifier too strict on whitespace

**Stretch.** Add hybrid search; Conversation memory

### Tool-using research agent with a step budget and traces
`mx-ai-agent-research-assistant` · Y1-P1 · level 3 · 30 h · Python, an LLM API with tool calling, SQLite FTS

**Scenario.** Northfield Policy Lab, a think tank with five analysts, wants an agent that answers factual questions from a local corpus of 3,000 reports, using search, read and calculator tools, and shows its reasoning trace for audit.

**Functional.** Agent loop with search, open_document and calculate tools; Hard step and token budgets with graceful stop; Full trace logging as JSON; Eval set of 60 multi-step questions; Comparison to a single-shot RAG baseline

**Non-functional.** Answer accuracy at least 15 points above single-shot RAG; Median 6 tool calls, hard cap 15; Cost under $0.10 per question

**Constraints.** No frameworks; write the loop by hand

**Architecture.** A small loop alternates model calls and tool execution, enforcing budgets and parsing errors; traces feed an evaluator. Components: Agent loop, Tool registry, Budget enforcer, Trace logger, Evaluator, Baseline RAG

**Data.** Public government reports or arXiv abstracts as corpus; questions written by the author

**Milestones.** Corpus and search tool (5 h) · Agent loop and tools (7 h) · Budgeting and error handling (5 h) · 60-question eval set (6 h) · Compare and analyze failures (5 h) · Write-up (2 h)

**Deliverables.** repo; trace viewer page; failure analysis

**Done when.** Accuracy delta >= 15 points over baseline on the 60 questions, hard caps never exceeded.

**Measure.** Accuracy, tool calls per question, cost, loop-failure rate

**Pitfalls.** Agents looping on the same search; Eval questions answerable without tools

**Stretch.** Parallel tool calls; Reflection step ablation

### Natural-language to SQL assistant with safety and execution accuracy
`mx-ai-text2sql-analyst` · Y1-P1 · level 3 · 30 h · Python, sqlglot, SQLite/Postgres, LLM API

**Scenario.** Tradewind Coffee Roasters has a sales Postgres database and non-technical managers who wait days for analyst queries. They want questions turned into read-only SQL with results and the SQL shown.

**Functional.** Schema-aware prompt with sample rows; Read-only SQL enforcement via parser and DB role; Self-repair on SQL errors; Execution-accuracy eval on 80 questions; Results table plus explanation

**Non-functional.** Execution accuracy at least 75% on the 80-question set; Query timeout 5 s, zero write statements possible; p95 end-to-end under 8 s

**Constraints.** Read-only credentials; Local Postgres or SQLite

**Architecture.** The assistant builds a compact schema description, generates SQL, validates it with a parser, executes with timeouts and retries on error. Components: Schema summarizer, SQL generator, Parser guard, Executor, Repair loop, Eval harness

**Data.** Public Chinook or Northwind sample databases, extended with synthetic coffee-sales data

**Milestones.** Database and 80-question gold set with SQL (7 h) · Baseline prompt (4 h) · Safety guard (5 h) · Repair loop and schema linking (7 h) · Eval and error taxonomy (5 h) · Write-up (2 h)

**Deliverables.** repo; error taxonomy; guard test suite

**Done when.** Execution accuracy >= 75%, 20 injection attempts blocked.

**Measure.** Execution accuracy, valid-SQL rate, repair success rate, latency

**Pitfalls.** Comparing SQL strings instead of results; Giant schemas blowing the context

**Stretch.** Add a semantic layer of metrics; Query cost estimation

### Visual defect classifier for a small PCB assembly line
`mx-ai-defect-vision-pcb` · Y1-P1 · level 3 · 30 h · Python, PyTorch, torchvision, Grad-CAM

**Scenario.** Tin Circuit Works inspects 4,000 boards a day by eye and misses solder bridges when tired. They want a camera-based classifier that flags suspect boards for a human.

**Functional.** Train a CNN classifier on defect vs OK crops; Handle class imbalance; Explain flagged regions with Grad-CAM; Operating-point selection favoring recall; Batch inference script on a folder of images

**Non-functional.** Defect recall at least 95% at no more than 10% false-flag rate; Inference under 50 ms per image on GPU; Model under 100 MB

**Constraints.** Small dataset, under 3,000 labeled images

**Architecture.** Transfer learning on a pretrained backbone with heavy augmentation; threshold chosen from a validation recall curve; Grad-CAM overlays aid reviewers. Components: Data loader and augmentation, Trainer, Threshold selector, Grad-CAM viewer, Batch inferencer

**Data.** Public PCB defect datasets (e.g. DeepPCB, PCB defect sets)

**Milestones.** Dataset prep and splits (5 h) · Transfer-learning baseline (6 h) · Imbalance handling and augmentations (6 h) · Threshold and calibration (4 h) · Grad-CAM and error review (5 h) · Write-up (4 h)

**Deliverables.** repo; model card; error gallery

**Done when.** Recall >= 95% with false-flag rate <= 10% on held-out boards; latency < 50 ms.

**Measure.** Recall, precision, PR-AUC, false-flag rate, latency

**Pitfalls.** Test images from the same board as train; Grad-CAM trusted without sanity checks

**Stretch.** Segment defects instead of classifying; Active learning from reviewer feedback

### Fine-tuning a small model to match a brand's support tone
`mx-ai-lora-support-style` · Y1-P1 · level 4 · 32 h · Python, PyTorch, Hugging Face PEFT/TRL, llama.cpp

**Scenario.** Kettle & Co, a kitchenware e-commerce brand, wants a small self-hosted model that replies in their friendly, concise tone, because API costs for 20k replies a month are too high.

**Functional.** Build an instruction dataset of 2,000 reply pairs; LoRA/QLoRA fine-tune of a 3B-8B open model; Compare with few-shot prompting of the same base; Human and judged style rating; Export merged weights and run via llama.cpp

**Non-functional.** Training fits one 24 GB GPU in under 3 hours; Style-win-rate at least 60% vs few-shot base; Serving cost under $30/month

**Constraints.** One 24 GB GPU; Dataset must be synthetic or public

**Architecture.** A data pipeline builds and filters pairs; PEFT trains adapters; an eval harness compares outputs pairwise. Components: Dataset builder, Trainer, Merge/export, Pairwise judge, Serving script

**Data.** Public customer-support dialogue datasets plus LLM-generated brand-style rewrites

**Milestones.** Dataset construction and filtering (7 h) · Baseline few-shot and eval harness (5 h) · LoRA training and ablations (rank, lr) (9 h) · Pairwise evaluation incl. 50 human labels (5 h) · Export and serving test (4 h) · Write-up (2 h)

**Deliverables.** repo; training report; model card

**Done when.** Pairwise win-rate >= 60% over few-shot base and training < 3 h on one 24 GB GPU.

**Measure.** Win-rate, perplexity, factual-error rate, tokens/s, VRAM

**Pitfalls.** Overfitting to templates; Eval judged by the same model that wrote data

**Stretch.** Compare DPO on preference pairs; Evaluate regression on general benchmarks

### Retail shelf gap detection from phone photos
`mx-ai-object-detect-shelf` · Y1-P1 · level 4 · 30 h · Python, PyTorch, Ultralytics-style detector or torchvision, ONNX Runtime

**Scenario.** Marketmile, a convenience-store chain with 90 shops, wants staff to snap a shelf photo and learn which slots are empty. Manual audits miss gaps for hours.

**Functional.** Fine-tune a detector for products and empty gaps; Map detections to shelf rows; Report empty-gap percentage per shelf; Evaluation with mAP and gap-count error; Batch CLI and simple web upload

**Non-functional.** mAP@0.5 at least 0.80 on gap class; Inference under 400 ms per image on CPU-friendly export; Gap-count mean absolute error under 1.0 per shelf

**Constraints.** Model under 50 MB when exported; One consumer GPU for training

**Architecture.** A pretrained detector is fine-tuned, exported to ONNX, and wrapped by post-processing that clusters boxes into rows. Components: Dataset prep, Training script, ONNX export, Row clustering, Upload app, Evaluator

**Data.** Public SKU-110K dataset, with empties synthesized by masking products and labeling gaps

**Milestones.** Dataset conversion and gap synthesis (7 h) · Training and augmentation (8 h) · Row clustering post-processing (5 h) · Export and CPU latency (4 h) · Evaluation and error review (4 h) · Write-up (2 h)

**Deliverables.** repo; eval report; demo GIF

**Done when.** mAP@0.5 on gaps >= 0.80, CPU latency < 400 ms, count MAE < 1.0.

**Measure.** mAP, precision/recall on gaps, count MAE, latency, model size

**Pitfalls.** Synthetic gaps not matching real ones; Dense-scene NMS dropping true boxes

**Stretch.** Planogram compliance checking; INT8 quantization

### Keyword spotting model for an offline kitchen assistant
`mx-ai-voice-command-kws` · Y1-P1 · level 4 · 30 h · Python, PyTorch, TorchAudio, TFLite or ONNX

**Scenario.** Sagebrush Appliances prototypes a smart oven that must understand ten commands offline with a tiny microcontroller-class budget and no cloud.

**Functional.** Train a small keyword spotting CNN on mel features; Add unknown and silence classes; Quantize to INT8; Streaming inference with sliding window; False-accept rate evaluation on long background audio

**Non-functional.** Accuracy at least 94% on 10 commands; False accepts under 1 per hour of background audio; Model under 100 KB and under 20 ms per window

**Constraints.** Fits a 256 KB RAM class device budget

**Architecture.** Audio is converted to log-mel features, a depthwise-separable CNN classifies one-second windows, and a smoothing layer reduces false triggers. Components: Feature extractor, Model, Quantizer, Streaming wrapper, Long-audio evaluator

**Data.** Public Google Speech Commands dataset plus background noise sets

**Milestones.** Data pipeline and features (5 h) · Baseline CNN (6 h) · Unknown/silence handling and augmentation (6 h) · INT8 quantization (5 h) · Streaming and false-accept testing (5 h) · Write-up (3 h)

**Deliverables.** repo; size/latency table

**Done when.** Accuracy >= 94%, < 1 false accept/hour, model < 100 KB.

**Measure.** Accuracy, FRR/FAR, model size, latency, RAM

**Pitfalls.** Evaluating FAR on clean test only; Quantization accuracy cliff

**Stretch.** Run on an actual microcontroller; Speaker-adaptive wake word

### Session-based recommender for a streaming music app
`mx-ai-rec-session-gru` · Y1-P1 · level 4 · 32 h · Python, PyTorch, FAISS, FastAPI

**Scenario.** Echoplay, a niche music-streaming app, has mostly anonymous listeners, so user-based recommenders fail. They want next-track suggestions from the current session only.

**Functional.** Session builder from listening events; Item-kNN and Markov baselines; GRU or transformer next-item model; Offline evaluation with HitRate and MRR; Low-latency candidate API

**Non-functional.** HitRate@20 at least 20% above item-kNN; API p99 under 40 ms; Training under 1 hour on one GPU

**Constraints.** No user identifiers used

**Architecture.** Sessions are split by idle gaps; a sequence model scores next items against an item embedding index; the API takes the last N tracks. Components: Sessionizer, Baselines, Sequence model, Evaluator, Candidate API

**Data.** Public Last.fm 1K or Spotify-like listening logs

**Milestones.** Sessionization and splits (4 h) · Baselines (5 h) · Sequence model training (9 h) · Evaluation and ablations (6 h) · Serving and latency test (5 h) · Write-up (3 h)

**Deliverables.** repo; ablation table

**Done when.** HitRate@20 >= 1.2x item-kNN, p99 < 40 ms.

**Measure.** HitRate, MRR, coverage, latency, training time

**Pitfalls.** Evaluating on sessions seen in training; Ignoring popularity baseline strength

**Stretch.** Add contextual features like time of day; Sampled softmax loss comparison

### LLM-as-judge calibration harness for a summarization team
`mx-ai-llm-eval-judge-lab` · Y1-P1 · level 4 · 30 h · Python, pandas, scipy, LLM APIs

**Scenario.** Dispatchwire, a news-digest startup, ranks summarizer versions with an LLM judge but suspects it prefers long outputs. They need to know how far the judge can be trusted.

**Functional.** Collect 200 summary pairs with human preference labels; Judge prompts with and without rubrics; Bias probes: length, position, self-preference; Agreement and confidence intervals; Recommendation on judge setup

**Non-functional.** Report agreement with bootstrap 95% CI; Position-bias flip rate under 10% after mitigation; Total judging cost under $30

**Constraints.** Human labels done by the author on 200 pairs

**Architecture.** A pairwise judge runs with swapped positions and rubric variants; analysis scripts quantify bias and calibrate by length. Components: Pair dataset, Judge runner, Bias probes, Statistics module, Report generator

**Data.** Public CNN/DailyMail or XSum summaries with machine-generated variants

**Milestones.** Pair generation and human labeling (8 h) · Judge prompt variants (5 h) · Bias probes (7 h) · Stats and calibration (6 h) · Report (4 h)

**Deliverables.** repo; technical report

**Done when.** Agreement reported with CI, flip rate < 10% with swapped-position averaging, length bias quantified.

**Measure.** Cohen's kappa, accuracy vs humans, flip rate, length-correlation, cost

**Pitfalls.** Too few labels to resolve differences; Judge sees model names

**Stretch.** Fine-tune a small judge; Multi-judge ensembles

### MCP gateway with auth, rate limits and tool allowlists
`mx-ai-agent-mcp-gateway` · Y1-P1 · level 4 · 32 h · Python or Go, MCP SDK, asyncio, Prometheus metrics

**Scenario.** Redwood Analytics lets three internal agents call 12 MCP tool servers and wants one gateway enforcing who can call what, with quotas and logs.

**Functional.** Proxy MCP requests to upstream servers; Per-agent tool allowlists; Token-bucket rate limits; Structured audit log with redaction; Health checks and failover

**Non-functional.** Gateway overhead under 10 ms p95; Sustains 500 requests/s on one core; Zero allowlist bypasses in 50 negative tests

**Constraints.** Stateless gateway, config from files

**Architecture.** A gateway sits between agents and upstream MCP servers, authenticating each request, checking policy and forwarding. Components: Auth layer, Policy engine, Rate limiter, Router/proxy, Audit logger, Test suite

**Data.** Synthetic mock MCP servers

**Milestones.** Protocol study and mock upstreams (5 h) · Proxy and routing (7 h) · Policy and rate limits (7 h) · Audit and metrics (5 h) · Load and negative tests (5 h) · Write-up (3 h)

**Deliverables.** repo; policy docs; load-test report

**Done when.** p95 overhead < 10 ms at 500 req/s, all 50 negative tests blocked.

**Measure.** Overhead latency, throughput, block rate, memory

**Pitfalls.** Policy checks only on tool names, not arguments; Logging secrets

**Stretch.** Per-tool schema validation; Human-approval hooks

### Multimodal RAG over scanned equipment manuals
`mx-ai-rag-pdf-multimodal` · Y1-P1 · level 4 · 32 h · Python, PyMuPDF, OCR engine, a vision-language model

**Scenario.** Ironbridge Maintenance's technicians search 40 scanned manuals with diagrams and tables on tablets in the field. Text-only search misses answers that live in figures.

**Functional.** Page-level image and text indexing; Vision-language or OCR+caption pipeline for figures; Retrieval returns page images with highlighted regions; Answer generation citing pages; Eval on 80 questions, half needing figures

**Non-functional.** Recall@5 at least 0.85 on figure questions; p95 under 8 s; Index of 4,000 pages under 2 GB

**Constraints.** Runs on one 16 GB GPU or API only

**Architecture.** Pages are rendered, OCRed and captioned; a mixed index retrieves pages; a VLM answers using page images. Components: PDF renderer, OCR, Figure captioner, Index, Answerer, Eval set

**Data.** Public technical manuals with open licenses (e.g. government-published equipment manuals)

**Milestones.** Corpus and 80 questions (7 h) · OCR and text index (5 h) · Figure captioning/page embeddings (8 h) · Answering with page images (6 h) · Evaluation (4 h) · Write-up (2 h)

**Deliverables.** repo; eval report

**Done when.** Recall@5 >= 0.85 for figure questions and p95 < 8 s.

**Measure.** Recall@k by question type, answer accuracy, latency, index size

**Pitfalls.** Caption hallucinations; Page-level granularity too coarse

**Stretch.** Late-interaction page retrieval; Region-level citations

### Vibration anomaly detection for factory pumps
`mx-ai-anomaly-iot-vibration` · Y1-P1 · level 4 · 30 h · Python, NumPy/SciPy, scikit-learn, PyTorch

**Scenario.** Steelmark Foundry has 60 pumps with accelerometers and few labeled failures. They want early warning on abnormal vibration with alerts maintenance can trust.

**Functional.** Windowed spectral feature extraction; Unsupervised baseline (isolation forest) and autoencoder; Alert logic with persistence and cooldown; Evaluation on injected faults; Dashboard-ready CSV/metrics export

**Non-functional.** Detect injected faults with at least 90% recall within 60 s; False alerts under 1 per pump per month; Scoring 60 streams in real time on a laptop

**Constraints.** No labeled failures for training

**Architecture.** Streaming windows are featurized (FFT bands, RMS, kurtosis) and scored by a model of normal behavior; alerts require persistence. Components: Feature extractor, Normal-behavior model, Alert state machine, Fault injector, Evaluator

**Data.** Public bearing datasets (CWRU, NASA IMS) plus synthetic pump signals

**Milestones.** Signal features (6 h) · Baselines (5 h) · Autoencoder (6 h) · Alert logic and fault injection (7 h) · Evaluation (4 h) · Write-up (2 h)

**Deliverables.** repo; evaluation report

**Done when.** 90% injected-fault recall within 60 s and < 1 false alert/pump/month on held-out normal data.

**Measure.** Recall, detection delay, false alerts per month, throughput

**Pitfalls.** Tuning thresholds on the test faults; Non-stationary operating modes

**Stretch.** Operating-mode conditioning; Remaining-useful-life regression

### Input/output guardrail service for a banking chatbot
`mx-ai-llm-guardrails-service` · Y1-P1 · level 4 · 32 h · Python, scikit-learn or small transformer, Presidio-like regexes, FastAPI

**Scenario.** Meridian Credit Union is piloting a chatbot and compliance requires blocking prompt injection, PII leaks and off-topic advice before the model replies.

**Functional.** Input classifier for injection and off-topic; PII detection and redaction on output; Policy rules engine with reason codes; Red-team test set of 300 attacks; Decision log for compliance

**Non-functional.** Block at least 90% of attacks at under 3% false-block on benign queries; Added latency under 150 ms p95; Throughput 100 requests/s

**Constraints.** Runs locally, no extra external calls

**Architecture.** A pipeline of cheap rules then a small classifier then optional LLM check; decisions logged with reasons. Components: Rule engine, Classifier, PII detector, Policy config, Red-team set, Decision log

**Data.** Public prompt-injection datasets plus synthetic banking queries

**Milestones.** Threat model and test set (6 h) · Rules and PII (6 h) · Classifier training (7 h) · Pipeline and latency tuning (6 h) · Evaluation and ablation (5 h) · Write-up (2 h)

**Deliverables.** repo; threat model; eval report

**Done when.** Attack block rate >= 90%, false-block <= 3%, p95 added latency < 150 ms.

**Measure.** Block rate by attack class, false-block, latency, throughput

**Pitfalls.** Train/test overlap of attack templates; Overblocking benign money terms

**Stretch.** Adaptive attacker loop; Multilingual attacks

### Handwritten form digitizer for a rural health clinic network
`mx-ai-ocr-handwriting-forms` · Y1-P1 · level 4 · 30 h · Python, OpenCV, PyTorch, small web UI

**Scenario.** Valley Health Outreach collects paper intake forms at 30 village clinics and re-enters them weekly. They want field-level handwriting recognition with a verification screen.

**Functional.** Detect form fields from a fixed template; Recognize handwritten digits and short text; Confidence-based verification queue; Field-level accuracy report; Export to CSV

**Non-functional.** Digit-field accuracy at least 98% after verification of the bottom 15% confidence; Process a page in under 3 s on CPU; Model under 60 MB

**Constraints.** Offline, CPU-only

**Architecture.** Template alignment crops fields; a small recognizer reads each; low-confidence fields go to a verification UI. Components: Template aligner, Field cropper, Recognizer, Confidence model, Verification UI

**Data.** Public IAM handwriting and MNIST/EMNIST datasets composited onto synthetic forms

**Milestones.** Synthetic form generator (6 h) · Alignment and cropping (5 h) · Recognizer training (8 h) · Confidence and verification queue (6 h) · Evaluation (3 h) · Write-up (2 h)

**Deliverables.** repo; accuracy report; demo GIF

**Done when.** 98% digit-field accuracy with <= 15% fields reviewed; < 3 s per page.

**Measure.** Field accuracy, review fraction, CER, latency

**Pitfalls.** Synthetic-to-real gap; Misaligned crops from skewed scans

**Stretch.** Real-scan fine-tuning; Language-model correction for names

### Embedding search service for 5 million product listings
`mx-ai-serve-embeddings-batch` · Y2 · level 4 · 32 h · Python, sentence-transformers, FAISS or hnswlib, FastAPI

**Scenario.** Bazaarly, a classifieds site, wants semantic search over 5M listings on a modest budget, with daily incremental updates.

**Functional.** Batch embedding pipeline with checkpointing; ANN index (HNSW/IVF-PQ) built and updated incrementally; Hybrid filter plus vector query; Recall vs latency tuning; Query API

**Non-functional.** Recall@10 >= 0.95 vs exact search; p99 query under 80 ms at 200 QPS; Index memory under 12 GB

**Constraints.** One 16 GB RAM server

**Architecture.** A GPU/CPU batch embedder writes shards; an ANN index serves queries with metadata filters; incremental delta indexes merge nightly. Components: Embedder, Shard store, ANN index, Filter engine, Query API, Benchmark harness

**Data.** Public Amazon product review/metadata datasets scaled with synthetic duplication

**Milestones.** Embedding pipeline (7 h) · Index types and recall benchmarks (8 h) · Filters and hybrid queries (6 h) · Incremental updates (5 h) · Load test (4 h) · Write-up (2 h)

**Deliverables.** repo; benchmark report

**Done when.** Recall@10 >= 0.95, p99 < 80 ms at 200 QPS, RAM < 12 GB.

**Measure.** Recall, QPS, latency percentiles, memory, build time

**Pitfalls.** Recall measured on easy queries; Filters destroying ANN recall

**Stretch.** Product quantization tuning; Matryoshka dimension truncation

### Canary deployment and drift monitoring for a pricing model
`mx-ai-model-serving-canary` · Y2 · level 4 · 30 h · Python, FastAPI, Docker Compose, Prometheus, scikit-learn

**Scenario.** Carvana-like used-car marketplace Autoloop, runs a price model that silently degraded after a market shift. They want canary rollout, shadow scoring and drift alerts.

**Functional.** Model registry with versions; Traffic splitting with canary percentage; Shadow scoring and comparison; PSI/KS drift monitors on inputs and outputs; Automatic rollback rule

**Non-functional.** Rollback within 60 s of triggered rule; Router overhead under 5 ms p95; Drift alerts on injected shift within 1 hour of data

**Constraints.** Local containers, no managed cloud

**Architecture.** A router service sends traffic to stable and candidate models, logs predictions, and a monitor job compares distributions. Components: Registry, Router, Shadow logger, Drift monitor, Rollback controller

**Data.** Public used-car price dataset; shift injected synthetically

**Milestones.** Train two model versions (4 h) · Router and registry (7 h) · Shadow scoring (5 h) · Drift monitors (7 h) · Rollback automation and tests (5 h) · Write-up (2 h)

**Deliverables.** repo; runbook; drift demo

**Done when.** Injected drift detected in < 1 h of simulated traffic; rollback < 60 s.

**Measure.** Detection delay, false alarm rate, router overhead

**Pitfalls.** Thresholds on PSI causing alert fatigue; Comparing models on different samples

**Stretch.** Bayesian traffic allocation; Performance monitoring with delayed labels

### Cost-aware LLM router for a document-processing company
`mx-ai-llm-inference-cost-router` · Y2 · level 4 · 30 h · Python, scikit-learn, LLM APIs or local small/large models

**Scenario.** Lexmill processes 2M document queries a month at rising API cost. Most are easy; they want a router sending easy queries to a cheap model and hard ones to a strong one.

**Functional.** Difficulty predictor trained on past outputs; Router choosing among 3 models; Fallback on low-confidence cheap answers; Cost-quality frontier analysis; Cache for repeated queries

**Non-functional.** Cost reduction of at least 40% at quality drop under 2 points; Router overhead under 20 ms; Cache hit rate reported at 30% repeat traffic

**Constraints.** Mock or low-cost models acceptable

**Architecture.** A classifier predicts whether the cheap model suffices; escalation on self-reported uncertainty; evaluation traces the cost-quality curve. Components: Query logger, Difficulty classifier, Router, Cache, Frontier analyzer

**Data.** Public QA benchmarks (e.g. TriviaQA, GSM8K mix) as query workload

**Milestones.** Workload and model scoring (7 h) · Difficulty classifier (7 h) · Router and cache (7 h) · Frontier analysis (5 h) · Write-up (4 h)

**Deliverables.** repo; cost-quality plot report

**Done when.** 40% cost cut with <= 2 point quality loss on mixed workload.

**Measure.** Cost per 1k queries, quality, escalation rate, overhead

**Pitfalls.** Classifier trained on easy-biased samples; Quality measured by weak automatic metric

**Stretch.** Cascade with speculative parallel calls; Per-customer routing policies

### Edge deployment of a vision model across CPU, GPU and NPU-class targets
`mx-ai-onnx-edge-vision-benchmark` · Y2 · level 4 · 30 h · Python, PyTorch, ONNX Runtime, TFLite, OpenVINO optional

**Scenario.** Wildcam Labs ships wildlife camera traps with limited power. They must choose export format, precision and runtime to hit battery targets.

**Functional.** Export model to ONNX and compare runtimes; INT8 post-training quantization with calibration; Latency, memory and accuracy table per target; Energy proxy via CPU-time measurement; Recommendation memo

**Non-functional.** Accuracy loss under 1 point after INT8; Latency under 100 ms per image on a Raspberry Pi class CPU; Model under 20 MB

**Constraints.** Hardware available to author only

**Architecture.** A benchmark harness runs the same images through each runtime/precision and records metrics. Components: Exporters, Calibrator, Benchmark harness, Report generator

**Data.** Public iNaturalist or Snapshot Serengeti subset

**Milestones.** Baseline model and eval (5 h) · Exports (6 h) · Quantization and calibration (8 h) · Benchmark harness (7 h) · Memo (4 h)

**Deliverables.** repo; benchmark tables; memo

**Done when.** INT8 accuracy drop <1 point, <100 ms on target CPU, <20 MB.

**Measure.** Accuracy, latency p50/p95, memory, size

**Pitfalls.** Calibration set not representative; Benchmarks with warm cache only

**Stretch.** Pruning plus quantization; Knowledge distillation to smaller backbone

### Production monitoring for a RAG system's retrieval quality
`mx-ai-rag-eval-drift-monitor` · Y2 · level 4 · 30 h · Python, SQLite or DuckDB, FastAPI

**Scenario.** Altus Legal runs a case-law RAG in production and wants to catch silent quality drops after index updates, with no labels in production.

**Functional.** Log queries, retrieved chunks and answers; Proxy metrics: retrieval score distributions, answer-citation agreement; Canary query set replayed after every index change; Alerts on regression; Dashboard data export

**Non-functional.** Detect an injected index corruption within 1 hour; False alert rate under 1 per week; Canary replay of 200 queries in under 3 minutes

**Constraints.** Local stack

**Architecture.** A logging layer feeds proxy metric computation and a scheduled canary job that compares to baselines. Components: Logger, Proxy metrics, Canary runner, Alerting rules, Dashboard export

**Data.** Public legal text (e.g. CourtListener-style opinions) with synthetic queries

**Milestones.** Instrumentation (6 h) · Proxy metrics (7 h) · Canary set and runner (7 h) · Fault injection study (6 h) · Write-up (4 h)

**Deliverables.** repo; monitoring design doc

**Done when.** Injected corruption detected < 1 h, < 1 false alert/week on stable data.

**Measure.** Detection delay, false alert rate, proxy-metric correlation with true quality

**Pitfalls.** Proxy metrics uncorrelated with quality; Canary set going stale

**Stretch.** Auto-generated canaries from logs; Root cause hints

### Distilling an LLM labeler into a cheap production classifier
`mx-ai-llm-distill-classifier` · Y2 · level 4 · 28 h · Python, scikit-learn or small transformer, LLM API

**Scenario.** Parcelhub classifies 3M shipment exceptions monthly with an LLM at high cost. They want a small distilled model with equal quality on the common classes and LLM fallback on rare ones.

**Functional.** LLM labels a 20k sample with audit; Train a small model on those labels; Confidence-based fallback to LLM; Cost model for the hybrid; Drift check on label distribution

**Non-functional.** Agreement with LLM >= 95% on common classes; Hybrid cost at least 80% below all-LLM; Small model serving 1,000 req/s on CPU

**Constraints.** CPU serving

**Architecture.** An LLM generates training labels; a small encoder or TF-IDF model handles most traffic; low confidence escalates. Components: Labeler, Audit set, Student model, Confidence router, Cost model

**Data.** Public logistics/complaint text datasets plus synthetic shipment notes

**Milestones.** Taxonomy and LLM labeling (6 h) · Audit and student training (8 h) · Fallback routing (6 h) · Cost model (4 h) · Write-up (4 h)

**Deliverables.** repo; cost analysis

**Done when.** 95% agreement, 80% cost cut, 1,000 req/s.

**Measure.** Agreement, escalation rate, cost, throughput

**Pitfalls.** Student inheriting LLM biases; Confidence overestimated

**Stretch.** Active relabeling of escalations; Multilingual notes

### Fine-tuning a small model for pull-request review comments
`mx-ai-finetune-code-review-model` · Y2 · level 5 · 35 h · Python, PyTorch, PEFT/TRL, vLLM or llama.cpp

**Scenario.** Gearloop Software wants a small self-hosted model that drafts first-pass review comments on diffs, because they cannot send source code to a third party.

**Functional.** Build diff-comment pairs from permissively licensed repositories; Supervised fine-tune of a 7B model with QLoRA; Judge-based and human evaluation of usefulness; Hallucination rate on nonexistent symbols; Serving with vLLM-style batching

**Non-functional.** Usefulness win-rate at least 55% vs base model; Comment latency under 10 s on a 24 GB GPU; Training under 8 hours

**Constraints.** One 24 GB GPU; Only permissive-licensed data

**Architecture.** Data mining and filtering produces pairs; QLoRA trains adapters; an eval harness checks symbol validity and judge preference. Components: Data miner, Filter, Trainer, Symbol checker, Judge, Server

**Data.** Public permissively licensed GitHub review datasets (e.g. CodeReviewer)

**Milestones.** Mining and filtering (8 h) · Baseline eval (5 h) · QLoRA training (9 h) · Symbol hallucination checker (5 h) · Eval and error analysis (5 h) · Write-up (3 h)

**Deliverables.** repo; training report; model card

**Done when.** Win-rate >= 55% and hallucinated-symbol rate reduced vs base, training under 8 h.

**Measure.** Win-rate, hallucinated symbols, comment acceptance proxy, latency

**Pitfalls.** Review comments in data being low quality; License contamination

**Stretch.** DPO from accepted vs rejected comments; Retrieval of repo context

### Adapting speech recognition to a call center's accent and jargon
`mx-ai-asr-domain-adapt` · Y2 · level 5 · 32 h · Python, PyTorch, Hugging Face Transformers, jiwer

**Scenario.** Southline Insurance transcribes claim calls where jargon and accents push error rates over 25%. They want a fine-tuned open ASR model with measured gains.

**Functional.** Prepare paired audio-transcript data with augmentation; Fine-tune a Whisper-class model; Domain vocabulary biasing; WER by accent and term; Inference speed comparison

**Non-functional.** Relative WER reduction of at least 25% on held-out calls; Real-time factor under 0.3 on one GPU; Training within 6 hours on 24 GB

**Constraints.** Public or synthetic audio only

**Architecture.** Fine-tuning with augmentation, plus LM or prompt biasing for jargon, evaluated on stratified test sets. Components: Data prep, Augmenter, Trainer, Biasing module, WER evaluator

**Data.** Public Common Voice accents subsets plus TTS-synthesized claim-script audio

**Milestones.** Data and synthetic jargon speech (8 h) · Baseline WER (4 h) · Fine-tuning runs (9 h) · Term biasing (5 h) · Stratified evaluation (4 h) · Write-up (2 h)

**Deliverables.** repo; WER report

**Done when.** 25% relative WER reduction on held-out set, RTF < 0.3.

**Measure.** WER, term recall, RTF, WER by accent

**Pitfalls.** Training on TTS audio only and overfitting its voice; Catastrophic forgetting

**Stretch.** Distil to smaller model; Streaming decoding

### Real-time feature pipeline for card fraud scoring
`mx-ai-stream-fraud-features` · Y2 · level 5 · 30 h · Python or Rust, Redis, a log (Kafka-lite or files), pandas

**Scenario.** Payfern outgrew batch features: they need velocity features such as transactions per card in the last 5 minutes computed in streaming, consistent with training.

**Functional.** Stream processor computing windowed aggregates; Online/offline feature parity checks; Feature store with TTL; Replay of historical streams to build training sets; Point-in-time correct joins

**Non-functional.** Feature freshness under 1 s; Handle 5,000 events/s on one machine; Online/offline mismatch under 0.1% of values

**Constraints.** Single node, no managed cloud

**Architecture.** An event log feeds a windowed aggregator updating a key-value store; the same logic replays history for training. Components: Event generator, Windowed aggregator, Online store, Replay tool, Parity checker

**Data.** Synthetic transaction stream or the public IEEE-CIS fraud data replayed

**Milestones.** Event stream and spec of features (5 h) · Streaming aggregator (9 h) · Online store and TTL (5 h) · Replay and point-in-time joins (7 h) · Parity and throughput tests (4 h)

**Deliverables.** repo; parity report; benchmark

**Done when.** 5,000 ev/s sustained, freshness < 1 s, mismatch < 0.1%.

**Measure.** Throughput, freshness lag, parity mismatch, memory

**Pitfalls.** Training-serving skew from different time definitions; Late events

**Stretch.** Exactly-once semantics; Feature backfill service

### Benchmarking tool-using agents on a synthetic IT-helpdesk world
`mx-ai-llm-agent-eval-sandbox` · Y2 · level 5 · 32 h · Python, Pydantic, LLM APIs, pandas

**Scenario.** Opsmind, an IT-services firm, wants to compare agent designs on realistic tasks like resetting accounts, but cannot test on live systems. They need a simulated environment with graded outcomes.

**Functional.** Simulated IT environment with users, groups, tickets and tools; 50 tasks with state-based graders; Run harness for multiple agent designs; Failure taxonomy; Statistics across seeds

**Non-functional.** Environment step under 20 ms; Grader exact on 50 tasks, verified by gold trajectories; Each full run under $5

**Constraints.** No live systems, deterministic env given seed

**Architecture.** A deterministic simulator exposes tools; graders compare final environment state against goals; a harness runs agents repeatedly. Components: Simulator, Tool API, Task set, State graders, Run harness, Analysis

**Data.** Fully synthetic environment

**Milestones.** Simulator and tool API (8 h) · Tasks and graders (8 h) · Harness (6 h) · Agent variants and runs (6 h) · Failure taxonomy and write-up (4 h)

**Deliverables.** repo; benchmark report

**Done when.** All gold trajectories pass graders; results with CI over 5 seeds.

**Measure.** Success rate with CI, steps, cost, failure categories

**Pitfalls.** Graders checking trajectory instead of state; Tasks leaking solutions in prompts

**Stretch.** Adversarial tasks; Comparison of planning strategies

### Quality regression guard for quantized LLM deployments
`mx-ai-llm-serving-quality-guard` · Y2 · level 5 · 30 h · Python, llama.cpp or vLLM, AutoGPTQ/AWQ, scipy

**Scenario.** Nimbus Notes ships a quantized 8B model to cut GPU cost, but a quantization change once degraded summaries unnoticed. They want automated quality gates on every build.

**Functional.** Build INT4/INT8 variants of a model; Task suite for summaries, extraction, reasoning; Statistical test deciding pass or fail; Perplexity and task metrics; Cost and speed tradeoff table

**Non-functional.** Gate runs in under 30 minutes; Detects a 3-point quality drop with power 0.9; Speedup of at least 1.5x for passing variant

**Constraints.** One 24 GB GPU

**Architecture.** A CI job quantizes, benchmarks and tests with paired statistics, outputting pass/fail with the cost-quality table. Components: Quantization step, Task suite, Stats gate, Report

**Data.** Public benchmarks (e.g. HellaSwag, GSM8K, XSum subsets)

**Milestones.** Variants and baseline (6 h) · Task suite (7 h) · Statistical gate and power analysis (8 h) · CI wiring (5 h) · Report (4 h)

**Deliverables.** repo; gate spec; results

**Done when.** Gate catches a seeded 3-point drop at 90% power and runs < 30 min.

**Measure.** Quality delta with CI, speedup, memory, power

**Pitfalls.** Underpowered tests; Eval contamination

**Stretch.** Per-task thresholds; Mixed-precision layers

### Two-tower retrieval and ranking for a marketplace feed
`mx-ai-recsys-two-tower-gpu` · Y2 · level 5 · 32 h · Python, PyTorch, FAISS, LightGBM

**Scenario.** Craftloop, a handmade-goods marketplace, wants a feed that blends retrieval and ranking under 100 ms, with offline metrics tied to purchases.

**Functional.** Two-tower retrieval model with in-batch negatives; Ranker with feature crosses; ANN serving; Offline NDCG and purchase-proxy evaluation; Cold-start via content features

**Non-functional.** Recall@100 at least 30% above popularity+content baseline; End-to-end p99 under 100 ms; Training under 2 hours

**Constraints.** One GPU

**Architecture.** A two-tower model builds embeddings indexed with ANN; a GBM or small NN ranks the candidates. Components: Data prep, Two-tower trainer, ANN index, Ranker, Serving API

**Data.** Public Amazon reviews or Retailrocket e-commerce events

**Milestones.** Data and baselines (5 h) · Two-tower training (9 h) · Ranker (7 h) · Serving (6 h) · Evaluation and write-up (5 h)

**Deliverables.** repo; offline eval report

**Done when.** Recall@100 +30% and p99 < 100 ms.

**Measure.** Recall, NDCG, latency, training time, coverage

**Pitfalls.** Sampling bias in negatives; Leakage from future interactions

**Stretch.** Multi-task ranking; Position-debiased training

### Streaming speech recognition with low latency for live captions
`mx-ai-whisper-streaming-asr` · Y2 · level 5 · 30 h · Python, faster-whisper, WebSockets

**Scenario.** Civic Stream captions council meetings for 40 towns. Batch Whisper lags 20 seconds; they need captions within 2 seconds.

**Functional.** Chunked streaming with overlap and stabilization; Endpoint detection; Partial vs final hypothesis handling; Latency/WER tradeoff study; WebSocket caption server

**Non-functional.** Caption lag under 2 s p95; WER within 2 points of offline decode; Handle 10 concurrent streams on one GPU

**Constraints.** One GPU

**Architecture.** A streaming decoder emits partial text from sliding windows; stabilization policy avoids flicker; a server broadcasts captions. Components: Audio buffer, Streaming decoder, Stabilizer, WebSocket server, Evaluator

**Data.** Public AMI or LibriSpeech streamed from files

**Milestones.** Offline baseline (4 h) · Streaming decoder (9 h) · Stabilization (6 h) · Server and concurrency (7 h) · Evaluation (4 h)

**Deliverables.** repo; latency/WER report

**Done when.** p95 lag < 2 s, WER within 2 points of offline, 10 streams concurrently.

**Measure.** Lag, WER, flicker rate, GPU utilization

**Pitfalls.** Word flicker; Cutting words at chunk boundaries

**Stretch.** Speculative decoding; Speaker labels live

### Counterfactual evaluation of a search ranker from logs
`mx-ai-ab-test-ranker-sim` · Y3 · level 5 · 30 h · Python, NumPy, LightGBM

**Scenario.** Quickfind, a job board, wants to test a new ranker without risking traffic, using logged clicks from the old one, which are biased by position.

**Functional.** Click log simulator with position bias; Inverse propensity and doubly robust estimators; Unbiased learning-to-rank baseline; Estimator bias/variance study; Decision rule for ship or not

**Non-functional.** Estimator error under 5% of true lift on simulated data; Estimate 1M logged impressions in under 30 s; 95% CI coverage between 92 and 98%

**Constraints.** Simulated ground truth

**Architecture.** A simulator generates logs from known relevance; estimators are compared with the true online lift. Components: Click simulator, Estimators, LTR trainer, Study harness, Report

**Data.** Synthetic click simulator; optional public Yahoo learning-to-rank set

**Milestones.** Simulator (6 h) · IPS and DR estimators (8 h) · Unbiased LTR (7 h) · Variance/bias study (6 h) · Report (3 h)

**Deliverables.** repo; technical report

**Done when.** Estimator error < 5% of true lift and CI coverage 92-98% across 200 simulation seeds.

**Measure.** Bias, variance, CI coverage, runtime

**Pitfalls.** Propensity clipping hiding bias; Simulator too easy

**Stretch.** Off-policy bandit learning; Interleaving comparison

### Knowledge-graph RAG for drug-interaction questions
`mx-ai-kg-rag-pharma` · Y3 · level 5 · 32 h · Python, NetworkX or a graph DB, LLM API

**Scenario.** Medisure Pharmacy Group wants pharmacists to ask multi-hop questions like which of a patient's medicines interact via the same enzyme. Plain vector search misses chains.

**Functional.** Build a graph from structured interaction data; Entity linking of drug names in queries; Graph retrieval of multi-hop paths; LLM answer grounded in retrieved paths; Eval vs vector-only RAG on 80 questions

**Non-functional.** Multi-hop accuracy at least 20 points above vector RAG; Query p95 under 6 s; Graph with 50k edges loaded in under 30 s

**Constraints.** Public data only; not for clinical use

**Architecture.** A property graph stores drugs, enzymes and interactions; the query path links entities, expands neighbors, and prompts with paths. Components: Graph builder, Entity linker, Path retriever, Answerer, Eval set

**Data.** Public DrugBank-style open data (e.g. DDInter, Hetionet)

**Milestones.** Graph construction (7 h) · Entity linking (5 h) · Path retrieval (7 h) · Answering and prompts (5 h) · Eval set and comparison (6 h) · Write-up (2 h)

**Deliverables.** repo; eval report; limitations note

**Done when.** Multi-hop accuracy +20 points over vector-only baseline.

**Measure.** Accuracy by hop count, path recall, latency

**Pitfalls.** Name ambiguity in linking; Path explosion on hubs

**Stretch.** Learned graph embeddings; Temporal knowledge

### Fine-tuned image generator for consistent product photos
`mx-ai-diffusion-product-shots` · Y3 · level 5 · 31 h · Python, diffusers, PyTorch, SAM-class segmenter

**Scenario.** Hearthmade, a ceramics shop with 200 SKUs, wants consistent studio-style backgrounds for phone photos, generated in batch at low cost.

**Functional.** Background removal and compositing pipeline; LoRA fine-tune of a diffusion model on style images; Inpainting around preserved product pixels; Automatic quality filters; Batch run over a folder

**Non-functional.** Product pixel fidelity above 99% inside mask; Generate 200 images in under 30 minutes on a 24 GB GPU; Human acceptability at least 80% on 100 samples

**Constraints.** One 24 GB GPU

**Architecture.** Segment the product, generate a background with a style LoRA, composite, then reject outputs failing quality checks. Components: Segmenter, Style LoRA, Inpainting generator, Quality filter, Batch runner

**Data.** Self-photographed or public product images (e.g. Google Scanned Objects / Open Images)

**Milestones.** Dataset and segmentation (6 h) · LoRA training (8 h) · Inpainting pipeline (7 h) · Quality filters (5 h) · Human eval and write-up (5 h)

**Deliverables.** repo; before/after gallery; eval report

**Done when.** Mask fidelity > 99%, 200 images < 30 min, >= 80% accepted.

**Measure.** Fidelity, acceptance rate, throughput, FID-style proxy

**Pitfalls.** Product edges leaking artifacts; Style LoRA memorizing training backgrounds

**Stretch.** ControlNet for lighting; Video turntable generation

### Low-resource text-to-speech for a public library audio service
`mx-ai-speech-tts-small-voice` · Y3 · level 5 · 30 h · Python, PyTorch, an open TTS toolkit

**Scenario.** Alder County Library offers audio versions of local notices and wants a locally run TTS in a consenting staff member's voice with fast synthesis.

**Functional.** Record and prepare 1 hour of consented speech; Fine-tune a pretrained TTS model; Text normalization for dates and numbers; MOS-style listening test; Streaming synthesis

**Non-functional.** Real-time factor under 0.2 on GPU; Intelligibility WER via ASR under 5%; Listening test mean at least 3.8/5 with 10 raters

**Constraints.** Only consented voice data; One 24 GB GPU

**Architecture.** Normalized text goes to a fine-tuned acoustic model plus vocoder; evaluation by ASR round trip and listeners. Components: Recording prep, Normalizer, Fine-tuner, Vocoder, Evaluator

**Data.** Public LJSpeech for baseline plus the author's own consented recordings

**Milestones.** Recording and alignment (7 h) · Baseline voice (5 h) · Fine-tuning (8 h) · Text normalization (5 h) · Listening test and ASR eval (5 h)

**Deliverables.** repo; audio samples page; consent and ethics note

**Done when.** WER < 5%, RTF < 0.2, MOS >= 3.8.

**Measure.** MOS, ASR WER, RTF, MCD

**Pitfalls.** Noisy recordings; Voice cloning misuse; include consent guardrails

**Stretch.** Voice watermarking; Multilingual support

### Learned picker routing for a warehouse versus heuristics
`mx-ai-rl-warehouse-routing` · Y3 · level 5 · 35 h · Python, PyTorch, OR-Tools

**Scenario.** Stackhaus Fulfilment's pickers walk 11 km per shift. They want to know if a learned policy beats the S-shape and nearest-neighbor heuristics on batched orders.

**Functional.** Warehouse simulator with aisle layout and order batches; Heuristic baselines and an OR-tools solver; RL or learned heuristic policy; Evaluation on unseen layouts; Walking-distance reduction report

**Non-functional.** Policy inference under 50 ms per route; At least 5% shorter distance than nearest-neighbor on 1,000 unseen batches; Training under 6 hours on one GPU

**Constraints.** One GPU; Synthetic warehouse

**Architecture.** A grid warehouse environment feeds a policy with attention over pick locations; solver results give the near-optimal reference. Components: Simulator, Baselines, Solver reference, Policy, Evaluator

**Data.** Synthetic layouts and orders

**Milestones.** Simulator (7 h) · Baselines and solver (6 h) · Policy training (12 h) · Generalization tests (6 h) · Write-up (4 h)

**Deliverables.** repo; results report

**Done when.** Mean distance >= 5% below nearest-neighbor on unseen layouts; inference < 50 ms.

**Measure.** Distance gap to solver, inference time, generalization gap

**Pitfalls.** Overfitting to layouts; Comparing against weak heuristics only

**Stretch.** Dynamic order arrivals; Multi-picker collisions

### Learned simulator of a conveyor-sorting cell for a robotics lab
`mx-ai-world-model-gridsim` · Y3 · level 5 · 33 h · Python, PyTorch, a 2D physics engine

**Scenario.** A university robotics lab wants a fast learned model of a parcel-sorting cell to train controllers without hours of physics stepping. The model must predict states many steps ahead without drifting.

**Functional.** Collect transitions from a reference physics simulator; Train a latent dynamics model; Multi-step rollout evaluation; Policy trained inside the model and tested in the reference sim; Speed comparison

**Non-functional.** Rollout error at 50 steps under 10% of state range; Model at least 20x faster than reference sim; Policy return in true sim at least 80% of policy trained there

**Constraints.** One GPU; Reference simulator is a simple 2D physics sim you write or an open one

**Architecture.** A latent recurrent model learns dynamics from logged transitions; rollouts are compared with ground truth and used for policy training. Components: Data collector, Dynamics model, Rollout evaluator, Policy trainer, Speed benchmark

**Data.** Self-generated transitions from a simple physics simulator

**Milestones.** Reference sim and data collection (7 h) · Dynamics model training (9 h) · Rollout error studies (6 h) · Policy in imagination (8 h) · Write-up (3 h)

**Deliverables.** repo; research-style report

**Done when.** 50-step error < 10% of range, >= 20x speedup, transfer >= 80%.

**Measure.** Rollout error vs horizon, speedup, transferred return

**Pitfalls.** Compounding error masked by one-step metrics; Exploiting model errors in policy

**Stretch.** Ensemble uncertainty; Image observations

### Diffusion model for tileable game textures
`mx-ai-diffusion-textures-pbr` · Y3 · level 5 · 35 h · Python, PyTorch, diffusers

**Scenario.** Pixelforge Studio, a 6-person game studio, spends days on tileable materials. They want a model generating seamless albedo with matching normal maps from prompts.

**Functional.** Train or fine-tune a small diffusion model on texture crops; Seamless tiling via circular padding; Normal-map prediction from albedo; Prompt conditioning on material class; Tileability metric

**Non-functional.** Seam artifact score below threshold on 95% of samples; 256 px sample in under 3 s on one GPU; Training under 12 hours

**Constraints.** One 24 GB GPU; CC0 textures only

**Architecture.** A latent diffusion model with circular convolutions generates albedo; a small network predicts normals; a seam metric validates. Components: Dataset prep, Diffusion trainer, Circular padding, Normal predictor, Seam metric

**Data.** Public CC0 texture libraries and Describable Textures Dataset

**Milestones.** Dataset prep and labels (6 h) · Diffusion training (12 h) · Seamless tiling (5 h) · Normal-map network (6 h) · Evaluation and write-up (6 h)

**Deliverables.** repo; gallery; metric report

**Done when.** >= 95% of 500 samples pass seam metric; 256px in <3s.

**Measure.** Seam score, FID, sample time, human preference

**Pitfalls.** Seams hidden by cropping; Mode collapse on small data

**Stretch.** Roughness and height maps; Export to engine format

### Frame interpolation for a sports-analytics clip service
`mx-ai-video-interp-slowmo` · Y3 · level 5 · 35 h · Python, PyTorch, ffmpeg

**Scenario.** Replaylab, a coaching-video startup, wants smooth slow-motion from 30 fps phone clips on a single GPU, with artifacts quantified.

**Functional.** Train a flow-based interpolation model on triplets; Occlusion-aware blending; Evaluation PSNR/SSIM/LPIPS on benchmark; Batch video pipeline; Artifact gallery

**Non-functional.** PSNR within 1 dB of published open baseline on a test split; 1080p interpolation at 8 fps or better on one GPU; Memory under 10 GB

**Constraints.** One GPU

**Architecture.** A flow estimator and warping network produce intermediate frames; video IO handles chunking and audio passthrough. Components: Triplet dataset, Flow network, Synthesis network, Metrics, Video pipeline

**Data.** Public Vimeo-90K triplets or UCF101 videos

**Milestones.** Dataset and baseline (6 h) · Model training (12 h) · Occlusion handling (6 h) · Video pipeline (6 h) · Metrics and write-up (5 h)

**Deliverables.** repo; comparison clips; metrics report

**Done when.** PSNR within 1 dB of baseline, >= 8 fps at 1080p.

**Measure.** PSNR, SSIM, LPIPS, fps, VRAM

**Pitfalls.** Metrics not reflecting temporal flicker; Ghosting on fast motion

**Stretch.** Variable-timestep interpolation; Temporal consistency metric

### Monocular depth and mapping for a small indoor delivery robot
`mx-ai-slam-neural-depth` · Y3 · level 5 · 32 h · Python, PyTorch, a pretrained depth model, an open robot simulator

**Scenario.** Hallway Couriers' robot has one cheap camera and no lidar. They need depth estimates good enough to avoid obstacles, with a measured safety margin.

**Functional.** Run a pretrained monocular depth model; Metric-scale recovery with sparse hints; Fuse depth into an occupancy grid; Obstacle-stop evaluation in simulation; Failure-case analysis

**Non-functional.** Depth AbsRel under 0.15 after scale recovery on indoor test; Pipeline at 15 fps on one GPU; No collision in 100 simulated hallway runs

**Constraints.** One GPU; Simulated environment

**Architecture.** Per-frame depth is scaled using wheel odometry, projected to an occupancy grid, and thresholded for stop decisions. Components: Depth model, Scale recovery, Occupancy mapper, Sim harness, Evaluator

**Data.** Public NYU Depth v2 plus simulated hallways

**Milestones.** Depth baseline and eval (6 h) · Scale recovery (7 h) · Occupancy fusion (7 h) · Simulation tests (8 h) · Failure analysis (4 h)

**Deliverables.** repo; demo video; safety analysis

**Done when.** AbsRel < 0.15, 15 fps, 0 collisions in 100 runs.

**Measure.** AbsRel, delta1, fps, collisions, false stops

**Pitfalls.** Glass and mirrors failing; Scale drift

**Stretch.** Learned uncertainty; Loop closure

### Preference-tuning pipeline for a tutoring chatbot
`mx-ai-dpo-preference-pipeline` · Y3 · level 5 · 32 h · Python, PyTorch, TRL

**Scenario.** Mentora, a maths-tutoring app, wants its model to hint rather than reveal answers. They want a full preference-data and DPO pipeline with measured behavior change.

**Functional.** Generate paired responses with hint vs answer behavior; Preference labeling by rubric-judge with human audit; DPO training of a small model; Behavior metrics: answer-leak rate and helpfulness; Capability regression tests

**Non-functional.** Answer-leak rate reduced by at least 50%; MMLU/GSM8K-style regression under 2 points; Training within 6 hours on one 24 GB GPU

**Constraints.** One 24 GB GPU

**Architecture.** Synthetic prompts yield response pairs; a judge labels; DPO trains adapters; evaluations check behavior and capabilities. Components: Prompt generator, Pair generator, Judge, DPO trainer, Evaluators

**Data.** Public GSM8K and MATH problems as prompts

**Milestones.** Prompts and pair generation (7 h) · Judge and audit (7 h) · DPO runs (9 h) · Behavior and regression eval (6 h) · Write-up (3 h)

**Deliverables.** repo; training and eval report

**Done when.** Leak rate -50%, regression < 2 points.

**Measure.** Leak rate, helpfulness, regression delta, reward margin

**Pitfalls.** Judge noise; Over-refusal to give hints

**Stretch.** Compare IPO/KTO; Online DPO

### Privacy-preserving synthetic data generator for a hospital analytics team
`mx-ai-synthetic-data-tabular` · Y3 · level 5 · 32 h · Python, PyTorch, scikit-learn

**Scenario.** Northgate Hospital's analysts cannot share patient tables with a university partner. They want synthetic data preserving utility with measured privacy risk.

**Functional.** Train a tabular generative model (CTGAN-style or diffusion); Utility test: train-on-synthetic test-on-real; Privacy tests: nearest-neighbor and membership inference; Constraints for clinical validity; Report with trade-off curves

**Non-functional.** Utility within 5% AUC of real-trained model; Membership inference AUC under 0.55; Generate 100k rows in under 1 minute

**Constraints.** Public medical data only

**Architecture.** A generator models mixed-type columns; evaluators measure fidelity, utility and leakage. Components: Preprocessor, Generator, Utility evaluator, Privacy attacks, Constraint checker

**Data.** Public MIMIC-demo or UCI heart/diabetes datasets

**Milestones.** Baselines (5 h) · Generator (9 h) · Utility evaluation (6 h) · Privacy attacks (8 h) · Trade-off report (4 h)

**Deliverables.** repo; technical report

**Done when.** Utility gap <= 5% AUC and MIA AUC < 0.55.

**Measure.** TSTR AUC, MIA AUC, DCR distribution, constraint violations

**Pitfalls.** Memorizing rare patients; Fidelity metrics hiding leakage

**Stretch.** Differential privacy; Time-series records

### Long-horizon agent memory for a personal-finance assistant
`mx-ai-agent-memory-longhorizon` · Y3 · level 5 · 32 h · Python, SQLite, embeddings, LLM API

**Scenario.** Penny, a budgeting app, wants an assistant that remembers user goals across months without bloating prompts. Naive full-history prompts exceed context and cost.

**Functional.** Memory store with extract, update, forget operations; Retrieval of relevant memories per turn; Contradiction handling; Benchmark of 100 multi-session dialogues; Comparison with full-history and summary-only

**Non-functional.** Recall accuracy at least 85% on 6-month simulated histories; Prompt tokens at least 70% lower than full history; Memory update p95 under 2 s

**Constraints.** Synthetic users

**Architecture.** A memory manager decides what to store after each turn and retrieves top-k by relevance and recency. Components: Memory schema, Extractor, Retriever, Updater, Benchmark generator

**Data.** Synthetic multi-session dialogues generated from user personas

**Milestones.** Benchmark generator (8 h) · Memory store (7 h) · Update/forget logic (7 h) · Comparisons (6 h) · Write-up (4 h)

**Deliverables.** repo; benchmark and report

**Done when.** Recall >= 85% with >= 70% fewer prompt tokens.

**Measure.** Recall, contradiction accuracy, tokens, latency

**Pitfalls.** Evaluator leaking facts through dialogue style; Stale memories overriding new facts

**Stretch.** Hierarchical memory; Privacy deletion requests

## devops-architecture-security

### Ephemeral preview environments for every pull request
`mx-ops-preview-environments` · Y1-P1 · level 2 · 22 h · Docker, Traefik or Caddy, GitHub Actions, shell or Python

**Scenario.** Sprout Studio, a 12-person web agency, reviews features by cloning branches locally, so designers and clients rarely see work in progress. They want a live URL per pull request that disappears when merged.

**Functional.** Build and deploy a container per PR with a unique hostname; Seed each environment with sample data; Comment the preview URL on the pull request; Clean up environments on merge or after 3 days; Limit total concurrent previews to protect the host

**Non-functional.** Preview ready within 3 minutes of push; Idle preview memory under 200 MB each, 20 concurrent on a 4 GB host; Cleanup leaves 0 orphaned containers or volumes after 50 test PRs

**Constraints.** One small VPS or laptop; Budget under $10/month

**Architecture.** A CI workflow builds the image and tells a small deployer on the host to run it behind a wildcard reverse proxy; a janitor job reaps expired environments. Components: CI workflow, Deployer agent, Reverse proxy routing, Data seeding, Janitor, PR comment bot

**Data.** Sample web app with a small SQLite or Postgres seed generated by script

**Milestones.** Design and sample app (3 h) · CI build and deployer (7 h) · Routing and seeding (5 h) · Janitor and limits (4 h) · Stress with 50 PRs and docs (3 h)

**Deliverables.** repo; setup guide; demo GIF; stress-test notes

**Done when.** Previews are ready within 3 minutes, 20 run concurrently on 4 GB, and 50 test PRs leave no orphans.

**Measure.** Time to preview, memory per preview, orphan count, cost per month

**Pitfalls.** Exposing previews publicly with real data; Disk filling from images; Wildcard TLS setup surprises

**Stretch.** Add basic auth or SSO in front; Add per-PR database branches

### Linux server hardening baseline and automated compliance checks
`mx-ops-linux-server-baseline` · Y1-P1 · level 2 · 20 h · Ubuntu, Ansible, OpenSCAP or Lynis, nftables, fail2ban, bash/Python

**Scenario.** Pixelmint, a three-person game studio, runs build and web servers on default-configured Ubuntu hosts. After a brute-force scare they want a repeatable secure baseline and proof that servers stay compliant.

**Functional.** Write a baseline: SSH hardening, firewall, automatic updates, least-privilege users; Apply it with configuration management idempotently; Automated compliance scan with scored report; Fail2ban-style brute-force protection and log shipping; Drift check run daily with alert on deviation

**Non-functional.** Compliance score above 90% on a CIS-style checklist of 60 checks; Baseline applies to a fresh VM in under 5 minutes; Daily drift check detects 100% of 10 planted deviations

**Constraints.** Free tools only; Two VMs (local) for the exercise

**Architecture.** An Ansible role applies the baseline, an audit script scores it, and a scheduled job compares live state to expected and reports drift. Components: Baseline role, Audit script, Brute-force protection, Log forwarding, Drift checker

**Data.** Local VMs with a planted-deviation script

**Milestones.** Write baseline and checklist (4 h) · Ansible role (6 h) · Audit scoring and drift check (6 h) · Attack simulation and tuning (3 h) · Docs (1 h)

**Deliverables.** repo; baseline document; compliance report; runbook

**Done when.** Compliance exceeds 90% of 60 checks, apply takes under 5 minutes, and all 10 planted deviations are caught.

**Measure.** Compliance score, apply time, drift detection rate, failed login blocks

**Pitfalls.** Locking yourself out of SSH; Applying hardening that breaks services; Scores treated as security

**Stretch.** Add kernel hardening and auditd rules

### Untangle a 220k-line Django monolith into a modular monolith
`mx-ops-modular-monolith` · Y2 · level 3 · 36 h · Python, Django, import-linter, PostgreSQL, GitHub Actions, Graphviz, Locust

**Scenario.** Parcelo, a 45-person parcel-locker startup, has a single Django app where billing, locker control and notifications import each other freely. Releases take two days of manual regression and new hires break unrelated features. The CTO wants enforced module boundaries before any talk of microservices.

**Functional.** Map the import graph and propose 6 bounded modules with owners; Enforce boundaries in CI so forbidden imports fail the build; Replace cross-module ORM joins with explicit module interfaces; Give each module its own database schema and migration set; Publish a module dependency diagram generated from code on every merge

**Non-functional.** Cross-module import violations: 0 on main after migration, from a baseline of 400+; CI boundary check adds under 20 seconds to a 6-minute pipeline; Zero customer-visible regressions: p99 API latency within 5% of baseline at 300 req/s

**Constraints.** Single deployable artifact must remain; Existing 1,800-test suite must keep passing at every merge

**Architecture.** Keep one process but split code into modules exposing only a public API package, with import-linter style rules and per-module schemas. Migration happens in small strangler-style PRs behind the same deploy. Components: Import graph analyzer, Boundary rules in CI, Module public interfaces, Schema separation, Architecture diagram generator, Load-test regression gate

**Data.** Synthetic Django app you generate (e.g. a fork of an open-source e-commerce sample) seeded with 200k fake orders via Faker

**Milestones.** Generate or pick the monolith, measure baseline imports, latency and test time (5 h) · Cluster the import graph and write module charter plus ADR (6 h) · Enforce rules in CI with an allowlist of known violations that shrinks weekly (6 h) · Replace ORM cross-joins with module interfaces for the two worst modules (10 h) · Split schemas and prove migrations run per module (5 h) · Load-test, publish diagrams and write the retrospective (4 h)

**Deliverables.** repo with CI boundary rules; design doc + 3 ADRs; before/after dependency graph; migration playbook

**Done when.** Violation count is 0 on main, p99 latency at 300 req/s is within 5% of baseline, all 1,800 tests pass, and CI overhead is under 20 s.

**Measure.** Violations over time, coupling metrics per module, p99 latency before/after, PR cycle time, lines moved per week

**Pitfalls.** Big-bang refactor that stalls for weeks; Allowlist that never shrinks; Shared utils module becoming a new god module

**Stretch.** Extract one module into a separate service behind the same interface; Add architecture fitness tests for cyclic dependencies

### Golden-path scaffolder CLI with policy checks for a startup
`mx-ops-golden-path-cli` · Y2 · level 3 · 24 h · Go or Rust, text/template, Open Policy Agent (Rego) or custom rules, GitHub Actions

**Scenario.** Ledgerly, a 20-engineer fintech startup, has four incompatible ways services are built and deployed. The founding engineer wants a single command that generates a compliant service skeleton.

**Functional.** Generate a service repo with Dockerfile, CI, health endpoints and telemetry wired in; Offer templates for HTTP API, worker and cron job; Run policy checks locally and in CI (no root containers, pinned base images, required labels); Upgrade existing services to newer template versions with a diff preview

**Non-functional.** Scaffold plus first CI green run in under 5 minutes; Policy check completes in under 10 s on a typical repo; Template upgrade applies cleanly to 90% of 10 sample services

**Constraints.** Single static binary distribution; No network needed for scaffolding

**Architecture.** A CLI renders versioned templates, records the template version in a manifest, and evaluates rules from a policy file. Upgrades are three-way merges against the recorded version. Components: Template engine, Policy rule evaluator, Manifest and versioning, Upgrade differ, CI integration

**Data.** Ten synthetic sample services you generate with deliberate violations

**Milestones.** Design template format and manifest (4 h) · Implement renderer and three templates (7 h) · Policy evaluator with 12 rules (6 h) · Upgrade command with merge preview (5 h) · Docs, tests and release binary (2 h)

**Deliverables.** repo with releases; template authoring guide; policy catalog; demo GIF

**Done when.** New service scaffolds and passes CI in under 5 minutes, policy check under 10 s, and upgrade succeeds on at least 9 of 10 samples.

**Measure.** Scaffold time, policy runtime, upgrade success rate, rule false-positive count

**Pitfalls.** Templates too rigid to adopt; Policy rules with unclear error messages; Merge conflicts in generated files

**Stretch.** Add a telemetry opt-in to measure template adoption

### GitOps delivery for 12 services across three environments
`mx-ops-gitops-12-services` · Y2 · level 3 · 34 h · Kubernetes, Argo CD or Flux, Kustomize, Helm, Sealed Secrets, GitHub Actions

**Scenario.** Kestrel Retail runs 12 services with hand-run kubectl and Helm commands, so staging and production drift constantly. A recent outage came from someone applying a stale manifest.

**Functional.** Single Git repo layout for apps and environments with promotion by pull request; Argo CD or Flux reconciling dev, staging and prod; Automated image tag bumps after CI publishes a build; Drift detection and alert when live state differs from Git; Secret handling that never stores plaintext in Git

**Non-functional.** Merge-to-running in production under 5 minutes; Drift detected and reported within 2 minutes; Full cluster rebuild from Git in under 30 minutes

**Constraints.** Three kind or k3d clusters on one laptop with 16 GB RAM; No manual kubectl apply allowed after cutover

**Architecture.** Git is the single source of truth: kustomize overlays per environment, a controller syncing them, and a promotion bot opening PRs. Secrets are sealed or fetched at runtime. Components: Config repo layout, GitOps controller, Image updater / promotion bot, Drift alerting, Sealed secrets, Disaster rebuild script

**Data.** Twelve small synthetic HTTP services built from one template with different configs

**Milestones.** Design repo layout and promotion policy ADR (4 h) · Stand up clusters and bootstrap the controller (6 h) · Onboard 12 services with overlays (8 h) · Image automation and promotion PRs (6 h) · Drift and rebuild drills (6 h) · Docs and demo (4 h)

**Deliverables.** config repo; bootstrap script; promotion runbook; drift drill report

**Done when.** A merged change reaches prod in under 5 minutes, injected drift alerts within 2 minutes, and a wiped cluster is rebuilt from Git in under 30 minutes.

**Measure.** Lead time merge-to-prod, drift detection time, rebuild time, manual interventions (target 0)

**Pitfalls.** Secrets leaking into Git history; Overlay duplication across environments; Sync loops from mutating webhooks

**Stretch.** Add progressive sync waves for ordered database migrations; Add a PR preview of rendered manifests

### Observability rollout with SLOs for a 15-service checkout platform
`mx-ops-observability-slo-rollout` · Y2 · level 3 · 36 h · OpenTelemetry, Prometheus, Grafana, Tempo or Jaeger, Loki, Python or Go services

**Scenario.** Nomad Freight, a regional logistics startup, finds out about outages from customers. They have logs but no metrics standards or traces across 15 services, and leadership wants measurable reliability targets.

**Functional.** Standard instrumentation library for metrics, logs and traces across services; Define SLIs and SLOs for 5 critical user journeys; Dashboards per journey plus an error budget view; Trace-to-log correlation via shared request IDs; Rollout plan that onboards services in waves

**Non-functional.** Telemetry overhead under 3% CPU and 5 ms p99 per request; Telemetry data cost under $150/month at 2,000 req/s; Mean time to detect injected faults under 3 minutes

**Constraints.** Open-source stack on a single 8 vCPU VM; Sampling required: keep at most 10% of traces

**Architecture.** Services emit OpenTelemetry data to a collector that routes metrics, traces and logs to storage backends. SLO rules are computed from metrics and rendered on dashboards. Components: Instrumentation library, OTel collector pipeline, Metrics and trace backends, SLO definitions as code, Dashboards, Fault injector

**Data.** Synthetic 15-service demo app (checkout, inventory, shipping, etc.) with a load generator

**Milestones.** Define journeys, SLIs and SLO targets with stakeholder-style doc (5 h) · Instrumentation library and collector (8 h) · Backends, sampling and retention (6 h) · SLO-as-code and dashboards (7 h) · Fault injection and detection timing (6 h) · Rollout plan and write-up (4 h)

**Deliverables.** repo with compose/k8s demo; SLO specification doc; dashboards as JSON; detection-time report

**Done when.** All 5 journeys have SLOs with live error budgets, overhead is under 3% CPU and 5 ms p99, and 10 injected faults are detected in under 3 minutes on average.

**Measure.** Telemetry overhead, storage cost per month, detection time, trace coverage percentage, cardinality

**Pitfalls.** High-cardinality labels exploding storage; SLIs that measure server health, not user experience; Sampling that drops the interesting traces

**Stretch.** Add tail-based sampling that keeps all errors; Add exemplar links from metrics to traces

### Burn-rate alerting and on-call design that cuts pager noise by 80%
`mx-ops-burn-rate-alerting` · Y2 · level 3 · 26 h · Prometheus, Alertmanager, Sloth or custom generator, Python for replay, Grafana

**Scenario.** Quillpay's two-person on-call rotation receives 140 alerts a week, mostly noise, and has started ignoring pages. A recent genuine incident sat unacknowledged for 25 minutes.

**Functional.** Audit existing alerts and classify them as page, ticket or delete; Implement multi-window multi-burn-rate SLO alerts; Route alerts by severity with escalation and quiet hours; Attach runbook links and context to every page; Weekly alert-quality report

**Non-functional.** Pages reduced from 140 to under 25 per week on replayed history; No missed true incident across 12 replayed historical incidents; Alert evaluation adds under 1% load to the metrics store

**Constraints.** Replay against a synthetic 30-day metric history; Open-source Alertmanager stack

**Architecture.** Alerting rules are generated from SLO definitions and replayed against recorded metrics to measure precision and recall before deployment. Components: Alert audit tooling, SLO rule generator, Replay harness, Routing config, Runbook templates, Quality report

**Data.** Synthetic 30-day metrics with 12 planted incidents and realistic noise generated by script

**Milestones.** Generate history and audit baseline alerts (5 h) · SLO rule generator with burn-rate windows (6 h) · Replay harness measuring precision/recall (7 h) · Routing, escalation and runbooks (5 h) · Report and tuning (3 h)

**Deliverables.** repo with replay harness; alert policy doc; runbook set; before/after report

**Done when.** On replay, pages fall below 25 per week and all 12 planted incidents still page within their target detection window.

**Measure.** Pages per week, precision, recall, time to page, alerts deleted vs converted to tickets

**Pitfalls.** Tuning to the replay data only; Alerting on causes instead of symptoms; Missing slow-burn issues

**Stretch.** Add automatic alert-fatigue scoring per responder

### Disaster recovery with quarterly tested restores for a 2 TB Postgres estate
`mx-ops-dr-tested-restores` · Y2 · level 3 · 30 h · PostgreSQL, pgBackRest or WAL-G, MinIO or S3-compatible storage, Docker, Python

**Scenario.** Meridian Clinics, a 40-clinic dental network, has nightly backups that nobody has ever restored. Auditors and the insurer now ask for a documented recovery time and recovery point.

**Functional.** Define RTO/RPO per system tier; Continuous WAL archiving plus base backups to object storage; Automated restore test that rebuilds a database and validates it; Point-in-time recovery to an arbitrary timestamp; DR runbook and game-day drill with timings

**Non-functional.** RPO under 5 minutes for tier-1 data; RTO under 45 minutes for a 200 GB database restore; Automated restore verification runs weekly with 100% success reporting

**Constraints.** Budget under $60/month for backup storage in the exercise; Backups must be encrypted at rest

**Architecture.** Base backups and WAL stream to a separate bucket and account; a scheduled job restores into a scratch instance, runs row-count and checksum checks, then reports and destroys it. Components: Backup pipeline, WAL archive, Restore automation, Validation checks, Runbook, Drill scoreboard

**Data.** Synthetic dental-practice schema (patients, appointments, invoices) seeded to 200 GB with a generator

**Milestones.** Tier systems and set RTO/RPO targets (3 h) · Backup and WAL archiving pipeline (6 h) · Automated restore plus validation checks (8 h) · PITR drill and corruption scenario (6 h) · Runbook, timing report and lessons (4 h) · Cost review and retention policy (3 h)

**Deliverables.** repo with automation; DR runbook; drill timing report; retention and cost doc

**Done when.** A 200 GB restore completes in under 45 minutes, PITR lands within 5 minutes of the target timestamp, and the weekly job reports success with checksums matching.

**Measure.** Measured RTO and RPO, restore throughput, verification coverage, storage cost per month

**Pitfalls.** Backups that include corruption; Restoring but never validating application-level data; Credentials needed for restore stored only in the failed system

**Stretch.** Add cross-account immutable backup copies; Add restore of a single table from PITR

### Cut a $38k/month cloud bill by 35% without hurting latency
`mx-ops-cloud-bill-optimisation` · Y2 · level 3 · 28 h · Python, DuckDB or PostgreSQL, Terraform examples, k6, Grafana

**Scenario.** Fernhill, a video-collaboration startup, sees its cloud bill grow 12% per month while revenue grows 4%. The CFO demands a plan with proof that customer experience will not degrade.

**Functional.** Ingest and normalise a synthetic billing export into tagged cost allocation; Find top waste: idle resources, oversized instances, unattached storage, data transfer; Model rightsizing, savings plans and spot adoption with risk ratings; Implement 5 optimisations in a test environment and measure latency impact; Set up budgets and anomaly alerts

**Non-functional.** Projected savings at least 35% of $38k/month; p99 latency regression under 5% in load tests after changes; Cost anomaly detected within 24 hours of a planted spike

**Constraints.** No changes that reduce availability below 99.9%; Analysis reproducible from the billing export alone

**Architecture.** A cost pipeline loads billing line items into a warehouse, tags them by team and service, and a recommendation engine scores optimisations by savings and risk, validated by load tests. Components: Billing ingestion, Allocation and tagging, Waste detectors, Savings model, Load-test validation, Anomaly alerts

**Data.** Synthetic billing export of ~2M line items you generate with realistic skew, modelled on public cloud pricing structure

**Milestones.** Generate billing data and build allocation model (6 h) · Waste detectors and top-10 findings (6 h) · Savings model with commitment scenarios (5 h) · Apply and validate 5 optimisations under load (7 h) · Budgets, anomaly alerts, FinOps report (4 h)

**Deliverables.** repo with analysis notebooks and pipeline; FinOps report; savings model workbook; anomaly alert rules

**Done when.** The model shows at least 35% savings, load tests show p99 within 5% of baseline, and the planted spike alerts within 24 hours.

**Measure.** Savings by category, unit cost per active user, tagging coverage, latency impact, commitment risk

**Pitfalls.** Optimising an unrepresentative month; Savings plans bought before rightsizing; Ignoring data transfer and egress

**Stretch.** Add unit economics per customer tier; Automate scheduled shutdown of dev environments

### Secrets management rollout: from .env files to short-lived credentials
`mx-ops-secrets-rollout` · Y2 · level 3 · 28 h · HashiCorp Vault or OpenBao, gitleaks, Kubernetes, GitHub Actions OIDC, PostgreSQL

**Scenario.** Tallyhand, a 30-engineer payroll startup, discovered database passwords in six repos and a shared spreadsheet. Security wants zero long-lived secrets in code, CI or laptops within a quarter.

**Functional.** Scan repos and history for exposed secrets and rate them; Deploy a secrets manager with per-service access policies; Issue dynamic database credentials with 1-hour TTL; Inject secrets into CI and Kubernetes workloads without writing them to disk; Rotation automation and emergency revoke procedure

**Non-functional.** Zero secret findings on main after cleanup with a scanner in CI; Credential rotation without downtime across 10 services; Emergency revoke propagates in under 2 minutes

**Constraints.** Self-hosted open-source secrets manager only; No plaintext secrets in environment dumps or logs

**Architecture.** A central vault issues scoped, short-lived credentials via workload identity; CI uses OIDC federation; a scanner blocks new leaks in pre-commit and CI. Components: Secret scanner, Vault deployment, Dynamic DB creds, CI/Kubernetes injection, Rotation automation, Revoke runbook

**Data.** Synthetic repos seeded with planted fake secrets of 15 types

**Milestones.** Scan, triage and plan (4 h) · Deploy vault and policies (6 h) · Dynamic credentials and app integration (8 h) · CI OIDC and K8s injection (5 h) · Rotation and revoke drills (4 h) · Report (1 h)

**Deliverables.** repo with infra code; rollout plan; rotation runbook; scan before/after report

**Done when.** All 15 planted secret types are caught, main has 0 findings, rotation across 10 services causes no failed requests, and revoke takes under 2 minutes.

**Measure.** Findings by severity, secret age, rotation failures, revoke time, coverage of services

**Pitfalls.** Rotating a secret still cached by apps; Vault as single point of failure; Leaving old credentials valid

**Stretch.** Add break-glass access with audit alerts; Add auto-unseal with a cloud KMS

### Threat model a multi-tenant web app and rank the risks
`mx-ops-threat-model-webapp` · Y2 · level 3 · 24 h · Threat Dragon or pytm, Markdown, Python, Mermaid, GitHub Issues

**Scenario.** Pawprint, a pet-clinic booking SaaS, is about to sign a hospital-group customer that sends a 60-question security questionnaire. The team has never done structured threat modelling.

**Functional.** Draw data-flow diagrams with trust boundaries; Enumerate threats using STRIDE per element; Score risks with a documented method and rank them; Map each top risk to a concrete mitigation and test; Maintain the model as code in the repo

**Non-functional.** At least 60 threats identified across 5 trust boundaries; Top 15 risks each have an owner, mitigation and verification test; Questionnaire answers traceable to model evidence for 90% of questions

**Constraints.** Defensive analysis of your own sample app only; Model must be reviewable in under 1 hour by a new engineer

**Architecture.** A model-as-code file describes components, data flows and boundaries, from which diagrams and threat lists are generated and tracked as issues. Components: Sample app and DFD, Threat catalogue, Risk scoring, Mitigation tracker, Model-as-code tooling

**Data.** Synthetic multi-tenant booking app you build or generate (small Flask or Node app)

**Milestones.** Build or pick sample app and document architecture (4 h) · DFDs and trust boundaries (4 h) · STRIDE enumeration (7 h) · Scoring and ranking (4 h) · Mitigation mapping and questionnaire traceability (5 h)

**Deliverables.** threat model repo; ranked risk register; mitigation backlog; questionnaire mapping

**Done when.** At least 60 threats listed, top 15 each carry an owner and a test, and 90% of a 60-question sample questionnaire maps to evidence.

**Measure.** Threats per boundary, risk distribution, mitigation coverage, review time

**Pitfalls.** Boxes without data flows; Scoring without justification; Model rotting after the first version

**Stretch.** Add attack trees for the 3 worst risks

### Incident simulation program with blameless postmortems
`mx-ops-incident-sim-postmortem` · Y2 · level 3 · 24 h · Docker Compose or Kubernetes, toxiproxy or Chaos Mesh, Python, Markdown, Grafana

**Scenario.** Brightloop, a 35-engineer SaaS, has had three outages this year and the postmortems were never finished. The new head of engineering wants an incident process proven through drills.

**Functional.** Define severity levels, roles and communication templates; Run 4 simulated incidents with injected faults in a demo stack; Capture timelines automatically from chat and alert logs; Write blameless postmortems with contributing factors and action items; Track action items to completion

**Non-functional.** Time to acknowledge under 5 minutes and mitigate under 30 minutes in the final drill; Every simulated incident produces a postmortem within 3 days; At least 80% of action items closed in the exercise period

**Constraints.** Simulation uses your own demo stack; Facilitator script must be repeatable by others

**Architecture.** A fault injector breaks the demo stack on a schedule; a timeline collector records signals; responders follow runbooks; postmortems feed an action tracker. Components: Demo stack, Fault injector, Timeline collector, Runbooks, Postmortem templates, Action tracker

**Data.** Synthetic demo shop plus scripted incident scenarios

**Milestones.** Process design and templates (4 h) · Demo stack and fault scenarios (6 h) · Run drills with timeline capture (6 h) · Postmortems and action tracking (5 h) · Retrospective on the program (3 h)

**Deliverables.** repo with scenarios; incident process doc; 4 postmortems; timeline tooling

**Done when.** Final drill shows acknowledge under 5 minutes and mitigation under 30 minutes, with all 4 postmortems delivered within 3 days.

**Measure.** MTTA, MTTR, detection source, action item closure, repeat causes

**Pitfalls.** Blame-laden language; Action items with no owner; Drills that are too scripted to teach

**Stretch.** Add a chat-ops incident bot; Run a drill where the runbook is wrong

### Terraform module library with policy-as-code guardrails
`mx-ops-terraform-module-library` · Y2 · level 3 · 28 h · OpenTofu/Terraform, Terratest or native tests, OPA/Conftest, LocalStack, Infracost-style script

**Scenario.** Skyline Ads, a 50-engineer ad-tech firm, has 14 hand-written Terraform stacks with inconsistent tagging and two public storage buckets found by accident. Platform wants vetted modules that make the safe path the easy path.

**Functional.** Build 6 reusable modules (network, cluster, database, bucket, queue, IAM role) with tests; Policy checks that fail plans for public buckets, missing tags and open security groups; Versioned releases with a changelog and upgrade notes; Cost estimate attached to each plan; Example environment composed from the modules

**Non-functional.** Policy suite blocks 100% of 25 planted violations; Plan plus policy check completes in under 90 seconds; Modules tested with at least 80% of resources covered by automated tests

**Constraints.** Use a local emulator or plan-only mode so no cloud spend is needed; Terraform or OpenTofu only

**Architecture.** Modules expose opinionated inputs and secure defaults; policy rules evaluate the JSON plan in CI before apply. Components: Module set, Policy rules, Test harness, Release automation, Cost estimator, Example environment

**Data.** Synthetic planted-violation stacks written by you

**Milestones.** Design module interfaces and conventions (4 h) · Implement 6 modules with tests (10 h) · Policy rules and violation suite (7 h) · Release automation and cost output (4 h) · Docs and example environment (3 h)

**Deliverables.** repo; module docs; policy catalog; violation test report

**Done when.** All 25 planted violations are blocked, plan+policy runs under 90 s, and 80% of resources have tests.

**Measure.** Violations blocked, plan time, test coverage, module adoption in the example

**Pitfalls.** Modules with too many knobs; Policy rules that block legitimate patterns; State file management mistakes

**Stretch.** Add drift detection nightly; Add a module registry with semver gates

### Cut a 38-minute CI pipeline to 8 minutes with caching and hermetic builds
`mx-ops-ci-speed-hermetic` · Y2 · level 3 · 26 h · GitHub Actions or Buildkite, Bazel or Nx/Turborepo, pytest or Jest, Python scripts, Grafana

**Scenario.** Northwind Games' monorepo CI takes 38 minutes, so developers batch changes and merge conflicts pile up. Flaky tests are re-run by hand and nobody trusts red builds.

**Functional.** Profile the pipeline and attribute time to each stage; Introduce dependency and build caching with correct keys; Shard and parallelise tests with historical timing; Detect and quarantine flaky tests automatically; Dashboard for pipeline time, flake rate and queue time

**Non-functional.** Median pipeline time under 8 minutes on the benchmark repo; Flake rate under 1% of runs, from a baseline of 9%; Cache hit rate above 85% on typical PRs

**Constraints.** Self-hosted runner on one 8-core machine; Builds must remain reproducible

**Architecture.** A timing profiler feeds a test sharder; build caching uses content-addressed keys; a flake tracker retries, labels and quarantines unstable tests. Components: Pipeline profiler, Cache layer, Test sharder, Flake detector, Metrics dashboard

**Data.** Synthetic monorepo with 40 packages and 3,000 tests with planted flaky ones

**Milestones.** Build the benchmark repo and baseline profile (5 h) · Caching and incremental builds (7 h) · Timing-based sharding (6 h) · Flake detection and quarantine (5 h) · Dashboard and write-up (3 h)

**Deliverables.** repo with benchmark; before/after profile; flake policy; dashboard

**Done when.** Median time under 8 minutes, flake rate under 1%, and cache hit rate above 85% across 100 simulated PRs.

**Measure.** Pipeline minutes by stage, hit rate, flake rate, queue time, cost per run

**Pitfalls.** Cache poisoning from bad keys; Quarantine becoming a graveyard; Parallelism limited by one slow test

**Stretch.** Add remote execution; Add affected-only test selection

### Capacity planning and load-testing programme for a ticketing site
`mx-ops-capacity-planning-load` · Y2 · level 3 · 26 h · k6 or Locust, PostgreSQL, Redis, Python, Prometheus, flamegraphs

**Scenario.** Ticketeer sells tickets for concerts; a presale for a stadium tour is expected to send 40x normal traffic for 20 minutes. Last year the site fell over at 6x.

**Functional.** Model traffic from historical shapes and the presale spike; Build load tests for the booking funnel with realistic think times; Find bottlenecks with profiling and resource saturation metrics; Fix the top 3 bottlenecks and retest; Produce a capacity model with headroom and a scale-up playbook

**Non-functional.** Sustain 2,000 booking requests/s with p99 under 800 ms; No oversell: 0 duplicate seat bookings across 200k attempts; Autoscaling reaches target capacity in under 4 minutes

**Constraints.** Test environment of up to 16 cores; Cost of the exercise stays under $0 using local resources

**Architecture.** A load generator drives a seat-booking app; a USE-method analysis finds saturation points; a queueing-model estimates capacity. Components: Demo ticketing app, Load profiles, Bottleneck analysis, Fixes (caching, locking), Capacity model, Scale-up playbook

**Data.** Synthetic events and seats; generated traffic with a spike shape

**Milestones.** Traffic modelling and baseline test (5 h) · Bottleneck diagnosis (6 h) · Fixes with correctness tests for overselling (8 h) · Spike and soak tests (4 h) · Capacity model and playbook (3 h)

**Deliverables.** repo; load test suite; capacity model; bottleneck report

**Done when.** The system sustains 2,000 requests/s at p99 under 800 ms with zero oversells in 200k attempts and scales within 4 minutes.

**Measure.** Throughput at SLO, saturation point, oversell count, scale-up time, headroom percentage

**Pitfalls.** Closed-loop load generators hiding queueing; Testing with cold caches only; Optimising before measuring

**Stretch.** Add a virtual waiting-room queue; Add cost per 1,000 bookings

### Redesign a log pipeline to cut cost by 60% while keeping debuggability
`mx-ops-log-pipeline-cost` · Y2 · level 3 · 24 h · Vector or Fluent Bit, Loki or OpenSearch, S3-compatible storage, Python

**Scenario.** Hollis Telehealth ships 4 TB of logs a month to a hosted service costing $14k, and engineers still cannot find the one line they need. Finance has asked for a 60% cut.

**Functional.** Analyse log volume by service, level and field to find waste; Implement sampling, dropping and field trimming at the collector; Tiered retention: hot 7 days, warm 30, cold 365; Structured-logging guideline and linter; Search benchmark proving incident queries still work

**Non-functional.** Ingest volume down at least 60% while 95% of 20 incident-query scenarios still succeed; Hot-tier query p95 under 3 seconds; Projected cost under $5.6k/month at 4 TB input

**Constraints.** Open-source stack; Audit-required logs must never be sampled

**Architecture.** A collector classifies logs, drops or samples low-value ones, and routes the rest to tiered storage; a benchmark replays real-style incident questions. Components: Volume analyser, Collector pipeline, Tiered storage, Log linter, Query benchmark

**Data.** Synthetic 100 GB log corpus with realistic service mix, noisy debug lines and planted incident traces

**Milestones.** Generate corpus and analyse volume (5 h) · Collector rules and sampling (7 h) · Tiered storage and retention (5 h) · Incident-query benchmark and tuning (5 h) · Cost model and report (2 h)

**Deliverables.** repo; cost model; query benchmark; logging guideline

**Done when.** Volume drops at least 60%, at least 19 of 20 incident scenarios still solvable, hot queries under 3 s p95, and projected cost under $5.6k.

**Measure.** Volume reduction, cost per month, query latency, incident-query success rate

**Pitfalls.** Dropping the one line you need; Sampling by random instead of by trace; Unstructured logs defeating filters

**Stretch.** Add trace-aware sampling that keeps whole failed requests

### Vulnerability management pipeline with SLAs and exception handling
`mx-ops-vuln-management-pipeline` · Y2 · level 3 · 26 h · Trivy, Grype, Semgrep, Python, PostgreSQL, Grafana

**Scenario.** Rowan Bank's scanners produce 1,900 findings that nobody triages; critical issues sit for months. Security leadership wants risk-ranked work with SLAs.

**Functional.** Aggregate findings from dependency, container and configuration scanners; Deduplicate and enrich with exploitability and exposure context; Assign owners and SLA deadlines by risk; Exception workflow with expiry and approval; Dashboard of SLA compliance and mean time to remediate

**Non-functional.** Duplicates reduced by at least 50% after normalisation; Critical findings assigned an owner within 1 hour of ingest; Pipeline processes 1,900 findings in under 60 seconds

**Constraints.** Use only open-source scanners on repos you create; Exceptions must auto-expire

**Architecture.** Scanner outputs are normalised into one schema, enriched with reachability and asset criticality, then scored and routed to ticket queues with SLA timers. Components: Scanner adapters, Normaliser and deduper, Enrichment and scoring, Ticket routing, Exception workflow, SLA dashboard

**Data.** Synthetic portfolio of 20 services with intentionally old dependencies and seeded misconfigurations

**Milestones.** Schema design and scanner adapters (6 h) · Dedup and enrichment (6 h) · Scoring and SLA engine (6 h) · Exception workflow (4 h) · Dashboard and metrics (4 h)

**Deliverables.** repo; scoring methodology doc; dashboard; sample exception audit

**Done when.** At least 50% dedup reduction, critical findings routed within 1 hour, and 1,900 findings processed in under 60 s.

**Measure.** Findings by risk, dedup ratio, SLA compliance, mean time to remediate, exception counts

**Pitfalls.** Ranking solely on CVSS; Findings with no owner; Exceptions that never expire

**Stretch.** Add reachability analysis for dependencies; Auto-open fix PRs for safe upgrades

### Zero-downtime migration of a 600 GB Postgres database to a new schema and host
`mx-ops-zero-downtime-db-migration` · Y2 · level 4 · 36 h · PostgreSQL 15 to 17, logical replication, PgBouncer, pg_repack or gh-ost style tooling, Python, Docker

**Scenario.** Orbit Learning, an ed-tech with 400k students, must move its main database to a new major version and split a giant events table. Maintenance windows longer than 60 seconds would break live exams.

**Functional.** Expand/contract schema migration plan with backward-compatible steps; Logical replication from old to new cluster with lag monitoring; Dual-read verification of data parity; Cutover procedure with fencing of writers; Tested rollback to the old cluster after cutover

**Non-functional.** Write unavailability during cutover under 15 seconds; Replication lag under 1 second at cutover under 800 writes/s; Zero data loss verified by checksum comparison across 100% of tables

**Constraints.** Application must stay online throughout; Single primary writer at all times

**Architecture.** Replicate to the new cluster, verify parity continuously, then briefly pause writes via a proxy, let lag reach zero, repoint, and keep reverse replication ready for rollback. Components: Schema migration scripts, Replication setup, Parity verifier, Connection proxy cutover, Reverse replication, Runbook and rehearsal logs

**Data.** Synthetic 600 GB exam schema with a write load generator at 800 writes/s

**Milestones.** Plan expand/contract steps and risk register (4 h) · Build old/new clusters and load generator (6 h) · Replication and parity verifier (8 h) · Cutover automation and fencing (8 h) · Rehearse three times including rollback (7 h) · Postmortem-style write-up (3 h)

**Deliverables.** repo with rehearsal environment; migration runbook; parity report; timed rehearsal logs

**Done when.** Three consecutive rehearsals show write unavailability under 15 s, lag under 1 s, zero checksum mismatches and a successful rollback.

**Measure.** Cutover pause time, replication lag, mismatch count, error rate during cutover, rollback time

**Pitfalls.** Sequences not synced to the new cluster; Long transactions blocking cutover; Forgetting extensions and collation differences

**Stretch.** Repeat with a major column type change; Automate go/no-go checks

### Fix the top 15 findings from a web-app threat model and prove it
`mx-ops-threat-fix-sprint` · Y2 · level 4 · 34 h · Python or Node, PostgreSQL RLS, Redis, pytest or Jest, OWASP ZAP baseline scan

**Scenario.** Pawprint's threat model produced a ranked list including tenant isolation gaps, weak session handling and missing rate limits. The CTO wants a two-week hardening sprint with evidence for the hospital customer.

**Functional.** Enforce tenant isolation with row-level security and tests; Harden sessions: rotation, secure cookies, idle timeouts; Add rate limiting and lockout on auth endpoints; Add input validation and output encoding for the top injection paths; Regression tests that fail if each fix is reverted

**Non-functional.** Cross-tenant access attempts: 0 successes in 1,000 automated probes; Auth endpoints limit to 10 attempts per minute per account without raising p99 above 150 ms; Each of 15 fixes has a test that fails when the fix is removed

**Constraints.** Defensive hardening of your own sample app only; No breaking API changes for existing clients

**Architecture.** Fixes are applied by layer (data, session, edge, input) with a test per finding, run in CI as a security regression suite. Components: Tenant isolation layer, Session hardening, Rate limiter, Validation layer, Security regression suite, Evidence report

**Data.** Sample multi-tenant app and your own risk register; synthetic tenants and users

**Milestones.** Triage findings and design fixes (4 h) · Tenant isolation and sessions (9 h) · Rate limiting and lockout (6 h) · Validation and encoding fixes (7 h) · Revert-tests, scan and evidence report (8 h)

**Deliverables.** repo with fixes; security regression suite; evidence report; ADRs on isolation

**Done when.** Zero cross-tenant successes in 1,000 probes, p99 on auth under 150 ms with limits on, and all 15 revert-tests fail when fixes are removed.

**Measure.** Findings fixed, test pass rate, probe success rate, latency impact, scanner finding delta

**Pitfalls.** Fixing symptoms instead of root cause; RLS bypassed by admin connection roles; Rate limits keyed on spoofable headers

**Stretch.** Add a bug-bounty style self-review checklist; Add automated dependency-update gating

### Software supply-chain pipeline with SBOMs, signing and provenance
`mx-ops-sbom-signing-pipeline` · Y2 · level 4 · 32 h · GitHub Actions, Syft, Cosign, Grype, SLSA-style provenance, Kyverno or OPA Gatekeeper, Kubernetes

**Scenario.** Vantage Medical Devices must show regulators and customers exactly what is in each container it ships. Today builds run from developer laptops and nobody can prove which commit produced a given image.

**Functional.** Reproducible CI builds that emit SBOMs for each image; Sign images and attach build provenance attestations; Admission policy that blocks unsigned or unattested images; Vulnerability matching of SBOMs against a database with a policy gate; Verification script customers can run offline

**Non-functional.** 100% of production images signed with verifiable provenance; Unsigned image deployment attempts blocked in 100% of 20 test cases; Pipeline overhead under 90 seconds per build

**Constraints.** Open-source tooling only; Keyless or locally managed keys with documented rotation

**Architecture.** CI builds in an isolated runner, generates an SBOM, signs the digest, and publishes provenance; a cluster admission controller verifies signature and policy before any pod starts. Components: Hermetic build job, SBOM generation, Signing and attestation, Admission policy, Vulnerability gate, Customer verifier

**Data.** Five small synthetic services in different languages with seeded vulnerable dependencies

**Milestones.** Threat model the build chain and set SLSA target (4 h) · Build pipeline with SBOM (7 h) · Signing and attestations (7 h) · Admission policy and negative tests (8 h) · Vuln gate and customer verifier (6 h)

**Deliverables.** repo with pipeline; supply-chain threat model; verification guide; negative test results

**Done when.** All production images are signed and attested, 20 of 20 bypass attempts are blocked, and pipeline overhead stays under 90 s.

**Measure.** Signed image ratio, SBOM completeness, bypass block rate, vuln counts by severity, overhead

**Pitfalls.** SBOMs that miss OS packages; Signing keys on the CI runner; Policy that fails open on errors

**Stretch.** Add a transparency log check; Generate VEX statements for non-exploitable findings

### Penetration-test-style hardening of your own API (defensive only)
`mx-ops-harden-own-service` · Y2 · level 4 · 30 h · Python/FastAPI target, OWASP ZAP, Burp Community or mitmproxy, Nuclei, Docker, pytest

**Scenario.** Kestrel Pay Lite, a small invoicing API, is about to go live with its first 20 customers. The founder wants an independent-style review of their own service, with every finding fixed and verified.

**Functional.** Build a test plan covering OWASP API Top 10 against your own deployed service; Run authenticated and unauthenticated scans in an isolated lab; Triage and fix each confirmed finding with a regression test; Add security headers, TLS settings and dependency pinning; Write a report with severity, evidence and retest result

**Non-functional.** Zero high or critical findings on retest; All 10 API Top 10 categories have at least 3 test cases each; Security tests run in CI in under 8 minutes

**Constraints.** Only test systems you own, in an isolated lab; No third-party targets

**Architecture.** A lab environment mirrors production; manual and automated testing feeds a findings tracker; each fix gets a test in the CI suite. Components: Isolated lab, Test plan, Scanner automation, Findings tracker, Regression suite, Report

**Data.** Own API with synthetic invoices and users

**Milestones.** Build the target and lab (6 h) · Test plan and automated scans (6 h) · Manual testing of auth, authorisation and logic flaws (8 h) · Fix, retest and regression suite (7 h) · Report (3 h)

**Deliverables.** repo with lab; test plan; findings and retest report; CI security suite

**Done when.** Retest shows zero high or critical findings, all 10 categories covered with 3+ cases, and the security suite finishes in under 8 minutes.

**Measure.** Findings by severity, time to fix, coverage by category, retest pass rate

**Pitfalls.** Scanner noise treated as findings; Missing broken object-level authorisation; Fixes without regression tests

**Stretch.** Add fuzzing of request schemas; Add a threat-led attack path retest

### Multi-tenant Kubernetes cluster with isolation, quotas and network policy
`mx-ops-k8s-multitenant-isolation` · Y2 · level 4 · 32 h · Kubernetes, Calico or Cilium, Kyverno, kube-bench, k6, Helm

**Scenario.** Parcel Labs hosts four internal teams on one cluster and a noisy neighbour recently starved the payments team. Security also found pods that could reach every other namespace.

**Functional.** Namespace-per-team with RBAC and resource quotas; Default-deny network policies with explicit allow rules; Pod security standards enforced by admission; Fair scheduling with priority classes and limit ranges; Tests proving isolation and noisy-neighbour protection

**Non-functional.** Cross-namespace traffic: 100% of 40 unauthorised paths blocked; Noisy neighbour at 4x its quota degrades others' p99 by under 10%; Tenant onboarding automated in under 3 minutes

**Constraints.** Single kind or k3s cluster; No privileged pods outside system namespaces

**Architecture.** Tenants are provisioned from a declarative definition that stamps out namespace, RBAC, quotas, network policy and policy exceptions; an isolation test suite attacks the boundaries from inside. Components: Tenant provisioning, RBAC model, Network policies, Admission policies, Isolation test suite, Noisy-neighbour load test

**Data.** Four synthetic tenants with demo workloads

**Milestones.** Threat model the shared cluster (4 h) · Tenant provisioning and RBAC (7 h) · Network and pod security policies (8 h) · Quotas and fairness tests (7 h) · Isolation test suite and report (6 h)

**Deliverables.** repo; isolation test report; tenant onboarding guide; ADRs

**Done when.** All 40 unauthorised paths blocked, noisy-neighbour impact on others' p99 stays under 10%, and onboarding takes under 3 minutes.

**Measure.** Blocked-path ratio, p99 impact, onboarding time, policy exception count

**Pitfalls.** Allow-all egress left open; Quotas set without limit ranges; Cluster-admin bindings leaking into tenants

**Stretch.** Add per-tenant cost metering; Evaluate virtual clusters vs namespaces

### Architecture decision records and fitness functions for a growing codebase
`mx-ops-architecture-fitness` · Y3 · level 3 · 24 h · ArchUnit or import-linter, Python, GitHub Actions, Markdown, Mermaid

**Scenario.** Quarry Analytics grew from 5 to 40 engineers in a year; architectural decisions live in people's heads and the codebase has drifted from the intended layers.

**Functional.** Backfill 10 ADRs capturing past decisions with trade-offs; Define fitness functions for layering, cycles, coupling and API compatibility; Run fitness functions in CI with trend reporting; Introduce an ADR workflow with review and supersession; Quarterly architecture health report

**Non-functional.** 10 ADRs written, each with options and consequences; Fitness checks run in under 60 seconds in CI; Layer violations reduced by 90% from the measured baseline in 6 weeks of simulated history

**Constraints.** Apply to an open-source codebase you pick; Checks must have low false-positive rates

**Architecture.** A repository holds ADRs and executable architecture rules; CI runs them and posts a trend chart of violations and coupling metrics. Components: ADR repository, Fitness function suite, CI integration, Trend report, Health report template

**Data.** Public open-source repository you select and analyse (such as a mid-sized Python or Java project)

**Milestones.** Pick codebase and reverse-engineer architecture (5 h) · Write ADRs (6 h) · Fitness functions and CI (7 h) · Trend analysis across history (4 h) · Health report (2 h)

**Deliverables.** repo; 10 ADRs; fitness suite; health report

**Done when.** 10 ADRs exist, CI checks finish in under 60 s, and historical analysis shows the violation trend with a 90% reduction after fixes.

**Measure.** Violations over time, coupling and cohesion, ADR coverage, false-positive count

**Pitfalls.** ADRs that only record outcomes, not alternatives; Rules too strict to keep; Measuring vanity metrics

**Stretch.** Add architecture change risk scores per PR

### Strangler-fig extraction of a billing service from a live monolith
`mx-ops-strangler-extraction` · Y3 · level 4 · 38 h · Python or Go, PostgreSQL logical replication, Debezium or custom CDC, Docker Compose, Prometheus

**Scenario.** Brightwave, a B2B invoicing SaaS with 9,000 paying accounts, must let a separate finance team ship billing changes independently. The billing code is tangled in the monolith and handles roughly 1.2 million invoice events a month.

**Functional.** Put a routing facade in front of billing calls with per-tenant switches; Run the new billing service in shadow mode and diff results against the monolith; Migrate tenants in waves with instant rollback; Synchronise invoice data between old and new stores during transition; Decommission the old billing code path with a verified checklist

**Non-functional.** Shadow-mode result mismatch rate under 0.01% before first cutover; Cutover adds under 30 ms p95 to invoice creation; Rollback of any tenant completes in under 60 seconds

**Constraints.** Zero downtime and no lost invoice events; Finance team approval required before each wave

**Architecture.** A routing layer sends calls to old or new billing by tenant flag, while a change-data-capture stream keeps both stores aligned. Shadow comparison proves parity before real traffic moves. Components: Routing facade, New billing service, CDC sync, Shadow comparator, Tenant wave controller, Rollback runbook

**Data.** Synthetic generator producing 1.2M invoice events with realistic tax, proration and refund edge cases

**Milestones.** Define billing boundary, contract tests and event schema (6 h) · Build facade and per-tenant flags (6 h) · Implement billing service and CDC sync (10 h) · Shadow mode with diff dashboard; fix mismatches to target (8 h) · Wave migration simulation with injected failures and rollback drills (5 h) · Decommission plan and write-up (3 h)

**Deliverables.** repo with compose demo; ADRs on sync strategy; wave migration runbook; mismatch analysis report

**Done when.** Shadow mismatch below 0.01% over 1.2M events, added p95 latency under 30 ms, and three rollback drills each finish in under 60 s with no lost events.

**Measure.** Mismatch rate by category, added latency, replication lag, rollback time, events lost (target 0)

**Pitfalls.** Dual-write inconsistencies; Rounding and timezone differences in shadow diffs; Forgetting background jobs that call billing directly

**Stretch.** Replace CDC with an outbox pattern and compare; Add per-wave automated go/no-go gates

### SSO and workload identity rollout across people and services
`mx-ops-workload-identity-sso` · Y3 · level 4 · 34 h · Keycloak or Dex, OIDC, SPIFFE/SPIRE or custom issuer, Go or Python middleware, Kubernetes

**Scenario.** Axiom Studio, a 120-person design-tech company, uses shared admin accounts and static service keys. After an offboarding gap left access open for nine days, they want central identity for humans and machines.

**Functional.** Central OIDC provider with groups mapped to roles; SSO for three internal apps with MFA enforcement; Short-lived workload identities for services via signed tokens; Automatic access removal on offboarding event; Access review report listing who can reach what

**Non-functional.** Offboarding revokes all access in under 5 minutes; Token validation adds under 3 ms p99 per request; 100% of service-to-service calls use short-lived tokens in the final environment

**Constraints.** Open-source identity provider; Tokens live at most 15 minutes

**Architecture.** An identity provider issues user tokens; a workload issuer mints SPIFFE-style identities; apps validate JWTs against rotating keys and authorise using group claims. Components: Identity provider, Group-to-role mapping, Workload identity issuer, Token validation middleware, Offboarding automation, Access review report

**Data.** Synthetic directory of 120 users, 15 groups, 12 services

**Milestones.** Threat and requirements review of current access (4 h) · Deploy identity provider and SSO for 3 apps (8 h) · Workload identity and token middleware (9 h) · Offboarding automation and tests (6 h) · Access review and report (4 h) · Docs (3 h)

**Deliverables.** repo with deployment code; identity architecture doc; offboarding runbook; access review sample

**Done when.** Simulated offboarding revokes everything in under 5 minutes, middleware adds under 3 ms p99, and zero static service keys remain.

**Measure.** Revocation time, token validation latency, static credentials remaining, MFA coverage

**Pitfalls.** Clock skew breaking token validation; Overly broad group roles; JWT key rotation outages

**Stretch.** Add step-up authentication for admin actions; Add just-in-time privileged access

### Tamper-evident audit logging for a SOC 2 style control set
`mx-ops-audit-logging-compliance` · Y3 · level 4 · 32 h · Go or Rust, Kafka or NATS, Parquet/object storage, ClickHouse or DuckDB, Ed25519 signatures

**Scenario.** Clearbook, a healthcare-billing SaaS, needs audit trails showing who accessed which patient record and when. A prospective customer asked for tamper evidence and 7-year retention.

**Functional.** Emit structured audit events from all services with actor, action, resource and outcome; Store events in an append-only, hash-chained log; Query API for auditors with filters and export; Detect and report any log gap or tampering; Retention and legal-hold policies

**Non-functional.** Ingest 5,000 events/s with under 1% loss in a stress test; Tamper detection finds 100% of 50 planted modifications; Auditor queries on 100M events return in under 5 seconds

**Constraints.** PII must be pseudonymised in the log; Storage cost under $100/month at the test scale

**Architecture.** Services send events to a collector that appends them to hash-chained segments in object storage, with periodic signed checkpoints; an index serves queries. Components: Event schema and SDK, Collector, Hash-chained store, Checkpoint signer, Query API, Tamper verifier

**Data.** Synthetic access events for 100M records generated with realistic actor patterns

**Milestones.** Control mapping and event schema (4 h) · SDK and collector (7 h) · Hash-chained store and checkpoints (8 h) · Query and export API (6 h) · Tamper and stress tests (5 h) · Control evidence doc (2 h)

**Deliverables.** repo; control mapping doc; stress and tamper report; auditor guide

**Done when.** Sustains 5,000 events/s with under 1% loss, detects all 50 planted modifications, and answers queries on 100M events in under 5 s.

**Measure.** Throughput, loss rate, detection rate, query latency, storage cost

**Pitfalls.** Logging secrets or full PII; Chain verification too slow to run; Clock skew breaking ordering

**Stretch.** Add anchoring of checkpoints to an external timestamp; Add automated evidence export per control

### Progressive delivery with automated canary analysis and rollback
`mx-ops-progressive-delivery-canary` · Y3 · level 4 · 32 h · Argo Rollouts or custom controller, Envoy/NGINX ingress, Prometheus, Python stats, Kubernetes

**Scenario.** Luma Commerce deploys 25 times a day but has rolled back by hand four times this quarter after errors reached 100% of traffic. The CTO wants releases that stop themselves.

**Functional.** Canary rollout with traffic steps (1%, 5%, 25%, 100%); Automated analysis of error rate, latency and a business metric against the baseline; Automatic rollback on failed analysis; Blue/green option for database-coupled releases; Release audit trail with decisions and metrics

**Non-functional.** Bad release (planted 3% error rate) contained to under 5% of traffic and rolled back in under 3 minutes; False rollback rate under 2% across 100 good releases; Rollout overhead under 10 minutes for a normal release

**Constraints.** Kubernetes via kind; no cloud required; Statistical comparison method documented

**Architecture.** A rollout controller shifts traffic in steps via the ingress or mesh, while an analysis job compares canary and baseline metrics with a statistical test and decides to promote or abort. Components: Rollout controller, Traffic splitter, Metric analysis, Rollback logic, Audit trail, Release simulator

**Data.** Demo service with a release simulator producing good and faulty versions

**Milestones.** Define metrics and decision rules (5 h) · Traffic stepping and baseline comparison (8 h) · Statistical analysis and thresholds (7 h) · Rollback and blue/green path (6 h) · 100-release simulation and tuning (6 h)

**Deliverables.** repo; analysis method doc; simulation report; runbook

**Done when.** Planted bad releases are rolled back in under 3 minutes with under 5% exposure, and false rollbacks stay under 2% over 100 good releases.

**Measure.** Exposure percentage, time to rollback, false positive and negative rates, rollout duration

**Pitfalls.** Too little traffic to detect failures; Metric lag hiding the problem; Comparing canary against stale baseline

**Stretch.** Add business-metric analysis such as conversion; Add automated rollback of database migrations

### Chaos engineering game day for a 10-service marketplace
`mx-ops-chaos-gameday` · Y3 · level 4 · 30 h · Kubernetes, Chaos Mesh or Litmus, toxiproxy, Prometheus, k6, Python

**Scenario.** Stallion Market, a 10-service online marketplace, assumes its retries and fallbacks work but has never tested a dependency failure. Black Friday is 10 weeks away.

**Functional.** Define steady-state hypotheses for 5 customer journeys; Inject latency, packet loss, pod kills and dependency outages; Automate experiments with safety aborts; Fix weaknesses found, such as missing timeouts and retry storms; Re-run experiments to prove improvement

**Non-functional.** Journey success rate stays above 99% under single-dependency failure after fixes; At least 8 weaknesses found and 6 fixed; Experiments auto-abort within 15 seconds if the error rate exceeds the safety threshold

**Constraints.** Run in an isolated test environment; Blast radius limited to one service at a time

**Architecture.** An experiment runner applies faults through a chaos tool, watches steady-state metrics, and aborts when thresholds break; findings feed a fix backlog. Components: Marketplace demo, Experiment catalogue, Fault injector, Safety abort, Findings tracker, Report

**Data.** Synthetic marketplace and k6 traffic profile at 400 req/s

**Milestones.** Hypotheses and steady-state metrics (4 h) · Build demo and experiment runner (8 h) · Run first game day and record weaknesses (6 h) · Fix weaknesses (timeouts, circuit breakers, backoff) (8 h) · Re-run and compare (4 h)

**Deliverables.** repo; experiment catalogue; before/after report; game-day facilitator guide

**Done when.** After fixes, journey success exceeds 99% under each single-dependency failure and all experiments abort within 15 s of a threshold breach.

**Measure.** Success rate per experiment, weaknesses found/fixed, abort time, recovery time

**Pitfalls.** Experiments without hypotheses; Retries making outages worse; Running without abort conditions

**Stretch.** Add continuous low-level chaos in staging; Add dependency-failure budgets per service

### Service mesh mTLS rollout and cost-benefit evaluation
`mx-ops-service-mesh-mtls-eval` · Y3 · level 4 · 30 h · Kubernetes, Linkerd or Istio, cert-manager, Go, k6, Prometheus

**Scenario.** Larch Insurance must encrypt and authenticate all east-west traffic by audit date. The team is split on whether a service mesh is worth its complexity and latency.

**Functional.** Deploy a mesh with automatic mTLS to 8 services; Authorisation policies by service identity; Measure latency, CPU and memory overhead against a no-mesh baseline; Compare with a library-based TLS alternative; Write a decision record with a recommendation

**Non-functional.** Mesh adds under 3 ms p99 latency at 1,000 req/s; Sidecar overhead under 15% extra memory per pod; 100% of service-to-service calls authenticated in the final state

**Constraints.** Local Kubernetes cluster, 16 GB RAM; Rollout must not cause failed requests

**Architecture.** Two variants (mesh sidecars and app-level TLS with a cert issuer) are benchmarked on the same demo app, and the decision weighs security, overhead and operational burden. Components: Demo app, Mesh deployment, Library-TLS variant, Authz policies, Benchmark harness, Decision record

**Data.** Synthetic 8-service app with load profile at 1,000 req/s

**Milestones.** Requirements and evaluation criteria (3 h) · Baseline and mesh deployment (8 h) · Authz policies and rollout tests (6 h) · Library-TLS variant (6 h) · Benchmarks and decision ADR (7 h)

**Deliverables.** repo; benchmark report; decision ADR; rollout plan

**Done when.** Benchmarks show added p99 under 3 ms, memory overhead under 15%, and all calls authenticated; the ADR recommends one option with data.

**Measure.** Latency overhead, CPU/memory overhead, failed requests during rollout, operational complexity score

**Pitfalls.** Permissive mode left on forever; Ignoring control-plane failure behaviour; Benchmarking an unrealistic service graph

**Stretch.** Evaluate ambient/sidecarless mode; Add external traffic policy

### API gateway with rate limiting, quotas and abuse detection
`mx-ops-api-gateway-abuse-control` · Y3 · level 4 · 30 h · Go or Rust, Envoy or custom proxy, Redis, Prometheus, k6

**Scenario.** DataStream offers a public API to 2,000 customers; scrapers and a few runaway clients cause 40% of load and degrade paying users. Product wants fair usage by plan and visibility.

**Functional.** Per-key rate limiting with token buckets across multiple gateway instances; Plan-based quotas with clear response headers; Abuse detection for credential stuffing and scraping patterns; Admin view showing top consumers and blocks; Graceful degradation with priority for paid tiers

**Non-functional.** Gateway adds under 2 ms p99 at 5,000 req/s; Rate limit accuracy within 5% across 3 instances; Abusive clients cut to under 5% of total load in the simulated attack

**Constraints.** Redis or in-process sync only; no managed services; Fail-open or fail-closed must be configurable and documented

**Architecture.** Gateway instances share limiter state via a fast store, evaluate limits per key and plan, and feed access logs to a detector that raises blocks. Components: Gateway proxy, Distributed limiter, Quota service, Abuse detector, Admin dashboard, Attack simulator

**Data.** Synthetic client population with well-behaved, bursty and abusive profiles

**Milestones.** Design limits and plans (4 h) · Gateway and token bucket limiter (8 h) · Distributed correctness tests (6 h) · Abuse detector (6 h) · Attack simulation and dashboard (6 h)

**Deliverables.** repo; limiter design doc; attack simulation report; benchmarks

**Done when.** Gateway adds under 2 ms p99 at 5,000 req/s, limiter error stays within 5%, and abusive load drops below 5% in the simulation.

**Measure.** Added latency, limiter accuracy, false block rate, abusive share of traffic

**Pitfalls.** Clock skew in distributed limiter; Limiter store becoming the bottleneck; Blocking shared NAT addresses

**Stretch.** Add adaptive limits based on backend health; Add proof-of-work challenge for suspicious clients

### Feature flag platform with safe rollout and kill switches
`mx-ops-feature-flag-platform` · Y3 · level 4 · 30 h · Go or Rust, SSE/WebSocket, PostgreSQL, TypeScript SDK, Docker

**Scenario.** Bloom Fitness ships mobile and web features weekly and has had two incidents where a half-finished feature could not be turned off without a redeploy.

**Functional.** Flag service with targeting rules, percentage rollouts and kill switches; SDK that evaluates flags locally with cached rules; Change history with approval for production flags; Stale-flag detector and cleanup reminders; Experiment metrics hooks

**Non-functional.** Flag evaluation under 50 microseconds p99 in-process; Kill switch reaches 99% of clients in under 10 seconds; Service survives control-plane outage with last-known flags and zero failed evaluations

**Constraints.** Offline-capable SDK; Evaluation must be deterministic per user

**Architecture.** A control plane stores rules and streams updates to SDKs, which evaluate locally using consistent hashing; an audit trail records every change. Components: Control plane API, Rule engine, SDK, Streaming updates, Audit and approvals, Stale-flag scanner

**Data.** Synthetic user population of 1M ids with targeting attributes

**Milestones.** Flag model and evaluation semantics (4 h) · Rule engine and SDK (8 h) · Streaming and offline behaviour (7 h) · Audit, approvals and stale scanner (6 h) · Benchmarks and chaos tests (5 h)

**Deliverables.** repo; SDK; benchmark report; flag hygiene guide

**Done when.** Evaluation is under 50 microseconds p99, kill switch reaches 99% of clients in under 10 s, and control-plane loss causes zero failed evaluations.

**Measure.** Evaluation latency, propagation time, stickiness correctness, stale flag count

**Pitfalls.** Flags that never get removed; Non-sticky rollouts; Flag-dependency tangles

**Stretch.** Add multivariate experiments with significance tests

### Envelope encryption and key management for backups and data at rest
`mx-ops-kms-envelope-backups` · Y3 · level 4 · 28 h · Rust or Go, AES-GCM, Vault Transit or local KMS, PostgreSQL, S3-compatible store

**Scenario.** Kinbridge, a legal-document SaaS, promised customers encrypted storage with customer-specific keys but currently uses one shared key. Contracts now require key rotation and the ability to destroy a customer's data by destroying their key.

**Functional.** Per-tenant data keys wrapped by a master key in a KMS; Envelope encryption for objects and database backups; Key rotation without re-encrypting all data; Crypto-shredding: destroy a tenant's key to make data unrecoverable; Audit log of every key operation

**Non-functional.** Encrypt and decrypt at over 400 MB/s per core with AES-GCM; Rotation of 1,000 tenant keys completes in under 5 minutes with no read failures; Shredded tenant data unrecoverable in 100% of 50 recovery attempts

**Constraints.** Use a vetted crypto library; never write your own primitives; Local software KMS acceptable for the exercise

**Architecture.** A key service wraps tenant data keys; storage code encrypts with the data key and stores the wrapped key alongside; rotation re-wraps keys only. Components: Key service, Envelope encryption library, Rotation job, Crypto-shred workflow, Audit trail, Recovery tests

**Data.** Synthetic tenant documents, 1,000 tenants

**Milestones.** Key hierarchy design and threat model (4 h) · Envelope library and key service (8 h) · Rotation and re-wrapping (6 h) · Crypto-shred and recovery tests (6 h) · Benchmarks and audit (4 h)

**Deliverables.** repo; key hierarchy ADR; benchmark report; shredding proof

**Done when.** Throughput exceeds 400 MB/s per core, rotation of 1,000 keys is under 5 minutes without failures, and all 50 recovery attempts after shredding fail.

**Measure.** Throughput, rotation time, failed reads, shred verification, key operations audited

**Pitfalls.** Nonce reuse with AES-GCM; Backups holding plaintext copies of keys; Rotation that silently skips old objects

**Stretch.** Add customer-managed keys with revocation; Add hardware-backed key option

### Build an internal developer platform MVP for 60 engineers
`mx-ops-internal-dev-platform` · Y3 · level 5 · 40 h · Go or Python, Kubernetes CRDs, Backstage or custom portal, Argo CD, Terraform, GitHub Actions

**Scenario.** Helix Health, a 60-engineer digital health company, spends about 30% of developer time on infra tickets: new service setup takes 9 days. The platform team of three wants self-service creation of services, environments and databases.

**Functional.** Service catalog with ownership, runbook links and dependencies; Self-service scaffold that creates repo, CI, deploy config and dashboards; Environment provisioning on request with automatic expiry; Scorecards showing each service's SLO, security and docs status; Declarative platform API so everything is also available from CLI and CI

**Non-functional.** New service reaches first production deploy in under 30 minutes, down from 9 days; Provisioned dev environment ready in under 8 minutes; Catalog holds 40 services with 95% ownership coverage

**Constraints.** Runs on one small Kubernetes cluster (kind or k3s for the build); Uses only open-source components

**Architecture.** A control plane exposes a declarative API (CRDs or a small service) that templates reconcile into repos, pipelines and namespaces. A portal reads the catalog and scorecards from that same source of truth. Components: Catalog and ownership store, Scaffolder templates, Environment controller, Scorecard engine, Portal UI, Platform CLI

**Data.** Synthetic fleet of 40 fake service repos generated by script

**Milestones.** Interview-style requirements, personas and platform principles ADR (4 h) · Catalog and ownership model with ingestion (7 h) · Scaffolder and golden-path templates (9 h) · Environment controller with TTL cleanup (9 h) · Scorecards and portal (8 h) · Adoption metrics, docs and demo (3 h)

**Deliverables.** repo with demo cluster; design doc + 3 ADRs; developer onboarding guide; adoption metric dashboard

**Done when.** A new service goes from request to deployed in under 30 minutes in a timed demo, environments ready in under 8 minutes, and 38 of 40 catalog services have owners.

**Measure.** Time to first deploy, environment provisioning time, catalog coverage, scorecard pass rates, platform tickets avoided

**Pitfalls.** Building a portal nobody asked for; Templates that drift from live services; Treating the platform as a product with no users

**Stretch.** Add cost showback per team; Add a plugin system for team-specific templates

### Active-passive multi-region failover for a payments API
`mx-ops-multi-region-failover` · Y3 · level 5 · 40 h · Go or Python, PostgreSQL streaming replication, HAProxy or Envoy, Docker network partitions, toxiproxy, Terraform

**Scenario.** Kitepay, a payments startup, committed to 99.95% availability after a regional cloud outage cost a partner contract. They need a tested failover design for a stateless API plus a replicated database.

**Functional.** Deploy the API in two regions with health-checked traffic steering; Cross-region database replication with measured lag; Failover runbook and automation with a human confirmation gate; Idempotency so retried payments are never charged twice; Failback procedure after the primary recovers

**Non-functional.** Failover completes in under 4 minutes from decision; RPO under 10 seconds of acknowledged payments; Zero duplicate charges across 50,000 retried requests in drills

**Constraints.** Simulate two regions with two clusters or networks on one machine; Primary region may be wholly unreachable

**Architecture.** Traffic is steered by health checks and a DNS or proxy layer; the database replicates asynchronously with a promotion procedure; idempotency keys make retries safe across the switch. Components: Dual-region deployment, Traffic steering, DB replication and promotion, Idempotency layer, Failover controller, Game-day harness

**Data.** Synthetic payment traffic at 300 req/s with injected retries

**Milestones.** Availability math and failure-mode catalogue (5 h) · Two-region stack and replication (9 h) · Idempotency design and tests (6 h) · Failover controller and runbook (8 h) · Game days with partitions and failback (9 h) · Report (3 h)

**Deliverables.** repo with simulated regions; design doc + 3 ADRs; game-day report; failover runbook

**Done when.** In 10 game days failover finishes under 4 minutes, acknowledged-payment loss stays under 10 s of writes, and no duplicate charge appears in 50,000 retries.

**Measure.** Failover time, data loss window, duplicates, error rate during switch, failback time

**Pitfalls.** Split-brain after partial partition; Idempotency keys expiring before retries end; DNS TTLs longer than the failover target

**Stretch.** Add automated failover with quorum-based decision; Try active-active for reads

### Move order processing to events with a transactional outbox
`mx-ops-outbox-event-migration` · Y3 · level 5 · 38 h · Go or Python, PostgreSQL, Kafka or NATS JetStream, Docker Compose, OpenTelemetry

**Scenario.** Gridiron Foods' order service calls four downstream services synchronously and a slow warehouse API takes orders down. They need reliable asynchronous integration without losing or duplicating orders.

**Functional.** Implement the transactional outbox pattern for order events; Relay events to a broker with at-least-once delivery; Idempotent consumers with deduplication; Saga for order, payment and fulfilment with compensation; Observability for event lag and poison messages

**Non-functional.** No lost or duplicate order effects in 1M events with injected crashes; Order API p99 under 120 ms even when downstream is down; End-to-end event lag under 2 seconds at 500 orders/s

**Constraints.** Single machine with Docker Compose; Broker may be restarted at any time

**Architecture.** Orders and outbox rows commit in one transaction; a relay publishes to the broker; consumers record processed IDs; a saga orchestrator manages compensation. Components: Order service, Outbox relay, Broker, Idempotent consumers, Saga orchestrator, Chaos harness

**Data.** Synthetic order stream at 500 orders/s with random crashes

**Milestones.** Failure-mode analysis and design (5 h) · Outbox and relay (8 h) · Idempotent consumers (6 h) · Saga and compensation (9 h) · Crash and chaos tests over 1M events (7 h) · Write-up (3 h)

**Deliverables.** repo; design doc + ADRs; correctness report; lag dashboard

**Done when.** 1M events with injected crashes yield zero lost and zero duplicate effects, order API p99 stays under 120 ms with downstream down, and lag stays under 2 s.

**Measure.** Lost/duplicate count, API latency, event lag, poison message rate, compensation success

**Pitfalls.** Dual write instead of outbox; Consumers that are not truly idempotent; Unbounded retries on poison messages

**Stretch.** Replace polling relay with CDC; Add schema registry and compatibility checks

## graphics

### Fabric and leg configurator preview for a furniture shop
`mx-gfx-sofa-configurator-2d` · Y1-P0 · level 2 · 24 h · Python, moderngl, pyglet, numpy, Pillow

**Scenario.** Hearth & Oak, a 6-store furniture retailer, wants an in-store kiosk where customers pick sofa fabric, leg finish and cushion colour and see a lit preview. Today sales staff flip through paper swatches and about 18% of orders are returned over colour mismatch.

**Functional.** Load a sofa mesh (OBJ) and render it with a Blinn-Phong shader; Swap diffuse textures for 24 fabric swatches and 6 leg finishes at runtime; Orbit camera with mouse and reset-to-front button; Export the current configuration as a PNG plus a JSON order line

**Non-functional.** Render at 60 FPS (frame time under 16.6 ms) at 1920x1080 on integrated graphics; Swatch change visible within 100 ms; Exported PNG matches on-screen image pixel for pixel

**Constraints.** runs offline on a kiosk mini-PC; no GPU newer than a 2018 laptop iGPU

**Architecture.** A Python app owns configuration state and a moderngl render loop; the configuration is a pure data object so the UI and the renderer stay separate. Components: Mesh loader, Material library, Shader pipeline, Orbit camera, Config state and exporter, Kiosk UI

**Data.** Synthetic sofa mesh built by script plus procedurally generated fabric textures (noise weave patterns)

**Milestones.** OBJ loader with normals and index buffers (5 h) · Blinn-Phong shader and orbit camera (6 h) · Material library and runtime texture swap (5 h) · Config state, JSON and PNG export (4 h) · Kiosk UI, profiling, README and demo GIF (4 h)

**Deliverables.** repo with README and demo GIF; shader notes; 10-line kiosk install guide

**Done when.** Holds 60 FPS on the reference iGPU for 5 minutes of orbiting, swatch swap under 100 ms, exported PNG diff is zero.

**Measure.** frame-time histogram, swap latency, exported-file byte size, vertex count vs FPS curve

**Pitfalls.** Flipped normals from OBJ winding; Texture upload stalls when swapping on the render thread; sRGB vs linear colour mismatch with real swatches

**Stretch.** Add a normal map per fabric; Compare against a photo of a real swatch with delta-E

### Terrain heightmap viewer for a regional survey office
`mx-gfx-terrain-heightmap-viewer` · Y1-P0 · level 2 · 22 h · Python, moderngl, numpy, rasterio-free custom reader

**Scenario.** The Ridgeway County survey office has elevation grids as GeoTIFF-like rasters and no way to show councillors what a hillside looks like. They need a fly-over 3D view with contour lines and a slope warning overlay.

**Functional.** Load a heightmap raster and build a triangle grid mesh; Shade by elevation ramp and by slope angle with a slider threshold; Draw contour lines at a configurable interval; Fly camera with WASD and mouse look; Click to read elevation and slope at a point

**Non-functional.** Render a 1024x1024 grid (2M triangles) at 60 FPS; Load a 4096x4096 raster in under 3 s; Elevation readout error under 0.5 m against source data

**Constraints.** runs on a laptop with integrated graphics; no network access

**Architecture.** A loader converts the raster to a float texture and a vertex grid; shading is done in the fragment shader from normals computed on the GPU. Components: Raster loader, Grid mesh builder, Elevation and slope shaders, Contour pass, Fly camera, Picking and readout

**Data.** Synthetic fractal terrain (diamond-square) and a public SRTM tile if available, otherwise synthetic

**Milestones.** Raster loader and grid mesh (5 h) · Lit terrain shader with elevation ramp (5 h) · Slope overlay and contour lines (5 h) · Fly camera and picking readout (4 h) · Benchmarks, README and demo GIF (3 h)

**Deliverables.** repo with README and demo GIF; accuracy test script

**Done when.** 2M-triangle view holds 60 FPS, 4096 raster loads in under 3 s, readout error under 0.5 m on 100 sampled points.

**Measure.** FPS vs grid size, load time, readout error distribution, memory use

**Pitfalls.** Seams and wrong normals at grid borders; Z-fighting between contour pass and terrain; Mixing metres and pixel coordinates

**Stretch.** Add chunked level of detail; Hillshade export as GeoTIFF-style PNG

### Particle effect previewer for an indie studio
`mx-gfx-vfx-particle-previewer` · Y1-P0 · level 2 · 24 h · Python, numpy, moderngl, pyglet, imgui bindings

**Scenario.** Lantern Moth Games has two artists tuning fire, smoke and spark effects by editing JSON and relaunching the game. They want a standalone previewer with live parameter sliders and saved presets.

**Functional.** Emitter model with rate, lifetime, velocity cone, gravity and drag; Colour and size over lifetime curves; Additive and alpha blending modes; Sliders edit parameters live and presets save to JSON; Record 3 seconds of output to a sprite-sheet PNG

**Non-functional.** Simulate and draw 50,000 particles at 60 FPS on a CPU-only update; Parameter change takes effect within one frame; Preset files under 4 KB each

**Constraints.** pure Python plus numpy vectorisation; 1080p window on a mid-range laptop

**Architecture.** Particles live in structure-of-arrays numpy buffers updated per frame and drawn as instanced quads. Components: Emitter, Particle store, Curve evaluator, Instanced renderer, Preset IO, Slider UI

**Data.** Synthetic: artist-style presets written by hand (fire, smoke, sparks, rain)

**Milestones.** Particle store and emission (5 h) · Integration with drag, gravity and curves (5 h) · Instanced rendering and blend modes (5 h) · Slider UI and preset IO (5 h) · Sprite-sheet recorder, benchmark, README (4 h)

**Deliverables.** repo with README and demo GIF; preset pack of 6 effects

**Done when.** 50k particles at 60 FPS, slider latency one frame, sprite-sheet export reproduces the live preview.

**Measure.** particles per frame budget, update ms vs draw ms, preset size, allocation count per frame

**Pitfalls.** Per-particle Python loops instead of array ops; Dead-particle compaction cost; Overdraw from big additive sprites

**Stretch.** Move update to a compute shader; Sub-emitters (sparks from fire)

### Breakout-style arcade game built with studio milestones and playtests
`mx-gfx-breakout-studio-milestones` · Y1-P0 · level 2 · 28 h · Python, pygame

**Scenario.** Tinplate Interactive, a two-person studio, runs every small game through three milestones: prototype, vertical slice and release candidate, with a playtest after each. You build their next jam-sized game that way and document what the playtests changed.

**Functional.** Paddle, ball, bricks with 3 brick types and 10 levels; Power-ups: multiball, wide paddle, slow ball; Score, lives, pause and high-score file; Level files loadable from text so designers can edit them; Telemetry log of deaths per level for playtests

**Non-functional.** Fixed 60 Hz simulation step independent of render rate; Input to screen latency under 50 ms measured with a frame counter; No frame drop below 55 FPS with 200 live bricks and effects

**Constraints.** pygame or equivalent, no engine; 3 playtesters with 15 minutes each per milestone

**Architecture.** A fixed-timestep loop drives a game-state module separate from rendering; levels and telemetry are plain files. Components: Game loop, Collision and physics, Level loader, Power-up system, HUD and menus, Telemetry logger

**Data.** Synthetic: hand-authored level files; playtest notes you collect from friends

**Milestones.** M1 prototype: ball, paddle, bricks (5 h) · Playtest 1 and fix list (3 h) · M2 vertical slice: power-ups, 3 levels, juice (8 h) · Playtest 2, telemetry analysis, rebalance (4 h) · M3 release candidate: 10 levels, menus, build (5 h) · Post-mortem write-up (3 h)

**Deliverables.** repo with README and demo GIF; playtest reports (3); post-mortem with before/after difficulty curves

**Done when.** Three playtests logged, deaths-per-level curve flattened to under 3x between easiest and hardest level, 55+ FPS with 200 bricks.

**Measure.** deaths per level, completion rate, input latency, FPS floor, number of design changes caused by playtests

**Pitfalls.** Tunnelling at high ball speed; Variable timestep making physics feel different on fast machines; Shipping without a playtest because it feels fine

**Stretch.** Gamepad support; Level editor mode

### Wind and pressure field visualiser for a coastal weather desk
`mx-gfx-wind-field-visualiser` · Y1-P0 · level 2 · 23 h · Python, numpy, matplotlib or moderngl, imageio

**Scenario.** Seagate Marine Weather publishes shipping forecasts and wants animated wind charts instead of static arrow maps. The desk has gridded forecast files and wants a tool producing a looping animation with streamlines and pressure contours.

**Functional.** Read a gridded wind (u,v) and pressure file for several time steps; Draw colour-mapped wind speed with streamline animation; Overlay pressure isobars every 4 hPa; Time slider and exported MP4 or GIF loop; Click for point value readout

**Non-functional.** Render a 720x360 grid with 5,000 streamline particles at 30 FPS; Interpolation error under 1% against grid values at nodes; Export a 48-frame loop in under 20 s

**Constraints.** runs offline on a laptop; numpy and matplotlib or moderngl only

**Architecture.** A field class does bilinear sampling in space and linear interpolation in time; particles advect through it and fade with age. Components: Grid reader, Field sampler, Particle advector, Isobar contouring, Animation exporter, Readout UI

**Data.** Synthetic analytic vortex plus jet-stream fields, and a public reanalysis sample (e.g. NCEP/NCAR reanalysis) if available

**Milestones.** Grid reader and bilinear sampler (5 h) · Particle advection with RK2 (5 h) · Colour mapping and isobars (5 h) · Time interpolation and exporter (4 h) · Validation against analytic fields, README (4 h)

**Deliverables.** repo with README and demo GIF; validation notebook

**Done when.** Animation at 30 FPS with 5,000 particles, node interpolation error under 1%, 48-frame export under 20 s.

**Measure.** advection error vs step size, FPS vs particle count, export time

**Pitfalls.** Wrap-around at the date line; Euler advection spiralling outward in vortices; Colour maps misleading for diverging data

**Stretch.** Add temperature as a second layer; Compare RK2 and RK4 particle paths

### Cellular-automaton evacuation model for a 30,000-seat stadium
`mx-gfx-stadium-evacuation-grid` · Y1-P0 · level 3 · 24 h · Python, numpy, matplotlib

**Scenario.** The Northbank Arena safety officer must show the council that stands empty within the 8-minute target. They need a quick grid-based model that compares exit configurations before commissioning an expensive agent-based study.

**Functional.** Load a floor plan from a text/PNG grid with walls, seats, stairs and exits; Floor-field cellular automaton moving agents toward exits; Scenarios: all exits open, one blocked, one narrowed; Output evacuation-time curve and congestion heatmap; Seeded runs for repeatability

**Non-functional.** Simulate 30,000 agents in under 60 s wall time per scenario; Same seed gives bit-identical results; Evacuation time within 15% of a hand-calculated flow bound on a simple corridor test

**Constraints.** numpy vectorisation, no compiled extensions; runs on a laptop

**Architecture.** A static floor field (distance to nearest exit) plus a dynamic occupancy rule moves agents in parallel with conflict resolution. Components: Plan loader, Floor-field builder, Agent stepper, Conflict resolver, Scenario runner, Heatmap and curve plotter

**Data.** Synthetic stadium plan generated by script; Fruin-style flow rates cited from public guidance by name

**Milestones.** Plan loader and distance field (5 h) · Agent stepping and conflict rules (6 h) · Scenario runner and seeding (4 h) · Validation on corridor and door tests (5 h) · Heatmaps, report, README (4 h)

**Deliverables.** repo with README and demo GIF; validation report; scenario comparison table

**Done when.** 30k agents under 60 s, identical seeds identical output, corridor flow within 15% of the analytic bound.

**Measure.** evacuation time per scenario, peak density, throughput per exit, wall-clock per run

**Pitfalls.** Agents swapping places through each other; Unrealistic instantaneous movement speed; Mistaking model output for a safety certificate

**Stretch.** Add mobility-impaired agents with slower speed; Fire/smoke blocking cells over time

### Lap time simulator for a formula-student racing team
`mx-gfx-lap-time-point-mass` · Y1-P0 · level 3 · 25 h · Python, numpy, matplotlib

**Scenario.** Fenmoor Racing, a university formula team, wants to decide gear ratios and downforce before building. They need a quasi-steady-state point-mass lap simulator driven by a track centreline and a car spec.

**Functional.** Track from centreline points with curvature; Car spec: mass, power curve, drag, downforce, tyre friction; Forward/backward speed-profile solver with grip and power limits; Lap time and speed trace output; Parameter sweeps: downforce vs drag trade-off

**Non-functional.** Lap time within 3% of a reference scripted result on two benchmark tracks; Solve a 5 km track at 1 m resolution in under 2 s; Energy and speed profile conservation errors under 0.5%

**Constraints.** pure Python plus numpy; one laptop

**Architecture.** The solver computes the corner speed limit from curvature, then does a forward acceleration and backward braking pass and takes the minimum. Components: Track builder, Car model, Corner-speed limiter, Forward-backward solver, Sweep runner, Plots

**Data.** Synthetic tracks (oval, autocross, skidpad) and a spec sheet you invent

**Milestones.** Track curvature from centreline (5 h) · Car model and limits (5 h) · Forward-backward solver (6 h) · Validation on skidpad and straight-line tests (5 h) · Sweeps and report (4 h)

**Deliverables.** repo with README; sweep report with plots; validation tests

**Done when.** Skidpad time matches analytic sqrt(r/mu g) within 1%, 5 km lap in under 2 s, sweeps reproducible.

**Measure.** lap time sensitivity per parameter, solver runtime, validation error

**Pitfalls.** Noisy curvature from jagged centreline; Ignoring load transfer then over-trusting results; Unit mix-ups between km/h and m/s

**Stretch.** Add load transfer with a bicycle model; Optimise gear ratios with a simple search

### CAD model viewer with live section planes for a pump manufacturer
`mx-gfx-cad-section-viewer` · Y1-P1 · level 3 · 28 h · C++17, OpenGL 3.3, GLFW, GLM

**Scenario.** Kelvane Pumps sends STL/OBJ assemblies to field engineers who cannot open the CAD tool. They want a light viewer where an engineer slices through a pump housing with up to three clip planes and sees the cut face capped.

**Functional.** Load STL and OBJ files, auto-centre and fit to view; Up to 3 interactive clip planes with drag handles; Solid cap on the cut face using the stencil buffer; Toggle wireframe, edges and per-part visibility; Screenshot export with scale bar

**Non-functional.** Handle a 2M-triangle model at 60 FPS on a mid-range GPU; Clip-plane drag latency under one frame; Cut-cap correct on 10 of 10 closed test meshes

**Constraints.** C++17 and OpenGL 3.3 core; single-header or small dependency set

**Architecture.** A scene holds parts as vertex buffers; clip planes are uniform arrays and the cap is drawn by a two-pass stencil technique. Components: Mesh loaders, Scene graph, Clip-plane manager, Stencil cap pass, Camera, Screenshot exporter

**Data.** Synthetic parts built with a generator script (gear housing, pipe elbow) and public sample STL models by name

**Milestones.** STL/OBJ loaders, scene and camera (6 h) · Basic shading and edge rendering (5 h) · Clip planes (5 h) · Stencil capping (7 h) · Test meshes, perf, README (5 h)

**Deliverables.** repo with README and demo GIF; test mesh suite; perf table

**Done when.** 2M triangles at 60 FPS, 10/10 closed meshes capped correctly, plane drag has no dropped frames.

**Measure.** FPS vs triangles, load time, stencil pass cost in ms, failure cases list

**Pitfalls.** Non-manifold meshes break stencil capping; Cap z-fighting with the cut surface; Normals missing in STL requiring recompute

**Stretch.** Section view outlines as vector DXF export; Measure tool between two picked points

### First-person walkthrough viewer for an architecture studio
`mx-gfx-arch-walkthrough-lite` · Y1-P1 · level 3 · 29 h · C++17, OpenGL, GLFW, GLM, tinygltf-style loader

**Scenario.** Brightline Architects hands clients PDF renders. They want a small viewer where a client walks through a 3-storey apartment block model with collisions, doors and a day/night toggle.

**Functional.** Load glTF scenes with textures and a material table; First-person camera with collision against walls and floors; Interactive doors and a stairs-aware floor snap; Day/night lighting presets with a shadow map for the sun; Bookmarked viewpoints saved to JSON

**Non-functional.** Hold 60 FPS at 1080p for a 500k-triangle scene; Collision query under 0.2 ms per frame; Shadow map covers the scene with no visible peter-panning at default settings

**Constraints.** C++17, OpenGL 3.3; runs on a client laptop

**Architecture.** A scene loader builds draw batches per material; a simple triangle BVH serves collision queries for a capsule controller. Components: glTF loader, Batcher, Capsule controller and BVH, Shadow map pass, Door interaction, Viewpoint store

**Data.** Synthetic apartment block generated by a Python script exported to glTF

**Milestones.** glTF loader and batching (6 h) · First-person controller and BVH collision (8 h) · Shadow mapping and lighting presets (6 h) · Doors, stairs, viewpoints (5 h) · Profiling, README, demo (4 h)

**Deliverables.** repo with README and demo GIF; scene generator script

**Done when.** 500k triangles at 60 FPS, collision under 0.2 ms, walk the full model with no wall escapes in a 10-minute fuzz walk.

**Measure.** frame time breakdown, BVH build time, collision cost, escapes found in fuzz walk

**Pitfalls.** Capsule sticking on stair edges; Shadow acne and peter-panning trade-off; Draw call explosion from per-object materials

**Stretch.** Light baking for static scenes; VR-style teleport movement

### Tilemap level editor with hot reload for a platformer studio
`mx-gfx-tilemap-editor-hot-reload` · Y1-P1 · level 3 · 27 h · C++17 with SDL2 and Dear ImGui (or Python with pygame as alternative)

**Scenario.** Moss & Rivet Games has designers waiting 40 seconds per rebuild to test a level tweak. They want an editor that places tiles and entities and pushes changes into the running game instantly.

**Functional.** Paint tiles, entities and triggers on layered grids; Save/load a versioned JSON level format with migration; File watcher triggers hot reload of levels and sprite sheets in the running game; Undo/redo for all edits; Play-from-here button that spawns the player at the cursor

**Non-functional.** Level change visible in the running game within 300 ms of save; Undo stack of 500 operations with under 5 ms per op; Editor handles a 512x512 tile level at 60 FPS

**Constraints.** C++17 or Python with SDL; no heavy engine; designers use Windows and Linux

**Architecture.** The editor and the game share a level library; a watcher thread posts reload events to the game's main loop through a queue. Components: Level model, Command stack, File watcher, Reload bridge, Tile painter UI, Format migrator

**Data.** Synthetic tilesets drawn in code and 5 hand-made levels

**Milestones.** Level model and JSON format (5 h) · Tile painter and rendering (6 h) · Command-based undo/redo (5 h) · File watcher and hot reload (6 h) · Play-from-here, perf, README (5 h)

**Deliverables.** repo with README and demo GIF; format spec with migration notes

**Done when.** Save-to-visible under 300 ms in 50 trials, 500-op undo/redo correct under random-edit fuzzing, 60 FPS on 512x512.

**Measure.** reload latency distribution, undo cost, fuzz iterations, file size

**Pitfalls.** Half-written file read by the watcher; Reload losing player state; Format changes breaking old levels

**Stretch.** Prefab entities; Networked collaborative editing

### Small top-down shooter shipped with milestone reviews and playtests
`mx-gfx-space-shooter-gdd-to-release` · Y1-P1 · level 3 · 32 h · C++17, SDL2, a small audio mixer

**Scenario.** Cobalt Fern Studio ships a 2-hour top-down shooter each quarter with gated milestones. You play the whole team: design doc, prototype, vertical slice, beta and release, with a playtest and a go/no-go note at each gate.

**Functional.** Player ship, 4 enemy types, 2 boss fights, 3 weapons; Wave spawner driven by data files; Audio, particles and screen-shake feedback; Save progress, options menu, controller support; Playtest build with anonymous telemetry

**Non-functional.** Fixed 120 Hz simulation tick, render capped at display rate; Memory under 150 MB and no allocation in the hot loop after load; Crash-free in 30 minutes of soak test

**Constraints.** C++17 and SDL2, no engine; 4 playtesters per milestone

**Architecture.** A fixed-step game loop updates data-driven entities; systems are plain functions over component arrays. Components: Game loop, Entity storage, Enemy and weapon data, Wave director, Audio and VFX, Telemetry

**Data.** Synthetic art (shapes and sprites made in code) and generated sound effects

**Milestones.** Game design doc and prototype (6 h) · Playtest 1, fix list (3 h) · Vertical slice: one level, one boss (8 h) · Playtest 2, balance with telemetry (4 h) · Beta: all content, options, save (6 h) · Release candidate, soak test, post-mortem (5 h)

**Deliverables.** repo with README and demo GIF; GDD; playtest reports; post-mortem

**Done when.** Soak test 30 minutes crash-free, memory under 150 MB, clear before/after balance evidence from telemetry.

**Measure.** time-to-death per wave, completion rate, FPS floor, memory, bugs found per milestone

**Pitfalls.** Scope creep before the vertical slice; Tuning by feel without telemetry; Allocation spikes causing hitches

**Stretch.** Local co-op; Steam-style achievements system

### Software rasteriser for server-side product thumbnails
`mx-gfx-thumbnail-rasteriser` · Y1-P1 · level 3 · 29 h · C++17, stb-style image IO, std::thread

**Scenario.** Larchwood Home sells 3,000 products online and has no GPU on its image-resize servers. They need a CPU rasteriser that renders turntable thumbnails from product meshes in a nightly batch.

**Functional.** Triangle rasterisation with barycentric coordinates and z-buffer; Perspective-correct texture mapping and Gouraud/Phong shading; Backface culling and near-plane clipping; Batch CLI that renders 8 turntable angles per model to PNG; Multithreaded tiles

**Non-functional.** Render a 512x512 thumbnail of a 100k-triangle model in under 150 ms on 4 cores; 3,000 models x 8 angles overnight in under 4 hours on one 4-core server; Image difference from a reference GPU render has mean error under 2 grey levels

**Constraints.** no GPU; C++17 with a thread pool, no graphics libraries

**Architecture.** The pipeline transforms vertices, clips, bins triangles into 64x64 tiles, and each worker rasterises its tiles. Components: Mesh and texture loader, Vertex transform and clipping, Tile binner, Rasteriser, Shader functions, Batch CLI

**Data.** Synthetic product meshes and procedural textures

**Milestones.** Barycentric rasteriser and z-buffer (6 h) · Perspective-correct texturing and shading (6 h) · Clipping and culling (5 h) · Tile binning and threading (7 h) · Batch CLI, accuracy tests, README (5 h)

**Deliverables.** repo with README and sample outputs; accuracy comparison; perf table

**Done when.** 150 ms per 512x512 thumbnail on 4 cores, nightly batch under 4 hours, mean error under 2 grey levels vs reference.

**Measure.** ms per frame by stage, scaling vs thread count, image difference, cache-miss notes

**Pitfalls.** Affine texture warp; Cracks between triangles from inconsistent fill rules; False sharing between worker tiles

**Stretch.** SIMD inner loop; Antialiasing with 4x supersampling

### Vector map tile renderer for a bike-courier startup
`mx-gfx-vector-map-renderer` · Y1-P1 · level 3 · 29 h · C++17, OpenGL ES 3.0 subset, earcut-style tessellation (own implementation)

**Scenario.** SwiftSpoke, a bike-courier startup, pays per-view fees for a map SDK. They want an in-house renderer that draws city streets, parks and labels from vector data on an old tablet in the courier's cradle.

**Functional.** Parse a simplified vector tile format with lines, polygons and points; Tessellate polygons and extrude road lines with joins and caps; Style sheet (JSON) mapping layers to colours and widths by zoom; Pan and zoom with smooth inertia; Label placement with collision avoidance

**Non-functional.** 60 FPS panning on a 2018 tablet GPU with 20,000 visible features; Tile parse plus upload under 8 ms per tile; Label collision pass under 3 ms per frame

**Constraints.** OpenGL ES 3.0 compatible subset; offline, tiles preloaded for the city

**Architecture.** Tiles are tessellated once on load into GPU buffers; the frame draws visible tiles per style layer and runs a label pass. Components: Tile parser, Tessellator, Style engine, Camera and inertia, Label placer, Renderer

**Data.** A public street dataset extract (OpenStreetMap-style) for a small city, converted by a script, or a synthetic street grid

**Milestones.** Tile parser and data model (5 h) · Polygon tessellation and line extrusion (8 h) · Style engine and zoom interpolation (5 h) · Camera inertia and tile cache (5 h) · Label placement, perf, README (6 h)

**Deliverables.** repo with README and demo GIF; style-sheet spec; perf table

**Done when.** 60 FPS with 20k features on the reference tablet, tile load under 8 ms, labels never overlap in a 100-position test.

**Measure.** frame time, tile load ms, label pass ms, GPU memory per tile

**Pitfalls.** Self-intersecting polygons breaking tessellation; Line joins producing miter spikes; Label flicker between frames

**Stretch.** Rotating map with heading-up mode; Signed-distance-field text

### CT volume ray-marching viewer for a radiology teaching unit
`mx-gfx-ct-volume-raymarcher` · Y1-P1 · level 4 · 30 h · C++17, OpenGL 4.3, GLFW, Dear ImGui

**Scenario.** Holloway Teaching Hospital's radiology trainees scroll slices only. The unit wants a 3D volume view of CT scans with adjustable windowing and transfer functions so trainees can see bone, vessel and soft tissue in context.

**Functional.** Load a CT volume from a raw/NIfTI-like file into a 3D texture; GPU ray marching with front-to-back compositing; Transfer function editor and window/level control; Clipping box and MIP mode; Axial, coronal, sagittal slice views synced to a 3D cursor

**Non-functional.** Render a 512x512x300 volume at 30 FPS at 1280x720 on a mid-range GPU; Early ray termination saves at least 30% frame time on a bone preset; Window/level changes apply within one frame

**Constraints.** OpenGL 4.3, no CUDA; scans are anonymised public data

**Architecture.** A fragment shader marches rays through a 3D texture from the entry face with step size tied to voxel spacing and accumulates opacity. Components: Volume loader, 3D texture upload, Ray marcher shader, Transfer function, Slice views, UI

**Data.** A public CT sample collection (e.g. a Visible Human or TCIA-style anonymised study) or a synthetic phantom volume

**Milestones.** Loader and slice viewer (6 h) · Ray marcher with compositing (8 h) · Transfer functions and windowing (6 h) · Early termination and gradient shading (6 h) · Perf study, README, demo (4 h)

**Deliverables.** repo with README and demo GIF; perf report; transfer-function presets

**Done when.** 30 FPS at 720p on the 512x512x300 volume, early termination saves 30%+, slice and 3D cursor agree to within one voxel.

**Measure.** FPS vs step size, early-termination saving, memory use, image difference vs reference at half step

**Pitfalls.** Banding from large step sizes; Wrong voxel spacing causing stretched anatomy; Not clearly labelling this as non-diagnostic

**Stretch.** Pre-integrated transfer function; Segmentation mask overlay

### Animation retargeting tool for a character studio
`mx-gfx-skeleton-retarget-tool` · Y1-P1 · level 4 · 31 h · C++17 with OpenGL preview (or Python numpy plus moderngl)

**Scenario.** Pixel Harbour has a bought library of 300 mocap clips on one skeleton and 5 characters with different proportions and bone names. They need an offline tool to retarget clips with sensible foot contact and no sliding.

**Functional.** Load BVH-like clips and a target skeleton with bone-name mapping; Retarget rotations with rest-pose correction and scale root motion; Two-bone IK foot fix with contact detection; Preview playback with skeleton overlay; Batch convert a folder of clips to the target format

**Non-functional.** Retarget a 10-second 60 Hz clip in under 200 ms; Foot sliding under 2 cm average on walk and run clips; Batch of 300 clips in under 2 minutes

**Constraints.** C++17 or Python; no proprietary SDKs

**Architecture.** Each clip is converted to world-space joint rotations, re-expressed relative to the target rest pose, then post-processed by contact-aware IK. Components: Clip parser, Skeleton mapper, Retarget core, Foot IK, Previewer, Batch CLI

**Data.** Synthetic walk and run clips generated procedurally plus public mocap clips (e.g. CMU mocap database) by name

**Milestones.** Parsers and skeleton model (6 h) · Retarget core with rest-pose correction (8 h) · Foot contact detection and IK (8 h) · Previewer and metrics (5 h) · Batch tool, README (4 h)

**Deliverables.** repo with README and demo GIF; metrics report

**Done when.** Foot sliding under 2 cm average on 20 test clips, 300-clip batch under 2 minutes, no flipped bones on any clip.

**Measure.** foot slide cm, retarget ms, joint-angle error vs ground truth when source=target

**Pitfalls.** Quaternion double-cover sign flips; Wrong rest-pose assumptions between skeletons; IK popping at contact boundaries

**Stretch.** Hand-finger retargeting; Blend smoothing between clips

### Entity-component-system module for a small game studio
`mx-gfx-ecs-module-for-studio` · Y1-P1 · level 4 · 29 h · C++17, CMake, Catch2-style tests

**Scenario.** Brindle Works has outgrown inheritance trees in its prototype. They want a standalone, tested ECS library that three of their games can share, with predictable iteration performance.

**Functional.** Archetype or sparse-set component storage with typed access; Entity creation, destruction and generational handles; System scheduler with declared read/write sets; Queries with include/exclude filters; Serialisation of world snapshots

**Non-functional.** Iterate 1M entities with 2 components in under 5 ms; Create or destroy 100k entities in under 20 ms; Zero heap allocation in steady-state iteration

**Constraints.** C++17, header-only; no external dependencies except a test framework

**Architecture.** Components live in contiguous arrays keyed by archetype; queries cache the matching archetype list and invalidate on structural change. Components: Entity allocator, Component storage, Query engine, Scheduler, Snapshot IO, Benchmarks

**Data.** Synthetic worlds generated by the benchmark suite

**Milestones.** Handles and storage (7 h) · Queries and filters (6 h) · Scheduler with conflict detection (6 h) · Snapshots and tests (5 h) · Benchmarks vs naive object array, README (5 h)

**Deliverables.** repo with README; benchmark report; API doc; ADR on archetype vs sparse set

**Done when.** 1M-entity iteration under 5 ms, 100k create/destroy under 20 ms, no steady-state allocations verified with an allocator hook.

**Measure.** ns per entity iterated, cache misses, structural change cost, memory per entity

**Pitfalls.** Dangling references after structural change; Template bloat hurting compile times; Benchmarking with data that fits in L1

**Stretch.** Parallel system execution; Event bus

### Real-time audio mixer module for a game engine
`mx-gfx-audio-mixer-module` · Y1-P1 · level 4 · 30 h · C++17, miniaudio-style backend, CMake

**Scenario.** Dovetail Games' sound designer hears pops when many effects play. The studio wants a lock-free mixer module with voices, buses, fades and a simple reverb that never blocks the audio callback.

**Functional.** Decode WAV and OGG-style assets into memory or stream them; Voice pool with volume, pitch and pan, priority stealing; Buses with gain and a one-pole low-pass; Schroeder reverb on a send bus; Command queue from game thread to audio thread

**Non-functional.** Audio callback at 48 kHz, 256-sample buffer, never exceeds 30% of its time budget with 64 voices; Zero locks or allocations in the callback; Fade-in click-free (peak step under -60 dBFS)

**Constraints.** C++17, miniaudio-style device backend allowed; runs on Linux and Windows

**Architecture.** The game thread posts commands to a single-producer single-consumer ring buffer; the audio callback drains them, mixes voices into buses and writes the output. Components: Asset decoder, Voice pool, Bus graph, Reverb, SPSC command queue, Test harness

**Data.** Synthetic test tones and noise generated in code, plus CC0 sounds by name

**Milestones.** Device backend and one voice (5 h) · Voice pool, pitch, pan, stealing (7 h) · Buses, filters, fades (6 h) · Lock-free command queue (6 h) · Reverb, offline render tests, README (6 h)

**Deliverables.** repo with README; offline render test suite; callback timing report

**Done when.** 64 voices under 30% of callback budget at 256 samples, no allocations detected, fades produce no clicks.

**Measure.** callback time percentile, underruns per hour, CPU per voice, THD of pitch shifter

**Pitfalls.** Pitch shifting without interpolation causing aliasing; Priority inversion if callback takes a mutex; Denormals slowing the reverb tail

**Stretch.** 3D positional panning; Streaming music with crossfades

### Smoke and wind-tunnel stable-fluids demo for a science museum
`mx-gfx-stable-fluids-cpu-smoke` · Y1-P1 · level 4 · 28 h · C++17, SDL2 or OpenGL for display

**Scenario.** Tidewater Science Museum wants an interactive exhibit where visitors drag a mouse to stir smoke and place obstacles in a virtual wind tunnel. It must run on a modest exhibit PC all day.

**Functional.** 2D Stam stable-fluids solver with advection, diffusion and pressure projection; Obstacles with no-slip boundaries; Dye and temperature (buoyancy) fields; Mouse forces and obstacle painting; Vorticity confinement toggle

**Non-functional.** Run a 256x256 grid at 60 FPS on 4 cores; Divergence after projection under 1e-3 of initial magnitude; Runs 8 hours without memory growth beyond 5%

**Constraints.** CPU only, C++17; exhibit PC with integrated graphics

**Architecture.** Each frame runs add-forces, advect-velocity, project, advect-dye; the pressure solve uses Gauss-Seidel or a multigrid cycle. Components: Grid fields, Advection, Pressure solver, Obstacle masks, Renderer, Input handler

**Data.** Synthetic: user input and analytic test flows (Taylor-Green vortex)

**Milestones.** Grid, advection and diffusion (6 h) · Projection solver (7 h) · Obstacles and buoyancy (5 h) · Interaction, rendering, vorticity (5 h) · Validation on Taylor-Green, soak test, README (5 h)

**Deliverables.** repo with README and demo GIF; validation plots; soak test log

**Done when.** 256x256 at 60 FPS, divergence reduced as stated, 8-hour soak with memory drift under 5%.

**Measure.** energy decay vs analytic, divergence residual, ms per solver stage, memory over time

**Pitfalls.** Semi-Lagrangian numerical diffusion smoothing out detail; Pressure solve too few iterations; Unstable boundaries at obstacle corners

**Stretch.** Port the pressure solve to multigrid; Add a 3D slice view

### Geometry clipmap terrain renderer for a flight-training simulator
`mx-gfx-terrain-clipmap-lod` · Y2 · level 4 · 32 h · C++17, OpenGL 4.5, GLM

**Scenario.** Skyline Flight School's visual system shows a 200 km x 200 km region and stutters when the hill-side detail pops. They need a continuous-LOD terrain renderer fed by tiled elevation and imagery.

**Functional.** Nested clipmap rings with toroidal updates; Heightmap streaming from tiled files on a background thread; Blend between LOD rings to remove popping and cracks; Satellite-style texture draping with a splat detail layer; Frustum culling and horizon culling

**Non-functional.** 60 FPS at 1080p over the full region at 3 m near resolution; Camera moving 120 m/s causes no frame over 20 ms; Less than 600 MB GPU memory

**Constraints.** OpenGL 4.5; terrain files on SSD

**Architecture.** Camera-centred square rings of fixed vertex count are shifted each frame; new height rows stream in and are written to a toroidal texture. Components: Tile store, Streaming thread, Clipmap manager, Ring mesh, Terrain shaders, Culling

**Data.** Public elevation source (e.g. SRTM-style 1-arc-second tiles) or synthetic fractal tiles

**Milestones.** Tile format and streaming (7 h) · Clipmap rings and toroidal update (9 h) · Seam and morph handling (6 h) · Texturing and culling (6 h) · Flight-path benchmark, README (4 h)

**Deliverables.** repo with README and flight demo capture; design doc with ADR on clipmaps vs quadtree; perf report

**Done when.** Flight benchmark of 10 minutes at 120 m/s with 99.9th percentile frame under 20 ms and under 600 MB VRAM.

**Measure.** frame-time percentiles, streaming throughput MB/s, VRAM, visual error in pixels

**Pitfalls.** Cracks between rings; Streaming thread stalls from blocking IO; Precision loss far from origin

**Stretch.** Virtual texturing for imagery; Procedural detail synthesis

### PBR image-based-lighting renderer for a kitchen showroom configurator
`mx-gfx-pbr-ibl-configurator` · Y2 · level 4 · 32 h · C++17, OpenGL 4.5, GLFW, stb_image

**Scenario.** Granite & Grain Kitchens sells worktops where the stone look depends on lighting. Their online configurator needs a physically based renderer with image-based lighting so a customer sees marble, quartz and steel under a showroom and a daylight environment.

**Functional.** Cook-Torrance GGX BRDF with metal-roughness workflow; Diffuse irradiance and specular prefiltered maps generated from an HDR environment; BRDF look-up table; Material gallery with 20 worktop materials and edge profiles; Tone mapping and exposure control

**Non-functional.** 60 FPS at 1440p with 20 materials on screen; Prefilter an HDR 1k environment in under 2 s; Match a reference offline render with mean luminance error under 3%

**Constraints.** OpenGL 4.5 core; assets under 200 MB

**Architecture.** An offline-at-load pass convolves the environment into irradiance and prefiltered mip chains; the runtime shader samples them with the split-sum approximation. Components: HDR loader, Environment prefilter, BRDF LUT, Material system, PBR shader, Tone mapper

**Data.** Public CC0 HDR environment maps by name and procedural material textures

**Milestones.** HDR loading, cubemap, skybox (5 h) · Irradiance and specular prefilter (8 h) · PBR shader and BRDF LUT (7 h) · Material gallery and tone mapping (6 h) · Reference comparison against a CPU path-traced render, README (6 h)

**Deliverables.** repo with README and demo GIF; comparison report; material authoring guide

**Done when.** 60 FPS at 1440p, prefilter under 2 s, mean luminance error under 3% against reference on 5 materials.

**Measure.** frame time, prefilter time, error vs reference, shader ALU cost

**Pitfalls.** Energy gain at high roughness; Seams in cubemap mip filtering; Gamma errors in albedo textures

**Stretch.** Clear-coat layer; Screen-space reflections

### Forklift operator training simulator for a distribution centre
`mx-gfx-forklift-training-sim` · Y2 · level 4 · 34 h · C++17 with OpenGL, or Rust with wgpu

**Scenario.** Eastgate Logistics trains 40 forklift drivers a year on real trucks in the aisle, with two pallet-damage incidents per year. They want a desktop simulator with realistic steering, mast and load dynamics and scored exercises.

**Functional.** Rear-steer vehicle model with load-dependent stability; Mast tilt and lift with fork-pallet contact; Exercises: aisle slalom, pallet put-away to 6 m racking, dock loading; Scoring on time, collisions, speed limits and load tilt; Replay of a run with a ghost of the best run

**Non-functional.** Fixed 120 Hz physics step, render at 60 FPS; Tip-over trigger within 5% of the analytic stability triangle limit; Score is deterministic: same inputs give identical scores

**Constraints.** gamepad or wheel input; runs on a 6-year-old office PC

**Architecture.** A vehicle module integrates a 3-DOF planar model plus a load centre-of-gravity check; the exercise system watches events and builds scores. Components: Vehicle model, Mast and load, Exercise scripts, Scoring, Replay recorder, Renderer

**Data.** Synthetic warehouse scene and a fictional truck spec sheet

**Milestones.** Vehicle model and input mapping (8 h) · Mast, forks and pallet contact (8 h) · Stability and tip-over test (6 h) · Exercises and scoring (6 h) · Replay, determinism test, README (6 h)

**Deliverables.** repo with README and demo GIF; vehicle spec and stability maths note; scoring rubric

**Done when.** Determinism test across 100 recorded runs, tip-over threshold within 5% of analytic, 60 FPS on reference PC.

**Measure.** stability margin error, determinism pass rate, frame time, score variance across 5 testers

**Pitfalls.** Penetration of forks into pallets; Non-deterministic score from floating-point order; Realism that is not fun or learnable

**Stretch.** Add pedestrian crossing hazard events; Instructor dashboard with run history

### BVH-accelerated picking and measuring for large CAD assemblies
`mx-gfx-bvh-pick-measure-cad` · Y2 · level 4 · 31 h · C++17, OpenGL viewer from earlier project optional

**Scenario.** Kelvane Pumps' field engineers want to click on a large assembly and measure distances, hole diameters and clearances. Picking in the existing viewer takes 400 ms on a 5M-triangle model.

**Functional.** Build a SAH BVH over all parts with refit on part transform change; Ray picking returning part, triangle and hit point; Point-to-point, point-to-plane and min-distance part-to-part measurement; Snap to vertices, edges and circle centres; Persist measurements with the model

**Non-functional.** Pick latency under 5 ms on a 5M-triangle assembly; BVH build under 2 s for 5M triangles on 8 threads; Measurement accuracy within 0.01 mm on test parts

**Constraints.** C++17; memory under 1 GB

**Architecture.** A two-level BVH separates part-level from triangle-level trees so part moves refit only the top level. Components: Mesh store, BVH builder, Picking, Measure tools, Snapping, Persistence

**Data.** Synthetic assemblies with known geometry (cylinders, gears) and public sample STLs

**Milestones.** BVH builder with SAH (8 h) · Ray picking and tests (5 h) · Two-level structure and refit (7 h) · Snapping and measures (7 h) · Accuracy and perf benchmarks, README (4 h)

**Deliverables.** repo with README and demo GIF; benchmark report

**Done when.** Pick under 5 ms, build under 2 s, 0.01 mm accuracy on all analytic test shapes.

**Measure.** build time, pick time percentile, BVH quality (SAH cost), memory per triangle

**Pitfalls.** Degenerate triangles producing NaN bounds; Floating-point precision at large coordinates; Overfitting benchmarks to a single model

**Stretch.** Ray packet traversal; GPU BVH build

### Lightmap baker and occlusion culling for an architectural viewer
`mx-gfx-arch-baked-lighting` · Y2 · level 4 · 32 h · C++17, OpenGL 4.5, own BVH

**Scenario.** Brightline Architects' walkthrough looks flat because dynamic lighting is cheap. They want an offline baker producing lightmaps with soft shadows and bounce light, plus portal culling for rooms.

**Functional.** UV-unwrap each static mesh into a lightmap atlas; CPU path-traced or ray-cast baking with bounces; Denoise or dilate to avoid seams; Cell-and-portal visibility culling; Runtime that combines baked light with a dynamic sun

**Non-functional.** Bake a 3-storey apartment (1M triangles) at 2k atlas in under 15 minutes on 8 cores; Culling cuts draw calls by at least 50% in interior views; Runtime holds 60 FPS at 1080p

**Constraints.** 8-core CPU baker; no commercial middleware

**Architecture.** A baker rasterises the atlas into texels with world positions and normals, then traces rays; the runtime samples the lightmap with a second UV set. Components: Atlas packer, Texel rasteriser, Ray tracer, Denoise/dilate, Portal graph, Runtime shader

**Data.** Synthetic apartment generated to glTF

**Milestones.** Atlas packing and texel rasterisation (8 h) · Ray-cast baking with bounces (9 h) · Seam handling and filtering (5 h) · Portal culling (6 h) · Evaluation, README (4 h)

**Deliverables.** repo with README and before/after images; bake time report

**Done when.** Bake under 15 minutes, 50% draw call reduction in interior views, 60 FPS, no visible seams in 10 screenshots.

**Measure.** bake time, noise (RMS vs high-sample reference), draw calls, atlas utilisation

**Pitfalls.** Light leaking through thin walls; Seams at chart borders; Atlas wasted by poor packing

**Stretch.** Spherical-harmonic probes for dynamic objects; Directional lightmaps for normal mapping

### 3D level editor with undo and prefabs for a first-person studio
`mx-gfx-scene-editor-undo-prefabs` · Y2 · level 4 · 32 h · C++17, OpenGL, ImGui, JSON

**Scenario.** Quarry Lane Games' level designers place props with a text file and a guess. They want a 3D editor with gizmos, prefab instances, multi-level undo and hot reload of changed assets into the running game.

**Functional.** Translate/rotate/scale gizmos with snapping and local/world space; Prefab definitions and instance overrides; Command-based undo/redo and autosave; Asset watcher hot reloading meshes, textures and shaders; Scene file format with version migration

**Non-functional.** Edit scenes of 20,000 objects at 60 FPS; Gizmo pick latency under 2 ms; Hot reload visible in under 500 ms; autosave never blocks for over 50 ms

**Constraints.** C++17, OpenGL 3.3+, Dear ImGui; designers' mid-range PCs

**Architecture.** The editor holds a scene graph as data, mutates it only through commands, and a watcher feeds reload events to the asset manager. Components: Scene graph, Command stack, Gizmos, Prefab system, Asset manager with watcher, Serialisation

**Data.** Synthetic prop library generated by script

**Milestones.** Scene graph and serialisation (7 h) · Gizmos and picking (7 h) · Command stack (6 h) · Prefabs and overrides (7 h) · Hot reload, perf, README (5 h)

**Deliverables.** repo with README and demo GIF; format spec; fuzz-test report

**Done when.** 20k-object scene at 60 FPS, random-command fuzz of 100k steps keeps undo/redo exact, reload under 500 ms.

**Measure.** frame time, command latency, reload latency, fuzz coverage

**Pitfalls.** Prefab override merge conflicts; Undo of deletes breaking references; Gizmo fighting with camera controls

**Stretch.** Multi-user editing session; Terrain painting tool

### Crowd flow simulation with collision avoidance for stadium ingress
`mx-gfx-crowd-rvo-stadium` · Y2 · level 4 · 31 h · C++17, OpenMP, OpenGL or matplotlib viewer

**Scenario.** Northbank Arena sees 3,000 fans queue at gates 4 to 6 before every derby. Operations wants to test turnstile counts and queue-rail layouts using a continuous-space crowd simulation with 20,000 agents.

**Functional.** Agents with preferred velocity toward goal waypoints; Reciprocal velocity obstacles or social-force avoidance; Static obstacles from a polygon map (rails, turnstiles); Uniform-grid spatial hash for neighbour queries; Per-gate throughput and queue length outputs

**Non-functional.** Simulate 20,000 agents at 20 steps/s real time on 8 cores; No agent-agent overlap above 10 cm in 99% of steps; Gate throughput within 10% of turnstile spec in a calibration test

**Constraints.** C++17 with OpenMP; laptop

**Architecture.** Neighbour search via spatial hash feeds per-agent avoidance solved in parallel, and an analytics module counts crossings of gate lines. Components: Map loader, Spatial hash, Avoidance solver, Waypoint router, Analytics, Visualiser

**Data.** Synthetic stadium map; turnstile rate of 45 persons/min per gate as invented spec

**Milestones.** Map and agent model (5 h) · Spatial hash and neighbour queries (6 h) · Avoidance solver (9 h) · Gate analytics and calibration (6 h) · Scaling study, README (5 h)

**Deliverables.** repo with README and demo GIF; calibration report; layout comparison

**Done when.** 20k agents real time, overlap bound met, throughput calibrated within 10%.

**Measure.** agents/s vs threads, overlap statistics, throughput vs turnstile count, queue length over time

**Pitfalls.** Oscillation at doorways; Neighbour search cost in dense crowds; Tuned until it looks right, not validated

**Stretch.** Group behaviours (families walk together); Compare with the CA model

### GPU compute particle system with collisions for a VFX team
`mx-gfx-gpu-particles-compute` · Y2 · level 4 · 32 h · C++17, OpenGL 4.5, GLSL compute

**Scenario.** Lantern Moth Games' CPU particles top out at 50k. The artists want a million-particle system with depth-buffer collisions, curl-noise turbulence and sorting for alpha-blended smoke.

**Functional.** Particle state in shader storage buffers, update in compute shaders; Emission and recycling via atomic counters; Curl-noise turbulence and depth-buffer collisions; GPU bitonic sort for alpha-blended particles; Editor reuse of the previewer parameters

**Non-functional.** 1M particles update plus draw under 4 ms on a mid-range GPU; Sort of 256k particles under 1 ms; No CPU readback in the frame

**Constraints.** OpenGL 4.5 compute; mid-range 2020 GPU

**Architecture.** A ping-pong SSBO pair holds particles; compute passes emit, update, sort and build indirect draw args so the CPU never reads state. Components: SSBO pools, Emit pass, Update pass, Sort pass, Indirect draw, Parameter UI

**Data.** Synthetic effect presets

**Milestones.** SSBO design and update compute (7 h) · Emission, recycle and indirect draw (6 h) · Curl noise and collisions (7 h) · Bitonic sort (7 h) · GPU timing study, README (5 h)

**Deliverables.** repo with README and demo GIF; perf report

**Done when.** 1M particles under 4 ms, 256k sort under 1 ms, zero readbacks verified in a capture.

**Measure.** ms per pass (GPU timers), particles vs frame time, sort cost, occupancy notes

**Pitfalls.** Race conditions in recycle counters; Barrier omissions between passes; Sort instability visible as flicker

**Stretch.** Mesh particles; Sub-emitters on GPU

### Positional audio and DSP chain for a horror game
`mx-gfx-spatial-audio-hrtf-lite` · Y2 · level 4 · 30 h · C++17, miniaudio-style backend

**Scenario.** Hollow Lantern Studio's horror game depends on knowing where sounds come from. They need 3D positional audio with distance attenuation, Doppler, occlusion filtering and a simple binaural effect for headphones.

**Functional.** Listener and emitter model with distance curves; Doppler shift and air absorption low-pass; Raycast occlusion that filters by wall thickness; Interaural time and level difference binaural panning; Reverb zones with crossfade

**Non-functional.** Process 64 emitters in under 25% of a 5.3 ms callback (256 samples at 48 kHz); Localisation: ITD within 20 us of the spherical-head model; No clicks when emitters move quickly (step under -60 dBFS)

**Constraints.** C++17; no audio middleware

**Architecture.** Emitters feed per-voice DSP (delay line, filters, ITD/ILD) into a spatial bus and a zone reverb. Components: Emitter/listener model, Delay-line Doppler, Occlusion filter, Binaural panner, Reverb zones, Test harness

**Data.** Synthetic tones and noise bursts; CC0 sounds

**Milestones.** Emitter model and attenuation (5 h) · Doppler with fractional delay (7 h) · Occlusion with raycasts (6 h) · Binaural ITD/ILD (7 h) · Reverb zones, offline tests, README (5 h)

**Deliverables.** repo with README and audio demos; test report

**Done when.** Callback budget met with 64 emitters, ITD error under 20 us, click test passes in 50 random fast-motion trials.

**Measure.** callback percentile load, ITD error, spectral accuracy of Doppler, CPU per emitter

**Pitfalls.** Zipper noise from parameter changes; Interpolation artifacts in delay lines; Over-filtering making sounds muddy

**Stretch.** Measured HRTF dataset convolution; Sound propagation through portals

### MPR slicing and marching-cubes surface extractor for a surgical planning team
`mx-gfx-ct-mpr-isosurface` · Y2 · level 4 · 32 h · C++17, OpenGL, thread pool

**Scenario.** The Holloway orthopaedic team wants bone surfaces from CT for printing patient-specific guides, plus oblique slices to measure angles. Current software is slow and closed.

**Functional.** Load a CT volume and resample with spacing and orientation; Multi-planar reconstruction with arbitrary oblique planes; Marching cubes with an iso-value slider and mesh smoothing; Export STL with correct millimetre scale; Distance and angle measurements on slices

**Non-functional.** Surface extraction of a 512x512x400 volume in under 5 s on 8 cores; Mesh volume within 2% of a phantom's analytic volume; Oblique slice at 60 FPS

**Constraints.** C++17; anonymised data only, non-clinical prototype

**Architecture.** The volume is stored in chunked bricks; marching cubes runs per brick in parallel and vertices are welded across brick borders. Components: Volume loader, Resampler, MPR renderer, Marching cubes, Mesh smoothing and STL export, Measurement tools

**Data.** Anonymised public CT collection (e.g. TCIA-style) or synthetic phantom with spheres and cylinders

**Milestones.** Loader, spacing and orientation handling (6 h) · MPR (6 h) · Marching cubes with tables (8 h) · Welding, smoothing, STL export (6 h) · Phantom validation, README (6 h)

**Deliverables.** repo with README and demo GIF; validation report

**Done when.** Extraction under 5 s, phantom volume within 2%, oblique slice 60 FPS.

**Measure.** extraction time, volume error, triangle count, smoothing shrinkage

**Pitfalls.** Cracks between bricks; Ambiguous marching cubes cases creating holes; Orientation mix-ups (LPS vs RAS)

**Stretch.** Dual contouring for sharper edges; Segmentation by region growing

### 3D atmospheric grid viewer for a regional weather service
`mx-gfx-atmos-slice-volume-viewer` · Y2 · level 4 · 31 h · C++17 with OpenGL 4.5 (Vulkan if ready), netCDF-lite reader

**Scenario.** A regional weather service has 3D forecast grids (wind, humidity, cloud water) and shows only 2D charts. Forecasters want slicing, isosurfaces of cloud water and a vertical cross-section along a flight route.

**Functional.** Load gridded 4D data (x,y,level,time) into brick textures; Horizontal and vertical slices with colour maps; Cloud-water isosurface and volume rendering; Route-defined cross-section; Time animation with prefetch

**Non-functional.** Render 360x240x40 grid, 6-hour time steps, at 45 FPS; Time step switch under 150 ms; Cross-section sampling error under 1% vs trilinear reference

**Constraints.** Vulkan or OpenGL 4.5; laptop discrete GPU

**Architecture.** Data are streamed as 3D textures; slice, surface and volume passes share a transfer-function module. Components: Grid reader, Texture streamer, Slice renderer, Isosurface pass, Volume pass, Time controller

**Data.** Public reanalysis or model output sample by name, or synthetic storm fields

**Milestones.** Grid reader and brick textures (6 h) · Slices and colour maps (5 h) · Isosurface and volume rendering (8 h) · Cross-section tool (6 h) · Time prefetch, perf, README (6 h)

**Deliverables.** repo with README and demo GIF; perf table

**Done when.** 45 FPS at stated size, time-step switch under 150 ms, sampling error under 1%.

**Measure.** FPS vs grid size, switch latency, GPU memory, sampling error

**Pitfalls.** Vertical coordinate mixing pressure and height levels; Wrong time-axis interpolation; Colour maps misleading for non-linear quantities

**Stretch.** Wind barbs and streamlines; Ensemble spread visualisation

### Skeletal animation runtime with GPU skinning and state machines
`mx-gfx-skeletal-anim-runtime` · Y2 · level 4 · 32 h · C++17, OpenGL, tinygltf-style loader

**Scenario.** Pixel Harbour's characters animate from a single clip at a time and pop between states. They want a runtime with blending, layered additive animation, a state machine editor format and GPU skinning for 200 characters.

**Functional.** Load skeleton and clips (glTF) with sampling and compression; Blend trees and cross-fades with transition rules; Additive layers (aim, breathe); GPU skinning with a dual quaternion option; JSON state-machine definition with parameters

**Non-functional.** Animate and skin 200 characters (60 bones) in under 3 ms CPU, 2 ms GPU; Clip memory reduced at least 4x by keyframe compression with error under 0.5 mm; Transitions are continuous (no pop above 1 cm)

**Constraints.** C++17, OpenGL 4.5; no animation middleware

**Architecture.** Per-character jobs sample poses into a shared palette buffer; the vertex shader skins from that buffer. Components: glTF clip loader, Pose sampler and blender, State machine, Compression, Palette buffer, Skinning shaders

**Data.** Public animated glTF sample models by name, or synthetic skeleton

**Milestones.** Loader and pose sampling (6 h) · Blending and state machine (8 h) · Compression with error bound (7 h) · GPU skinning and instancing (6 h) · Profiling, README (5 h)

**Deliverables.** repo with README and demo GIF; compression report

**Done when.** 200 characters within budget, 4x compression under 0.5 mm error, transitions continuous in tests.

**Measure.** CPU ms per character, compression ratio vs error, GPU ms, pop magnitude

**Pitfalls.** Quaternion hemisphere flips when blending; Candy-wrapper artifacts in linear blend skinning; State machine deadlocks

**Stretch.** Motion matching prototype; IK foot placement layer

### Turn-based roguelike shipped through alpha, beta and playtest cycles
`mx-gfx-roguelike-ship-it` · Y2 · level 4 · 33 h · C++17 or Rust, SDL2

**Scenario.** Basalt Hollow Games has 8 weeks of funding for a small roguelike. You deliver it the way a studio would: scoped milestones, test plans, a bug triage board and measured playtest results that change the design.

**Functional.** Procedural dungeon generator with seeded floors; Turn system, field of view, A* pathing for enemies; 12 enemy types, 25 items, 3 character classes; Save/load with deterministic replay of a run from seed; Telemetry for floor completion and item use

**Non-functional.** Floor generation under 20 ms for 80x50 maps; Same seed gives identical floors and replays; Memory under 200 MB, 60 FPS on integrated graphics

**Constraints.** C++17 or Rust, SDL; 5 outside playtesters over the project

**Architecture.** A deterministic simulation (seeded RNG streams per system) separates logic from rendering so replays and tests can run headless. Components: Dungeon generator, Turn manager, FOV and pathing, Content data, Save and replay, Telemetry

**Data.** Synthetic content tables; seeded generation

**Milestones.** Pre-production: scope, GDD, risks (4 h) · Prototype: generator, turns, FOV (8 h) · Alpha: content and balance pass 1 (8 h) · Beta: save/replay, telemetry, playtest 2 (8 h) · Release candidate and post-mortem (5 h)

**Deliverables.** repo with README and demo GIF; GDD; triage board export; post-mortem with playtest data

**Done when.** Generator within 20 ms, 100 seeds replay exactly, bug triage shows zero open blockers at release.

**Measure.** bugs by severity per milestone, win rate by class, floor time, FPS floor

**Pitfalls.** Generator producing unreachable rooms; RNG shared across systems breaking replays; Content creep

**Stretch.** Mod support via data files; Daily seeded challenge

### Small Rust game with its own mini engine for a studio's tool-stack trial
`mx-gfx-rust-tower-defence-engine` · Y2 · level 4 · 32 h · Rust, wgpu, winit

**Scenario.** Quillwright Games is evaluating Rust for its next two titles. They want a complete tower-defence game built on a small in-house engine (renderer, input, audio, ECS) to measure productivity and performance honestly.

**Functional.** Wgpu-based 2D batch renderer with sprite atlas; ECS and fixed-timestep game loop; Pathfinding with flow fields for 2,000 enemies; Tower types, upgrades and 12 waves; Data-driven content loaded at startup, hot reloadable

**Non-functional.** Simulate 2,000 enemies at 60 ticks/s with under 4 ms per tick; Frame time under 8 ms at 1080p with 10,000 sprites; Clean build under 90 s and incremental under 5 s

**Constraints.** Rust stable; no existing game engine crate except windowing and wgpu

**Architecture.** A small engine crate exposes renderer, input and audio; the game crate registers systems and data files. Components: Renderer, ECS, Flow-field pathing, Wave director, Audio, Data hot reload

**Data.** Synthetic art and generated sounds

**Milestones.** Engine crate: window, renderer, sprites (8 h) · ECS and game loop (5 h) · Flow-field pathing (6 h) · Gameplay: towers, waves, upgrades (8 h) · Hot reload, perf, report on Rust experience (5 h)

**Deliverables.** repo with README and demo GIF; engine ADRs; Rust evaluation write-up

**Done when.** Tick under 4 ms with 2,000 enemies, frame under 8 ms with 10k sprites, build times as stated.

**Measure.** tick and frame ms, build times, lines of code, number of unsafe blocks, borrow-check time lost

**Pitfalls.** Fighting the borrow checker with shared mutable game state; Over-abstracting the engine; Flow field recomputation every frame

**Stretch.** Web build via wasm; Level editor in egui

### Telemetry replay digital twin of a conveyor pick-and-place cell
`mx-gfx-robot-cell-telemetry-twin` · Y2 · level 4 · 31 h · Python with moderngl and numpy, or C++17

**Scenario.** Crestline Packaging wants maintenance staff to scrub through the last 10 minutes of a pick-and-place cell before a fault. The PLC and arm controller log joint angles and sensor states at 100 Hz.

**Functional.** Parse log files into a time-indexed store; 3D view of robot arm (URDF-like) driven by logged joint angles; Timeline scrubber with sensor traces and fault markers; Detect anomalies: joint-limit approach and cycle-time drift; Export a clip of a fault window as video

**Non-functional.** Scrub at 60 FPS through 10 minutes (60,000 samples); Cycle-time drift detection flags a 5% slowdown within 20 cycles; Log import of 1 hour in under 10 s

**Constraints.** C++ or Python/OpenGL; offline use on a maintenance laptop

**Architecture.** A columnar time store feeds the kinematic model; the anomaly module tracks rolling statistics over cycles. Components: Log parser, Time store, Forward kinematics, 3D viewer, Timeline UI, Anomaly detector

**Data.** Synthetic logs generated by a cell simulator with injected faults

**Milestones.** Log generator and parser (6 h) · Forward kinematics and 3D view (8 h) · Timeline UI (6 h) · Anomaly detection (6 h) · Evaluation on injected faults, README (5 h)

**Deliverables.** repo with README and demo GIF; evaluation report

**Done when.** 60 FPS scrubbing, drift detected within 20 cycles on 10 of 10 injected cases, 1-hour import under 10 s.

**Measure.** detection delay, false positive rate per hour, import time, FPS

**Pitfalls.** Joint angle wrapping at plus/minus pi; Clock drift between PLC and controller logs; Alert fatigue from noisy thresholds

**Stretch.** Live mode over a message bus; What-if replay with modified speeds

### Four-wheel vehicle dynamics simulator for a GT racing team
`mx-gfx-race-vehicle-dynamics-sim` · Y2 · level 5 · 35 h · C++17, pybind11, numpy, matplotlib

**Scenario.** Marlow Motorsport engineers set up suspension by instinct and lap data. They want a transient 7-DOF vehicle model with Pacejka tyres so they can test spring, damper and anti-roll bar choices before track days.

**Functional.** 7-DOF chassis (surge, sway, yaw, roll, pitch, heave) plus four wheel spin states; Pacejka magic-formula tyre model with load sensitivity; Springs, dampers and anti-roll bars at each corner; Driver model following a racing line with steering and throttle PID; Telemetry plots comparable with a data-logger format

**Non-functional.** Simulate a 90 s lap at 1 kHz in under 3 s wall time; Steady-state cornering at 1 g matches analytic understeer gradient within 5%; Energy drift under 1% in an undriven bounce test

**Constraints.** C++ core with Python bindings; laptop only

**Architecture.** A fixed-step RK4 integrator advances the state; tyres produce forces from slip, and a driver controller sets inputs from the path. Components: State and integrator, Tyre model, Suspension model, Driver controller, Telemetry exporter, Python binding and plots

**Data.** Invented car spec and tyre coefficients; synthetic circuit centreline

**Milestones.** State, integrator and tests (6 h) · Pacejka tyres and slip (8 h) · Suspension and load transfer (8 h) · Driver controller (8 h) · Validation, parameter sweeps, report (5 h)

**Deliverables.** repo with README; validation report; setup-sweep report; ADR on integrator choice

**Done when.** Lap simulated in under 3 s, understeer gradient within 5% of analytic, energy drift under 1%.

**Measure.** lap time sensitivity per setup parameter, step-size convergence, tyre peak-slip agreement

**Pitfalls.** Stiff tyre dynamics at low speed; Driver controller instability; Tuned-to-fit coefficients that do not transfer

**Stretch.** Aero map with ride-height sensitivity; Optimise anti-roll bar with Bayesian search

### Deterministic fixed-point simulation core for a lockstep strategy game
`mx-gfx-fixed-point-sim-core` · Y2 · level 5 · 34 h · Rust or C++17, GitHub Actions-style matrix (local scripts acceptable)

**Scenario.** Ironvale Studios' real-time strategy prototype desyncs between Windows and Linux builds after 10 minutes. They need a deterministic simulation core using fixed-point maths and a proof harness that finds the divergence automatically.

**Functional.** Fixed-point Q16.16 type with sin, cos, sqrt, atan2 by tables; Entity movement, collision and pathing using only fixed-point; State hash every tick with checksum tree; Cross-platform replay test that finds the first diverging tick and entity; Input recording format for lockstep

**Non-functional.** Zero divergences across 1,000 seeded 20-minute matches on two OSes and two compilers; Simulate 2,000 units at 30 ticks/s under 5 ms per tick; Hash cost under 0.3 ms per tick

**Constraints.** C++17 or Rust; no floating point inside simulation code (enforced by a lint)

**Architecture.** The simulation is a pure function of state and inputs; each tick computes a hash that the harness compares between runs to bisect any divergence. Components: Fixed-point math, Sim state and systems, Hash tree, Replay recorder, Divergence bisector, CI matrix

**Data.** Synthetic matches generated by seeded bots

**Milestones.** Fixed-point math and tables (6 h) · Movement and collision (8 h) · Hash tree and replay format (6 h) · Cross-platform harness and bisector (8 h) · Soak test, benchmarks, report (6 h)

**Deliverables.** repo with README; determinism ADR; soak test report

**Done when.** 1,000 matches with zero divergence on 2 OSes, 2,000 units under 5 ms per tick, bisector localises an injected float bug to the tick.

**Measure.** divergences found, tick time, hash cost, overflow checks tripped

**Pitfalls.** Hidden floats from library calls; Unordered container iteration order; Overflow in intermediate products

**Stretch.** Rollback netcode on top; Fuzz inputs with property tests

### Render graph and batching module for a small studio engine
`mx-gfx-render-graph-batching` · Y2 · level 5 · 34 h · C++17, OpenGL 4.5

**Scenario.** Brindle Works' games each hand-order render passes and leak GPU resources. They want a render-graph module that declares passes and resources, culls unused ones, aliases memory and batches draws.

**Functional.** Pass and resource declaration API; Automatic barrier and ordering derivation, culling of unused passes; Transient resource aliasing; Material and mesh batching with instancing and a sorted draw list; GPU timing per pass overlay

**Non-functional.** Graph compile for 40 passes in under 0.5 ms; Transient aliasing saves at least 30% of render-target memory in a deferred pipeline; 10,000 draws batched to under 300 draw calls

**Constraints.** OpenGL 4.5 now with API that maps to Vulkan later; C++17

**Architecture.** Passes declare reads and writes; compile builds a DAG, topologically sorts, culls, and assigns aliasable lifetimes. Components: Graph API, Compiler, Resource allocator, Draw batcher, Pass library, Profiler

**Data.** Synthetic scenes of 10,000 instanced props

**Milestones.** Graph API and DAG compile (8 h) · Resource lifetime and aliasing (8 h) · Batching and instancing (7 h) · Pass library (G-buffer, lighting, post) (7 h) · Profiling, report, ADRs (4 h)

**Deliverables.** repo with README; design doc; 3 ADRs; benchmark report

**Done when.** Graph compile under 0.5 ms, 30% memory saving, 10,000 draws under 300 calls.

**Measure.** compile ms, VRAM before/after aliasing, draw calls, frame ms

**Pitfalls.** Cycles from incorrect declared dependencies; Aliasing hazards with mismatched formats; API leaking GL details

**Stretch.** Vulkan backend; Async compute passes

### Physics-based digital twin of a warehouse picking arm
`mx-gfx-warehouse-arm-digital-twin` · Y3 · level 5 · 37 h · C++17 or Rust, OpenGL viewer

**Scenario.** Parcelwise, a fulfilment operator, wants to test grasp strategies and cycle times of a 6-axis picking arm in simulation before touching the line. The twin must match measured cycle times within a few percent.

**Functional.** Import a URDF-like description with joints, limits, inertias and meshes; Rigid-body dynamics with joint motors and contact friction for grasps; Inverse kinematics and trajectory generation with velocity and jerk limits; Pick scenarios from a bin of 20 random parcels; Compare simulated vs logged joint trajectories

**Non-functional.** Simulate at 1 kHz faster than 5x real time on one CPU core; Cycle time within 5% of a reference measurement table; Grasp success statistics reproducible across 100 seeds

**Constraints.** CPU only; no commercial simulator

**Architecture.** A multibody solver advances articulated dynamics; a planner issues joint trajectories; a scenario runner randomises parcels and records metrics. Components: URDF parser, Articulated dynamics, Contact solver, IK and planner, Scenario runner, Viewer

**Data.** Invented arm spec and parcels; synthetic reference trajectories

**Milestones.** URDF parser and kinematics (6 h) · Articulated body dynamics (10 h) · Contacts and grasping (9 h) · Planner and scenario runner (7 h) · Validation, report (5 h)

**Deliverables.** repo with README and demo GIF; validation report; ADR on solver choice

**Done when.** 5x real time at 1 kHz, cycle error under 5%, 100-seed reproducibility.

**Measure.** cycle time error, grasp success rate with CI, real-time factor, energy drift

**Pitfalls.** Joint limit violations from solver softness; Mass-matrix inversion instability; Over-fitting friction to fit one trajectory

**Stretch.** Domain randomisation sweep; ROS-style interface

### Multibody vehicle model with kinematic suspension for a racing team
`mx-gfx-vehicle-multibody-suspension` · Y3 · level 5 · 36 h · C++17, Eigen-style linear algebra (own or library), Python

**Scenario.** Marlow Motorsport's 7-DOF model cannot show bump steer or roll-centre migration. They want a multibody model with double-wishbone geometry solved as constraints, linking to real damper dyno curves.

**Functional.** Double-wishbone kinematics as constraints with hardpoint inputs; Roll centre, camber gain and bump steer outputs vs travel; Nonlinear damper maps from dyno tables; Coupling to the tyre model from the earlier project; Setup comparison reports

**Non-functional.** Kinematic sweep of 100 travel points under 50 ms; Simulation at 1 kHz at 2x real time; Roll centre height within 2 mm of a closed-form reference

**Constraints.** C++ core with Python scripting; laptop

**Architecture.** A constraint solver positions suspension links for each travel; dynamics integrate chassis and unsprung masses with the resulting geometry. Components: Hardpoint model, Constraint solver, Damper tables, Vehicle integrator, Report generator

**Data.** Invented hardpoints and damper tables

**Milestones.** Hardpoint model and constraint solver (10 h) · Geometry outputs and validation (7 h) · Damper maps (5 h) · Coupling and dynamic sim (9 h) · Setup studies and report (5 h)

**Deliverables.** repo with README; validation report; setup study

**Done when.** Roll centre error under 2 mm, sweep under 50 ms, 2x real time at 1 kHz.

**Measure.** geometry error, solve time, lap time delta per setup change, convergence rate

**Pitfalls.** Solver converging to the wrong branch; Singular configurations; Damper hysteresis extrapolation

**Stretch.** Aero platform coupling; Compare against a simpler model for calibration

### Garment draping preview with projective dynamics for a fashion brand
`mx-gfx-garment-drape-projective` · Y3 · level 5 · 35 h · C++17, Eigen-style sparse Cholesky, OpenGL

**Scenario.** Anselm & Rye, an online fashion brand, wants to preview how a dress pattern drapes on three body sizes before sampling. Pattern pieces and seams come from a 2D CAD export.

**Functional.** Import 2D pattern pieces with seam pairs and fabric presets; Triangulate pieces and stitch seams; Projective dynamics solver with stretch, shear and bending; Body collision via signed distance field with friction; Fabric presets (silk, denim, jersey) with different stiffness

**Non-functional.** Solve 20k vertices at 10 FPS on 8 cores with a prefactored system; Stretch deformation under 5% in denim at rest; Interpenetration free in 99% of frames against the body

**Constraints.** CPU only; no cloth middleware

**Architecture.** Local constraint projections alternate with a global prefactored linear solve; collision constraints are added as per-iteration projections. Components: Pattern importer, Mesher and stitcher, Projective solver, SDF collision, Fabric presets, Viewer

**Data.** Synthetic dress patterns and parametric body meshes

**Milestones.** Pattern import, meshing, stitching (7 h) · Projective dynamics core (10 h) · Body SDF and collision (8 h) · Fabric presets and calibration (6 h) · Evaluation, README (4 h)

**Deliverables.** repo with README and demo GIF; evaluation report

**Done when.** Stated FPS at 20k vertices, stretch under 5%, 99% penetration-free frames.

**Measure.** ms per solve, stretch %, penetration depth, convergence vs iterations

**Pitfalls.** Seam tangles when pieces start overlapping; Bending too weak making fabric look like rubber; Stiffness change requiring refactorisation

**Stretch.** GPU Jacobi solver; Wrinkle detail with normal maps

### Volumetric cloud renderer from forecast fields for a broadcaster
`mx-gfx-volumetric-cloud-forecast` · Y3 · level 5 · 36 h · C++17, Vulkan or OpenGL 4.6 compute

**Scenario.** Coastline TV wants its weather presenter to fly through a rendered cloud field built from model output. The renderer must look credible and stay faithful to the cloud-water data.

**Functional.** Ray-march cloud water with single scattering and multi-scatter approximation; Temporal reprojection to cut sample count; Detail noise modulated by forecast density; Time interpolation between forecast steps; Camera path recording for broadcast

**Non-functional.** 1080p at 30 FPS on a 12 GB GPU; Cloud mass conservation: rendered optical depth correlates r>0.95 with data column; Temporal artifacts under 2% pixel flicker

**Constraints.** one GPU; 12 GB VRAM

**Architecture.** A compute ray marcher accumulates scattering through brick-cached density, then a temporal pass blends reprojected history. Components: Density brick cache, Ray marcher, Multi-scatter approximation, Temporal reprojection, Time interpolator, Camera tools

**Data.** Public model-output sample or synthetic storm field with noise

**Milestones.** Brick cache and density sampling (8 h) · Ray marching and lighting (9 h) · Multi-scatter and temporal reprojection (9 h) · Fidelity validation (6 h) · Perf, README (4 h)

**Deliverables.** repo with README and demo video capture; fidelity report

**Done when.** 30 FPS at 1080p, r>0.95 against column data, flicker under 2%.

**Measure.** ms per pass, samples per ray vs quality (PSNR), correlation, VRAM

**Pitfalls.** Ghosting from reprojection; Energy loss from approximated multiple scattering; Banding in light steps

**Stretch.** Precipitation shafts; Lightning illumination

### Rollback netcode and desync-detection harness for a fighting game
`mx-gfx-rollback-netcode-harness` · Y3 · level 5 · 33 h · C++17 or Rust, UDP sockets

**Scenario.** Ironvale Studios' fighting game needs under 2 frames perceived input delay on 100 ms links. They need rollback netcode and a testing harness that simulates loss, jitter and reordering and catches desyncs.

**Functional.** Snapshot and restore of game state, input prediction; Rollback up to 8 frames with re-simulation; Network emulator for latency, jitter, loss, reordering; Desync detector via periodic state hashes; Replay logs for failing sessions

**Non-functional.** Re-simulate 8 frames in under 4 ms; Zero desyncs in 10,000 matches under 150 ms RTT and 5% loss; Visual correction rate under 3% of frames at 100 ms RTT

**Constraints.** UDP, C++ or Rust; two machines or loopback emulator

**Architecture.** Each peer simulates ahead with predicted remote input; on late input mismatch it restores a snapshot and replays frames, while hashes cross-check. Components: Snapshot ring, Input predictor, Rollback engine, Network emulator, Hash checker, Replay tool

**Data.** Synthetic bot inputs

**Milestones.** Deterministic sim and snapshot ring (8 h) · Input prediction and rollback (9 h) · Network emulator (5 h) · Desync detection and replay (6 h) · 10k-match campaign, report (5 h)

**Deliverables.** repo with README and demo GIF; campaign report; ADR on snapshot strategy

**Done when.** Meets all three numbers on the 10k campaign.

**Measure.** rollback frames distribution, re-sim ms, desync count, corrections per minute

**Pitfalls.** Non-deterministic state missed in snapshot; Rolling back audio events twice; Prediction policy causing visible teleports

**Stretch.** Spectator mode; Delay-based fallback for poor links

### GPU crowd simulation with evacuation analytics for a stadium operator
`mx-gfx-gpu-crowd-200k` · Y3 · level 5 · 35 h · C++17, OpenGL or Vulkan compute or CUDA

**Scenario.** Northbank Arena's CPU model handles 20k agents. A planning study of a 60,000-seat venue with multi-level concourses needs 200k agents on a GPU with analytics for bottlenecks.

**Functional.** Grid-based neighbour search on GPU; Velocity-obstacle style avoidance in compute; Multi-level navigation with stairs and ramps; Bottleneck detection from density and flow fields; Scenario batch runner with CSV output

**Non-functional.** 200k agents at 20 steps/s on a 12 GB GPU; Agreement with CPU reference on mean evacuation time within 5% at 20k agents; Batch of 20 scenarios in under 1 hour

**Constraints.** one GPU; deterministic seeds

**Architecture.** A uniform grid is rebuilt every step by counting sort; avoidance and navigation compute passes update agents; analytics accumulate flow per cell. Components: Grid build, Avoidance pass, Nav field, Analytics, Scenario runner, Viewer

**Data.** Synthetic multi-level venue; CPU model as reference

**Milestones.** Venue model and nav fields (7 h) · GPU grid and neighbour search (8 h) · Avoidance and multi-level motion (9 h) · Analytics and validation (7 h) · Batch runner, report (4 h)

**Deliverables.** repo with README and demo GIF; validation report

**Done when.** 200k agents at 20 steps/s, 5% agreement with CPU, 20-scenario batch under 1 hour.

**Measure.** steps/s vs agent count, evacuation time agreement, density hot-spots, GPU memory

**Pitfalls.** Nondeterminism from atomics ordering; Agents stuck on stairs; Validating against a model with the same bug

**Stretch.** Fire spread coupling; Multi-GPU split

### Motion matching character controller for an open-world studio
`mx-gfx-motion-matching-lab` · Y3 · level 5 · 34 h · C++17, OpenGL

**Scenario.** Sundial Games' animators spend weeks authoring locomotion graphs. They want a motion-matching controller built from 30 minutes of mocap that responds to stick input with natural, foot-planted movement.

**Functional.** Feature database from mocap (foot positions, velocities, trajectory); KD-tree or brute-force SIMD pose search every 0.1 s; Inertialisation blending on transitions; Foot IK and contact locking; Authoring metrics dashboard

**Non-functional.** Search time under 0.3 ms per character for 100k database poses; Response latency from stick input to visible change under 150 ms; Foot sliding under 2 cm average

**Constraints.** C++17; CPU

**Architecture.** Each interval the controller builds a query from desired trajectory, finds the best database frame and inertialises into it. Components: Mocap importer, Feature extractor, Search structure, Inertialiser, Foot IK, Dashboard

**Data.** Public mocap library by name (CMU-style) or synthetic locomotion

**Milestones.** Importer and feature extraction (8 h) · Search structure and queries (8 h) · Inertialisation and blending (8 h) · Foot IK (6 h) · Metrics, README (4 h)

**Deliverables.** repo with README and demo GIF; metrics report

**Done when.** Search under 0.3 ms, latency under 150 ms, foot sliding under 2 cm.

**Measure.** search time, latency, slide cm, database coverage

**Pitfalls.** Features badly scaled making matching erratic; Popping when the database lacks transitions; Over-large database

**Stretch.** Learned feature weights; Terrain adaptation

### GPU CT renderer with segmentation overlay for an imaging research group
`mx-gfx-ct-gpu-render-segmentation` · Y3 · level 5 · 34 h · C++17, OpenGL 4.6, Python for model inference

**Scenario.** The Holloway imaging group has a small U-Net that segments organs. They want a viewer that renders 1024x1024x600 CTs in real time and overlays the model's labels with uncertainty.

**Functional.** Brick-based volume with empty-space skipping; Ray marcher with label-aware transfer function; Run a segmentation model offline and load label volume with confidence; Uncertainty visualisation (opacity or hatching); Clip and measure tools

**Non-functional.** 1024x1024x600 volume at 30 FPS at 1080p; Empty-space skipping reduces ray steps at least 50%; Overlay alignment error under 0.5 voxel

**Constraints.** 12 GB GPU; research use, not diagnostic

**Architecture.** A min/max brick grid drives skipping; label volume is sampled in the same loop and shaded with confidence-aware colours. Components: Brick builder, Ray marcher, Label volume loader, Uncertainty shading, Tools, Model run script

**Data.** Public anonymised CT sets and a model trained or pretrained offline

**Milestones.** Brick grid and empty-space skipping (9 h) · Label overlay and uncertainty (8 h) · Model integration script (6 h) · Performance and alignment study (8 h) · README, demo (3 h)

**Deliverables.** repo with README and demo GIF; performance report

**Done when.** 30 FPS, 50% fewer steps, alignment under 0.5 voxel.

**Measure.** steps per ray, FPS, alignment error, Dice of model vs ground truth for context

**Pitfalls.** Label interpolation blending IDs; VRAM exhaustion; Presenting model output as truth

**Stretch.** Mesh extraction per label; Calibration plot for uncertainty

### Planet-scale terrain streaming with virtual texturing for a mapping product
`mx-gfx-planet-terrain-virtual-texture` · Y3 · level 5 · 36 h · C++17, Vulkan or OpenGL

**Scenario.** Atlas Wren, a mapping company, wants a globe viewer with metre-level detail anywhere. They need quadtree terrain, virtual textured imagery and a streaming system that stays inside a GPU memory budget.

**Functional.** Spherical quadtree LOD with skirts or morphing; Virtual texture page table with feedback pass; Asynchronous tile streaming with priority and eviction; Precision handling with camera-relative rendering; Cache hit-rate dashboard

**Non-functional.** 60 FPS at 1440p flying at Mach 1; Residency miss rate under 2% in steady flight; VRAM budget fixed at 2 GB texture cache

**Constraints.** OpenGL 4.6 or Vulkan; tiles on local disk

**Architecture.** A feedback pass reports needed pages; the CPU streams and uploads tiles within a budget while the quadtree selects terrain patches. Components: Quadtree LOD, Feedback pass, Page table, Tile streamer, Cache manager, Dashboard

**Data.** Public elevation and imagery source by name, or synthetic tiles

**Milestones.** Quadtree on a sphere (9 h) · Virtual texture page table (9 h) · Feedback and streaming (9 h) · Precision and tuning (5 h) · Benchmark flight, README (4 h)

**Deliverables.** repo with README and demo video; design doc; benchmark report

**Done when.** 60 FPS during Mach 1 flight benchmark, miss rate under 2%, VRAM bound respected.

**Measure.** frame percentiles, miss rate, stream MB/s, eviction churn

**Pitfalls.** Popping at tile boundaries; Page thrashing when budget is small; Float precision jitter

**Stretch.** Atmosphere scattering; Vector overlay layers

### Irradiance probe global illumination for a dynamic architectural viewer
`mx-gfx-probe-gi-walkthrough` · Y3 · level 5 · 35 h · C++17, OpenGL 4.6 or Vulkan compute

**Scenario.** Brightline Architects wants clients to move furniture and change window blinds and see light respond. Baked lightmaps cannot do that, so they need dynamic diffuse GI from probes.

**Functional.** Place a probe grid with occlusion-aware weighting; Trace rays from probes (GPU compute with BVH) and update irradiance with hysteresis; Sample probes with visibility-aware interpolation; Handle dynamic lights and moving objects; Compare to a path-traced reference

**Non-functional.** Update 8,000 probes with 128 rays each in under 3 ms per frame; Mean error under 8% vs reference on three scenes; 60 FPS at 1080p on a discrete GPU

**Constraints.** compute-shader tracing; 12 GB GPU

**Architecture.** A GPU BVH is traced by compute from each probe; results blend into octahedral irradiance maps and shading samples them. Components: GPU BVH, Probe grid, Ray tracing pass, Irradiance update, Shading integration, Reference renderer

**Data.** Synthetic apartment scenes; offline CPU path tracer reference

**Milestones.** GPU BVH and trace pass (10 h) · Probe update and storage (7 h) · Shading and leak control (8 h) · Reference comparison (7 h) · Perf and README (3 h)

**Deliverables.** repo with README and demo GIF; error report

**Done when.** 3 ms update budget, 8% error, 60 FPS.

**Measure.** ms per stage, error vs reference, light-leak incidents, convergence time after a change

**Pitfalls.** Light leaking through walls; Slow convergence causing lag; Noisy probes at low ray counts

**Stretch.** Specular probes; Sky occlusion

### Data-oriented core for a small studio engine: jobs and asset pipeline
`mx-gfx-engine-jobs-assets-core` · Y3 · level 5 · 36 h · C++17 or Rust

**Scenario.** Brindle Works' three games need a shared engine core. They want a work-stealing job system and a content pipeline that cooks assets incrementally and loads them with zero-copy.

**Functional.** Work-stealing job scheduler with dependencies and parallel-for; Frame-graph style job graph for engine tasks; Asset cooker with dependency tracking and incremental rebuilds; Zero-copy loaded asset format with versioning; Memory arenas for frame and level lifetime

**Non-functional.** Schedule 100k small jobs at under 1 microsecond overhead each; Incremental cook after a texture change under 3 s on a 2 GB project; Asset load at 80% of disk bandwidth

**Constraints.** C++17 or Rust; 8 cores

**Architecture.** The job system runs on a fixed worker pool with per-thread deques; the cooker computes content hashes and outputs memory-mappable packs. Components: Job scheduler, Arenas, Cooker, Dependency tracker, Pack format, Loader

**Data.** Synthetic 2 GB asset project generated by script

**Milestones.** Job scheduler (10 h) · Arenas and job graph (6 h) · Cooker with hashing (8 h) · Pack format and zero-copy loader (8 h) · Benchmarks and ADRs (4 h)

**Deliverables.** repo with README; benchmark report; 3 ADRs

**Done when.** All three numbers met on the reference machine.

**Measure.** job overhead ns, scaling vs cores, cook time, load MB/s

**Pitfalls.** Deadlocks in dependency waiting; False sharing in deque indices; Stale cooked outputs

**Stretch.** Remote cook cache; Hot reload from packs

### Small multiplayer arena game with dedicated server and playtest telemetry
`mx-gfx-arena-shooter-dedicated-server` · Y3 · level 5 · 35 h · C++17 or Rust, UDP

**Scenario.** Cobalt Fern Studio's next title is an 8-player arena game. You build it end to end with a dedicated server, client prediction, lag compensation, milestone gates and 3 playtests.

**Functional.** Authoritative server at 60 ticks/s with client-side prediction and reconciliation; Snapshot interpolation and delta compression; Hit registration with lag compensation; Matchmaking-lite lobby and match flow; Telemetry pipeline for playtests

**Non-functional.** Server handles 8 players at under 25% of one core; Bandwidth under 40 KB/s per client; Hit-reg disagreement under 2% at 100 ms RTT

**Constraints.** UDP custom protocol; playtests with 6 testers

**Architecture.** The server steps authoritative state, sends delta-compressed snapshots; clients predict their own inputs and reconcile. Components: Server loop, Client prediction, Snapshot encoder, Lag compensation, Lobby, Telemetry

**Data.** Synthetic bots for load tests; real playtesters

**Milestones.** Vertical slice offline game (8 h) · Server and protocol (9 h) · Prediction and interpolation (7 h) · Lag compensation and compression (7 h) · Playtests and post-mortem (4 h)

**Deliverables.** repo with README and demo GIF; protocol spec; playtest reports; post-mortem

**Done when.** All numbers met in a 30-minute soak with 8 bots and 1 playtest.

**Measure.** server CPU, KB/s, hit-reg disagreements, perceived latency

**Pitfalls.** Rubber-banding from wrong reconciliation; Bandwidth blowup; Cheating surface from trusting clients

**Stretch.** Replay system; Anti-cheat sanity checks

### Neural surrogate for a 2D smoke solver in a weather-visualiser product
`mx-gfx-neural-fluid-surrogate` · Y3 · level 5 · 33 h · Python, PyTorch, numpy; solver from earlier project or Python port

**Scenario.** Seagate Marine Weather's local-flow visualiser runs a fluid solver that is too slow for dense interactive use. The team wants a neural surrogate that steps the flow 10x faster with controlled error.

**Functional.** Generate a dataset of solver trajectories with varied obstacles and inflow; Train a convolutional (U-Net style) surrogate for one-step or multi-step rollout; Evaluate rollout error, divergence and energy decay vs ground truth; Integrate in a viewer with a toggle between solver and surrogate; Detect out-of-distribution scenes and fall back to the solver

**Non-functional.** Surrogate steps 256x256 at 10x the solver's speed on a GPU; Relative L2 error under 10% after 100 steps; Fallback triggers on 90% of OOD test cases

**Constraints.** one 24 GB GPU; train in under 6 hours

**Architecture.** Training data from the numerical solver teaches a network to map state and boundary masks to the next state; a monitor compares divergence statistics to trigger fallback. Components: Solver data generator, Dataset loader, Surrogate model, Rollout evaluator, Viewer integration, OOD monitor

**Data.** Synthetic solver trajectories

**Milestones.** Data generation (7 h) · Model and training (9 h) · Rollout evaluation (7 h) · Viewer integration and speed test (6 h) · OOD fallback, report (4 h)

**Deliverables.** repo with README and demo GIF; evaluation report; model card

**Done when.** 10x speed, L2 under 10% at 100 steps, 90% OOD fallback.

**Measure.** error growth curve, divergence residual, speedup, OOD precision/recall

**Pitfalls.** Error accumulation in long rollouts; Overfitting to training obstacle shapes; Comparing to a weak baseline solver

**Stretch.** Physics-informed loss term; Latent-space stepping

### Large CAD assembly streaming with meshlets for an aerospace supplier
`mx-gfx-cad-meshlet-large-assembly` · Y3 · level 5 · 37 h · C++17, Vulkan or OpenGL 4.6 compute

**Scenario.** Vantor Aerospace has 40M-triangle engine assemblies that crash the viewer used by line staff. They need a viewer using meshlets, hierarchical LOD and streaming so any laptop can open the whole engine and cut sections.

**Functional.** Offline meshlet builder with bounding cones and spheres; Hierarchical LOD per part group with error metrics; GPU culling with compute (frustum, cone, occlusion); Streaming of parts from disk on demand; Section planes with capping

**Non-functional.** 40M triangles at 30 FPS at 1080p on a 6 GB laptop GPU; Open to first frame in under 5 s; Screen-space LOD error under 1 pixel at selected quality

**Constraints.** OpenGL 4.6 or Vulkan; 6 GB VRAM

**Architecture.** The builder clusters triangles into meshlets and builds an LOD DAG; the viewer culls and selects clusters on the GPU and streams missing data. Components: Meshlet builder, LOD hierarchy, GPU culling, Streamer, Section pass, Benchmark scenes

**Data.** Synthetic large assembly composed of repeated parametric parts

**Milestones.** Meshlet builder (9 h) · LOD hierarchy and error metric (9 h) · GPU culling (8 h) · Streaming and sections (8 h) · Benchmarks, README (3 h)

**Deliverables.** repo with README and demo GIF; design doc; benchmark report

**Done when.** 30 FPS on 40M triangles, first frame under 5 s, LOD error under 1 pixel.

**Measure.** FPS vs triangles, culling ratio, VRAM, first-frame time, pixel error

**Pitfalls.** Cracks between LOD levels; Streaming hitches; Meshlet size trade-off hardware dependent

**Stretch.** Software rasterisation of tiny triangles; Visibility buffer shading

## hardware

### Low-cost lab data logger for a university teaching lab
`mx-hw-lab-data-logger` · Y4 · level 2 · 26 h · C (Pico SDK or STM32), Python (pyserial, NumPy)

**Scenario.** The physics department of a small university cannot afford commercial loggers for 30 student benches. They want a USB logger with 8 analog channels that students can script from Python.

**Functional.** Sample 8 analog channels at up to 10 kS/s aggregate; Stream samples over USB with timestamps; Provide a Python library and CSV export; Offer a trigger mode with pre-trigger buffer; Include a self-test and per-channel calibration

**Non-functional.** Effective resolution at least 11 bits at 1 kS/s per channel; Zero dropped samples over a 10-minute 10 kS/s stream; Cost per unit under $35

**Constraints.** Powered from USB only; Inputs protected to +/-12 V

**Architecture.** An MCU with ADC and DMA fills ping-pong buffers that are packetized over USB CDC. A host library parses frames and checks sequence numbers. Components: ADC DMA sampler, Frame protocol with CRC, USB CDC transport, Input protection and scaling, Python host library, Calibration tool

**Data.** Signal generator output, resistor dividers, and a synthetic test-signal generator

**Milestones.** Protocol and input front-end design (5 h) · ADC + DMA ping-pong sampling (6 h) · USB streaming and host library (6 h) · Trigger and calibration (5 h) · Characterization write-up (4 h)

**Deliverables.** repo with README; protocol spec; noise and linearity report; student quick-start

**Done when.** A 10-minute 10 kS/s stream has zero sequence gaps and measured ENOB is at least 11 bits at 1 kS/s per channel.

**Measure.** ENOB and noise floor; Dropped frame count; Gain and offset error; Cost per unit

**Pitfalls.** Ground bounce corrupting ADC readings; USB buffer overflow on slow hosts; Source impedance too high for ADC sampling

**Stretch.** Add a 2-channel DAC for function generation; Live plotting GUI

**Parts.** RP2040 or STM32 board $4-12; op-amp input buffers + clamp diodes $4-8; precision reference $2-4; resistors/caps $3-6; BNC or header connectors $5-10; PCB $5-15

### Cold-chain temperature logger for a vaccine fridge
`mx-hw-coldchain-logger` · Y4 · level 2 · 24 h · C, Python

**Scenario.** A rural health district needs to prove its vaccine fridges stay between 2 and 8 C. They want a tamper-evident logger that stores 90 days and alerts staff after excursions.

**Functional.** Sample two temperature probes every minute; Store 90 days of data with timestamps in non-volatile memory; Trigger a buzzer and LED when out of range for more than 10 minutes; Export a report over USB as CSV; Keep time through power loss with an RTC

**Non-functional.** Temperature accuracy within +/-0.3 C between 0 and 10 C after calibration; Battery backup keeps logging for 72 h of mains outage; Storage uses under 2 MB for 90 days

**Constraints.** Cost under $30; No cloud connectivity required

**Architecture.** A low-power MCU logs readings into a wear-leveled flash log and manages alarms. A host script generates the compliance report. Components: Probe reading and calibration, Wear-leveled log, Alarm state machine, RTC handling, USB CSV export, Report script

**Data.** Ice-bath and warm-bath reference measurements plus synthetic excursion traces

**Milestones.** Calibration plan and probe driver (5 h) · Flash log and RTC (6 h) · Alarm logic (4 h) · USB export and report (5 h) · Outage and accuracy tests (4 h)

**Deliverables.** repo with README; calibration data; excursion test report

**Done when.** Calibrated error is within +/-0.3 C at 0 and 10 C reference points and a 72-hour outage test completes with no missing records.

**Measure.** Accuracy at reference points; Alarm delay; Storage per day; Outage test pass

**Pitfalls.** Self-heating of the probe; RTC drift; Flash wear with naive logging

**Stretch.** Add SMS alert through a GSM module; Door-open detection

**Parts.** MCU board $4-10; two digital temperature probes (waterproof) $6-14; RTC module $2-5; buzzer + LEDs $2-4; backup cell/battery $5-10; flash memory chip $1-3; enclosure $4-8

### Greenhouse climate controller for a farm co-op
`mx-hw-greenhouse-climate` · Y4 · level 3 · 34 h · C++ (ESP-IDF or Arduino core), FreeRTOS, Python for simulation, PlatformIO

**Scenario.** Green Valley Growers, a 12-member farm co-op, loses tomato yield to temperature swings in six 300 m2 greenhouses that are vented by hand. They want a controller that drives roof vents, a fogger and a heater from sensor readings and logs everything for the agronomist.

**Functional.** Read air temperature, humidity and soil moisture from 4 sensor nodes per greenhouse; Drive vent motor, fogger relay and heater relay with a PID plus hysteresis scheme; Support day/night setpoint schedules edited over a local web page; Log readings and actuator states to SD card and expose them over Wi-Fi; Fail safe: open vents and cut heater if sensors disagree or time out

**Non-functional.** Hold air temperature within +/-1.5 C of setpoint over a 24 h simulated day; Sensor poll and control loop period 1 s with jitter under 50 ms; Controller survives 10 power cuts with state restored in under 5 s

**Constraints.** Total BOM per greenhouse under $120; Mains switching only through relays or SSRs with fuses; no live-mains work in tests

**Architecture.** An ESP32 runs a fixed-period control task, reading sensors over I2C/RS-485 and writing relay and motor outputs. A thermal simulation on a laptop closes the loop for testing before any hardware is wired. Components: Sensor driver layer, PID + hysteresis controller, Schedule and setpoint manager, Actuator safety interlocks, Web UI and logger, Thermal plant simulator

**Data.** Synthetic greenhouse thermal model (first-order lumped model with solar gain and vent loss) plus logged readings from real sensors

**Milestones.** Spec, thermal model and simulator (6 h) · Sensor drivers and logging (6 h) · PID/hysteresis control with anti-windup (8 h) · Safety interlocks and watchdog (5 h) · Web UI and hardware-in-loop test (6 h) · Write-up with step responses (3 h)

**Deliverables.** repo with README and wiring diagram; simulation report with step responses; fault-injection test log; BOM sheet

**Done when.** Simulated 24 h day stays within +/-1.5 C, loop jitter under 50 ms measured on target, and 10 power-cut tests restore state in under 5 s.

**Measure.** Mean and max temperature error; Control loop jitter histogram; Actuator switching cycles per day; Recovery time after reset

**Pitfalls.** Relay chatter wearing out contacts without min on/off times; Integrator windup when vents saturate; Humidity sensors drifting in condensing air

**Stretch.** Feed-forward from outside weather data; LoRa link between greenhouses and a gateway

**Parts.** ESP32 dev board $6-10; 4x SHT31 sensors $12-30; capacitive soil probes $8-20; 4-channel relay board $6-12; 12V gear motor for vent $15-30; 12V supply $10-18; RS-485 modules $6-12; enclosure, fuses, wiring $15-25

### Battery monitoring system for e-bikes
`mx-hw-ebike-bms-monitor` · Y4 · level 3 · 30 h · C, Zephyr or bare-metal on nRF52, Python log analyzer

**Scenario.** CityPedal, a 300-bike rental fleet, replaces 36 V packs early because it cannot tell which cells are weak. They want a small monitor that reports state of charge, pack health and unsafe events from each bike.

**Functional.** Measure 10 series cell voltages, pack current and 3 temperatures; Estimate state of charge with coulomb counting corrected by open-circuit voltage; Flag over-temperature, deep discharge and cell imbalance events; Store event logs and send them over BLE to a phone app; Provide a calibration routine for current-sense offset and gain

**Non-functional.** Voltage accuracy within 10 mV per cell, current within 2 percent; State of charge error under 5 percent over a simulated ride cycle; Monitor draws under 2 mA in sleep

**Constraints.** Monitor only; it must not switch pack current; Per-bike cost under $25

**Architecture.** A low-power MCU samples an analog front end through an ADC, runs an SOC estimator and stores events in flash. BLE exposes logs to a phone. Components: Analog front end model, ADC sampling and calibration, SOC estimator, Event detector, Flash log store, BLE service

**Data.** Synthetic ride cycles built from a cell equivalent-circuit model, plus a public battery aging dataset for cell curves

**Milestones.** Cell model and ride-cycle generator (6 h) · ADC front-end calibration firmware (6 h) · SOC estimator and tuning (8 h) · Event detection and flash logging (5 h) · BLE export and analyzer script (5 h)

**Deliverables.** repo with README; SOC accuracy report; calibration procedure; BOM and schematic

**Done when.** On three simulated ride cycles SOC error stays under 5 percent, calibrated voltage error under 10 mV, and sleep current under 2 mA measured or modelled.

**Measure.** SOC RMS error; Voltage and current error after calibration; Sleep current; Flash writes per day

**Pitfalls.** Current sense drift with temperature; Ignoring voltage sag when using OCV correction; Flash wear from frequent logging

**Stretch.** Kalman-filter SOC; Per-cell internal resistance trend

**Parts.** nRF52 module $6-12; ADC/cell monitor IC (e.g. 12-channel class) $4-10; 1 mOhm shunt + amp $3-8; 3 NTC thermistors $1-3; 10S dummy battery source or bench supply (existing) $0-40; PCB fabrication $5-20; connectors $5-10

### Smart water meter for municipal pilot
`mx-hw-smart-water-meter` · Y4 · level 3 · 30 h · C, low-power MCU (STM32L0 or MSP430 class), Python

**Scenario.** Riverbend Water Utility wants a 200-home pilot that reads meters remotely and flags leaks, without sending crews to read dials. The device must last 8 years on a battery.

**Functional.** Count pulses from a reed-switch or Hall flow sensor reliably through sleep; Compute hourly consumption and detect continuous-flow leak patterns; Transmit a daily packet over a low-power radio link; Store 30 days of hourly data locally; Detect tamper events such as magnet attack or cover opening

**Non-functional.** Average current under 15 uA so that a 2.6 Ah cell lasts over 8 years; Pulse count error under 0.1 percent over 10,000 pulses at up to 50 Hz; Leak detector flags continuous 2 L/h flow within 24 h

**Constraints.** Battery cell not user-replaceable; Radio duty limited to 1 percent

**Architecture.** A deep-sleep MCU wakes on pulse interrupts, accumulates counts in a low-power timer and wakes daily to send a packet. A Python simulator replays usage profiles. Components: Pulse counter ISR, Low-power state machine, Leak and tamper detector, Local ring-buffer log, Radio packet encoder, Usage profile simulator

**Data.** Synthetic household water-use profiles including leaks, built from a documented generator

**Milestones.** Power budget and usage simulator (6 h) · Pulse counting under sleep (6 h) · Leak and tamper detection (7 h) · Ring-buffer log and radio packet (6 h) · Current measurement and lifetime estimate (5 h)

**Deliverables.** repo with README; power budget spreadsheet; test log; packet spec

**Done when.** Measured or modelled average current is under 15 uA, 10,000-pulse test shows under 0.1 percent error, and a 2 L/h leak is flagged within 24 h.

**Measure.** Average and peak current; Count error; Leak detection delay; Battery life estimate

**Pitfalls.** Pull-up resistors leaking microamps; Missed pulses during flash writes; Ignoring battery self-discharge

**Stretch.** Ultrasonic flow front end; Encrypted packets with replay protection

**Parts.** Low-power MCU board $8-15; reed switch or Hall sensor $2-6; LoRa module $8-15; 2.6 Ah lithium cell $4-8; current-measure board (nano-power class) $20-40; enclosure $5-10; 3D-printed pulse simulator rig $3-8

### LoRa soil-moisture sensor network for an orchard
`mx-hw-lora-soil-network` · Y4 · level 3 · 30 h · C, Python, SQLite, small web UI

**Scenario.** Hillside Orchard Co-op irrigates 60 hectares on a fixed timer and wastes water. They want 40 battery sensor nodes reporting soil moisture over 2 km to a single gateway.

**Functional.** Read soil moisture and temperature on a 15-minute cycle; Transmit via a LoRa link with acknowledgements and retries; Gateway collects packets and serves a dashboard; Support over-the-air configuration of the sampling interval; Detect node faults such as stuck sensors

**Non-functional.** Node battery life over 2 years on 2 AA cells; Packet delivery ratio above 95 percent in simulation with 40 nodes; Collision rate under 5 percent via randomized slots

**Constraints.** Duty cycle at most 1 percent; Node BOM under $30

**Architecture.** Nodes sleep between readings and send time-slotted packets. A discrete-event simulator models the channel before field tests. Components: Node firmware, Time-slot scheduler, Gateway receiver, Channel simulator, Dashboard, Fault detector

**Data.** Synthetic soil moisture series and channel simulation; own bench measurements for power

**Milestones.** Channel and duty-cycle simulator (6 h) · Node firmware with sleep (7 h) · Gateway and protocol (7 h) · OTA config and faults (5 h) · Battery life analysis (5 h)

**Deliverables.** repo with README; protocol spec; simulation results; battery life model

**Done when.** Simulation shows PDR above 95 percent with 40 nodes, collisions under 5 percent, and the battery model predicts over 2 years.

**Measure.** Packet delivery ratio; Collision rate; Average current; Estimated battery life

**Pitfalls.** Ignoring airtime in duty-cycle limits; Sensor corrosion; Clock drift breaking time slots

**Stretch.** Mesh relaying for far nodes; Irrigation valve control from the gateway

**Parts.** LoRa module + MCU board $10-20 per node; capacitive soil sensor $5-10; 2 AA holder + cells $4-8; enclosure $3-8; gateway board with LoRa $30-60; antennas $5-15

### Modbus energy-meter gateway for a small factory
`mx-hw-modbus-energy-gateway` · Y4 · level 3 · 28 h · Python or Rust, pymodbus-like own implementation, MQTT broker, SQLite

**Scenario.** Anvil Metalworks wants to see electricity use per machine, but its 15 meters speak Modbus RTU and the plant network does not. They need a gateway that polls meters and publishes data.

**Functional.** Poll 15 meters over RS-485 at 2 s intervals using Modbus RTU; Handle timeouts, CRC errors and retries per device; Publish readings as JSON over MQTT; Buffer up to 1 hour of data when the network is down; Serve a local status page with per-meter health

**Non-functional.** Poll cycle of 15 meters under 2 s with 0 percent loss on a clean bus; Recover from a bus fault within 5 s; Gateway uses under 30 MB RAM on a single-board computer

**Constraints.** Runs on a low-power SBC; Meters are read-only; no write commands

**Architecture.** A polling loop with a scheduler talks to a RS-485 adapter; a simulated Modbus slave bus enables testing without hardware. Components: Modbus RTU client, Device scheduler, Buffer and retry, MQTT publisher, Health page, Simulated slaves

**Data.** Simulated meters generating register maps of voltage, current and energy

**Milestones.** Protocol study and simulator (6 h) · Modbus client with CRC and timeouts (7 h) · Scheduler and buffering (6 h) · MQTT and status page (5 h) · Fault-injection testing (4 h)

**Deliverables.** repo with README; register map doc; fault test report

**Done when.** Polling 15 simulated meters completes under 2 s, bus faults recover in 5 s, and memory stays under 30 MB.

**Measure.** Cycle time; Recovery time; Data loss in outage test; Memory use

**Pitfalls.** Bus turnaround delays; Endianness of 32-bit registers; Unbounded buffering

**Stretch.** Add anomaly alerts; Support Modbus TCP meters

**Parts.** Single-board computer $15-45; USB-RS485 adapter $5-12; termination resistors and cable $5-10; optional real meter $20-40; DIN enclosure $10-20

### Vibration monitor for factory motors
`mx-hw-motor-vibration-monitor` · Y4 · level 4 · 32 h · C on Cortex-M4, CMSIS-DSP, Python (NumPy, SciPy)

**Scenario.** Kestrel Plastics runs 40 induction motors on extrusion lines and has had three surprise bearing failures this year. Maintenance wants a cheap sensor node that spots bearing faults weeks before failure.

**Functional.** Sample a 3-axis MEMS accelerometer at 4 kHz in bursts every 10 minutes; Compute RMS, kurtosis and an FFT spectrum on the MCU; Detect bearing fault frequencies from known motor geometry; Raise a warning when features exceed a learned baseline; Upload compact feature records over a wired or wireless link

**Non-functional.** Detect an injected 2x amplitude bearing tone with 95 percent recall at 5 percent false alarms; FFT of 1024 points in under 20 ms on the MCU; Node average current under 5 mA on battery duty cycle

**Constraints.** Use only public bearing vibration datasets for validation; Node cost under $40

**Architecture.** The MCU captures accelerometer bursts via DMA, runs fixed-point features and sends them to a gateway script that maintains baselines and alerts. Components: Accelerometer driver with DMA, Feature extractor, Fault frequency calculator, Baseline and alert logic, Telemetry packet format, Offline evaluation notebook

**Data.** Public bearing fault vibration datasets (Case Western style) plus synthetic bursts with injected fault tones

**Milestones.** Dataset study and feature design offline (7 h) · Firmware DMA capture and FFT (8 h) · Fault frequency detection (6 h) · Baseline and alerting (6 h) · Power profiling and write-up (5 h)

**Deliverables.** repo with README; evaluation notebook; power budget; design doc

**Done when.** Offline test shows 95 percent recall at 5 percent false alarm rate, FFT under 20 ms measured, and duty-cycled current under 5 mA.

**Measure.** Recall and false alarm rate; FFT latency; Average current; Feature size per record

**Pitfalls.** Mounting resonance of the sensor masquerading as a fault; Aliasing from poor anti-alias setup; Overfitting thresholds to one public dataset

**Stretch.** Run a small anomaly model on-device; Order tracking with a tachometer pulse

**Parts.** Cortex-M4 board $15-25; MEMS accelerometer (ADXL-class) $5-15; stud-mount or magnet adapter $3-8; battery pack $8-15; enclosure $5-10; USB-UART $3-8

### Motor test bench for a drone startup
`mx-hw-drone-motor-testbench` · Y4 · level 4 · 30 h · C++ (Arduino or Pico), Python (pandas, Matplotlib)

**Scenario.** Skyloft Dynamics picks propeller and motor combinations by guesswork. They want a 1-motor bench that measures thrust, torque, current and RPM so they can build efficiency maps.

**Functional.** Measure thrust with a load cell, current and voltage with a shunt, and RPM from ESC telemetry or optical pulse; Run scripted throttle sweeps with safety cut-offs; Log data at 1 kHz and export CSV; Compute efficiency in g/W across throttle steps; Include an emergency stop and over-current trip

**Non-functional.** Thrust accuracy within 1 percent of full scale (5 kg); Current measurement within 2 percent up to 40 A; Emergency stop cuts power in under 20 ms

**Constraints.** Bench powered from a lab supply limited to 24 V, 40 A; Prop guard and enclosure required

**Architecture.** A microcontroller reads an HX711-class ADC, current sensor and RPM pulses, commands the ESC via PWM, and streams data to a Python script that produces efficiency curves. Components: Load-cell chain and calibration, Current/voltage sensing, ESC PWM controller, Throttle sweep scripts, Safety trip and E-stop, Data analysis

**Data.** Own measurements with a hobby brushless motor; synthetic data to test analysis offline

**Milestones.** Mechanical frame and safety plan (5 h) · Load-cell and current-sense calibration (7 h) · Firmware acquisition and ESC control (8 h) · Safety interlocks and testing (5 h) · Efficiency map analysis and report (5 h)

**Deliverables.** repo with README; calibration report; efficiency curves for 2 props; safety checklist

**Done when.** Calibration shows thrust error within 1 percent of 5 kg, current within 2 percent to 40 A, and E-stop measured under 20 ms.

**Measure.** Thrust and current error; Sample rate achieved; Efficiency curve repeatability; E-stop latency

**Pitfalls.** Vibration noise on load cell; Ground loops between ESC and ADC; Underestimating prop hazards

**Stretch.** Add temperature and acoustic measurements; Auto-fit a propeller model

**Parts.** Brushless motor + prop $25-45; ESC $15-30; 5 kg load cell + amp $12-25; 50 A current sensor $8-15; MCU board $5-15; aluminium profile frame $25-45; E-stop + contactor $15-30; lab supply (assumed) $0-80

### Solar charge controller with MPPT for an off-grid clinic
`mx-hw-mppt-solar-controller` · Y4 · level 4 · 30 h · C, Python (SciPy), optional LTspice-style analysis

**Scenario.** Sunrise Rural Health runs a clinic fridge from a 200 W panel but loses 20 percent of energy because the charge controller does not track the maximum power point. They want a buck MPPT controller.

**Functional.** Measure panel and battery voltage and current; Run perturb-and-observe MPPT through a buck converter duty cycle; Implement 3-stage lead-acid/LiFePO4 charging profiles; Protect against reverse polarity, overvoltage and over-temperature; Log daily energy harvested

**Non-functional.** Tracking efficiency at least 95 percent on a simulated irradiance profile; Converter efficiency above 94 percent at 10 A in the model; Controller recovers from shading step change within 2 s

**Constraints.** Simulation-first; hardware tests limited to 30 V, 5 A; Battery chemistry set by profile only

**Architecture.** A MCU measures and adjusts PWM at 100 Hz for MPPT while a faster loop limits current. A Python solar-panel model drives tests. Components: PV panel model, Buck converter averaged model, MPPT algorithm, Charge-stage state machine, Protection logic, Energy logger

**Data.** Synthetic irradiance and temperature profiles (clear, cloudy, partial shading) from a documented generator

**Milestones.** PV and buck model, component sizing (7 h) · MPPT algorithm in simulation (7 h) · Firmware port and charge stages (8 h) · Protection and faults (4 h) · Efficiency report (4 h)

**Deliverables.** repo with README; sizing calculations; simulation report; firmware test log

**Done when.** On the cloudy and shading profiles tracking efficiency exceeds 95 percent and shading recovery is under 2 s.

**Measure.** Tracking efficiency; Converter efficiency; Recovery time; Energy harvested per day

**Pitfalls.** P&O oscillation at the maximum power point; Ignoring inductor saturation; Charging a battery above temperature limits

**Stretch.** Incremental conductance algorithm; Partial-shading global peak search

**Parts.** Buck converter module or discrete (MOSFET, inductor, diode) $15-30; MCU board $5-15; voltage dividers/current sensors $8-15; 30 W test panel $20-35; 12V battery or bench source $0-40; fuses/connectors $8-15

### Inverted pendulum control rig for a controls course
`mx-hw-pendulum-control-rig` · Y4 · level 4 · 30 h · C++ (Teensy/Pico), Python (python-control, NumPy)

**Scenario.** A university controls course has only simulated labs and wants a cheap cart-pole rig where students tune PID and state-feedback controllers on real hardware.

**Functional.** Read cart position and pendulum angle from encoders; Run LQR and PID controllers at 500 Hz; Swing-up and balance the pendulum; Log data and compare to the nonlinear simulation; Include limit-switch and motor-current safety

**Non-functional.** Pendulum stays upright within +/-2 degrees for 60 s; Control loop period 2 ms with under 100 us jitter; Disturbance rejection after a 0.2 N tap within 1.5 s

**Constraints.** Rail length 50 cm; Motor driver limited to 12 V, 3 A

**Architecture.** A fixed-rate loop reads quadrature encoders, computes the control law and drives a DC motor. A nonlinear simulator validates gains first. Components: Nonlinear plant model, LQR design script, Encoder reader, Fixed-rate control loop, Swing-up energy controller, Safety limits

**Data.** Own system identification trials plus a simulated plant

**Milestones.** Model derivation and simulation (7 h) · LQR/PID design in simulation (6 h) · Firmware control loop (7 h) · Swing-up and safety (6 h) · System identification and report (4 h)

**Deliverables.** repo with README; derivation notes; tuning guide; demo video

**Done when.** Hardware holds within +/-2 degrees for 60 s, loop jitter is under 100 us, and a tap disturbance settles in 1.5 s.

**Measure.** Balance time; Angle RMS error; Loop jitter; Settling time after disturbance

**Pitfalls.** Encoder noise differentiated into the control; Stiction in cart motion; Sign convention mistakes in the model

**Stretch.** Kalman filter state estimator; Reinforcement-learning controller in sim only

**Parts.** 50 cm linear rail + carriage $15-30; DC motor with encoder $15-30; pendulum encoder $8-15; belt + pulleys $8-15; motor driver $6-12; microcontroller $10-25; limit switches $3-6

### Battery cell test cycler for a repurposing lab
`mx-hw-battery-cell-cycler` · Y4 · level 4 · 30 h · C/C++ firmware, Python

**Scenario.** SecondLife Cells wants to grade used 18650 cells before putting them in storage packs. They need a 4-channel cycler that charges and discharges cells and reports capacity and internal resistance.

**Functional.** Run constant-current/constant-voltage charge and constant-current discharge per channel; Measure capacity in mAh and DC internal resistance with pulse test; Enforce safety limits on voltage, temperature and time; Log curves and produce a grade (A/B/C) per cell; Provide a Python CLI for test recipes

**Non-functional.** Current regulation within 1 percent at 1 A; Capacity measurement repeatable within 2 percent; Safety cutoff reacts in under 100 ms

**Constraints.** Max 4.25 V and 2 A per channel; No unattended lithium testing without fire-safe container

**Architecture.** Each channel is a controlled current source with ADC feedback. A state machine runs recipes and a host script grades cells. Components: Current source control loop, ADC measurement, Recipe state machine, Safety supervisor, Host CLI, Grading analysis

**Data.** Own cells; public cell-aging datasets for grading logic; synthetic discharge curves

**Milestones.** Analog design and safety plan (6 h) · Current control firmware (8 h) · State machine and recipes (6 h) · Grading and analysis (6 h) · Validation vs reference meter (4 h)

**Deliverables.** repo with README; safety plan; accuracy report; sample grading output

**Done when.** Current is regulated within 1 percent at 1 A, capacity repeats within 2 percent over 3 runs, and safety cutoff measured under 100 ms.

**Measure.** Current accuracy; Capacity repeatability; Cutoff latency; Grading consistency

**Pitfalls.** Thermal runaway risk handling; Voltage drop in leads biasing measurements; Overheated pass transistors

**Stretch.** Add EIS-lite impedance sweeps; Multi-cell batch scheduler

**Parts.** MCU board $10-20; 4 MOSFET + op-amp current-source channels $20-40; precision ADC $6-12; 4 cell holders with Kelvin leads $10-20; heat sinks/fans $10-20; supply $15-30; fire-safe box $10-20

### FPGA video pipeline for an inspection camera
`mx-hw-fpga-inspection-video` · Y4 · level 5 · 32 h · SystemVerilog or Amaranth, Verilator, cocotb, Python/OpenCV golden model

**Scenario.** BrightSeam Optics builds a weld-seam inspection camera that must flag defects in under 5 ms at 60 fps, which a CPU cannot do cheaply. They need an FPGA pipeline that debayers, filters and thresholds frames in real time.

**Functional.** Ingest 1280x720 at 60 fps from a sensor interface or test generator; Debayer and apply gamma and a 3x3 filter in streaming fashion; Compute per-frame defect-candidate blobs via threshold and connected-component labeling; Output annotated video over HDMI or a frame-grabber stub; Expose statistics registers to a host over UART or SPI

**Non-functional.** End-to-end pipeline latency under 5 ms; Sustain 60 fps at 148.5 MHz pixel clock with timing closure; Logic use under 60 percent of a mid-size FPGA

**Constraints.** Open-source simulation and synthesis flow; No external DRAM for the main path (line buffers only)

**Architecture.** A streaming pipeline of line-buffered stages connects through AXI-Stream-like handshakes. Verilator and Python models compare bit-exact outputs. Components: Test pattern and sensor emulator, Debayer stage, Convolution stage with line buffers, Threshold and blob labeler, Output formatter, Python golden model and testbench

**Data.** Synthetic weld images with injected defects and public texture defect datasets for golden comparisons

**Milestones.** Python golden model and spec (6 h) · Debayer and filter RTL (8 h) · Threshold and blob labeler (8 h) · Integration, timing closure (6 h) · Latency and resource report (4 h)

**Deliverables.** repo with README; bit-exact verification report; timing and utilization report; architecture diagram

**Done when.** RTL output matches the golden model on 100 test frames bit-exactly, latency is under 5 ms, and timing closes at 148.5 MHz under 60 percent logic use.

**Measure.** Latency in lines and ms; LUT/BRAM/DSP utilization; Max clock; Defect recall on synthetic set

**Pitfalls.** Line buffer off-by-one at frame edges; Clock-domain crossing errors; Golden model not matching fixed-point rounding

**Stretch.** Add a small CNN stage; Run on real hardware with a camera module

**Parts.** FPGA dev board (Artix/ECP5 class) $50-150; camera module or HDMI source $15-40; HDMI breakout $8-20; USB-JTAG $0-20; jumper wires $5

### Field-oriented control firmware for a BLDC robot joint
`mx-hw-foc-motor-controller` · Y4 · level 5 · 32 h · C, CMSIS-DSP, Python/Simulink-like numerical model

**Scenario.** Hexapod Labs needs a compact BLDC driver for a small robot joint that holds torque smoothly at low speed. They want FOC firmware with current, speed and position loops.

**Functional.** Sample two phase currents synchronized with PWM center; Implement Clarke and Park transforms with d/q current PI loops; Estimate rotor angle from an encoder and later a sensorless observer; Cascade speed and position loops with limits; Provide a serial tuning interface and fault trips

**Non-functional.** Current loop bandwidth at least 1 kHz with under 10 percent overshoot; FOC ISR under 20 us at 20 kHz PWM on a Cortex-M4; Position hold error under 0.5 degrees under 50 percent torque disturbance

**Constraints.** Validate in simulation before any hardware; 24 V and 10 A maximum bench limits

**Architecture.** A fixed-rate ISR runs the current loop and the main loop runs slower cascade controllers. A Python plant model verifies gains first. Components: Motor and inverter model, Clarke/Park transforms, d/q PI controllers, Encoder and observer, Cascade loops, Tuning and fault interface

**Data.** Simulated motor parameters (R, L, flux, inertia) and optional bench motor measurements

**Milestones.** Motor model and gain design (7 h) · Current loop ISR firmware (8 h) · Speed/position cascade (7 h) · Faults, limits, tuning interface (6 h) · Step-response report (4 h)

**Deliverables.** repo with README; controller design notes; step-response plots; fault test log

**Done when.** Simulation and target ISR meet 1 kHz current bandwidth with under 10 percent overshoot and ISR time under 20 us at 20 kHz.

**Measure.** Bandwidth and overshoot; ISR execution time; Hold error under disturbance; Torque ripple

**Pitfalls.** Current sample timing misaligned with PWM; Wrong sign in Park angle offsets; Integrator windup at voltage saturation

**Stretch.** Sensorless back-EMF observer; Field weakening

**Parts.** BLDC gimbal-class motor $10-25; encoder (magnetic) $5-15; 3-phase gate driver board $15-40; MCU dev board $10-25; 24V supply $15-25; shunt amps/current sensors $5-15

### Heat-sink design for a high-power motor driver board
`mx-hw-heatsink-power-board` · Y5 · level 3 · 30 h · Python, open-source thermal solver or simple FEM, spreadsheet

**Scenario.** VoltForge's 3 kW motor driver overheats at 70 percent load. They need a heat sink and airflow plan to keep MOSFET junctions below 110 C in a sealed 40 C enclosure.

**Functional.** Compute losses in the MOSFET bridge from currents and switching data; Build a thermal resistance network from junction to ambient; Evaluate extrusion heat-sink options and fan curves; Run a simple CFD or conduction simulation to confirm hotspots; Bench-test with heater resistors and thermocouples

**Non-functional.** Junction temperature at most 110 C at 3 kW and 40 C ambient with 20 percent margin; Model vs measurement agreement within 10 C; Heat sink mass under 600 g and fan noise under 45 dBA

**Constraints.** Enclosure 25x15x10 cm; Cost of thermal solution under $25

**Architecture.** A Python thermal network model sizes candidate heat sinks; a simulation and a heater-resistor test validate the choice. Components: Loss calculator, Thermal network model, Heat-sink candidates, Fan curve intersection, Simulation, Bench test

**Data.** Datasheet-style parameters (invented for the fictional board) and own bench measurements

**Milestones.** Loss and network model (7 h) · Candidate heat sink trade study (7 h) · Simulation of hotspots (7 h) · Bench test with heaters (6 h) · Design decision memo (3 h)

**Deliverables.** repo with README; trade study table; model-vs-measurement plot; decision memo

**Done when.** Chosen design predicts Tj at most 110 C with margin, the bench matches the model within 10 C, and mass is under 600 g.

**Measure.** Junction temperature; Model error; Mass and cost; Fan noise

**Pitfalls.** Ignoring thermal interface resistance; Assuming free airflow in a sealed box; Power resistor mounting differing from MOSFETs

**Stretch.** Heat pipe option; Transient thermal response for pulsed loads

**Parts.** Aluminium extrusion heat sink $8-18; thermal pad/grease $3-8; 40 mm fan $4-10; power resistors as heaters $10-20; 4 thermocouples + reader $15-30; DC supply (assumed) $0-60

### Self-balancing two-wheeled robot for school outreach
`mx-hw-balancing-robot` · Y5 · level 3 · 28 h · C++ (Arduino or Pico), Python simulation

**Scenario.** Sparks Outreach teaches robotics at 20 schools and wants a robust two-wheeled balancing robot kit that students can tune, with a clear failure recovery behavior.

**Functional.** Fuse accelerometer and gyro for tilt estimation; Run a cascaded PID for balance and wheel speed; Accept remote forward/turn commands; Detect falls and cut motors safely; Expose gains over serial for classroom tuning

**Non-functional.** Maintain balance within +/-3 degrees for 5 minutes; Control loop 200 Hz with under 1 ms jitter; Recover from a 0.3 N push within 1 s

**Constraints.** Kit cost under $60; Powered by a 2S pack

**Architecture.** An IMU estimator feeds the balance loop which drives two geared motors with encoders. A simulator helps students choose gains. Components: IMU driver and filter, Balance controller, Speed/turn controller, Fall detector, Serial tuning, Simulator

**Data.** Simulated inverted-pendulum dynamics plus classroom logs

**Milestones.** Pendulum model and simulator (6 h) · Tilt estimation (5 h) · Balance and speed loops (8 h) · Fall safety and tuning interface (5 h) · Classroom guide and tests (4 h)

**Deliverables.** repo with README; student guide; tuning log; demo

**Done when.** Robot balances within +/-3 degrees for 5 minutes, recovers from a 0.3 N push in 1 s, and loop jitter is under 1 ms.

**Measure.** Tilt RMS error; Recovery time; Jitter; Battery life

**Pitfalls.** Motor deadband breaking low-speed control; Gyro bias drift; Wheel slip on smooth floors

**Stretch.** Line following mode; Wireless gamepad control

**Parts.** MCU board $5-12; 6-axis IMU $4-8; 2 geared motors with encoders $14-24; dual motor driver $4-8; 2S battery $8-14; chassis and wheels $8-18

### Conveyor sorting cell for a parcel start-up
`mx-hw-conveyor-sorting-cell` · Y5 · level 4 · 30 h · C++ or Python on a microcontroller/SBC, discrete-event simulation

**Scenario.** QuickHop, a regional parcel start-up, hand-sorts 800 small parcels an hour into three bins. They want a conveyor cell with a camera-less barcode or color-tag reader and pusher gates that sort reliably.

**Functional.** Move parcels on a belt with speed regulated by a closed loop; Read a tag at a fixed station and decide the bin; Fire pusher gates at the right time using encoder-based position tracking; Handle jams, double picks and unknown tags via a reject bin; Provide a state-machine controller with a HMI page

**Non-functional.** Throughput 800 parcels/hour at 0.3 m/s belt; Sorting accuracy above 99 percent in a 1,000-parcel simulation; Pusher timing error under 20 ms

**Constraints.** Belt length 2 m; Safe stop within 300 ms of E-stop

**Architecture.** A controller tracks each parcel by belt encoder counts, schedules pusher actions and runs a PLC-style state machine. A discrete-event simulator generates parcel streams. Components: Belt speed controller, Parcel tracker, Tag reader interface, Gate scheduler, Fault/jam handler, Parcel stream simulator

**Data.** Synthetic parcel streams with random spacing, sizes and tag misreads

**Milestones.** Cell layout and parcel simulator (6 h) · Belt speed control and encoder tracking (7 h) · Gate scheduling logic (7 h) · Fault handling and E-stop (6 h) · Throughput and accuracy study (4 h)

**Deliverables.** repo with README; layout drawing; simulation report; fault-case table

**Done when.** 1,000-parcel simulation sorts above 99 percent correctly at 800/h with timing error under 20 ms; E-stop halts the belt in under 300 ms on the rig.

**Measure.** Throughput; Sorting accuracy; Timing error; Jam recovery time

**Pitfalls.** Belt slip breaking encoder tracking; Parcels too close for gate timing; Ignoring pusher actuation delay

**Stretch.** Vision-based classifier; Dynamic belt speed to meet load

**Parts.** DC gear motor + belt kit $60-120; encoder $8-15; 3 solenoid or servo pushers $20-45; tag reader (barcode or colour sensor) $10-30; motor driver $8-15; MCU/SBC $10-40; E-stop + frame $25-45

### 2-axis camera gimbal with stabilization
`mx-hw-camera-gimbal` · Y5 · level 4 · 30 h · C++, Python simulation

**Scenario.** Trailblaze Films wants a cheap 2-axis handheld gimbal for a phone-sized camera. Operators complain of jitter when walking.

**Functional.** Estimate camera orientation from an IMU with a complementary or Mahony filter; Drive two brushless gimbal motors in torque mode; Hold pitch and roll against hand motion with cascade PID; Accept joystick or follow mode inputs; Include calibration of gyro bias and motor zero angles

**Non-functional.** Residual angular jitter under 0.2 degrees RMS under 3 Hz hand motion; Control loop at 1 kHz; Battery runtime over 3 hours on a 2000 mAh pack

**Constraints.** Payload 250 g; 3D-printed frame

**Architecture.** An IMU feeds an attitude estimator and two motor loops run at 1 kHz. A rigid-body simulation validates tuning before hardware. Components: IMU driver and filter, Motor drivers, Cascade controller, Follow-mode logic, Calibration, Simulation

**Data.** Simulated hand-motion disturbance profiles and recorded IMU logs

**Milestones.** Dynamics model and simulation (7 h) · Attitude estimation (6 h) · Motor control loops (8 h) · Follow mode and calibration (5 h) · Tuning and jitter report (4 h)

**Deliverables.** repo with README; tuning notes; jitter spectra; demo video

**Done when.** Simulation and bench show under 0.2 degrees RMS residual at 3 Hz disturbances with a 1 kHz loop, and runtime over 3 hours.

**Measure.** RMS residual angle; Loop timing; Gyro bias drift; Current draw

**Pitfalls.** Gimbal frame resonance; IMU temperature drift; Cable torque disturbances

**Stretch.** Third axis (yaw); Object tracking mode

**Parts.** 2 gimbal BLDC motors $20-40; IMU (6-axis) $5-12; 2 motor drivers $10-25; MCU board $8-20; 3D-printed frame $10-25; 2S battery $10-18; handle + bearings $10-20

### 3D-printed prosthetic hand test rig
`mx-hw-prosthetic-hand-rig` · Y5 · level 4 · 30 h · C++ (Arduino/Pico), Python

**Scenario.** OpenHand Clinic prints low-cost prosthetic hands and needs a rig that measures grip force, finger speed and durability over thousands of cycles before fitting patients.

**Functional.** Drive one finger tendon with a servo or linear actuator and measure fingertip force; Measure tendon tension and finger angle; Run automated cycle tests logging wear indicators; Characterize pinch and power grip force curves; Auto-stop on force overload

**Non-functional.** Fingertip force measurement within 3 percent up to 20 N; Run 10,000 cycles at 1 Hz with logged drift; Overload stop within 50 ms

**Constraints.** Print in PLA/PETG only; Rig fits a 40x30 cm bench

**Architecture.** A servo-driven cycle controller reads load cell and encoder data and logs per-cycle metrics. A Python analysis script flags drift. Components: Actuation controller, Force measurement chain, Cycle logger, Overload protection, Drift analyzer, Mechanical fixture

**Data.** Own rig data; synthetic degradation curves for analysis tests

**Milestones.** Fixture design and CAD (7 h) · Force chain calibration (6 h) · Cycle controller firmware (7 h) · Overload protection (4 h) · Endurance test and analysis (6 h)

**Deliverables.** repo with README; CAD files; calibration report; endurance results

**Done when.** Force is within 3 percent to 20 N, a 10,000-cycle run completes with logged drift, and overload stop is under 50 ms.

**Measure.** Force accuracy; Per-cycle force drift; Cycles to first failure; Stop latency

**Pitfalls.** Tendon creep changing force baselines; Plastic wear affecting fixtures; Load-cell crosstalk

**Stretch.** Add EMG-driven control test; Thermal drift modelling

**Parts.** Printed hand parts (filament) $10-25; servo or linear actuator $12-35; 20 N load cell + amp $10-20; angle encoder/potentiometer $3-8; MCU $5-15; fixture hardware $15-30; tendon line $3-6

### Wind-turbine blade FEA study for a small turbine maker
`mx-hw-blade-fea-study` · Y5 · level 4 · 32 h · Python, open-source FEA solver (CalculiX or FEniCS-style), Gmsh, Matplotlib

**Scenario.** BreezeWorks makes 5 kW village turbines and its blade cracked at the root in a storm. They need a finite-element study to size the root and layup.

**Functional.** Define a 2.5 m blade geometry with an airfoil profile series; Compute aerodynamic loads along the span via blade element momentum theory; Build a shell or beam FEA model of the blade; Report stresses, tip deflection and first natural frequencies; Compare two root layups under extreme gust loading

**Non-functional.** Tip deflection under 5 percent of blade length at rated load; Max stress under 40 percent of laminate strength at extreme load; Mesh convergence within 3 percent between two refinements

**Constraints.** Open-source FEA tools; Analyses run on a laptop in under 10 minutes each

**Architecture.** A script generates loads and geometry, a solver computes the structural response and a postprocessor produces the report plots. Results are checked against beam theory. Components: Geometry generator, BEM load calculator, FEA model builder, Solver runner, Postprocessor, Beam-theory check

**Data.** Published airfoil coordinates and documented material properties of glass-fibre composites

**Milestones.** Geometry and airfoil data (5 h) · BEM loads and verification (7 h) · FEA model and mesh study (9 h) · Layup comparison and dynamics (6 h) · Report with recommendations (5 h)

**Deliverables.** repo with README; verification notes against beam theory; mesh convergence plot; design recommendation memo

**Done when.** The mesh study converges within 3 percent, FEA matches beam theory deflection within 10 percent, and the chosen layup meets deflection and stress limits.

**Measure.** Tip deflection; Peak stress and location; Natural frequencies; Mesh convergence error

**Pitfalls.** Mesh locking in thin shells; Wrong load direction at the root; Treating composite as isotropic without checking

**Stretch.** Fatigue life estimate; Coupled aeroelastic loop

**Parts.** Laptop only for the study; optional 1 m printed blade coupon for a bending test: filament $15-30; dial gauge $10-25; weights $10-20; clamp jig $10-20

### 6-DOF robot arm pick-and-place cell for a lab
`mx-hw-robot-arm-pick-place` · Y5 · level 4 · 32 h · Python/C++, URDF-style model, NumPy

**Scenario.** NanoSample Lab moves 96-well plates by hand and wants a low-cost arm that picks and places them between two stations repeatably.

**Functional.** Compute forward and inverse kinematics for a 6-DOF arm; Generate smooth joint trajectories with velocity and acceleration limits; Command servos or stepper joints over a bus; Check joint limits and self-collision before moving; Calibrate the arm against two station poses

**Non-functional.** Repeatability within 1 mm over 100 pick-place cycles; Cycle time under 8 s per move pair; Trajectory planner runs in under 10 ms per segment

**Constraints.** Payload 300 g; Servo-class actuators with backlash

**Architecture.** A kinematics library feeds a trajectory generator; a simulator verifies motion before real servos run. A calibration routine corrects offsets. Components: Kinematics solver, Trajectory generator, Joint driver interface, Collision/limit checker, Calibration tool, Simulator

**Data.** Analytical robot model and own repeatability measurements

**Milestones.** URDF model and FK/IK (8 h) · Trajectory generation (7 h) · Joint driver and limits (6 h) · Calibration and station teach (6 h) · Repeatability test (5 h)

**Deliverables.** repo with README; kinematics notes; repeatability data; demo video

**Done when.** 100 cycles show repeatability within 1 mm, cycles under 8 s, and the planner is under 10 ms per segment.

**Measure.** Position repeatability; Cycle time; Planner latency; IK failure rate

**Pitfalls.** IK singularities near wrist alignment; Backlash accumulation; Forgetting joint-zero offsets

**Stretch.** Vision-based plate localization; Force-limited gripper

**Parts.** 6-DOF servo arm kit $120-300; servo power supply $15-30; gripper $15-40; MCU/SBC $10-40; 3D-printed plate fixtures $10-20; calibration targets $5-10

### Topology-optimized 3D-printed drone frame
`mx-hw-drone-frame-topology` · Y5 · level 4 · 30 h · Python (NumPy/SciPy), open-source FEA, CAD

**Scenario.** Skyloft Dynamics wants a lighter 5-inch racing frame arm that survives a 3 m crash-landing impulse. They plan to print it in nylon-carbon.

**Functional.** Define design space, loads and boundary conditions for one arm; Run SIMP topology optimization with a volume fraction constraint; Post-process into a printable geometry with minimum feature size; Verify stress and deflection with a separate FEA; Test-print and bend-test a coupon

**Non-functional.** Mass at most 40 percent lower than a solid baseline arm; Peak stress under 50 percent of material yield at a 200 N tip load; Tip deflection under 2 mm at 50 N

**Constraints.** Min wall 1.2 mm; Optimization runs in under 5 minutes on a laptop

**Architecture.** A Python SIMP optimizer produces a density field that is thresholded into a smooth shape, exported to CAD and checked in FEA. Components: Load case definition, SIMP optimizer, Filtering and thresholding, CAD export, Verification FEA, Bend test

**Data.** Self-generated loads and documented nylon-carbon properties

**Milestones.** Load cases and baseline FEA (6 h) · SIMP optimizer (9 h) · Printable geometry (6 h) · Verification FEA (5 h) · Bend test and report (4 h)

**Deliverables.** repo with README; optimizer code with tests; verification report; bend test results

**Done when.** Optimized arm is at least 40 percent lighter, under 50 percent yield stress at 200 N, with under 2 mm deflection at 50 N.

**Measure.** Mass reduction; Peak stress; Deflection; Compliance vs volume

**Pitfalls.** Checkerboard patterns; Ignoring print-direction anisotropy; Stress concentrations at sharp thresholded edges

**Stretch.** Multi-load-case optimization; Lattice infill

**Parts.** Nylon-carbon filament $25-45; printer time (own/service) $0-40; bolts/inserts $5-10; test weights and clamp $15-30; dial gauge $10-25

### Gearbox backlash and efficiency test stand
`mx-hw-gearbox-torque-stand` · Y5 · level 4 · 30 h · C++, Python (pandas, Matplotlib)

**Scenario.** Torquewell designs small planetary gearboxes for robot joints and needs to measure backlash, efficiency and torque ripple with a repeatable stand.

**Functional.** Drive a gearbox input with a motor and load the output with a brake or generator; Measure input and output torque and speed; Measure backlash by slow torque reversal with an output encoder; Run automated sweeps for efficiency maps; Log and plot results

**Non-functional.** Torque measurement within 1.5 percent up to 5 Nm; Backlash resolution of 0.02 degrees; Efficiency map of 30 points in under 20 minutes

**Constraints.** Max motor power 200 W; Guarded rotating parts

**Architecture.** A controller sets speed and brake torque, reads torque sensors and encoders and runs sweeps. A Python tool builds efficiency and backlash plots. Components: Drive and load control, Torque sensing, Encoder measurement, Sweep sequencer, Safety interlock, Analysis tool

**Data.** Own measurements; synthetic gearbox models for testing analysis code

**Milestones.** Stand design and safety (6 h) · Torque and encoder calibration (7 h) · Sweep controller (7 h) · Backlash method (5 h) · Efficiency maps and report (5 h)

**Deliverables.** repo with README; CAD of stand; calibration report; efficiency maps

**Done when.** Torque error is within 1.5 percent to 5 Nm, backlash is resolved to 0.02 degrees, and a 30-point sweep finishes in 20 minutes.

**Measure.** Torque accuracy; Backlash resolution; Sweep time; Repeatability across 3 runs

**Pitfalls.** Coupling misalignment adding torque error; Thermal drift in efficiency; Encoder resolution too coarse

**Stretch.** Temperature rise measurement; Fatigue life test

**Parts.** Brushed/BLDC drive motor $25-50; torque sensors (strain-gauge) $30-70; output encoder $10-25; magnetic brake or generator $20-40; couplings and frame $30-60; MCU + amps $15-30

### Sidewalk delivery robot prototype for a campus
`mx-hw-delivery-robot-prototype` · Y5 · level 5 · 34 h · ROS 2, C++/Python, simulation

**Scenario.** CampusRun, a start-up, wants a small robot that carries parcels between dorms and the library at 1.5 m/s. They need a first prototype that drives a mapped route and stops for obstacles.

**Functional.** Differential-drive base with wheel odometry and IMU; Localize on a pre-built 2D map using lidar scan matching; Plan and follow routes with obstacle slowdown; Stop safely when the path is blocked or the link is lost; Log runs and replay them offline

**Non-functional.** Reach waypoints within 0.3 m on a 200 m simulated route; Emergency stop distance under 0.5 m at 1.5 m/s; Control loop 50 Hz with navigation stack CPU load under 60 percent

**Constraints.** Battery 24 V, runtime 2 hours; Prototype first validated in simulation

**Architecture.** A ROS-style graph links drivers, localization, planner and base controller. Gazebo-like simulation of a campus map exercises it. Components: Base controller, Odometry/IMU fusion, Scan-matching localization, Route planner, Obstacle and safety layer, Run logger and replay

**Data.** Simulated campus world and recorded lidar logs; a public indoor-mapping dataset for localization tests

**Milestones.** Sim world and robot model (7 h) · Odometry and localization (8 h) · Planner and path following (8 h) · Safety layer and failure tests (6 h) · Run report and replay (5 h)

**Deliverables.** repo with README; architecture diagram; simulation run report; safety case

**Done when.** On the 200 m route the robot reaches all waypoints within 0.3 m and stops within 0.5 m from 1.5 m/s in 20 consecutive trials.

**Measure.** Waypoint error; Stop distance; CPU load; Localization failure rate

**Pitfalls.** Wheel slip in odometry; Lidar mis-localization in long corridors; No handling of connection loss

**Stretch.** Real hardware chassis tests; Crossing detection with a camera

**Parts.** Differential-drive chassis with 2 hub motors $120-250; 2D lidar $80-150; IMU $10-20; motor controller $30-60; SBC $60-120; 24V battery $60-120; E-stop + enclosure $30-60

### Hand-eye calibration for a camera-guided robot arm
`mx-hw-handeye-calibration` · Y5 · level 5 · 32 h · Python (NumPy, OpenCV)

**Scenario.** Pixelpick, a small automation firm, finds that its camera-guided arm misses parts by 6 mm because the camera-to-gripper transform is unknown. They need a calibration tool.

**Functional.** Detect a calibration board in images and estimate its pose; Collect board poses at multiple arm configurations; Solve the AX=XB hand-eye problem and refine it by reprojection; Report calibration quality and uncertainty; Provide a command-line workflow and unit tests

**Non-functional.** Calibrated pick error under 1.5 mm on 50 simulated trials; Calibration runs in under 30 s for 25 poses; Camera intrinsics reprojection error under 0.5 px

**Constraints.** Open-source vision libraries; Simulation-first, hardware optional

**Architecture.** A simulator generates synthetic camera views from known transforms; a solver recovers them and an evaluator checks pick accuracy. Components: Simulated camera and arm, Board detection, Intrinsics calibration, Hand-eye solver, Refinement, Evaluation harness

**Data.** Synthetic rendered boards with noise and known ground-truth transforms

**Milestones.** Math derivation and simulator (8 h) · Board detection and intrinsics (7 h) · Hand-eye solver (8 h) · Refinement and uncertainty (6 h) · Evaluation and report (3 h)

**Deliverables.** repo with README; derivation notes; accuracy report; CLI tool

**Done when.** Under noise, 50 simulated picks show error below 1.5 mm, reprojection error below 0.5 px, and calibration runs under 30 s.

**Measure.** Pick error; Reprojection error; Runtime; Sensitivity to number of poses

**Pitfalls.** Degenerate pose sets with little rotation; Mixing coordinate conventions; Ignoring lens distortion

**Stretch.** Real camera and arm run; Online recalibration

**Parts.** Webcam or USB camera $15-40; printed calibration board on rigid plate $5-15; optional small arm $120-300; lighting $10-20

## inference

### Offline help kiosk running a 1B int4 model on a mini-PC
`mx-inf-edge-kiosk-int4-llm` · Y1-P1 · level 2 · 20 h · Python, llama.cpp bindings, SQLite FTS, simple web UI

**Scenario.** Gallery Interactive builds museum kiosks in rooms with poor connectivity. They want a question-answering kiosk that runs a small quantized model on a fanless mini-PC and answers from exhibit text.

**Functional.** Run a 1B-class int4 model locally with streaming output; Retrieve exhibit text with a small local index; Limit answer length and refuse off-topic questions; Show a touch-friendly UI; Collect on-device latency and temperature logs

**Non-functional.** Time to first token <= 2 s on an 8 GB CPU-only mini-PC; Memory <= 4 GB total; Sustained 20-minute use with no thermal throttling drop > 15% tokens/s

**Constraints.** Fully offline, no GPU; Fanless 15 W CPU

**Architecture.** A local process pairs a small retriever with a quantized model and a refusal prompt; telemetry tracks thermals. Components: retriever, model runner, prompt policy, kiosk UI, telemetry

**Data.** Public museum-style text (e.g. Wikipedia articles on a chosen topic) as exhibit corpus

**Milestones.** Choose model and baseline on CPU (4 h) · Retrieval and prompt policy (5 h) · Kiosk UI (4 h) · Thermal soak test (4 h) · Evaluation and write-up (3 h)

**Deliverables.** repo with README and demo GIF; soak-test report

**Done when.** On target-class hardware TTFT <= 2 s, memory <= 4 GB, tokens/s drop <= 15% across a 20-minute soak.

**Measure.** TTFT, tokens/s over time, RSS, answer-grounding rate on 100 questions

**Pitfalls.** Testing only cold-room performance; Model answering beyond exhibit text; Context overflow from retrieved text

**Stretch.** Add offline TTS; Compare two quantizations on grounded accuracy

### Offline symptom-triage classifier on a Raspberry-class device
`mx-inf-clinic-triage-onnx-pi` · Y1-P1 · level 2 · 22 h · Python, scikit-learn or PyTorch, ONNX Runtime, QEMU or real ARM board

**Scenario.** Rural Care Network equips community health workers with a low-cost handheld that must score cases for referral urgency with no internet. The model must run on a small ARM device with a 2 GB memory limit.

**Functional.** Train or fine-tune a small text/tabular classifier; Export to ONNX and int8-quantize; Run inference on an ARM-class board or emulator; Calibrate probabilities and set a high-recall threshold; Log latency, memory, and battery-proxy CPU time

**Non-functional.** Recall >= 95% on urgent cases at precision >= 60%; Inference <= 120 ms on a 1.5 GHz quad-core ARM; Model plus runtime <= 150 MB

**Constraints.** No network; 2 GB RAM device

**Architecture.** A compact model is exported and quantized, and a tiny runtime wrapper handles input validation and calibrated scoring. Components: feature pipeline, trainer, ONNX exporter, int8 quantizer, edge runtime wrapper

**Data.** Synthetic patient-case generator based on public symptom-disease tables; no real patient data

**Milestones.** Synthetic data and baseline model (5 h) · Export and quantization (5 h) · ARM runtime benchmarking (5 h) · Calibration and threshold (4 h) · Write-up with limitations (3 h)

**Deliverables.** repo with README; benchmark table; model card with limitations

**Done when.** Urgent recall >= 95% at precision >= 60%, <= 120 ms per case on ARM target, bundle <= 150 MB.

**Measure.** Recall/precision, calibration error, latency, memory, size

**Pitfalls.** Treating synthetic accuracy as clinical validity; Quantization shifting calibration; Emulator timings unlike real hardware

**Stretch.** Add feature-importance explanations; Compare ONNX Runtime with a TFLite path

### On-device small model for an offline field-inspection app
`mx-inf-offline-field-app-llm` · Y1-P1 · level 3 · 25 h · Python, llama.cpp bindings, GGUF models, Pydantic, FastAPI

**Scenario.** Ridgeway Utilities sends inspectors to remote substations with no coverage. They want a laptop app that summarises their voice-note observations into a structured inspection form, fully offline.

**Functional.** Load a small quantized LLM locally via llama.cpp bindings; Convert free-text notes into a JSON form with schema validation; Retry or repair when output is invalid JSON; Provide a CLI and simple local web UI; Log inference time and memory per request

**Non-functional.** Run on a 16 GB RAM laptop with no GPU, peak RSS <= 6 GB; Median note-to-form time <= 8 s for 150-word notes; Valid-schema rate >= 97% on 200 test notes

**Constraints.** Fully offline after install; Installer under 5 GB total

**Architecture.** A local inference process exposes a small API; a grammar-constrained decoder guarantees schema validity with a repair fallback. Components: model loader, prompt builder, schema-constrained decoder, validator/repair loop, local UI, telemetry log

**Data.** Synthetic inspection notes generated with a larger model once, then hand-checked for 50 of them

**Milestones.** Pick model and quantization, baseline speed (5 h) · Prompt and schema design (5 h) · Constrained decoding and repair (6 h) · Local UI and packaging (5 h) · Evaluation on 200 notes and write-up (4 h)

**Deliverables.** repo with README and demo GIF; evaluation report; packaged installer script

**Done when.** On a CPU-only 16 GB laptop, 200-note test gives >=97% valid schema, median <= 8 s, peak RSS <= 6 GB.

**Measure.** Tokens/s, RSS, valid-schema rate, field-level accuracy, time per note

**Pitfalls.** Testing only on a fast desktop CPU; Counting valid JSON as correct content; Prompt grows past context on long notes

**Stretch.** Compare three quantization levels on accuracy per GB; Add voice-note transcription offline

### LLM gateway with a semantic cache and spend caps
`mx-inf-semantic-cache-gateway` · Y1-P1 · level 3 · 23 h · Python or Go, FastAPI, SQLite/Redis, small local embedding model

**Scenario.** Tutorly, an online tutoring marketplace, pays an LLM API bill that spikes whenever students ask the same homework questions. They want a small gateway that caches near-duplicate answers and enforces per-team spend caps.

**Functional.** Proxy chat requests to an upstream model API (mockable); Embed prompts and return cached answers above a similarity threshold; Support exact-match and semantic cache tiers with TTLs; Enforce per-team monthly token budgets; Log hit rate and saved cost

**Non-functional.** Cache lookup adds <= 15 ms p95; Wrong-answer cache hits <= 1% on a labelled test set; Handles 300 req/s on 2 vCPU

**Constraints.** Budget under $20/month to run; No GPU

**Architecture.** A thin proxy checks an exact cache, then a vector cache, then forwards upstream and stores results with metadata. Components: proxy server, embedding module, vector cache, budget enforcer, metrics store

**Data.** Synthetic student questions with paraphrase pairs produced by templates plus a public Quora duplicate-questions set

**Milestones.** Proxy skeleton and mock upstream (5 h) · Exact and semantic cache (6 h) · Threshold tuning on labelled pairs (5 h) · Budget enforcement (4 h) · Load test and write-up (3 h)

**Deliverables.** repo with README; threshold tuning report; load-test results

**Done when.** Lookup p95 <= 15 ms, false-hit rate <= 1% on the test set, 300 req/s sustained on 2 vCPU.

**Measure.** Hit rate, false-hit rate, saved tokens, lookup latency, throughput

**Pitfalls.** Caching answers that depend on user-specific context; One global threshold for all prompt types; Embedding cost exceeding savings

**Stretch.** Cache invalidation on model version change; Per-category thresholds

### On-device receipt reader with a quantized vision model
`mx-inf-receipt-ocr-ondevice` · Y1-P1 · level 3 · 25 h · Python, ONNX Runtime, OpenCV, a small OCR model

**Scenario.** Pocketledger, an expense-tracking app for freelancers, wants receipts parsed on the phone for privacy and offline use. You prototype on a laptop CPU with phone-class limits.

**Functional.** Detect and read receipt fields (merchant, date, total) with a small vision/OCR model; Quantize and compare accuracy versus size; Handle skewed, low-light images with preprocessing; Return structured JSON with confidence scores; Flag low-confidence fields for manual review

**Non-functional.** Total-amount exact match >= 92% on test set; Latency <= 1.5 s per receipt on 4 CPU cores; Model bundle <= 120 MB

**Constraints.** CPU only, simulating mobile; No cloud calls

**Architecture.** A preprocessing stage feeds a compact OCR/layout model, followed by rule-based field extraction with confidence gating. Components: image preprocessor, OCR model runner, field extractor, confidence gate, evaluation harness

**Data.** Public SROIE receipt dataset and synthetically degraded copies

**Milestones.** Dataset prep and baseline (5 h) · Quantization and speed tuning (6 h) · Preprocessing for bad images (5 h) · Field extraction and confidence (5 h) · Evaluation and write-up (4 h)

**Deliverables.** repo with README and demo; accuracy/latency table

**Done when.** Total-amount match >= 92%, latency <= 1.5 s on 4 cores, bundle <= 120 MB.

**Measure.** Field accuracy, latency, size, accuracy on degraded subset

**Pitfalls.** Tuning on the test set; Currency and comma/decimal ambiguity; Ignoring rotated receipts

**Stretch.** Add line-item extraction; Compare int8 vs fp16 per field

### Reproducibility audit of a vendor's inference speed claims
`mx-inf-vendor-claim-audit` · Y1-P1 · level 3 · 23 h · Python, llama.cpp and vLLM or similar, pandas, matplotlib

**Scenario.** Cedar Systems is choosing between two inference runtimes whose vendors claim '3x faster'. The engineering lead wants a harness that checks the claims under their own workload and reports honestly.

**Functional.** Define workloads (short chat, long prompt, batch) with fixed seeds; Run two or more engines under identical settings; Record hardware, driver, library versions automatically; Report latency percentiles, throughput, and variance over repeated runs; Highlight where claims hold and where they do not

**Non-functional.** Each benchmark repeated >= 5 times with CI <= 5% of the mean; Harness runs end-to-end in <= 90 minutes; Result bundle reproducible on a second machine within 10%

**Constraints.** One consumer GPU; Open models only

**Architecture.** A declarative workload spec drives engine adapters, and a results bundle captures environment fingerprints and raw timings. Components: workload spec, engine adapters, env fingerprint, runner, stats/report generator

**Data.** Public open-weight models and synthetic prompts at stated length distributions

**Milestones.** Workload spec and fingerprinting (5 h) · Engine adapters (6 h) · Repeated runs and stats (5 h) · Report (4 h) · Reproduction on second setup (3 h)

**Deliverables.** repo with README; benchmark report with caveats; raw data bundle

**Done when.** Five-repeat runs have CI <= 5%, report states which vendor claims hold, and a reproduction run lands within 10%.

**Measure.** Throughput, p50/p99 latency, run-to-run CV, speed-up ratios with intervals

**Pitfalls.** Comparing different quantization levels; Warm vs cold cache mismatch; Reporting best run only

**Stretch.** Add an energy-per-token column; Publish a rubric for fair engine comparisons

### Serve a speech-to-text model for a 300-seat call centre
`mx-inf-callcentre-asr-serving` · Y2 · level 3 · 30 h · Python, faster-whisper or CTranslate2, FastAPI, WebSockets, Prometheus

**Scenario.** Brightline Contact, a 300-seat outsourced call centre, wants live transcripts of calls to feed agent-assist. They cannot send audio off-site, so a single on-prem server must run streaming ASR for every concurrent call.

**Functional.** Stream 8 kHz telephony audio into a Whisper-class or similar ASR model with chunked decoding; Support partial and final transcripts over WebSocket; Implement voice-activity detection to skip silence; Track per-call word error rate on a held-out set; Expose Prometheus metrics for concurrent streams and lag

**Non-functional.** Support 300 concurrent streams on one 24 GB GPU; Partial transcript lag p95 <= 1.5 s from speech; WER within 1.5 points absolute of the offline model

**Constraints.** On-prem, one 24 GB GPU plus 16 CPU cores; No audio persisted to disk

**Architecture.** A gateway multiplexes audio frames into a micro-batching decoder; VAD trims silence before frames reach the GPU. Components: WebSocket gateway, VAD stage, chunk scheduler, batched decoder, transcript merger, metrics exporter

**Data.** Public LibriSpeech and a telephony-degraded version made by resampling to 8 kHz with codec noise; synthetic call-arrival generator

**Milestones.** Offline ASR baseline and WER harness (5 h) · Streaming chunking and merge logic (7 h) · Batching scheduler across streams (8 h) · Load test to 300 streams and tune (6 h) · Runbook and write-up (4 h)

**Deliverables.** repo with README; load-test report; runbook; demo of 20 simulated calls

**Done when.** Load test sustains 300 streams for 30 min with partial lag p95 <= 1.5 s and WER delta <= 1.5 points versus offline.

**Measure.** Concurrent streams per GPU, real-time factor, lag p50/p95, WER, GPU memory

**Pitfalls.** Chunk boundaries cutting words in half; Ignoring that telephony audio is 8 kHz narrowband; Benchmarking with all streams starting in sync

**Stretch.** Add speaker diarisation for two-channel audio; Compare int8 versus fp16 decoding

### Batch pipeline to embed 50 million product descriptions
`mx-inf-embed-50m-batch` · Y2 · level 3 · 28 h · Python, sentence-transformers or ONNX Runtime, PyArrow, Docker

**Scenario.** Marketly, an e-commerce aggregator, must embed 50M product descriptions before a catalogue relaunch in one week. Each day of rented GPU time costs money, so throughput per dollar and crash-safe resumption matter.

**Functional.** Shard input into resumable work units with checkpoints; Sort by length and pack batches to minimise padding; Run a small embedding model with fp16 and optional ONNX/TensorRT path; Write vectors to columnar files with integrity checks; Provide a cost and ETA estimator

**Non-functional.** Sustain >= 4,000 texts/s on one GPU; Resume after kill with < 1% recomputation; Cost per 1M embeddings reported and <= $0.40

**Constraints.** Single rented GPU, spot-priced; Memory for host process <= 32 GB

**Architecture.** A coordinator hands out length-sorted shards to GPU workers, which write checksummed parquet outputs and record progress in a manifest. Components: shard planner, length-bucketed batcher, GPU worker, parquet writer, manifest/resume, cost estimator

**Data.** Synthetic descriptions sampled from a public Amazon-reviews-style corpus lengths and a text generator to reach 50M rows

**Milestones.** Synthetic corpus generator and baseline (5 h) · Length bucketing and batching (6 h) · Resumable sharding and fault injection (7 h) · ONNX/fp16 optimisation (6 h) · Cost report and write-up (4 h)

**Deliverables.** repo with README; throughput benchmark; cost estimator; runbook

**Done when.** Throughput >= 4,000 texts/s, a kill-and-resume test recomputes <1%, and projected 50M cost reported at <= $0.40 per 1M.

**Measure.** Texts/s, padding waste, GPU utilisation, $/1M, recompute fraction after failure

**Pitfalls.** Padding waste from unsorted lengths; CPU tokenization starving the GPU; Partial shard files treated as complete

**Stretch.** Multi-GPU workers with work stealing; Dedupe near-identical descriptions to save compute

### Prefix caching for a support bot with a 3,000-token system prompt
`mx-inf-prefix-cache-support-bot` · Y2 · level 3 · 25 h · Python, vLLM or SGLang, Grafana, pytest

**Scenario.** Nimbus Telecom's support bot prepends a 3,000-token policy prompt plus retrieved articles to every question, so prefill dominates cost and TTFT. They want to exploit shared prefixes safely.

**Functional.** Measure prefill cost share on a realistic request mix; Enable and tune automatic prefix caching in an engine; Reorder prompt segments to maximise cache hit rate; Build a cache hit/miss and eviction dashboard; Test correctness: outputs identical with and without caching

**Non-functional.** Prefill compute reduced >= 60% on the request mix; p95 TTFT reduced >= 45%; Cache-on output equals cache-off for 200 deterministic prompts

**Constraints.** One 24 GB GPU; 8B model

**Architecture.** Prompts are restructured as stable prefix then variable suffix; the engine's block cache keeps the prefix resident under an eviction policy. Components: prompt assembler, request generator, cache-enabled server, metrics dashboard, equivalence tester

**Data.** Synthetic support questions with retrieved snippets drawn from public product-manual text

**Milestones.** Request mix generator and baseline (5 h) · Enable caching and prompt reordering (6 h) · Eviction pressure experiments (6 h) · Equivalence tests and dashboard (5 h) · Write-up (3 h)

**Deliverables.** repo with README; before/after benchmark; dashboard JSON; ADR on prompt layout

**Done when.** Meets >=60% prefill reduction and >=45% p95 TTFT cut with all 200 equivalence tests passing.

**Measure.** Hit rate, prefill tokens saved, TTFT p50/p95, cache memory share

**Pitfalls.** Putting timestamps or user ids early in the prompt; Evicting the shared prefix under load; Testing with non-deterministic sampling

**Stretch.** Compare against KV-cache offload to CPU; Per-tenant prefix isolation

### KV-cache memory budget planner for mixed-context workloads
`mx-inf-kv-budget-planner` · Y2 · level 3 · 28 h · Python, transformers configs, vLLM, matplotlib

**Scenario.** Orchard Legal runs a contract-review model with contexts from 2k to 64k tokens and keeps hitting out-of-memory errors at random. They need a tool that predicts, before deploy, how many concurrent requests fit.

**Functional.** Compute KV-cache bytes per token for given architecture (GQA, MQA, dtype); Model weights, activations, and fragmentation overhead; Simulate admission against a context-length distribution; Validate predictions against a real engine run; Recommend max concurrency and context caps

**Non-functional.** Predicted max concurrency within 10% of measured on 3 model configs; Planner runs in < 2 s for any config; Handles at least 4 KV dtypes including fp8

**Constraints.** One 24 GB GPU for validation; Pure-Python planner, no GPU needed to run

**Architecture.** A planner library takes model config and workload distribution and returns safe concurrency, validated against measured OOM thresholds. Components: config parser, memory model, workload simulator, validation runner, CLI and report

**Data.** Model configs from public checkpoints; synthetic context-length distributions (lognormal mixes)

**Milestones.** Memory model derivation (6 h) · Workload admission simulator (6 h) · Measure real OOM thresholds (7 h) · Calibrate overhead terms (5 h) · CLI and write-up (4 h)

**Deliverables.** repo with README; planner CLI; validation table; short paper-style write-up

**Done when.** Predicted concurrency is within 10% of measured for three configs and planner returns in under 2 s.

**Measure.** Prediction error percent, bytes/token per config, fragmentation factor

**Pitfalls.** Forgetting paged-block rounding; Ignoring activation peaks during prefill; Calibrating on one config only

**Stretch.** Add sliding-window attention models; Web UI for capacity what-ifs

### Cut search-box latency by compiling the embedding model
`mx-inf-onnx-search-embedder` · Y2 · level 3 · 24 h · Python, ONNX Runtime, optimum, FastAPI, Locust

**Scenario.** Finder, a job-board site, embeds each user query in 85 ms on CPU PyTorch, which dominates its 150 ms search budget. They want sub-20 ms without hurting ranking quality.

**Functional.** Export the encoder to ONNX and optimise graph; Compare ONNX Runtime CPU, int8 dynamic quantization, and a GPU path; Implement a micro-batching server with a 3 ms collection window; Measure ranking quality (nDCG) versus the baseline; Deploy with a health check and load test

**Non-functional.** p99 embedding latency <= 20 ms at 200 qps on 4 CPU cores; nDCG@10 drop <= 0.5 points; Server cold start <= 3 s

**Constraints.** 4 vCPU, no GPU in prod; Container under 1.5 GB

**Architecture.** A lightweight server wraps an optimised ONNX model with a tiny batching window and a warm-up routine. Components: exporter, quantizer, micro-batcher, server, nDCG evaluator, load test

**Data.** Public MS MARCO passage subset and a small query set; synthetic query log for load

**Milestones.** Baseline and export (4 h) · Quantization and graph optimisations (6 h) · Micro-batching server (6 h) · Quality eval (4 h) · Load test and write-up (4 h)

**Deliverables.** repo with README; latency table; load test report; Dockerfile

**Done when.** At 200 qps p99 <= 20 ms on 4 cores, nDCG@10 within 0.5 points, cold start <= 3 s.

**Measure.** p50/p99 latency, qps per core, nDCG@10, memory

**Pitfalls.** Benchmarking with a single query size; Thread oversubscription; Quantization hurting tail rankings

**Stretch.** Distill to a smaller encoder; Cache frequent queries

### Transcribe 40,000 hours of archive audio on a budget
`mx-inf-whisper-archive-batch` · Y2 · level 3 · 26 h · Python, faster-whisper, ffmpeg, SQLite/Redis queue, Tantivy or SQLite FTS

**Scenario.** Civic Radio Archive wants 40,000 hours of broadcast audio transcribed and searchable within a $6,000 budget and three weeks. Throughput and failure handling decide whether this is feasible.

**Functional.** Segment audio with VAD and long-form chunking; Batch segments by duration for GPU decoding; Retry/skip policy for corrupt files with a dead-letter list; Measure and report real-time factor and cost per audio hour; Output timestamped transcripts into a search index

**Non-functional.** Real-time factor <= 1/150 on one GPU; Total projected cost <= $5,500 for 40,000 hours; Failure rate recorded and < 0.5% unprocessed

**Constraints.** Rented spot GPUs; Preemption must not lose > 5 minutes of work

**Architecture.** A queue-driven worker pool pulls audio chunks, decodes in length-sorted batches, and checkpoints results to object storage. Components: audio segmenter, work queue, GPU decoder, dead-letter handling, index loader, cost tracker

**Data.** Public LibriVox-style and Common Voice audio, looped and perturbed to simulate archive volume

**Milestones.** Segmenter and baseline RTF (5 h) · Batching and decoder tuning (7 h) · Queue with checkpoints and preemption test (7 h) · Index and search demo (4 h) · Cost projection and write-up (3 h)

**Deliverables.** repo with README; cost projection sheet; runbook; benchmark report

**Done when.** RTF <= 1/150, projected 40,000-hour cost <= $5,500, preemption test loses <= 5 min of work.

**Measure.** RTF, $/audio hour, failures, dead-letter rate, WER spot-check

**Pitfalls.** Hallucinated text over silence; Too-large batches OOM on long segments; Checkpointing per file rather than per chunk

**Stretch.** Language ID routing; Compare int8 and fp16 WER/cost

### Fix a tokenizer bottleneck starving the GPUs
`mx-inf-rust-tokenizer-throughput` · Y2 · level 3 · 29 h · Rust, PyO3, Python, maturin, py-spy

**Scenario.** Scribe AI's batch summarisation fleet shows GPUs at 55% utilisation; profiling points at a Python tokenizer on the host that saturates a core. A Rust implementation with batching could unlock the GPUs.

**Functional.** Reproduce the host-side bottleneck with a profiler; Implement a BPE tokenizer in Rust with Python bindings; Validate token-for-token equality with the reference on a large corpus; Parallelise across cores with batch APIs; Measure end-to-end GPU utilisation improvement

**Non-functional.** Tokenization >= 8x faster per core and >= 40 MB/s per core; 100% token-id equality on 1M documents; End-to-end GPU utilisation >= 85%

**Constraints.** Rust with PyO3 only; 8 CPU cores, one GPU

**Architecture.** A Rust core implements pre-tokenization and BPE merging with parallel batch encode, exposed to Python and compared against the reference. Components: pre-tokenizer, BPE merge engine, PyO3 bindings, equality tester, pipeline benchmark

**Data.** Public text corpora (e.g. a Wikipedia dump subset and code samples) plus adversarial Unicode cases

**Milestones.** Profile and reproduce (4 h) · Rust BPE core (9 h) · Bindings and equality testing (6 h) · Parallel batch and tuning (6 h) · End-to-end test and write-up (4 h)

**Deliverables.** repo with README; equality test report; benchmark plots; profile before/after

**Done when.** >= 8x faster per core, 1M-document equality passes, GPU utilisation >= 85% in end-to-end test.

**Measure.** MB/s per core, tokens/s, GPU utilisation, equality failures, memory

**Pitfalls.** Unicode normalization differences; Regex pre-tokenizer semantics; GIL holding during encode

**Stretch.** Streaming decode; Support a second tokenizer family

### Halve the cost of long-document summarization
`mx-inf-longdoc-summary-cost` · Y2 · level 3 · 25 h · Python, vLLM, PyMuPDF, pandas

**Scenario.** Brief.ly summarises 200-page PDFs for lawyers using a 32k-context model, and each document costs $0.85 in GPU time. They need to cut it by half without losing key clauses.

**Functional.** Implement baseline full-context summarization and a map-reduce chunked variant; Add a cheap extractive pre-filter to drop boilerplate; Use prefix caching and batching across chunks; Evaluate with a clause-recall checklist and a judge model; Produce a cost-quality Pareto chart

**Non-functional.** Cost per document <= $0.40; Clause recall >= 95% of baseline; Median end-to-end time <= 90 s for 200 pages

**Constraints.** One 24 GB GPU; 8B model, 32k context max

**Architecture.** A pipeline filters, chunks, and batches work, then merges partial summaries hierarchically; evaluation tracks cost and recall together. Components: PDF text extractor, boilerplate filter, chunk scheduler, map-reduce summarizer, evaluator

**Data.** Public legal documents (e.g. CUAD contracts) with annotated clauses as the recall checklist

**Milestones.** Baseline and cost accounting (5 h) · Chunking and pre-filter (6 h) · Batching and caching (5 h) · Evaluation on clause recall (6 h) · Pareto report (3 h)

**Deliverables.** repo with README; Pareto plot and report; cost model

**Done when.** Cost <= $0.40/doc, clause recall >= 95% of baseline, median time <= 90 s on 200 pages.

**Measure.** $/doc, tokens processed, clause recall, time, judge agreement

**Pitfalls.** Judge model biased to long summaries; Chunking across clause boundaries; Counting only GPU time

**Stretch.** Adaptive chunk size by section type; Add a smaller model for easy chunks

### Dynamic batching for a cross-encoder reranker
`mx-inf-reranker-dynamic-batching` · Y2 · level 3 · 25 h · Python, PyTorch/ONNX, FastAPI

**Scenario.** Searchlight's search API reranks the top 100 candidates per query with a cross-encoder; latency varies from 60 to 600 ms depending on batching. They want predictable p99.

**Functional.** Implement a server that batches pairs across concurrent queries; Length-bucket pairs and pad minimally; Support early exit reranking of top 30 when time budget runs low; Compare static versus dynamic batching; Verify score equality with unbatched reference

**Non-functional.** p99 latency <= 120 ms at 50 qps with 100 candidates each; nDCG@10 loss <= 0.3 when early exit triggers; Scores equal to reference within 1e-3

**Constraints.** One 16 GB GPU

**Architecture.** A batching queue groups pairs from many requests under a time window and returns per-request results with a deadline-aware cutoff. Components: request queue, length bucketer, GPU batch runner, deadline manager, equivalence tests

**Data.** Public MS MARCO passages and queries; BM25 candidate lists

**Milestones.** Baseline and reference (4 h) · Dynamic batching server (7 h) · Length bucketing (5 h) · Deadline-aware early exit (5 h) · Load test and write-up (4 h)

**Deliverables.** repo with README; latency/throughput plot; load-test script

**Done when.** At 50 qps with 100 candidates p99 <= 120 ms, nDCG@10 loss <= 0.3 on early exits, scores within 1e-3.

**Measure.** p50/p99 latency, throughput, padding waste, nDCG@10, early-exit rate

**Pitfalls.** Batch window too long hurting low-load latency; Mixing deadlines across requests; Unstable ordering of ties

**Stretch.** Distilled smaller reranker; Cascade with cheap first-stage

### Regression harness for quantized embedding models
`mx-inf-quant-embedding-regression` · Y2 · level 3 · 25 h · Python, sentence-transformers, FAISS, pandas

**Scenario.** Vecta, a vector-search vendor, wants to ship int8 embeddings for retrieval to cut memory 4x but keep recall. Customers' hidden queries mean they need a regression harness before shipping.

**Functional.** Quantize embedding models (weights and vectors) in several ways; Measure recall@k versus fp32 on multiple retrieval tasks; Detect per-domain regressions and rank hard queries; Compute memory and latency savings; Automate pass/fail gates

**Non-functional.** Recall@10 loss <= 1% on every domain slice; Index memory reduced >= 3.5x; Harness completes in <= 20 min for 5 datasets

**Constraints.** One GPU, public datasets only

**Architecture.** A harness embeds datasets with each variant, runs ANN search, and evaluates slices and hard queries with gates. Components: quantization variants, dataset loaders, ANN evaluator, slice analyser, gate reporter

**Data.** Public BEIR subsets (e.g. SciFact, FiQA, NFCorpus)

**Milestones.** Datasets and fp32 baseline (5 h) · Quantization variants (6 h) · Recall evaluation and slices (6 h) · Gates and hard-query report (5 h) · Write-up (3 h)

**Deliverables.** repo with README; regression report; CI gate config

**Done when.** Chosen variant has <=1% recall@10 loss on every slice, >=3.5x memory saving, full suite <=20 min.

**Measure.** Recall@k per slice, memory, QPS, rank correlation of scores

**Pitfalls.** Averaging hides slice regressions; Quantizing queries and docs differently; Index parameters changing between runs

**Stretch.** Product quantization comparison; Calibrate scales per dimension

### FP8 vs INT8 vs AWQ for a legal summarizer
`mx-inf-fp8-int8-awq-legal` · Y2 · level 3 · 28 h · Python, vLLM, llm-compressor or AutoAWQ, pandas

**Scenario.** Statute Labs wants the cheapest precision for its legal summarizer. Each method promises speed but the team has no apples-to-apples data on their documents.

**Functional.** Produce fp16, FP8, INT8 (W8A8), and AWQ int4 variants; Benchmark throughput and latency under identical batching; Evaluate summaries using fact-consistency checks; Measure long-context degradation at 8k, 16k, 32k; Pick a winner by cost per quality-adjusted token

**Non-functional.** Quality metrics for each variant with 95% CI; Report throughput at batch 1, 16, 64; Winner meets >= 98% of fp16 consistency score

**Constraints.** One GPU with FP8 support (rented)

**Architecture.** A matrix experiment runs each variant through speed and quality tests and ranks by cost-quality. Components: variant builders, speed benchmark, consistency evaluator, long-context test, ranking report

**Data.** Public legal text (e.g. BillSum) for summaries

**Milestones.** Build the four variants (6 h) · Speed benchmarks (6 h) · Quality evaluation (8 h) · Long-context sweep (4 h) · Ranking and report (4 h)

**Deliverables.** repo with README; results table; recommendation

**Done when.** Each variant has CI-backed quality numbers; chosen variant retains >= 98% fp16 consistency at the best $/1M tokens.

**Measure.** Throughput, ITL, consistency score, long-context decay, $/1M tokens

**Pitfalls.** Calibration data mismatch; Different max batch sizes per method; Single-seed conclusions

**Stretch.** Add KV-cache fp8; Mixed-precision per layer

### Capacity planning for LLM serving with queueing theory
`mx-inf-capacity-queueing-model` · Y2 · level 3 · 29 h · Python, numpy/scipy, SimPy, vLLM, Locust

**Scenario.** Ironwood Bank's platform team keeps over- or under-provisioning model servers. They want a model that predicts GPU count from traffic and SLO, validated with a load test.

**Functional.** Measure service-time distributions (prefill and decode) from a real server; Fit an M/G/c-style or simulation model with batching; Predict p99 latency versus arrival rate and GPU count; Validate predictions with load tests; Ship a capacity calculator

**Non-functional.** Predicted p99 within 20% of measured at 50%, 70%, 90% utilisation; Calculator returns an answer in < 1 s; Documents where the model breaks (saturation)

**Constraints.** One GPU, plus simulation

**Architecture.** Measured service times calibrate a queueing/simulation hybrid; load tests validate it across utilisation levels. Components: service-time profiler, queue model, simulator, load tester, capacity calculator

**Data.** Synthetic arrival processes; measured service times from public models

**Milestones.** Service-time measurements (6 h) · Analytic model (6 h) · Simulation with batching (7 h) · Load-test validation (6 h) · Calculator and write-up (4 h)

**Deliverables.** repo with README; validation plots; calculator

**Done when.** Predicted p99 within 20% of measured at 50/70/90% utilisation; calculator < 1 s.

**Measure.** Prediction error, utilisation vs p99 curve, saturation point

**Pitfalls.** Assuming Poisson arrivals when traffic is bursty; Ignoring batching's effect on service time; Validating only at low load

**Stretch.** Include multi-class traffic; Add autoscaling lag to the model

### Cut model cold-start from 90 s to 10 s
`mx-inf-model-cold-start` · Y2 · level 3 · 24 h · Python, safetensors, vLLM, Docker

**Scenario.** Zenith Docs uses scale-to-zero GPU workers; users wait 90 seconds on first request after idle. They want cold start under 15 seconds.

**Functional.** Instrument each phase of start-up: container, weights load, CUDA init, graph capture, warm-up; Test safetensors mmap, parallel loading, and local NVMe caches; Evaluate lazy weight loading and compile-cache reuse; Add readiness probes that reflect true warmth; Measure with 10 repeats

**Non-functional.** Median cold start <= 12 s for an 8B model; p95 <= 15 s over 10 repeats; Memory overhead from caches <= 5%

**Constraints.** One GPU host with NVMe

**Architecture.** A start-up profiler guides targeted fixes: fast weight loading, cached compilation artefacts, and parallelised initialisation. Components: start-up profiler, weight loader, compile cache, readiness probe, repeat runner

**Data.** Public 8B open-weight model

**Milestones.** Phase profiling (5 h) · Weights loading optimisation (6 h) · Compile/graph cache (6 h) · Readiness and repeats (4 h) · Write-up (3 h)

**Deliverables.** repo with README; phase waterfall charts; runbook

**Done when.** Median cold start <= 12 s, p95 <= 15 s across 10 repeats.

**Measure.** Seconds per phase, median/p95 start-up, disk read GB/s

**Pitfalls.** Page cache making repeat runs look fast; Readiness reporting before graph capture; Cached artefacts invalid after version upgrade

**Stretch.** Snapshot/restore of process state; Peer-to-peer weight loading across nodes

### Token-level observability and SLO dashboards for LLM serving
`mx-inf-llm-observability-slo` · Y2 · level 3 · 25 h · Python, Prometheus, Grafana, OpenTelemetry, vLLM

**Scenario.** Relay Support's platform has generic HTTP dashboards that miss what customers feel: slow first tokens and stalled streams. They need SLOs that match the user experience.

**Functional.** Instrument TTFT, ITL, stall detection, queue time, tokens/s per request; Define SLIs and SLOs with error budgets; Build burn-rate alerts; Create dashboards for engineers and managers; Demonstrate with injected incidents

**Non-functional.** Alert fires within 2 min of an injected 3x TTFT regression; Telemetry overhead <= 1% throughput; False alerts <= 1 per 24 h in a clean soak

**Constraints.** Local Prometheus/Grafana stack

**Architecture.** A thin instrumentation layer emits histograms and stall counters, and burn-rate alerts evaluate multi-window SLOs. Components: instrumentation middleware, metric definitions, SLO config, burn-rate alerts, dashboards

**Data.** Synthetic load with injected incidents

**Milestones.** Metrics design (4 h) · Instrumentation (6 h) · SLOs and alerts (6 h) · Dashboards (4 h) · Incident drills and write-up (5 h)

**Deliverables.** repo with README; dashboards JSON; alert rules; incident drill report

**Done when.** Injected regression alerts within 2 min, overhead <= 1%, <= 1 false alert in 24 h soak.

**Measure.** Detection time, overhead, alert precision, SLO attainment

**Pitfalls.** High-cardinality labels exploding metrics; Averaging hiding stalls; Alert thresholds not tied to budgets

**Stretch.** Per-tenant SLO views; Trace exemplars linking spikes to requests

### Quantize and validate a model for a regulated lender
`mx-inf-quantize-regulated-validate` · Y2 · level 4 · 31 h · Python, AutoAWQ or similar, transformers, scipy, DVC

**Scenario.** Harbor Credit, a regulated consumer lender, wants to move its loan-document extraction model from fp16 to 4-bit to halve hosting costs. Their compliance team requires documented evidence that the change does not alter decisions beyond a stated tolerance.

**Functional.** Quantize a 7B model with at least two methods (e.g. AWQ and GPTQ-style) and a calibration-set study; Build a validation suite: field-level accuracy, per-slice breakdown, output-diff rate versus fp16; Statistical test for non-inferiority with confidence intervals; Generate a signed, versioned validation report with environment hashes

**Non-functional.** Field extraction F1 drop <= 0.5 points with 95% CI upper bound <= 1.0; Memory <= 40% of fp16 and throughput >= 1.6x; Validation suite re-runs bit-identically in <= 25 min

**Constraints.** One 24 GB GPU; No real customer data; synthetic documents only

**Architecture.** A pipeline quantizes, runs the frozen eval, performs the non-inferiority analysis, and emits an auditable report bundle. Components: quantization runner, calibration set builder, eval harness, slice analyser, non-inferiority stats, report bundler

**Data.** Synthetic loan documents from a templating generator with injected noise; public FUNSD-style forms for layout variety

**Milestones.** Synthetic dataset and fp16 baseline (6 h) · Quantization variants and calibration study (8 h) · Eval harness and slice analysis (7 h) · Non-inferiority stats and report (6 h) · Reproducibility pass and write-up (4 h)

**Deliverables.** repo with README; validation report PDF/markdown; model card; 3 ADRs on method choice

**Done when.** Chosen 4-bit model meets F1 drop <= 0.5 with CI bound <= 1.0, uses <= 40% memory, and the suite reproduces identically.

**Measure.** F1 per field and slice, output-diff rate, memory, tokens/s, CI widths

**Pitfalls.** Calibrating on the test set; Too-small eval giving uselessly wide CIs; Nondeterministic kernels breaking reproducibility

**Stretch.** Add a drift monitor comparing production outputs to fp16 shadow; Try FP8 as a third candidate

### GPU kernel to remove a bottleneck found by profiling
`mx-inf-profile-driven-kernel-fix` · Y2 · level 4 · 28 h · Python, PyTorch, Triton or CUDA C++, Nsight tools

**Scenario.** Lumen Analytics runs a transformer-based ranker whose latency doubled after a model change, and the team does not know why. You profile it, identify the real bottleneck, and write a fused kernel that fixes it.

**Functional.** Profile the model with a GPU profiler and produce a ranked list of top kernels by time; Identify memory-bound versus launch-bound regions with roofline reasoning; Write a custom fused kernel in CUDA or Triton for the top offender; Integrate it as a PyTorch op with correctness tests; Report end-to-end gains

**Non-functional.** Fused op runs >= 2.5x faster than the unfused sequence at batch 32; End-to-end model latency p99 reduced >= 30%; Numerical error <= 1e-3 relative in fp16

**Constraints.** One consumer 24 GB GPU; No framework patching, only a custom op

**Architecture.** The profile drives a targeted fused kernel behind a PyTorch custom op with a fallback to the reference path. Components: profiling harness, reference implementation, fused kernel, PyTorch binding, correctness tests, benchmark script

**Data.** Synthetic ranker model with public-style transformer config and random inputs of production-like shapes

**Milestones.** Build model and profile, rank kernels (6 h) · Roofline analysis and design (4 h) · Kernel implementation v1 (8 h) · Optimise and correctness suite (6 h) · End-to-end integration and write-up (4 h)

**Deliverables.** repo with README; profiler traces and annotated report; unit tests; blog-style write-up

**Done when.** Fused op >= 2.5x faster, end-to-end p99 down >= 30%, all tests within 1e-3 tolerance.

**Measure.** Kernel time, achieved bandwidth percent of peak, occupancy, end-to-end latency, speedup

**Pitfalls.** Optimising a kernel that is not on the critical path; Benchmarking without warm-up or synchronization; Only testing aligned shapes

**Stretch.** Autotune over tile sizes; Add backward pass

### Fused RMSNorm and rotary kernel in Triton for decode latency
`mx-inf-triton-rmsnorm-rope` · Y2 · level 4 · 26 h · Python, PyTorch, Triton, Nsight Systems

**Scenario.** Vela Labs' 3B on-prem assistant has small-batch decode latency of 38 ms/token, and the profile shows dozens of tiny elementwise kernels around attention. Fusing them should cut launch and memory traffic.

**Functional.** Profile decode step and list elementwise kernel launches; Write fused RMSNorm+residual and fused rotary embedding kernels in Triton; Provide PyTorch reference and gradient-free tests across dtypes; Integrate into a model forward via monkey-patch or module swap; Benchmark at batch 1, 4, 16

**Non-functional.** Fused kernels >= 3x faster than eager reference at batch 1; Decode latency reduced >= 12% end-to-end; Max abs error <= 2e-3 in bf16 across 1,000 random shapes

**Constraints.** One 24 GB GPU; Triton only, no hand CUDA

**Architecture.** Fused Triton kernels replace sequences of elementwise ops; CUDA graphs are tried on top to remove remaining launch overhead. Components: reference ops, Triton kernels, module swap integration, fuzz tests, benchmark suite

**Data.** Random tensors in shapes of a public 3B architecture; text prompts for end-to-end timing

**Milestones.** Profile and baseline (4 h) · Fused RMSNorm kernel (6 h) · Fused rotary kernel (6 h) · Fuzz tests and integration (6 h) · Benchmarks and write-up (4 h)

**Deliverables.** repo with README; profile before/after; fuzz test suite; benchmark report

**Done when.** Kernels >= 3x faster at batch 1, end-to-end decode >= 12% faster, 1,000 fuzz cases pass at 2e-3.

**Measure.** Kernel us, GB/s, end-to-end ms/token, error distribution

**Pitfalls.** Non-contiguous strides in fuzz inputs; Autotune results not stable across runs; Fusing something the compiler already fused

**Stretch.** Fuse QKV projection epilogue; torch.compile comparison

### Diagnose and fix a long-context attention bottleneck
`mx-inf-nsight-attention-bottleneck` · Y2 · level 4 · 30 h · Python, CUDA C++ or Triton, PyTorch, Nsight Compute

**Scenario.** Meridian Archives runs long-document QA at 32k context; throughput collapses beyond 16k. You are given a naive attention implementation and must find why with a profiler, then ship a tiled fix.

**Functional.** Profile naive attention and quantify memory traffic of the score matrix; Implement a tiled, online-softmax kernel (Flash-style) for a single head layout; Verify numerics versus reference at lengths 1k-32k; Add causal masking and variable sequence lengths; Report where the new kernel is still not at roofline

**Non-functional.** At 32k context, >= 5x faster than naive and no OOM at 24 GB; Relative error <= 2e-3 versus fp32 reference; Within 60% of a vendor attention kernel's throughput

**Constraints.** One 24 GB GPU; Own kernel, library kernel only as comparison

**Architecture.** A tiled kernel keeps scores in on-chip memory and uses online softmax; profiling guides tile size choices. Components: naive baseline, profiling notes, tiled kernel, masking/varlen support, comparison benchmark

**Data.** Random Q,K,V tensors at realistic head dims; public long documents for end-to-end check

**Milestones.** Naive baseline and profile (5 h) · Online softmax derivation and kernel v1 (9 h) · Causal and varlen (6 h) · Tuning tile sizes (5 h) · Comparison and write-up (5 h)

**Deliverables.** repo with README; annotated profile screenshots; unit tests; technical write-up

**Done when.** At 32k tokens the kernel is >= 5x faster than naive, error <= 2e-3, and reaches >= 60% of library throughput.

**Measure.** Latency vs length, achieved TFLOPs, DRAM bytes, error

**Pitfalls.** Numerical overflow in softmax without max subtraction; Bank conflicts from naive shared layout; Benchmarking only power-of-two lengths

**Stretch.** Add GQA support; Backward pass

### Low-latency streaming text-to-speech for a voice agent
`mx-inf-streaming-tts-service` · Y2 · level 4 · 28 h · Python, PyTorch, an open TTS model, WebSockets

**Scenario.** Echo Concierge builds phone voice agents that must start speaking within 400 ms of the LLM's first sentence. Off-the-shelf TTS waits for full text and sounds laggy.

**Functional.** Serve an open TTS model with sentence-level and chunked streaming; Overlap LLM token streaming with TTS synthesis; Handle barge-in (cancel in-flight audio) within 100 ms; Measure real-time factor and time to first audio; Load-test concurrent calls

**Non-functional.** Time to first audio <= 350 ms p95 after first sentence; Real-time factor <= 0.2 at 40 concurrent streams on one GPU; Barge-in cancel latency <= 100 ms

**Constraints.** One 24 GB GPU; Open-weight TTS model

**Architecture.** A streaming orchestrator splits LLM output into prosodic chunks, synthesises with batching, and pushes audio frames over WebSocket with cancel support. Components: text chunker, TTS worker pool, audio frame streamer, cancel manager, load generator

**Data.** Synthetic conversation scripts; public LJSpeech text for quality sanity checks

**Milestones.** Baseline TTS and metrics (5 h) · Chunked streaming (7 h) · Pipeline with LLM stream (6 h) · Barge-in cancellation (5 h) · Load test and write-up (5 h)

**Deliverables.** repo with README and demo audio; latency report

**Done when.** TTFA p95 <= 350 ms, RTF <= 0.2 at 40 streams, barge-in <= 100 ms.

**Measure.** TTFA, RTF, cancel latency, underrun count, GPU memory

**Pitfalls.** Chunk boundaries creating prosody glitches; Audio buffer underruns under load; Cancelled jobs still holding GPU

**Stretch.** Voice cloning cache; Quality MOS proxy via ASR round trip

### Defect detection on a production line at 30 FPS
`mx-inf-factory-defect-vision` · Y2 · level 4 · 30 h · Python or C++, PyTorch, ONNX/TensorRT, OpenCV

**Scenario.** Steelwell Parts inspects 30 parts/second on a conveyor with a camera and wants an on-site GPU box running a defect classifier with deterministic latency and no dropped frames.

**Functional.** Train or fine-tune a small CNN/ViT defect model; Export to TensorRT/ONNX with fp16 and int8 variants; Build a capture-to-decision pipeline with a ring buffer; Handle dropped frame and over-temperature conditions; Log end-to-end latency per frame

**Non-functional.** Sustain 30 FPS with zero dropped frames over 1 hour; End-to-end latency p99.9 <= 60 ms; Defect recall >= 98% at false-reject rate <= 2%

**Constraints.** One 8 GB edge GPU; Offline operation

**Architecture.** A camera simulator pushes frames through preprocessing, an optimised model, and a decision stage with bounded queues. Components: frame simulator, preprocessor, optimised model runner, decision/reject logic, latency logger

**Data.** Public MVTec AD or NEU surface-defect dataset replayed as a video stream

**Milestones.** Model training and baseline (7 h) · Export and precision study (7 h) · Real-time pipeline with ring buffer (8 h) · One-hour soak test (4 h) · Write-up (4 h)

**Deliverables.** repo with README and demo; soak-test report; latency histograms

**Done when.** 1-hour soak at 30 FPS drops no frames, p99.9 <= 60 ms, recall >= 98% at false-reject <= 2%.

**Measure.** FPS, drops, latency percentiles, recall/false-reject, GPU temperature

**Pitfalls.** Preprocessing on CPU becoming the bottleneck; Int8 calibration on non-representative images; Unbounded queues masking overload

**Stretch.** Add multi-camera support; Active-learning loop for misses

### Measuring and reducing grammar-constrained decoding overhead
`mx-inf-grammar-decode-overhead` · Y2 · level 4 · 25 h · Python, an inference engine with logits processors, pytest

**Scenario.** Formly's agents need guaranteed-valid JSON, but constrained decoding slows their service 35% at batch 32. They want to know where the cost is and cut it.

**Functional.** Benchmark unconstrained vs constrained decoding across schemas; Profile CPU mask computation versus GPU time; Implement token-mask caching and precompiled grammars; Verify outputs always validate and match semantics; Report overhead by schema complexity

**Non-functional.** Overhead vs unconstrained <= 10% at batch 32; 100% schema-valid across 5,000 generations; Grammar compile time <= 200 ms for typical schemas

**Constraints.** One 24 GB GPU; Existing engine plus custom mask code

**Architecture.** A mask provider precompiles the schema into an automaton and caches per-state token masks off the critical path. Components: schema suite, automaton compiler, mask cache, engine hook, benchmark harness

**Data.** Synthetic JSON schemas of varying depth; public function-calling style prompts

**Milestones.** Schema suite and baseline (5 h) · Profile overhead (4 h) · Automaton and mask cache (9 h) · Validity tests (4 h) · Report (3 h)

**Deliverables.** repo with README; overhead breakdown; test suite

**Done when.** Overhead <= 10% at batch 32, 5,000/5,000 outputs valid, compile <= 200 ms.

**Measure.** Overhead %, mask time per token, cache hit rate, validity rate

**Pitfalls.** Mask computation on the critical CPU thread; Tokenizer tokens spanning multiple grammar symbols; Cache growing unboundedly

**Stretch.** Async mask prefetch overlapped with GPU step; Regex-constrained fields

### Hunt GPU memory fragmentation in a long-running service
`mx-inf-gpu-memory-fragmentation` · Y2 · level 4 · 28 h · Python, PyTorch, CUDA allocator tooling

**Scenario.** Prism Vision's model server has to be restarted every 36 hours because of out-of-memory errors despite a stable working set. You reproduce the leak-like behaviour and fix it.

**Functional.** Build a workload that reproduces fragmentation with variable shapes; Instrument allocator stats and memory snapshots; Test mitigations: shape bucketing, pre-allocation pools, allocator config; Implement a simple paged buffer pool for activations; Run a 24-hour soak

**Non-functional.** No OOM across a 24-hour soak at 30 req/s with variable shapes; Reserved memory overhead <= 20% above live; Throughput loss <= 3%

**Constraints.** One 16 GB GPU

**Architecture.** Shapes are bucketed and activation buffers drawn from a pool; snapshots verify fragmentation stays bounded. Components: workload generator, allocator instrumentation, shape bucketer, buffer pool, soak-test runner

**Data.** Synthetic request shapes sampled from realistic distributions

**Milestones.** Reproduce failure (6 h) · Instrument and analyse snapshots (5 h) · Mitigations implemented (9 h) · 24-hour soak (5 h) · Write-up (3 h)

**Deliverables.** repo with README; snapshot analyses; soak-test report

**Done when.** 24-hour soak with no OOM, reserved <= 120% of live, throughput loss <= 3%.

**Measure.** Reserved vs allocated memory, fragmentation ratio, OOM count, throughput

**Pitfalls.** Mistaking caching allocator reserve for a leak; Fix that only works for the synthetic shape mix; Soak too short to trigger failure

**Stretch.** Compare expandable segments setting; Auto-trigger compaction

### Hunt the p99 spikes in an LLM serving stack
`mx-inf-p99-tail-latency-hunt` · Y2 · level 4 · 30 h · Python, OpenTelemetry, perf/eBPF tools, vLLM

**Scenario.** Quorum Chat's median TTFT is 300 ms but p99 jumps to 4 s every few minutes. Nothing in GPU metrics explains it, so you must find the cause across the whole host.

**Functional.** Build a harness that records per-request timing across gateway, queue, tokenizer, GPU step; Correlate spikes with CPU contention, GC pauses, scheduler stalls, and swap events; Inject controlled faults (noisy neighbour, long prompt, GC) to validate attribution; Implement fixes (CPU pinning, process priority, tokenizer offload); Show before/after tail

**Non-functional.** p99 TTFT reduced from >= 4 s spikes to <= 1.0 s under the same load; Attribution tool names the cause for >= 4 of 5 injected faults; Tracing overhead <= 2%

**Constraints.** One GPU host with 16 cores

**Architecture.** Request-scoped spans are collected at every stage; a correlation tool matches slow requests with host events. Components: span instrumentation, host event collector, fault injector, correlation analyser, fix experiments

**Data.** Synthetic traffic with bursts and a long-prompt tail; injected faults

**Milestones.** Instrumentation and baseline (7 h) · Fault injection and attribution (8 h) · Fixes and re-measure (8 h) · Overhead check (3 h) · Write-up (4 h)

**Deliverables.** repo with README; attributed tail analysis; before/after plots; runbook of known causes

**Done when.** p99 TTFT <= 1.0 s after fixes, 4 of 5 injected faults correctly attributed, tracing overhead <= 2%.

**Measure.** p50/p99/p99.9, attribution accuracy, overhead, spike frequency

**Pitfalls.** Sampling hiding rare spikes; Coordinated omission in the load generator; Fixing a symptom

**Stretch.** Always-on low-overhead eBPF probes; Automatic anomaly explanation

### Remove launch overhead from small-batch decoding with CUDA graphs
`mx-inf-cuda-graphs-small-batch` · Y2 · level 4 · 27 h · Python, PyTorch, Nsight Systems

**Scenario.** Nanoworks' on-prem 3B assistant runs batch 1-4 and the GPU is idle half the time between kernel launches. CUDA graphs and torch.compile could close the gaps.

**Functional.** Capture decode steps with CUDA graphs for fixed batch buckets; Handle dynamic shapes via padded buckets and replay; Compare torch.compile modes and manual graphs; Verify exact output equality; Measure GPU idle gaps before and after

**Non-functional.** Decode latency per token reduced >= 35% at batch 1; GPU idle gaps reduced from > 40% to < 10%; Outputs bit-identical on 200 greedy prompts

**Constraints.** One 24 GB GPU

**Architecture.** Static-shape decode steps are captured per bucket and replayed, with a fallback path for odd shapes. Components: profile baseline, graph capture manager, bucket selector, equality tests, benchmark

**Data.** Public 3B model; synthetic prompts

**Milestones.** Profile and baseline (4 h) · Graph capture (8 h) · Bucketing and KV handling (7 h) · Equality tests (4 h) · Benchmarks and write-up (4 h)

**Deliverables.** repo with README; timeline screenshots; benchmark report

**Done when.** Per-token latency down >= 35% at batch 1, idle gaps < 10%, 200/200 identical.

**Measure.** ms/token, GPU busy percent, memory overhead of graphs, capture time

**Pitfalls.** Memory growth from many graph buckets; Hidden CPU syncs breaking capture; Stale pointers in replayed graphs

**Stretch.** Auto-tune bucket set from traffic; Graphs for prefill chunks

### GPU usage metering and chargeback per tenant
`mx-inf-tenant-gpu-chargeback` · Y3 · level 3 · 27 h · Python, SQLite/DuckDB, Prometheus, pandas

**Scenario.** Lattice Cloud sells LLM access to 60 internal business units and wants to bill them fairly for shared GPU time, including idle capacity and cache benefits.

**Functional.** Meter tokens, GPU-seconds, and KV-cache occupancy per request and tenant; Allocate shared batch time using a defined fairness rule; Allocate idle and reserved capacity cost; Produce monthly statements and anomaly alerts; Reconcile metered total to fleet cost within 2%

**Non-functional.** Allocated cost sums to actual fleet cost within 2%; Metering overhead <= 1% throughput; Statement generation for 60 tenants and 30 days <= 60 s

**Constraints.** Simulated fleet logs allowed

**Architecture.** Instrumentation emits per-request usage events to a ledger; an allocation engine apportions GPU cost with documented rules. Components: usage event emitter, ledger store, allocation engine, statement generator, anomaly detector

**Data.** Synthetic multi-tenant request logs from a load generator on a real engine

**Milestones.** Metering design and events (5 h) · Ledger and allocation rules (8 h) · Idle/reserved allocation (5 h) · Statements and anomalies (5 h) · Reconciliation and write-up (4 h)

**Deliverables.** repo with README; allocation rules document; sample statements

**Done when.** Reconciliation within 2%, metering overhead <= 1%, 30-day statements in <= 60 s.

**Measure.** Reconciliation error, overhead, cost/token per tenant, fairness (Gini)

**Pitfalls.** Charging by tokens ignores prefill vs decode cost; Double-counting shared prefix; Idle cost allocated to one tenant

**Stretch.** Showback dashboards; Incentive-aware pricing for off-peak

### Power capping a GPU fleet: energy per token versus latency
`mx-inf-gpu-power-capping` · Y3 · level 3 · 25 h · Python, NVML, vLLM, pandas

**Scenario.** Greenfield Compute's colo contract caps rack power; they want to know how much throughput they lose when lowering GPU power limits and whether clocks tuning wins more.

**Functional.** Sweep power limits and clocks while measuring tokens/s and watts; Model energy per token for prefill-heavy and decode-heavy loads; Find the Pareto frontier of throughput vs energy; Evaluate p99 latency impact under SLO traffic; Recommend rack-level settings

**Non-functional.** Energy per token reduced >= 20% at <= 10% throughput loss; Power measured at >= 1 Hz with logging; Recommendation validated with a 30-min SLO run

**Constraints.** One rented GPU with power control (or recorded telemetry)

**Architecture.** A controller sweeps power/clock settings under fixed workloads and logs telemetry for Pareto analysis. Components: telemetry logger, sweep controller, workload runner, energy model, Pareto analysis

**Data.** Synthetic prefill-heavy and decode-heavy workloads

**Milestones.** Telemetry and workloads (5 h) · Sweep experiments (8 h) · Energy model (5 h) · SLO validation (4 h) · Recommendations (3 h)

**Deliverables.** repo with README; Pareto plots; rack-level recommendation

**Done when.** Setting found with >= 20% lower energy/token at <= 10% throughput loss, validated in a 30-min SLO run.

**Measure.** Watts, tokens/s, J/token, p99 latency, temperature

**Pitfalls.** Thermal state confounding sweeps; Measuring idle power as workload power; Applying decode results to prefill loads

**Stretch.** Dynamic capping by queue depth; Carbon-aware scheduling

### Unit-economics model for an AI feature with a working prototype
`mx-inf-llm-unit-economics` · Y3 · level 3 · 29 h · Python, FastAPI, pandas, Streamlit/Marimo, a local model server

**Scenario.** Lumina Notes wants to launch an AI summary feature at $8/month but doesn't know whether heavy users will make it unprofitable. The CFO needs a model grounded in measured inference costs.

**Functional.** Prototype the feature with a real model and measure tokens per action; Model usage distributions per user cohort (heavy tail); Compute gross margin by cohort and plan, including caching and routing; Explore levers: smaller model routing, caps, caching; Deliver interactive calculator and memo

**Non-functional.** Model reproduces measured prototype cost within 10%; Gross margin >= 70% for the median user and >= 40% for the p95 user under chosen levers; Sensitivity covers price, usage, and $/token

**Constraints.** Use one GPU or API-style cost proxy

**Architecture.** Prototype telemetry feeds a cohort-based margin model; levers are simulated against synthetic user distributions. Components: feature prototype, telemetry, usage distribution generator, margin model, calculator

**Data.** Synthetic user populations with Pareto-distributed usage

**Milestones.** Prototype and measurement (8 h) · Usage distributions (5 h) · Margin model (7 h) · Lever simulations (5 h) · Calculator and memo (4 h)

**Deliverables.** repo with README; calculator; pricing memo

**Done when.** Model within 10% of measured cost; chosen plan reaches 70% margin at median and 40% at p95.

**Measure.** Cost/action, margin by cohort, tail contribution to cost, lever impact

**Pitfalls.** Ignoring heavy-tail users; Using list prices rather than measured utilisation; Not including retries and failures

**Stretch.** Monte Carlo on price elasticity; Usage-based tier recommendation

### Cut a startup's LLM serving bill by 40% under a p99 SLO
`mx-inf-serving-cost-cut-40` · Y3 · level 4 · 34 h · Python, vLLM or SGLang, Prometheus, pandas, Docker

**Scenario.** Pagewise, a 25-person document-automation startup, spends $38,000/month on GPUs serving a 8B chat model behind its product, and the CFO wants the bill down 40% without breaking the p99 time-to-first-token promise in customer contracts. You are the contractor who must find where the money goes and prove the savings with a replayed production-shaped trace.

**Functional.** Build a trace replayer that reproduces a synthetic day of traffic (diurnal, bursty, mixed prompt lengths); Instrument the existing vLLM-style deployment for GPU utilisation, queue time, and tokens/s per dollar; Apply and A/B at least four levers: continuous-batching limits, prefix caching, quantization, instance right-sizing; Produce a cost model that maps each lever to dollars saved and SLO risk

**Non-functional.** p99 time-to-first-token <= 1.2 s and p99 inter-token latency <= 80 ms at peak 45 req/s; Total GPU cost per 1M output tokens reduced by >= 40% versus baseline; Quality regression <= 1% on a 500-prompt held-out eval

**Constraints.** Hardware is rentable at on-demand cloud prices only; model must stay Llama-class 8B; Replay must run on one rented GPU for under $60 total

**Architecture.** A replay harness drives the candidate configurations while a metrics collector feeds a cost model that ranks levers by savings per SLO risk. Components: trace generator, replay load driver, metrics collector, config sweep runner, cost model, quality eval gate, report generator

**Data.** Synthetic trace generator seeded from ShareGPT-like length distributions; public instruction dataset for quality eval

**Milestones.** Baseline deployment and trace generator (6 h) · Instrumentation and bottleneck analysis (6 h) · Lever experiments (4+) with sweeps (12 h) · Quality gate and cost model (6 h) · Write-up with ranked recommendations (4 h)

**Deliverables.** repo with README and one-command replay; cost model spreadsheet/notebook; benchmark report with before/after; 3 ADRs on rejected levers

**Done when.** Best configuration shows >=40% lower $/1M tokens than baseline while p99 TTFT <= 1.2 s at 45 req/s and eval drop <= 1%, reproducible from a clean checkout.

**Measure.** $/1M tokens, GPU utilisation, p50/p99 TTFT and ITL, goodput at SLO, eval delta per lever

**Pitfalls.** Optimising mean latency instead of p99; Comparing configs on different traffic traces; Counting savings that only exist at low load

**Stretch.** Add a queue-depth-driven autoscaling simulation; Bootstrap confidence intervals on every savings claim

### GPU buy-versus-rent procurement analysis with a prototype
`mx-inf-gpu-procurement-analysis` · Y3 · level 4 · 30 h · Python, pandas, vLLM, Streamlit or Marimo

**Scenario.** Kestrel Health, an 80-person health-tech company, spends $22,000/month renting GPUs for inference and is weighing buying four servers. The CTO needs a defensible recommendation backed by measured throughput, not vendor slides.

**Functional.** Benchmark candidate GPU classes on the company's model mix using a shared harness; Build a total-cost-of-ownership model (capex, power, hosting, staff, depreciation, utilisation); Model demand growth scenarios and break-even months; Produce a sensitivity analysis on utilisation and price; Deliver a decision memo plus a runnable calculator

**Non-functional.** Calculator reproduces benchmark-derived $/1M tokens within 5% of measured; Break-even computed across >= 3 demand scenarios; Sensitivity analysis covers >= 6 parameters

**Constraints.** Use rented instances to measure; no purchase needed; Memo <= 4 pages

**Architecture.** A benchmark harness feeds measured throughput into a parametric TCO model exposed as a notebook and small web calculator. Components: benchmark harness, throughput database, TCO model, scenario engine, sensitivity charts, decision memo

**Data.** Measured benchmarks on rented GPUs with public models; vendor list prices as stated assumptions

**Milestones.** Benchmark harness and measurements (9 h) · TCO model (7 h) · Scenarios and sensitivity (6 h) · Calculator UI (4 h) · Decision memo (4 h)

**Deliverables.** repo with README; benchmark data; TCO calculator; decision memo

**Done when.** Calculator matches measured $/1M tokens within 5%, shows break-even under three scenarios, and memo states a recommendation with risks.

**Measure.** Tokens/s per GPU, $/1M tokens, break-even months, utilisation threshold

**Pitfalls.** Assuming 100% utilisation; Omitting staff and power cost; Using peak instead of sustained throughput

**Stretch.** Add a reserved-instance and spot mix option; Monte Carlo over demand uncertainty

### Admission control and load shedding for an LLM gateway
`mx-inf-load-shedding-gateway` · Y3 · level 4 · 30 h · Go or Rust or Python asyncio, Prometheus

**Scenario.** Parley, a voice-assistant company, suffers a retry storm each time its model backend slows: queues grow, timeouts trigger retries, and p99 explodes to 40 s. They need a gateway that sheds load gracefully and protects premium tenants.

**Functional.** Implement queue-length and estimated-wait-based admission control; Priority classes with reserved capacity; Return fast 429s with Retry-After and jittered client backoff guidance; Reproduce a retry storm in a simulator and show the fix; Expose shed-rate and priority-class SLO metrics

**Non-functional.** Under 2x overload, premium p99 TTFT <= 2 s and total goodput >= 90% of capacity; Gateway overhead <= 2 ms p99; Recovery to normal latency <= 20 s after overload ends

**Constraints.** Mock backends allowed; Single process gateway

**Architecture.** A gateway estimates wait time from queue depth and tokens in flight, rejects low-priority work early, and keeps premium capacity reserved. Components: wait estimator, priority queues, admission controller, load generator with retries, metrics

**Data.** Synthetic arrival processes, simulated backend with service time from real benchmarks

**Milestones.** Backend simulator and retry-storm repro (7 h) · Admission control v1 (8 h) · Priority classes (6 h) · Overload experiments (6 h) · Write-up (3 h)

**Deliverables.** repo with README; overload experiment report; design doc

**Done when.** At 2x overload premium p99 TTFT <= 2 s, goodput >= 90% capacity, gateway overhead <= 2 ms, recovery <= 20 s.

**Measure.** Goodput, shed rate by class, p99 by class, recovery time, retry amplification factor

**Pitfalls.** Shedding after the work started; Retry-After synchronizing clients; Reserving capacity that sits idle

**Stretch.** Token-bucket per tenant; Adaptive concurrency limits (Vegas style)

### Shadow and canary rollout of a quantized model with quality gates
`mx-inf-canary-quantized-rollout` · Y3 · level 4 · 32 h · Python, FastAPI, vLLM, scipy, SQLite

**Scenario.** Quanta Retail wants to swap its product-description model for an int4 version to save 45% GPU cost, but past silent regressions burned them. They need an automated shadow, canary, and rollback pipeline with quality gates.

**Functional.** Shadow-mirror a traffic fraction to the candidate and store paired outputs; Compute automated quality metrics (reference-based and judge-based) on pairs; Implement canary percentage ramp with auto-rollback on gate failure; Add statistical gates with sequential testing; Record every decision in an audit log

**Non-functional.** Detect an injected 3% quality regression within 2,000 canary requests; False rollback rate <= 5% across 100 simulated clean rollouts; Shadow mirroring adds <= 3 ms to primary path

**Constraints.** Simulated traffic, one GPU for models; Judge model can be a small local model

**Architecture.** A router mirrors requests, scoring workers compare paired outputs, and a controller moves the canary percentage by gate verdicts. Components: traffic router, shadow store, paired scorer, sequential gate, rollout controller, audit log

**Data.** Synthetic product attributes to descriptions; injected regressions by degrading the candidate controllably

**Milestones.** Router and shadow mirror (7 h) · Scorers and paired metrics (7 h) · Sequential gating stats (8 h) · Canary controller and rollback (6 h) · Experiments and write-up (4 h)

**Deliverables.** repo with README; experiment report; design doc with ADRs; runbook

**Done when.** Injected 3% regression caught within 2,000 requests, clean-run false rollbacks <= 5%, mirror overhead <= 3 ms.

**Measure.** Detection delay, false rollback rate, gate power, mirror overhead, cost saved

**Pitfalls.** Peeking at p-values without sequential correction; Judge bias towards longer outputs; Mirroring side-effecting requests

**Stretch.** Per-segment gates; Automatic threshold calibration from history

### Pack 12 small models onto the fewest GPUs
`mx-inf-model-packing-12-models` · Y3 · level 4 · 31 h · Python, PyTorch, OR-Tools, nvidia-smi/NVML

**Scenario.** Dovetail Docs serves 12 specialised models (classifiers, extractors, embedders, a 7B generator) each on its own GPU at 10-25% utilisation. Finance wants consolidation without latency incidents.

**Functional.** Profile each model's memory, compute, and latency vs batch; Implement a bin-packing planner with memory and SLO constraints; Experiment with GPU sharing mechanisms (time slicing, MPS, MIG-like partitions); Measure interference between co-located models; Generate a deployment plan with headroom rules

**Non-functional.** Plan uses <= 5 GPUs instead of 12; Every model keeps p99 latency within 1.3x of isolated baseline; Memory headroom >= 15% on each GPU

**Constraints.** Test on one or two rented GPUs; Models from public checkpoints

**Architecture.** Profiles feed a constraint-aware packer; interference experiments calibrate a slowdown model that the planner checks. Components: model profiler, interference tester, bin-packing planner, slowdown model, plan validator

**Data.** 12 public models of mixed type; synthetic per-model traffic

**Milestones.** Profiling the 12 models (7 h) · Interference experiments (8 h) · Planner (7 h) · Validate plan under load (6 h) · Write-up (3 h)

**Deliverables.** repo with README; interference matrix; deployment plan; design doc

**Done when.** Plan fits in <= 5 GPUs with p99 <= 1.3x isolated for all models in a load validation, headroom >= 15%.

**Measure.** GPUs used, per-model p99 ratio, interference matrix, utilisation

**Pitfalls.** Averaging utilisation hides burst overlap; Memory fragmentation between co-tenants; Planner ignoring cold-start time

**Stretch.** Auto-repack when traffic shifts; Cost comparison with serverless GPU

### Preemption-tolerant batch inference on spot GPUs
`mx-inf-spot-batch-inference` · Y3 · level 4 · 30 h · Python, SQLite or Postgres, vLLM, Docker

**Scenario.** Datum Insights labels 30M documents monthly with an LLM and pays on-demand prices. Spot GPUs are 65% cheaper but get preempted without warning.

**Functional.** Design work units that are idempotent and checkpointed; Build a coordinator that leases units and reassigns on timeout; Simulate preemptions with a chaos tool; Optimise lease size versus checkpoint overhead; Report cost and completion-time distributions

**Non-functional.** Total cost <= 45% of on-demand for the same job; Zero lost or duplicated outputs after 50 simulated preemptions; Throughput overhead from checkpointing <= 5%

**Constraints.** Simulated spot environment on 1-2 GPUs

**Architecture.** A lease-based coordinator hands out units to workers; results are written atomically with deduplication keys. Components: coordinator, worker, atomic result store, chaos injector, cost simulator

**Data.** Synthetic documents with known labels; price traces modelled from published spot discounts

**Milestones.** Work unit design and baseline (5 h) · Coordinator and leases (8 h) · Chaos tests (7 h) · Lease-size optimisation (6 h) · Cost report (4 h)

**Deliverables.** repo with README; chaos test report; cost analysis

**Done when.** After 50 preemptions: no loss or duplication, overhead <= 5%, cost <= 45% of on-demand.

**Measure.** Cost ratio, wasted GPU-seconds, completion time P50/P95, duplicates

**Pitfalls.** Non-idempotent output writes; Leases too long losing work; Underestimating restart time

**Stretch.** Mix on-demand fallback near deadline; Bid strategy across instance types

### Tensor-parallel 70B versus one quantized GPU: a cost decision
`mx-inf-tp-70b-vs-quantized` · Y3 · level 4 · 30 h · Python, vLLM, lm-eval-style harness, pandas

**Scenario.** Sable Analytics needs a 70B-class model for a premium tier. Option A is 4 GPUs with tensor parallelism; option B is a 4-bit model on one big GPU. Engineering must decide on cost, latency, and quality.

**Functional.** Benchmark both configurations on identical workloads; Measure TP communication overhead by interconnect; Evaluate quality loss on a task suite; Compute $/1M tokens and capacity at SLO; Write a recommendation including failure-mode analysis

**Non-functional.** Report p99 ITL and throughput at 1, 8, 32 concurrent users for both; Quality delta measured on >= 3 tasks with CIs; Cost model predicts measured $/1M within 10%

**Constraints.** Rented GPUs, total experiment spend <= $150

**Architecture.** A shared benchmark harness drives both deployments; a cost and quality model produce a decision table. Components: deployment recipes, benchmark harness, quality suite, cost model, decision memo

**Data.** Public open-weight 70B-class model; public evals such as MMLU subsets and a summarisation set

**Milestones.** Deploy both options (7 h) · Throughput/latency benchmarks (8 h) · Quality evals (7 h) · Cost model and sensitivity (5 h) · Memo (3 h)

**Deliverables.** repo with README; benchmark data; decision memo; cost calculator

**Done when.** Memo recommends one option with measured p99 ITL, quality CIs, and cost within 10% of the model.

**Measure.** p99 ITL, tokens/s per $, quality per task, communication fraction

**Pitfalls.** Comparing at different batch sizes; Ignoring failure of one GPU in TP; Quality eval too small

**Stretch.** Add pipeline parallel variant; Include a distilled 30B alternative

### Simulator to compare batch scheduling policies
`mx-inf-batch-scheduler-simulator` · Y3 · level 4 · 32 h · Python, numpy, vLLM for calibration

**Scenario.** Helix AI's scheduler uses FCFS continuous batching; the team suspects shortest-job-first, length-aware, or fairness-weighted policies could cut p99 without throughput loss. Testing on production is risky.

**Functional.** Build a token-step simulator calibrated on measured step times; Implement FCFS, SJF-by-predicted-length, priority, and fair-share policies; Model length prediction error; Evaluate p99 latency, throughput, starvation; Validate simulator against a real engine under one policy

**Non-functional.** Simulated p99 within 15% of real engine under FCFS; Find policy lowering p99 by >= 20% without throughput loss > 3%; Starvation (wait > 30 s) < 0.1% of requests

**Constraints.** Simulator in Python; one GPU for calibration

**Architecture.** A step-level simulator models prefill, decode, and memory limits; policy plug-ins are compared across traces. Components: step-time calibrator, trace generator, simulator, policy plug-ins, analysis notebook

**Data.** Synthetic traces from lognormal lengths; public conversation length statistics

**Milestones.** Calibration (6 h) · Simulator core (9 h) · Policies and length predictor (8 h) · Validation (5 h) · Analysis and write-up (4 h)

**Deliverables.** repo with README; simulator; policy comparison report

**Done when.** Simulator within 15% on FCFS validation; best policy cuts p99 >= 20% with throughput loss <= 3% and starvation < 0.1%.

**Measure.** p50/p99 latency, throughput, starvation rate, predictor error sensitivity

**Pitfalls.** Ignoring memory preemption; Over-trusting perfect length prediction; Simulator never validated

**Stretch.** Learned length predictor; Preemption cost model

### Image-generation service with a hard per-image cost cap
`mx-inf-diffusion-cost-capped` · Y3 · level 4 · 30 h · Python, diffusers, PyTorch, torch.compile, FastAPI

**Scenario.** Canvasly lets marketers generate product images; each costs $0.04 and the pricing page promises $0.015. You must make a diffusion service cheap enough while maintaining quality.

**Functional.** Serve a diffusion model with batching and a queue; Explore step-count reduction, distilled samplers, fp16/bf16, and compilation; Measure image quality with automated metrics and a blind A/B protocol; Add a cost tracker per image; Autoscale workers to queue depth

**Non-functional.** Cost <= $0.015/image at 1,024x1,024; p95 latency <= 6 s at 5 img/s; Quality metric (CLIP score / FID) within 5% of baseline

**Constraints.** One 24 GB GPU

**Architecture.** A queue-driven server batches generation requests; a configuration sweep trades steps, precision, and compile settings for cost. Components: request queue, batch generator, config sweep, quality metrics, cost tracker

**Data.** Prompts from a public captions dataset (e.g. COCO captions); synthetic traffic

**Milestones.** Baseline and cost model (5 h) · Optimisation sweep (9 h) · Quality evaluation (7 h) · Service and autoscaling (6 h) · Write-up (3 h)

**Deliverables.** repo with README and sample gallery; cost/quality Pareto plot

**Done when.** Cost <= $0.015/image, p95 <= 6 s at 5 img/s, quality metric within 5% of baseline.

**Measure.** $/image, images/s, latency, CLIP score, FID, steps vs quality

**Pitfalls.** Judging quality by a single metric; Batch size OOM at high resolution; Cold-start of compiled graphs

**Stretch.** Cache by prompt embedding; LoRA style switching without reload

### Multi-LoRA serving for 200 tenant-specific adapters
`mx-inf-multilora-200-tenants` · Y3 · level 5 · 33 h · Python, vLLM or S-LoRA-style engine, PEFT, Triton (optional), Prometheus

**Scenario.** Quill Support hosts a helpdesk assistant where each of 200 customers has its own fine-tuned LoRA adapter on one shared 8B base. Running 200 separate model copies is impossible, so adapters must be hot-swapped with tail latency intact.

**Functional.** Serve one base model with dynamically loaded LoRA adapters per request; Implement an adapter cache with LRU eviction across GPU and CPU memory tiers; Batch requests with different adapters in the same step; Add per-tenant rate limits and isolation tests; Load-test with a Zipf-skewed tenant mix

**Non-functional.** p99 TTFT <= 1.5 s with adapter cache hit rate >= 90%; Adapter swap-in (cold) <= 150 ms for rank-16 adapters; Throughput within 25% of single-adapter serving

**Constraints.** One 48 GB GPU; Adapters 20-80 MB each

**Architecture.** A router tags requests with an adapter id; a tiered cache keeps hot adapters on GPU and batches heterogeneous requests via a grouped LoRA kernel path. Components: adapter registry, tiered cache, request router, grouped LoRA batching, tenant limiter, load generator

**Data.** 200 synthetic adapters made by training tiny LoRAs on public instruction subsets with different seeds; Zipf traffic generator

**Milestones.** Create 200 adapters and baseline (6 h) · Adapter cache and tiering (8 h) · Heterogeneous batching experiments (9 h) · Isolation and rate limiting (5 h) · Load test and write-up (5 h)

**Deliverables.** repo with README; benchmark report; design doc; runbook for adapter onboarding

**Done when.** With Zipf s=1.1 traffic over 200 adapters, cache hit >= 90%, p99 TTFT <= 1.5 s, throughput >= 75% of single-adapter baseline.

**Measure.** Hit rate, swap latency, p99 TTFT, tokens/s versus adapter count, GPU memory by tier

**Pitfalls.** Uniform traffic hiding cache problems; Adapters with different ranks fragmenting memory; One tenant's burst starving others

**Stretch.** Prefetch adapters from predicted tenant schedule; Hash tenants to shards for 2 GPUs

### Autoscaling an LLM inference fleet on queue signals
`mx-inf-autoscale-inference-fleet` · Y3 · level 5 · 35 h · Python, SimPy, Kubernetes (kind), Prometheus

**Scenario.** Traverse, a travel-planning app, sees 6x traffic swings between night and day, and its fixed 8-GPU fleet idles 60% of the time. GPU nodes take 3 minutes to become ready, so naive CPU-based autoscaling either lags or flaps.

**Functional.** Build a fleet simulator with realistic cold-start, warm pool, and traffic traces; Implement three autoscaling policies: utilisation-based, queue-depth-based, predictive; Add a scale-down drain that avoids cutting in-flight streams; Compare policies on SLO violations and GPU-hours; Port the best policy to a Kubernetes custom controller or script against a mock cluster

**Non-functional.** SLO violations (p99 TTFT > 2 s) below 0.5% of minutes; GPU-hours reduced >= 35% versus static peak provisioning; Scale-up decision to ready-for-traffic <= 4 min including warm pool

**Constraints.** Simulation plus a local kind cluster; No real GPUs required

**Architecture.** A discrete-event simulator evaluates policies, and the winner is implemented as a controller reading queue depth from metrics. Components: traffic trace generator, fleet simulator, policy plug-ins, drain manager, controller, comparison report

**Data.** Synthetic diurnal and event-spike traces plus public cluster-trace shapes; service times from a measured LLM benchmark

**Milestones.** Trace generator and simulator core (8 h) · Three policies and metrics (8 h) · Drain logic and warm pool (6 h) · Controller implementation on kind (8 h) · Comparison report (5 h)

**Deliverables.** repo with README; simulator + policy code; comparison report with plots; runbook

**Done when.** Best policy hits <0.5% violating minutes and cuts GPU-hours >= 35% across five seeded traces.

**Measure.** SLO-violation minutes, GPU-hours, scale events per day, flap count, cost

**Pitfalls.** Evaluating on a single trace; Ignoring cold-start in the simulator; Scale-down killing long generations

**Stretch.** Spot-instance mixing; Predictive policy using seasonal forecast

### Speculative decoding for an IDE code-completion service
`mx-inf-specdec-code-completion` · Y3 · level 5 · 31 h · Python, PyTorch, transformers or vLLM speculative support

**Scenario.** Forge Editor's inline completion feature must show suggestions within 250 ms of a pause, but a 7B code model produces 35 tokens/s on their GPUs. Speculative decoding could cut latency, but gains vary by language and context.

**Functional.** Implement draft-and-verify decoding with a small draft model on top of an existing engine or custom loop; Measure acceptance rate by language and completion length; Choose draft length adaptively per request; Preserve exact target-model output distribution (greedy equivalence test); Report throughput impact at batch sizes 1-16

**Non-functional.** Median completion latency (64 tokens) <= 250 ms at batch 1; Greedy outputs identical to non-speculative on 500 prompts; Speed-up >= 1.8x at batch 1 and no slowdown >5% at batch 16

**Constraints.** One 48 GB GPU; Target 7B, draft <= 0.5B

**Architecture.** A draft model proposes k tokens and the target verifies in one pass; an adaptive controller tunes k from recent acceptance. Components: draft runner, verifier, adaptive-k controller, equivalence tests, benchmark harness

**Data.** Public code corpora (permissively licensed) for prompts; synthetic completion contexts cut at random positions

**Milestones.** Baseline and prompt set (5 h) · Draft-verify loop (9 h) · Adaptive k and acceptance analysis (8 h) · Equivalence tests and batching study (6 h) · Write-up (3 h)

**Deliverables.** repo with README; acceptance-rate report; benchmark plots; ADR on draft model choice

**Done when.** Batch-1 speed-up >= 1.8x, 500/500 greedy outputs identical, batch-16 slowdown <= 5%.

**Measure.** Acceptance rate, tokens per verify step, latency p50/p95, speed-up vs batch size

**Pitfalls.** Draft and target tokenizers differing; Speed-up vanishing at high batch; Sampling mode breaking the distribution guarantee

**Stretch.** Self-speculative or n-gram draft variant; Tree-based verification

### Prototype disaggregated prefill and decode for a long-prompt workload
`mx-inf-disagg-prefill-decode` · Y3 · level 5 · 34 h · Python, SimPy, vLLM for calibration, matplotlib

**Scenario.** Atlas Docs runs 12k-token prompts with 200-token answers; long prefills stall other users' decoding and ruin inter-token latency. They want to know if separating prefill and decode workers fixes it and what the KV transfer costs.

**Functional.** Build a cluster simulator with colocated and disaggregated pools; Calibrate prefill and decode times from real single-GPU measurements; Model KV-cache transfer over different link speeds; Explore pool ratios and chunked-prefill as an alternative; Recommend a design with numbers

**Non-functional.** Simulator predicted latencies within 15% of a measured colocated run; Find a configuration with p99 ITL <= 60 ms at 8 req/s; Quantify break-even KV link bandwidth

**Constraints.** Simulation plus one GPU for calibration; Python only

**Architecture.** A calibrated discrete-event model compares colocated, chunked-prefill, and disaggregated policies under identical traces. Components: calibration benchmarks, trace generator, event simulator, KV transfer model, policy comparison

**Data.** Synthetic traces with lognormal prompt lengths from a public long-document dataset; measured kernel timings

**Milestones.** Calibration measurements (7 h) · Simulator core (9 h) · Transfer and policies (8 h) · Validation against real run (6 h) · Recommendation write-up (4 h)

**Deliverables.** repo with README; simulator; calibration data; recommendation memo

**Done when.** Simulator within 15% of measured colocated run and identifies a config with p99 ITL <= 60 ms at 8 req/s plus break-even bandwidth.

**Measure.** p99 ITL, TTFT, goodput, GPU utilisation per pool, transfer GB/s needed

**Pitfalls.** Calibrating on short prompts only; Ignoring interference between chunked prefill and decode; Assuming transfer overlaps perfectly

**Stretch.** Add heterogeneous GPU pools; Compare with prefix-cache-aware routing

### Fused dequantize-GEMV kernel for int4 decode
`mx-inf-int4-gemv-kernel` · Y3 · level 5 · 32 h · CUDA C++ or Triton, PyTorch, Nsight Compute

**Scenario.** Mosaic Devices' decode step is memory-bound on 4-bit weights, and an unfused dequantize-then-multiply path wastes bandwidth. A fused kernel should approach the bandwidth limit.

**Functional.** Implement group-wise int4 quantized weight layout; Write a fused dequant+GEMV kernel in CUDA or Triton; Verify numerics against fp16 reference; Tune for batch 1-8 and various matrix shapes; Compare with an existing library kernel

**Non-functional.** Achieve >= 75% of peak memory bandwidth on 4096x4096 and 4096x11008; Within 10% of a library kernel's speed; Max error <= 2e-2 relative to dequantized fp16 GEMV

**Constraints.** One 24 GB GPU

**Architecture.** Weights are packed to give coalesced loads; the kernel dequantizes in registers and accumulates in fp32. Components: packing format, fused kernel, reference path, shape sweep, comparison benchmark

**Data.** Random and real quantized weights from a public small LLM

**Milestones.** Packing format and reference (6 h) · Kernel v1 (9 h) · Optimisation using profiler (9 h) · Shape sweep and tests (5 h) · Write-up (3 h)

**Deliverables.** repo with README; profiler report; unit tests; benchmark plots

**Done when.** Kernel reaches >= 75% of peak bandwidth on both shapes, within 10% of library, error <= 2e-2.

**Measure.** GB/s, percent of peak, speedup vs unfused, error

**Pitfalls.** Dequantize arithmetic becoming compute-bound; Uncoalesced scale loads; Misaligned shapes untested

**Stretch.** Add batch 16 tensor-core path; Plug into a full model forward

### Multi-region inference with data residency and failover
`mx-inf-multiregion-residency-failover` · Y3 · level 5 · 32 h · Go or Python, Docker Compose, Envoy or custom proxy, Prometheus

**Scenario.** Aurora Pay serves EU and US customers, and EU prompts must never leave the EU. A regional GPU outage must not drop the service, and fallback may only be within the same residency zone.

**Functional.** Design a residency-aware router with policy rules; Implement health checks, failover, and graceful degradation (smaller model); Simulate regional outage with chaos tests; Audit logs proving no cross-zone data flows; Measure failover time

**Non-functional.** Failover within 20 s with <1% request errors; Zero cross-zone request leakage in 1M simulated requests; Router overhead <= 3 ms p99

**Constraints.** Simulated regions on local containers

**Architecture.** Requests carry a residency tag; the router restricts candidate pools and degrades to a smaller model if in-zone capacity falls. Components: residency policy engine, router, health checker, degradation controller, audit logger, chaos harness

**Data.** Synthetic tagged traffic; mock model backends with real service-time profiles

**Milestones.** Policy and routing (8 h) · Health and failover (8 h) · Degradation logic (6 h) · Chaos and audit tests (7 h) · Write-up (3 h)

**Deliverables.** repo with README; design doc; chaos report; audit log sample

**Done when.** Failover <= 20 s with < 1% errors, 0 leaks in 1M requests, router overhead <= 3 ms.

**Measure.** Failover time, error rate, leakage count, degraded-mode quality, overhead

**Pitfalls.** Retries crossing zones; Logs containing prompt text; Health checks flapping

**Stretch.** Active-active with per-zone capacity bursts; Formal policy checks with a rule linter

### Build and serve a 200M-vector index with GPU-assisted construction
`mx-inf-ann-200m-vectors` · Y3 · level 5 · 32 h · Python, FAISS, C++ optional, Docker

**Scenario.** Archivist Search needs semantic search over 200M passages with 25 ms p99 retrieval and 95% recall@10 versus brute force, on a budget of 3 servers.

**Functional.** Generate embeddings or synthetic vectors at scale; Build an IVF-PQ or graph index with GPU-assisted training; Shard the index and merge results; Tune nprobe/ef for recall vs latency; Run a load test with filters

**Non-functional.** Recall@10 >= 95% vs exact on a 10k-query sample; p99 retrieval <= 25 ms at 200 qps; Memory <= 64 GB per shard, 3 shards

**Constraints.** 3 CPU servers + one GPU for building

**Architecture.** A GPU-trained quantizer builds sharded compressed indexes, a coordinator merges shard results, and tuning explores recall-latency trade-offs. Components: vector generator, index builder, shard servers, coordinator/merger, tuning harness

**Data.** Synthetic vectors from clustered Gaussians at 768 dims, validated on a public embedded corpus at smaller scale

**Milestones.** Vector generation and exact baseline (6 h) · Index construction (9 h) · Sharding and merge (8 h) · Recall/latency tuning (6 h) · Load test and write-up (3 h)

**Deliverables.** repo with README; tuning curves; load-test report; design doc

**Done when.** Recall@10 >= 95%, p99 <= 25 ms at 200 qps, <= 64 GB per shard on 3 shards.

**Measure.** Recall, p99 latency, memory per shard, build time, QPS

**Pitfalls.** Synthetic data recall not transferring; Skewed shard sizes; Filters destroying recall

**Stretch.** Hybrid dense-sparse retrieval; Incremental index updates

### Serve a mixture-of-experts model on limited GPU memory
`mx-inf-moe-serving-memory` · Y3 · level 5 · 32 h · Python, PyTorch, an open MoE checkpoint, bitsandbytes/AWQ

**Scenario.** Calder Research wants a 47B-parameter MoE (13B active) on one 48 GB GPU for an internal assistant. It does not fit unquantized, so experts must be quantized and offloaded smartly.

**Functional.** Quantize experts and keep attention at higher precision; Profile expert routing frequency on a task mix; Implement hot-expert GPU cache with CPU offload for cold experts; Measure throughput vs cache size; Evaluate quality retention

**Non-functional.** Fits in <= 46 GB GPU memory with >= 15 tokens/s at batch 1; Quality retention >= 97% of fp16 on 3 tasks; Expert cache hit rate >= 85%

**Constraints.** One 48 GB GPU, 128 GB host RAM

**Architecture.** Routing statistics decide which experts stay in GPU memory; the rest stream from pinned host RAM with prefetch. Components: expert profiler, quantizer, expert cache, prefetcher, quality evaluator

**Data.** Public evals; prompts spanning code, chat, and summarisation

**Milestones.** Profile routing (6 h) · Quantization (6 h) · Expert cache and offload (10 h) · Prefetch tuning (5 h) · Evaluation and write-up (5 h)

**Deliverables.** repo with README; routing statistics report; benchmark report

**Done when.** Runs in <= 46 GB at >= 15 tokens/s, quality >= 97% fp16, hit rate >= 85%.

**Measure.** Tokens/s, hit rate, PCIe GB/s, memory, quality by task

**Pitfalls.** Routing skew differing by domain; PCIe becoming bottleneck; Prefetch accuracy low in long outputs

**Stretch.** Predict next-layer experts to prefetch; Dynamic cache resizing by task

## services

### Appointment booking API for a 12-clinic physiotherapy chain
`mx-svc-slot-booking-clinic` · Y1-P0 · level 2 · 20 h · Python, FastAPI, PostgreSQL, pytest

**Scenario.** Northside Physio runs 12 clinics where receptionists and a web form both book 45-minute slots, and double bookings happen about twice a week. They need one API that owns availability and makes a double booking impossible.

**Functional.** Define clinics, practitioners, weekly working hours and time-off blocks; Search free slots by clinic, service and date range; Create, reschedule and cancel bookings with a confirmation code; Reject overlapping bookings for the same practitioner at the database level; Return clear error codes for conflicts and out-of-hours requests

**Non-functional.** Slot search p99 under 150 ms with 200k existing bookings; Zero double bookings across 50 concurrent clients hammering one slot, repeated 100 times; Handle 100 booking writes/s on a single small VM

**Constraints.** PostgreSQL or SQLite only; Runs with one docker compose up

**Architecture.** A thin HTTP API over a relational schema where an exclusion constraint on time ranges is the source of truth for conflicts; application code only translates constraint errors into responses. Components: HTTP API, Availability calculator, Booking store with range constraint, Seed generator, Concurrency test harness

**Data.** Synthetic: generator for 12 clinics, 80 practitioners and 200k historical bookings with realistic weekday peaks

**Milestones.** Schema, working-hours model and seed generator (5 h) · Slot search endpoint with indexes and EXPLAIN review (4 h) · Booking create/reschedule/cancel with constraint-based conflict handling (5 h) · Concurrency test harness with 50 racing clients (4 h) · README, load numbers and ADR on constraint vs app-level locking (2 h)

**Deliverables.** repo with README; concurrency test report; ADR: where to enforce uniqueness

**Done when.** The race harness reports 0 double bookings in 100 rounds, slot search p99 is under 150 ms on the 200k-row dataset, and 100 writes/s is sustained for 5 minutes.

**Measure.** Search and write latency percentiles, conflict rate under contention, query plans before/after indexing

**Pitfalls.** Check-then-insert races that pass single-user tests; Time zones and DST shifts on recurring hours; Timestamps stored without zone

**Stretch.** Waitlist that auto-fills cancelled slots; iCal feed per practitioner

### Product search API for a 20,000-item bookshop
`mx-svc-product-search-service` · Y1-P0 · level 2 · 20 h · Python, SQLite FTS5 or Whoosh-like library, FastAPI

**Scenario.** Pageturn Books has a slow SQL LIKE search that misses typos. They need a search service with relevance ranking, typo tolerance and filters that stays fast on one small server.

**Functional.** Index books from a catalogue file with title, author, tags, price; Full-text search with BM25 ranking; Typo tolerance for queries within edit distance 2; Filters and facets for category and price range; Reindex without downtime

**Non-functional.** Query p99 under 40 ms on 20k items, 50 QPS; Top-5 relevance beats SQL LIKE baseline by 25 percent on a labelled query set; Full reindex under 10 s

**Constraints.** Use an embedded search library or SQLite FTS; 1 CPU, 1 GB RAM

**Architecture.** A search layer builds an inverted index at startup with an atomic swap on reindex; a typo-correction step uses a vocabulary and edit distance before scoring. Components: Indexer, Query parser, Ranker, Typo corrector, HTTP API, Evaluation script

**Data.** Open Library style metadata subset or a synthetic 20k catalogue; 200 hand-labelled queries

**Milestones.** Indexer and BM25 search (5 h) · Facets and filters (4 h) · Typo tolerance (4 h) · Atomic reindex swap (3 h) · Labelled evaluation vs baseline (4 h)

**Deliverables.** repo; evaluation table; README with example queries

**Done when.** Query p99 under 40 ms at 50 QPS, NDCG at 5 at least 25 percent above LIKE baseline, reindex in under 10 s with no failed queries.

**Measure.** Latency percentiles, NDCG@5 and MRR, reindex time

**Pitfalls.** Evaluating on queries used for tuning; Tokenisation differing between index and query; Reindex serving a half-built index

**Stretch.** Synonym lists; Popularity boost

### Feature flag service for a 15-person startup
`mx-svc-feature-flag-service` · Y1-P0 · level 2 · 20 h · Python or TypeScript, SQLite

**Scenario.** Tandemly ships daily and wants to turn features on per user, per plan and per percentage without redeploying. They need a small flag service with rules, rollout percentages and an audit trail.

**Functional.** Create boolean and multivariate flags with environments; Targeting rules by attributes (plan, country, user id); Deterministic percentage rollouts by user hash; Evaluation endpoint returning flag values for a context; Change history with who and when

**Non-functional.** Evaluation p99 under 10 ms at 1,000 req/s; Percentage rollouts within 1 percent of target on 100k users; Same user always gets same variant across restarts

**Constraints.** Single process with SQLite or PostgreSQL; No external flag product

**Architecture.** Flag definitions are stored in a database and cached in memory; evaluation hashes user id with flag key to bucket users deterministically. Components: Admin API, Rule evaluator, Bucketing hash, Config cache, Audit log

**Data.** Synthetic user population of 100k with attributes

**Milestones.** Flag and rule data model (4 h) · Evaluator with bucketing (5 h) · Admin API and audit log (4 h) · Cache and evaluation endpoint (3 h) · Distribution tests and README (4 h)

**Deliverables.** repo; distribution test report

**Done when.** Evaluation p99 under 10 ms at 1,000 req/s, rollout distributions within 1 percent of target, 100 percent of repeat evaluations stable.

**Measure.** Latency percentiles, rollout accuracy, rule evaluation counts

**Pitfalls.** Non-deterministic bucketing across languages; Rule order ambiguity; Flag changes not audited

**Stretch.** Scheduled rollouts; Kill switch with instant propagation

### Nightly ETL into a small warehouse for a 6-shop bakery chain
`mx-svc-etl-batch-warehouse` · Y1-P0 · level 2 · 20 h · Python, DuckDB

**Scenario.** Crumb & Co has POS exports from six shops as CSVs and wants a trustworthy daily sales dashboard. They need a nightly ETL into a star schema with validation and clear failure reporting.

**Functional.** Extract daily CSV exports with different column orders per shop; Validate and quarantine bad rows; Load dimension and fact tables with surrogate keys and slowly changing product prices; Idempotent re-run for any date; Summary report of loaded, rejected and late rows

**Non-functional.** Process 5M rows nightly in under 3 minutes; Re-running a day yields identical fact counts and totals; 100 percent of injected bad rows land in quarantine with reasons

**Constraints.** DuckDB or SQLite; Runs on a laptop with cron

**Architecture.** A staged pipeline extracts to raw tables, validates into clean tables, then upserts into the star schema inside a transaction per day. Components: Extractors, Validator, Staging, Star schema loader, Run log and report

**Data.** Synthetic POS data generator for 6 shops and 5M rows, with injected faults

**Milestones.** Star schema design (4 h) · Extractors and staging (4 h) · Validation and quarantine (4 h) · Idempotent loader (4 h) · Tests, report and README (4 h)

**Deliverables.** repo; data model diagram; sample report

**Done when.** 5M rows load under 3 minutes, a re-run is idempotent with matching totals, and all injected faults are quarantined with reasons.

**Measure.** Runtime, row counts per stage, rejection rate, reconciliation difference to source totals

**Pitfalls.** Non-idempotent inserts; Silent type coercion; Late-arriving files dropped

**Stretch.** Incremental loads by watermark; Data-quality dashboard

### Background job queue on PostgreSQL for a small invoicing app
`mx-svc-job-queue-postgres` · Y1-P0 · level 2 · 20 h · Python or Go, PostgreSQL

**Scenario.** Billfold sends invoice PDFs and reminders from request handlers, slowing pages and losing work on deploys. They want a durable job queue using their existing PostgreSQL.

**Functional.** Enqueue jobs with payload, run-at and max attempts; Workers claim jobs safely using SKIP LOCKED; Retries with exponential backoff and dead-letter state; Visibility timeout so crashed workers' jobs return; Basic dashboard query for queue depth and failures

**Non-functional.** Claim and complete 1,000 jobs/s with 8 workers; No job processed twice while its lease is valid in a 100k-job test; Crashed worker's job retried within 30 s

**Constraints.** PostgreSQL only; No message broker

**Architecture.** A jobs table is polled with SELECT FOR UPDATE SKIP LOCKED; leases are timestamped and extended by heartbeats. Components: Jobs table, Enqueue API, Worker loop, Lease reaper, Stats queries

**Data.** Synthetic jobs with random durations and failures

**Milestones.** Schema and enqueue (4 h) · Claim loop with SKIP LOCKED (5 h) · Retries, backoff, dead letters (4 h) · Lease and crash recovery (4 h) · Benchmarks and README (3 h)

**Deliverables.** repo; benchmark results

**Done when.** 1,000 jobs/s with 8 workers, no concurrent duplicate processing in 100k jobs, crashed-worker recovery within 30 s.

**Measure.** Throughput, claim latency, duplicate count, retry distribution

**Pitfalls.** Polling loops hammering the database; Long transactions holding locks; Missing index on run-at

**Stretch.** LISTEN/NOTIFY wakeups; Unique jobs by key

### Reliable webhook delivery service for a booking-widget vendor
`mx-svc-webhook-delivery` · Y1-P0 · level 2 · 22 h · Python or Go, PostgreSQL

**Scenario.** Slotly, a scheduling-widget vendor, lets customers subscribe to booking events, but deliveries fail silently when receivers are down. They need signed webhooks with retries and a delivery log.

**Functional.** Subscription management with secrets; HMAC-signed payloads with timestamp; Retries with backoff for 24 hours; Per-endpoint disable after sustained failure; Delivery log and manual replay

**Non-functional.** Deliver 500 events/s to 200 simulated endpoints; 99.9 percent eventual delivery to endpoints with 30 percent transient failure; Signature verification sample code works in 2 languages

**Constraints.** Single service; Receivers simulated

**Architecture.** Events fan out to per-endpoint delivery rows processed by workers with backoff; slow endpoints are isolated by per-endpoint concurrency limits. Components: Subscription API, Fan-out, Delivery workers, Signer, Delivery log, Receiver simulator

**Data.** Synthetic events and flaky receiver simulator

**Milestones.** Subscriptions and signing (4 h) · Fan-out and delivery workers (5 h) · Retries and auto-disable (5 h) · Log and replay (4 h) · Simulator tests and README (4 h)

**Deliverables.** repo; test report; verification samples

**Done when.** 500 events/s sustained, 99.9 percent eventual delivery under 30 percent transient failure, signature checks pass in both sample languages.

**Measure.** Delivery success over time, attempt counts, latency, isolation effect of slow endpoints

**Pitfalls.** Blocking all workers on one slow endpoint; Replay attacks without timestamps; Secret leakage in logs

**Stretch.** Mutual TLS option; Event filtering by type

### Idempotent payment-intent API for a small online course seller
`mx-svc-payment-idempotency-api` · Y1-P1 · level 3 · 24 h · Python or Go, PostgreSQL, docker compose

**Scenario.** BrightLoop sells courses and sees duplicate charges when mobile clients retry on flaky networks. They want a payment-intent API where any retry with the same idempotency key returns the original result and never charges twice.

**Functional.** Create payment intents with an Idempotency-Key header; Replay stored responses for repeated keys and reject key reuse with different payloads; Call a simulated payment provider with timeouts and unknown-outcome handling; Record every state transition of an intent; Expose a query endpoint for final status

**Non-functional.** Zero duplicate charges across 10,000 requests with 30 percent client retries and 10 percent injected timeouts; Overhead of idempotency layer under 5 ms p99; Keys retained 24 hours with bounded storage under 2 GB

**Constraints.** Provider is a local fake with fault injection; PostgreSQL only

**Architecture.** A request-fingerprint table with a unique key serialises concurrent duplicates; the provider call is wrapped in a state machine that resolves unknown outcomes by querying the provider. Components: API layer, Idempotency store, Intent state machine, Fake provider with faults, Chaos test runner

**Data.** Synthetic traffic generator with retry and timeout injection

**Milestones.** Intent schema and state machine (5 h) · Idempotency key table and concurrent-duplicate handling (6 h) · Fake provider with timeout, 5xx and late-success modes (4 h) · Chaos runner and invariants (6 h) · README and ADR on unknown-outcome resolution (3 h)

**Deliverables.** repo; chaos report; ADR

**Done when.** Chaos run of 10,000 requests shows 0 duplicate charges, 0 intents stuck in unknown state after resolver runs, and idempotency overhead p99 under 5 ms.

**Measure.** Duplicate-charge count, replay rate, resolver latency, overhead percentiles

**Pitfalls.** Treating timeout as failure and retrying with a new key; Race between two requests with the same key; Storing responses without payload fingerprint

**Stretch.** Per-merchant key namespaces; Webhook delivery of final status

### Stock reservation service for a 5,000-SKU online pharmacy
`mx-svc-inventory-reservation` · Y1-P1 · level 3 · 24 h · Python or Go, PostgreSQL

**Scenario.** MediCart oversells fast-moving items when many checkouts overlap. They want a reservation service that reserves stock at checkout, commits on payment and releases on abandonment.

**Functional.** Stock levels per SKU and per location; Reserve, commit and release operations with TTL; Idempotent operations keyed by cart id; Low-stock and negative-stock alerts; Audit trail of every stock movement

**Non-functional.** Zero oversell in a stress test of 500 concurrent carts on 20 hot SKUs; Reserve p99 under 30 ms; Sustain 1,000 reservations/s

**Constraints.** Single PostgreSQL instance; No caching of authoritative stock

**Architecture.** Stock is updated with conditional atomic statements; reservations are rows with expiry, and a movement ledger gives an audit trail that must reconcile with on-hand counts. Components: Stock table, Reservation manager, Expiry job, Movement ledger, Stress tester

**Data.** Synthetic: 5,000 SKUs with Zipf demand and cart abandonment of 60 percent

**Milestones.** Schema and atomic reserve/commit/release (6 h) · Idempotency by cart id (4 h) · Expiry job and movement ledger (5 h) · Stress tester and invariant check (6 h) · Write-up and ADR on pessimistic vs optimistic (3 h)

**Deliverables.** repo; stress report; ADR

**Done when.** The stress test shows 0 oversells, ledger sums equal on-hand for all SKUs, reserve p99 under 30 ms at 1,000 req/s.

**Measure.** Oversell count, latency percentiles, lock wait time, abandonment release delay

**Pitfalls.** Read-then-write decrement; Reservations never expiring after crash; Hot SKU row contention

**Stretch.** Sharded counters for hot SKUs; Backorder support

### Multi-channel notification service for a food-delivery startup
`mx-svc-notification-fanout` · Y1-P1 · level 3 · 24 h · Python or Go, Redis streams or PostgreSQL queue

**Scenario.** CrumbRun sends order updates by push, SMS and email from five services, each with its own code. They want one notification service with templates, channel fallback and delivery tracking.

**Functional.** Accept notification requests with template id, recipient and variables; Route to push, SMS or email by user preference with fallback on failure; Render localised templates with variable validation; Track states: queued, sent, delivered, failed; Deduplicate by event id

**Non-functional.** Sustain 2,000 notifications/s enqueue with p99 under 25 ms; Delivery attempt starts within 3 s p99 of enqueue; No duplicate sends in 10,000 requests with injected retries

**Constraints.** Providers are fakes with rate limits; One queue technology

**Architecture.** The API writes to a durable queue; per-channel workers pull, render and call a provider adapter with retry and backoff. A status table records every transition. Components: Intake API, Queue, Channel workers, Template renderer, Provider adapters, Status store

**Data.** Synthetic: event generator and fake providers with latency and failure profiles

**Milestones.** Intake API and durable queue (5 h) · Template engine with validation (4 h) · Channel workers and fallback (6 h) · Dedup and status tracking (5 h) · Load test and write-up (4 h)

**Deliverables.** repo; load report; ADR on queue choice

**Done when.** 2,000/s enqueue holds p99 under 25 ms, first attempt within 3 s p99, and 0 duplicate sends in the injected-retry run.

**Measure.** Enqueue latency, time-to-first-attempt, delivery success by channel, duplicate count

**Pitfalls.** At-least-once without dedup; One slow provider blocking all workers; Template variable injection

**Stretch.** Quiet hours; Digest batching

### Event ingestion collector for a mobile-game analytics team
`mx-svc-event-ingest-collector` · Y1-P1 · level 3 · 24 h · Go or Rust, Parquet

**Scenario.** Pixel Orchard's games emit 40M events a day and the current script drops events when the database stalls. They want a collector that batches, validates, buffers to disk and never loses acknowledged events.

**Functional.** HTTP endpoint accepting batched JSON events with schema validation; Durable on-disk buffer before acknowledgement; Dead-letter output for invalid events with reasons; Back-pressure signalling when buffers fill; Flush to columnar files partitioned by hour

**Non-functional.** Sustain 10,000 events/s on 2 cores; Zero acknowledged events lost across 20 kill -9 crashes; End-to-end flush delay under 60 s

**Constraints.** Single machine; Disk buffer under 5 GB

**Architecture.** The collector appends validated batches to a segmented write-ahead buffer before returning 202; a flusher compacts segments into Parquet partitions. Components: HTTP intake, Validator, Disk buffer, Flusher, Dead-letter store, Crash test

**Data.** Synthetic: event generator with 12 event types and 3 schema versions

**Milestones.** Intake and schema validation (5 h) · Segmented disk buffer (6 h) · Parquet flusher (5 h) · Back-pressure and dead letters (4 h) · Kill-9 crash tests and load test (4 h)

**Deliverables.** repo; crash-test report; load report

**Done when.** 10,000 events/s sustained with 2 cores, 20 forced crashes lose 0 acknowledged events, flush delay under 60 s.

**Measure.** Throughput, p99 intake latency, loss count, flush delay

**Pitfalls.** Acknowledging before fsync; Unbounded memory batching; Mixed schema versions in one file

**Stretch.** Exactly-once flush via manifest; Sampling mode under overload

### Session and token service for a B2B dashboard product
`mx-svc-session-token-service` · Y1-P1 · level 3 · 24 h · Go or Python, PostgreSQL, Redis

**Scenario.** Northwind Metrics has hand-rolled cookies and wants a proper auth session service: login, refresh tokens with rotation, revocation and device management.

**Functional.** Password login with Argon2 hashing and lockout; Short-lived access tokens and rotating refresh tokens; Refresh-token reuse detection that revokes the family; Per-device session list and remote logout; Token introspection endpoint

**Non-functional.** Login p99 under 300 ms with Argon2 tuned to 100 ms hash time; Introspection p99 under 5 ms at 2,000 req/s; Reuse of a stolen refresh token revokes the family in 100 percent of tests

**Constraints.** No third-party auth platform; Secrets via environment only

**Architecture.** Access tokens are signed JWTs; refresh tokens are opaque and stored hashed with family ids to detect reuse. A revocation list is cached for introspection. Components: Credential store, Token issuer, Refresh rotation, Revocation cache, Session API, Attack test suite

**Data.** Synthetic users; scripted attack scenarios

**Milestones.** Credential store and login (5 h) · Token issue and verify (5 h) · Refresh rotation and reuse detection (6 h) · Revocation and device sessions (4 h) · Attack tests and write-up (4 h)

**Deliverables.** repo; threat model; attack test report

**Done when.** All 12 scripted attack scenarios are blocked, introspection p99 under 5 ms at 2,000 req/s, login p99 under 300 ms.

**Measure.** Latency percentiles, attack scenario pass count, revocation propagation time

**Pitfalls.** Storing refresh tokens in plain text; Non-constant-time comparisons; Race on concurrent refresh

**Stretch.** WebAuthn passkeys; Risk-based step-up auth

### Resumable file upload service for a field-inspection photo app
`mx-svc-resumable-upload` · Y1-P1 · level 3 · 24 h · Go or Python, local S3-compatible store, tus-style protocol design

**Scenario.** Rigline inspectors upload 20 MB photos from patchy mobile networks and uploads restart from zero. They need chunked, resumable uploads with integrity checks and safe completion.

**Functional.** Create an upload session returning chunk size and id; Upload chunks in any order with per-chunk checksums; Resume by querying which chunks are received; Assemble and verify the final hash, then publish atomically; Expire abandoned sessions and clean temp storage

**Non-functional.** Sustain 200 concurrent uploads of 20 MB on one VM; Resume after interruption re-sends at most one chunk; Corruption injected in 1 percent of chunks is always detected

**Constraints.** Local disk or an S3-compatible local store; No file ever visible before verification

**Architecture.** Chunks land in a staging area keyed by session; a completion step verifies the whole-file hash and moves the object to final storage atomically. Components: Session API, Chunk receiver, Staging store, Assembler and verifier, Cleanup job, Flaky-network simulator

**Data.** Synthetic 20 MB images; network simulator with drops and resets

**Milestones.** Session and chunk protocol (5 h) · Chunk receiver with checksums (5 h) · Resume and assemble (5 h) · Cleanup and limits (4 h) · Flaky-network tests and write-up (5 h)

**Deliverables.** repo; protocol doc; test report

**Done when.** 200 concurrent uploads complete with 100 percent integrity, resume re-sends at most one chunk, all injected corruption is caught.

**Measure.** Throughput, resume overhead, corruption detection rate, temp-storage leakage

**Pitfalls.** Publishing partially assembled files; Chunk size memory buffering; Orphaned staging data

**Stretch.** Pre-signed direct-to-storage uploads; Deduplication by content hash

### Presence and typing-indicator service for a team messaging tool
`mx-svc-presence-typing-service` · Y1-P1 · level 3 · 22 h · Go or Node.js, Redis

**Scenario.** Ping Team shows who is online, but presence flickers and stale users linger after crashes. They want a presence service with heartbeats, timeouts and low-cost fan-out.

**Functional.** Heartbeat-based online/away/offline status per device; Aggregate presence per user across devices; Subscribe to presence of a contact list or channel; Typing indicators with automatic expiry; Throttle fan-out for large channels

**Non-functional.** Support 20,000 users with heartbeat every 20 s on 1 core; Offline detection within 45 s p99 after crash; Typing event delivery p99 under 100 ms

**Constraints.** Single node; Redis allowed for ephemeral state

**Architecture.** Presence is ephemeral state with TTLs; change events are published only on aggregate transitions and batched for big channels. Components: Heartbeat intake, Presence store with TTL, Aggregator, Subscription fan-out, Typing manager

**Data.** Synthetic client simulator with crashes and network flaps

**Milestones.** Heartbeat and TTL presence store (5 h) · Multi-device aggregation (5 h) · Subscriptions and fan-out throttle (5 h) · Typing indicators (3 h) · Simulation and write-up (4 h)

**Deliverables.** repo; simulation report

**Done when.** 20,000 simulated users on one core, offline detected within 45 s p99, typing p99 under 100 ms, no flicker events in a 10-minute flap test.

**Measure.** CPU per 1k users, detection delay, events per second fan-out, flicker count

**Pitfalls.** Flapping networks causing status storms; Fan-out to 10,000-member channels; Clock differences between nodes

**Stretch.** Last-seen with privacy settings; Mobile push suppression when active

### Distributed rate limiter for a public developer API
`mx-svc-rate-limiter-gateway` · Y1-P1 · level 3 · 22 h · Go or Python, Redis

**Scenario.** Datacard exposes a public API and a few customers hammer it. They need per-key limits with burst allowance, shared across 3 API nodes, returning standard retry headers.

**Functional.** Token bucket and sliding-window limits per API key and endpoint; Shared state across nodes via Redis scripts; Plan-based limits loaded from config; Headers with remaining quota and reset time; Fail-open or fail-closed policy when Redis is down

**Non-functional.** Limiter decision p99 under 3 ms; Enforced rate within 5 percent of limit across 3 nodes; Handle 20,000 decisions/s

**Constraints.** Redis single instance; Atomic operations only via server-side scripts

**Architecture.** Each decision runs an atomic Lua-style script on shared counters. A local fallback bucket applies approximate limits if the store is unavailable. Components: Limiter middleware, Redis script, Plan config, Fallback bucket, Load generator

**Data.** Synthetic client mix with bursts and abusive keys

**Milestones.** Token bucket algorithm and unit tests (4 h) · Redis atomic implementation (5 h) · Sliding window variant and comparison (4 h) · Fail-open/closed and fallback (4 h) · Accuracy and load tests (5 h)

**Deliverables.** repo; accuracy report

**Done when.** Limits enforced within 5 percent across 3 nodes, p99 decision under 3 ms at 20,000/s, fallback keeps abuse under 2x limit during a Redis outage.

**Measure.** Accuracy vs configured rate, decision latency, rejected request mix

**Pitfalls.** Non-atomic read-modify-write; Clock skew between nodes; Retry storms ignoring headers

**Stretch.** Cost-weighted requests; Adaptive limits by system load

### Transactional outbox and relay for an order service
`mx-svc-outbox-relay` · Y1-P1 · level 3 · 22 h · Go or Python, PostgreSQL, Redis streams or NATS

**Scenario.** Kettle & Co's order service sometimes saves an order but never publishes the event, or the reverse. They want an outbox pattern guaranteeing at-least-once publication with consumer-side dedup.

**Functional.** Write business change and outbox row in one transaction; Relay polls and publishes in order per aggregate; Mark published with retries and backoff; Consumer idempotency via processed-event table; Metrics on relay lag

**Non-functional.** No lost events across 50 injected crashes of service and relay; Relay lag p99 under 1 s at 1,000 events/s; Consumer sees each event effectively once in a 100k-event test

**Constraints.** One database, one broker or queue (local); Python or Go

**Architecture.** The outbox table is the single source of truth; the relay reads in id order per partition key and publishes, tolerating restarts through idempotent consumers. Components: Outbox writer, Relay, Broker adapter, Idempotent consumer, Crash injector

**Data.** Synthetic order creation workload

**Milestones.** Outbox schema and transactional write (4 h) · Relay with ordering (5 h) · Consumer dedup (4 h) · Crash injection suite (5 h) · Lag benchmark and write-up (4 h)

**Deliverables.** repo; crash-test report

**Done when.** 50 crashes lose 0 events, relay lag p99 under 1 s at 1,000 events/s, consumers apply each event once across 100k events.

**Measure.** Loss count, duplicate deliveries, lag percentiles

**Pitfalls.** Relay publishing out of order with multiple workers; Unbounded outbox table growth; Dual-write shortcuts

**Stretch.** Log-based relay via change capture; Partitioned relays

### Room reservation engine with timed holds for a 30-property boutique hotel group
`mx-svc-hotel-room-holds` · Y2 · level 3 · 28 h · Go or Java, PostgreSQL, Redis, k6

**Scenario.** Lantern Stays sells rooms through its own site and two partner channels. Guests abandon checkout, so rooms must be held for 10 minutes and released reliably, without overselling during weekend peaks.

**Functional.** Model room types, nightly inventory and rate plans; Create a hold across a date range that atomically decrements nightly counts; Convert a hold to a confirmed booking or let it expire; Release expired holds via a sweeper that is safe to run on several nodes; Expose an availability query for partner channels with cached responses

**Non-functional.** Zero oversold nights in a 10-minute stress run at 300 hold attempts/s; Hold expiry released within 5 s of deadline p99; Availability query p99 under 80 ms for a 14-night range

**Constraints.** One PostgreSQL primary; No distributed lock service; use database features only

**Architecture.** Per-night inventory rows are decremented in a single transaction using conditional updates; a leased sweeper reclaims expired holds. A read-through cache serves partner availability with explicit staleness bounds. Components: Inventory store, Hold manager, Expiry sweeper with leases, Availability cache, Partner API, Load generator

**Data.** Synthetic: 30 properties, 40 room types, 2 years of nightly inventory, Poisson arrivals with weekend surge

**Milestones.** Inventory schema and conditional-update hold transaction (7 h) · Confirm/expire flow and leased sweeper (6 h) · Availability cache with invalidation on hold/confirm (5 h) · Load generator reproducing weekend surge (5 h) · Invariant checker: sum of holds+bookings+free equals capacity (3 h) · Write-up with oversell analysis (2 h)

**Deliverables.** repo; invariant checker; load-test report; ADR on hold vs optimistic booking

**Done when.** After the 10-minute run the invariant checker finds 0 violations, sweeper p99 release delay is under 5 s, and availability p99 is under 80 ms.

**Measure.** Oversell count, hold-to-confirm ratio, release delay percentiles, cache hit rate and stale-read rate

**Pitfalls.** Decrementing a range non-atomically; Sweeper racing with confirm; Cache serving availability that was already held

**Stretch.** Overbooking policy with a configurable 3 percent buffer; Group bookings spanning several room types

### Payment reconciliation pipeline against settlement files for an e-commerce shop
`mx-svc-psp-reconciliation` · Y2 · level 3 · 28 h · Python, DuckDB or PostgreSQL, pandas optional

**Scenario.** Harbor & Pine ships 4,000 orders a day and finance spends two days each month matching internal orders to processor settlement reports. They want automated daily matching with an exceptions queue.

**Functional.** Ingest settlement CSV files from varied formats; Match settlements to orders by id, amount and date window with fuzzy fallbacks; Classify exceptions: missing, duplicate, amount mismatch, fee drift; Exceptions workflow with resolution notes; Daily and monthly summary report

**Non-functional.** Match 99.5 percent of records automatically on the synthetic set; Process 2M settlement lines in under 5 minutes; Re-running a day is idempotent with identical output

**Constraints.** Single machine; No paid data sources

**Architecture.** Files are parsed into a canonical staging table, then matched in ordered passes (exact, window, fuzzy). Each pass records its rule so every match is explainable. Components: File ingester, Canonical staging, Matcher passes, Exceptions store, Report generator

**Data.** Synthetic: generator producing orders, settlements with injected faults (duplicates, delays, fee changes, partial refunds)

**Milestones.** Staging schema and 3 file-format parsers (6 h) · Exact and window matchers (6 h) · Fuzzy matcher and exception classes (6 h) · Idempotent re-run and summary reports (5 h) · Fault-injection evaluation (5 h)

**Deliverables.** repo; evaluation report; runbook for finance

**Done when.** Auto-match rate is at least 99.5 percent with 0 false matches on injected faults, 2M lines process in under 5 minutes, and two runs of the same day produce byte-identical output.

**Measure.** Match rate by pass, false-match count, exception mix, runtime vs size

**Pitfalls.** Matching on amount alone; Time zone cut-off differences; Non-idempotent reruns doubling rows

**Stretch.** Auto-propose journal adjustments; Multi-processor support

### Preference-aware notification throttling for a social habit-tracking app
`mx-svc-notification-prefs-ratelimit` · Y2 · level 3 · 28 h · Go or Python, Redis, PostgreSQL

**Scenario.** StreakUp users complain about notification spam from group challenges. Product wants per-user preferences, quiet hours, frequency caps and digest batching enforced centrally.

**Functional.** Per-user, per-category preferences with defaults; Quiet hours honoured in the recipient time zone; Frequency caps per category per rolling window; Digest aggregation of low-priority events; Priority override for security messages

**Non-functional.** Policy decision p99 under 10 ms at 5,000 decisions/s; Caps never exceeded in a 1M-event replay; Digest job processes 1M pending items in under 2 minutes

**Constraints.** Single Redis plus PostgreSQL; No per-user cron jobs

**Architecture.** A policy engine evaluates rules against cached preferences and Redis sliding-window counters; suppressed low-priority items fall into a digest buffer flushed on schedule. Components: Preference store, Policy engine, Window counters, Digest buffer, Digest flusher

**Data.** Synthetic: 500k users across time zones and a 1M-event stream with bursts

**Milestones.** Preference model and policy rules (6 h) · Sliding-window counters (6 h) · Quiet hours and time zone handling (5 h) · Digest buffer and flusher (6 h) · Replay verification and benchmarks (5 h)

**Deliverables.** repo; replay verification report; ADR

**Done when.** Replay of 1M events shows 0 cap violations, decision p99 under 10 ms at 5,000/s, and digest flush of 1M items finishes in under 2 minutes.

**Measure.** Decision latency, suppression rate, cap violations, digest size distribution

**Pitfalls.** Sliding window drift across Redis nodes; DST and half-hour time zones; Preferences cached stale after change

**Stretch.** A/B test of cap values; Per-device preferences

### Transactional email pipeline with bounce handling for a legal-tech SaaS
`mx-svc-email-deliverability-pipeline` · Y2 · level 3 · 26 h · Python or Go, PostgreSQL, a small local SMTP test server

**Scenario.** Verdict Docs emails signing links; some are lost to bounces and spam folders and nobody knows. They want a sending pipeline with warm-up, bounce and complaint handling, and per-domain throttling.

**Functional.** Queue and send emails through an SMTP-like adapter with per-domain rate limits; Parse bounce and complaint feedback into hard and soft categories; Suppression list that blocks sends to hard-bounced addresses; Retry soft bounces with backoff up to 48 hours; Deliverability dashboard data per domain

**Non-functional.** Send 300 emails/s while respecting per-domain caps within 2 percent; Suppressed addresses never re-sent in a 100k simulation; Feedback processed within 30 s p99

**Constraints.** Local fake MTA only; No real email addresses

**Architecture.** A scheduler groups messages by recipient domain, applying token buckets. A feedback consumer updates suppression and retry state from simulated bounce messages. Components: Send queue, Domain scheduler, Fake MTA, Feedback parser, Suppression store, Metrics

**Data.** Synthetic: 100k messages across 2,000 domains with bounce and complaint model

**Milestones.** Queue and domain token buckets (6 h) · Fake MTA with behaviour profiles (4 h) · Bounce parser and classification (6 h) · Suppression and retry logic (5 h) · Simulation and metrics (5 h)

**Deliverables.** repo; simulation report; runbook

**Done when.** Simulation of 100k messages respects domain caps within 2 percent, re-sends 0 suppressed addresses, and feedback latency p99 is under 30 s.

**Measure.** Throughput per domain, bounce rate, suppression accuracy, retry success

**Pitfalls.** Treating all bounces as permanent; Head-of-line blocking by one slow domain; Unbounded retry growth

**Stretch.** Dedicated IP warm-up schedule; Per-tenant sending reputation

### On-the-fly image transformation service for a real-estate listing site
`mx-svc-image-transform-pipeline` · Y2 · level 3 · 28 h · Go or Python with libvips bindings

**Scenario.** HomeRow serves 2M listing photos in many sizes, and pre-generating all variants wastes storage. They want a transformation service with signed URLs, caching and strict limits on cost.

**Functional.** Resize, crop and format convert on request via signed URLs; Cache results in an object cache and a CDN-style header policy; Limit dimensions and concurrency to prevent abuse; Strip metadata and auto-rotate by orientation; Purge on source update

**Non-functional.** Cache hit p99 under 20 ms; miss p99 under 400 ms for a 12 MP image; Sustain 150 transformations/s on 4 cores; Memory under 1.5 GB with 16 concurrent workers

**Constraints.** No GPU; Budget under $30/month

**Architecture.** The edge layer checks a signed URL and cache; misses go to a bounded worker pool that streams the source, transforms it and stores the result keyed by normalised parameters. Components: URL signer, Cache layer, Worker pool, Transform library wrapper, Purge API, Load tester

**Data.** Public photo dataset subset or synthetic images up to 12 MP

**Milestones.** Signed URL scheme and parameter normalisation (5 h) · Transform workers with limits (7 h) · Cache and purge (6 h) · Abuse limits and memory tests (5 h) · Load test and cost write-up (5 h)

**Deliverables.** repo; load report; cost model

**Done when.** Hit p99 under 20 ms, miss p99 under 400 ms, 150 transforms/s sustained, memory under 1.5 GB at 16 workers.

**Measure.** Hit ratio, latency by hit/miss, throughput per core, memory peak

**Pitfalls.** Cache key explosion from unnormalised parameters; Decompression bombs; Unbounded concurrency

**Stretch.** Smart crop with saliency; AVIF output

### SQL transformation DAG runner with lineage and data tests
`mx-svc-sql-dag-lineage-runner` · Y2 · level 3 · 28 h · Python, DuckDB, sqlglot-style parser

**Scenario.** Orbital Retail has 120 SQL transformations run in hand-ordered scripts. They want a runner that infers dependencies, runs models in parallel, tests data quality and shows column lineage.

**Functional.** Parse model files and infer table dependencies into a DAG; Run models in topological order with parallelism and incremental materialisation; Declarative tests (not null, unique, relationships, accepted values); Column-level lineage extraction from SQL; Run state to resume after failure

**Non-functional.** Run a 120-model DAG in under 90 s with 8 workers on 20M rows; Dependency inference matches a hand-checked graph on 100 percent of models; Resume after failure re-runs only failed and downstream models

**Constraints.** DuckDB backend; No existing transformation framework

**Architecture.** A SQL parser extracts references to build the graph; a scheduler executes ready nodes in a worker pool with materialisation strategies and stores run state for resume. Components: Model parser, DAG builder, Scheduler, Materialiser, Test runner, Lineage extractor

**Data.** Synthetic retail warehouse with 120 generated models

**Milestones.** Parser and DAG builder (6 h) · Scheduler with parallelism (6 h) · Materialisations and resume (6 h) · Data tests (5 h) · Column lineage and write-up (5 h)

**Deliverables.** repo; lineage graph sample; benchmark

**Done when.** 120-model DAG completes under 90 s, graph matches the hand-checked reference, resume re-runs only affected models.

**Measure.** Run time vs workers, test failure detection rate, lineage accuracy

**Pitfalls.** Dynamic SQL hiding dependencies; Cycles not reported clearly; Incremental logic double counting

**Stretch.** Cost-based model ordering; Impact analysis for column changes

### Highly available cron scheduler for a data-platform team
`mx-svc-cron-scheduler-ha` · Y2 · level 3 · 26 h · Go or Python, PostgreSQL

**Scenario.** Dataweave runs 800 scheduled jobs from crontab on one box that occasionally dies, causing missed runs. They need a scheduler with leader election, missed-run policy and exactly-once-per-tick semantics.

**Functional.** Cron and interval expressions with time zones; Leader election among 3 scheduler nodes; Missed-run policies: skip, catch-up, coalesce; Dedupe so each tick produces one job even across failovers; Calendar exclusions and pause/resume

**Non-functional.** Failover to a new leader within 10 s; 0 duplicate or missed ticks in a 24-hour accelerated simulation with 20 leader kills; Scheduler handles 5,000 schedules with tick latency p99 under 1 s

**Constraints.** PostgreSQL advisory locks or lease table for election; No external coordination service

**Architecture.** The leader scans due schedules, inserts tick records with a unique (schedule, tick-time) key and enqueues jobs from them; followers watch the lease. Components: Cron parser, Leader election, Tick generator, Missed-run handler, Job enqueue bridge, Simulator

**Data.** Synthetic 5,000 schedules; accelerated clock simulator

**Milestones.** Cron parser with DST tests (6 h) · Lease-based leader election (5 h) · Unique tick records and enqueue (6 h) · Missed-run policies (4 h) · Accelerated chaos simulation (5 h)

**Deliverables.** repo; simulation report

**Done when.** Over a simulated 24 hours with 20 leader kills there are 0 duplicate and 0 missed ticks, failover under 10 s, tick latency p99 under 1 s at 5,000 schedules.

**Measure.** Duplicate/missed tick counts, failover time, tick lag

**Pitfalls.** DST double or skipped runs; Two leaders during lease overlap; Catch-up storms after downtime

**Stretch.** Dependency-aware schedules; Jitter to spread load

### SLO-driven observability stack for a four-service backend
`mx-svc-service-slo-observability` · Y2 · level 3 · 28 h · Go or Python, OpenTelemetry, Prometheus, Grafana

**Scenario.** Pocketpay's on-call is paged by noisy alerts. They want request tracing, golden-signal metrics, SLO definitions with burn-rate alerting and a game-day proving alerts fire at the right time.

**Functional.** Instrument four sample services with metrics and traces; Define SLIs and SLOs for availability and latency; Multi-window burn-rate alerts; Dashboards for golden signals and error budgets; Game-day scripts injecting failures

**Non-functional.** Alert on a 5 percent error burst within 5 minutes with fewer than 1 false page per week in replay; Instrumentation overhead under 3 percent p99 latency; Trace sampling keeps 100 percent of errors and 5 percent of successes

**Constraints.** Open-source collectors allowed; Runs via docker compose on 8 GB RAM

**Architecture.** Services emit metrics and spans to a collector; an SLO evaluator computes error budgets and burn rates and drives alert rules. Failure injection verifies detection time. Components: Sample services, Instrumentation library, Collector pipeline, SLO evaluator, Alert rules, Game-day runner

**Data.** Synthetic traffic and failure injection scripts

**Milestones.** Sample services and instrumentation (6 h) · Metrics, traces and sampling (6 h) · SLO and burn-rate rules (6 h) · Dashboards (4 h) · Game-day experiments and write-up (6 h)

**Deliverables.** repo; game-day report; SLO document

**Done when.** Injected 5 percent error bursts page within 5 minutes in 10 of 10 game-days, replayed healthy week yields under 1 false page, overhead under 3 percent.

**Measure.** Detection time, false pages, overhead, error-budget consumption

**Pitfalls.** Alerting on causes instead of symptoms; High-cardinality labels; Sampling that drops error traces

**Stretch.** Exemplars linking metrics to traces; Automatic runbook links

### Double-entry ledger service for a peer-to-peer tipping app
`mx-svc-double-entry-ledger` · Y2 · level 4 · 32 h · Go or Python, PostgreSQL

**Scenario.** TipJar lets fans send small tips to creators and holds balances for days before payout. Spreadsheets no longer reconcile, so finance wants an append-only double-entry ledger with provable balances.

**Functional.** Accounts and currencies with an append-only journal of balanced entries; Atomic multi-leg transfers (tip, platform fee, tax withholding); Balance queries as of any timestamp; Reversal entries instead of edits; Daily trial balance that must sum to zero per currency

**Non-functional.** Sustain 800 transfers/s on one node; Balance read p99 under 20 ms using materialised balances; Trial balance over 50M entries completes in under 60 s

**Constraints.** PostgreSQL, no ORM magic; Integer minor units only

**Architecture.** Immutable journal tables with deferred constraints enforce balance per transaction; materialised running balances are updated in the same transaction and verified against the journal by a nightly job. Components: Journal store, Transfer API, Balance materialiser, Trial-balance job, Reversal workflow, Load generator

**Data.** Synthetic: 500k accounts, 50M entries with Zipf-distributed activity

**Milestones.** Journal schema with balance constraints (7 h) · Atomic transfer API and hot-account strategy (8 h) · Materialised balances and as-of queries (6 h) · Trial balance and audit verifier (6 h) · Load test and write-up (5 h)

**Deliverables.** repo; load report; ADR: materialised vs computed balances

**Done when.** 800 transfers/s sustained 10 minutes, trial balance of 50M rows under 60 s with 0 imbalance, balance read p99 under 20 ms.

**Measure.** Transfer throughput, hot-account contention, balance read latency, verifier runtime

**Pitfalls.** Floating point money; Hot platform-fee account serialising all writes; Mutating entries to fix mistakes

**Stretch.** Multi-currency FX legs; Sharding accounts by id range

### Multi-warehouse order allocation service for a furniture retailer
`mx-svc-multiwarehouse-allocation` · Y2 · level 4 · 30 h · Python or Rust, PostgreSQL, a small open-source MILP library

**Scenario.** Oakline ships bulky furniture from 6 warehouses; splitting an order across sites costs real money. They need an allocation service that picks fulfilment sites by cost, stock and delivery date.

**Functional.** Maintain stock per warehouse with in-transit and safety buffers; Allocate each order line to a warehouse minimising shipping cost with a split penalty; Re-allocate when stock changes before pick; Expose explain output: why this warehouse; Replayable allocation decisions

**Non-functional.** Allocate an order of 20 lines in under 100 ms p99; Cost within 3 percent of an offline optimal solver on 1,000 test orders; Handle 200 orders/s

**Constraints.** No commercial solver; One service instance

**Architecture.** A greedy allocator with local-search improvement works over a snapshot of stock; decisions are logged with inputs so they can be replayed and compared against an offline ILP baseline. Components: Stock snapshotter, Allocator, Cost model, Decision log, Offline baseline, Replay tool

**Data.** Synthetic: 6 warehouses, 8,000 SKUs, distance-based shipping cost matrix, order generator

**Milestones.** Cost model and stock snapshot (6 h) · Greedy allocator with split penalty (7 h) · Local-search improvement (6 h) · Decision log and replay (5 h) · Baseline comparison on 1,000 orders (6 h)

**Deliverables.** repo; benchmark report; ADR

**Done when.** Mean cost is within 3 percent of the offline optimum on 1,000 orders, p99 allocation latency under 100 ms, and replay reproduces 100 percent of decisions.

**Measure.** Cost gap vs optimum, split rate, latency percentiles, replay fidelity

**Pitfalls.** Allocating against stale stock; Ignoring in-transit units; Non-deterministic tie-breaks breaking replay

**Stretch.** Predictive pre-positioning; Carbon cost in the objective

### Inverted-index search engine core for a 5M-document support knowledge base
`mx-svc-search-inverted-index-rust` · Y2 · level 4 · 34 h · Rust or C++

**Scenario.** Helpdesk vendor Tallyn needs to search 5M articles cheaply per tenant. Hosted search is too costly, so they want a compact in-house engine with phrase queries and segment-based writes.

**Functional.** Segment-based indexing with immutable segments and merges; Postings with delta and variable-byte compression; BM25 ranking with top-k heap and WAND-style pruning; Phrase and boolean queries; Concurrent readers during merges

**Non-functional.** Query p99 under 30 ms for 2-term queries over 5M docs; Index size under 40 percent of raw text size; Indexing throughput over 20 MB/s on 4 cores

**Constraints.** Single node, 16 GB RAM; No external search library

**Architecture.** Writes go to an in-memory buffer flushed into immutable segments; a background merger compacts them while readers use snapshot views. Postings are compressed and scored with block-max pruning. Components: Tokenizer, Segment writer, Postings codec, Merger, Query executor, Benchmark harness

**Data.** Public text corpus such as Wikipedia dump subset or Stack Exchange archives, 5M documents

**Milestones.** Tokenizer and in-memory index (5 h) · Segment format and compression (8 h) · BM25 and top-k pruning (7 h) · Phrase and boolean queries (5 h) · Merge with snapshot readers (5 h) · Benchmarks vs a baseline library (4 h)

**Deliverables.** repo; benchmark report; format spec

**Done when.** 2-term query p99 under 30 ms on 5M docs, index below 40 percent of raw size, 20 MB/s indexing, and results match a reference BM25 implementation on 500 queries.

**Measure.** Latency percentiles, bytes per posting, index throughput, pruning skip ratio

**Pitfalls.** Merging that blocks readers; Compression off-by-one in skip blocks; Score differences from tokenisation mismatch

**Stretch.** SIMD intersection; Query result caching

### Streaming sessionizer for an e-commerce clickstream
`mx-svc-clickstream-sessionizer` · Y2 · level 4 · 30 h · Rust or Java or Python with a stream library

**Scenario.** Marketplace Fennel wants sessions, funnels and attribution from clickstream, but late mobile events break nightly batch jobs. They need a streaming sessionizer tolerant of late data.

**Functional.** Group events into sessions with a 30-minute inactivity gap; Handle late and out-of-order events with watermarks and allowed lateness; Emit session summaries and funnel step flags; Correct earlier outputs when late data arrives; Checkpoint state for restart

**Non-functional.** Process 50,000 events/s on 4 cores; Session output matches an offline batch within 0.1 percent on a 10M-event day; Restart recovery under 30 s

**Constraints.** No cluster framework required; custom implementation or a single-node stream library; 8 GB RAM

**Architecture.** Keyed state per user holds open sessions; watermarks close sessions and late events trigger retractions. State is periodically checkpointed with offsets. Components: Source reader, Keyed state, Watermark tracker, Session emitter, Checkpoint manager, Batch oracle

**Data.** Synthetic 10M-event day with 8 percent late arrivals; optionally a public e-commerce clickstream dataset

**Milestones.** Event model and batch oracle (5 h) · Keyed session state (7 h) · Watermarks and lateness (7 h) · Retractions and checkpoints (6 h) · Equivalence testing and benchmarks (5 h)

**Deliverables.** repo; equivalence report; ADR

**Done when.** Output differs from the batch oracle by at most 0.1 percent, throughput at least 50,000 events/s, recovery under 30 s with identical final output.

**Measure.** Throughput, memory per open session, divergence rate, recovery time

**Pitfalls.** Using processing time instead of event time; Unbounded state for abandoned users; Retractions double counted downstream

**Stretch.** Attribution models; Session stitching across devices

### Streaming flag SDK with local evaluation for a mobile commerce company
`mx-svc-flag-sdk-streaming` · Y2 · level 4 · 30 h · Go server, TypeScript and Python SDKs

**Scenario.** Vendora's mobile apps call a flag API on every screen, adding latency and failing offline. They want SDKs that evaluate locally from a streamed ruleset with sub-second propagation.

**Functional.** Server streams ruleset versions via SSE or WebSocket with deltas; SDK evaluates locally with the same engine as server; Offline cache with last-known-good ruleset; Version gap detection triggers full resync; Evaluation event batching for analytics

**Non-functional.** Flag change visible to 10,000 connected clients within 2 s p99; Local evaluation under 50 microseconds; Server holds 10,000 connections on one 2-core VM

**Constraints.** Two SDKs in different languages sharing test vectors; Budget under $10/month

**Architecture.** A versioned ruleset is pushed incrementally; SDKs apply deltas and verify checksums. Shared JSON test vectors ensure identical evaluation across implementations. Components: Ruleset publisher, Stream server, Server SDK, Client SDK, Test vectors, Connection simulator

**Data.** Synthetic rulesets and 10,000-client simulator

**Milestones.** Ruleset versioning and delta format (6 h) · Stream server and fan-out (7 h) · Two SDKs with shared test vectors (8 h) · Resync and offline behavior (5 h) · 10k-connection test and write-up (4 h)

**Deliverables.** repo; cross-SDK conformance suite; load report

**Done when.** Both SDKs pass 100 percent of shared vectors, propagation to 10,000 clients p99 under 2 s, local evaluation under 50 microseconds.

**Measure.** Propagation latency, connection memory, evaluation time, resync frequency

**Pitfalls.** Cross-language hash differences; Missed deltas after reconnect; Thundering herd on reconnect

**Stretch.** Edge cache for ruleset; Event-based flag prerequisites

### Experiment assignment and analysis service for a subscription app
`mx-svc-experiment-assignment-stats` · Y2 · level 4 · 32 h · Python, DuckDB

**Scenario.** Lumio runs 30 pricing and onboarding tests but analysts compute results by hand in notebooks, sometimes after peeking early. They need assignment, exposure logging and automatic sound statistics.

**Functional.** Deterministic assignment with mutual-exclusion layers; Exposure logging only when users see the variant; Conversion metric computation with confidence intervals; Sample ratio mismatch detection; Sequential testing guard against peeking

**Non-functional.** Assignment p99 under 5 ms; SRM check flags a 2 percent imbalance on 1M users; Simulated A/A tests show false positive rate within 5 percent plus or minus 0.5

**Constraints.** Python stats libraries allowed; Runs on one machine

**Architecture.** Assignment hashes users into layers and buckets; exposures stream into a store from which the analysis job computes metrics and corrected intervals. Components: Assigner, Exposure logger, Metric engine, SRM detector, Sequential analysis, Report view

**Data.** Synthetic simulator with known effects and injected bugs (SRM, logging loss)

**Milestones.** Layered deterministic assignment (6 h) · Exposure log and metric tables (6 h) · Confidence intervals and SRM (7 h) · Sequential testing method (7 h) · A/A and power simulations (6 h)

**Deliverables.** repo; statistical validation report; ADR

**Done when.** A/A simulation of 2,000 tests gives a false positive rate of 5 percent plus or minus 0.5, SRM flags 2 percent imbalance, assignment p99 under 5 ms.

**Measure.** False positive rate, power at known effects, SRM detection rate, assignment latency

**Pitfalls.** Counting assignments instead of exposures; Peeking inflates error; Overlapping experiments sharing users

**Stretch.** CUPED variance reduction; Multi-armed bandit mode

### OpenID Connect provider for an internal tools suite of a 400-person company
`mx-svc-oidc-provider-sso` · Y2 · level 4 · 34 h · Go or Python or TypeScript, PostgreSQL

**Scenario.** Cobalt Works has nine internal apps with separate logins. They want a single OIDC identity provider with authorization code plus PKCE flow, consent-free first-party clients and key rotation.

**Functional.** Authorization code flow with PKCE and state/nonce handling; ID tokens, access tokens and userinfo endpoint; Client registration with redirect URI exact-matching; JWKS endpoint with scheduled key rotation; Session cookie single sign-on across clients

**Non-functional.** Token endpoint p99 under 80 ms at 300 req/s; Key rotation with zero failed validations during overlap; Passes a conformance checklist of 25 protocol edge cases

**Constraints.** No identity library for the core flow; HTTPS in tests via local certificates

**Architecture.** A stateless token layer signs with rotating keys; authorization codes are one-time, short-lived and bound to PKCE challenge and client. Components: Authorization endpoint, Token endpoint, Key manager, Client registry, Session manager, Conformance tests

**Data.** Synthetic users and client apps; scripted protocol conformance cases

**Milestones.** Client registry and authorization endpoint (8 h) · Token and userinfo endpoints (7 h) · PKCE, nonce and replay protections (6 h) · Key rotation and JWKS (5 h) · Conformance tests and SSO demo apps (8 h)

**Deliverables.** repo; conformance results; threat model; demo with two relying apps

**Done when.** All 25 edge cases behave as specified, token p99 under 80 ms at 300 req/s, key rotation shows 0 validation failures.

**Measure.** Latency percentiles, conformance pass rate, rotation failure count

**Pitfalls.** Open redirect through loose URI matching; Code reuse not detected; Clock skew in token validation

**Stretch.** Refresh token support; Device authorization flow

### WebSocket chat gateway for a 50,000-user community app
`mx-svc-chat-websocket-gateway` · Y2 · level 4 · 34 h · Go or Node.js, Redis, PostgreSQL

**Scenario.** Huddlr's chat runs on one process and drops messages on deploys. They need a gateway tier that holds connections, routes messages across nodes and guarantees ordered delivery per room.

**Functional.** WebSocket connect with token auth and heartbeat; Room subscriptions and message fan-out across gateway nodes; Per-room ordering with sequence numbers; Reconnect with replay from last sequence; Rolling deploy with connection draining

**Non-functional.** Hold 50,000 connections across 3 nodes; Message delivery p99 under 150 ms within a room of 500; Zero lost or reordered messages during a rolling restart

**Constraints.** Laptop load generator; Redis pub/sub or similar allowed

**Architecture.** Gateways are stateless apart from connections; a message log per room assigns sequence numbers and a broker distributes to gateways, which deliver and track per-client cursors. Components: Gateway, Room log, Broker, Cursor tracker, Drain manager, Load generator

**Data.** Synthetic: client simulator with join/leave churn and bursty chat

**Milestones.** Gateway with auth and heartbeats (7 h) · Room log with sequence numbers (7 h) · Cross-node fan-out (7 h) · Reconnect replay and draining (7 h) · 50k-connection test and write-up (6 h)

**Deliverables.** repo; load report; ADR on ordering

**Done when.** 50,000 connections held, room delivery p99 under 150 ms, rolling restart shows 0 lost and 0 reordered messages in the checker.

**Measure.** Connections per node, delivery latency, loss/reorder count, reconnect storm time

**Pitfalls.** Fan-out copying per recipient; Reconnect storms after restart; Clock-based ordering instead of sequence numbers

**Stretch.** Message edit and delete events; End-to-end encrypted rooms

### Reverse-proxy API gateway for a microservice fleet in Rust
`mx-svc-api-gateway-proxy` · Y2 · level 4 · 34 h · Rust, tokio

**Scenario.** Meridian Freight has 14 internal services each doing its own auth and routing. They want a lightweight gateway with routing, JWT auth, timeouts, retries and hot-reloaded config.

**Functional.** Route by host and path prefix to upstream pools; JWT verification with cached keys; Per-route timeouts and idempotent-only retries; Round-robin and least-connections balancing with health checks; Hot reload of config without dropping connections

**Non-functional.** Add under 1 ms p99 overhead vs direct calls at 10,000 req/s; Sustain 20,000 req/s on 4 cores; Config reload with 0 failed in-flight requests

**Constraints.** Rust async runtime; No existing proxy framework for the core

**Architecture.** An async accept loop parses requests, matches the route table, applies middleware chain and proxies with connection pooling. Config swaps via an atomic pointer. Components: Listener, Router, Middleware chain, Upstream pool with health checks, Config loader, Benchmark rig

**Data.** Synthetic upstream services with configurable latency and failures

**Milestones.** HTTP parsing, router and basic proxy (9 h) · JWT and middleware chain (6 h) · Pools, balancing and health checks (8 h) · Retries, timeouts, hot reload (6 h) · Benchmarks vs a reference proxy (5 h)

**Deliverables.** repo; benchmark report; design doc

**Done when.** Overhead p99 under 1 ms at 10,000 req/s, 20,000 req/s sustained on 4 cores, config reloads cause 0 failed in-flight requests.

**Measure.** Overhead latency, throughput per core, error rates under upstream failure

**Pitfalls.** Retrying non-idempotent calls; Connection leaks to upstreams; Header handling differences (hop-by-hop)

**Stretch.** Rate limiting plugin; gRPC proxying

### Change-data-capture replication from an OLTP database to a warehouse
`mx-svc-cdc-to-warehouse` · Y2 · level 4 · 34 h · Go or Python, PostgreSQL logical decoding, DuckDB

**Scenario.** Stockline's analysts query a nightly dump and want data within minutes. They need log-based change capture from the app database into warehouse tables, handling schema changes and deletes.

**Functional.** Read the database change log and emit ordered change events; Apply inserts, updates and deletes to warehouse tables idempotently; Initial snapshot followed by seamless switch to streaming; Schema change handling for added columns; Row-count and checksum verification between source and target

**Non-functional.** End-to-end lag under 30 s p99 at 3,000 changes/s; Verification finds 0 differences after 1M mixed changes and a crash; Initial snapshot of 50M rows in under 30 minutes

**Constraints.** Single source database; Warehouse can be DuckDB or ClickHouse-like local store

**Architecture.** A log reader tracks positions and emits events to a durable buffer; an applier merges batches by primary key with last-write ordering and records its position transactionally. Components: Log reader, Event buffer, Snapshotter, Batch applier, Schema tracker, Verifier

**Data.** Synthetic workload generator on a sample orders schema

**Milestones.** Snapshot and consistent log position (8 h) · Log reader and event format (7 h) · Idempotent batch applier (8 h) · Schema change and delete handling (5 h) · Verification and crash tests (6 h)

**Deliverables.** repo; verification report; ADR

**Done when.** Lag p99 under 30 s at 3,000 changes/s, 0 verification differences after 1M changes with a mid-run crash, 50M-row snapshot under 30 minutes.

**Measure.** Lag percentiles, apply throughput, verification differences, snapshot time

**Pitfalls.** Gap between snapshot and stream start; Non-idempotent apply after restart; Primary key updates

**Stretch.** Soft-delete history tables; Multi-table transaction consistency

### Tamper-evident audit logging service for a health-records vendor
`mx-svc-audit-log-hashchain` · Y2 · level 4 · 30 h · Go or Rust, PostgreSQL, Ed25519

**Scenario.** Carewell must prove access logs were not altered after the fact. They need an append-only audit service where each entry is chained so tampering is detectable and verification is cheap.

**Functional.** Append audit events with actor, action, resource and request id; Hash chain with periodic signed checkpoints; Query by actor, resource and time range; Verifier that proves integrity of any range; Retention and archival to cold storage keeping verifiability

**Non-functional.** Ingest 5,000 events/s with p99 append under 15 ms; Verification of 10M entries in under 2 minutes; Any single-byte modification detected in 100 percent of 1,000 tamper trials

**Constraints.** Single writer lane per partition; Signing key never stored with the log

**Architecture.** A sequencer assigns order and links each entry to the previous hash; Merkle checkpoints are signed periodically and published separately so truncation is also detectable. Components: Ingest API, Sequencer, Chain store, Checkpoint signer, Verifier, Query index

**Data.** Synthetic access events for 10M entries; scripted tamper tool

**Milestones.** Event schema and ingest (5 h) · Hash chain and sequencer (7 h) · Merkle checkpoints and signing (6 h) · Verifier and tamper tool (6 h) · Query, archival and benchmarks (6 h)

**Deliverables.** repo; tamper-test report; threat model

**Done when.** 5,000 events/s with append p99 under 15 ms, 10M entries verified under 2 minutes, 1,000 of 1,000 tamper trials detected including truncation.

**Measure.** Append latency, verification speed, detection rate, checkpoint overhead

**Pitfalls.** Detecting modification but not deletion at the tail; Signing key on same host; Order ambiguity under concurrent writers

**Stretch.** Inclusion proofs for single entries; Witness service for checkpoints

### Read-replica routing layer for a growing marketplace database
`mx-svc-read-replica-router` · Y2 · level 4 · 30 h · Go or Python, PostgreSQL streaming replication, Docker

**Scenario.** Bazaarly's primary database is at 80 percent CPU because every read hits it. They want a routing layer that sends safe reads to replicas while preserving read-your-writes for users who just wrote.

**Functional.** Classify statements as read or write and route accordingly; Read-your-writes via per-session LSN or timestamp tokens; Replica health and lag-aware selection; Automatic fallback to primary when replicas lag past a threshold; Per-query override hints

**Non-functional.** Move 80 percent of reads to replicas under a mixed workload; Read-your-writes violation rate 0 in a 1M-request test; Router adds under 1 ms p99

**Constraints.** PostgreSQL primary with 2 local replicas; Router as a library or proxy, your choice

**Architecture.** The router tracks each replica's replay position and compares it to the session's last write position before choosing a target. Components: SQL classifier, Session position tracker, Replica monitor, Selection policy, Workload generator

**Data.** Synthetic marketplace workload with 90/10 read/write mix

**Milestones.** Replica setup and lag monitor (6 h) · Classifier and routing (6 h) · Read-your-writes tokens (7 h) · Lag fallback and chaos tests (6 h) · Workload benchmark (5 h)

**Deliverables.** repo; benchmark report; ADR

**Done when.** 80 percent of reads served by replicas, 0 read-your-writes violations in 1M requests with injected 5 s lag, router overhead p99 under 1 ms.

**Measure.** Replica read share, violation count, overhead, primary CPU before/after

**Pitfalls.** Treating SELECT with side effects as read; Transactions split across nodes; Lag measured by time instead of position

**Stretch.** Connection pooling integration; Per-tenant routing

### Multi-tenant job scheduler with fairness and priorities for a reporting platform
`mx-svc-job-priority-fairness` · Y2 · level 4 · 28 h · Go or Rust or Python

**Scenario.** Insightly's tenants run heavy report exports, and one big tenant starves the rest. They need a scheduler with priorities, per-tenant concurrency caps and weighted fair sharing.

**Functional.** Priority classes with aging to avoid starvation; Per-tenant concurrency caps and weights; Weighted fair queueing across tenants; Cancellation and timeout of running jobs; Queue wait-time metrics per tenant

**Non-functional.** Small tenants' wait p99 under 5 s while a heavy tenant submits 50,000 jobs; Fairness error under 10 percent of weighted share over 10-minute windows; Dispatch 2,000 jobs/s

**Constraints.** Single scheduler process; Workers simulated

**Architecture.** Per-tenant queues are drained by a virtual-time fair scheduler; priority classes map to weights and aging bumps long-waiting jobs. Components: Tenant queues, Fair scheduler, Concurrency limiter, Worker simulator, Metrics, Scenario runner

**Data.** Synthetic tenant mix with one noisy neighbour

**Milestones.** Queue model and metrics (5 h) · Weighted fair scheduler (7 h) · Caps, priorities and aging (6 h) · Cancellation and timeouts (4 h) · Noisy-neighbour experiments (6 h)

**Deliverables.** repo; fairness report; ADR

**Done when.** With a 50,000-job noisy tenant the small tenants' p99 wait stays under 5 s, fairness error under 10 percent, dispatch at 2,000 jobs/s.

**Measure.** Wait percentiles per tenant, fairness error, utilisation, starvation count

**Pitfalls.** Priority inversion; Aging that defeats priorities; Counting concurrency incorrectly after crashes

**Stretch.** Preemption of low-priority jobs; Autoscaling signals

### Data retention and right-to-erasure service for a multi-database SaaS
`mx-svc-retention-erasure-service` · Y2 · level 4 · 30 h · Python or Go, PostgreSQL, MinIO-like store, search index

**Scenario.** Kindle Learn stores learner data across PostgreSQL, object storage, search and analytics tables. A regulator-style request requires proving deletion within 30 days, which today means manual scripts.

**Functional.** Registry of data locations per subject with owners; Erasure request workflow across stores with status; Retention policies that expire data by class; Backup-aware handling and deletion certificates; Verification scan that proves absence

**Non-functional.** Erasure across 5 stores completes within 10 minutes for 99 percent of subjects; Verification finds 0 residual records in 1,000 test erasures; Retention job handles 100M rows nightly without locking out traffic

**Constraints.** Local simulations of the stores; Soft-delete tombstones must not leak PII

**Architecture.** A subject index maps identifiers to locations; the workflow fans out deletion tasks with idempotent handlers and confirms through an independent scanner. Components: Subject registry, Workflow coordinator, Store adapters, Retention scheduler, Verifier, Certificate generator

**Data.** Synthetic learner data across stores with seeded PII

**Milestones.** Data map and subject index (6 h) · Erasure workflow and adapters (8 h) · Retention scheduler (5 h) · Verifier and certificates (6 h) · Scale tests and write-up (5 h)

**Deliverables.** repo; verification report; data-map doc

**Done when.** 1,000 erasures leave 0 residual records per the verifier, 99 percent finish within 10 minutes, nightly retention over 100M rows causes no p99 traffic regression above 10 percent.

**Measure.** Erasure completion time, residual count, retention throughput, traffic impact

**Pitfalls.** Forgotten copies in logs and caches; Erasing before legal holds are checked; Backups restoring deleted data

**Stretch.** Crypto-shredding per subject key; Automated DSAR export

### SAML SSO and SCIM provisioning bridge for a project-management SaaS
`mx-svc-saml-scim-bridge` · Y3 · level 4 · 36 h · Java or Go or Python, PostgreSQL

**Scenario.** Boardwise is losing enterprise deals without SAML login and automatic user provisioning. They need a bridge service supporting SAML assertions and SCIM user lifecycle with per-tenant configuration.

**Functional.** Per-tenant IdP metadata and certificate management; SAML assertion validation with signature, audience and replay checks; Just-in-time user creation and attribute mapping; SCIM endpoints for users and groups with filters and patch; Deprovisioning that revokes sessions within seconds

**Non-functional.** Assertion validation p99 under 60 ms; Deprovision to session revocation under 5 s p99; SCIM handles 1,000 user bulk sync in under 30 s

**Constraints.** Test against a self-built mock IdP; Multi-tenant isolation tested

**Architecture.** Tenant config drives validation; SCIM operations apply idempotently to the user store and emit revocation events consumed by the session service. Components: Tenant config store, SAML validator, Attribute mapper, SCIM API, Revocation bus, Mock IdP

**Data.** Synthetic tenants; mock IdP issuing signed, tampered and replayed assertions

**Milestones.** Tenant config and mock IdP (7 h) · SAML validation including attack cases (9 h) · SCIM users and groups (9 h) · Deprovision revocation pipeline (6 h) · Tenant isolation tests and write-up (5 h)

**Deliverables.** repo; security test report; runbook for onboarding a tenant

**Done when.** All 15 tampered/replayed assertion cases are rejected, 1,000-user sync completes under 30 s, revocation p99 under 5 s.

**Measure.** Validation latency, rejection correctness, sync time, revocation delay

**Pitfalls.** XML signature wrapping attacks; Replay of assertions; Cross-tenant data leakage

**Stretch.** Group-to-role mapping UI data; SCIM bulk operations

### Video transcoding job system for an online course platform
`mx-svc-video-transcode-queue` · Y3 · level 4 · 36 h · Python or Go, ffmpeg, PostgreSQL queue, S3-compatible storage

**Scenario.** Lecturo receives 400 hours of lecture video a week and must produce adaptive-bitrate renditions fast. Transcoding fails mid-way on large files and wastes compute, so they need chunked parallel transcoding with resumability.

**Functional.** Split video into segments and transcode in parallel workers; Produce 3 renditions and HLS-style manifests; Retry failed segments without redoing the file; Priority lanes for live-recorded lectures; Progress and ETA reporting

**Non-functional.** A 60-minute 1080p lecture is ready in under 12 minutes on 8 worker cores; Failed segment retry adds under 10 percent to total time; Worker utilisation above 75 percent during bursts

**Constraints.** ffmpeg allowed as the codec engine; Laptop-scale cluster using containers

**Architecture.** A planner cuts the source on keyframes into segment jobs; workers claim jobs from a queue, upload outputs, and a finaliser stitches manifests after all segments verify. Components: Planner, Job queue, Workers, Segment verifier, Manifest builder, Progress API

**Data.** Public domain video clips and synthetic long videos built by concatenation

**Milestones.** Segment planner on keyframes (7 h) · Queue and worker claim/lease logic (8 h) · Verification, retry and manifests (8 h) · Priority lanes and progress (6 h) · Benchmarks and failure drills (7 h)

**Deliverables.** repo; benchmark report; failure-drill notes

**Done when.** A 60-minute test video completes in under 12 minutes on 8 cores, injected segment failures add under 10 percent, and output plays continuously across segment boundaries.

**Measure.** Wall-clock vs workers, utilisation, retry overhead, quality (VMAF or bitrate) per rendition

**Pitfalls.** Segment boundaries not on keyframes causing glitches; Lease expiry duplicating work; Stitching mismatched audio timestamps

**Stretch.** Per-title bitrate ladder; Spot-instance preemption handling

### Canary routing and circuit breaking layer for a fintech API gateway
`mx-svc-gateway-canary-circuit` · Y3 · level 4 · 32 h · Go or Rust, Prometheus-style metrics, Docker

**Scenario.** Quillpay deploys 20 times a week and wants safe canaries. Their gateway should shift traffic gradually, watch error and latency signals, trip circuit breakers and roll back automatically.

**Functional.** Weighted routing between stable and canary versions with sticky users; Automated canary analysis of error rate and latency against baseline; Circuit breaker per upstream with half-open probing; Automatic rollback when thresholds are breached; Audit log of rollout decisions

**Non-functional.** Detect a 5 percent error-rate regression within 60 s at 500 req/s; False rollback rate under 2 percent over 500 healthy simulated canaries; Breaker opens within 2 s of upstream failure

**Constraints.** Simulated upstream versions; Single gateway process

**Architecture.** A controller reads rolling metrics windows, compares canary to baseline with a statistical test and adjusts weights through a state machine. Breakers wrap each upstream. Components: Weighted router, Metrics windows, Canary analyser, Rollout controller, Circuit breaker, Fault simulator

**Data.** Simulated services with injected latency and error regressions

**Milestones.** Weighted sticky routing (6 h) · Metrics windows and statistics (7 h) · Rollout state machine and rollback (7 h) · Circuit breaker (5 h) · Simulation of 500 rollouts and tuning (7 h)

**Deliverables.** repo; simulation report; ADR on analysis method

**Done when.** Regressions of 5 percent error rate are caught within 60 s, false rollbacks under 2 percent over 500 healthy canaries, breaker trips within 2 s.

**Measure.** Detection time, false positive/negative rates, blast radius (requests served to bad canary)

**Pitfalls.** Low-traffic noise causing flapping; Non-sticky routing corrupting comparisons; Breaker never closing

**Stretch.** Shadow traffic mirroring; Per-region progressive rollout

### Audit trail and compliance export pipeline for a banking SaaS
`mx-svc-audit-compliance-export` · Y3 · level 4 · 32 h · Python or Go, Parquet, DuckDB

**Scenario.** Ledgerly's auditors request who changed what in 90-day windows, and engineers produce it by manual SQL. They need change auditing across services with before/after diffs, PII redaction and reproducible exports.

**Functional.** Capture change events from several services in a common envelope; Compute before/after field diffs; Redact or tokenise PII by field classification; Search and export a 90-day window as signed CSV and JSON bundles; Access control and logged access to the audit data itself

**Non-functional.** Search over 200M events p99 under 800 ms for actor plus date range; Export of 10M events in under 5 minutes; Redaction misses 0 classified fields in a 100k-sample test

**Constraints.** Columnar storage allowed; Budget under $50/month for tests

**Architecture.** Events land in a partitioned columnar store with a classification-driven redactor in the path; exports run as reproducible jobs that sign a manifest with file hashes. Components: Envelope schema, Diff engine, Redactor, Columnar store, Export job, Access gate

**Data.** Synthetic 200M-event stream across 5 services with PII fields

**Milestones.** Envelope and diff engine (6 h) · Field classification and redaction (7 h) · Partitioned storage and search (8 h) · Signed export bundles (6 h) · Access logging and tests (5 h)

**Deliverables.** repo; export sample; redaction test report

**Done when.** Search p99 under 800 ms on 200M events, 10M-event export under 5 minutes, redaction test shows 0 leaks and re-exports are byte-identical.

**Measure.** Search latency, export throughput, redaction recall, bundle reproducibility

**Pitfalls.** Redacting after storage rather than before; Diffs of nested objects; Exports that change between runs

**Stretch.** Legal hold flags; Anomaly detection on access patterns

### Seat reservation backend surviving a concert flash sale
`mx-svc-seat-hold-flash-sale` · Y3 · level 5 · 40 h · Rust or Go, Redis or custom store, PostgreSQL, WebSocket

**Scenario.** Arcadia Live opens 18,000 seats for a stadium show and sees 60,000 users in the first minute. Their previous system locked the whole event row and collapsed; they need seat-level holds, a fair queue and no double sales.

**Functional.** Admit users through a virtual waiting room with fair ordering; Hold individual seats or best-available groups for 5 minutes; Atomically sell held seats once payment succeeds; Release abandoned holds and recycle them to the queue; Provide organiser dashboard of sold, held and free counts in near real time

**Non-functional.** Sustain 5,000 seat-hold requests/s with p99 under 200 ms; No seat sold twice in a 60,000-user simulation; Waiting room admits at a configurable rate within 5 percent of target; Recover from a node restart with no lost confirmed sales

**Constraints.** Budget under $60/month of cloud for the load test; Single region

**Architecture.** Seat state lives in a sharded in-memory store with a write-ahead log; a token-bucket waiting room throttles entry. Confirmed sales are written to a durable database through an outbox. Components: Waiting room, Seat state shards, Best-available allocator, WAL and recovery, Sales outbox, Dashboard feed, Simulator

**Data.** Synthetic: 18k-seat venue map and a 60k-user arrival simulator with abandon and retry behavior

**Milestones.** Seat model and best-available group allocator (8 h) · Sharded hold state with WAL and crash recovery (10 h) · Waiting room with fair admission (7 h) · Sales outbox into durable store (5 h) · 60k-user simulator and invariant audit (7 h) · Failure drills and write-up (3 h)

**Deliverables.** repo; simulator; failure-drill report; design doc with 3 ADRs

**Done when.** Simulation of 60,000 users yields 0 double-sold seats, hold p99 under 200 ms at 5,000 req/s, and a killed node recovers with 0 lost confirmed sales.

**Measure.** Throughput, hold latency percentiles, fairness (admit order vs arrival), recovery time, double-sale count

**Pitfalls.** Thundering herd on the best seats; Holds leaking after crash; Unfair queue from client retries

**Stretch.** Dynamic pricing tiers; Bot detection signals in the queue

### Refund and merchant payout saga for a multi-vendor marketplace
`mx-svc-refund-payout-saga` · Y3 · level 5 · 38 h · Go or Java or Python, PostgreSQL

**Scenario.** Craftly Market pays 3,000 sellers weekly and processes refunds that may arrive after payout. Partial failures have left sellers overpaid and buyers unrefunded, so they need a saga with compensation and clear state.

**Functional.** Payout batches with per-seller netting of sales, fees and refunds; Refund flow that may claw back from future payouts when funds are gone; Saga orchestrator with persisted steps and compensation; Retry with exponential backoff and a dead-letter state; Operator view of stuck sagas

**Non-functional.** No seller paid twice across 1,000 injected crashes; Batch of 3,000 payouts completes in under 3 minutes; Every saga reaches a terminal state within 1 hour in chaos tests

**Constraints.** Provider is simulated; One database, no external workflow engine

**Architecture.** A persisted saga log drives each step with idempotent calls to a fake bank; compensation steps are explicit and tested. A reconciler closes sagas stuck in unknown state. Components: Saga orchestrator, Step handlers, Netting calculator, Fake bank with faults, Reconciler, Operator console

**Data.** Synthetic: 3,000 sellers, 200k orders, refund arrival model with late refunds

**Milestones.** Netting calculator with property tests (7 h) · Saga log and orchestrator (9 h) · Step handlers and compensations (8 h) · Chaos harness with crash injection (8 h) · Operator console and write-up (6 h)

**Deliverables.** repo; chaos report; design doc with 3 ADRs; runbook

**Done when.** After 1,000 injected crashes there are 0 double payouts, all sagas terminal within 1 hour, and the 3,000-payout batch finishes in under 3 minutes.

**Measure.** Double-payout count, saga completion time, compensation rate, retry counts

**Pitfalls.** Compensation that is not itself idempotent; Negative balances after late refunds; Orchestrator crash between step and log write

**Stretch.** Multi-currency payouts; Hold payouts for risk-flagged sellers

### Event-sourced inventory with projections for a 200-store retail chain
`mx-svc-inventory-event-sourced` · Y3 · level 5 · 36 h · Go or Rust, PostgreSQL or an embedded log, Parquet for snapshots

**Scenario.** Greenfold's stock counts differ between POS, e-commerce and warehouse systems. They want one immutable event stream of stock movements with rebuildable projections and audit-grade history.

**Functional.** Append stock events (receive, sell, adjust, transfer, shrink) with versioned schemas; Build projections: on-hand per store, available-to-promise, movement history; Rebuild any projection from scratch and compare to live; Handle out-of-order and duplicate events; Snapshot to bound rebuild time

**Non-functional.** Ingest 5,000 events/s sustained; Projection lag p99 under 2 s; Full rebuild of 100M events in under 20 minutes using snapshots and parallelism

**Constraints.** Single node plus a log; Budget under $40/month for tests

**Architecture.** An append-only log per store partition feeds idempotent projectors with per-aggregate sequence checks; snapshots every N events bound recovery. Components: Event log, Schema registry, Projectors, Snapshotter, Rebuild tool, Divergence checker

**Data.** Synthetic: 200 stores, 30k SKUs, 100M events with late and duplicate arrivals

**Milestones.** Event schemas and log append API (7 h) · Idempotent projectors with sequence gaps handling (9 h) · Snapshotting and parallel rebuild (8 h) · Divergence checker and fault injection (7 h) · Benchmarks and write-up (5 h)

**Deliverables.** repo; benchmark report; design doc with 3 ADRs

**Done when.** 5,000 events/s sustained, lag p99 under 2 s, rebuild of 100M events under 20 minutes, divergence checker reports 0 differences after duplicate and reorder injection.

**Measure.** Ingest throughput, projection lag, rebuild time, divergence count

**Pitfalls.** Projections mutated by hand; Schema evolution breaking old events; Gap detection missing silently lost events

**Stretch.** Time-travel stock queries; Upcasting pipeline for old events

### Sharded search with zero-downtime reindexing for a job board
`mx-svc-search-sharded-reindex` · Y3 · level 5 · 38 h · Go or Rust, embedded index library or earlier project core, Docker

**Scenario.** Hireloom lists 12M job posts and changes its ranking features monthly. Reindexing takes hours and causes stale results, so they need sharded search with alias-style cutover and live-update streaming.

**Functional.** Hash-shard documents across N nodes with scatter-gather queries; Dual-write live updates during a reindex; Build new index version in the background and swap atomically; Per-shard replicas with failover; Consistency checker comparing old and new versions

**Non-functional.** Query p99 under 80 ms across 8 shards at 500 QPS; Reindex of 12M docs with zero failed queries and lag under 10 s; Search survives loss of one replica with p99 under 150 ms

**Constraints.** Runs on a laptop with containers for nodes; Budget zero

**Architecture.** A coordinator fans queries to shard replicas and merges top-k; a reindexer builds a new version while a change stream is replayed, then flips a version pointer. Components: Coordinator, Shard nodes, Reindexer, Change stream, Version pointer, Consistency checker

**Data.** Synthetic 12M job documents with update stream

**Milestones.** Shard nodes and scatter-gather (9 h) · Replication and failover (8 h) · Reindexer with change replay (9 h) · Atomic cutover and checker (6 h) · Chaos and load tests (6 h)

**Deliverables.** repo; chaos report; design doc with 3 ADRs

**Done when.** During a full reindex under 500 QPS there are 0 failed queries, update lag stays under 10 s, query p99 under 80 ms, and killing a replica keeps p99 under 150 ms.

**Measure.** Query percentiles, reindex duration, update lag, divergence count

**Pitfalls.** Losing updates between snapshot and stream start; Skewed shard sizes; Top-k merge wrong when shards return different scoring statistics

**Stretch.** Rebalancing on shard add; Learning-to-rank features

### Time-series rollup store for an IoT fleet monitoring product
`mx-svc-metrics-rollup-tsdb` · Y3 · level 5 · 40 h · Rust or Go or C++

**Scenario.** Coldchain Eye monitors 50,000 refrigerated trailers reporting every 10 seconds. Raw storage is costing too much, so they need compressed storage with automatic rollups and fast range queries.

**Functional.** Ingest points with series labels and write to a compressed columnar block format; Delta-of-delta timestamp and XOR float compression; Automatic rollups to 1 m, 15 m and 1 h with retention per tier; Range queries with downsampling and aggregation; Out-of-order write window

**Non-functional.** Ingest 500,000 points/s on 4 cores; Compression below 2 bytes per point on realistic data; Query of 7 days for one series p99 under 50 ms

**Constraints.** Single node; Disk under 100 GB for tests

**Architecture.** A memtable with a WAL flushes to immutable compressed blocks indexed by series and time; background jobs create rollup tiers and apply retention. Components: WAL and memtable, Block format, Series index, Rollup compactor, Query engine, Benchmark suite

**Data.** Synthetic sensor simulator with drift, gaps and spikes; optionally public sensor datasets

**Milestones.** Series index and memtable with WAL (8 h) · Gorilla-style compression blocks (9 h) · Query engine and downsampling (8 h) · Rollup tiers and retention (8 h) · Out-of-order handling and benchmarks (7 h)

**Deliverables.** repo; benchmark report; format spec

**Done when.** 500k points/s ingest, under 2 bytes per point, 7-day single series query p99 under 50 ms, rollups matching raw aggregates exactly.

**Measure.** Ingest rate, bytes per point, query percentiles, rollup error

**Pitfalls.** High-cardinality label explosion; Rollup of averages without counts; Clock skew in devices

**Stretch.** Cardinality limits and alerts; Query result cache

### Operational-transform backend for a collaborative requirements editor
`mx-svc-collab-doc-ot-backend` · Y3 · level 5 · 40 h · TypeScript or Rust or Go, PostgreSQL

**Scenario.** Specly lets analysts co-edit requirement documents but their sync breaks on concurrent edits. They want a server-authoritative OT backend with durable history, presence cursors and snapshot compaction.

**Functional.** Server-ordered operations with transform against concurrent ops; Client acknowledgement and rebase protocol; Durable operation log with periodic snapshots; Document load by snapshot plus tail replay; Convergence property tests across random schedules

**Non-functional.** 50 simultaneous editors on one document with apply p99 under 40 ms; Convergence in 100,000 randomised concurrent schedules; Load a 1M-op document in under 3 s using snapshots

**Constraints.** Plain-text documents only; No existing OT library

**Architecture.** A per-document actor serialises incoming ops, transforms them against unacknowledged history, appends to the log and broadcasts. Clients keep a pending queue and transform incoming remote ops. Components: Document actor, Transform functions, Op log, Snapshotter, Client simulator, Property tester

**Data.** Synthetic editing sessions with random inserts and deletes

**Milestones.** Transform functions and property tests (10 h) · Server actor and op log (8 h) · Client protocol and simulator (8 h) · Snapshots and compaction (6 h) · Scale tests and write-up (8 h)

**Deliverables.** repo; convergence test report; design doc with 3 ADRs

**Done when.** 100,000 random schedules converge, 50 editors give apply p99 under 40 ms, 1M-op document loads under 3 s.

**Measure.** Convergence failures, apply latency, load time, log growth

**Pitfalls.** Transform functions failing TP2-style cases; Lost acknowledgements; Unbounded history

**Stretch.** Rich-text spans; Offline editing

### Consistency-aware multi-region read service with measured staleness
`mx-svc-replication-lag-consistency` · Y3 · level 5 · 38 h · Go or Rust, PostgreSQL, tc/netem or a latency proxy

**Scenario.** Atlas Rentals serves users in three regions from one write region, and users see stale bookings after edits. They want a read service offering session, bounded-staleness and strong reads, with staleness measured continuously.

**Functional.** Offer read modes: strong (primary), bounded-staleness, session-consistent; Version vectors or commit positions returned with writes; Continuous staleness probes per region; Automatic mode downgrade or upgrade per policy; Report of observed staleness distribution

**Non-functional.** Bounded mode never exceeds configured 2 s staleness in 10M reads with injected lag; Local-region read p99 under 20 ms; cross-region strong p99 under 200 ms (emulated latency); Probe overhead under 1 percent of capacity

**Constraints.** Regions emulated with network delay injection; Budget zero

**Architecture.** Each region's replica publishes its applied position; the read service compares to required positions and either serves locally, waits briefly or forwards to the primary. Components: Write path tokens, Region replica monitor, Read mode policy, Forwarder, Staleness prober, Latency emulator

**Data.** Synthetic booking workload with edit-then-read patterns

**Milestones.** Three-region emulated topology (8 h) · Position tokens and read modes (9 h) · Staleness probes and policy (7 h) · Fault and lag injection runs (8 h) · Analysis and write-up (6 h)

**Deliverables.** repo; staleness report; design doc with ADRs

**Done when.** No bounded-mode read exceeds 2 s staleness across 10M reads under injected lag, local p99 under 20 ms, strong p99 under 200 ms.

**Measure.** Staleness distribution, violation count, latency by mode, forward rate

**Pitfalls.** Using wall-clock time across regions; Waiting forever for lagging replicas; Hidden stale reads through caches

**Stretch.** Causal consistency across entities; Client-side token propagation SDK

### Regional failover automation and drills for a ticketing backend
`mx-svc-multiregion-failover-drill` · Y3 · level 5 · 36 h · Go or Python, PostgreSQL, HAProxy-style proxy, Docker

**Scenario.** Showtix promised customers a 5-minute recovery objective if a region fails, but has never tested it. They need failover automation, fencing to prevent split brain and a repeatable drill harness.

**Functional.** Health detection with quorum across observers; Promote a replica region and repoint traffic; Fence the old primary to prevent split brain; Reconciliation of writes lost in the replication gap; Scripted drill harness producing an RTO/RPO report

**Non-functional.** RTO under 5 minutes and RPO under 10 s in 20 drills; Zero split-brain incidents in injected partitions; Failback completes with data verified identical

**Constraints.** Containers emulating 3 regions; No managed failover service

**Architecture.** Observers vote on region failure; a controller promotes with a fencing token that storage layers check. Lost-window writes are exported for manual or automated replay. Components: Health observers, Failover controller, Fencing tokens, Traffic switch, Gap reconciler, Drill harness

**Data.** Synthetic ticketing workload during drills

**Milestones.** Topology and health observers (7 h) · Controller and promotion (8 h) · Fencing and split-brain tests (8 h) · Gap reconciliation and failback (7 h) · 20-drill campaign and report (6 h)

**Deliverables.** repo; drill report; runbook; ADR on fencing

**Done when.** 20 drills achieve RTO under 5 minutes and RPO under 10 s, 0 split-brain writes detected in partition tests, failback verification diff empty.

**Measure.** RTO, RPO, false-positive failovers, reconciled-write count

**Pitfalls.** Failing over on a flaky observer; Old primary accepting writes after partition heals; Untested failback

**Stretch.** Chaos scheduling in CI; Automatic DNS TTL tuning

### Durable workflow engine with event-sourced history for order fulfilment
`mx-svc-durable-workflow-engine` · Y3 · level 5 · 40 h · Go or Python or Rust, PostgreSQL

**Scenario.** Parcelo's order flows span payment, picking, shipping and returns over days, and ad-hoc state machines keep losing state. They want a small durable workflow engine in the style of replayable workflows with timers and signals.

**Functional.** Define workflows as code with deterministic replay; Persist history of activity results, timers and signals; Replay on worker restart to rebuild state; Durable timers and external signals; Versioning for in-flight workflows

**Non-functional.** Run 10,000 concurrent workflows with step latency p99 under 100 ms; Kill workers randomly: 0 lost or duplicated activity completions in 1M steps; Replay of a 5,000-event history in under 200 ms

**Constraints.** Single database for history; No existing workflow framework

**Architecture.** Workers run workflow code against a history log; the engine detects nondeterminism on replay and dispatches activities with at-least-once semantics plus idempotency keys. Components: History store, Workflow runtime, Activity dispatcher, Timer service, Signal API, Replay checker

**Data.** Synthetic order workflows with failures, timers and signals

**Milestones.** History model and replay runtime (10 h) · Activities with retries and idempotency (8 h) · Timers and signals (7 h) · Nondeterminism detection and versioning (7 h) · Chaos tests and benchmarks (8 h)

**Deliverables.** repo; chaos report; design doc with 3 ADRs

**Done when.** 10,000 concurrent workflows, step p99 under 100 ms, 0 lost or duplicated completions across 1M steps with random kills, 5,000-event replay under 200 ms.

**Measure.** Step latency, replay time vs history length, duplicate/lost counts, timer accuracy

**Pitfalls.** Nondeterministic code (time, random) in workflows; History growth without continue-as-new; Activity retry without idempotency

**Stretch.** Child workflows; Visibility search over running workflows

## systems-networking

### Hardened HTTP/1.1 request parser and static file server in C
`mx-sys-tiny-http-parser-c` · Y1-P1 · level 3 · 28 h · C with libFuzzer or AFL

**Scenario.** A hobby hosting collective wants a tiny static-file server written in C but is afraid of memory bugs. You'll write it with safety discipline: sanitizers, fuzzing and strict limits.

**Functional.** Incremental HTTP/1.1 request-line and header parser; Static file serving with path normalisation and Range; Keep-alive and connection limits using poll; Configurable limits for header size and request time; ASan/UBSan and fuzz targets in CI

**Non-functional.** Serve 20,000 req/s of a 4 KB file on one core; Run 10 million fuzz executions with no sanitizer findings; Reject path traversal in all 50 attack test cases

**Constraints.** C11 only, no third-party HTTP libraries; Single thread

**Architecture.** A poll loop drives a per-connection state machine with a streaming parser that never allocates unbounded memory. Components: Parser, Connection state machine, File server, Limits, Fuzz harness, Test suite

**Data.** Generated requests and a public path-traversal pattern list

**Milestones.** Parser design and tests (7 h) · Poll loop and connections (6 h) · Static files and Range (5 h) · Fuzzing and sanitizers (5 h) · Benchmarks (3 h) · Write-up (2 h)

**Deliverables.** repo with README; fuzzing report; security notes

**Done when.** 20k req/s on one core, 10M fuzz execs clean, 50/50 traversal cases rejected.

**Measure.** req/s, fuzz coverage, bugs found and fixed, memory

**Pitfalls.** Integer overflows in length handling; Header smuggling via duplicate Content-Length; Partial reads splitting tokens

**Stretch.** Add TLS via a library; Port the parser to Rust and compare

### Custom memory allocator tuned for a packet-processing service
`mx-sys-slab-allocator-service` · Y1-P1 · level 4 · 30 h · C++ or C

**Scenario.** A C++ packet processor spends 25% of its time in malloc due to fragmentation from millions of small, short-lived objects. Build a thread-caching slab allocator and measure it.

**Functional.** Size-class slab allocator with per-thread caches; Central free lists with batch transfer; Fragmentation and usage statistics API; Debug mode with canaries and double-free detection; LD_PRELOAD shim to test with real programs

**Non-functional.** At least 2x faster than system malloc on a mixed small-object benchmark with 8 threads; Memory overhead under 15% versus live bytes; Zero detected corruption across 1 hour of randomised stress

**Constraints.** Linux, mmap-based backing only; No use of existing allocator source

**Architecture.** Thread-local caches serve most requests from per-size slabs, refilling from a shared central pool backed by mmap. Components: Size classes, Thread cache, Central pool, Debug mode, Stats API, Benchmark suite

**Data.** Synthetic allocation traces with realistic size distributions

**Milestones.** Study and trace workload (5 h) · Single-thread slab allocator (7 h) · Thread caches and central lists (8 h) · Debug mode and stress tests (5 h) · Benchmarks (5 h)

**Deliverables.** repo with README; benchmark report; design notes

**Done when.** >=2x faster than system malloc at 8 threads, overhead <15%, 1 hour stress clean.

**Measure.** ops/s, fragmentation, RSS, tail latency of alloc

**Pitfalls.** False sharing between thread caches; Cross-thread frees; Unbounded cache memory

**Stretch.** Add huge-page support; Add memory reclaim to the OS

### Caching DNS resolver for a 6,000-student campus
`mx-sys-campus-dns-cache` · Y2 · level 3 · 31 h · Go or Rust, UDP/TCP sockets

**Scenario.** Eastfield Technical College's resolvers slow to a crawl at 9 a.m. when lecture halls connect at once, and IT cannot see which domains are failing. They want a caching recursive-forwarder with visibility into hit rates and negative responses.

**Functional.** Parse and build DNS messages over UDP with TCP fallback for truncated answers; TTL-respecting cache with negative caching and serve-stale on upstream failure; Request coalescing so identical in-flight queries hit upstream once; Local-zone overrides for campus hostnames; Query log with top-domain and NXDOMAIN statistics endpoint

**Non-functional.** Cache hit latency p99 under 1 ms at 20,000 queries/s; Memory capped at 256 MB with LRU eviction; Zero crashes over 10 million fuzzed malformed packets

**Constraints.** Single process on one 4-core VM; No DNSSEC validation required

**Architecture.** An event-loop server decodes queries, consults a sharded TTL cache, and forwards misses to upstream resolvers with coalescing. Components: Wire codec, TTL cache, Upstream forwarder, Coalescing table, Local zones, Stats endpoint

**Data.** Synthetic query trace with Zipf-distributed names, plus replayed public top-domains list

**Milestones.** DNS codec with compression pointers and fuzz tests (7 h) · Cache with negative and stale serving (6 h) · Forwarder and coalescing (6 h) · Load generator with Zipf trace (5 h) · Stats endpoint and local zones (4 h) · Benchmark and write-up (3 h)

**Deliverables.** repo with README; benchmark report; fuzzing report; runbook

**Done when.** 20k qps sustained with hit p99 <1 ms, memory under 256 MB, and fuzz run completes with no panics.

**Measure.** hit ratio, latency percentiles, upstream queries saved by coalescing, memory

**Pitfalls.** Compression-pointer loops; Cache poisoning via unvalidated response IDs; Ignoring TTL zero

**Stretch.** Add DNS-over-TLS upstream; Add prefetch of expiring popular names

### HTTP reverse proxy with edge cache for a regional news site
`mx-sys-edge-cache-proxy` · Y2 · level 3 · 32 h · Rust (tokio) or Go

**Scenario.** Harbor Gazette serves 1.5 million page views a day from one overloaded origin and spikes on breaking news. They need a caching reverse proxy in front that respects cache headers and survives origin hiccups.

**Functional.** HTTP/1.1 proxying with keep-alive upstream connection pool; Cache keyed on method, host, path and Vary headers honouring Cache-Control and ETag revalidation; Stale-while-revalidate and stale-if-error behaviour; Request collapsing on cache miss to protect the origin; Purge endpoint by URL and by surrogate tag

**Non-functional.** Serve cached hits at 15,000 req/s on 2 cores with p99 under 5 ms; Origin load reduced by at least 90% on a news-spike replay; Disk cache of 20 GB with bounded index memory under 200 MB

**Constraints.** Use a single binary and no external cache service; Plain HTTP between proxy and origin

**Architecture.** An async server parses requests, looks up an on-disk store via an in-memory index, and fetches from origin through a pooled client on miss. Components: Request parser, Cache index, Disk object store, Origin pool, Revalidation logic, Purge API

**Data.** Synthetic traffic modelled on a Zipf article popularity curve with a burst phase

**Milestones.** HTTP parsing and proxy path (6 h) · Cache semantics from RFC rules (7 h) · Disk store and eviction (7 h) · Collapsing and stale handling (5 h) · Load test with spike trace (4 h) · Report (3 h)

**Deliverables.** repo with README; benchmark report; design doc; ADR on eviction policy

**Done when.** Spike replay yields >=90% origin reduction and 15k req/s hit throughput with p99 under 5 ms.

**Measure.** hit ratio, origin requests, p50/p99, memory per million objects

**Pitfalls.** Caching responses with Set-Cookie; Thundering herd on expiry; Vary header explosion

**Stretch.** Add range-request caching; Add tiered parent/child cache

### Compact binary protocol and gateway for 800 soil sensors
`mx-sys-iot-binary-protocol` · Y2 · level 3 · 30 h · C or Rust

**Scenario.** GreenRow Farms has 800 battery sensors over LoRa-style links with 50-byte frames and 1% duty cycle. Their JSON-over-HTTP prototype wastes airtime, so they need a compact versioned protocol and gateway.

**Functional.** Define a frame format with varint fields, message types, sequence numbers and CRC; Codec library with schema evolution (new optional fields ignored by old readers); Gateway reassembling fragments and acknowledging with selective retransmit; Device simulator generating 800 nodes with loss and reordering; Decoder that exports readings to a time-series file

**Non-functional.** Typical reading frame at most 24 bytes; Gateway handles 800 devices at 1 message per 5 min per device with zero loss at 10% link loss through retries; Codec fuzzed with 5 million random frames without crashes

**Constraints.** Frames cannot exceed 50 bytes; No dynamic allocation in the device-side encoder

**Architecture.** A protocol spec drives a codec used by both a simulated device and a gateway that handles dedup, ack and persistence. Components: Protocol spec, Codec, Fragmenter, Gateway state machine, Lossy link simulator, Exporter

**Data.** Synthetic soil moisture/temperature readings generated by a seeded model

**Milestones.** Spec and frame layout decisions (4 h) · Codec with property tests (7 h) · Fragmentation and ACK logic (7 h) · Lossy simulator and 800-node test (6 h) · Fuzzing and size analysis (4 h) · Docs (2 h)

**Deliverables.** repo with README; protocol spec document; fuzzing report

**Done when.** Reading frames <=24 bytes and 800-node simulation at 10% loss reports zero lost readings after retries.

**Measure.** bytes per reading, airtime saved vs JSON, delivery ratio, retransmit rate

**Pitfalls.** Endianness assumptions; Sequence number wraparound; Backwards-incompatible field reuse

**Stretch.** Add authenticated encryption with replay protection; Add a delta-encoding mode

### Real-time leaderboard for a 2-million-player mobile game
`mx-sys-realtime-leaderboard` · Y2 · level 3 · 30 h · Rust, C++ or Go

**Scenario.** Tidal Games' puzzle title has 2 million players and wants global, friends-only and per-region rankings that update instantly. A SQL ORDER BY query timed out at last tournament.

**Functional.** Score submission API with monotonic best-score semantics; Global rank and top-N queries; Rank-around-me query returning 5 above and 5 below; Friends leaderboard computed from a friend list; Daily and weekly rotating boards

**Non-functional.** Rank query p99 under 10 ms with 2 million entries; Sustain 5,000 score updates/s; Memory under 1.5 GB per node

**Constraints.** Single machine first, with a documented sharding plan; No external managed services

**Architecture.** A custom order-statistic structure serves ranks, with writes batched through a log and boards snapshotted periodically. Components: Order-statistic tree or skip list, Write batcher, Snapshot and recovery, Friends query, API server, Load generator

**Data.** Synthetic players with log-normal scores and a power-law friend graph

**Milestones.** Compare data structures on ranks (6 h) · Implement order-statistic structure (7 h) · API and write path (5 h) · Snapshot and crash recovery (6 h) · Load tests and sharding design (6 h)

**Deliverables.** repo with README; benchmark report; sharding design doc

**Done when.** 2 million entries, 5,000 updates/s, rank p99 under 10 ms, memory under 1.5 GB.

**Measure.** rank latency percentiles, update throughput, memory per entry, recovery time

**Pitfalls.** Tie-breaking nondeterminism; Rank staleness after snapshot restore; Hot-board lock contention

**Stretch.** Shard by score range; Approximate ranks with sketches for the long tail

### Log shipper with disk buffering for 300 edge servers
`mx-sys-structured-log-shipper` · Y2 · level 3 · 32 h · Go or Rust

**Scenario.** Bluefin Retail has 300 store servers on flaky links, and logs vanish when connectivity drops. They need a lightweight shipper that tails files, buffers on disk and forwards reliably to a central collector.

**Functional.** Tail rotating log files with checkpointed offsets; Parse lines into structured records with multiline support; Disk-backed queue with at-least-once delivery; Batched compressed forwarding with backoff; Backpressure when the collector is slow

**Non-functional.** Idle memory under 30 MB; Ship 50,000 lines/s per node with CPU under one core; Zero lost lines across 100 forced crashes and a 30-minute network outage

**Constraints.** Disk buffer capped at 2 GB; Single static binary

**Architecture.** File watchers feed a parser into a segmented on-disk queue; a sender drains batches to the collector with acknowledgements. Components: File tailer, Parser, Segment queue, Sender, Checkpoint store, Collector stub

**Data.** Synthetic log generator with rotation and multiline stack traces

**Milestones.** Tailing, rotation and offsets (7 h) · Parser and multiline (5 h) · Disk queue (7 h) · Sender and backpressure (5 h) · Crash and outage testing (5 h) · Report (3 h)

**Deliverables.** repo with README; crash-test report; benchmark

**Done when.** Zero lost lines over 100 crashes and a 30-min outage; 50k lines/s; idle memory <30 MB.

**Measure.** lines/s, memory, loss/duplicate counts, recovery time

**Pitfalls.** Inode reuse after rotation; Duplicates after crash between send and checkpoint; Unbounded queue growth

**Stretch.** Add an on-the-fly redaction filter; Add adaptive batch sizing

### Fault-injection TCP/HTTP proxy for chaos testing
`mx-sys-fault-injection-proxy` · Y2 · level 3 · 30 h · Go or Rust

**Scenario.** Larkspur Health's SRE team wants to test timeouts and retries before incidents do it for them. They need a proxy to add latency, drops and resets between services.

**Functional.** TCP proxy with per-route fault rules; Fault types: added latency, bandwidth cap, connection reset, blackhole, HTTP 5xx injection; Runtime control API to enable and disable faults; Probabilistic and scheduled faults; Event log of injected faults

**Non-functional.** Added overhead under 0.5 ms p99 with no faults at 10,000 req/s; Latency injection accurate within 5 ms; Runtime rule change effective within 100 ms

**Constraints.** Single binary; Works with plain TCP and HTTP/1.1

**Architecture.** A listener routes connections via rules to an upstream and passes bytes through a pipeline of fault stages. Components: Listener and router, Stage pipeline, Fault stages, Control API, Fault logger, Demo target app

**Data.** A demo client/server pair with retry logic to test

**Milestones.** Proxy core (6 h) · Fault stages (7 h) · Control API and rules (5 h) · Demo experiments showing retry bugs (6 h) · Overhead benchmark (3 h) · Write-up (3 h)

**Deliverables.** repo with README and demo GIF; experiments report; runbook

**Done when.** No-fault overhead <0.5 ms p99, injected latency within 5 ms, rule changes effective <100 ms.

**Measure.** overhead, injection accuracy, bugs found in demo app

**Pitfalls.** Slow-loris style resource leaks; Latency applied per-chunk not per-request; Deadlocks in bandwidth shaping

**Stretch.** Add record and replay; Add gRPC-aware faults

### MQTT-style pub/sub broker for 20,000 smart-home hubs
`mx-sys-mqtt-lite-broker` · Y2 · level 3 · 32 h · Rust, Go or C++

**Scenario.** Homely Systems' hubs report over a text protocol to a single Python server that tips over at 5,000 connections. They want a small broker supporting retained messages and QoS 1.

**Functional.** Implement CONNECT, PUBLISH, SUBSCRIBE and PINGREQ packet handling per the MQTT 3.1.1 spec; Topic trie with + and # wildcards; Retained messages and last-will; QoS 0 and QoS 1 with per-session in-flight state; Persistent sessions across reconnects

**Non-functional.** 20,000 concurrent connections in under 500 MB; Publish-to-delivery p99 under 10 ms at 20,000 msgs/s; Pass a conformance subset of 40 scripted tests

**Constraints.** Single node; No TLS in the exercise

**Architecture.** An async event loop owns session state and a topic trie, with a store for retained messages and QoS 1 retries. Components: Packet codec, Topic trie, Session manager, QoS 1 tracker, Retained store, Load generator

**Data.** Synthetic hub fleet publishing telemetry

**Milestones.** Codec and fuzzing (6 h) · Topic trie and routing (6 h) · Sessions and QoS 1 (8 h) · Retained and last-will (4 h) · Load test and conformance (5 h) · Report (3 h)

**Deliverables.** repo with README; conformance results; benchmark report

**Done when.** 20k connections <500 MB, p99 delivery <10 ms at 20k msg/s, 40/40 conformance tests pass.

**Measure.** connections, memory per connection, latency, throughput

**Pitfalls.** Wildcard matching bugs with $ topics; Duplicate delivery on reconnect; Unbounded in-flight queues

**Stretch.** Add clustering via bridge; Add shared subscriptions

### Content-defined-chunking backup tool with deduplication
`mx-sys-dedup-backup-tool` · Y2 · level 3 · 30 h · Rust or Go

**Scenario.** A video editing shop backs up 6 TB nightly and 90% of data is unchanged. They want a restic-like tool with dedup, encryption and verifiable restores.

**Functional.** Rolling-hash content-defined chunking; Content-addressed chunk store with reference counting; Snapshot manifests and incremental backup; Restore with integrity verification; Prune of unreferenced chunks

**Non-functional.** Backup throughput of at least 200 MB/s on SSD; Dedup ratio reported on a mutated dataset with 10% change achieves at least 8x over full copies; Chunk store index under 1 GB per 10 TB

**Constraints.** Encrypt with a vetted library; Local directory repository backend

**Architecture.** A chunker streams files into a content-addressed store while snapshots record file-to-chunk lists. Components: Chunker, Chunk store, Snapshot manager, Restore verifier, Pruner, Benchmark generator

**Data.** Synthetic datasets with controlled mutation rates

**Milestones.** Chunking algorithm and parameters (6 h) · Chunk store and index (7 h) · Snapshots and restore (7 h) · Encryption and verification (4 h) · Prune and GC safety (3 h) · Benchmarks (3 h)

**Deliverables.** repo with README; dedup experiments; design doc

**Done when.** 200 MB/s backup, 8x dedup on 10%-change dataset, restore hash-verifies 100%.

**Measure.** throughput, dedup ratio, index size, restore time

**Pitfalls.** Chunk size distribution too narrow; GC deleting chunks of in-progress snapshot; Weak hash collisions

**Stretch.** Add remote object storage backend; Compare chunk size parameters

### Packet-capture and anomaly-detection tool for a school network
`mx-sys-pcap-anomaly-tool` · Y2 · level 4 · 34 h · Rust or C++, optionally Python for analysis

**Scenario.** Lakeview High's IT teacher suspects a few lab machines are scanning the network and beaconing out at night but has only raw captures. They need a tool that turns captures into flows and flags suspicious behaviour.

**Functional.** Read pcap files and live interface capture, decoding Ethernet, IP, TCP, UDP and DNS headers; Aggregate packets into bidirectional flows with timing and size features; Detect port scans, periodic beaconing and DNS-tunnel-like queries; Emit alerts as JSON with evidence flows; Replay mode to evaluate detectors on labelled data

**Non-functional.** Process 1 Gbit/s equivalent offline captures at >=300k packets/s; Precision of at least 0.9 and recall of at least 0.8 on the labelled test set; Memory under 1 GB for 5 million flows

**Constraints.** Offline-capable laptop deployment; No payload decryption

**Architecture.** A capture layer feeds a zero-copy decoder, a flow table, and a detector bank whose outputs are scored against labels. Components: Capture reader, Protocol decoder, Flow table, Detectors, Alert writer, Evaluation harness

**Data.** Public intrusion-detection capture datasets such as CIC-IDS style flows, plus self-generated scan traffic with nmap in a lab VM

**Milestones.** Packet decoder and pcap reader (7 h) · Flow aggregation (6 h) · Rule-based detectors (7 h) · Statistical beacon and tunnel detector (6 h) · Evaluation against labels (5 h) · Write-up (3 h)

**Deliverables.** repo with README and demo GIF; evaluation report; detector design notes

**Done when.** Throughput >=300k pps, and precision >=0.9 / recall >=0.8 on the held-out labelled capture.

**Measure.** packets/s, precision, recall, false positives per hour, memory per flow

**Pitfalls.** Ignoring IP fragmentation and out-of-order TCP; Training and test data from the same attack run; Flow timeout choice hiding slow scans

**Stretch.** Add an isolation-forest detector; Add live eBPF-based capture

### Minimal container runtime for a CI system
`mx-sys-ci-container-runtime` · Y2 · level 4 · 35 h · Rust or Go (or C)

**Scenario.** Forge Labs' CI runs untrusted pull-request jobs on shared runners and wants stronger isolation than plain processes without the weight of a full container engine. They need a small runtime using Linux namespaces and cgroups.

**Functional.** Run a command in new PID, mount, UTS, IPC and network namespaces from an extracted root filesystem; Apply cgroup v2 memory, CPU and pids limits; Overlay filesystem for copy-on-write job workspaces; Basic bridge networking with optional no-network mode; Job log capture with exit code and resource usage

**Non-functional.** Container start in under 150 ms from cached image; Memory limit enforced: fork bomb and 4 GB allocation attempts are contained; Run 50 concurrent jobs on 8 cores with no cross-job file visibility

**Constraints.** Linux with cgroup v2; Rootless is stretch only

**Architecture.** A launcher clones into namespaces, prepares overlay and cgroups, drops capabilities, and execs the job while a supervisor collects logs. Components: Namespace launcher, Overlay manager, Cgroup controller, Network setup, Capability and seccomp drop, Supervisor

**Data.** Public minimal rootfs such as an Alpine-style mini root filesystem; synthetic hostile jobs

**Milestones.** Namespaces and pivot_root (8 h) · Overlay workspaces (5 h) · Cgroup limits and hostile job tests (7 h) · Networking (6 h) · Seccomp and capabilities (5 h) · Benchmarks and report (4 h)

**Deliverables.** repo with README and demo GIF; isolation test suite; benchmark report

**Done when.** Start <150 ms, hostile-job suite contained, and 50 concurrent jobs show no cross-visibility.

**Measure.** startup latency, density per host, containment results, overhead vs bare process

**Pitfalls.** Leaking host mounts via shared propagation; Zombie processes without a proper init; Cgroup cleanup races

**Stretch.** Rootless mode with user namespaces; Checkpoint warm root filesystems

### Sampling CPU profiler with flame graphs for Linux services
`mx-sys-sampling-profiler` · Y2 · level 4 · 32 h · C++ or Rust

**Scenario.** A backend team at Orbit Commerce sees unexplained p99 spikes and can't attach heavy tracers in production. They want a low-overhead sampling profiler that produces flame graphs.

**Functional.** Sample stack traces using perf_event_open at a configurable frequency; Resolve addresses via symbol tables and frame-pointer unwinding; Aggregate samples to folded stacks and render an interactive SVG flame graph; Filter by process, thread and time window; Differential flame graph between two runs

**Non-functional.** Overhead under 3% at 99 Hz on a CPU-bound service; Symbol resolution for 95% of samples in a test app; Handle 64 threads without sample loss above 1%

**Constraints.** Linux x86-64 or arm64 with frame pointers enabled in test binaries; Needs only perf_event permission

**Architecture.** A collector reads sampled stacks from perf ring buffers, a resolver maps addresses to symbols, and a renderer builds the flame graph. Components: perf_event reader, Unwinder, Symbolizer, Aggregator, SVG renderer, Diff tool

**Data.** Own benchmark programs with planted hotspots

**Milestones.** perf_event setup and ring buffer (7 h) · Unwinding and symbolization (8 h) · Aggregation and flame graph (6 h) · Differential view (4 h) · Overhead measurement with planted hotspots (5 h) · Write-up (2 h)

**Deliverables.** repo with README and demo GIF; overhead report; accuracy report

**Done when.** Planted hotspots appear in top 3 frames, overhead <3% at 99 Hz, >=95% symbolized.

**Measure.** overhead percent, symbolization rate, sample loss, hotspot rank accuracy

**Pitfalls.** Skid and skewed attribution; Missing frame pointers; ASLR address mapping

**Stretch.** Off-CPU profiling; Add eBPF-based collection

### Event-driven HTTP server in Rust handling 100k connections
`mx-sys-epoll-http-server` · Y2 · level 4 · 30 h · Rust with libc

**Scenario.** Nimbus Ads' bid endpoint must handle bursty clients with tens of thousands of idle keep-alive connections. They want to understand if a hand-rolled epoll server beats their threaded prototype.

**Functional.** Non-blocking accept/read/write loop using epoll edge-triggered mode; HTTP/1.1 request parser with pipelining and keep-alive; Per-core worker threads using SO_REUSEPORT; Idle connection timeouts via timer wheel; Static JSON response and a small echo-of-body route

**Non-functional.** Hold 100,000 idle connections within 1 GB of memory; Serve 150,000 req/s on 4 cores with p99 under 3 ms; No fd leaks after 10 million connections opened and closed

**Constraints.** No async runtime crates; use libc/raw syscalls; Linux only

**Architecture.** Each worker thread owns an epoll instance, a slab of connections and a timer wheel, with no shared locks on the hot path. Components: Acceptor/reuseport setup, Connection slab, HTTP parser, Timer wheel, Worker loop, Load test harness

**Data.** Load generated with a self-written or standard benchmark tool against synthetic requests

**Milestones.** Epoll loop and connection state machine (8 h) · HTTP parser and keep-alive (6 h) · Multi-worker with reuseport (5 h) · Timer wheel and limits (5 h) · Benchmarks versus threaded baseline (6 h)

**Deliverables.** repo with README; benchmark report; perf flame graph analysis

**Done when.** 100k idle connections <1 GB, 150k req/s with p99 <3 ms, no fd leak.

**Measure.** req/s, p50/p99, memory per connection, syscalls per request

**Pitfalls.** Edge-triggered starvation bugs; Partial writes dropping data; Benchmark client being the bottleneck

**Stretch.** Add zero-copy sendfile for static files; Compare with the io_uring version

### Layer-4 load balancer with consistent hashing for a game backend
`mx-sys-maglev-l4-balancer` · Y2 · level 4 · 30 h · Go or Rust

**Scenario.** Starlit Studios runs 24 matchmaking servers behind DNS round-robin and loses sessions during deploys. They want a TCP load balancer with connection-stable hashing and health checks.

**Functional.** TCP proxy mode forwarding to backends; Maglev-style consistent hash lookup table; Active health checks with ejection and slow start; Connection draining on backend removal; Prometheus-style metrics endpoint

**Non-functional.** Disruption under 1% of existing flows when one of 24 backends is removed; Forward 50,000 new conns/s on 4 cores; Health check detects failure within 3 s

**Constraints.** User-space proxying only; Static backend list reloadable at runtime

**Architecture.** A listener hashes the client tuple to the lookup table, proxies bytes both ways, and a health prober updates table membership. Components: Listener, Maglev table builder, Proxy relay, Health prober, Drain controller, Metrics

**Data.** Synthetic client load with many flows and a failing-backend script

**Milestones.** Hash table algorithms and simulation of disruption (6 h) · TCP relay (6 h) · Health checking and slow start (6 h) · Draining and reload (5 h) · Load tests (5 h) · Report (2 h)

**Deliverables.** repo with README; disruption analysis; benchmark report

**Done when.** Removal of one backend disturbs <1% of flows, 50k conn/s sustained, failure detected within 3 s.

**Measure.** flow disruption, table build time, conn/s, balance skew

**Pitfalls.** Table rebuild causing a latency spike; Half-open connections during drain; Unbalanced load with weak hash

**Stretch.** Add weighted backends; Add DSR mode discussion

### Stateful packet-filter firewall engine for a small clinic
`mx-sys-packet-filter-engine` · Y2 · level 4 · 32 h · Rust or C++

**Scenario.** Dr. Alvarez's clinic wants simple, auditable firewall rules for its router VM instead of opaque vendor tools. They need a rule language and a stateful engine they can read and test.

**Functional.** Rule language parser with ordered rules, address sets and port ranges; Connection tracking for TCP, UDP and ICMP flows; Rule evaluation compiled to a decision structure; Dry-run mode replaying pcaps and printing verdicts; Rule linting for shadowed and contradictory rules

**Non-functional.** Evaluate 1 million packets/s with 200 rules on one core; Conntrack table of 500,000 flows under 300 MB; Zero verdict mismatches against a reference on 100,000 test packets

**Constraints.** Userspace engine using pcap or NFQUEUE for the exercise; IPv4 only

**Architecture.** Rules compile to a decision tree consulted after a conntrack lookup, producing allow, drop or reject verdicts. Components: Rule parser, Compiler, Conntrack table, Evaluator, Pcap replay, Linter

**Data.** Public pcap samples plus generated traffic

**Milestones.** Rule language design (4 h) · Conntrack (7 h) · Compiler/evaluator (8 h) · Replay and differential testing (6 h) · Linter (3 h) · Benchmarks and report (4 h)

**Deliverables.** repo with README; differential test report; rule language reference

**Done when.** 1M pps at 200 rules, conntrack 500k flows <300 MB, zero mismatches across 100k test packets.

**Measure.** packets/s, memory per flow, lint findings, mismatches

**Pitfalls.** TCP state tracking edge cases; Rule order semantics ambiguity; Timeout choice leaking flows

**Stretch.** Add rate-limit rules; Emit nftables rules from the same language

### strace-like tracer and seccomp policy generator
`mx-sys-syscall-tracer-sandbox` · Y2 · level 4 · 34 h · C, Rust or Go

**Scenario.** Delta Works hosts student code submissions and wants to lock them down but doesn't know which syscalls programs need. They want a tracer that records syscalls and emits a minimal allow-list.

**Functional.** Trace syscalls of a child process with ptrace including arguments decoding; Follow forks and threads; Aggregate counts and timing per syscall; Generate a seccomp-bpf allow-list policy from observed traces; Enforcement mode running the program with the policy and logging violations

**Non-functional.** Tracing overhead under 8x on a syscall-heavy benchmark; Generated policy runs 20 sample programs with zero false kills; Escape attempts in a 15-case test suite are blocked

**Constraints.** Linux x86-64; Run inside a throwaway VM

**Architecture.** A tracer attaches via ptrace, decodes syscalls from tables, builds a profile, and a policy builder emits BPF programs for enforcement. Components: ptrace driver, Syscall decoder, Fork/thread follower, Profile aggregator, BPF policy generator, Test suite

**Data.** Own set of sample programs and hostile test programs

**Milestones.** ptrace basics and decoder (8 h) · Fork/thread following (6 h) · Profile and policy generation (8 h) · Enforcement mode (5 h) · Hostile test suite (4 h) · Report (3 h)

**Deliverables.** repo with README and demo GIF; policy test report

**Done when.** 20 sample programs run under generated policies without false kills; 15/15 escape attempts blocked.

**Measure.** overhead factor, policy size, false kills, escape blocks

**Pitfalls.** Racy argument reads (TOCTOU); Missing clone/vfork handling; Over-permissive wildcards

**Stretch.** Use seccomp user-notify; Compare with eBPF-based tracing

### Crash-safe write-ahead log library with torture tests
`mx-sys-write-ahead-log-library` · Y2 · level 4 · 30 h · Rust, C++ or Go

**Scenario.** Several internal services at Ironbridge each implement their own WAL with subtle fsync bugs. They want one tested library with checksummed records and a crash-consistency test harness.

**Functional.** Append API with record framing, checksums and group commit; Segment rotation and truncation; Recovery stopping cleanly at torn records; Fault-injecting filesystem shim simulating power loss at arbitrary write boundaries; Replay iterator API

**Non-functional.** Group commit achieving at least 50,000 durable appends/s on SSD; Zero acknowledged-record losses in 5,000 simulated crash points; Recovery time under 2 s for 1 GB of log

**Constraints.** Single writer; POSIX file API only

**Architecture.** Appends are batched into a group commit fsync; recovery scans segments verifying checksums and stops at the first invalid record. Components: Record format, Group committer, Segment manager, Recovery, Crash-simulating filesystem, Tests

**Data.** Synthetic record streams

**Milestones.** Format design and fsync semantics study (5 h) · Append and group commit (7 h) · Segments and recovery (7 h) · Crash simulation harness (8 h) · Benchmarks and report (3 h)

**Deliverables.** repo with README; crash-consistency report; design doc

**Done when.** 5,000 crash points with zero acknowledged losses, >=50k durable appends/s, 1 GB recovery <2 s.

**Measure.** durable appends/s, latency p99, recovery time, crash-test pass rate

**Pitfalls.** Forgetting directory fsync; Reordered writes in the simulator; Checksums not covering length

**Stretch.** Add log compaction; Reader tailing a live log

### Linux character device driver and userspace library for a ring buffer
`mx-sys-kernel-module-char-device` · Y2 · level 4 · 32 h · C (kernel and userspace)

**Scenario.** A lab instrument vendor's userspace code copies sensor data too many times. They want a kernel-module ring buffer exposing a shared mmap region with poll-based wakeups.

**Functional.** Character device with ioctl for configuring ring size; mmap of a shared ring buffer to userspace; Producer side fed by a kernel timer simulating hardware interrupts; Poll/epoll wakeups on data availability; Userspace C library and benchmark tool

**Non-functional.** Sustain 1 million samples/s with zero drops to a polling reader; CPU under 15% of one core at that rate; Module unload/load 100 times with no leaks

**Constraints.** Test only inside a throwaway VM; Kernel 6.x

**Architecture.** The module owns a page-backed ring with head/tail indices; the library maps it and uses epoll to sleep when empty. Components: Kernel module, Ring buffer, ioctl interface, Poll wakeups, Userspace library, Benchmark tool

**Data.** Timer-generated synthetic samples

**Milestones.** Dev environment and module skeleton (5 h) · Ring buffer and mmap (8 h) · Producer and wakeups (6 h) · Userspace library (5 h) · Stress tests and leak checks (5 h) · Report (3 h)

**Deliverables.** repo with README; stress test report

**Done when.** 1M samples/s with zero drops, <15% CPU, 100 load/unload cycles leak-free.

**Measure.** samples/s, drops, CPU, wakeup latency

**Pitfalls.** Memory ordering between kernel and user; Page fault races on unmap; Kernel panics from bad pointers

**Stretch.** Add eventfd notification; Add a multi-reader mode

### Userspace TCP/IP stack subset over a TAP device
`mx-sys-userspace-tcp-stack` · Y2 · level 5 · 34 h · Rust or C

**Scenario.** A university networking lab wants students to see TCP internals running as code they can single-step. They need a small stack speaking ARP, IPv4, ICMP and TCP to a real Linux host.

**Functional.** TAP device I/O with Ethernet and ARP handling; IPv4 and ICMP echo; TCP three-way handshake, retransmission timer and sliding window; Congestion control with slow start and congestion avoidance; Socket-like API and a demo HTTP client

**Non-functional.** Download a 100 MB file from a Linux host at >=80% of link rate on a 1 Gbit virtual link; Survive 5% random loss with correct data hash; Pass 50 scripted packet-trace test cases

**Constraints.** Single-threaded; Subset only: no IP fragmentation, no TCP options beyond MSS and window scale

**Architecture.** A poll loop reads frames, dispatches by protocol to state machines, and a timer queue drives retransmissions. Components: TAP I/O, ARP and IP layer, TCP state machine, Timer queue, Congestion control, Socket API

**Data.** Own packet-trace tests, plus tc netem for loss

**Milestones.** ARP, IPv4, ICMP (6 h) · TCP handshake and teardown (7 h) · Reliability and windowing (8 h) · Congestion control (5 h) · Loss tests with netem (4 h) · Report (4 h)

**Deliverables.** repo with README and demo GIF; trace-based test suite; design notes

**Done when.** 100 MB transfer with matching hash at 0% and 5% loss, throughput >=80% of link rate with no loss.

**Measure.** throughput, retransmit count, cwnd traces, test pass rate

**Pitfalls.** Sequence number wraparound; Zero-window probes; Timer granularity errors

**Stretch.** SACK support; Compare cwnd against Linux Cubic

### Userspace VPN overlay for a 12-person architecture office
`mx-sys-office-overlay-vpn` · Y3 · level 4 · 32 h · Rust or C++, Linux TUN, network namespaces for testing

**Scenario.** Pinnacle Drafting, a 12-person architecture studio, has two offices and four remote staff who need to reach a shared file server without paying for a commercial VPN. The owner wants a self-hosted encrypted overlay that survives home routers and changing IPs.

**Functional.** TUN-based userspace peer with an authenticated key exchange using a vetted crypto library; Static peer config with public keys and allowed-IP routing table; UDP transport with keepalive and endpoint roaming when a peer's IP changes; Relay fallback through one public VPS when direct paths fail; CLI showing peer handshake age and byte counters

**Non-functional.** Throughput of at least 400 Mbit/s between two VMs on one host; Reconnect within 5 s after a peer's public IP changes; Per-packet overhead under 60 bytes

**Constraints.** Use an existing crypto library; never write your own primitives; Runs on Linux with a single static binary

**Architecture.** A TUN device feeds a packet pipeline that encrypts, routes by allowed-IP, and sends over UDP sockets managed by a peer state machine. Components: TUN reader/writer, Handshake and session keys, Allowed-IP routing trie, Peer roaming tracker, Relay forwarder, CLI status

**Data.** Synthetic traffic from iperf-style generator inside Linux network namespaces

**Milestones.** Design doc, threat model, wire format (4 h) · TUN pipeline and routing trie (6 h) · Handshake, rekeying and replay window (8 h) · Roaming and keepalive logic (5 h) · Relay fallback and netns test rig (5 h) · Benchmarks and write-up (4 h)

**Deliverables.** repo with README and demo GIF; design doc with threat model; benchmark report; 3 ADRs

**Done when.** Netns test shows >=400 Mbit/s, reconnect after IP change under 5 s, and a replayed packet is rejected.

**Measure.** throughput, CPU per Gbit, rekey interval, reconnect time, header overhead

**Pitfalls.** Replay window off-by-one after rekey; MTU mismatch causing silent fragmentation drops; Roaming accepted from unauthenticated packets

**Stretch.** Add NAT hole punching; Add a Noise-style identity hiding handshake

### Distributed cron scheduler for a 40-service platform team
`mx-sys-distributed-cron` · Y3 · level 4 · 35 h · Go or Rust with PostgreSQL

**Scenario.** Brightpay's platform team runs cron jobs on three servers, and last month a host reboot silently skipped payroll exports. They want a scheduler that runs each job exactly once per tick even when nodes die.

**Functional.** Cron-expression parser with time-zone and DST handling; Leader-elected scheduler using a lease in a shared store; Job execution on worker nodes with timeouts, retries and overlap policies; Persistent run history with missed-run catch-up policy; HTTP API to list, pause and trigger jobs

**Non-functional.** Failover to a new leader within 10 s; No duplicate or skipped runs across 1,000 ticks with random node kills; Handle 5,000 scheduled jobs with tick-latency p99 under 500 ms

**Constraints.** Use PostgreSQL or etcd for coordination only; Three-node docker-compose test environment

**Architecture.** A lease-holding scheduler computes due runs and dispatches idempotent run records to workers that claim them atomically. Components: Cron parser, Lease manager, Dispatcher, Worker agent, Run store, API

**Data.** Synthetic job definitions; chaos script kills processes

**Milestones.** Cron semantics and DST tests (6 h) · Lease-based leader election (6 h) · Run records and atomic claim (7 h) · Workers, retries, overlap policy (6 h) · Chaos test harness (6 h) · Report (4 h)

**Deliverables.** repo with README; chaos test report; design doc; runbook

**Done when.** 1,000-tick chaos run with random kills shows 0 duplicate and 0 skipped executions; failover under 10 s.

**Measure.** failover time, duplicate/skip count, tick latency, DB load

**Pitfalls.** Clock skew breaking lease validity; DST double-fire; Zombie leader continuing after lease loss

**Stretch.** Add DAG dependencies between jobs; Add a fencing-token check in workers

### Peer-to-peer folder sync for a freelance design collective
`mx-sys-p2p-folder-sync` · Y3 · level 4 · 35 h · Rust or Go

**Scenario.** Six freelance designers share 80 GB of assets and are tired of paying for cloud storage with sync conflicts. They want a direct device-to-device sync that handles offline edits and conflicts safely.

**Functional.** Content-defined chunking and a Merkle-style manifest per folder; Peer discovery on LAN and via a rendezvous server; Delta transfer of only missing chunks; Conflict detection with version vectors and conflict copies; File watcher with debounce

**Non-functional.** Initial sync of 10 GB at >=70% of link speed on gigabit LAN; Edit of a 200 MB file transfers under 5% of its size; No data loss in 1,000 randomised concurrent-edit scenarios

**Constraints.** No central storage of file contents; Works on Linux and macOS

**Architecture.** Each peer maintains a chunk store and manifest; sync exchanges manifests, computes missing chunks and resolves conflicts via version vectors. Components: Chunker, Manifest tree, Peer transport, Version vectors, Conflict resolver, Watcher

**Data.** Synthetic asset folders of mixed file sizes, plus a randomised edit simulator

**Milestones.** Chunking and manifest design (6 h) · Transport and delta exchange (8 h) · Version vectors and conflicts (7 h) · Watcher and offline handling (5 h) · Randomised simulator tests (5 h) · Report (4 h)

**Deliverables.** repo with README and demo GIF; test report; design doc

**Done when.** 10 GB sync >=70% link speed, 200 MB edit transfers <5% of size, 0 data losses over 1,000 scenarios.

**Measure.** throughput, delta ratio, conflicts created, data-loss count

**Pitfalls.** Rename detection producing delete+create; Clock-based conflict resolution; Partial-write files being synced

**Stretch.** Add end-to-end encryption; Add selective sync

### Service discovery and health-check system for a 60-instance cluster
`mx-sys-service-discovery-health` · Y3 · level 4 · 34 h · Go

**Scenario.** Zephyr Foods runs 60 service instances with hard-coded IPs, and failed nodes keep receiving traffic until someone edits a file. They want registration, DNS and HTTP lookup, and flaky-health smoothing.

**Functional.** Register and deregister with TTL leases and heartbeats; Active and passive health checks with flap damping; Lookup via HTTP API and a DNS interface; Watch API with long-poll updates; Metadata tags and subset queries

**Non-functional.** Failed instance removed from answers within 5 s; Lookup p99 under 5 ms at 10,000 lookups/s; Registry survives loss of 1 of 3 nodes

**Constraints.** Three nodes in docker-compose; Eventual consistency permitted with documented bounds

**Architecture.** Registry nodes replicate membership via anti-entropy while checkers publish health verdicts to the shared view. Components: Registry store, Lease manager, Health checker, DNS front end, Watch API, Replication

**Data.** Simulated services that crash, hang and flap

**Milestones.** Model and API (4 h) · Registry and leases (7 h) · Health checkers with damping (7 h) · DNS and watch front ends (6 h) · Failure simulations (6 h) · Report (4 h)

**Deliverables.** repo with README; failure-scenario report; design doc

**Done when.** Dead instance removed in <5 s, lookups p99 <5 ms at 10k/s, one node loss with no downtime.

**Measure.** detection time, flap rate, lookup latency, convergence time

**Pitfalls.** Split brain showing different answers; Health checks causing thundering herd; Flap oscillation

**Stretch.** Add zone-aware routing; Add client-side load balancing library

### SWIM gossip membership library with simulation
`mx-sys-swim-gossip-membership` · Y3 · level 4 · 34 h · Rust, Go or Python

**Scenario.** A startup building a 200-node edge compute fabric needs failure detection that does not funnel through a central coordinator. They'll adopt a SWIM-style protocol if it proves accurate and cheap.

**Functional.** Probe, indirect probe and suspect/confirm state machine; Piggybacked membership updates with incarnation numbers; Join, leave and rejoin handling; Discrete-event simulator with loss, delay and partitions; Real UDP implementation running 50 local processes

**Non-functional.** Detect a crashed node cluster-wide within 10 protocol periods at 200 nodes; False positive rate under 0.1% with 5% packet loss; Per-node bandwidth under 5 KB/s

**Constraints.** Deterministic simulator seeded for repeatability; UDP only

**Architecture.** Each node periodically probes a random peer, falls back to indirect probes, and disseminates updates piggybacked on messages. Components: State machine, Update disseminator, Simulator, UDP transport, Metrics collector, Experiment runner

**Data.** Simulator-generated failure scenarios

**Milestones.** Read-through of the protocol and state machine design (4 h) · Simulator (7 h) · Protocol implementation (8 h) · Experiments on loss and scale (8 h) · UDP process test (4 h) · Report with plots (3 h)

**Deliverables.** repo with README; experiment report with plots; design doc

**Done when.** 200 simulated nodes detect failure in <=10 periods, FP <0.1% at 5% loss, bandwidth <5 KB/s.

**Measure.** detection time distribution, false positives, bandwidth, convergence time

**Pitfalls.** Incarnation number bugs that resurrect dead nodes; Non-deterministic simulator; Suspicion timeout too short

**Stretch.** Add Lifeguard-style local health awareness; Add a gossip-based key-value layer

### Distributed tracing collector with tail-based sampling
`mx-sys-trace-collector` · Y3 · level 4 · 34 h · Go or Rust

**Scenario.** Parcelbox's 35 services emit spans, but storing all of them costs too much. They need a collector that keeps all error and slow traces and a fraction of the rest.

**Functional.** Ingest spans via a simple RPC protocol; Assemble traces keyed by trace id with timeout windows; Tail-based sampling policies on errors, latency and rate; Compact on-disk storage and trace lookup by id; Basic latency waterfall viewer

**Non-functional.** Ingest 100,000 spans/s per node; Keep 100% of error traces and under 10% overall; Trace lookup p99 under 100 ms

**Constraints.** Single collector node; Retention 24 hours

**Architecture.** Spans go into a sharded in-memory assembler, are decided by policy at trace completion, then written to a compact store. Components: Ingest endpoint, Trace assembler, Policy engine, Trace store, Lookup API, Viewer

**Data.** Synthetic microservice call graphs with injected errors and slowness

**Milestones.** Span model and generator (5 h) · Assembler with timeouts (8 h) · Policy engine (5 h) · Storage and lookup (8 h) · Viewer and load test (5 h) · Report (3 h)

**Deliverables.** repo with README and demo GIF; sampling analysis report; benchmark

**Done when.** 100k spans/s, 100% of injected-error traces retained, total retained <10%.

**Measure.** spans/s, retention rate, trace completeness, memory per open trace

**Pitfalls.** Late spans arriving after decision; Memory blowup on unfinished traces; Clock skew in waterfall

**Stretch.** Add adaptive sampling; Add service dependency graph

### NAT traversal helper with STUN-style discovery and relay
`mx-sys-nat-traversal-relay` · Y3 · level 4 · 35 h · Go or Rust

**Scenario.** A remote-care startup needs two devices behind home routers to talk directly, with a relay if that fails. Most direct attempts fail with symmetric NATs and they want to understand why.

**Functional.** STUN-like server returning observed public endpoints; UDP hole punching coordinated by a rendezvous server; NAT type probing (full cone, restricted, symmetric); Relay fallback with per-session bandwidth limits; Test lab with emulated NAT types using Linux network namespaces

**Non-functional.** Direct connection success of at least 90% across non-symmetric NAT combinations in the lab; Fallback to relay within 3 s; Relay adds under 5 ms median latency

**Constraints.** Linux netns/iptables emulation of NATs; UDP only

**Architecture.** Clients discover endpoints, exchange them via the rendezvous server, punch simultaneously, and otherwise route through a relay. Components: STUN server, Rendezvous server, Punching client, NAT classifier, Relay, Netns lab

**Data.** Emulated NAT topologies

**Milestones.** NAT behaviours and lab build (7 h) · STUN and classifier (6 h) · Rendezvous and hole punching (8 h) · Relay fallback (5 h) · Matrix test across NAT pairs (5 h) · Report (4 h)

**Deliverables.** repo with README; NAT pair success matrix; lab scripts

**Done when.** Success matrix shows >=90% direct for non-symmetric pairs and relay fallback within 3 s otherwise.

**Measure.** success rate by NAT pair, time-to-connect, relay latency overhead

**Pitfalls.** Timing of simultaneous open; Port-prediction false assumptions; Relay abuse

**Stretch.** Add birthday-paradox port guessing for symmetric NAT; Add IPv6 path preference

### Deterministic network simulator for testing distributed protocols
`mx-sys-netsim-protocol-lab` · Y3 · level 4 · 34 h · Rust or Python

**Scenario.** A team writing consensus code can't reproduce rare reorderings. They need a deterministic discrete-event network simulator that replays failures exactly from a seed.

**Functional.** Virtual clock and event queue with seeded randomness; Configurable links with latency distributions, loss, duplication and reordering; Node abstraction for message handlers and timers; Partition and crash schedule scripting; Trace recording and replay of any run

**Non-functional.** Identical trace hash across 1,000 reruns of the same seed; Simulate 100 nodes with 1 million events in under 10 s; Minimize a failing scenario to under 30 events automatically

**Constraints.** Single-threaded determinism; No wall-clock access from node code

**Architecture.** The simulator drives all node code through a single event loop where time, network and randomness are injected dependencies. Components: Event queue, Network model, Node API, Fault scripts, Trace recorder, Shrinker

**Data.** Includes a toy protocol such as two-phase commit as a test subject

**Milestones.** API design and event loop (6 h) · Network and fault models (7 h) · Trace record and replay (5 h) · Test subject protocol with a planted bug (6 h) · Shrinking of failing runs (6 h) · Report (4 h)

**Deliverables.** repo with README; bug-finding case study; design doc

**Done when.** Same seed reproduces identical trace hash 1,000 times; planted bug found and shrunk to <30 events.

**Measure.** events/s, replays identical, shrink ratio, bugs found per seed

**Pitfalls.** Hidden nondeterminism via hash map iteration; Floating-point drift; Real clock leaks

**Stretch.** Add model-checking style exhaustive mode; Port to test a second protocol

### Mini service-mesh sidecar with retries and circuit breaking
`mx-sys-sidecar-proxy-mesh` · Y3 · level 4 · 32 h · Go or Rust

**Scenario.** Arbor Telehealth's engineers keep re-implementing timeouts and retries in each service. They want a sidecar proxy applying uniform resilience policy and emitting metrics.

**Functional.** HTTP proxying between local app and remote services; Timeout, retry with jitter and retry budget; Circuit breaker with half-open probing; Load balancing across endpoints with outlier ejection; Metrics for request counts, latencies and breaker states

**Non-functional.** Added latency under 1 ms p50 and 3 ms p99; Retry budget prevents more than 20% extra load during outage; Breaker opens within 2 s of failure rate exceeding 50%

**Constraints.** Plain HTTP between sidecars for scope; Static configuration file reloaded on SIGHUP

**Architecture.** The sidecar intercepts outbound calls via a local port and applies a middleware chain of policies before forwarding. Components: Proxy core, Retry middleware, Circuit breaker, Load balancer, Outlier detector, Metrics

**Data.** Demo microservices with controllable failure

**Milestones.** Proxy core and config (6 h) · Timeouts and retries with budget (6 h) · Circuit breaker (6 h) · LB and outlier ejection (6 h) · Chaos experiments (6 h) · Report (2 h)

**Deliverables.** repo with README; chaos experiment results; design doc

**Done when.** Overhead p99 <3 ms and retry amplification <=1.2x during a forced outage.

**Measure.** added latency, amplification factor, breaker timings, error rate

**Pitfalls.** Retry storms; Non-idempotent request retries; Shared mutable breaker state races

**Stretch.** Add mTLS between sidecars; Add traffic mirroring

### Swarm-style firmware distribution for 5,000 field devices
`mx-sys-ota-swarm-distribution` · Y3 · level 4 · 34 h · Go or Rust

**Scenario.** Meridian Meters pushes 80 MB firmware to 5,000 gateways over cellular, and the origin link saturates. A peer-assisted distribution among nearby gateways could cut cost.

**Functional.** Chunked firmware manifest with hashes and signature; Peer exchange over local network with rarest-first selection; Fallback to origin for missing chunks; Resume after power loss; Simulator for 5,000 devices with heterogeneous links

**Non-functional.** Origin bytes served reduced by at least 70% versus all-origin; 95% of devices updated within 2 hours in simulation; Verified integrity: 100% of corrupted chunks rejected

**Constraints.** Simulation plus a 10-process real prototype; Signature verification with a vetted library

**Architecture.** A tracker-lite service groups devices into local swarms; devices request chunks from peers by rarity and verify each hash. Components: Manifest builder, Swarm coordinator, Peer protocol, Chunk store, Resume logic, Fleet simulator

**Data.** Simulated device fleet with link speeds

**Milestones.** Manifest and security design (4 h) · Peer protocol (7 h) · Piece selection (6 h) · Fleet simulator (8 h) · Prototype on processes (5 h) · Report (4 h)

**Deliverables.** repo with README; simulation report; threat model

**Done when.** Simulation shows >=70% origin savings and 95% updated in 2 hours; corrupted chunks always rejected.

**Measure.** origin bytes, completion curve, per-device upload, rejected chunks

**Pitfalls.** Free-riding peers; Rollback to older signed firmware; End-game duplicate requests

**Stretch.** Add delta updates; Add rollout rings with auto-halt

### Consistent-hash cache cluster with hot-key mitigation
`mx-sys-hot-key-cache-cluster` · Y3 · level 4 · 32 h · Go or Rust

**Scenario.** Sable Commerce's flash sales hammer a few product keys and one cache node melts. They want a cache cluster whose clients detect hot keys and replicate or locally cache them.

**Functional.** Cache node with LRU, TTL and a text or binary protocol; Client-side consistent hashing with virtual nodes; Hot key detection via a count-min sketch; Automatic replication of hot keys to extra nodes or local near-cache; Rebalancing when nodes are added

**Non-functional.** Max node load within 1.3x of mean under Zipf(1.2) traffic with mitigation; Cache hit latency p99 under 1 ms; Adding a node moves under 1/N of keys plus 5%

**Constraints.** Simulation plus a real 4-node localhost cluster; No external cache software used

**Architecture.** Clients hash keys to nodes, a sketch flags hot keys, and flagged keys are served from replicas or a local near-cache. Components: Cache node, Client with ring, Count-min sketch, Hot-key replicator, Rebalancer, Traffic generator

**Data.** Synthetic Zipf traffic with a flash-sale burst

**Milestones.** Node and protocol (6 h) · Ring and rebalancing (6 h) · Hot key detection (6 h) · Mitigation strategies (8 h) · Experiments (4 h) · Report (2 h)

**Deliverables.** repo with README; experiment report; design doc

**Done when.** Max node load <=1.3x mean under Zipf(1.2) with mitigation; baseline shows >3x.

**Measure.** load imbalance, hit latency, mitigation overhead, keys moved on rebalance

**Pitfalls.** Sketch false positives; Stale hot-key replicas; Near-cache invalidation

**Stretch.** Adaptive TTL for hot keys; Compare with bounded-load hashing

### Anti-entropy replicator for a two-datacenter inventory store
`mx-sys-merkle-anti-entropy-sync` · Y3 · level 4 · 32 h · Go or Rust

**Scenario.** Tamarind Retail keeps stock counts in two datacenters and divergences after outages go unnoticed. They want an anti-entropy mechanism using Merkle trees to find and repair differences cheaply.

**Functional.** Key-value stores with versioned values; Merkle tree summaries over key ranges; Anti-entropy exchange locating differing ranges; Conflict resolution via version vectors or last-writer-wins documented trade-off; Throttled repair to protect production traffic

**Non-functional.** Detect 100 diverged keys among 10 million with under 5 MB of exchanged data; Repair completes at 20,000 keys/s throttled; Merkle tree update cost under 10 microseconds per write

**Constraints.** Two simulated sites on one host; In-memory plus disk-backed stores

**Architecture.** Each site maintains a Merkle tree over hashed key buckets; periodic exchange walks mismatched subtrees and streams repairs. Components: Versioned store, Merkle tree, Exchange protocol, Resolver, Repair throttle, Divergence injector

**Data.** Synthetic inventory keys with injected divergence

**Milestones.** Store and versioning (5 h) · Merkle tree implementation (7 h) · Exchange protocol (7 h) · Conflict resolution (5 h) · Experiments (5 h) · Report (3 h)

**Deliverables.** repo with README; bandwidth analysis; design doc

**Done when.** 100 diverged keys among 10M found with <5 MB transfer; repair at 20k keys/s throttled.

**Measure.** bytes exchanged, detection time, repair rate, write overhead

**Pitfalls.** Tree rebuild stalls; Hash bucket skew; LWW losing updates

**Stretch.** Add hinted handoff; Add read repair

### Presence and message fan-out service for a 100k-user chat app
`mx-sys-chat-presence-fanout` · Y3 · level 4 · 32 h · Go or Rust

**Scenario.** Sparrow Chat has 100,000 concurrently connected users and wants presence updates and room fan-out that don't overload a single server. They need a sharded gateway tier with efficient fan-out.

**Functional.** WebSocket gateway holding long-lived connections; Room membership and message fan-out across gateways via a pub/sub bus; Presence with heartbeats and debounced updates; Backpressure and slow-client eviction; Load generator simulating 100k clients

**Non-functional.** Hold 100,000 connections across 4 gateway processes using under 8 GB total; Message delivery p99 under 150 ms for 1,000-member rooms; Presence update propagation within 3 s

**Constraints.** Single host or small cluster of containers; No managed pub/sub

**Architecture.** Gateways own connections and subscribe to room topics on a lightweight internal bus; a presence service aggregates heartbeats. Components: WebSocket gateway, Room router, Internal bus, Presence service, Slow-client policy, Load generator

**Data.** Synthetic users sending messages according to a power-law room size distribution

**Milestones.** Architecture and protocol (5 h) · Gateway (7 h) · Fan-out bus (7 h) · Presence (5 h) · Load test at scale (6 h) · Report (2 h)

**Deliverables.** repo with README; load test report; design doc

**Done when.** 100k connections in <8 GB, delivery p99 <150 ms to 1,000-member rooms, presence propagates <3 s.

**Measure.** memory per connection, delivery latency, CPU, eviction counts

**Pitfalls.** Fan-out copying per recipient; Presence thundering herd after reconnect; Ulimit and ephemeral port limits

**Stretch.** Add message history with replay; Add typing indicators with coalescing

### Replicated configuration store with watches and staged rollout
`mx-sys-config-store-watch` · Y3 · level 5 · 35 h · Go with gRPC

**Scenario.** Quill Logistics' 60 microservices read config from files and need restarts to change anything. They want a replicated store with versioning, watch streams and percentage-based rollout of config changes.

**Functional.** Versioned key store with compare-and-swap writes; Replication across three nodes via a consensus library or a documented primary-backup with fencing; Watch streams that resume from a revision after reconnect; Staged rollout: new value visible to a percentage of clients by stable hash; Audit log of who changed what and rollback to a revision

**Non-functional.** Write latency p99 under 50 ms in a three-node LAN cluster; Watch notification delay under 100 ms; Survive loss of one node with no acknowledged write lost

**Constraints.** Do not reimplement Raft; reuse a library or justify a simpler design; Fits in 512 MB RAM per node

**Architecture.** Clients talk to the leader for writes and any replica for reads; a revision log feeds watch streams and the audit trail. Components: Revision log, Replication layer, Watch hub, Rollout evaluator, Audit store, Client SDK

**Data.** Synthetic config trees and clients generated by a simulator

**Milestones.** API and consistency model doc (5 h) · Store and revision log (7 h) · Replication and failover (8 h) · Watch resume semantics (6 h) · Rollout and audit (5 h) · Fault tests and report (4 h)

**Deliverables.** repo with README; consistency model doc; fault-test report; 3 ADRs

**Done when.** Killing a node during 10,000 writes loses no acknowledged write; watch p99 delay under 100 ms.

**Measure.** write p99, watch delay, recovery time, lost writes

**Pitfalls.** Watch gaps after compaction; Rollout hash changing between versions; Stale reads from followers presented as strong

**Stretch.** Add multi-key transactions; Add a config schema validator

### Distributed lock service with fencing tokens
`mx-sys-lock-service-fencing` · Y3 · level 5 · 33 h · Go or Rust

**Scenario.** A payments team at Corvid Pay had two workers both believe they held a lock after a GC pause, and they double-settled invoices. They need a lock service that gives monotonic fencing tokens and a storage-side check.

**Functional.** Lock acquire, renew and release with leases; Monotonic fencing token per grant; Client library with background renewal and local deadline safety margin; Demo resource server rejecting stale tokens; Fault injector for pauses, partitions and clock jumps

**Non-functional.** Lock grant latency p99 under 20 ms with 500 clients; Safety violations equal to 0 across 100 randomised fault scenarios with fencing on; Lease expiry detected within 1 s of deadline

**Constraints.** Single-region three-node deployment; Linearisable log from a library or small replicated store

**Architecture.** A replicated state machine issues leases and tokens; clients and the protected resource enforce tokens to make safety independent of timing. Components: Lease state machine, Token issuer, Client renewer, Fenced resource, Fault injector, Checker

**Data.** Randomised workload generator with a history checker

**Milestones.** Lease and token semantics (5 h) · State machine and persistence (7 h) · Client library (5 h) · Fault injector (6 h) · History checker for violations (6 h) · Report with fencing on/off comparison (4 h)

**Deliverables.** repo with README; violation report comparing fencing on/off; design doc

**Done when.** With fencing disabled, the injector exposes at least one double-write; with fencing enabled, 0 across 100 scenarios.

**Measure.** violations, grant latency, renewal failures, scenarios run

**Pitfalls.** Trusting local clocks for safety; Token not persisted across failover; Renewal thread starved

**Stretch.** Add read/write shared locks; Visualise histories on a timeline

### Append-only time-series storage engine for 20,000 sensors
`mx-sys-sensor-tsdb-engine` · Y3 · level 5 · 36 h · Rust or C++

**Scenario.** Helio Grid monitors 20,000 solar inverters writing a sample every 5 s and queries mostly the last week. General-purpose databases cost too much, so they want a purpose-built storage engine.

**Functional.** Append-only write path with write-ahead log and in-memory head block; Immutable compressed blocks using delta-of-delta and XOR float encoding; Time-range and tag-filter queries with downsampling; Retention that deletes whole blocks; Crash recovery from WAL

**Non-functional.** Ingest 400,000 samples/s on one node; Compression to under 2 bytes per sample on average; Query one series for 24 h in under 20 ms

**Constraints.** Single node, 8 GB RAM; No reuse of an existing TSDB codebase

**Architecture.** Samples enter a WAL and head block that is periodically flushed into compressed immutable blocks indexed by series and time. Components: WAL, Head block, Block encoder, Inverted tag index, Query engine, Retention manager

**Data.** Synthetic inverter signals with daily solar curves and noise

**Milestones.** Workload analysis and format design (5 h) · WAL and head block (7 h) · Compression codecs (8 h) · Index and query engine (8 h) · Recovery and retention (4 h) · Benchmarks (4 h)

**Deliverables.** repo with README; format spec; benchmark report; ADR on indexing

**Done when.** 400k samples/s ingest, <2 bytes/sample and 24 h single-series query <20 ms.

**Measure.** ingest rate, bytes per sample, query latency, recovery time, write amplification

**Pitfalls.** Float XOR encoding bugs on NaN; Index growth from high-cardinality tags; Torn WAL records

**Stretch.** Add out-of-order ingestion window; Add a compaction merger

### io_uring network service in C++ for low-latency quotes
`mx-sys-io-uring-cpp-service` · Y3 · level 5 · 35 h · C++20, liburing

**Scenario.** Marlin Capital's internal quote-distribution service pushes small UDP and TCP messages to 2,000 subscribers and spends 40% of CPU in syscalls. They want to test whether io_uring lowers latency and CPU.

**Functional.** TCP subscribe protocol with length-prefixed messages; Fan-out of a published quote to all subscribers; io_uring with registered buffers and multishot accept/recv; Slow-consumer detection that drops or disconnects; epoll baseline implementation for comparison

**Non-functional.** Fan-out p99 latency under 200 microseconds to 2,000 subscribers; CPU per million messages at least 30% below the epoll baseline; No message loss to healthy subscribers across a 10-minute run

**Constraints.** Linux kernel 5.19 or later; Single publisher thread

**Architecture.** A ring-based event loop submits batched sends from pooled registered buffers while a subscriber table tracks backlog. Components: Ring wrapper, Buffer pool, Subscriber table, Slow-consumer policy, epoll baseline, Latency harness

**Data.** Synthetic quote stream with 200k msgs/s bursts

**Milestones.** Ring wrapper and event model (8 h) · Fan-out with buffer pool (8 h) · Slow consumer handling (5 h) · epoll baseline (5 h) · Latency measurement with hardware timestamps or TSC (6 h) · Report (3 h)

**Deliverables.** repo with README; benchmark report vs epoll; design doc

**Done when.** p99 fan-out under 200 microseconds and CPU/msg at least 30% below epoll baseline.

**Measure.** latency percentiles, CPU per million msgs, syscall counts, memory

**Pitfalls.** Buffer lifetime bugs after submission; Measuring coordinated omission; Kernel version feature drift

**Stretch.** SQPOLL mode comparison; Kernel-bypass comparison notes

### Reliable multiplexed UDP transport for a telemetry app
`mx-sys-reliable-udp-transport` · Y3 · level 5 · 36 h · Rust or C++

**Scenario.** A drone-inspection company streams telemetry and video thumbnails over lossy cellular links where TCP head-of-line blocking hurts. They want a QUIC-lite transport with independent streams.

**Functional.** Packetisation with ACK ranges and retransmission; Multiple independent streams with per-stream flow control; Congestion control (NewReno or BBR-lite); Connection IDs surviving address change; Link emulation tests with loss, jitter and reordering

**Non-functional.** Goodput at least 85% of TCP's on a clean 50 Mbit/s link; Under 5% loss, one stream's loss must not stall other streams beyond 1 RTT; Connection migration completes within 2 RTT

**Constraints.** No TLS required for the exercise, but design must leave room for AEAD; Linux netem for testing

**Architecture.** A connection layer frames packets into streams, tracks loss with ACK ranges and RTT estimators, and paces sends by congestion window. Components: Packet framer, Loss detector, Stream manager, Congestion controller, Migration logic, Netem harness

**Data.** tc netem generated impairments

**Milestones.** Wire format and design (5 h) · ACK and retransmit engine (8 h) · Streams and flow control (7 h) · Congestion control (7 h) · Migration and netem tests (6 h) · Report (3 h)

**Deliverables.** repo with README; comparison vs TCP report; design doc

**Done when.** Goodput >=85% of TCP on clean link, no cross-stream stall >1 RTT at 5% loss, migration <2 RTT.

**Measure.** goodput, per-stream latency, retransmits, RTT estimate error

**Pitfalls.** Spurious retransmissions; Ack-of-ack loops; Pacing bugs

**Stretch.** Add AEAD encryption; Forward error correction for video

### Deterministic simulation testing for a replicated counter protocol
`mx-sys-dst-protocol-testing` · Y3 · level 5 · 33 h · Rust or Go

**Scenario.** A team has a quorum-based replicated counter whose bugs appear only in rare interleavings. They want deterministic simulation testing with fault injection that finds the bugs before production.

**Functional.** Quorum replicated counter implementation with read and write paths; Simulation harness controlling time, network and disk; Linearisability checker on recorded histories; Fault schedule generator with crashes, partitions and disk errors; Automatic seed search with failing-seed reports

**Non-functional.** Check 10,000 seeds in under 15 minutes; Find at least 3 planted bugs within 5,000 seeds; Linearisability checker handles 500-operation histories in under 5 s

**Constraints.** Single-threaded deterministic code; No real I/O inside the system under test

**Architecture.** The system under test runs against a simulated environment; a history recorder feeds a checker, and a driver iterates seeds. Components: Counter protocol, Sim environment, History recorder, Linearisability checker, Fault generator, Seed driver

**Data.** Self-generated operation histories

**Milestones.** Protocol and environment abstraction (6 h) · Simulation harness (7 h) · Linearisability checker (8 h) · Fault generation and planted bugs (7 h) · Seed search and report (5 h)

**Deliverables.** repo with README; bug catalogue; design doc

**Done when.** 10,000 seeds checked in under 15 minutes and 3 planted bugs found with minimal repro seeds.

**Measure.** seeds/s, bugs found, checker time, shrink size

**Pitfalls.** Exponential blowup in checker; Environment abstraction leaks; Non-reproducible seeds

**Stretch.** Add Jepsen-style real-network run; Visualise failing histories

### Remote build cache and executor for a 25-developer monorepo
`mx-sys-remote-build-cache` · Y3 · level 5 · 35 h · Go or Rust

**Scenario.** Granite Software's monorepo takes 40 minutes to build and developers rebuild identical things. They want a remote cache plus remote execution for hermetic actions.

**Functional.** Content-addressed store for action inputs and outputs; Action cache mapping action digest to result; Worker pool executing actions in sandboxes; Scheduler assigning actions by locality and load; CLI client that uploads missing inputs and downloads outputs

**Non-functional.** Cache hit path for 1,000 actions in under 3 s; Warm rebuild of a 5,000-action synthetic graph at least 10x faster than cold; Executors scale to 8 workers with at least 75% efficiency

**Constraints.** Hermetic actions only; Single region, LAN

**Architecture.** The client hashes inputs and consults the action cache; misses are scheduled to sandboxed workers pulling inputs from the CAS. Components: CAS server, Action cache, Scheduler, Worker, Client, Graph generator

**Data.** Synthetic DAGs of compile-like actions with varied durations

**Milestones.** Protocol and digest design (5 h) · CAS and action cache (7 h) · Scheduler and workers (9 h) · Client and uploads (6 h) · Scaling experiments (5 h) · Report (3 h)

**Deliverables.** repo with README; scaling report; design doc

**Done when.** Warm rebuild >=10x faster than cold; 8 workers reach >=75% efficiency; 1,000 cache hits in <3 s.

**Measure.** cache hit rate, speedup, worker efficiency, bytes transferred

**Pitfalls.** Non-hermetic actions poisoning cache; Large file upload stalls; Stragglers in DAG

**Stretch.** Add worker autoscaling; Add cache eviction policy study

### Lease-based single-leader replicated register for edge sites
`mx-sys-lease-leader-register` · Y3 · level 5 · 34 h · Rust or Go

**Scenario.** Three edge sites with unreliable links need one small shared register for a feature flag with bounded staleness, and full consensus is overkill. Compare lease-based single-leader replication against quorum designs.

**Functional.** Leader lease acquired by majority of peers with monotonic epochs; Writes replicated synchronously to a quorum; Reads served by leader during lease and by followers with bounded staleness; Clock-drift bound parameter and safety margin; Simulator and real-process modes with partitions

**Non-functional.** Read latency p99 under 1 ms on leader; No linearisability violation across 500 simulated partitions with drift within bound; Failover time under 3 s

**Constraints.** Do not use an existing consensus library; keep scope to a single register; Document assumptions about clocks

**Architecture.** A lease protocol picks one writer per epoch; followers acknowledge writes and honour lease time bounds when serving reads. Components: Lease manager, Epoch logic, Replication, Read path, Simulator, Checker

**Data.** Simulator histories with drift injection

**Milestones.** Protocol design with proofs sketch (6 h) · Lease and epoch implementation (7 h) · Replication and reads (7 h) · Simulator with clock drift (7 h) · Checker and experiments (4 h) · Report (3 h)

**Deliverables.** repo with README; safety experiment report; design doc

**Done when.** 0 violations over 500 partitions within drift bound; violations demonstrated when drift bound exceeded; failover <3 s.

**Measure.** violations, read latency, failover time, staleness bound

**Pitfalls.** Overlapping leases due to drift; Lease renewal not accounting for send time; Reads after epoch change

**Stretch.** Compare against a quorum-read design; Add dynamic membership

### UDP multicast market-data feed handler with gap recovery
`mx-sys-order-book-udp-feed` · Y3 · level 5 · 36 h · C++ or Rust

**Scenario.** A small proprietary-trading firm receives multicast price updates and loses packets on busy mornings. They need a feed handler that detects gaps, requests retransmission and rebuilds an order book fast.

**Functional.** Parse a binary feed format with sequence numbers; Detect gaps and request recovery over a TCP side channel; Arbitrate between A and B redundant feeds; Maintain an order book with add, modify and delete events; Latency instrumentation with TSC timestamps

**Non-functional.** Process 2 million messages/s on one core; Tick-to-book latency p99 under 5 microseconds without recovery; Zero book inconsistencies under 1% random loss with recovery

**Constraints.** Synthetic feed only; no real market data; Pin threads and avoid allocation on hot path

**Architecture.** A single-threaded hot loop decodes packets from two feeds, arbitrates by sequence, and applies updates to a flat-array order book. Components: Decoder, A/B arbiter, Gap recovery client, Order book, Feed simulator, Latency recorder

**Data.** Synthetic order flow generator with lossy dual feed

**Milestones.** Feed spec and simulator (6 h) · Decoder and arbitration (7 h) · Order book design (8 h) · Gap recovery (7 h) · Latency profiling and tuning (6 h) · Report (2 h)

**Deliverables.** repo with README; latency report; design doc

**Done when.** 2M msg/s, p99 under 5 microseconds, zero book mismatches at 1% loss.

**Measure.** throughput, latency percentiles, cache misses, recovery time

**Pitfalls.** Allocation on hot path; Sequence wraparound; Book divergence after recovery replay

**Stretch.** Add kernel-bypass comparison; Add SIMD parsing

### eBPF-based per-process network monitor
`mx-sys-mini-ebpf-network-monitor` · Y3 · level 5 · 32 h · C for BPF with Rust or Go loader

**Scenario.** A security team wants to know which processes talk to which IPs without a packet capture on every host. They need an eBPF program attributing connections and bytes to processes.

**Functional.** eBPF programs on connect, accept and close paths; Per-process byte and connection counters in BPF maps; Userspace agent reading maps and enriching with process info; Export as JSON and a top-style live view; Overhead measurement

**Non-functional.** Under 2% CPU overhead at 50,000 connections/s; No lost events at 100,000 events/s via ring buffer; Attribution correct for 99% of connections in a test suite

**Constraints.** Linux 5.15+ with BTF; Requires root in a VM

**Architecture.** Kernel probes update maps and push connection events to a ring buffer consumed by a userspace agent. Components: BPF programs, Maps, Ring buffer consumer, Process enricher, Exporter, Top view

**Data.** Synthetic traffic from a generator with known processes

**Milestones.** eBPF environment and hello-world probes (6 h) · Connection tracking programs (8 h) · Userspace agent (7 h) · Accuracy test suite (5 h) · Overhead benchmark (4 h) · Report (2 h)

**Deliverables.** repo with README and demo GIF; accuracy and overhead report

**Done when.** <2% overhead at 50k conn/s; 99% attribution accuracy; no dropped events at 100k/s.

**Measure.** overhead, drop rate, attribution accuracy, map memory

**Pitfalls.** Verifier rejections; Short-lived processes disappearing before enrichment; Map size exhaustion

**Stretch.** Add DNS name correlation; Add policy alerts

### Copy-on-write B-tree storage engine for an embedded settings database
`mx-sys-storage-engine-btree-wal` · Y3 · level 5 · 33 h · Rust or C++

**Scenario.** An industrial-controller vendor needs a crash-safe embedded key-value store with read-mostly workloads and predictable latency, where an LSM's compaction pauses are unacceptable. Build a copy-on-write B+tree with a single-writer, multi-reader model.

**Functional.** Page-based B+tree with copy-on-write and atomic root swap; Single writer with snapshot-isolated concurrent readers; Free-page reuse with epoch-based reclamation; Range scans and prefix queries; Crash recovery via dual meta pages

**Non-functional.** Point reads at 500,000/s on 4 threads; Write latency p99 under 5 ms with fsync per commit; Zero corruption across 3,000 simulated crashes

**Constraints.** File size grows no more than 3x live data under churn; No dependency on existing storage engines

**Architecture.** A B+tree rewrites the path from leaf to root into new pages on each commit, then flips a checksummed meta page. Components: Page manager, B+tree, Free list and reclamation, Reader snapshots, Meta page recovery, Crash tester

**Data.** Synthetic key-value workloads (read-mostly)

**Milestones.** Design doc and file format (5 h) · B+tree with COW (9 h) · Snapshots and reclamation (8 h) · Crash-injection harness (7 h) · Benchmarks vs a baseline (4 h)

**Deliverables.** repo with README; crash report; benchmark report; design doc

**Done when.** 500k reads/s at 4 threads, commit p99 <5 ms, 3,000 crashes without corruption.

**Measure.** read/write throughput, commit latency, space amplification, recovery time

**Pitfalls.** Freeing pages still referenced by readers; Torn meta page writes; Fragmentation after deletes

**Stretch.** Add bulk-load; Compare against the LSM approach
