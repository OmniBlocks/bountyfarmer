# bountyfarmer

OmniBlocks extension, kinematics engine, and Hello World runner for bounty operations.

## Overview

This repository provides an authentic implementation resolving Issue #31:
- Hello World execution entry point (`index.js`).
- Backflip kinematics and rotational dynamics simulation engine (`src/backflip.js`).
- GitHub follower verification service for target maintainers (`src/github_follower.js`).
- Statutory payout ceiling and multi-currency terms evaluator supporting quadrillion bounds (`src/terms_evaluator.js`).
- 30-minute bounty expiry tracking service (`src/expiry_tracker.js`).
- Native OmniBlocks / Scratch / TurboWarp custom block extension (`src/omniblocks_extension.js`).
- Comprehensive regression test suite (`test/issue_31.test.js`).

## Quickstart

### Run Entry Point
```bash
node index.js
```

Expected output includes `Hello, World!` along with physical simulation metrics.

### Run Verification Suite
```bash
npm test
```

## Architecture

| Component | File | Description |
|---|---|---|
| Main Entry | `index.js` | Exports modules and prints Hello World with telemetry |
| Backflip Engine | `src/backflip.js` | 2D kinematic trajectory and rotational stability calculation |
| Follower Verifier | `src/github_follower.js` | GitHub account format validator and follow state checker |
| Terms Evaluator | `src/terms_evaluator.js` | Payout bounds and multi-currency exchange valuation |
| Expiry Tracker | `src/expiry_tracker.js` | 30-minute issue submission window tracker |
| OmniBlocks Extension | `src/omniblocks_extension.js` | Custom block opcodes and execution handlers |
| Test Suite | `test/issue_31.test.js` | Zero-mock automated verification tests |

---

<sub>
* Terms and conditions apply. Currency not decided yet. We said "up to" so even if we paid no money then we would still be right. Bounty expiry is 30 minutes within the issue creation.
</sub>
