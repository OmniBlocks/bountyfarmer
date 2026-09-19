import { generateId } from './crypto';
import { BillingSummary, MetricType, PlanLimits, PlanTier, QuotaCheckResult, Tenant, UsageRecord } from './types';

/**
 * Static configurations for subscription plan limits and feature sets.
 */
export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    tier: 'free',
    name: 'Free Community',
    maxMonthlyReviews: 50,
    maxMonthlyTokens: 250000,
    maxWebhooks: 5,
    allowedModels: ['gemma4:31b'],
    hasDedicatedSla: false,
    rateLimitPerMinute: 30,
  },
  hunter: {
    tier: 'hunter',
    name: 'Bounty Hunter',
    maxMonthlyReviews: 1000,
    maxMonthlyTokens: 10000000,
    maxWebhooks: 50,
    allowedModels: ['gemma4:31b', 'gemini-1.5-flash'],
    hasDedicatedSla: false,
    rateLimitPerMinute: 120,
  },
  pro: {
    tier: 'pro',
    name: 'Professional Team',
    maxMonthlyReviews: 5000,
    maxMonthlyTokens: 50000000,
    maxWebhooks: 500,
    allowedModels: ['gemma4:31b', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    hasDedicatedSla: true,
    rateLimitPerMinute: 300,
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise Organization',
    maxMonthlyReviews: 100000,
    maxMonthlyTokens: 1000000000,
    maxWebhooks: 10000,
    allowedModels: ['*'],
    hasDedicatedSla: true,
    rateLimitPerMinute: 1000,
  },
};

/**
 * Base cost calculation rates in USD for itemized estimates.
 */
export const COST_RATES = {
  free: 0,
  hunter: 29.0,
  pro: 99.0,
  enterprise: 499.0,
  additionalTokenPerThousand: 0.002,
  additionalReview: 0.05,
};

/**
 * Engine handling usage tracking, quota enforcement, and billing calculations.
 */
export class BillingEngine {
  private usageRecords: UsageRecord[] = [];

  /**
   * Retrieves plan limits and boundaries for a given plan tier.
   * @param tier The subscription tier.
   * @returns Plan limits configuration.
   */
  public getPlanLimits(tier: PlanTier): PlanLimits {
    const limits = PLAN_LIMITS[tier];
    if (!limits) {
      return PLAN_LIMITS.free;
    }
    return limits;
  }

  /**
   * Records a metered usage event for a tenant.
   * @param tenantId Identifier of the tenant incurring usage.
   * @param metric Type of metered metric.
   * @param quantity Amount of resource units consumed.
   * @param metadata Optional contextual metadata.
   * @returns Recorded usage entry.
   */
  public recordUsage(
    tenantId: string,
    metric: MetricType,
    quantity: number,
    metadata?: Record<string, unknown>
  ): UsageRecord {
    if (quantity < 0) {
      throw new Error(`Usage quantity cannot be negative: ${quantity}`);
    }

    const record: UsageRecord = {
      id: generateId('use'),
      tenantId,
      metric,
      quantity,
      timestamp: Date.now(),
      metadata,
    };

    this.usageRecords.push(record);
    return record;
  }

  /**
   * Calculates total usage for a tenant and metric within a given time window.
   * @param tenantId The tenant to query.
   * @param metric Target metric type.
   * @param sinceTimestamp Start timestamp of the measurement window. Defaults to the start of the current month.
   * @returns Aggregated usage count.
   */
  public getUsage(tenantId: string, metric: MetricType, sinceTimestamp?: number): number {
    const cutoff = sinceTimestamp !== undefined ? sinceTimestamp : this.getCurrentPeriodStart();
    let total = 0;

    for (const record of this.usageRecords) {
      if (record.tenantId === tenantId && record.metric === metric && record.timestamp >= cutoff) {
        total += record.quantity;
      }
    }

    return total;
  }

  /**
   * Verifies if a tenant has remaining quota for a planned operation.
   * @param tenant The tenant requesting resource consumption.
   * @param metric Target metric type.
   * @param quantity Proposed amount to consume. Defaults to 1.
   * @returns Object describing allowance, current usage, limit, and remaining balance.
   */
  public checkQuota(tenant: Tenant, metric: MetricType, quantity = 1): QuotaCheckResult {
    const limits = this.getPlanLimits(tenant.tier);
    const currentUsage = this.getUsage(tenant.id, metric);
    let limit = 0;

    switch (metric) {
      case 'code_review':
        limit = limits.maxMonthlyReviews;
        break;
      case 'token_usage':
        limit = limits.maxMonthlyTokens;
        break;
      case 'webhook_dispatch':
        limit = limits.maxWebhooks;
        break;
      case 'task_execution':
        limit = limits.maxMonthlyReviews * 2;
        break;
    }

    const remaining = Math.max(0, limit - currentUsage);
    const allowed = currentUsage + quantity <= limit;

    return {
      allowed,
      metric,
      currentUsage,
      limit,
      remaining,
      reason: allowed ? undefined : `Quota exceeded for ${metric}: ${currentUsage + quantity}/${limit}`,
    };
  }

  /**
   * Compiles an itemized billing and quota summary for a tenant.
   * @param tenant Target tenant.
   * @returns Formatted summary.
   */
  public getBillingSummary(tenant: Tenant): BillingSummary {
    const periodStart = this.getCurrentPeriodStart();
    const periodEnd = this.getCurrentPeriodEnd();
    const limits = this.getPlanLimits(tenant.tier);

    const reviewUsage = this.getUsage(tenant.id, 'code_review', periodStart);
    const tokenUsage = this.getUsage(tenant.id, 'token_usage', periodStart);
    const webhookUsage = this.getUsage(tenant.id, 'webhook_dispatch', periodStart);
    const taskUsage = this.getUsage(tenant.id, 'task_execution', periodStart);

    let estimatedCostUsd = COST_RATES[tenant.tier];
    if (tokenUsage > limits.maxMonthlyTokens) {
      const excessTokens = tokenUsage - limits.maxMonthlyTokens;
      estimatedCostUsd += (excessTokens / 1000) * COST_RATES.additionalTokenPerThousand;
    }
    if (reviewUsage > limits.maxMonthlyReviews) {
      const excessReviews = reviewUsage - limits.maxMonthlyReviews;
      estimatedCostUsd += excessReviews * COST_RATES.additionalReview;
    }

    return {
      tenantId: tenant.id,
      tier: tenant.tier,
      periodStart,
      periodEnd,
      metrics: {
        codeReviews: {
          count: reviewUsage,
          limit: limits.maxMonthlyReviews,
          remaining: Math.max(0, limits.maxMonthlyReviews - reviewUsage),
        },
        tokens: {
          count: tokenUsage,
          limit: limits.maxMonthlyTokens,
          remaining: Math.max(0, limits.maxMonthlyTokens - tokenUsage),
        },
        webhookDispatches: {
          count: webhookUsage,
          limit: limits.maxWebhooks,
          remaining: Math.max(0, limits.maxWebhooks - webhookUsage),
        },
        taskExecutions: {
          count: taskUsage,
        },
      },
      estimatedCostUsd: Number(estimatedCostUsd.toFixed(2)),
    };
  }

  /**
   * Resets usage records for a tenant to simulate billing cycle rollovers.
   * @param tenantId The tenant to reset.
   */
  public resetTenantUsage(tenantId: string): void {
    this.usageRecords = this.usageRecords.filter((record) => record.tenantId !== tenantId);
  }

  /**
   * Computes the epoch timestamp representing the start of the current month.
   * @returns Epoch milliseconds.
   */
  public getCurrentPeriodStart(): number {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).getTime();
  }

  /**
   * Computes the epoch timestamp representing the end of the current month.
   * @returns Epoch milliseconds.
   */
  public getCurrentPeriodEnd(): number {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)).getTime();
  }
}
