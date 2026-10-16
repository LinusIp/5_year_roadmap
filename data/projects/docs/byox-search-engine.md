# Build your own search engine

**Goal.** A polite crawler that collects at least 50,000 pages from a chosen corner of the web, an inverted index you wrote, BM25 ranking, and a query server that answers in under 50 ms, with ranking quality judged on twenty test queries.

**Why.** AI Engineer roadmap: `ai-engineer/retrieval-process`, `ai-engineer/semantic-search` and `ai-engineer/rag` (lexical retrieval is the half of hybrid search that RAG systems still lean on). Skills: crawling at scale without being a nuisance, tokenisation, posting-list compression, top-k retrieval, and offline relevance evaluation.

**Scope.** MVP: a crawler with robots.txt, per-host rate limits and URL deduplication; HTML-to-text extraction; tokenising, lower-casing and stemming; an on-disk inverted index with delta-encoded, variable-byte postings; BM25 scoring with a top-k heap; an HTTP query endpoint and a minimal results page with snippets. Stretch: phrase queries with positions, PageRank as a prior, WAND early termination, hybrid ranking with embeddings.

**Architecture.** The crawler keeps a frontier queue partitioned by host, fetches with a polite delay, and stores raw pages. The extractor strips markup and near-duplicate pages. The indexer builds sorted posting lists in memory-sized batches and merges them on disk, with a document table holding lengths and URLs. The query server loads the dictionary, decodes the posting lists of the query terms, scores with BM25 and returns the top 10 with snippets.

```
seeds ─▶ frontier ─▶ fetcher ─▶ raw pages ─▶ extract/dedupe
                                                  │
query ─▶ server ─▶ BM25 top-k ◀── inverted index ◀┘
```

**Stack.** Python 3.12 with asyncio and httpx for the crawler, selectolax or BeautifulSoup for extraction, Rust or Go (or NumPy-backed Python) for the index and server, SQLite for the URL and document tables.

**Milestones.** Polite crawler and storage (7 h) · extraction, tokenising and deduplication (5 h) · inverted index build and compression (7 h) · BM25 query server with snippets (6 h) · relevance judgements, latency benchmark and write-up (5 h). Total 30 h.

**Done when.** The index holds at least 50,000 distinct documents. Over 1,000 queries replayed from a list, p95 latency is under 50 ms on a laptop. Twenty test queries written before looking at results are judged on their top 10, and BM25 beats a TF-IDF baseline on precision at 10 or nDCG at 10. The crawler never exceeds one request per second per host and obeys robots.txt.

**Measure and report.** Pages crawled per hour; index size against raw text size; index build time; query latency p50, p95 and p99, cold and warm cache; precision at 10 and nDCG at 10 for BM25 against TF-IDF, per query and averaged.

**Pitfalls.** Crawler traps (calendars, session ids, infinite pagination) that eat the budget. Near-duplicate pages that fill the top results. Tokenising queries differently from documents. Measuring latency only with a warm page cache. Judging relevance after seeing the ranking, which flatters whatever you built.

**References.** w-math-pagerank, w-ml-embedding-search, ddia, system-design-primer, paper-mapreduce, build-your-own-x.

**Write-up.** A screenshot or GIF of the results page, the latency histogram, the relevance table for all twenty queries, the index-size breakdown, and what learning-to-rank or hybrid embeddings would add.
