# Vehicle or mobile-robot simulator

**Goal.** The vehicle half of the year 5 simulators: a differential-drive robot (or a car with suspension) in your own engine, with a wheel-ground model that includes slip, simulated IMU, encoders and a range sensor with realistic noise, and a path-following controller that runs unchanged against the simulator and later against a real robot.

**Why.** Skills: vehicle dynamics (wheel slip, friction limits, load transfer), sensor models (bias, noise, quantisation, dropouts), and hardware-in-the-loop interfaces (one controller, swappable plants). It complements the arm of `m54` and builds on the multibody core of `a-multibody-dynamics` and the ROS 2 bridge of `m-sim-arm-ros`. Resources: `modern-robotics`, `articulated-robotics`, `mit-2-003`.

**Scope.** MVP: a differential-drive robot with motor torque limits and a longitudinal and lateral wheel-slip model (linear slip up to a friction circle); validation against hand calculations; an IMU with bias and white noise, quadrature encoders with quantisation and slip, a 2D range sensor with Gaussian noise and dropouts; odometry and an extended Kalman filter; a pure-pursuit controller behind a ROS 2 interface. Stretch: a four-wheel car with suspension and a simplified Pacejka tyre model, a Stanley controller, a real differential-drive robot running the same controller.

**Architecture.** The plant (engine or real robot) publishes sensor topics and subscribes to wheel commands through one interface. A state estimator fuses encoders and IMU (and optionally range data) into a pose. The controller tracks a path from the estimated pose. Swapping the plant changes a launch argument, not the controller.

```
path ─▶ controller (pure pursuit) ─▶ /cmd_vel ─▶ plant: engine sim  or  real robot
              ▲                                         │
              └── pose ◀── EKF ◀── /imu, /encoders, /scan ┘
```

**Stack.** C++20 engine with the multibody core, ROS 2 Jazzy, rclcpp for the bridge, Python for analysis and tuning, Eigen, RViz, Gazebo as an optional cross-check. Nothing to buy for this project; a real robot comes later.

**Milestones.** Chassis and wheel-ground contact with slip (25 h) · validation against hand calculations (15 h) · IMU, encoder and range-sensor models with noise (20 h) · ROS 2 interface shared by the simulator and real hardware (20 h) · odometry, EKF and a pure-pursuit controller (25 h) · experiments and write-up (15 h). Total 120 h.

**Done when.** Validation against hand calculations: maximum acceleration before slip matches μg within 3 %; steady-state turning radius at a commanded wheel-speed ratio matches the kinematic prediction within 2 % at low speed, and the deviation at high speed is explained by slip. Sensor noise statistics (Allan deviation for the IMU, range error histogram) match the configured values. On a figure-eight at 0.5 m/s, the controller keeps RMS cross-track error under 5 cm using estimated (not true) pose. The same controller binary runs against a stub "real robot" node with no code change.

**Measure and report.** Hand-calculation comparisons table; odometry drift per metre with and without slip; EKF pose error against ground truth; cross-track RMS and maximum error at 0.25, 0.5 and 1 m/s; real-time factor of the simulator; sensor-model statistics against their settings.

**Pitfalls.** Slip models that divide by wheel speed and blow up at standstill. Sensor noise added at the wrong rate, so its effect scales with the time step. Controllers tuned on ground-truth pose that fail on the estimate. Frame and sign conventions (ENU, body frame, yaw direction) that differ between the plant and the EKF. Simulator timing that differs from the real robot's control rate.

**References.** modern-robotics, articulated-robotics, ros2-tutorials, gazebo-docs, mit-2-003, a-multibody-dynamics, m-sim-arm-ros.

**Write-up.** A video of the robot tracking a figure-eight with the estimated and true paths drawn, the validation table, the cross-track error chart against speed, and a paragraph on what changes when the plant becomes a real robot.
