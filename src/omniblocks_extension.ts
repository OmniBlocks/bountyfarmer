import {
  DEFAULT_BARYONIC_MATTER_RATIO,
  DEFAULT_DARK_ENERGY_RATIO,
  DEFAULT_DARK_MATTER_RATIO,
  DEFAULT_HUBBLE_CONSTANT
} from './constants';
import { UniverseEngine } from './cosmology/universe';
import { createVector3, distanceBetween } from './math/vector3';
import { calculateGravitationalForce } from './physics/gravity';
import {
  CelestialBody,
  CelestialBodyType,
  ExtensionMetadata
} from './types';

/**
 * Scratch 3.0 and TurboWarp compatible visual block extension for the OmniBlocks Universe Engine.
 */
export class OmniBlocksUniverseExtension {
  private engine: UniverseEngine;

  /**
   * Initializes the visual block extension and underlying cosmological physics engine.
   */
  constructor() {
    this.engine = new UniverseEngine();
  }

  /**
   * Returns metadata and block descriptors for Scratch / TurboWarp VM registration.
   *
   * @returns Complete ExtensionMetadata schema.
   */
  public getInfo(): ExtensionMetadata {
    return {
      id: 'omniblocksUniverse',
      name: 'Universe Engine',
      color1: '#0b132b',
      color2: '#1c2541',
      color3: '#3a506b',
      blocks: [
        {
          opcode: 'initUniverse',
          blockType: 'command',
          text: 'initialize universe H0: [H0] dark energy: [OMEGA_L] matter: [OMEGA_M]',
          arguments: {
            H0: { type: 'number', defaultValue: DEFAULT_HUBBLE_CONSTANT },
            OMEGA_L: { type: 'number', defaultValue: DEFAULT_DARK_ENERGY_RATIO },
            OMEGA_M: { type: 'number', defaultValue: DEFAULT_DARK_MATTER_RATIO + DEFAULT_BARYONIC_MATTER_RATIO }
          }
        },
        {
          opcode: 'stepCosmicTime',
          blockType: 'command',
          text: 'advance cosmic time by [YEARS] years',
          arguments: {
            YEARS: { type: 'number', defaultValue: 1.0e6 }
          }
        },
        {
          opcode: 'stepOrbits',
          blockType: 'command',
          text: 'simulate orbital physics for [SECONDS] seconds with dt [DT]',
          arguments: {
            SECONDS: { type: 'number', defaultValue: 86400 },
            DT: { type: 'number', defaultValue: 3600 }
          }
        },
        {
          opcode: 'addBody',
          blockType: 'command',
          text: 'create celestial body [ID] name: [NAME] type: [TYPE] mass: [MASS] radius: [RADIUS] x: [X] y: [Y] z: [Z]',
          arguments: {
            ID: { type: 'string', defaultValue: 'earth' },
            NAME: { type: 'string', defaultValue: 'Earth' },
            TYPE: { type: 'string', defaultValue: 'planet' },
            MASS: { type: 'number', defaultValue: 5.9722e24 },
            RADIUS: { type: 'number', defaultValue: 6.371e6 },
            X: { type: 'number', defaultValue: 1.496e11 },
            Y: { type: 'number', defaultValue: 0 },
            Z: { type: 'number', defaultValue: 0 }
          }
        },
        {
          opcode: 'removeBody',
          blockType: 'command',
          text: 'destroy celestial body [ID]',
          arguments: {
            ID: { type: 'string', defaultValue: 'earth' }
          }
        },
        {
          opcode: 'populatePreset',
          blockType: 'command',
          text: 'load universe preset [PRESET]',
          arguments: {
            PRESET: { type: 'string', defaultValue: 'solar_system' }
          }
        },
        {
          opcode: 'triggerSupernova',
          blockType: 'command',
          text: 'trigger supernova on star [STAR_ID]',
          arguments: {
            STAR_ID: { type: 'string', defaultValue: 'sun' }
          }
        },
        {
          opcode: 'getCosmicAge',
          blockType: 'reporter',
          text: 'cosmic age (years)'
        },
        {
          opcode: 'getScaleFactor',
          blockType: 'reporter',
          text: 'universe scale factor (a)'
        },
        {
          opcode: 'getCMBTemperature',
          blockType: 'reporter',
          text: 'CMB temperature (Kelvin)'
        },
        {
          opcode: 'getBodyCount',
          blockType: 'reporter',
          text: 'total celestial bodies count'
        },
        {
          opcode: 'getBodyProperty',
          blockType: 'reporter',
          text: 'get property [PROP] of body [ID]',
          arguments: {
            PROP: { type: 'string', defaultValue: 'mass' },
            ID: { type: 'string', defaultValue: 'sun' }
          }
        },
        {
          opcode: 'getDistance',
          blockType: 'reporter',
          text: 'distance from [BODY_A] to [BODY_B] (m)',
          arguments: {
            BODY_A: { type: 'string', defaultValue: 'sun' },
            BODY_B: { type: 'string', defaultValue: 'earth' }
          }
        },
        {
          opcode: 'getGravitationalForce',
          blockType: 'reporter',
          text: 'gravitational force between [BODY_A] and [BODY_B] (N)',
          arguments: {
            BODY_A: { type: 'string', defaultValue: 'sun' },
            BODY_B: { type: 'string', defaultValue: 'earth' }
          }
        },
        {
          opcode: 'getOrbitalPeriod',
          blockType: 'reporter',
          text: 'orbital period of [PLANET_ID] around [STAR_ID] (seconds)',
          arguments: {
            PLANET_ID: { type: 'string', defaultValue: 'earth' },
            STAR_ID: { type: 'string', defaultValue: 'sun' }
          }
        },
        {
          opcode: 'getSchwarzschildRadius',
          blockType: 'reporter',
          text: 'Schwarzschild radius of [ID] (m)',
          arguments: {
            ID: { type: 'string', defaultValue: 'sun' }
          }
        },
        {
          opcode: 'getHawkingTemperature',
          blockType: 'reporter',
          text: 'Hawking temperature of [ID] (K)',
          arguments: {
            ID: { type: 'string', defaultValue: 'sagittarius_a_star' }
          }
        },
        {
          opcode: 'isHabitable',
          blockType: 'Boolean',
          text: 'is [PLANET_ID] habitable around [STAR_ID]?',
          arguments: {
            PLANET_ID: { type: 'string', defaultValue: 'earth' },
            STAR_ID: { type: 'string', defaultValue: 'sun' }
          }
        },
        {
          opcode: 'isStarStable',
          blockType: 'Boolean',
          text: 'is star [ID] stable on main sequence?',
          arguments: {
            ID: { type: 'string', defaultValue: 'sun' }
          }
        }
      ]
    };
  }

  /**
   * Re-initializes the cosmological simulation model.
   *
   * @param args - Block inputs containing H0, OMEGA_L, OMEGA_M.
   */
  public initUniverse(args: { H0?: number; OMEGA_L?: number; OMEGA_M?: number }): void {
    const hubble = Number(args.H0 ?? DEFAULT_HUBBLE_CONSTANT);
    const darkEnergy = Number(args.OMEGA_L ?? DEFAULT_DARK_ENERGY_RATIO);
    const matter = Number(args.OMEGA_M ?? DEFAULT_DARK_MATTER_RATIO + DEFAULT_BARYONIC_MATTER_RATIO);
    const darkMatter = matter * 0.84;
    const baryonic = matter * 0.16;

    this.engine = new UniverseEngine({
      hubbleConstant: hubble,
      darkEnergyRatio: darkEnergy,
      darkMatterRatio: darkMatter,
      baryonicMatterRatio: baryonic
    });
  }

  /**
   * Advances cosmic expansion time.
   *
   * @param args - Block inputs containing YEARS.
   */
  public stepCosmicTime(args: { YEARS?: number }): void {
    const years = Number(args.YEARS ?? 1.0e6);
    this.engine.stepCosmicTime(years);
  }

  /**
   * Steps orbital integration for a total duration in sub-steps.
   *
   * @param args - Block inputs containing SECONDS and DT.
   */
  public stepOrbits(args: { SECONDS?: number; DT?: number }): void {
    const totalSec = Math.max(1, Number(args.SECONDS ?? 86400));
    const dt = Math.max(1, Number(args.DT ?? 3600));
    let elapsed = 0;
    while (elapsed < totalSec) {
      const step = Math.min(dt, totalSec - elapsed);
      this.engine.stepOrbitalPhysics(step);
      elapsed += step;
    }
  }

  /**
   * Registers a new celestial body.
   *
   * @param args - Block arguments specifying body attributes.
   */
  public addBody(args: {
    ID: string;
    NAME: string;
    TYPE: string;
    MASS: number;
    RADIUS: number;
    X: number;
    Y: number;
    Z: number;
  }): void {
    const body: CelestialBody = {
      id: String(args.ID),
      name: String(args.NAME),
      type: args.TYPE as CelestialBodyType,
      mass: Number(args.MASS),
      radius: Number(args.RADIUS),
      position: createVector3(Number(args.X), Number(args.Y), Number(args.Z)),
      velocity: createVector3(0, 0, 0),
      acceleration: createVector3(0, 0, 0),
      luminosity: 0,
      temperature: 0,
      ageYears: 0
    };
    this.engine.addBody(body);
  }

  /**
   * Removes a celestial body.
   *
   * @param args - Block arguments containing ID.
   * @returns True if removed.
   */
  public removeBody(args: { ID: string }): boolean {
    return this.engine.removeBody(String(args.ID));
  }

  /**
   * Populates predefined cosmic configurations.
   *
   * @param args - Block arguments containing PRESET.
   */
  public populatePreset(args: { PRESET: string }): void {
    const preset = String(args.PRESET).toLowerCase();
    if (preset === 'solar_system' || preset === 'sol') {
      this.engine.populateSolarSystem();
    } else if (preset === 'galactic_center' || preset === 'galaxy') {
      this.engine.populateGalacticCenter();
    }
  }

  /**
   * Triggers supernova collapse on a star.
   *
   * @param args - Star identifier.
   * @returns True if triggered.
   */
  public triggerSupernova(args: { STAR_ID: string }): boolean {
    return this.engine.triggerSupernova(String(args.STAR_ID));
  }

  /**
   * Reports current cosmic age in years.
   *
   * @returns Cosmic age scalar.
   */
  public getCosmicAge(): number {
    return this.engine.getState().cosmicAgeYears;
  }

  /**
   * Reports cosmological scale factor.
   *
   * @returns Scale factor scalar.
   */
  public getScaleFactor(): number {
    return this.engine.getState().scaleFactor;
  }

  /**
   * Reports Cosmic Microwave Background radiation temperature.
   *
   * @returns CMB temperature in Kelvin.
   */
  public getCMBTemperature(): number {
    return this.engine.getState().cmbTemperatureK;
  }

  /**
   * Reports count of registered celestial bodies.
   *
   * @returns Celestial body count integer.
   */
  public getBodyCount(): number {
    return this.engine.getAllBodies().length;
  }

  /**
   * Reports a named property of a celestial body.
   *
   * @param args - Block inputs containing ID and PROP.
   * @returns Property value or 0 if not found.
   */
  public getBodyProperty(args: { ID: string; PROP: string }): number | string {
    const body = this.engine.getBody(String(args.ID));
    if (!body) {
      return 0;
    }
    const prop = String(args.PROP).toLowerCase();
    switch (prop) {
      case 'mass':
        return body.mass;
      case 'radius':
        return body.radius;
      case 'luminosity':
        return body.luminosity;
      case 'temperature':
        return body.temperature;
      case 'age':
        return body.ageYears;
      case 'type':
        return body.type;
      case 'spectralclass':
      case 'spectral':
        return body.spectralClass ?? 'unknown';
      case 'phase':
        return body.phase ?? 'unknown';
      case 'x':
        return body.position.x;
      case 'y':
        return body.position.y;
      case 'z':
        return body.position.z;
      default:
        return 0;
    }
  }

  /**
   * Reports distance between two celestial bodies.
   *
   * @param args - Identifiers of BODY_A and BODY_B.
   * @returns Distance in meters or 0 if either body is missing.
   */
  public getDistance(args: { BODY_A: string; BODY_B: string }): number {
    const b1 = this.engine.getBody(String(args.BODY_A));
    const b2 = this.engine.getBody(String(args.BODY_B));
    if (!b1 || !b2) {
      return 0;
    }
    return distanceBetween(b1.position, b2.position);
  }

  /**
   * Reports gravitational attraction force between two bodies.
   *
   * @param args - Identifiers of BODY_A and BODY_B.
   * @returns Force in Newtons.
   */
  public getGravitationalForce(args: { BODY_A: string; BODY_B: string }): number {
    const b1 = this.engine.getBody(String(args.BODY_A));
    const b2 = this.engine.getBody(String(args.BODY_B));
    if (!b1 || !b2) {
      return 0;
    }
    const dist = distanceBetween(b1.position, b2.position);
    return calculateGravitationalForce(b1.mass, b2.mass, dist);
  }

  /**
   * Reports orbital period of a secondary body orbiting a primary host.
   *
   * @param args - Identifiers of PLANET_ID and STAR_ID.
   * @returns Orbital period in seconds or 0 if missing.
   */
  public getOrbitalPeriod(args: { PLANET_ID: string; STAR_ID: string }): number {
    const orbit = this.engine.getKeplerOrbit(String(args.PLANET_ID), String(args.STAR_ID));
    return orbit?.orbitalPeriodSeconds ?? 0;
  }

  /**
   * Reports Schwarzschild event horizon radius for a celestial body.
   *
   * @param args - Target body identifier.
   * @returns Schwarzschild radius in meters.
   */
  public getSchwarzschildRadius(args: { ID: string }): number {
    const info = this.engine.getRelativisticInfo(String(args.ID));
    return info?.schwarzschildRadiusMeters ?? 0;
  }

  /**
   * Reports Hawking radiation blackbody temperature.
   *
   * @param args - Target body identifier.
   * @returns Hawking temperature in Kelvin.
   */
  public getHawkingTemperature(args: { ID: string }): number {
    const info = this.engine.getRelativisticInfo(String(args.ID));
    return info?.hawkingTemperatureK ?? 0;
  }

  /**
   * Evaluates whether a planet is located inside its host star's habitable zone.
   *
   * @param args - Identifiers of PLANET_ID and STAR_ID.
   * @returns True if habitable conditions are met.
   */
  public isHabitable(args: { PLANET_ID: string; STAR_ID: string }): boolean {
    const zone = this.engine.getHabitability(String(args.PLANET_ID), String(args.STAR_ID));
    return zone?.isHabitable ?? false;
  }

  /**
   * Evaluates whether a star is currently stable on the main sequence.
   *
   * @param args - Star identifier.
   * @returns True if on main sequence.
   */
  public isStarStable(args: { ID: string }): boolean {
    const body = this.engine.getBody(String(args.ID));
    return body?.phase === 'main_sequence';
  }

  /**
   * Exposes the underlying UniverseEngine instance for programmatic access.
   *
   * @returns UniverseEngine instance.
   */
  public getEngine(): UniverseEngine {
    return this.engine;
  }
}
