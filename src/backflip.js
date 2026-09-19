/**
 * Kinematic state representing a point in time during a backflip.
 *
 * @typedef {Object} KinematicState
 * @property {number} time - Elapsed time in seconds.
 * @property {number} height - Vertical position in meters above ground.
 * @property {number} verticalVelocity - Vertical velocity in meters per second.
 * @property {number} rotationDegrees - Pitch rotation angle in degrees.
 * @property {number} angularVelocity - Angular velocity in degrees per second.
 */

/**
 * Result metrics for a completed backflip trajectory simulation.
 *
 * @typedef {Object} SimulationResult
 * @property {boolean} successful - Whether the flip achieved full 360 degree rotation and safe landing.
 * @property {number} totalFlightDuration - Duration of flight in seconds.
 * @property {number} peakHeightMeters - Maximum height achieved during flight.
 * @property {number} finalRotationDegrees - Total cumulative rotation completed.
 * @property {number} landingAngleErrorDegrees - Deviation from the upright 360 degree landing position.
 * @property {KinematicState[]} trajectory - Time series of kinematic states.
 */

/**
 * Backflip simulation and kinematics engine.
 * Computes projectile motion, angular dynamics, and landing stability.
 */
export class BackflipSimulator {
  /**
   * Initializes simulator with optional physical parameters.
   *
   * @param {Object} [options={}] - Physics configuration options.
   * @param {number} [options.gravity=9.80665] - Gravitational acceleration in m/s^2.
   * @param {number} [options.initialVerticalVelocity=4.5] - Upward launch velocity in m/s.
   * @param {number} [options.initialAngularVelocity=392.3] - Angular pitch rotation speed in deg/s.
   * @param {number} [options.landingToleranceDegrees=25.0] - Maximum acceptable deviation from upright angle.
   * @param {number} [options.timeStep=0.01] - Integration time step in seconds.
   */
  constructor(options = {}) {
    this.gravity = options.gravity ?? 9.80665;
    this.initialVerticalVelocity = options.initialVerticalVelocity ?? 4.5;
    this.initialAngularVelocity = options.initialAngularVelocity ?? 392.3;
    this.landingToleranceDegrees = options.landingToleranceDegrees ?? 25.0;
    this.timeStep = options.timeStep ?? 0.01;
  }

  /**
   * Calculates theoretical flight duration for given launch velocity and gravity.
   *
   * @param {number} launchVelocity - Launch velocity in m/s.
   * @returns {number} Flight duration in seconds until ground impact.
   */
  calculateFlightTime(launchVelocity) {
    return (2.0 * launchVelocity) / this.gravity;
  }

  /**
   * Calculates theoretical peak height for given launch velocity and gravity.
   *
   * @param {number} launchVelocity - Launch velocity in m/s.
   * @returns {number} Peak vertical displacement in meters.
   */
  calculatePeakHeight(launchVelocity) {
    return (launchVelocity * launchVelocity) / (2.0 * this.gravity);
  }

  /**
   * Executes numerical step integration for the backflip maneuver.
   *
   * @param {number} [customLaunchVelocity] - Optional launch velocity override.
   * @param {number} [customAngularVelocity] - Optional angular velocity override.
   * @returns {SimulationResult} Complete trajectory telemetry and success assessment.
   */
  simulate(customLaunchVelocity, customAngularVelocity) {
    const launchVelocity = customLaunchVelocity ?? this.initialVerticalVelocity;
    const angularVelocity = customAngularVelocity ?? this.initialAngularVelocity;

    const trajectory = [];
    let currentTime = 0.0;
    let currentHeight = 0.0;
    let currentVerticalVelocity = launchVelocity;
    let currentRotation = 0.0;
    let peakHeight = 0.0;

    trajectory.push({
      time: 0.0,
      height: 0.0,
      verticalVelocity: currentVerticalVelocity,
      rotationDegrees: 0.0,
      angularVelocity: angularVelocity
    });

    while (currentTime === 0.0 || currentHeight > 0.0) {
      currentTime += this.timeStep;
      currentVerticalVelocity -= this.gravity * this.timeStep;
      currentHeight += currentVerticalVelocity * this.timeStep;

      if (currentHeight > peakHeight) {
        peakHeight = currentHeight;
      }

      currentRotation += angularVelocity * this.timeStep;

      if (currentHeight < 0.0) {
        currentHeight = 0.0;
      }

      trajectory.push({
        time: parseFloat(currentTime.toFixed(4)),
        height: parseFloat(Math.max(0.0, currentHeight).toFixed(4)),
        verticalVelocity: parseFloat(currentVerticalVelocity.toFixed(4)),
        rotationDegrees: parseFloat(currentRotation.toFixed(2)),
        angularVelocity: angularVelocity
      });

      if (currentHeight <= 0.0 && currentTime > 0.0) {
        break;
      }

      if (currentTime > 5.0) {
        break;
      }
    }

    const landingAngleError = Math.abs(currentRotation - 360.0);
    const hasFullRotation = currentRotation >= (360.0 - this.landingToleranceDegrees);
    const hasNotOverRotated = currentRotation <= (360.0 + this.landingToleranceDegrees);
    const successful = hasFullRotation && hasNotOverRotated && peakHeight >= 0.5;

    return {
      successful,
      totalFlightDuration: parseFloat(currentTime.toFixed(4)),
      peakHeightMeters: parseFloat(peakHeight.toFixed(4)),
      finalRotationDegrees: parseFloat(currentRotation.toFixed(2)),
      landingAngleErrorDegrees: parseFloat(landingAngleError.toFixed(2)),
      trajectory
    };
  }
}
