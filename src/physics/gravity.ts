import {
  GRAVITATIONAL_CONSTANT,
  SPEED_OF_LIGHT,
  REDUCED_PLANCK_CONSTANT,
  BOLTZMANN_CONSTANT,
  DEFAULT_SOFTENING_LENGTH
} from '../constants';
import { addVectors, scaleVector, subVectors, vectorMagnitudeSquared } from '../math/vector3';
import { CelestialBody, RelativisticProperties, Vector3D } from '../types';

/**
 * Calculates the scalar gravitational force magnitude between two point masses.
 *
 * @param mass1Kg - Mass of the first body in kilograms.
 * @param mass2Kg - Mass of the second body in kilograms.
 * @param distanceMeters - Distance separating both bodies in meters.
 * @param softeningMeters - Plummer softening length in meters.
 * @returns Gravitational attraction force in Newtons.
 */
export function calculateGravitationalForce(
  mass1Kg: number,
  mass2Kg: number,
  distanceMeters: number,
  softeningMeters: number = DEFAULT_SOFTENING_LENGTH
): number {
  const effectiveDistanceSq = distanceMeters * distanceMeters + softeningMeters * softeningMeters;
  return (GRAVITATIONAL_CONSTANT * mass1Kg * mass2Kg) / effectiveDistanceSq;
}

/**
 * Calculates the gravitational acceleration vector exerted on a target body by a source mass.
 *
 * @param targetPosition - Position of the body experiencing acceleration.
 * @param sourcePosition - Position of the gravitating source body.
 * @param sourceMassKg - Mass of the gravitating source body in kilograms.
 * @param softeningMeters - Plummer softening length in meters.
 * @returns Acceleration vector in meters per second squared.
 */
export function calculateGravitationalAcceleration(
  targetPosition: Vector3D,
  sourcePosition: Vector3D,
  sourceMassKg: number,
  softeningMeters: number = DEFAULT_SOFTENING_LENGTH
): Vector3D {
  const displacement = subVectors(sourcePosition, targetPosition);
  const distanceSq = vectorMagnitudeSquared(displacement);
  const softenedDistanceSq = distanceSq + softeningMeters * softeningMeters;
  const softenedDistance = Math.sqrt(softenedDistanceSq);
  const factor = (GRAVITATIONAL_CONSTANT * sourceMassKg) / (softenedDistanceSq * softenedDistance);
  return scaleVector(displacement, factor);
}

/**
 * Computes the net gravitational acceleration for every body in an N-body ensemble.
 *
 * @param bodies - Array of celestial bodies.
 * @param softeningMeters - Plummer softening length in meters.
 * @returns Array of net acceleration vectors matching the input bodies.
 */
export function computeNBodyAccelerations(
  bodies: CelestialBody[],
  softeningMeters: number = DEFAULT_SOFTENING_LENGTH
): Vector3D[] {
  const count = bodies.length;
  const accelerations: Vector3D[] = bodies.map(() => ({ x: 0, y: 0, z: 0 }));

  for (let i = 0; i < count; i += 1) {
    for (let j = i + 1; j < count; j += 1) {
      const bodyA = bodies[i];
      const bodyB = bodies[j];

      const rVec = subVectors(bodyB.position, bodyA.position);
      const r2 = vectorMagnitudeSquared(rVec);
      const denom = Math.pow(r2 + softeningMeters * softeningMeters, 1.5);

      const fOverM_A = (GRAVITATIONAL_CONSTANT * bodyB.mass) / denom;
      const fOverM_B = (GRAVITATIONAL_CONSTANT * bodyA.mass) / denom;

      accelerations[i] = addVectors(accelerations[i], scaleVector(rVec, fOverM_A));
      accelerations[j] = addVectors(accelerations[j], scaleVector(rVec, -fOverM_B));
    }
  }

  return accelerations;
}

/**
 * Advances the N-body system forward in time using the Velocity Verlet symplectic integrator.
 *
 * @param bodies - Array of celestial bodies to mutate in-place.
 * @param dtSeconds - Time step duration in seconds.
 * @param softeningMeters - Plummer softening length in meters.
 */
export function stepVerlet(
  bodies: CelestialBody[],
  dtSeconds: number,
  softeningMeters: number = DEFAULT_SOFTENING_LENGTH
): void {
  const count = bodies.length;
  if (count === 0) {
    return;
  }

  const initialAccels = computeNBodyAccelerations(bodies, softeningMeters);

  for (let i = 0; i < count; i += 1) {
    const b = bodies[i];
    const a = initialAccels[i];
    b.position.x += b.velocity.x * dtSeconds + 0.5 * a.x * dtSeconds * dtSeconds;
    b.position.y += b.velocity.y * dtSeconds + 0.5 * a.y * dtSeconds * dtSeconds;
    b.position.z += b.velocity.z * dtSeconds + 0.5 * a.z * dtSeconds * dtSeconds;
  }

  const updatedAccels = computeNBodyAccelerations(bodies, softeningMeters);

  for (let i = 0; i < count; i += 1) {
    const b = bodies[i];
    const a0 = initialAccels[i];
    const a1 = updatedAccels[i];
    b.velocity.x += 0.5 * (a0.x + a1.x) * dtSeconds;
    b.velocity.y += 0.5 * (a0.y + a1.y) * dtSeconds;
    b.velocity.z += 0.5 * (a0.z + a1.z) * dtSeconds;
    b.acceleration = a1;
  }
}

/**
 * Computes the total kinetic energy of all bodies in the system.
 *
 * @param bodies - Array of celestial bodies.
 * @returns Total kinetic energy in Joules.
 */
export function calculateTotalKineticEnergy(bodies: CelestialBody[]): number {
  let kinetic = 0;
  for (let i = 0; i < bodies.length; i += 1) {
    const v2 = vectorMagnitudeSquared(bodies[i].velocity);
    kinetic += 0.5 * bodies[i].mass * v2;
  }
  return kinetic;
}

/**
 * Computes the total gravitational potential energy of all bodies in the system.
 *
 * @param bodies - Array of celestial bodies.
 * @param softeningMeters - Plummer softening length in meters.
 * @returns Total gravitational potential energy in Joules.
 */
export function calculateTotalPotentialEnergy(
  bodies: CelestialBody[],
  softeningMeters: number = DEFAULT_SOFTENING_LENGTH
): number {
  let potential = 0;
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const rVec = subVectors(bodies[i].position, bodies[j].position);
      const dist = Math.sqrt(vectorMagnitudeSquared(rVec) + softeningMeters * softeningMeters);
      potential -= (GRAVITATIONAL_CONSTANT * bodies[i].mass * bodies[j].mass) / dist;
    }
  }
  return potential;
}

/**
 * Computes the total mechanical energy (kinetic plus potential) of the ensemble.
 *
 * @param bodies - Array of celestial bodies.
 * @param softeningMeters - Plummer softening length in meters.
 * @returns Total mechanical energy in Joules.
 */
export function calculateTotalMechanicalEnergy(
  bodies: CelestialBody[],
  softeningMeters: number = DEFAULT_SOFTENING_LENGTH
): number {
  return calculateTotalKineticEnergy(bodies) + calculateTotalPotentialEnergy(bodies, softeningMeters);
}

/**
 * Computes the barycenter (center of mass) of the celestial system.
 *
 * @param bodies - Array of celestial bodies.
 * @returns Position vector of the center of mass in meters.
 */
export function calculateCenterOfMass(bodies: CelestialBody[]): Vector3D {
  let totalMass = 0;
  let cx = 0;
  let cy = 0;
  let cz = 0;

  for (let i = 0; i < bodies.length; i += 1) {
    const m = bodies[i].mass;
    totalMass += m;
    cx += bodies[i].position.x * m;
    cy += bodies[i].position.y * m;
    cz += bodies[i].position.z * m;
  }

  if (totalMass === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  return {
    x: cx / totalMass,
    y: cy / totalMass,
    z: cz / totalMass
  };
}

/**
 * Computes the linear velocity vector of the system's center of mass.
 *
 * @param bodies - Array of celestial bodies.
 * @returns Velocity vector of the center of mass in meters per second.
 */
export function calculateCenterOfMassVelocity(bodies: CelestialBody[]): Vector3D {
  let totalMass = 0;
  let vx = 0;
  let vy = 0;
  let vz = 0;

  for (let i = 0; i < bodies.length; i += 1) {
    const m = bodies[i].mass;
    totalMass += m;
    vx += bodies[i].velocity.x * m;
    vy += bodies[i].velocity.y * m;
    vz += bodies[i].velocity.z * m;
  }

  if (totalMass === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  return {
    x: vx / totalMass,
    y: vy / totalMass,
    z: vz / totalMass
  };
}

/**
 * Computes the Schwarzschild radius (event horizon radius) for a given mass.
 *
 * @param massKg - Mass of the object in kilograms.
 * @returns Schwarzschild radius in meters.
 */
export function calculateSchwarzschildRadius(massKg: number): number {
  return (2 * GRAVITATIONAL_CONSTANT * massKg) / (SPEED_OF_LIGHT * SPEED_OF_LIGHT);
}

/**
 * Calculates the Hawking radiation blackbody temperature of a black hole.
 *
 * @param massKg - Black hole mass in kilograms.
 * @returns Surface Hawking temperature in Kelvin.
 */
export function calculateHawkingTemperature(massKg: number): number {
  if (massKg <= 0) {
    return 0;
  }
  const numerator = REDUCED_PLANCK_CONSTANT * Math.pow(SPEED_OF_LIGHT, 3);
  const denominator = 8 * Math.PI * GRAVITATIONAL_CONSTANT * massKg * BOLTZMANN_CONSTANT;
  return numerator / denominator;
}

/**
 * Calculates the Hawking radiation emission power (luminosity) of an evaporating black hole.
 *
 * @param massKg - Black hole mass in kilograms.
 * @returns Radiative power in Watts.
 */
export function calculateHawkingLuminosity(massKg: number): number {
  if (massKg <= 0) {
    return 0;
  }
  const numerator = REDUCED_PLANCK_CONSTANT * Math.pow(SPEED_OF_LIGHT, 6);
  const denominator = 15360 * Math.PI * Math.pow(GRAVITATIONAL_CONSTANT, 2) * Math.pow(massKg, 2);
  return numerator / denominator;
}

/**
 * Computes the general relativistic gravitational time dilation factor at a given radial distance.
 *
 * @param massKg - Mass of the gravitating body in kilograms.
 * @param radiusMeters - Radial distance from the center of mass in meters.
 * @returns Time dilation factor dt_proper / dt_coordinate.
 */
export function calculateGravitationalTimeDilation(massKg: number, radiusMeters: number): number {
  const rs = calculateSchwarzschildRadius(massKg);
  if (radiusMeters <= rs) {
    return 0;
  }
  return Math.sqrt(1 - rs / radiusMeters);
}

/**
 * Evaluates the full set of relativistic properties for a celestial body.
 *
 * @param massKg - Body mass in kilograms.
 * @param radiusMeters - Body physical radius in meters.
 * @returns Relativistic property container.
 */
export function calculateRelativisticProperties(
  massKg: number,
  radiusMeters: number
): RelativisticProperties {
  return {
    schwarzschildRadiusMeters: calculateSchwarzschildRadius(massKg),
    hawkingTemperatureK: calculateHawkingTemperature(massKg),
    hawkingLuminosityWatts: calculateHawkingLuminosity(massKg),
    gravitationalTimeDilation: calculateGravitationalTimeDilation(massKg, radiusMeters)
  };
}
