# Multibody dynamics in your own engine

**Goal.** The Stage 1 engine extended from game physics to engineering dynamics: articulated bodies with revolute and prismatic joints, limits and motors, solved accurately enough to predict a real mechanism, with energy conservation, a cart-pole that matches its analytical linearisation, and parameters loaded from a file that describes a real rig.

**Why.** Skills: constrained dynamics (reduced coordinates, the articulated-body algorithm, Lagrange multipliers for loops), numerical integration (symplectic and implicit schemes, step-size studies), and model validation. It is what the inverted pendulum (`m45`), the arm (`m54`) and the year 4 capstone (`cap-y4`) are simulated in. Resources: `mit-2-003`, `modern-robotics`, `witkin-baraff-pbm`.

**Scope.** MVP: spatial-vector algebra; tree-structured articulated bodies in reduced coordinates; forward dynamics by Featherstone's articulated-body algorithm and the composite-rigid-body mass matrix; revolute and prismatic joints with limits (as constraints or stiff penalties), viscous and Coulomb friction, and motors (torque, velocity or position targets); semi-implicit Euler, RK4 and implicit midpoint integrators; a YAML or JSON model format; double pendulum and cart-pole validations. Stretch: closed loops by Lagrange multipliers with Baumgarte or projection stabilisation, contact with the ground, URDF import.

**Architecture.** A model loader builds the kinematic tree from a parameter file. Each step: forward kinematics, joint forces from motors, friction and limits, the articulated-body algorithm for joint accelerations, then the integrator. A validation harness runs scenarios headless and compares with analytical or reference results. The renderer shows the bodies from the existing Stage 1 pipeline.

```
model file ─▶ tree builder ─▶ [ FK ─▶ joint forces (motors, friction, limits) ─▶ ABA ─▶ integrator ] ─▶ state
                                       ▲                                                      │
                                       └──────────────────────────────────────────────────────┘
                                validation harness ◀── state ──▶ renderer
```

**Stack.** C++20, Eigen, your Stage 1 engine and renderer, Python bindings for analysis, NumPy, SciPy and SymPy for analytical references, MuJoCo as an optional cross-check, CTest or GoogleTest. Nothing to buy.

**Milestones.** Spatial algebra and a single pendulum against the analytical period (20 h) · articulated-body algorithm with revolute and prismatic joints (35 h) · joint limits, motors and friction (25 h) · integrators and energy studies on the double pendulum (20 h) · cart-pole validation against the linearisation, and parameter files (25 h) · tests, documentation and write-up (25 h). Total 150 h.

**Done when.** A single pendulum's small-angle period matches 2π√(L/g) within 0.1 %. A frictionless double pendulum conserves total energy within 0.1 % over 60 s at a 1 ms step with the symplectic or implicit integrator, and the drift is reported for every integrator. The cart-pole's numerical Jacobian at upright matches the analytical A and B matrices within 1 %, and a small-angle response matches the linear model within 2 % over 2 s. Joint limits hold without visible penetration, motors reach velocity targets, and the full scene for `m45` loads from a parameter file. The mass matrix matches MuJoCo or SymPy for a five-link chain to 1e-9.

**Measure and report.** Energy drift against time step for each integrator; cart-pole linearisation error; step time against number of bodies (2 to 100) for the articulated-body algorithm against a dense mass-matrix solve; constraint drift for closed loops if implemented; agreement with MuJoCo on the same model.

**Pitfalls.** Mixing spatial-vector conventions (motion against force vectors, frame of expression). Joint axes defined in the wrong frame in the model file. Limits implemented as instantaneous velocity resets that inject energy. Coulomb friction that chatters around zero velocity. Validating only with friction on, which hides integrator errors.

**References.** mit-2-003, modern-robotics, witkin-baraff-pbm, mit-6-832-underactuated, mujoco-docs, catto-box2d-publications, m45.

**Write-up.** A GIF of the double pendulum next to its energy plot, the cart-pole linearisation comparison, the scaling chart, an example parameter file, and a paragraph on what closed loops and contact would need.
