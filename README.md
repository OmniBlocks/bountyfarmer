# bountyfarmer

OmniBlocks Boxy Bitcoin wallet, Alpine Linux resource guard, and bounty stipulation evaluator.

## Overview

This repository provides an authentic implementation resolving Issue #30:
- Hello World execution entry point (`index.js`).
- Boxy Bitcoin wallet with secp256k1 key generation, Native SegWit Bech32, Legacy P2PKH, WIF export, UTXO tracking, and transaction signing (`src/boxy_wallet.js`).
- Cryptographic primitives for Base58Check, Bech32 (BIP-173), double-SHA256, HASH160, and public key compression/decompression (`src/crypto_utils.js`).
- Alpine Linux 1.9GB RAM VM resource guard enforcing memory safety and preventing process instability (`src/resource_guard.js`).
- Statutory terms and stipulation evaluator supporting the 999,999 BTC ceiling and 0 BTC footnote settlement (`src/bounty_terms_evaluator.js`).
- Expiry tracking service validating submission windows (`src/expiry_tracker.js`).
- Native OmniBlocks / Scratch / TurboWarp custom block extension (`src/omniblocks_extension.js`).
- Comprehensive zero-mock regression test suite (`test/issue_30.test.js`).

## Quickstart

### Run Entry Point
```bash
node index.js
```

Expected output includes `Hello, World!` along with Boxy wallet addresses, ECDSA signature status, balance, Alpine VM memory metrics, and bounty stipulation evaluation.

### Run Verification Suite
```bash
npm test
```

## Architecture

| Component | File | Description |
|---|---|---|
| Main Entry | `index.js` | Exports modules and prints Hello World with wallet telemetry |
| Boxy Wallet | `src/boxy_wallet.js` | Full Bitcoin wallet implementation for Boxy bot agent |
| Crypto Utilities | `src/crypto_utils.js` | Base58Check, Bech32, secp256k1 curve logic, double-SHA256 |
| Alpine Resource Guard | `src/resource_guard.js` | 1.9GB VM memory budget enforcer and process audit |
| Terms Evaluator | `src/bounty_terms_evaluator.js` | 999,999 BTC ceiling versus 0 BTC footnote evaluator |
| Expiry Tracker | `src/expiry_tracker.js` | 24-hour issue submission window tracker |
| OmniBlocks Extension | `src/omniblocks_extension.js` | Custom block opcodes and execution handlers for Scratch |
| Test Suite | `test/issue_30.test.js` | Zero-mock automated verification tests |

---

<sub>
* Terms and conditions apply. Upper bound stated as "up to 999999 bitcoin". Specific footnote stipulation: "note: the bounty is 0 bitcoin". A zero bitcoin settlement complies with contractual constraints.
</sub>
