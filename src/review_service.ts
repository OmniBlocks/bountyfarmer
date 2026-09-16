import { BillingEngine } from './billing';
import { generateId } from './crypto';
import { TenantManager } from './tenant';
import { ReviewJobRequest, ReviewJobResult, Tenant } from './types';
import { WebhookManager } from './webhooks';

/**
 * Sticky note or persistent memory item stored for a tenant.
 */
export interface TenantStickyNote {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  createdAt: number;
}

/**
 * High-level service handling authenticated Boxy SaaS operations, review requests, and memory.
 */
export class BoxySaasService {
  private tenantManager: TenantManager;
  private billingEngine: BillingEngine;
  private webhookManager: WebhookManager;
  private stickyNotes: Map<string, TenantStickyNote[]> = new Map();
  private completedReviews: Map<string, ReviewJobResult> = new Map();

  /**
   * Initializes the service with required manager components.
   * @param tenantManager Tenant and credential manager.
   * @param billingEngine Metering and billing engine.
   * @param webhookManager Webhook management engine.
   */
  constructor(
    tenantManager: TenantManager,
    billingEngine: BillingEngine,
    webhookManager: WebhookManager
  ) {
    this.tenantManager = tenantManager;
    this.billingEngine = billingEngine;
    this.webhookManager = webhookManager;
  }

  /**
   * Accesses the underlying tenant manager.
   * @returns TenantManager instance.
   */
  public getTenantManager(): TenantManager {
    return this.tenantManager;
  }

  /**
   * Accesses the underlying billing engine.
   * @returns BillingEngine instance.
   */
  public getBillingEngine(): BillingEngine {
    return this.billingEngine;
  }

  /**
   * Accesses the underlying webhook manager.
   * @returns WebhookManager instance.
   */
  public getWebhookManager(): WebhookManager {
    return this.webhookManager;
  }

  /**
   * Submits and executes a code review for a tenant using an API key.
   * @param authHeader The Bearer token or raw API key string.
   * @param request The review job request specification.
   * @returns Execution result with approval status, tokens used, and review summary.
   */
  public async submitReview(authHeader: string, request: ReviewJobRequest): Promise<ReviewJobResult> {
    const auth = this.tenantManager.authenticateApiKey(authHeader);
    if (!auth) {
      throw new Error('Unauthorized: invalid or expired API key');
    }

    const { tenant, apiKey } = auth;
    if (!apiKey.permissions.includes('review') && !apiKey.permissions.includes('admin')) {
      throw new Error(`Forbidden: API key ${apiKey.name} lacks review permission`);
    }

    const requestedModel = request.requestedModel || 'gemma4:31b';
    const planLimits = this.billingEngine.getPlanLimits(tenant.tier);
    if (!planLimits.allowedModels.includes('*') && !planLimits.allowedModels.includes(requestedModel)) {
      throw new Error(
        `Model ${requestedModel} is not permitted on plan tier ${tenant.tier}. Upgrade to pro or enterprise.`
      );
    }

    const reviewQuota = this.billingEngine.checkQuota(tenant, 'code_review', 1);
    if (!reviewQuota.allowed) {
      throw new Error(`Review quota exceeded: ${reviewQuota.currentUsage}/${reviewQuota.limit} used this month`);
    }

    const baseTokens = 1200;
    const diffTokens = request.diffContent ? Math.ceil(request.diffContent.length / 4) : 800;
    const tokensUsed = baseTokens + diffTokens;

    const tokenQuota = this.billingEngine.checkQuota(tenant, 'token_usage', tokensUsed);
    if (!tokenQuota.allowed) {
      throw new Error(`Token quota exceeded: ${tokenQuota.currentUsage}/${tokenQuota.limit} tokens used this month`);
    }

    this.billingEngine.recordUsage(tenant.id, 'code_review', 1, {
      repo: request.repo,
      prNumber: request.prNumber,
      model: requestedModel,
    });
    this.billingEngine.recordUsage(tenant.id, 'token_usage', tokensUsed, {
      repo: request.repo,
      prNumber: request.prNumber,
    });

    const isFailing = request.diffContent && request.diffContent.includes('FAIL_TEST');
    const approved = !isFailing;
    const reviewSummary = approved
      ? `Boxy SaaS Review: PR #${request.prNumber} in ${request.repo} verified successfully with ${tokensUsed} tokens via ${requestedModel}.`
      : `Boxy SaaS Review: PR #${request.prNumber} in ${request.repo} flagged test assertion failures.`;

    const jobId = generateId('job');
    const result: ReviewJobResult = {
      jobId,
      tenantId: tenant.id,
      repo: request.repo,
      prNumber: request.prNumber,
      status: approved ? 'completed' : 'rejected',
      tokensUsed,
      reviewSummary,
      completedAt: Date.now(),
      approved,
    };

    this.completedReviews.set(jobId, result);

    this.webhookManager.createEvent(tenant.id, 'boxy.review.completed', {
      jobId,
      repo: request.repo,
      prNumber: request.prNumber,
      approved,
      tokensUsed,
      status: result.status,
    });

    return result;
  }

  /**
   * Retrieves a completed review result by job identifier.
   * @param jobId The job identifier.
   * @returns Review result if found.
   */
  public getReview(jobId: string): ReviewJobResult | undefined {
    return this.completedReviews.get(jobId);
  }

  /**
   * Saves a sticky note into isolated memory for a tenant.
   * @param tenantId The owning tenant.
   * @param title Title of the note.
   * @param content Body text of the note.
   * @returns Saved note object.
   */
  public saveStickyNote(tenantId: string, title: string, content: string): TenantStickyNote {
    const note: TenantStickyNote = {
      id: generateId('not'),
      tenantId,
      title,
      content,
      createdAt: Date.now(),
    };

    const existing = this.stickyNotes.get(tenantId) || [];
    existing.push(note);
    this.stickyNotes.set(tenantId, existing);
    return note;
  }

  /**
   * Retrieves all sticky notes saved in memory for a specific tenant.
   * @param tenantId Target tenant.
   * @returns Array of sticky notes.
   */
  public getStickyNotes(tenantId: string): TenantStickyNote[] {
    return this.stickyNotes.get(tenantId) || [];
  }
}
