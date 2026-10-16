# Signal and DSP visualiser

**Goal.** A desktop tool in your own renderer that shows what 6.003 teaches: signals in time and frequency, a live FFT and spectrogram of generated and microphone signals, FIR and IIR filters designed and applied in real time, and a draggable pole-zero plot whose impulse and frequency responses update as you move it.

**Why.** Skills: the FFT (windowing, leakage, resolution against time), filter design (windowed-sinc FIR, Butterworth and Chebyshev IIR through the bilinear transform), and real-time plotting (lock-free audio buffers, GPU line and image rendering). It makes `mit-6-003` interactive, and it is the desktop reference for the microcontroller analyser of `m40`. Resources: `mit-6-003`, `dspguide`, `think-dsp`.

**Scope.** MVP: a signal generator (sine, square, chirp, noise, sums); audio input and output; FFT with selectable size and window; a scrolling spectrogram; FIR design by the window method and IIR design by the bilinear transform, with magnitude, phase and group delay plotted; filters applied to the live signal; a z-plane editor where dragging poles and zeros redraws the impulse and frequency responses. Stretch: Parks-McClellan FIR design, a continuous-time s-plane mode, sampling and aliasing demos, saving and loading designs.

**Architecture.** An audio thread fills and drains lock-free ring buffers. A DSP thread reads blocks, applies the active filter (FIR by overlap-add, IIR as second-order sections), and computes FFT frames. The UI thread owns the filter designer and pole-zero editor; changes produce new coefficients that are swapped in atomically. The renderer draws time traces, spectra and the spectrogram texture each frame.

```
generator / mic ─▶ audio ring ─▶ DSP thread (filter, FFT) ─▶ frame queue ─▶ renderer
                                     ▲ coefficients (atomic swap)            │
                filter designer + pole-zero editor (UI) ◀── mouse ◀──────────┘
```

**Stack.** C++20, your OpenGL or Vulkan renderer from Stage 1, Dear ImGui for controls, miniaudio or PortAudio, your own radix-2 FFT checked against KISS FFT or FFTW, SciPy only as the reference for tests. Nothing to buy.

**Milestones.** Signal generator, audio input and output, and lock-free ring buffers (12 h) · FFT, windows, spectrum and spectrogram rendering (18 h) · FIR design and real-time filtering (15 h) · IIR design by the bilinear transform as biquad cascades (15 h) · pole-zero editor driving impulse and frequency responses (12 h) · verification against SciPy and write-up (8 h). Total 80 h.

**Done when.** The FFT matches NumPy to 1e-6 relative on random input. A 4 096-point spectrum and spectrogram of 48 kHz audio update at 60 FPS with under 50 ms from sound to screen. Designed FIR and IIR responses match `scipy.signal.freqz` within 0.01 dB in the passband, and the filtered audio runs for 10 minutes with zero buffer underruns. Dragging a pole or zero updates the impulse and frequency responses within one frame, and poles outside the unit circle are flagged as unstable.

**Measure and report.** Frame time per view; audio-to-display latency; FFT time against size compared with FFTW; filter CPU cost per sample for FIR against IIR at matched specifications; coefficient quantisation effects on a high-order IIR in direct form against biquads.

**Pitfalls.** Allocating or locking in the audio callback, causing glitches. Designing a high-order IIR in direct form and watching it go unstable. Forgetting frequency pre-warping in the bilinear transform. Spectrogram colour scales in linear magnitude, which hide everything below the peak. Swapping filter coefficients mid-block without resetting or crossfading state.

**References.** mit-6-003, dspguide, think-dsp, mit-6-011, cert-coursera-dsp, m40.

**Write-up.** A screen recording of a chirp through a filter while poles are dragged, the verification table against SciPy, the latency and frame-time numbers, and a paragraph on what you learned about phase that the magnitude plots hide.
