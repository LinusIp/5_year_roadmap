# Final capstone: a machine designed, simulated, built and controlled

**Goal.** One machine end to end, a small CNC pen plotter, a self-balancing robot or a quadruped leg, designed in CAD with drawings and a bill of materials, simulated as a digital twin in your own engine, built with your own PCB and firmware, controlled on board, and published well enough that someone could rebuild it.

**Why.** Skills: CAD and drawings, design for manufacturing, PCB and firmware, dynamics and control, ROS 2, and documentation. It joins every Stage 2 thread: CAD and tolerances (`m48`, `m51`), boards (`m38`, `m47`), motor control (`m44`, `m45`), the arm and ROS 2 (`m54`, `m55`), and the engine (`a-multibody-dynamics`). It takes the last three monthly slots of the plan.

**Scope.** MVP: one machine with a quantified task (plot a 150 mm drawing to within 0.5 mm, balance through a 2 N·s push, or track a foot trajectory within 5 mm); full CAD, drawings and BOM; motors sized from the twin; one controller PCB; on-board control loop; a ROS 2 interface for commands, telemetry and the twin; a rebuild-grade write-up. Stretch: a second PCB revision, closed-loop identification of the twin from logged data (`m56`), a remote web dashboard.

**Architecture.** The CAD model is the single source of geometry and mass properties; it exports to the twin's parameter file and to drawings. The PCB carries the microcontroller, motor drivers, current sensing, IMU or limit inputs and power protection. Firmware runs the control loop at a fixed rate and streams telemetry. A ROS 2 node bridges commands and telemetry and drives the twin with the same inputs for comparison.

```
CAD ─▶ drawings + BOM ─▶ parts ─▶ machine ◀── PCB + firmware (control loop)
 │                                   │                │ telemetry
 └─▶ mass properties ─▶ twin (engine) ◀── ROS 2 bridge ┘
                             │
                     predicted vs measured ─▶ error report
```

**Stack.** Onshape or FreeCAD, KiCad, C or Rust firmware on an STM32-class MCU, your C++ engine, ROS 2 Jazzy, Python for analysis, GitHub for everything published.

**Parts and budget.**
- Motors or servos with drivers and encoders, sized from the simulation ($60–250)
- Filament for printed parts ($30–60)
- Aluminium stock or extrusion ($30–100)
- Fasteners, bearings, belts or lead screws ($30–80)
- Controller PCB, one or two fabrication runs with components ($40–120)
- Power supply, or a battery pack with protection ($25–80)
- Sensors (IMU, limit switches, encoders) and wiring ($20–60)
- Spares and a second iteration, about 20 % ($50–150)
- Total: about $285–900

**Milestones.** Requirements, CAD, drawings and BOM (55 h) · digital twin in your engine with the controller designed in simulation (60 h) · PCB design, bring-up and firmware (55 h) · build, parts measured against tolerances, integration (50 h) · control on the machine, twin-against-real comparison, repeatability runs (45 h) · publication: CAD, PCB, firmware, simulation, rebuild-grade write-up and video (35 h). Total 300 h.

**Done when.** All five acceptance criteria hold. Critical printed and machined dimensions are measured and tabulated against drawing tolerances. The twin predicts the machine's motion for a standard test (a step, a push, a trajectory) with the error reported, for example RMS position error under 10 % of the motion range. The control loop runs on your PCB at a stated rate with no laptop in the loop. The task succeeds in at least 9 of 10 recorded attempts. A reader can order parts from the BOM and assemble from the instructions.

**Measure and report.** Task accuracy and repeatability over ten runs; twin-against-real error for each test; control-loop rate and jitter; power draw and, if battery-powered, run time; dimensional errors against tolerance; total cost against the budget; hours spent per milestone against the plan.

**Pitfalls.** Choosing motors before the twin says what torque and speed are needed. Mass properties in the twin that drift from the built machine. A single PCB revision planned with no slack for a second. Wiring and connectors left to the end and failing under vibration. Documentation written from memory after the build instead of as you go.

**References.** onshape-learning-center, kicad, phils-lab, modern-robotics, mit-6-832-underactuated, feedback-systems, ros2-tutorials, mit-2-008, a-multibody-dynamics, m55.

**Write-up.** A three-minute video of the machine doing its task, the twin-against-real plots, the BOM with costs, the accuracy and repeatability table, the build guide, and a retrospective on five years of building.
