import {
  ASTRONOMICAL_UNIT,
  DEFAULT_BARYONIC_MATTER_RATIO,
  DEFAULT_COSMIC_AGE_YEARS,
  DEFAULT_DARK_ENERGY_RATIO,
  DEFAULT_DARK_MATTER_RATIO,
  DEFAULT_HUBBLE_CONSTANT,
  DEFAULT_SOFTENING_LENGTH,
  EARTH_MASS,
  EARTH_RADIUS,
  LIGHT_YEAR,
  PRESENT_CMB_TEMPERATURE,
  SOLAR_LUMINOSITY,
  SOLAR_MASS,
  SOLAR_RADIUS,
  SOLAR_TEMPERATURE
} from '../constants';
import { createVector3 } from '../math/vector3';
import {
  calculateRelativisticProperties,
  stepVerlet
} from '../physics/gravity';
import {
  calculateCircularVelocity,
  calculateHabitableZone,
  calculateKeplerianOrbit
} from '../physics/orbital';
import {
  advanceStellarEvolution,
  triggerCoreCollapse
} from '../physics/stellar';
import {
  CelestialBody,
  CelestialBodyType,
  CosmologicalParameters,
  CosmologicalState,
  HabitableZone,
  KeplerianOrbit,
  RelativisticProperties
} from '../types';

/**
 * Cosmological universe engine managing space-time metric evolution, N-body dynamics, and celestial hierarchy.
 */
export class UniverseEngine {
  private parameters: CosmologicalParameters;
  private cosmicAgeYears: number;
  private scaleFactor: number;
  private bodies: Map<string, CelestialBody>;

  /**
   * Initializes a universe simulation instance with standard or custom cosmological parameters.
   *
   * @param params - Optional initial cosmological parameters.
   * @param initialAgeYears - Initial cosmic age in years.
   */
  constructor(
    params?: Partial<CosmologicalParameters>,
    initialAgeYears: number = DEFAULT_COSMIC_AGE_YEARS
  ) {
    this.parameters = {
      hubbleConstant: params?.hubbleConstant ?? DEFAULT_HUBBLE_CONSTANT,
      darkEnergyRatio: params?.darkEnergyRatio ?? DEFAULT_DARK_ENERGY_RATIO,
      darkMatterRatio: params?.darkMatterRatio ?? DEFAULT_DARK_MATTER_RATIO,
      baryonicMatterRatio: params?.baryonicMatterRatio ?? DEFAULT_BARYONIC_MATTER_RATIO
    };
    this.cosmicAgeYears = initialAgeYears;
    this.scaleFactor = Math.pow(this.cosmicAgeYears / DEFAULT_COSMIC_AGE_YEARS, 2 / 3);
    this.bodies = new Map();
  }

  /**
   * Retrieves the current comprehensive cosmological state.
   *
   * @returns Current cosmological state snapshot.
   */
  public getState(): CosmologicalState {
    const a = Math.max(1.0e-5, this.scaleFactor);
    const z = 1 / a - 1;
    const matterRatio = this.parameters.darkMatterRatio + this.parameters.baryonicMatterRatio;
    const darkEnergy = this.parameters.darkEnergyRatio;
    const hRatioSq = matterRatio * Math.pow(1 + z, 3) + darkEnergy;
    const hubbleRate = this.parameters.hubbleConstant * Math.sqrt(Math.max(0.01, hRatioSq));
    const cmbTemperatureK = PRESENT_CMB_TEMPERATURE / a;

    return {
      cosmicAgeYears: this.cosmicAgeYears,
      scaleFactor: a,
      redshift: Math.max(-0.999, z),
      hubbleRate,
      cmbTemperatureK,
      parameters: { ...this.parameters }
    };
  }

  /**
   * Adds or registers a celestial body into the universe simulation.
   *
   * @param body - Celestial body configuration.
   */
  public addBody(body: CelestialBody): void {
    this.bodies.set(body.id, {
      ...body,
      position: { ...body.position },
      velocity: { ...body.velocity },
      acceleration: { ...body.acceleration }
    });
  }

  /**
   * Removes a body from the universe by identifier.
   *
   * @param id - Unique celestial body identifier.
   * @returns True if the body was found and removed, false otherwise.
   */
  public removeBody(id: string): boolean {
    return this.bodies.delete(id);
  }

  /**
   * Fetches a body by unique identifier.
   *
   * @param id - Celestial body identifier.
   * @returns The celestial body or undefined if not present.
   */
  public getBody(id: string): CelestialBody | undefined {
    return this.bodies.get(id);
  }

  /**
   * Returns all bodies currently registered in the universe.
   *
   * @returns Array of celestial bodies.
   */
  public getAllBodies(): CelestialBody[] {
    return Array.from(this.bodies.values());
  }

  /**
   * Filters celestial bodies by type.
   *
   * @param type - Celestial body classification type.
   * @returns Filtered array of matching bodies.
   */
  public getBodiesByType(type: CelestialBodyType): CelestialBody[] {
    return this.getAllBodies().filter((b) => b.type === type);
  }

  /**
   * Advances cosmic expansion and astrophysical evolution across a time step.
   *
   * @param deltaYears - Elapsed duration in Julian years.
   */
  public stepCosmicTime(deltaYears: number): void {
    this.cosmicAgeYears += deltaYears;
    this.scaleFactor = Math.pow(Math.max(1.0e-5, this.cosmicAgeYears / DEFAULT_COSMIC_AGE_YEARS), 2 / 3);

    for (const body of this.bodies.values()) {
      if (body.type === 'star') {
        advanceStellarEvolution(body, deltaYears);
      }
    }
  }

  /**
   * Advances orbital kinematics and N-body gravitational positions using symplectic integration.
   *
   * @param dtSeconds - Time step duration in seconds.
   * @param softeningMeters - Plummer gravitational softening length.
   */
  public stepOrbitalPhysics(
    dtSeconds: number,
    softeningMeters: number = DEFAULT_SOFTENING_LENGTH
  ): void {
    const list = this.getAllBodies();
    stepVerlet(list, dtSeconds, softeningMeters);
  }

  /**
   * Manually collapses a star or triggers supernova into a compact remnant.
   *
   * @param starId - Identifier of the target star.
   * @returns True if successful, false if the target was not found or is not a star.
   */
  public triggerSupernova(starId: string): boolean {
    const body = this.bodies.get(starId);
    if (!body || body.type !== 'star') {
      return false;
    }
    triggerCoreCollapse(body);
    return true;
  }

  /**
   * Calculates relativistic Schwarzschild and Hawking parameters for a body.
   *
   * @param bodyId - Target body identifier.
   * @returns Relativistic property container or undefined if body is not found.
   */
  public getRelativisticInfo(bodyId: string): RelativisticProperties | undefined {
    const body = this.bodies.get(bodyId);
    if (!body) {
      return undefined;
    }
    return calculateRelativisticProperties(body.mass, body.radius);
  }

  /**
   * Calculates Keplerian orbit characteristics for a secondary body orbiting a primary host.
   *
   * @param secondaryId - Orbiting satellite or planet identifier.
   * @param primaryId - Central host body identifier.
   * @returns Keplerian orbit container or undefined if either body is missing.
   */
  public getKeplerOrbit(secondaryId: string, primaryId: string): KeplerianOrbit | undefined {
    const secondary = this.bodies.get(secondaryId);
    const primary = this.bodies.get(primaryId);
    if (!secondary || !primary) {
      return undefined;
    }

    const dx = secondary.position.x - primary.position.x;
    const dy = secondary.position.y - primary.position.y;
    const dz = secondary.position.z - primary.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    return calculateKeplerianOrbit(distance, 0, primary.mass, secondary.mass);
  }

  /**
   * Analyzes circumstellar habitability for a planet orbiting a star.
   *
   * @param planetId - Planet identifier.
   * @param starId - Star identifier.
   * @returns Habitable zone analysis or undefined if either body is missing.
   */
  public getHabitability(planetId: string, starId: string): HabitableZone | undefined {
    const planet = this.bodies.get(planetId);
    const star = this.bodies.get(starId);
    if (!planet || !star) {
      return undefined;
    }

    const dx = planet.position.x - star.position.x;
    const dy = planet.position.y - star.position.y;
    const dz = planet.position.z - star.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    return calculateHabitableZone(star.luminosity, distance);
  }

  /**
   * Populates the engine with an astrophysical model of the Solar System.
   */
  public populateSolarSystem(): void {
    const sun: CelestialBody = {
      id: 'sun',
      name: 'Sun',
      type: 'star',
      mass: SOLAR_MASS,
      radius: SOLAR_RADIUS,
      position: createVector3(0, 0, 0),
      velocity: createVector3(0, 0, 0),
      acceleration: createVector3(0, 0, 0),
      luminosity: SOLAR_LUMINOSITY,
      temperature: SOLAR_TEMPERATURE,
      ageYears: 4.6e9,
      spectralClass: 'G',
      phase: 'main_sequence',
      fusionStage: 'hydrogen_fusion'
    };
    this.addBody(sun);

    const planetDefs = [
      { id: 'mercury', name: 'Mercury', mass: 3.3011e23, radius: 2.4397e6, distAU: 0.3871 },
      { id: 'venus', name: 'Venus', mass: 4.8675e24, radius: 6.0518e6, distAU: 0.7233 },
      { id: 'earth', name: 'Earth', mass: EARTH_MASS, radius: EARTH_RADIUS, distAU: 1.0000 },
      { id: 'mars', name: 'Mars', mass: 6.4171e23, radius: 3.3895e6, distAU: 1.5237 },
      { id: 'jupiter', name: 'Jupiter', mass: 1.8982e27, radius: 6.9911e7, distAU: 5.2044 },
      { id: 'saturn', name: 'Saturn', mass: 5.6834e26, radius: 5.8232e7, distAU: 9.5826 },
      { id: 'uranus', name: 'Uranus', mass: 8.6810e25, radius: 2.5362e7, distAU: 19.2184 },
      { id: 'neptune', name: 'Neptune', mass: 1.02413e26, radius: 2.4622e7, distAU: 30.1104 }
    ];

    for (const def of planetDefs) {
      const distM = def.distAU * ASTRONOMICAL_UNIT;
      const vOrb = calculateCircularVelocity(distM, SOLAR_MASS);

      const planet: CelestialBody = {
        id: def.id,
        name: def.name,
        type: 'planet',
        mass: def.mass,
        radius: def.radius,
        position: createVector3(distM, 0, 0),
        velocity: createVector3(0, vOrb, 0),
        acceleration: createVector3(0, 0, 0),
        luminosity: 0,
        temperature: 250,
        ageYears: 4.5e9,
        parentId: 'sun'
      };
      this.addBody(planet);
    }
  }

  /**
   * Populates the engine with the galactic center model featuring Sagittarius A* at galactic distance.
   */
  public populateGalacticCenter(): void {
    const galacticDist = 26000 * LIGHT_YEAR;

    const sagA: CelestialBody = {
      id: 'sagittarius_a_star',
      name: 'Sagittarius A*',
      type: 'black_hole',
      mass: 4.154e6 * SOLAR_MASS,
      radius: (2 * 6.6743e-11 * (4.154e6 * SOLAR_MASS)) / (299792458 * 299792458),
      position: createVector3(galacticDist, 0, 0),
      velocity: createVector3(0, 0, 0),
      acceleration: createVector3(0, 0, 0),
      luminosity: 0,
      temperature: 0,
      ageYears: 13.0e9,
      phase: 'black_hole',
      fusionStage: 'iron_core_collapse'
    };
    this.addBody(sagA);

    const s2OrbitDist = 120 * ASTRONOMICAL_UNIT;
    const s2Velocity = calculateCircularVelocity(s2OrbitDist, sagA.mass);

    const s2Star: CelestialBody = {
      id: 'star_s2',
      name: 'S2 (B0V Star)',
      type: 'star',
      mass: 14 * SOLAR_MASS,
      radius: 7 * SOLAR_RADIUS,
      position: createVector3(galacticDist + s2OrbitDist, 0, 0),
      velocity: createVector3(0, s2Velocity, 0),
      acceleration: createVector3(0, 0, 0),
      luminosity: 1000 * SOLAR_LUMINOSITY,
      temperature: 27000,
      ageYears: 1.0e7,
      spectralClass: 'B',
      phase: 'main_sequence',
      fusionStage: 'hydrogen_fusion',
      parentId: 'sagittarius_a_star'
    };
    this.addBody(s2Star);
  }
}
