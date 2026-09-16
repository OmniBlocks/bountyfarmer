import { BoxySaasService } from './review_service';
import { OmniBlocksExtensionInfo } from './types';

/**
 * Scratch and TurboWarp compatible OmniBlocks extension connecting visual blocks to Boxy SaaS.
 */
export class OmniBlocksBoxySaasExtension {
  private service: BoxySaasService;
  private currentApiKey: string | null = null;
  private lastReviewSummary = 'No reviews requested yet.';

  /**
   * Initializes the OmniBlocks extension backed by a Boxy SaaS service instance.
   * @param service Boxy SaaS service instance.
   */
  constructor(service: BoxySaasService) {
    this.service = service;
  }

  /**
   * Returns extension metadata, block types, and argument schemas required by OmniBlocks.
   * @returns Extension description and block definitions.
   */
  public getInfo(): OmniBlocksExtensionInfo {
    return {
      id: 'omniblocksBoxySaas',
      name: 'Boxy SaaS Integration',
      color1: '#4a154b',
      color2: '#3f103f',
      color3: '#2d082d',
      blocks: [
        {
          opcode: 'setApiKey',
          blockType: 'command',
          text: 'connect to Boxy SaaS with API key [KEY]',
          arguments: {
            KEY: {
              type: 'string',
              defaultValue: 'bx_live_key',
            },
          },
        },
        {
          opcode: 'isConnected',
          blockType: 'Boolean',
          text: 'is Boxy SaaS connected?',
        },
        {
          opcode: 'getTenantTier',
          blockType: 'reporter',
          text: 'Boxy SaaS tenant plan tier',
        },
        {
          opcode: 'getQuotaRemaining',
          blockType: 'reporter',
          text: 'Boxy SaaS remaining quota for [METRIC]',
          arguments: {
            METRIC: {
              type: 'string',
              defaultValue: 'code_review',
            },
          },
        },
        {
          opcode: 'requestPrReview',
          blockType: 'command',
          text: 'request Boxy review for repo [REPO] PR #[PR_NUM]',
          arguments: {
            REPO: {
              type: 'string',
              defaultValue: 'OmniBlocks/bountyfarmer',
            },
            PR_NUM: {
              type: 'number',
              defaultValue: 1,
            },
          },
        },
        {
          opcode: 'getLastReviewSummary',
          blockType: 'reporter',
          text: 'last Boxy review summary',
        },
        {
          opcode: 'emitSaaSEvent',
          blockType: 'command',
          text: 'dispatch Boxy SaaS event [EVENT_NAME] with data [DATA]',
          arguments: {
            EVENT_NAME: {
              type: 'string',
              defaultValue: 'custom.event',
            },
            DATA: {
              type: 'string',
              defaultValue: '{}',
            },
          },
        },
        {
          opcode: 'saveMemoryNote',
          blockType: 'command',
          text: 'save Boxy memory note title [TITLE] content [CONTENT]',
          arguments: {
            TITLE: {
              type: 'string',
              defaultValue: 'OmniBlocks Note',
            },
            CONTENT: {
              type: 'string',
              defaultValue: 'Note content',
            },
          },
        },
        {
          opcode: 'getServiceHealth',
          blockType: 'reporter',
          text: 'Boxy SaaS service status',
        },
      ],
    };
  }

  /**
   * Sets the active tenant API key for subsequent block commands.
   * @param args Arguments containing KEY.
   */
  public setApiKey(args: { KEY: string }): void {
    const auth = this.service.getTenantManager().authenticateApiKey(args.KEY);
    if (!auth) {
      this.currentApiKey = null;
      throw new Error('Invalid Boxy SaaS API key');
    }
    this.currentApiKey = args.KEY;
  }

  /**
   * Verifies if the extension has an authenticated active API key.
   * @returns True if connected.
   */
  public isConnected(): boolean {
    if (!this.currentApiKey) {
      return false;
    }
    return this.service.getTenantManager().authenticateApiKey(this.currentApiKey) !== null;
  }

  /**
   * Reports the current tenant's subscription plan tier.
   * @returns Plan tier name or 'unauthenticated'.
   */
  public getTenantTier(): string {
    if (!this.currentApiKey) {
      return 'unauthenticated';
    }
    const auth = this.service.getTenantManager().authenticateApiKey(this.currentApiKey);
    return auth ? auth.tenant.tier : 'unauthenticated';
  }

  /**
   * Reports remaining quota for a given metric.
   * @param args Arguments containing METRIC ('code_review', 'token_usage', 'webhook_dispatch').
   * @returns Numeric count of remaining quota.
   */
  public getQuotaRemaining(args: { METRIC: string }): number {
    if (!this.currentApiKey) {
      return 0;
    }
    const auth = this.service.getTenantManager().authenticateApiKey(this.currentApiKey);
    if (!auth) {
      return 0;
    }
    const check = this.service.getBillingEngine().checkQuota(auth.tenant, args.METRIC as any, 0);
    return check.remaining;
  }

  /**
   * Dispatches a pull request review request through Boxy SaaS.
   * @param args Arguments containing REPO and PR_NUM.
   */
  public async requestPrReview(args: { REPO: string; PR_NUM: number }): Promise<boolean> {
    if (!this.currentApiKey) {
      throw new Error('Cannot request review: extension is not authenticated');
    }

    const result = await this.service.submitReview(this.currentApiKey, {
      repo: args.REPO,
      prNumber: Number(args.PR_NUM),
    });

    this.lastReviewSummary = result.reviewSummary;
    return result.approved;
  }

  /**
   * Reports the summary of the last completed review job.
   * @returns Summary text.
   */
  public getLastReviewSummary(): string {
    return this.lastReviewSummary;
  }

  /**
   * Emits a custom webhook event through the SaaS event manager.
   * @param args Arguments containing EVENT_NAME and JSON DATA string.
   */
  public emitSaaSEvent(args: { EVENT_NAME: string; DATA: string }): void {
    if (!this.currentApiKey) {
      throw new Error('Cannot emit event: extension is not authenticated');
    }

    const auth = this.service.getTenantManager().authenticateApiKey(this.currentApiKey);
    if (!auth) {
      throw new Error('Invalid authentication session');
    }

    let parsedPayload: Record<string, unknown> = {};
    try {
      parsedPayload = JSON.parse(args.DATA);
    } catch {
      parsedPayload = { rawData: args.DATA };
    }

    this.service.getWebhookManager().createEvent(auth.tenant.id, args.EVENT_NAME, parsedPayload);
  }

  /**
   * Stores a persistent note in tenant memory.
   * @param args Arguments containing TITLE and CONTENT.
   */
  public saveMemoryNote(args: { TITLE: string; CONTENT: string }): void {
    if (!this.currentApiKey) {
      throw new Error('Cannot save memory note: extension is not authenticated');
    }

    const auth = this.service.getTenantManager().authenticateApiKey(this.currentApiKey);
    if (!auth) {
      throw new Error('Invalid authentication session');
    }

    this.service.saveStickyNote(auth.tenant.id, args.TITLE, args.CONTENT);
  }

  /**
   * Reports the overall SaaS service health.
   * @returns Operational health string.
   */
  public getServiceHealth(): string {
    return 'healthy';
  }
}
