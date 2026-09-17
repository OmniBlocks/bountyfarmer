import {
  SOLAR_LUMINOSITY,
  SOLAR_MASS,
  STEFAN_BOLTZMANN_CONSTANT
} from '../constants';
import {
  CelestialBody,
  NucleosynthesisStage,
  SpectralClass,
  StellarPhase
} from '../types';

/**
 * Computes main-sequence bolometric luminosity using piecewise mass-luminosity scaling.
 *
 * @param massKg - Stellar mass in kilograms.
 * @returns Bolometric luminosity in Watts.
 */
export function calculateMainSequenceLuminosity(massKg: number): number {
  const mRatio = massKg / SOLAR_MASS;
  let exponent = 3.5;

  if (mRatio < 0.43) {
    exponent = 2.3;
  } else if (mRatio < 2.0) {
    exponent = 4.0;
  } else if (mRatio < 55.0) {
    exponent = 3.5;
  } else {
    exponent = 1.0;
  }

  return SOLAR_LUMINOSITY * Math.pow(mRatio, exponent);
}

/**
 * Calculates effective surface temperature using the Stefan-Boltzmann law.
 *
 * @param luminosityWatts - Total radiated power in Watts.
 * @param radiusMeters - Photospheric radius in meters.
 * @returns Effective surface temperature in Kelvin.
 */
export function calculateEffectiveTemperature(
  luminosityWatts: number,
  radiusMeters: number
): number {
  const surfaceArea = 4 * Math.PI * radiusMeters * radiusMeters;
  return Math.pow(luminosityWatts / (surfaceArea * STEFAN_BOLTZMANN_CONSTANT), 0.25);
}

/**
 * Assigns Harvard spectral classification based on effective surface temperature.
 *
 * @param temperatureK - Effective temperature in Kelvin.
 * @returns Harvard spectral class character.
 */
export function classifySpectralType(temperatureK: number): SpectralClass {
  if (temperatureK >= 30000) {
    return 'O';
  }
  if (temperatureK >= 10000) {
    return 'B';
  }
  if (temperatureK >= 7500) {
    return 'A';
  }
  if (temperatureK >= 6000) {
    return 'F';
  }
  if (temperatureK >= 5200) {
    return 'G';
  }
  if (temperatureK >= 3700) {
    return 'K';
  }
  return 'M';
}

/**
 * Estimates main-sequence nuclear lifetime in years.
 *
 * @param massKg - Stellar mass in kilograms.
 * @returns Estimated lifespan in Julian years.
 */
export function estimateMainSequenceLifetimeYears(massKg: number): number {
  const mRatio = massKg / SOLAR_MASS;
  return 1.0e10 * Math.pow(mRatio, -2.5);
}

/**
 * Determines stellar remnant phase following core nuclear exhaustion.
 *
 * @param initialMassKg - Zero-age main-sequence mass in kilograms.
 * @returns Terminal stellar remnant phase.
 */
export function determineStellarRemnant(initialMassKg: number): StellarPhase {
  const solarMasses = initialMassKg / SOLAR_MASS;
  if (solarMasses < 8.0) {
    return 'white_dwarf';
  }
  if (solarMasses < 20.0) {
    return 'neutron_star';
  }
  return 'black_hole';
}

/**
 * Advances internal stellar lifecycle, updating fusion stage, luminosity, and radius.
 *
 * @param star - Mutable star object.
 * @param deltaYears - Elapsed duration in years.
 */
export function advanceStellarEvolution(star: CelestialBody, deltaYears: number): void {
  star.ageYears += deltaYears;
  const lifetime = estimateMainSequenceLifetimeYears(star.mass);
  const ageRatio = star.ageYears / lifetime;

  if (star.phase === 'main_sequence') {
    if (ageRatio < 0.8) {
      star.fusionStage = 'hydrogen_fusion';
    } else if (ageRatio < 1.0) {
      star.fusionStage = 'helium_fusion';
      star.phase = 'red_giant';
      star.radius *= 10;
      star.luminosity *= 50;
      star.temperature = calculateEffectiveTemperature(star.luminosity, star.radius);
      star.spectralClass = classifySpectralType(star.temperature);
    } else {
      triggerCoreCollapse(star);
    }
  } else if (star.phase === 'red_giant' && ageRatio >= 1.1) {
    triggerCoreCollapse(star);
  }
}

/**
 * Triggers terminal core collapse or explosive envelope ejection.
 *
 * @param star - Mutable star object transitioning to remnant.
 */
export function triggerCoreCollapse(star: CelestialBody): void {
  const remnant = determineStellarRemnant(star.mass);

  if (remnant === 'white_dwarf') {
    star.phase = 'white_dwarf';
    star.type = 'star';
    star.mass *= 0.6;
    star.radius = 7.0e6;
    star.luminosity = SOLAR_LUMINOSITY * 0.001;
    star.fusionStage = 'helium_fusion';
    star.temperature = calculateEffectiveTemperature(star.luminosity, star.radius);
    star.spectralClass = classifySpectralType(star.temperature);
  } else if (remnant === 'neutron_star') {
    star.phase = 'neutron_star';
    star.type = 'star';
    star.mass *= 0.2;
    star.radius = 1.2e4;
    star.luminosity = SOLAR_LUMINOSITY * 0.0001;
    star.fusionStage = 'iron_core_collapse';
    star.temperature = 1.0e6;
    star.spectralClass = 'O';
  } else {
    star.phase = 'black_hole';
    star.type = 'black_hole';
    star.mass *= 0.3;
    star.radius = (2 * 6.6743e-11 * star.mass) / (299792458 * 299792458);
    star.luminosity = 0;
    star.temperature = 0;
    star.fusionStage = 'iron_core_collapse';
  }
}
