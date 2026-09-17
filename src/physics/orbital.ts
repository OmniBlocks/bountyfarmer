import {
  ASTRONOMICAL_UNIT,
  GRAVITATIONAL_CONSTANT,
  SOLAR_LUMINOSITY,
  STEFAN_BOLTZMANN_CONSTANT
} from '../constants';
import { HabitableZone, KeplerianOrbit } from '../types';

/**
 * Calculates orbital period via Kepler's Third Law.
 *
 * @param semiMajorAxisMeters - Semi-major axis in meters.
 * @param centralMassKg - Mass of primary gravitating body in kilograms.
 * @param orbitingMassKg - Mass of secondary orbiting body in kilograms.
 * @returns Orbital period in seconds.
 */
export function calculateOrbitalPeriod(
  semiMajorAxisMeters: number,
  centralMassKg: number,
  orbitingMassKg = 0
): number {
  const mu = GRAVITATIONAL_CONSTANT * (centralMassKg + orbitingMassKg);
  return 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxisMeters, 3) / mu);
}

/**
 * Computes instantaneous orbital speed using the Vis-Viva equation.
 *
 * @param semiMajorAxisMeters - Semi-major axis in meters.
 * @param currentRadiusMeters - Current separation distance in meters.
 * @param centralMassKg - Mass of primary body in kilograms.
 * @param orbitingMassKg - Mass of orbiting body in kilograms.
 * @returns Orbital velocity in meters per second.
 */
export function calculateOrbitalVelocity(
  semiMajorAxisMeters: number,
  currentRadiusMeters: number,
  centralMassKg: number,
  orbitingMassKg = 0
): number {
  const mu = GRAVITATIONAL_CONSTANT * (centralMassKg + orbitingMassKg);
  const term = 2 / currentRadiusMeters - 1 / semiMajorAxisMeters;
  return Math.sqrt(Math.max(0, mu * term));
}

/**
 * Computes the circular orbital speed at a fixed orbital radius.
 *
 * @param orbitalRadiusMeters - Orbital radius in meters.
 * @param centralMassKg - Mass of primary body in kilograms.
 * @returns Circular speed in meters per second.
 */
export function calculateCircularVelocity(
  orbitalRadiusMeters: number,
  centralMassKg: number
): number {
  return Math.sqrt((GRAVITATIONAL_CONSTANT * centralMassKg) / orbitalRadiusMeters);
}

/**
 * Computes the Newtonian escape velocity from a spherical body's surface.
 *
 * @param radiusMeters - Radial distance from the center of mass in meters.
 * @param massKg - Mass of the body in kilograms.
 * @returns Escape velocity in meters per second.
 */
export function calculateEscapeVelocity(radiusMeters: number, massKg: number): number {
  return Math.sqrt((2 * GRAVITATIONAL_CONSTANT * massKg) / radiusMeters);
}

/**
 * Derives comprehensive Keplerian orbital characteristics for a two-body system.
 *
 * @param semiMajorAxisMeters - Semi-major axis in meters.
 * @param eccentricity - Orbital eccentricity (0 for circular, 0 to 1 for elliptical).
 * @param centralMassKg - Primary body mass in kilograms.
 * @param orbitingMassKg - Orbiting body mass in kilograms.
 * @returns Keplerian orbit parameter container.
 */
export function calculateKeplerianOrbit(
  semiMajorAxisMeters: number,
  eccentricity: number,
  centralMassKg: number,
  orbitingMassKg = 0
): KeplerianOrbit {
  const periapsis = semiMajorAxisMeters * (1 - eccentricity);
  const apoapsis = semiMajorAxisMeters * (1 + eccentricity);
  const period = calculateOrbitalPeriod(semiMajorAxisMeters, centralMassKg, orbitingMassKg);
  const meanVel = calculateOrbitalVelocity(
    semiMajorAxisMeters,
    semiMajorAxisMeters,
    centralMassKg,
    orbitingMassKg
  );
  const escVel = calculateEscapeVelocity(periapsis, centralMassKg);

  return {
    semiMajorAxis: semiMajorAxisMeters,
    eccentricity,
    orbitalPeriodSeconds: period,
    orbitalVelocityMetersPerSecond: meanVel,
    periapsisMeters: periapsis,
    apoapsisMeters: apoapsis,
    escapeVelocityMetersPerSecond: escVel
  };
}

/**
 * Calculates stellar habitable zone boundaries and evaluates planetary habitability.
 *
 * @param stellarLuminosityWatts - Total radiative power of the host star in Watts.
 * @param distanceMeters - Distance from planet to star in meters.
 * @param albedo - Planetary Bond albedo.
 * @returns Habitable zone analysis container.
 */
export function calculateHabitableZone(
  stellarLuminosityWatts: number,
  distanceMeters: number,
  albedo = 0.3
): HabitableZone {
  const lumRatio = stellarLuminosityWatts / SOLAR_LUMINOSITY;
  const innerRadius = ASTRONOMICAL_UNIT * Math.sqrt(lumRatio / 1.1);
  const outerRadius = ASTRONOMICAL_UNIT * Math.sqrt(lumRatio / 0.53);

  const absorbedFlux = (stellarLuminosityWatts * (1 - albedo)) / (16 * Math.PI * STEFAN_BOLTZMANN_CONSTANT * distanceMeters * distanceMeters);
  const equilibriumTemp = Math.pow(absorbedFlux, 0.25);

  const withinDistance = distanceMeters >= innerRadius && distanceMeters <= outerRadius;
  const suitableTemp = equilibriumTemp >= 175 && equilibriumTemp <= 330;

  return {
    innerRadiusMeters: innerRadius,
    outerRadiusMeters: outerRadius,
    equilibriumTemperatureK: equilibriumTemp,
    isHabitable: withinDistance && suitableTemp
  };
}
