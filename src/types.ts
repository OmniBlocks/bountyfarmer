/**
 * Plan tiers available for Boxy SaaS tenants.
 */
export type PlanTier = 'free' | 'hunter' | 'pro' | 'enterprise';

/**
 * Lifecycle status of a tenant account.
 */
export type TenantStatus = 'active' | 'suspended' | 'pending';

/**
 * Access permissions assigned to API keys.
 */
export type ApiKeyPermission = 'read' | 'write' | 'admin' | 'review' | 'webhook';

/**
 * Supported metrics tracked by the billing and metering system.
 */
export type MetricType = 'code_review' | 'token_usage' | 'task_execution' | 'webhook_dispatch';

/**
 * Represents a tenant organization in the Boxy SaaS system.
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  tier: PlanTier;
  status: TenantStatus;
  contactEmail: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Options provided when creating a new tenant.
 */
export interface CreateTenantOptions {
  name: string;
  slug?: string;
  tier?: PlanTier;
  contactEmail?: string;
}

/**
 * API key associated with a tenant for authenticated operations.
 */
export interface ApiKey {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  permissions: ApiKeyPermission[];
  createdAt: number;
  expiresAt?: number;
  lastUsedAt?: number;
}

/**
 * Quota and feature boundaries for a given plan tier.
 */
export interface PlanLimits {
  tier: PlanTier;
  name: string;
  maxMonthlyReviews: number;
  maxMonthlyTokens: number;
  maxWebhooks: number;
  allowedModels: string[];
  hasDedicatedSla: boolean;
  rateLimitPerMinute: number;
}

/**
 * Individual recorded usage entry for metering.
 */
export interface UsageRecord {
  id: string;
  tenantId: string;
  metric: MetricType;
  quantity: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Result of a quota verification check.
 */
export interface QuotaCheckResult {
  allowed: boolean;
  metric: MetricType;
  currentUsage: number;
  limit: number;
  remaining: number;
  reason?: string;
}

/**
 * Itemized billing and usage summary for a tenant.
 */
export interface BillingSummary {
  tenantId: string;
  tier: PlanTier;
  periodStart: number;
  periodEnd: number;
  metrics: {
    codeReviews: { count: number; limit: number; remaining: number };
    tokens: { count: number; limit: number; remaining: number };
    webhookDispatches: { count: number; limit: number; remaining: number };
    taskExecutions: { count: number };
  };
  estimatedCostUsd: number;
}

/**
 * Registered webhook destination endpoint for a tenant.
 */
export interface WebhookEndpoint {
  id: string;
  tenantId: string;
  url: string;
  secret: string;
  eventTypes: string[];
  active: boolean;
  createdAt: number;
}

/**
 * Event payload dispatched via the webhook system.
 */
export interface WebhookEvent {
  id: string;
  tenantId: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: number;
  signature?: string;
}

/**
 * Review job submission request.
 */
export interface ReviewJobRequest {
  repo: string;
  prNumber: number;
  author?: string;
  requestedModel?: string;
  diffContent?: string;
}

/**
 * Review job execution output.
 */
export interface ReviewJobResult {
  jobId: string;
  tenantId: string;
  repo: string;
  prNumber: number;
  status: 'completed' | 'rejected' | 'failed';
  tokensUsed: number;
  reviewSummary: string;
  completedAt: number;
  approved: boolean;
}

/**
 * Block argument specification for OmniBlocks extensions.
 */
export interface OmniBlocksArgumentDefinition {
  type: string;
  defaultValue?: string | number | boolean;
}

/**
 * Individual block definition conforming to the Scratch / OmniBlocks extension specification.
 */
export interface OmniBlocksBlockDefinition {
  opcode: string;
  blockType: 'command' | 'reporter' | 'Boolean';
  text: string;
  arguments?: Record<string, OmniBlocksArgumentDefinition>;
}

/**
 * Top-level metadata for the OmniBlocks extension.
 */
export interface OmniBlocksExtensionInfo {
  id: string;
  name: string;
  color1?: string;
  color2?: string;
  color3?: string;
  blocks: OmniBlocksBlockDefinition[];
}
