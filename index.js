#!/usr/bin/env node

/**
 * Entrypoint script and CLI utility for the Boxy SaaS platform.
 */

const { createBoxySaas } = require('./dist/src/index.js');

/**
 * Runs a programmatic verification demonstration of the Boxy SaaS platform.
 */
async function runDemo() {
  process.stdout.write('Initializing Boxy SaaS platform...\n');
  const bundle = createBoxySaas();

  process.stdout.write('1. Provisioning tenant organization...\n');
  const tenant = bundle.tenantManager.createTenant({
    name: 'OmniBlocks Core Team',
    slug: 'omniblocks-core',
    tier: 'pro',
    contactEmail: 'team@omniblocks.local',
  });
  process.stdout.write(`Tenant created: ${tenant.name} (${tenant.id}) [tier: ${tenant.tier}]\n`);

  process.stdout.write('2. Generating cryptographic API key...\n');
  const { apiKey, secretKey } = bundle.tenantManager.createApiKey(tenant.id, 'CI Bot Key', ['read', 'write', 'review', 'webhook']);
  process.stdout.write(`API Key issued: ${apiKey.keyPrefix}... (ID: ${apiKey.id})\n`);

  process.stdout.write('3. Registering signed webhook endpoint...\n');
  const endpoint = bundle.webhookManager.registerEndpoint(
    tenant.id,
    'https://api.omniblocks.local/webhooks/boxy',
    ['boxy.review.completed', 'boxy.quota.warning']
  );
  process.stdout.write(`Webhook registered: ${endpoint.url} (ID: ${endpoint.id})\n`);

  process.stdout.write('4. Submitting pull request code review...\n');
  const reviewResult = await bundle.service.submitReview(secretKey, {
    repo: 'OmniBlocks/bountyfarmer',
    prNumber: 6,
    author: 'ampelc',
    diffContent: '+ export function addSaasToBoxy() { return true; }',
  });
  process.stdout.write(`Review completed: status=${reviewResult.status}, tokensUsed=${reviewResult.tokensUsed}, approved=${reviewResult.approved}\n`);

  process.stdout.write('5. Inspecting metered usage and billing summary...\n');
  const billingSummary = bundle.billingEngine.getBillingSummary(tenant);
  process.stdout.write(`Usage: reviews=${billingSummary.metrics.codeReviews.count}/${billingSummary.metrics.codeReviews.limit}, tokens=${billingSummary.metrics.tokens.count}/${billingSummary.metrics.tokens.limit}\n`);

  process.stdout.write('6. Verifying OmniBlocks visual extension blocks...\n');
  bundle.extension.setApiKey({ KEY: secretKey });
  const isConnected = bundle.extension.isConnected();
  const tier = bundle.extension.getTenantTier();
  const remainingReviews = bundle.extension.getQuotaRemaining({ METRIC: 'code_review' });
  process.stdout.write(`OmniBlocks Extension connected: ${isConnected}, tenant tier: ${tier}, remaining reviews: ${remainingReviews}\n`);

  process.stdout.write('Boxy SaaS platform operational and verified.\n');
}

/**
 * Starts the REST API HTTP server.
 * @param {number} port Listening port.
 */
async function runServer(port) {
  const bundle = createBoxySaas();
  const { port: actualPort } = await bundle.server.start(port);
  process.stdout.write(`Boxy SaaS REST API listening on port ${actualPort}\n`);
}

/**
 * Parses command line arguments and executes requested action.
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write('Usage: node index.js [command] [options]\n\n');
    process.stdout.write('Commands:\n');
    process.stdout.write('  demo           Run Boxy SaaS end-to-end verification (default)\n');
    process.stdout.write('  serve          Start Boxy SaaS REST API server\n\n');
    process.stdout.write('Options:\n');
    process.stdout.write('  --port <port>  Specify port for HTTP server (default: 3000)\n');
    process.stdout.write('  --help, -h     Show this help message\n');
    process.stdout.write('  --version, -v  Print version\n');
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    process.stdout.write('1.0.0\n');
    process.exit(0);
  }

  if (args.includes('serve')) {
    const portIndex = args.indexOf('--port');
    const port = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1], 10) : parseInt(process.env.PORT || '3000', 10);
    await runServer(port);
    return;
  }

  await runDemo();
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  runDemo,
  runServer,
  main,
};
