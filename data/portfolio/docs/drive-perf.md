# drive-perf: a TensorRT perception pipeline

**Goal.** Take a camera-only bird's-eye-view 3D detector (BEVFormer-tiny or a Lift-Splat-Shoot model) from PyTorch to a TensorRT engine with INT8 or FP8 quantisation and CUDA pre- and post-processing, run the six-camera pipeline in under 33 ms at p99, then drive a simple planner live in CARLA.

**Why.** NVIDIA's Autonomous Driving GPU teams care about one thing above all: a model that runs inside a hard real-time budget on embedded hardware. Taking a research model to 30 FPS, with an accuracy-versus-latency table, is directly on target.

**Scope.** MVP: fine-tune a published BEV detector on nuScenes and report mAP and NDS; export it to ONNX and TensorRT with a plugin for any unsupported op; INT8 post-training quantisation with calibration, then FP8 where the GPU supports it; resize, normalise, BEV pooling and NMS as CUDA kernels; the whole frame captured as one CUDA graph; a CARLA run that records frame times. Stretch: a Jetson Orin deployment with DLA offload.

**Architecture.** Six camera images are resized and normalised on the GPU. The TensorRT engine runs the image backbone and the BEV encoder, which lifts the camera features into one top-down grid, and the head turns that grid into 3D boxes for the planner. The starting budget at p99 is 3 ms for preprocessing, 12 ms for the backbone, 10 ms for the BEV encoder and 4 ms for the head and post-processing, leaving 4 ms of slack; adjust it after the first trace.

**Stack.** PyTorch, ONNX and onnx-graphsurgeon, TensorRT with Polygraphy and TensorRT Model Optimizer, CUDA and C++, the nuScenes devkit, CARLA and its Python API, Nsight Systems.

**Milestones.** Baseline (40 h) · Export (48 h) · Quantisation (40 h) · CUDA pre and post (40 h) · Closed loop (32 h) · Stretch (24 h) · Total 224 h.

**Done when.** End-to-end latency stays below 33 ms at p99 on the target GPU. The accuracy lost to quantisation is under 1 mAP point, or is explained. The CARLA run is recorded.

**Measure and report.** An accuracy-versus-latency table for the FP32 PyTorch model and the FP16, INT8 and, where supported, FP8 engines; p50, p99 and maximum latency over 10,000 frames at fixed clocks, with per-stage times; jitter; the CARLA frame-time log.

**Pitfalls.** Deformable attention and BEV pooling are not standard TensorRT layers, so budget a week for the plugin. INT8 everywhere loses accuracy; keep the sensitive layers in FP16. A model trained on nuScenes sees CARLA's rendered images as a new domain, so fine-tune on CARLA data or use the CARLA run for latency only, and say which. Jetson Orin has no FP8. Report desktop numbers as desktop numbers.

**References.** paper-bevformer, paper-bevfusion, paper-nuscenes, repo-nuscenes-devkit, repo-tensorrt, repo-tensorrt-model-optimizer, paper-carla-simulator, repo-onnxruntime.

**Write-up.** The accuracy-versus-latency table first, then the per-stage budget against the measurements, how the plugin was written and checked, what quantisation cost per layer, and the CARLA video with its frame times.
