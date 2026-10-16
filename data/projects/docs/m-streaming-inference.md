# Streaming VLM or Whisper inference service

**Goal.** A deployed streaming service for Whisper (speech in, partial and final transcripts out) or for a vision-language model (images in, streamed tokens out), measured under load with the metric the modality needs, and a small demo client.

**Why.** Inference Engineering roadmap: `inference-engineering/auto-speech-recognition`, `inference-engineering/real-time-factor` and `inference-engineering/vision-language-models`, with `inference-engineering/voice-activity-detection` on the speech path. Skills: multimodal inference and streaming. Text serving optimises tokens per second; speech serving has to keep up with a clock, and image serving pays a large encoder cost before the first token, so batching has to follow the modality.

**Scope.** MVP (speech path, the plan below): Whisper small or medium, audio streamed over WebSockets in 0.5-second chunks, voice activity detection, a rolling window that emits partial results and finalises segments at pauses, batching of windows across concurrent streams, a load test from 1 to 32 streams. MVP (image path, if chosen instead): a 2–7B vision-language model behind vLLM or your own server, TTFT and throughput under load, image-encoder batching kept separate from decode. Stretch: both modalities; word-level timestamps; speaker turns.

**Architecture.** Each client holds a WebSocket. A session manager buffers audio per stream, runs voice activity detection, and every 500 ms submits the current window to a batcher. The batcher groups windows from many streams into one encoder and decoder call, bounded by a maximum wait of 50 ms. Results go back as partial text; when the detector sees a pause, the segment is finalised and dropped from the window.

```
mic ─▶ WebSocket ─▶ session (buffer + VAD) ─▶ batcher ─▶ Whisper (GPU)
                          ▲                                   │
                          └──── partial / final text ◀────────┘
```

**Stack.** Python 3.12, faster-whisper (CTranslate2) or Hugging Face Transformers, Silero VAD, FastAPI with WebSockets, a browser demo client using the Web Audio API, Docker on one GPU, LibriSpeech test-clean for accuracy.

**Milestones.** Offline baseline with word error rate and real-time factor on a test set (5 h) · Streaming pipeline with VAD, rolling window, partial and final results (8 h) · Batching across streams that respects the audio clock (6 h) · Load test from 1 to 32 concurrent streams (5 h) · Deployment with a demo client and write-up (6 h). Total 30 h.

**Done when.** Final transcripts on LibriSpeech test-clean, streamed at real speed, stay within 1 point of word error rate of offline transcription with the same model. At 16 concurrent streams on one GPU the real-time factor per stream stays below 0.3 and partial results arrive within 1 second of speech at p50. The batching policy is explained in the README with its numbers. The service is deployed and the demo client transcribes live from a microphone.

**Measure and report.** Real-time factor against concurrent streams (1, 4, 8, 16, 32); latency from speech to partial and to final text at p50 and p99; word error rate offline against streamed; GPU utilisation and batch size over time; for the image path, TTFT and output tokens per second against concurrency and image resolution.

**Pitfalls.** Real-time factor measured on one stream and quoted for many. Windows cut mid-word, which produces flickering partials and duplicated words at segment joins. Resampling errors (Whisper expects 16 kHz mono), which quietly raise the error rate. Hallucinated text on silence when voice activity detection is skipped. For images, counting the vision encoder outside TTFT.

**References.** slp3, vllm-docs, onnx-runtime-docs, databricks-inference-best-practices, m-inference-server.

**Write-up.** A demo GIF of live transcription, the real-time-factor chart against streams, the latency table, the accuracy comparison, and a paragraph on how batching differs for speech, images and text.
