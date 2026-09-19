import { BillingEngine, PLAN_LIMITS, COST_RATES } from './billing';
import { TenantManager } from './tenant';
import { WebhookManager } from './webhooks';
import { BoxySaasService } from './review_service';
import { BoxySaasServer } from './server';
import { OmniBlocksBoxySaasExtension } from './omniblocks_extension';

export * from './types';
export * from './crypto';
export * from './tenant';
export * from './billing';
export * from './webhooks';
export * from './review_service';
export * from './server';
export * from './omniblocks_extension';

/**
 * Factory creating a fully initialized Boxy SaaS service bundle with all subsystems wired.
 * @returns Configured BoxySaasService instance.
 */
export function createBoxySaas(): {
  tenantManager: TenantManager;
  billingEngine: BillingEngine;
  webhookManager: WebhookManager;
  service: BoxySaasService;
  server: BoxySaasServer;
  extension: OmniBlocksBoxySaasExtension;
} {
  const tenantManager = new TenantManager();
  const billingEngine = new BillingEngine();
  const webhookManager = new WebhookManager();
  const service = new BoxySaasService(tenantManager, billingEngine, webhookManager);
  const server = new BoxySaasServer(service);
  const extension = new OmniBlocksBoxySaasExtension(service);

  return {
    tenantManager,
    billingEngine,
    webhookManager,
    service,
    server,
    extension,
  };
}
