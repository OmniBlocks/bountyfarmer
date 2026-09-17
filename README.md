# OmniBlocks Universe Engine

A deterministic cosmological simulation engine, astrophysical physics solver, and visual block extension for OmniBlocks, Scratch 3.0, and TurboWarp.

## Architectural Overview

The Universe Engine simulates cosmological space-time expansion, N-body gravitational dynamics, stellar astrophysics, general relativistic horizons, and circumstellar habitability within a unified TypeScript framework.

### Core Modules

1. **Cosmological State Machine (`src/cosmology/universe.ts`)**: Models cosmic expansion using standard FLRW metrics, tracking scale factor evolution, Hubble parameter dynamics, and Cosmic Microwave Background (CMB) thermal cooling across cosmic epochs.
2. **N-Body Symplectic Integrator (`src/physics/gravity.ts`)**: Implements Velocity Verlet integration with Plummer softening to ensure conservation of energy and linear momentum during gravitational multi-body interactions.
3. **General Relativistic Physics (`src/physics/gravity.ts`)**: Computes exact Schwarzschild event horizons, Hawking radiation blackbody temperatures, Hawking evaporation luminosity, and gravitational time dilation factors.
4. **Orbital Mechanics & Habitability (`src/physics/orbital.ts`)**: Evaluates Keplerian orbital elements, vis-viva velocities, escape speeds, and stellar habitable zones derived from stellar bolometric flux and planetary albedo.
5. **Stellar Astrophysics & Nucleosynthesis (`src/physics/stellar.ts`)**: Implements piecewise mass-luminosity scaling, Stefan-Boltzmann photospheric temperatures, Harvard spectral classification (OBAFGKM), nuclear lifespans, and core-collapse remnant transitions (white dwarf, neutron star, black hole).
6. **OmniBlocks Visual Extension (`src/omniblocks_extension.ts`)**: Scratch 3.0 and TurboWarp compliant extension exposing commands, reporters, and boolean blocks for visual coding.
7. **HTTP REST API Server (`src/server.ts`)**: Zero-dependency HTTP gateway exposing real-time simulation controls, preset loading, and block specification endpoints.
8. **Command Line Interface (`index.js`)**: Executable CLI runner providing end-to-end simulation demonstrations, service hosting, and help utilities.

## Quickstart

### Installation and Compilation

```bash
npm run build
```

### Running Tests

Execute the complete native test suite verifying 30 unit and integration assertions:

```bash
npm test
```

### CLI Demonstration

Run an end-to-end demonstration showcasing cosmic expansion, orbital stability, black hole metrics, and visual extension reporters:

```bash
node index.js demo
```

### Starting the HTTP REST API Server

```bash
node index.js serve 3000
```

## REST API Specification

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Server health check and version metadata |
| `GET` | `/universe/state` | Cosmological state (age, scale factor, redshift, CMB temperature) |
| `POST` | `/universe/init` | Initialize cosmological model with custom parameters |
| `POST` | `/universe/preset` | Populate pre-configured systems (`solar_system`, `galactic_center`) |
| `POST` | `/universe/step/cosmic` | Advance cosmological expansion time |
| `POST` | `/universe/step/orbit` | Advance orbital positions using Verlet integration |
| `GET` | `/universe/bodies` | List celestial bodies (supports `?type=` filter) |
| `POST` | `/universe/bodies` | Register a new celestial body |
| `GET` | `/universe/bodies/:id` | Query specific celestial body details and relativistic properties |
| `DELETE` | `/universe/bodies/:id` | Remove a celestial body from the simulation |
| `POST` | `/universe/bodies/:id/supernova` | Trigger stellar core collapse / supernova |
| `GET` | `/extension/spec` | Export Scratch 3.0 / TurboWarp extension definition schema |

## OmniBlocks Visual Blocks

- **Command Blocks**:
  - `initialize universe H0: [H0] dark energy: [OMEGA_L] matter: [OMEGA_M]`
  - `advance cosmic time by [YEARS] years`
  - `simulate orbital physics for [SECONDS] seconds with dt [DT]`
  - `create celestial body [ID] name: [NAME] type: [TYPE] mass: [MASS] radius: [RADIUS] x: [X] y: [Y] z: [Z]`
  - `destroy celestial body [ID]`
  - `load universe preset [PRESET]`
  - `trigger supernova on star [STAR_ID]`
- **Reporter Blocks**:
  - `cosmic age (years)`
  - `universe scale factor (a)`
  - `CMB temperature (Kelvin)`
  - `total celestial bodies count`
  - `get property [PROP] of body [ID]`
  - `distance from [BODY_A] to [BODY_B] (m)`
  - `gravitational force between [BODY_A] and [BODY_B] (N)`
  - `orbital period of [PLANET_ID] around [STAR_ID] (seconds)`
  - `Schwarzschild radius of [ID] (m)`
  - `Hawking temperature of [ID] (K)`
- **Boolean Blocks**:
  - `is [PLANET_ID] habitable around [STAR_ID]?`
  - `is star [ID] stable on main sequence?`
