# The first quarterly research report

**Goal.** A two-page research report in `research/` of the data repository: one question, a hypothesis and prediction written before the experiment, an experiment that could have proved it wrong, and the result, negative or not, read and commented on by someone you asked.

**Why.** No roadmap.sh roadmap covers research practice, so this project builds skills rather than nodes: forming hypotheses, designing falsifiable experiments, and scientific writing. The guides behind it are `hamming-you-and-your-research`, `schulman-research-guide` and `keshav-how-to-read`. The research cards (`q-specdec-code-prose`, `q-kv-quant-long-context` and the others) seed the question, and the habit of pre-registration started here carries into the year 3 research capstone.

**Scope.** MVP: one question from the research cards or your own, a pre-registration note committed before any run, a pilot to size the experiment, the full run with at least three seeds or a stated sample size, a two-page report with one main figure, and one reader's comments. Stretch: a second, follow-up experiment the first result suggested; a public post of the report.

**Architecture.** The work moves through fixed artefacts, each committed with a date so the order is visible in git history. The pre-registration holds the question, hypothesis, prediction and the result that would refute it. The experiment repository holds code, configs and a script that reproduces every number in the report. The lab notebook records each session.

```
question ─▶ prereg.md (dated) ─▶ pilot ─▶ full runs ─▶ results.json
                                                         │
                       reader's comments ◀── report.md ◀─┘
```

**Stack.** Whatever the question needs (most seeds use Python, PyTorch and an inference server from earlier projects), Weights & Biases for runs, Zotero for related work, Markdown or LaTeX for the report.

**Milestones.** Choose the question and write the hypothesis, prediction and refutation criterion (4 h) · Design the experiment and run a pilot to size it (6 h) · Run the full experiment with seeds and controls (10 h) · Analyse the results and write the two-page report (7 h) · Get a reader's comments and revise (3 h). Total 30 h.

**Done when.** The pre-registration commit predates the first full run. The prediction is quantitative (for example, a speed-up of at least 1.3× or a drop of no more than 2 points) and names the result that would count against it. A single script regenerates every number and figure from the logged runs. The report fits on two pages, states whether the hypothesis survived, and is in `research/` with the reader's comments and your replies linked.

**Measure and report.** The primary metric with its spread over seeds or a confidence interval; the effect size against the control; the number of runs and GPU-hours spent; how the result compares with the prediction, in one sentence.

**Pitfalls.** A question too big for 30 hours; shrink it until a single figure can answer it. Changing the hypothesis after seeing the data. One seed reported as a finding. A comparison that changes two things at once, so neither explains the result. Asking for a reader in the last week, when nobody has time.

**References.** hamming-you-and-your-research, schulman-research-guide, nielsen-principles, keshav-how-to-read, zotero, wandb, r-lab-notebook, q-specdec-code-prose, q-kv-quant-long-context.

**Write-up.** The two-page report itself, with its main figure and results table, plus a short README in the experiment repository: how to reproduce, what the reader said, and the question you would ask next.
