# Year 4 capstone: an instrumented control rig with a digital twin

**Goal.** A reaction-wheel pendulum (or a ball-and-beam) driven by your own PCB and bare-metal firmware, with the circuit simulated in your SPICE-like solver and the mechanics in your own engine, and measured step responses laid over simulated ones within a stated tolerance.

**Why.** No roadmap.sh roadmap covers this; it builds KiCad, power electronics, bare-metal C or Rust, state-space control and system identification. Resources: phils-lab and kicad for the board, feedback-systems and brunton-control-bootcamp for the controller, and your own solvers from m37 and the engine.

**Scope.** MVP: a 12 V board with an H-bridge, shunt and current-sense amplifier, an STM32, encoder inputs, an IMU or angle-sensor header, SWD and UART; firmware with a 1 kHz timer-driven loop, PWM-synchronised current sampling and binary telemetry; a motor and pendulum model identified from bench tests; an LQR designed on the model, then tuned on hardware. Stretch: an inner current loop, swing-up, a Kalman filter, a host GUI.

**Architecture.** The host sends setpoints and receives telemetry. The firmware reads the encoder and angle sensor, samples current mid-PWM, runs the controller and updates the PWM duty every millisecond. The board converts duty into motor current. The digital twin couples a circuit model (bridge, motor R and L, back-EMF, sense amplifier) to a rigid-body model (pendulum, wheel inertia, friction) and runs the same controller code compiled for the host.

```
host ◀─ telemetry ─ MCU (1 kHz loop) ─ PWM ─▶ H-bridge ─▶ motor/wheel
                       ▲                                    │
                       └── encoder, IMU, current ◀──────────┘
twin: SPICE-like circuit ⇄ engine mechanics ⇄ same controller
```

**Stack.** KiCad, STM32G4 or F4 in bare-metal C or Rust, OpenOCD and gdb, your SPICE-like solver and multibody engine, Python with NumPy, SciPy and python-control for identification and LQR, a logic analyser or oscilloscope.

**Parts and budget.** Nucleo board and debugger, $20–30. Motor with encoder, $25–60. MOSFETs or driver IC, shunt, INA240-class amplifier and passives, $15–30. IMU or magnetic angle sensor, $5–15. One PCB run of five boards, $10–40 with shipping. Connectors, wire, bearings and fasteners, $15–25. 3D-printed or machined frame and reaction wheel, $10–40. Bench supply, $50–100, and a logic analyser ($15) or oscilloscope ($300–400) if not owned. Total about $100–240 without instruments; $165–355 with a supply and logic analyser, $450–740 with an oscilloscope instead.

**Milestones.** Mechanical design, mechanics model and identification plan (25 h) · PCB schematic, layout and fabrication (35 h) · board bring-up and bare-metal firmware with telemetry (35 h) · circuit model, system identification and sim-to-bench step responses (25 h) · controller designed on the model and tuned on hardware (25 h) · measurements, video and write-up (15 h). Total 160 h.

**Done when.** The board passes a bring-up checklist: rails within 2 %, current sense within 5 % of a bench meter. The loop runs at 1 kHz with under 5 µs of jitter, measured on a GPIO with the analyser. Open-loop voltage steps agree with the twin within 10 % RMS error and 15 % on rise time. The pendulum balances for 5 minutes and recovers from a 5° tap. Plots of the model-designed and hardware-tuned controllers are both in the write-up.

**Measure and report.** Identified parameters with uncertainty; sim against bench for voltage and current steps; loop timing and jitter; settling time, overshoot and recovery angle for both controllers; motor current and supply power while balancing.

**Pitfalls.** Ground loops and switching noise in the current sense. Shoot-through from missing dead time. Encoder counts overflowing a 16-bit timer. Friction and backlash missing from the model, so the twin is too optimistic. Gains tuned on hardware that never return to the model.

**References.** phils-lab, kicad, ngspice, making-embedded-systems, feedback-systems, brunton-control-bootcamp, brian-douglas-control, m37, m44, m45.

**Write-up.** A video of balancing and recovery, sim-against-bench overlays, the board render and bring-up table, a parts-cost table, and what the twin missed and why.
