import assert from 'node:assert/strict';
import * as http from 'http';
import { after, before, describe, it } from 'node:test';

import {
  ASTRONOMICAL_UNIT,
  EARTH_MASS,
  EARTH_RADIUS,
  GRAVITATIONAL_CONSTANT,
  LIGHT_YEAR,
  PRESENT_CMB_TEMPERATURE,
  SOLAR_LUMINOSITY,
  SOLAR_MASS,
  SOLAR_RADIUS,
  SOLAR_TEMPERATURE,
  SPEED_OF_LIGHT
} from '../src/constants';
import {
  addVectors,
  crossVectors,
  distanceBetween,
  dotVectors,
  normalizeVector,
  scaleVector,
  subVectors,
  vectorMagnitude
} from '../src/math/vector3';
import {
  calculateCenterOfMassVelocity,
  calculateGravitationalAcceleration,
  calculateGravitationalForce,
  calculateGravitationalTimeDilation,
  calculateHawkingLuminosity,
  calculateHawkingTemperature,
  calculateRelativisticProperties,
  calculateSchwarzschildRadius,
  calculateTotalKineticEnergy,
  calculateTotalMechanicalEnergy,
  computeNBodyAccelerations,
  stepVerlet
} from '../src/physics/gravity';
import {
  calculateCircularVelocity,
  calculateEscapeVelocity,
  calculateHabitableZone,
  calculateKeplerianOrbit,
  calculateOrbitalPeriod,
  calculateOrbitalVelocity
} from '../src/physics/orbital';
import {
  calculateEffectiveTemperature,
  calculateMainSequenceLuminosity,
  classifySpectralType,
  determineStellarRemnant,
  estimateMainSequenceLifetimeYears
} from '../src/physics/stellar';
import { UniverseEngine } from '../src/cosmology/universe';
import { OmniBlocksUniverseExtension } from '../src/omniblocks_extension';
import { createUniverseServer } from '../src/server';
import { CelestialBody } from '../src/types';

describe('Vector3D Mathematical Invariants', () => {
  it('performs vector addition and subtraction correctly', () => {
    const v1 = { x: 3, y: -4, z: 5 };
    const v2 = { x: 1, y: 2, z: -3 };

    const sum = addVectors(v1, v2);
    assert.equal(sum.x, 4);
    assert.equal(sum.y, -2);
    assert.equal(sum.z, 2);

    const diff = subVectors(v1, v2);
    assert.equal(diff.x, 2);
    assert.equal(diff.y, -6);
    assert.equal(diff.z, 8);
  });

  it('computes magnitude and normalizes unit vectors', () => {
    const v = { x: 0, y: 3, z: 4 };
    assert.equal(vectorMagnitude(v), 5);

    const unit = normalizeVector(v);
    assert.equal(unit.x, 0);
    assert.ok(Math.abs(unit.y - 0.6) < 1.0e-12);
    assert.ok(Math.abs(unit.z - 0.8) < 1.0e-12);
    assert.ok(Math.abs(vectorMagnitude(unit) - 1.0) < 1.0e-12);
  });

  it('verifies dot product and cross product orthogonality', () => {
    const a = { x: 1, y: 0, z: 0 };
    const b = { x: 0, y: 1, z: 0 };

    assert.equal(dotVectors(a, b), 0);

    const cross = crossVectors(a, b);
    assert.equal(cross.x, 0);
    assert.equal(cross.y, 0);
    assert.equal(cross.z, 1);

    assert.equal(dotVectors(cross, a), 0);
    assert.equal(dotVectors(cross, b), 0);
  });

  it('measures Euclidean distances', () => {
    const p1 = { x: 1, y: 2, z: 3 };
    const p2 = { x: 4, y: 6, z: 3 };
    assert.equal(distanceBetween(p1, p2), 5);
  });
});

describe('Astrophysical Gravity and Relativistic Physics', () => {
  it('computes precise Newtonian gravitational force', () => {
    const m1 = SOLAR_MASS;
    const m2 = EARTH_MASS;
    const r = ASTRONOMICAL_UNIT;

    const force = calculateGravitationalForce(m1, m2, r, 0);
    const expected = (GRAVITATIONAL_CONSTANT * m1 * m2) / (r * r);
    assert.ok(Math.abs(force - expected) < 1.0);
    assert.ok(force > 3.5e22 && force < 3.6e22);
  });

  it('preserves linear momentum during N-body gravitational integration', () => {
    const b1: CelestialBody = {
      id: 'body1',
      name: 'Body 1',
      type: 'star',
      mass: 1.0e30,
      radius: 1.0e8,
      position: { x: -1.0e10, y: 0, z: 0 },
      velocity: { x: 0, y: 1.0e4, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      luminosity: 1.0e26,
      temperature: 5000,
      ageYears: 1.0e8
    };

    const b2: CelestialBody = {
      id: 'body2',
      name: 'Body 2',
      type: 'star',
      mass: 2.0e30,
      radius: 1.5e8,
      position: { x: 1.0e10, y: 0, z: 0 },
      velocity: { x: 0, y: -5.0e3, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      luminosity: 2.0e26,
      temperature: 6000,
      ageYears: 1.0e8
    };

    const ensemble = [b1, b2];
    const initialVcm = calculateCenterOfMassVelocity(ensemble);
    assert.ok(Math.abs(initialVcm.x) < 1.0e-10);
    assert.ok(Math.abs(initialVcm.y) < 1.0e-10);

    for (let step = 0; step < 100; step += 1) {
      stepVerlet(ensemble, 3600);
    }

    const finalVcm = calculateCenterOfMassVelocity(ensemble);
    assert.ok(Math.abs(finalVcm.x) < 1.0e-6);
    assert.ok(Math.abs(finalVcm.y) < 1.0e-6);
  });

  it('calculates Schwarzschild radius for Sun and Earth', () => {
    const sunRs = calculateSchwarzschildRadius(SOLAR_MASS);
    assert.ok(sunRs > 2950 && sunRs < 2960);

    const earthRs = calculateSchwarzschildRadius(EARTH_MASS);
    assert.ok(earthRs > 0.0088 && earthRs < 0.0089);
  });

  it('calculates Hawking radiation temperature and luminosity for stellar black hole', () => {
    const mass = 10 * SOLAR_MASS;
    const tHawking = calculateHawkingTemperature(mass);
    const lHawking = calculateHawkingLuminosity(mass);

    assert.ok(tHawking > 0);
    assert.ok(tHawking < 1.0e-7);
    assert.ok(lHawking > 0);

    const relProps = calculateRelativisticProperties(mass, 5.0e4);
    assert.ok(relProps.schwarzschildRadiusMeters > 29000);
    assert.ok(relProps.gravitationalTimeDilation > 0 && relProps.gravitationalTimeDilation < 1);
  });

  it('evaluates gravitational time dilation limits', () => {
    const mass = SOLAR_MASS;
    const rs = calculateSchwarzschildRadius(mass);

    const dilationAtHorizon = calculateGravitationalTimeDilation(mass, rs * 0.99);
    assert.equal(dilationAtHorizon, 0);

    const dilationFar = calculateGravitationalTimeDilation(mass, 1.0e12);
    assert.ok(Math.abs(dilationFar - 1.0) < 1.0e-8);
  });
});

describe('Orbital Mechanics and Planetary Habitability', () => {
  it('confirms Keplerian orbital period for Earth-Sun system matches one year', () => {
    const period = calculateOrbitalPeriod(ASTRONOMICAL_UNIT, SOLAR_MASS, EARTH_MASS);
    const periodDays = period / 86400;
    assert.ok(Math.abs(periodDays - 365.25) < 0.5);
  });

  it('verifies vis-viva equation matches circular and escape velocities', () => {
    const r = ASTRONOMICAL_UNIT;
    const vCirc = calculateCircularVelocity(r, SOLAR_MASS);
    const vVisViva = calculateOrbitalVelocity(r, r, SOLAR_MASS);
    assert.ok(Math.abs(vCirc - vVisViva) < 1.0e-6);

    const vEsc = calculateEscapeVelocity(r, SOLAR_MASS);
    const expectedRatio = Math.SQRT2;
    assert.ok(Math.abs(vEsc / vCirc - expectedRatio) < 1.0e-5);
  });

  it('derives comprehensive Keplerian orbit elements', () => {
    const orbit = calculateKeplerianOrbit(ASTRONOMICAL_UNIT, 0.0167, SOLAR_MASS, EARTH_MASS);
    assert.ok(orbit.periapsisMeters < orbit.semiMajorAxis);
    assert.ok(orbit.apoapsisMeters > orbit.semiMajorAxis);
    assert.ok(orbit.orbitalVelocityMetersPerSecond > 29000 && orbit.orbitalVelocityMetersPerSecond < 31000);
  });

  it('evaluates circumstellar habitable zone criteria', () => {
    const earthHab = calculateHabitableZone(SOLAR_LUMINOSITY, ASTRONOMICAL_UNIT);
    assert.equal(earthHab.isHabitable, true);
    assert.ok(earthHab.equilibriumTemperatureK > 240 && earthHab.equilibriumTemperatureK < 270);

    const mercuryHab = calculateHabitableZone(SOLAR_LUMINOSITY, 0.387 * ASTRONOMICAL_UNIT);
    assert.equal(mercuryHab.isHabitable, false);

    const marsHab = calculateHabitableZone(SOLAR_LUMINOSITY, 1.524 * ASTRONOMICAL_UNIT);
    assert.equal(marsHab.isHabitable, false);
  });
});

describe('Stellar Astrophysics and Nucleosynthesis', () => {
  it('computes solar luminosity and effective surface temperature', () => {
    const lSun = calculateMainSequenceLuminosity(SOLAR_MASS);
    assert.ok(Math.abs(lSun - SOLAR_LUMINOSITY) < 1.0e-3);

    const tSun = calculateEffectiveTemperature(SOLAR_LUMINOSITY, SOLAR_RADIUS);
    assert.ok(Math.abs(tSun - SOLAR_TEMPERATURE) < 10);
    assert.equal(classifySpectralType(tSun), 'G');
  });

  it('classifies stellar spectral types across temperature ranges', () => {
    assert.equal(classifySpectralType(35000), 'O');
    assert.equal(classifySpectralType(15000), 'B');
    assert.equal(classifySpectralType(8500), 'A');
    assert.equal(classifySpectralType(6500), 'F');
    assert.equal(classifySpectralType(5500), 'G');
    assert.equal(classifySpectralType(4200), 'K');
    assert.equal(classifySpectralType(3000), 'M');
  });

  it('estimates main-sequence lifetimes inversely proportional to mass', () => {
    const tSun = estimateMainSequenceLifetimeYears(SOLAR_MASS);
    assert.ok(Math.abs(tSun - 1.0e10) < 1.0e5);

    const tMassive = estimateMainSequenceLifetimeYears(10 * SOLAR_MASS);
    assert.ok(tMassive < tSun);
    assert.ok(tMassive < 4.0e7);
  });

  it('determines stellar remnant fates based on progenitor mass', () => {
    assert.equal(determineStellarRemnant(1.0 * SOLAR_MASS), 'white_dwarf');
    assert.equal(determineStellarRemnant(12.0 * SOLAR_MASS), 'neutron_star');
    assert.equal(determineStellarRemnant(30.0 * SOLAR_MASS), 'black_hole');
  });
});

describe('Cosmological Universe Engine State Machine', () => {
  it('initializes cosmological parameters and verifies initial expansion state', () => {
    const universe = new UniverseEngine();
    const state = universe.getState();

    assert.equal(state.scaleFactor, 1.0);
    assert.equal(state.redshift, 0);
    assert.ok(Math.abs(state.cmbTemperatureK - PRESENT_CMB_TEMPERATURE) < 1.0e-4);
    assert.equal(state.parameters.hubbleConstant, 67.4);
  });

  it('advances cosmic time and cools CMB temperature', () => {
    const universe = new UniverseEngine();
    const t0 = universe.getState().cmbTemperatureK;

    universe.stepCosmicTime(5.0e9);
    const state1 = universe.getState();

    assert.ok(state1.scaleFactor > 1.0);
    assert.ok(state1.cmbTemperatureK < t0);
  });

  it('manages celestial body registration, queries, and removals', () => {
    const universe = new UniverseEngine();
    const body: CelestialBody = {
      id: 'test_star',
      name: 'Proxima',
      type: 'star',
      mass: 0.12 * SOLAR_MASS,
      radius: 0.15 * SOLAR_RADIUS,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      luminosity: 0.0017 * SOLAR_LUMINOSITY,
      temperature: 3050,
      ageYears: 4.8e9,
      spectralClass: 'M',
      phase: 'main_sequence'
    };

    universe.addBody(body);
    assert.equal(universe.getAllBodies().length, 1);
    assert.equal(universe.getBody('test_star')?.name, 'Proxima');
    assert.equal(universe.getBodiesByType('star').length, 1);

    const removed = universe.removeBody('test_star');
    assert.equal(removed, true);
    assert.equal(universe.getAllBodies().length, 0);
  });

  it('populates solar system and maintains stable Earth orbit over 30 days', () => {
    const universe = new UniverseEngine();
    universe.populateSolarSystem();

    assert.equal(universe.getAllBodies().length, 9);
    const earth = universe.getBody('earth');
    assert.ok(earth);

    for (let day = 0; day < 30; day += 1) {
      universe.stepOrbitalPhysics(86400);
    }

    const earthAfter = universe.getBody('earth');
    assert.ok(earthAfter);
    const distanceM = Math.hypot(earthAfter.position.x, earthAfter.position.y);
    assert.ok(Math.abs(distanceM - ASTRONOMICAL_UNIT) / ASTRONOMICAL_UNIT < 0.005);
  });

  it('triggers stellar core collapse on a star into a compact remnant', () => {
    const universe = new UniverseEngine();
    const star: CelestialBody = {
      id: 'supergiant',
      name: 'Betelgeuse Progenitor',
      type: 'star',
      mass: 15 * SOLAR_MASS,
      radius: 500 * SOLAR_RADIUS,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      luminosity: 1.0e5 * SOLAR_LUMINOSITY,
      temperature: 3500,
      ageYears: 1.0e7,
      phase: 'red_giant'
    };
    universe.addBody(star);

    const success = universe.triggerSupernova('supergiant');
    assert.equal(success, true);

    const remnant = universe.getBody('supergiant');
    assert.ok(remnant);
    assert.equal(remnant.phase, 'neutron_star');
    assert.equal(remnant.fusionStage, 'iron_core_collapse');
  });
});

describe('OmniBlocks Scratch 3.0 / TurboWarp Visual Extension', () => {
  it('conforms to Scratch VM extension specification schema', () => {
    const ext = new OmniBlocksUniverseExtension();
    const info = ext.getInfo();

    assert.equal(info.id, 'omniblocksUniverse');
    assert.equal(info.name, 'Universe Engine');
    assert.ok(info.blocks.length >= 15);

    for (const b of info.blocks) {
      assert.ok(b.opcode);
      assert.ok(b.blockType);
      assert.ok(b.text);
    }
  });

  it('executes command, reporter, and boolean blocks seamlessly', () => {
    const ext = new OmniBlocksUniverseExtension();

    ext.populatePreset({ PRESET: 'solar_system' });
    assert.equal(ext.getBodyCount(), 9);

    const age = ext.getCosmicAge();
    assert.ok(age > 1.3e10);

    const dist = ext.getDistance({ BODY_A: 'sun', BODY_B: 'earth' });
    assert.ok(Math.abs(dist - ASTRONOMICAL_UNIT) < 1.0e7);

    const force = ext.getGravitationalForce({ BODY_A: 'sun', BODY_B: 'earth' });
    assert.ok(force > 3.5e22);

    const period = ext.getOrbitalPeriod({ PLANET_ID: 'earth', STAR_ID: 'sun' });
    assert.ok(Math.abs(period / 86400 - 365.25) < 0.5);

    const habitable = ext.isHabitable({ PLANET_ID: 'earth', STAR_ID: 'sun' });
    assert.equal(habitable, true);

    const stable = ext.isStarStable({ ID: 'sun' });
    assert.equal(stable, true);

    ext.stepOrbits({ SECONDS: 86400, DT: 3600 });
    assert.equal(ext.getBodyCount(), 9);

    const rs = ext.getSchwarzschildRadius({ ID: 'sun' });
    assert.ok(rs > 2950 && rs < 2960);
  });
});

describe('HTTP REST API Gateway Integration', () => {
  let server: http.Server;
  const testPort = 31415;

  before((_, done) => {
    server = createUniverseServer(new OmniBlocksUniverseExtension(), testPort);
    server.listen(testPort, () => done());
  });

  after((_, done) => {
    server.close(() => done());
  });

  const request = (method: string, path: string, payload?: unknown): Promise<{ status: number; body: any }> =>
    new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: testPort,
          path,
          method,
          headers: { 'Content-Type': 'application/json' }
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode ?? 500, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode ?? 500, body: data });
            }
          });
        }
      );
      req.on('error', reject);
      if (payload) {
        req.write(JSON.stringify(payload));
      }
      req.end();
    });

  it('GET /health returns healthy status and service version', async () => {
    const res = await request('GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'omniblocks-universe-engine');
  });

  it('GET /universe/state returns cosmological state', async () => {
    const res = await request('GET', '/universe/state');
    assert.equal(res.status, 200);
    assert.ok(res.body.cosmicAgeYears > 1.3e10);
    assert.equal(res.body.scaleFactor, 1.0);
  });

  it('POST /universe/preset loads solar system preset', async () => {
    const res = await request('POST', '/universe/preset', { preset: 'solar_system' });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.bodyCount, 9);
  });

  it('GET /universe/bodies lists bodies and filters by type', async () => {
    const resAll = await request('GET', '/universe/bodies');
    assert.equal(resAll.status, 200);
    assert.equal(resAll.body.bodies.length, 9);

    const resStars = await request('GET', '/universe/bodies?type=star');
    assert.equal(resStars.status, 200);
    assert.equal(resStars.body.bodies.length, 1);
    assert.equal(resStars.body.bodies[0].id, 'sun');
  });

  it('POST /universe/bodies creates a new celestial body', async () => {
    const newBody = {
      id: 'custom_asteroid',
      name: 'Ceres Prime',
      type: 'asteroid',
      mass: 9.38e20,
      radius: 4.7e5,
      position: { x: 4.0e11, y: 0, z: 0 },
      velocity: { x: 0, y: 1.8e4, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      luminosity: 0,
      temperature: 160,
      ageYears: 4.5e9
    };

    const res = await request('POST', '/universe/bodies', newBody);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.body.name, 'Ceres Prime');

    const getRes = await request('GET', '/universe/bodies/custom_asteroid');
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.body.id, 'custom_asteroid');

    const delRes = await request('DELETE', '/universe/bodies/custom_asteroid');
    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.removedId, 'custom_asteroid');
  });

  it('GET /extension/spec returns Scratch 3.0 / TurboWarp extension metadata', async () => {
    const res = await request('GET', '/extension/spec');
    assert.equal(res.status, 200);
    assert.equal(res.body.id, 'omniblocksUniverse');
    assert.equal(res.body.name, 'Universe Engine');
    assert.ok(Array.isArray(res.body.blocks));
  });
});
