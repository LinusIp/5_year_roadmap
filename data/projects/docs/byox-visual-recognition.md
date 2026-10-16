# Build your own visual recognition system

**Goal.** An object detector fine-tuned on photos you took and labelled yourself, evaluated with precision and recall on images it never saw, and running live on a webcam stream.

**Why.** AI Engineer roadmap: `ai-engineer/image-understanding` and `ai-engineer/hugging-face-models`; Inference Engineering roadmap: `inference-engineering/fine-tuning` and `inference-engineering/model-evaluation`. Skills: building a dataset with a clean split, transfer learning, detection metrics, and the gap between offline scores and a live camera.

**Scope.** MVP: three to five object classes from your own life (tools, mugs, a pet, plants), 400 or more labelled images, a split by capture session, a fine-tuned pretrained detector, precision, recall and mAP at IoU 0.5 on the held-out set, and a webcam demo with boxes and confidences. Stretch: face recognition with an embedding model and a gallery, quantisation for CPU speed, active learning on the demo's mistakes.

**Architecture.** A capture script saves frames from several rooms, times of day and distances. Images are labelled in a labelling tool and split by session so near-duplicates never straddle train and test. A training script fine-tunes a COCO-pretrained detector with augmentation. An evaluation script computes per-class precision, recall and mAP and dumps the worst errors. The live app reads the webcam, preprocesses exactly as in training, runs the model and draws boxes.

```
camera ─▶ capture ─▶ label ─▶ split by session ─┬─▶ train ─▶ weights
                                                └─▶ test ─▶ P / R / mAP
webcam ─▶ preprocess ─▶ model (weights) ─▶ boxes ─▶ screen
```

**Stack.** Python 3.12, PyTorch with torchvision Faster R-CNN or Ultralytics YOLO (small variant), Label Studio or CVAT, OpenCV for capture and drawing, one GPU or Colab for training.

**Milestones.** Capture and labelling of the dataset (7 h) · split, loaders and a pretrained baseline (4 h) · fine-tuning with augmentation (6 h) · evaluation and error analysis (4 h) · webcam app, timing and write-up (4 h). Total 25 h.

**Done when.** The test set has at least 100 images from capture sessions the model never saw in training. Per-class precision and recall at IoU 0.5 and the confidence threshold you choose are reported, with mAP at 0.5 above 0.7 or an honest analysis of why not. The fine-tuned model beats the pretrained one used zero-shot (or with only its nearest COCO class) on the same test set. The webcam demo runs at 15 FPS or more on your machine.

**Measure and report.** Precision, recall and mAP at 0.5 per class; the precision-recall curve; a confusion table including background; frames per second and per-frame latency on GPU and CPU; mAP against the number of training images (25, 50, 100 % of the set).

**Pitfalls.** Random splits of video frames that leak near-identical images into the test set. Inconsistent box conventions between labelling sessions. Different resizing or normalisation in the live app than in training. One class with five times the images of the others. Quoting accuracy at one threshold instead of the precision-recall trade-off.

**References.** stanford-cs231n, fastai-practical-dl, paper-resnet, d2l, m08.

**Write-up.** A GIF of the webcam demo, the per-class metrics table, the precision-recall curve, a grid of the worst false positives and misses, and what more data or a larger model would fix.
