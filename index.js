#!/usr/bin/env node

/**
 * OmniBlocks Universe Engine - Command Line Interface.
 */

const {
  UniverseEngine,
  OmniBlocksUniverseExtension,
  createUniverseServer,
  ASTRONOMICAL_UNIT,
  SOLAR_MASS
} = require('./dist/src/index.js');

function printUsage() {
  console.log('OmniBlocks Universe Engine CLI');
  console.log('');
  console.log('Usage:');
  console.log('  node index.js <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  demo           Run end-to-end cosmological and astrophysical simulation');
  console.log('  serve [port]   Start zero-dependency HTTP REST API gateway (default: 3000)');
  console.log('  --help, -h     Show this usage manual');
  console.log('  --version, -v  Display software version');
}

function runDemo() {
  console.log('=== OmniBlocks Universe Engine Demonstration ===');
  console.log('');

  const extension = new OmniBlocksUniverseExtension();
  const engine = extension.getEngine();

  const stateInitial = engine.getState();
  console.log('[Cosmology] Initial State:');
  console.log(`  Cosmic Age: ${stateInitial.cosmicAgeYears.toExponential(4)} years`);
  console.log(`  Scale Factor (a): ${stateInitial.scaleFactor.toFixed(4)}`);
  console.log(`  CMB Temperature: ${stateInitial.cmbTemperatureK.toFixed(4)} K`);
  console.log(`  Hubble Parameter (H): ${stateInitial.hubbleRate.toFixed(2)} km/s/Mpc`);
  console.log('');

  console.log('[Astrophysics] Populating Solar System and Galactic Center...');
  engine.populateSolarSystem();
  engine.populateGalacticCenter();
  console.log(`  Registered Celestial Bodies: ${engine.getAllBodies().length}`);
  console.log('');

  console.log('[Orbital Mechanics] Earth around Sun:');
  const earthOrbit = engine.getKeplerOrbit('earth', 'sun');
  if (earthOrbit) {
    const periodDays = earthOrbit.orbitalPeriodSeconds / 86400;
    console.log(`  Semi-major Axis: ${(earthOrbit.semiMajorAxis / ASTRONOMICAL_UNIT).toFixed(4)} AU`);
    console.log(`  Orbital Period: ${periodDays.toFixed(2)} days (~${(periodDays / 365.25).toFixed(2)} Earth years)`);
    console.log(`  Mean Orbital Velocity: ${(earthOrbit.orbitalVelocityMetersPerSecond / 1000).toFixed(2)} km/s`);
    console.log(`  Escape Velocity: ${(earthOrbit.escapeVelocityMetersPerSecond / 1000).toFixed(2)} km/s`);
  }
  console.log('');

  console.log('[Habitability Analysis]');
  const planets = ['mercury', 'venus', 'earth', 'mars'];
  for (const planetId of planets) {
    const habitability = engine.getHabitability(planetId, 'sun');
    if (habitability) {
      console.log(`  ${planetId.toUpperCase()}:`);
      console.log(`    Equilibrium Temp: ${habitability.equilibriumTemperatureK.toFixed(1)} K`);
      console.log(`    Habitable Zone Match: ${habitability.isHabitable}`);
    }
  }
  console.log('');

  console.log('[General Relativity & Black Holes] Sagittarius A*:');
  const relInfo = engine.getRelativisticInfo('sagittarius_a_star');
  if (relInfo) {
    console.log(`  Schwarzschild Radius: ${(relInfo.schwarzschildRadiusMeters / 1000).toFixed(2)} km`);
    console.log(`  Hawking Temperature: ${relInfo.hawkingTemperatureK.toExponential(4)} K`);
    console.log(`  Hawking Luminosity: ${relInfo.hawkingLuminosityWatts.toExponential(4)} W`);
  }
  console.log('');

  console.log('[N-Body Symplectic Integration]');
  console.log('  Advancing orbital positions by 30 days (dt = 3600s)...');
  extension.stepOrbits({ SECONDS: 30 * 86400, DT: 3600 });
  const earthBody = engine.getBody('earth');
  if (earthBody) {
    console.log(`  Earth Position: x=${earthBody.position.x.toExponential(3)}, y=${earthBody.position.y.toExponential(3)}, z=${earthBody.position.z.toExponential(3)} m`);
  }
  console.log('');

  console.log('[Stellar Evolution & Supernova]');
  console.log('  Triggering supernova on massive star S2...');
  const supernovaOk = engine.triggerSupernova('star_s2');
  const s2Remnant = engine.getBody('star_s2');
  console.log(`  Supernova Executed: ${supernovaOk}`);
  if (s2Remnant) {
    console.log(`  Post-Collapse Type: ${s2Remnant.type}`);
    console.log(`  Remnant Phase: ${s2Remnant.phase}`);
    console.log(`  Remnant Radius: ${s2Remnant.radius.toFixed(0)} m`);
  }
  console.log('');

  console.log('[OmniBlocks Visual Extension]');
  const metadata = extension.getInfo();
  console.log(`  Extension ID: ${metadata.id}`);
  console.log(`  Extension Name: ${metadata.name}`);
  console.log(`  Block Definitions Count: ${metadata.blocks.length}`);
  console.log(`  Reporter getCosmicAge: ${extension.getCosmicAge().toExponential(4)} years`);
  console.log(`  Boolean isHabitable(earth, sun): ${extension.isHabitable({ PLANET_ID: 'earth', STAR_ID: 'sun' })}`);
  console.log('');
  console.log('Demonstration completed successfully.');
}

function startServer(portStr) {
  const port = parseInt(portStr || process.env.PORT || '3000', 10);
  const server = createUniverseServer(new OmniBlocksUniverseExtension(), port);
  server.listen(port, () => {
    console.log(`OmniBlocks Universe Server listening on http://localhost:${port}`);
    console.log('Endpoints:');
    console.log('  GET  /health');
    console.log('  GET  /universe/state');
    console.log('  POST /universe/preset');
    console.log('  GET  /universe/bodies');
    console.log('  GET  /extension/spec');
  });
}

const args = process.argv.slice(2);
const command = args[0] || 'demo';

switch (command) {
  case 'demo':
    runDemo();
    break;
  case 'serve':
    startServer(args[1]);
    break;
  case '--help':
  case '-h':
    printUsage();
    break;
  case '--version':
  case '-v':
    console.log('1.0.0');
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
}
