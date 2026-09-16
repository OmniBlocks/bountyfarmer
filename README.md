# @omniblocks/boxy-saas

Multi-tenant SaaS platform, API gateway, usage metering, and OmniBlocks visual extension integration for Boxy.

## Overview

`@omniblocks/boxy-saas` implements an enterprise-grade Software as a Service (SaaS) architecture for Boxy, the OmniBlocks assistant and automated code review agent. It provides multi-tenant isolation, cryptographic API key authentication, tiered subscription quotas, real-time usage metering, HMAC-SHA256 signed webhook delivery, third-party SaaS event ingest, and native Scratch/TurboWarp extension blocks.

## Core Features

- Multi-Tenant Architecture: Organization provisioning, slug-based resolution, tenant status management, and isolated persistent memory.
- Cryptographic Security: SHA-256 API key hashing, constant-time verification (`crypto.timingSafeEqual`) to prevent timing side-channels, and 32-byte cryptographic entropy.
- Tiered Quotas and Metering: Configurable plan tiers (`free`, `hunter`, `pro`, `enterprise`) enforcing monthly code review counts, token usage thresholds, webhook volume limits, and model allowances.
- Webhook and Event Bridge: Outbound event dispatcher with HMAC-SHA256 signature verification (`X-Boxy-Signature-256`) and inbound handlers for GitHub, Stripe, Linear, and Discord.
- RESTful HTTP Gateway: Standalone zero-dependency HTTP server exposing endpoints for tenant provisioning, credential management, review job dispatching, and billing telemetry.
- OmniBlocks Visual Extension: Scratch 3.0 and TurboWarp compatible extension providing command, reporter, and boolean blocks for block-based interaction with Boxy SaaS.
- Zero Mocks: All cryptographic operations, billing meters, network endpoints, and state transitions are verified with true assertions.

## Plan Tiers

| Tier | Monthly Reviews | Monthly Tokens | Webhooks | Allowed Models | Dedicated SLA |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `free` | 50 | 250,000 | 5 | `gemma4:31b` | No |
| `hunter` | 1,000 | 10,000,000 | 50 | `gemma4:31b`, `gemini-1.5-flash` | No |
| `pro` | 5,000 | 50,000,000 | 500 | `gemma4:31b`, `gemini-1.5-flash`, `gemini-1.5-pro` | Yes |
| `enterprise` | 100,000 | 1,000,000,000 | 10,000 | All (`*`) | Yes |

## REST API Endpoints

| Method | Path | Description | Authentication |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | System health check | Public |
| `POST` | `/v1/tenants` | Create new tenant organization | Admin |
| `GET` | `/v1/tenants/:id` | Retrieve tenant details | Admin |
| `POST` | `/v1/tenants/:id/keys` | Issue new tenant API key | Admin |
| `POST` | `/v1/reviews` | Dispatch PR code review | `Bearer bx_live_...` |
| `GET` | `/v1/billing/usage` | Inspect current usage and quotas | `Bearer bx_live_...` |
| `POST` | `/v1/webhooks` | Register tenant webhook destination | `Bearer bx_live_...` |
| `POST` | `/v1/webhooks/incoming` | Ingest external SaaS webhook event | Signature |

## OmniBlocks Extension Blocks

| Opcode | Block Type | Description |
| :--- | :--- | :--- |
| `setApiKey` | Command | Connect to Boxy SaaS with API key |
| `isConnected` | Boolean | Reports whether Boxy SaaS is authenticated |
| `getTenantTier` | Reporter | Returns tenant plan tier |
| `getQuotaRemaining` | Reporter | Returns remaining quota balance for specified metric |
| `requestPrReview` | Command | Submits pull request review job |
| `getLastReviewSummary` | Reporter | Returns text summary of last review |
| `emitSaaSEvent` | Command | Emits custom signed webhook event |
| `saveMemoryNote` | Command | Persists note to isolated tenant memory |
| `getServiceHealth` | Reporter | Returns service operational status |

## Quickstart

### Build

```bash
npm run build
```

### Run Tests

```bash
npm test
```

### Run Verification Demo

```bash
node index.js demo
```

### Start REST API Server

```bash
node index.js serve --port 3000
```
