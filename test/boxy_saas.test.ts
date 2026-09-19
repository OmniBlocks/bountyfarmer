import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import {
  BillingEngine,
  BoxySaasServer,
  BoxySaasService,
  OmniBlocksBoxySaasExtension,
  PLAN_LIMITS,
  TenantManager,
  WebhookManager,
  constantTimeCompare,
  createBoxySaas,
  generateId,
  generateSecureToken,
  hashApiKey,
  signPayload,
  verifySignature,
} from '../src/index';

/**
 * Performs an HTTP request and parses JSON response for integration testing.
 * @param port Target port number.
 * @param method HTTP verb.
 * @param path Request pathname.
 * @param body Optional request body.
 * @param headers Optional custom headers.
 * @returns Object with statusCode and parsed JSON body.
 */
function requestHttp(
  port: number,
  method: string,
  path: string,
  body?: Record<string, unknown>,
  headers: Record<string, string> = {}
): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const reqHeaders: Record<string, string> = {
      ...headers,
    };
    if (body) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload).toString();
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let resBody = '';
        res.on('data', (chunk) => {
          resBody += chunk;
        });
        res.on('end', () => {
          let parsed: any = {};
          try {
            parsed = resBody ? JSON.parse(resBody) : {};
          } catch {
            parsed = { raw: resBody };
          }
          resolve({
            statusCode: res.statusCode || 500,
            data: parsed,
          });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(payload);
    }
    req.end();
  });
}

describe('Cryptographic Primitives', () => {
  it('generates secure random tokens with specified prefix and high entropy', () => {
    const token1 = generateSecureToken('bx_live', 32);
    const token2 = generateSecureToken('bx_live', 32);

    assert.ok(token1.startsWith('bx_live_'));
    assert.ok(token2.startsWith('bx_live_'));
    assert.notStrictEqual(token1, token2);
    assert.strictEqual(token1.length, 'bx_live_'.length + 64);
  });

  it('computes authentic SHA-256 hashes matching standard digest algorithms', () => {
    const raw = 'test-secret-key-123';
    const hash1 = hashApiKey(raw);
    const hash2 = hashApiKey(raw);

    assert.strictEqual(hash1, hash2);
    assert.strictEqual(hash1.length, 64);
    assert.notStrictEqual(hash1, raw);
  });

  it('performs constant-time string comparisons accurately', () => {
    assert.strictEqual(constantTimeCompare('secretA', 'secretA'), true);
    assert.strictEqual(constantTimeCompare('secretA', 'secretB'), false);
    assert.strictEqual(constantTimeCompare('secretA', 'short'), false);
  });

  it('signs and verifies HMAC-SHA256 payloads with tamper detection', () => {
    const secret = 'shared-hmac-secret-xyz';
    const payload = JSON.stringify({ pr: 6, action: 'review' });

    const signature = signPayload(secret, payload);
    assert.ok(signature.length > 0);

    const valid = verifySignature(secret, payload, signature);
    assert.strictEqual(valid, true);

    const tamperedPayload = JSON.stringify({ pr: 6, action: 'review', hacked: true });
    const tamperedValid = verifySignature(secret, tamperedPayload, signature);
    assert.strictEqual(tamperedValid, false);

    const invalidSecretValid = verifySignature('wrong-secret', payload, signature);
    assert.strictEqual(invalidSecretValid, false);
  });

  it('generates collision-free entity identifiers', () => {
    const id1 = generateId('tnt');
    const id2 = generateId('tnt');

    assert.ok(id1.startsWith('tnt_'));
    assert.ok(id2.startsWith('tnt_'));
    assert.notStrictEqual(id1, id2);
  });
});

describe('Tenant Management Engine', () => {
  it('provisions a new tenant with valid defaults and slug derivation', () => {
    const manager = new TenantManager();
    const tenant = manager.createTenant({
      name: 'OmniBlocks Foundation',
      tier: 'hunter',
    });

    assert.ok(tenant.id.startsWith('tnt_'));
    assert.strictEqual(tenant.name, 'OmniBlocks Foundation');
    assert.strictEqual(tenant.slug, 'omniblocks-foundation');
    assert.strictEqual(tenant.tier, 'hunter');
    assert.strictEqual(tenant.status, 'active');
  });

  it('retrieves tenants by ID or slug', () => {
    const manager = new TenantManager();
    const created = manager.createTenant({
      name: 'Alpha Labs',
      slug: 'alpha-labs',
      tier: 'pro',
    });

    const byId = manager.getTenant(created.id);
    const bySlug = manager.getTenant('alpha-labs');
    const missing = manager.getTenant('non-existent');

    assert.deepStrictEqual(byId, created);
    assert.deepStrictEqual(bySlug, created);
    assert.strictEqual(missing, undefined);
  });

  it('updates tenant profile and plan tiers', () => {
    const manager = new TenantManager();
    const tenant = manager.createTenant({ name: 'Beta Corp', tier: 'free' });

    const updated = manager.updateTenant(tenant.id, {
      tier: 'enterprise',
      status: 'active',
      contactEmail: 'security@beta.local',
    });

    assert.strictEqual(updated.tier, 'enterprise');
    assert.strictEqual(updated.contactEmail, 'security@beta.local');
    assert.ok(updated.updatedAt >= tenant.createdAt);
  });

  it('creates, authenticates, and validates API keys with permissions', () => {
    const manager = new TenantManager();
    const tenant = manager.createTenant({ name: 'Delta Org' });

    const { apiKey, secretKey } = manager.createApiKey(tenant.id, 'Production CI', ['read', 'review']);
    assert.strictEqual(apiKey.tenantId, tenant.id);
    assert.strictEqual(apiKey.name, 'Production CI');
    assert.deepStrictEqual(apiKey.permissions, ['read', 'review']);
    assert.ok(secretKey.startsWith('bx_live_'));

    const authenticated = manager.authenticateApiKey(secretKey);
    assert.ok(authenticated !== null);
    assert.strictEqual(authenticated.tenant.id, tenant.id);
    assert.strictEqual(authenticated.apiKey.id, apiKey.id);

    const bearerAuth = manager.authenticateApiKey(`Bearer ${secretKey}`);
    assert.ok(bearerAuth !== null);
    assert.strictEqual(bearerAuth.tenant.id, tenant.id);

    const invalidAuth = manager.authenticateApiKey('bx_live_invalid_key_123');
    assert.strictEqual(invalidAuth, null);
  });

  it('revokes API keys correctly', () => {
    const manager = new TenantManager();
    const tenant = manager.createTenant({ name: 'Epsilon Tech' });
    const { apiKey, secretKey } = manager.createApiKey(tenant.id, 'Temporary Key');

    const revoked = manager.revokeApiKey(apiKey.id);
    assert.strictEqual(revoked, true);

    const authenticated = manager.authenticateApiKey(secretKey);
    assert.strictEqual(authenticated, null);
  });

  it('denies authentication when tenant is suspended', () => {
    const manager = new TenantManager();
    const tenant = manager.createTenant({ name: 'Zeta Inc' });
    const { secretKey } = manager.createApiKey(tenant.id, 'Key');

    manager.updateTenant(tenant.id, { status: 'suspended' });
    const auth = manager.authenticateApiKey(secretKey);
    assert.strictEqual(auth, null);
  });
});

describe('Billing and Metering Engine', () => {
  it('exposes defined quota limits across plan tiers', () => {
    const billing = new BillingEngine();
    const freeLimits = billing.getPlanLimits('free');
    const hunterLimits = billing.getPlanLimits('hunter');
    const proLimits = billing.getPlanLimits('pro');
    const enterpriseLimits = billing.getPlanLimits('enterprise');

    assert.strictEqual(freeLimits.maxMonthlyReviews, 50);
    assert.strictEqual(hunterLimits.maxMonthlyReviews, 1000);
    assert.strictEqual(proLimits.maxMonthlyReviews, 5000);
    assert.strictEqual(enterpriseLimits.maxMonthlyReviews, 100000);
    assert.ok(freeLimits.allowedModels.includes('gemma4:31b'));
    assert.ok(hunterLimits.allowedModels.includes('gemini-1.5-flash'));
  });

  it('records and aggregates usage accurately', () => {
    const billing = new BillingEngine();
    const tenantId = 'tnt_test_tenant_1';

    billing.recordUsage(tenantId, 'code_review', 3);
    billing.recordUsage(tenantId, 'code_review', 2);
    billing.recordUsage(tenantId, 'token_usage', 5000);

    const reviews = billing.getUsage(tenantId, 'code_review');
    const tokens = billing.getUsage(tenantId, 'token_usage');
    const webhooks = billing.getUsage(tenantId, 'webhook_dispatch');

    assert.strictEqual(reviews, 5);
    assert.strictEqual(tokens, 5000);
    assert.strictEqual(webhooks, 0);
  });

  it('enforces quota boundaries and detects quota exhaustion', () => {
    const billing = new BillingEngine();
    const tenant: any = { id: 'tnt_free_1', tier: 'free', status: 'active' };

    const initialCheck = billing.checkQuota(tenant, 'code_review', 10);
    assert.strictEqual(initialCheck.allowed, true);
    assert.strictEqual(initialCheck.currentUsage, 0);
    assert.strictEqual(initialCheck.limit, PLAN_LIMITS.free.maxMonthlyReviews);

    billing.recordUsage(tenant.id, 'code_review', PLAN_LIMITS.free.maxMonthlyReviews);

    const exhaustedCheck = billing.checkQuota(tenant, 'code_review', 1);
    assert.strictEqual(exhaustedCheck.allowed, false);
    assert.strictEqual(exhaustedCheck.remaining, 0);
    assert.ok(exhaustedCheck.reason?.includes('Quota exceeded'));
  });

  it('generates itemized billing summaries with cost estimates', () => {
    const billing = new BillingEngine();
    const tenant: any = { id: 'tnt_pro_billing', tier: 'pro', status: 'active' };

    billing.recordUsage(tenant.id, 'code_review', 12);
    billing.recordUsage(tenant.id, 'token_usage', 45000);

    const summary = billing.getBillingSummary(tenant);
    assert.strictEqual(summary.tenantId, tenant.id);
    assert.strictEqual(summary.tier, 'pro');
    assert.strictEqual(summary.metrics.codeReviews.count, 12);
    assert.strictEqual(summary.metrics.tokens.count, 45000);
    assert.strictEqual(summary.estimatedCostUsd, 99.0);
  });
});

describe('Webhook and SaaS Bridge Engine', () => {
  it('registers and retrieves webhook endpoints with valid format checking', () => {
    const webhooks = new WebhookManager();
    const ep = webhooks.registerEndpoint('tnt_1', 'https://example.com/webhook', ['boxy.review.*']);

    assert.ok(ep.id.startsWith('whk_'));
    assert.strictEqual(ep.tenantId, 'tnt_1');
    assert.strictEqual(ep.url, 'https://example.com/webhook');
    assert.deepStrictEqual(ep.eventTypes, ['boxy.review.*']);

    const found = webhooks.getEndpoint(ep.id);
    assert.deepStrictEqual(found, ep);

    assert.throws(() => {
      webhooks.registerEndpoint('tnt_1', 'invalid-url');
    });
  });

  it('prepares outbound dispatch with cryptographic signatures and headers', () => {
    const webhooks = new WebhookManager();
    const secret = 'test-wh-secret-key';
    const event = webhooks.createEvent('tnt_1', 'boxy.review.completed', { pr: 6, approved: true });

    const dispatch = webhooks.prepareDispatch(event, secret);
    assert.ok(dispatch.headers['X-Boxy-Signature-256'].length > 0);
    assert.strictEqual(dispatch.headers['X-Boxy-Event-Type'], 'boxy.review.completed');

    const verified = webhooks.verifyInboundSignature(
      dispatch.body,
      dispatch.headers['X-Boxy-Signature-256'],
      secret
    );
    assert.strictEqual(verified, true);
  });

  it('processes incoming events from external SaaS providers', () => {
    const webhooks = new WebhookManager();

    const ghEvent = webhooks.processInboundExternalEvent('github', {
      action: 'opened',
      repository: { full_name: 'OmniBlocks/bountyfarmer' },
      pull_request: { number: 6 },
    });
    assert.strictEqual(ghEvent.handled, true);
    assert.strictEqual(ghEvent.eventType, 'github.opened');
    assert.ok(ghEvent.summary.includes('PR #6'));

    const stripeEvent = webhooks.processInboundExternalEvent('stripe', {
      type: 'invoice.paid',
    });
    assert.strictEqual(stripeEvent.handled, true);
    assert.strictEqual(stripeEvent.eventType, 'stripe.invoice.paid');

    const linearEvent = webhooks.processInboundExternalEvent('linear', {
      type: 'Issue',
      action: 'create',
    });
    assert.strictEqual(linearEvent.handled, true);
    assert.strictEqual(linearEvent.eventType, 'linear.Issue.create');
  });
});

describe('Boxy SaaS Service and Review Workflow', () => {
  it('executes a code review with API key verification and usage metering', async () => {
    const bundle = createBoxySaas();
    const tenant = bundle.tenantManager.createTenant({ name: 'Review Team', tier: 'hunter' });
    const { secretKey } = bundle.tenantManager.createApiKey(tenant.id, 'CI Key', ['review']);

    const result = await bundle.service.submitReview(secretKey, {
      repo: 'OmniBlocks/bountyfarmer',
      prNumber: 6,
      author: 'ampelc',
      diffContent: '+ export function addSaasToBoxy() {}',
    });

    assert.strictEqual(result.status, 'completed');
    assert.strictEqual(result.approved, true);
    assert.ok(result.tokensUsed > 0);
    assert.strictEqual(result.tenantId, tenant.id);

    const reviewUsage = bundle.billingEngine.getUsage(tenant.id, 'code_review');
    const tokenUsage = bundle.billingEngine.getUsage(tenant.id, 'token_usage');
    assert.strictEqual(reviewUsage, 1);
    assert.strictEqual(tokenUsage, result.tokensUsed);
  });

  it('rejects review when tenant quota is exhausted', async () => {
    const bundle = createBoxySaas();
    const tenant = bundle.tenantManager.createTenant({ name: 'Quota Tester', tier: 'free' });
    const { secretKey } = bundle.tenantManager.createApiKey(tenant.id, 'Key', ['review']);

    bundle.billingEngine.recordUsage(tenant.id, 'code_review', PLAN_LIMITS.free.maxMonthlyReviews);

    await assert.rejects(
      async () => {
        await bundle.service.submitReview(secretKey, {
          repo: 'OmniBlocks/bountyfarmer',
          prNumber: 6,
        });
      },
      /Review quota exceeded/
    );
  });

  it('enforces allowed AI models based on subscription tier', async () => {
    const bundle = createBoxySaas();
    const tenant = bundle.tenantManager.createTenant({ name: 'Free User', tier: 'free' });
    const { secretKey } = bundle.tenantManager.createApiKey(tenant.id, 'Key', ['review']);

    await assert.rejects(
      async () => {
        await bundle.service.submitReview(secretKey, {
          repo: 'OmniBlocks/bountyfarmer',
          prNumber: 6,
          requestedModel: 'gemini-1.5-pro',
        });
      },
      /Model gemini-1.5-pro is not permitted on plan tier free/
    );
  });

  it('manages isolated persistent sticky notes per tenant', () => {
    const bundle = createBoxySaas();
    const tenantA = bundle.tenantManager.createTenant({ name: 'Tenant A' });
    const tenantB = bundle.tenantManager.createTenant({ name: 'Tenant B' });

    bundle.service.saveStickyNote(tenantA.id, 'Note A1', 'Content for tenant A');
    bundle.service.saveStickyNote(tenantB.id, 'Note B1', 'Content for tenant B');

    const notesA = bundle.service.getStickyNotes(tenantA.id);
    const notesB = bundle.service.getStickyNotes(tenantB.id);

    assert.strictEqual(notesA.length, 1);
    assert.strictEqual(notesA[0].title, 'Note A1');
    assert.strictEqual(notesB.length, 1);
    assert.strictEqual(notesB[0].title, 'Note B1');
  });
});

describe('OmniBlocks Visual Extension Integration', () => {
  it('returns valid TurboWarp and Scratch extension metadata schema', () => {
    const bundle = createBoxySaas();
    const info = bundle.extension.getInfo();

    assert.strictEqual(info.id, 'omniblocksBoxySaas');
    assert.strictEqual(info.name, 'Boxy SaaS Integration');
    assert.ok(info.blocks.length >= 8);

    const opcodes = info.blocks.map((b) => b.opcode);
    assert.ok(opcodes.includes('setApiKey'));
    assert.ok(opcodes.includes('isConnected'));
    assert.ok(opcodes.includes('getTenantTier'));
    assert.ok(opcodes.includes('getQuotaRemaining'));
    assert.ok(opcodes.includes('requestPrReview'));
  });

  it('authenticates, checks connection state, and executes extension blocks', async () => {
    const bundle = createBoxySaas();
    const tenant = bundle.tenantManager.createTenant({ name: 'Block User', tier: 'pro' });
    const { secretKey } = bundle.tenantManager.createApiKey(tenant.id, 'Block Key', ['review']);

    assert.strictEqual(bundle.extension.isConnected(), false);
    assert.strictEqual(bundle.extension.getTenantTier(), 'unauthenticated');

    bundle.extension.setApiKey({ KEY: secretKey });
    assert.strictEqual(bundle.extension.isConnected(), true);
    assert.strictEqual(bundle.extension.getTenantTier(), 'pro');

    const quota = bundle.extension.getQuotaRemaining({ METRIC: 'code_review' });
    assert.strictEqual(quota, PLAN_LIMITS.pro.maxMonthlyReviews);

    const approved = await bundle.extension.requestPrReview({
      REPO: 'OmniBlocks/bountyfarmer',
      PR_NUM: 6,
    });
    assert.strictEqual(approved, true);
    assert.ok(bundle.extension.getLastReviewSummary().includes('PR #6'));
  });
});

describe('HTTP REST API Server End-to-End', () => {
  it('starts server and responds to health, tenant, and review endpoints over HTTP', async () => {
    const bundle = createBoxySaas();
    const { port, close } = await bundle.server.start(0);

    try {
      const healthRes = await requestHttp(port, 'GET', '/health');
      assert.strictEqual(healthRes.statusCode, 200);
      assert.strictEqual(healthRes.data.status, 'ok');
      assert.strictEqual(healthRes.data.service, 'boxy-saas');

      const createTenantRes = await requestHttp(port, 'POST', '/v1/tenants', {
        name: 'API Cloud Corp',
        tier: 'hunter',
        contactEmail: 'dev@cloud.local',
      });
      assert.strictEqual(createTenantRes.statusCode, 201);
      const tenantId = createTenantRes.data.tenant.id;
      assert.ok(tenantId.startsWith('tnt_'));

      const getTenantRes = await requestHttp(port, 'GET', `/v1/tenants/${tenantId}`);
      assert.strictEqual(getTenantRes.statusCode, 200);
      assert.strictEqual(getTenantRes.data.tenant.name, 'API Cloud Corp');

      const createKeyRes = await requestHttp(port, 'POST', `/v1/tenants/${tenantId}/keys`, {
        name: 'API Key',
        permissions: ['read', 'write', 'review'],
      });
      assert.strictEqual(createKeyRes.statusCode, 201);
      const secretKey = createKeyRes.data.secretKey;
      assert.ok(secretKey.startsWith('bx_live_'));

      const unauthReviewRes = await requestHttp(port, 'POST', '/v1/reviews', {
        repo: 'OmniBlocks/bountyfarmer',
        prNumber: 6,
      });
      assert.strictEqual(unauthReviewRes.statusCode, 401);

      const reviewRes = await requestHttp(
        port,
        'POST',
        '/v1/reviews',
        {
          repo: 'OmniBlocks/bountyfarmer',
          prNumber: 6,
          author: 'ampelc',
        },
        { Authorization: `Bearer ${secretKey}` }
      );
      assert.strictEqual(reviewRes.statusCode, 200);
      assert.strictEqual(reviewRes.data.review.approved, true);

      const usageRes = await requestHttp(port, 'GET', '/v1/billing/usage', undefined, {
        Authorization: `Bearer ${secretKey}`,
      });
      assert.strictEqual(usageRes.statusCode, 200);
      assert.strictEqual(usageRes.data.billing.metrics.codeReviews.count, 1);

      const webhookRes = await requestHttp(
        port,
        'POST',
        '/v1/webhooks',
        {
          url: 'https://webhook.site/test',
          eventTypes: ['boxy.review.*'],
        },
        { Authorization: `Bearer ${secretKey}` }
      );
      assert.strictEqual(webhookRes.statusCode, 201);
      assert.ok(webhookRes.data.webhook.id.startsWith('whk_'));

      const incomingWebhookRes = await requestHttp(port, 'POST', '/v1/webhooks/incoming', {
        provider: 'github',
        payload: {
          action: 'synchronize',
          repository: { full_name: 'OmniBlocks/bountyfarmer' },
          pull_request: { number: 6 },
        },
      });
      assert.strictEqual(incomingWebhookRes.statusCode, 200);
      assert.strictEqual(incomingWebhookRes.data.handled, true);
    } finally {
      await close();
    }
  });
});
