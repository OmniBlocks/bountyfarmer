import { generateId, generateSecureToken, hashApiKey, constantTimeCompare } from './crypto';
import { ApiKey, ApiKeyPermission, CreateTenantOptions, Tenant } from './types';

/**
 * Manages tenant organizations, memberships, and API credential lifecycles.
 */
export class TenantManager {
  private tenants: Map<string, Tenant> = new Map();
  private apiKeys: Map<string, ApiKey> = new Map();

  /**
   * Creates and persists a new tenant organization.
   * @param options Configuration options including name, optional slug, tier, and contact email.
   * @returns Newly created tenant instance.
   */
  public createTenant(options: CreateTenantOptions): Tenant {
    const slug = options.slug || options.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const id = generateId('tnt');
    const now = Date.now();

    const tenant: Tenant = {
      id,
      name: options.name,
      slug,
      tier: options.tier || 'free',
      status: 'active',
      contactEmail: options.contactEmail || `admin@${slug || 'omni'}.local`,
      createdAt: now,
      updatedAt: now,
    };

    this.tenants.set(id, tenant);
    return tenant;
  }

  /**
   * Retrieves a tenant by unique identifier or slug.
   * @param idOrSlug Tenant ID or slug string.
   * @returns Tenant instance if found, otherwise undefined.
   */
  public getTenant(idOrSlug: string): Tenant | undefined {
    const directMatch = this.tenants.get(idOrSlug);
    if (directMatch) {
      return directMatch;
    }
    for (const tenant of this.tenants.values()) {
      if (tenant.slug === idOrSlug) {
        return tenant;
      }
    }
    return undefined;
  }

  /**
   * Returns a list of all registered tenants.
   * @returns Array of tenant records.
   */
  public listTenants(): Tenant[] {
    return Array.from(this.tenants.values());
  }

  /**
   * Updates fields of an existing tenant record.
   * @param id Target tenant identifier.
   * @param updates Partial properties to apply.
   * @returns Updated tenant record.
   */
  public updateTenant(
    id: string,
    updates: Partial<Pick<Tenant, 'name' | 'tier' | 'status' | 'contactEmail'>>
  ): Tenant {
    const tenant = this.tenants.get(id);
    if (!tenant) {
      throw new Error(`Tenant not found: ${id}`);
    }

    if (updates.name !== undefined) {
      tenant.name = updates.name;
    }
    if (updates.tier !== undefined) {
      tenant.tier = updates.tier;
    }
    if (updates.status !== undefined) {
      tenant.status = updates.status;
    }
    if (updates.contactEmail !== undefined) {
      tenant.contactEmail = updates.contactEmail;
    }

    tenant.updatedAt = Date.now();
    return tenant;
  }

  /**
   * Generates a new cryptographically secure API key for a tenant.
   * @param tenantId The tenant owning this key.
   * @param name Friendly label for identifying the key.
   * @param permissions Array of permissions granted to the key.
   * @returns Object containing the persisted key metadata and the plaintext secret token.
   */
  public createApiKey(
    tenantId: string,
    name: string,
    permissions: ApiKeyPermission[] = ['read', 'write', 'review']
  ): { apiKey: ApiKey; secretKey: string } {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Cannot issue API key: tenant ${tenantId} not found`);
    }

    const secretKey = generateSecureToken('bx_live', 32);
    const keyPrefix = secretKey.slice(0, 12);
    const keyHash = hashApiKey(secretKey);
    const id = generateId('key');
    const now = Date.now();

    const apiKey: ApiKey = {
      id,
      tenantId,
      name,
      keyPrefix,
      keyHash,
      permissions,
      createdAt: now,
    };

    this.apiKeys.set(id, apiKey);
    return { apiKey, secretKey };
  }

  /**
   * Authenticates a plaintext API key by verifying its SHA-256 hash in constant time.
   * @param rawKey The plaintext API key provided in the authorization header.
   * @returns Authenticated tenant and key metadata, or null if invalid or expired.
   */
  public authenticateApiKey(rawKey: string): { tenant: Tenant; apiKey: ApiKey } | null {
    if (!rawKey || typeof rawKey !== 'string') {
      return null;
    }

    const trimmed = rawKey.trim().replace(/^Bearer\s+/i, '');
    const calculatedHash = hashApiKey(trimmed);

    for (const key of this.apiKeys.values()) {
      if (constantTimeCompare(key.keyHash, calculatedHash)) {
        if (key.expiresAt && key.expiresAt < Date.now()) {
          return null;
        }

        const tenant = this.tenants.get(key.tenantId);
        if (!tenant || tenant.status !== 'active') {
          return null;
        }

        key.lastUsedAt = Date.now();
        return { tenant, apiKey: key };
      }
    }

    return null;
  }

  /**
   * Revokes an existing API key by identifier.
   * @param keyId Unique identifier of the key to revoke.
   * @returns True if revoked, false if the key was not found.
   */
  public revokeApiKey(keyId: string): boolean {
    return this.apiKeys.delete(keyId);
  }

  /**
   * Lists all active API keys associated with a specific tenant.
   * @param tenantId Target tenant identifier.
   * @returns Array of API key records without plaintext secrets.
   */
  public listApiKeys(tenantId: string): ApiKey[] {
    const results: ApiKey[] = [];
    for (const key of this.apiKeys.values()) {
      if (key.tenantId === tenantId) {
        results.push(key);
      }
    }
    return results;
  }
}
