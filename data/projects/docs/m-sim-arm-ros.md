# A simulated robot arm in your engine, controlled over ROS 2

**Goal.** A six-axis (or simpler) robot arm simulated by your own physics engine, exposed to ROS 2 as joint states in and joint commands out, and driven by your own inverse kinematics and trajectory nodes through a pick-and-place task.

**Why.** Skills: ROS 2 (nodes, topics, the simulation clock), kinematics (forward, inverse, the Jacobian) and control (joint PD, trajectory tracking). It is the first time your engine is driven by software it does not own, which is exactly the bridge the Stage 1 capstone and the year 5 arm (`m54`, `m55`) build on. Resources: `modern-robotics` chapters 4–6 and 9, `ros2-tutorials`, `mit-manipulation`.

**Scope.** MVP: an articulated arm built from the joints of project `m27`, joint motors with torque limits, a ROS 2 bridge publishing `sensor_msgs/JointState` and `/clock` and subscribing to joint commands, a damped-least-squares IK node, a quintic trajectory generator, a gripper modelled as a weld constraint, and a pick-and-place state machine. Stretch: a URDF loader so the same description feeds RViz, a comparison run in MuJoCo, collision-aware motion planning through MoveIt 2.

**Architecture.** The engine steps at a fixed 1 kHz and owns the arm. A bridge process publishes joint states and the simulation clock at 100–500 Hz and applies incoming commands at the next step. The IK node turns a Cartesian goal into joint targets. The trajectory node interpolates them with quintic splines and streams set-points. A per-joint PD loop inside the engine tracks them. A task node sequences approach, grasp, lift, place and release.

```
task node ─▶ IK node ─▶ trajectory node ─▶ /joint_commands ─▶ bridge ─▶ engine (1 kHz)
                                                                 │
          ◀──────────────── /joint_states, /clock ◀──────────────┘
```

**Stack.** C++20 engine, ROS 2 Jazzy with rclcpp for the bridge and rclpy for the planning nodes, Eigen for kinematics, RViz for visualisation, Ubuntu 24.04 or a ROS 2 container. Nothing to buy.

**Milestones.** Arm model with joints, motors and limits in the engine (7 h) · ROS 2 bridge with joint states, commands and the simulation clock (7 h) · damped-least-squares IK, quintic trajectories and joint PD tracking (9 h) · pick-and-place state machine with a constraint-based grasp (7 h) · reliability run, video and write-up (5 h). Total 35 h.

**Done when.** The bridge runs at 250 Hz with no dropped messages over 10 minutes. IK reaches 100 random reachable poses with position error under 1 mm and orientation error under 0.5°, and the forward kinematics agree with the `modern-robotics` library to 1e-9. Trajectories track with joint RMS error under 1° and no velocity discontinuities. The pick-and-place task succeeds in at least 48 of 50 runs with randomised object positions. Public repository with a video.

**Measure and report.** Bridge round-trip latency (command to state) at p50 and p99; IK convergence iterations and failure rate near singularities; joint tracking RMS and peak error per joint; pick-and-place success rate and cycle time; real-time factor of the simulation while ROS 2 is attached.

**Pitfalls.** Nodes using wall time instead of `/clock`, so trajectories drift when the simulation slows. IK that explodes near singularities without damping. Joint ordering that differs between the engine, the URDF and the message. Grasps that fling the object because the weld constraint is enabled at non-zero relative velocity. QoS mismatches that silently drop every message.

**References.** ros2-tutorials, modern-robotics, mit-manipulation, mit-2-12, mujoco-docs, m27, catto-box2d-publications.

**Write-up.** A video of five consecutive pick-and-place runs, a plot of commanded against simulated joint angles, the latency and success-rate table, and a paragraph on what changes when the engine is replaced by real motors.
