# Build your own augmented reality

**Goal.** A webcam application that calibrates its own camera, finds a printed square marker in every frame, estimates the marker's 6-DoF pose, and draws a lit 3D model that stays glued to the marker as the camera moves.

**Why.** Game Developer roadmap: `game-developer/projection`, `game-developer/perspective`, `game-developer/linear-transformation` and `game-developer/opengl`; AI Engineer roadmap: `ai-engineer/image-understanding`. Skills: the pinhole camera model, homographies, Perspective-n-Point, and the bridge between computer-vision and graphics coordinate frames.

**Scope.** MVP: chessboard calibration you run and check yourself, ArUco-style marker detection, pose from the four corners, a textured cube or glTF model rendered with the calibrated intrinsics. Stretch: your own homography and pose code instead of the library call, a Kalman filter on the pose, several markers for a larger working area.

**Architecture.** A calibration tool collects 20–30 chessboard views and solves for focal lengths, principal point and distortion. At runtime a capture thread grabs frames; the detector thresholds, finds quadrilaterals and decodes the marker id; the pose solver turns four image corners into rotation and translation; a smoother damps jitter; the renderer builds a projection matrix from the intrinsics and a model-view matrix from the pose, then draws over the video frame.

```
webcam ─▶ undistort ─▶ detect marker ─▶ PnP pose ─▶ smoother
              ▲                                        │
       calibration (K, dist)          renderer ◀───────┘ ─▶ screen
```

**Stack.** Python 3.12 or C++, OpenCV (aruco, calibrateCamera, solvePnP), NumPy, moderngl or raylib for the overlay, a printed chessboard and markers, any USB webcam.

**Milestones.** Camera calibration with a reprojection-error report (6 h) · marker detection and id decoding (6 h) · pose estimation and an axis overlay (6 h) · 3D model rendering with matched projection (8 h) · smoothing, measurement and write-up (4 h). Total 30 h.

**Done when.** Calibration reaches an RMS reprojection error under 0.5 px on held-out chessboard views. Over a 60-second handheld clip at 30 FPS, the projected model corners stay within 3 px of the detected marker corners on average, with no flips. Motion-to-photon latency is under 60 ms, measured by filming the screen and the marker together.

**Measure and report.** Calibration RMS error and the intrinsics found; per-frame corner reprojection error over the clip (mean, p95, max); pose jitter in millimetres and degrees with the marker held still, with and without smoothing; frame rate and latency; detection rate against distance and viewing angle.

**Pitfalls.** OpenCV's camera looks down +z with y down while OpenGL looks down −z with y up, so the model appears mirrored or behind the camera. Building the projection from the focal length but ignoring the principal point. Calibration images that are all frontal, which leaves focal length and distortion poorly constrained. The planar-pose ambiguity that flips the model at near-frontal views. Motion blur from auto-exposure in a dim room.

**References.** learnopengl, gamemath-3d-primer, scratchapixel, mit-18-06, stanford-cs231n, build-your-own-x.

**Write-up.** A GIF of the model riding the marker while the camera moves, the calibration report, the jitter and reprojection table, a diagram of the coordinate frames, and what you would add next (markerless tracking or SLAM).
