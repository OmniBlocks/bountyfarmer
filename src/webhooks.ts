import { generateId, generateSecureToken, signPayload, verifySignature } from './crypto';
import { WebhookEndpoint, WebhookEvent } from './types';

/**
 * Manages webhook endpoint registration, event dispatching, and external SaaS bridge ingest.
 */
export class WebhookManager {
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private dispatchedEvents: WebhookEvent[] = [];

  /**
   * Registers a new destination webhook endpoint for a tenant.
   * @param tenantId The tenant owning the endpoint.
   * @param url Destination HTTP/HTTPS URL.
   * @param eventTypes Array of subscribed event patterns.
   * @param secret Optional shared secret. If omitted, a secure secret is generated.
   * @returns Persisted webhook endpoint configuration.
   */
  public registerEndpoint(
    tenantId: string,
    url: string,
    eventTypes: string[] = ['*'],
    secret?: string
  ): WebhookEndpoint {
    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid webhook URL format: ${url}`);
    }

    const id = generateId('whk');
    const endpoint: WebhookEndpoint = {
      id,
      tenantId,
      url,
      secret: secret || generateSecureToken('bx_whsec', 24),
      eventTypes,
      active: true,
      createdAt: Date.now(),
    };

    this.endpoints.set(id, endpoint);
    return endpoint;
  }

  /**
   * Retrieves a webhook endpoint by identifier.
   * @param id The endpoint identifier.
   * @returns Webhook endpoint if found.
   */
  public getEndpoint(id: string): WebhookEndpoint | undefined {
    return this.endpoints.get(id);
  }

  /**
   * Lists all webhook endpoints registered by a tenant.
   * @param tenantId Target tenant.
   * @returns Array of endpoints.
   */
  public listEndpoints(tenantId: string): WebhookEndpoint[] {
    const results: WebhookEndpoint[] = [];
    for (const ep of this.endpoints.values()) {
      if (ep.tenantId === tenantId) {
        results.push(ep);
      }
    }
    return results;
  }

  /**
   * Deletes a registered webhook endpoint.
   * @param id The endpoint identifier.
   * @returns True if deleted, false if not found.
   */
  public deleteEndpoint(id: string): boolean {
    return this.endpoints.delete(id);
  }

  /**
   * Creates a signed outbound webhook event record for delivery.
   * @param tenantId Target tenant.
   * @param eventType Identifier of the event type.
   * @param payload Structured JSON-serializable payload.
   * @returns Prepared WebhookEvent.
   */
  public createEvent(tenantId: string, eventType: string, payload: Record<string, unknown>): WebhookEvent {
    const event: WebhookEvent = {
      id: generateId('evt'),
      tenantId,
      eventType,
      payload,
      timestamp: Date.now(),
    };

    this.dispatchedEvents.push(event);
    return event;
  }

  /**
   * Prepares signed dispatch headers and serialized payload for HTTP delivery to an endpoint.
   * @param event The event being dispatched.
   * @param secret The endpoint's shared HMAC secret.
   * @returns Serialized body and HTTP headers including cryptographic signature.
   */
  public prepareDispatch(
    event: WebhookEvent,
    secret: string
  ): { body: string; headers: Record<string, string>; signature: string } {
    const body = JSON.stringify({
      id: event.id,
      tenantId: event.tenantId,
      eventType: event.eventType,
      timestamp: event.timestamp,
      payload: event.payload,
    });

    const signature = signPayload(secret, body);
    const headers = {
      'Content-Type': 'application/json',
      'X-Boxy-Event-ID': event.id,
      'X-Boxy-Event-Type': event.eventType,
      'X-Boxy-Timestamp': event.timestamp.toString(),
      'X-Boxy-Signature-256': signature,
    };

    return { body, headers, signature };
  }

  /**
   * Verifies an incoming webhook signature using the shared secret.
   * @param rawBody Serialized request payload body.
   * @param signature Header signature string.
   * @param secret Shared secret key.
   * @returns True if the signature matches cryptographically.
   */
  public verifyInboundSignature(rawBody: string, signature: string, secret: string): boolean {
    if (!signature || !secret || !rawBody) {
      return false;
    }
    const cleanSignature = signature.replace(/^sha256=/i, '').trim();
    return verifySignature(secret, rawBody, cleanSignature);
  }

  /**
   * Ingests and processes incoming webhook events from third-party SaaS platforms.
   * @param source Name of the upstream SaaS provider.
   * @param payload Parsed event body.
   * @param signature Optional cryptographic signature header.
   * @param secret Optional shared secret to enforce signature validation.
   * @returns Result summarizing event processing.
   */
  public processInboundExternalEvent(
    source: 'github' | 'stripe' | 'linear' | 'discord',
    payload: Record<string, unknown>,
    signature?: string,
    secret?: string
  ): { handled: boolean; eventType: string; summary: string } {
    if (secret && signature) {
      const raw = JSON.stringify(payload);
      if (!this.verifyInboundSignature(raw, signature, secret)) {
        throw new Error(`Invalid signature for ${source} webhook event`);
      }
    }

    switch (source) {
      case 'github': {
        const action = String(payload.action || 'unknown');
        const repo = (payload.repository as { full_name?: string })?.full_name || 'unknown';
        const prNumber = (payload.pull_request as { number?: number })?.number;
        const summary = prNumber
          ? `GitHub PR #${prNumber} ${action} in ${repo}`
          : `GitHub event ${action} in ${repo}`;
        return { handled: true, eventType: `github.${action}`, summary };
      }
      case 'stripe': {
        const type = String(payload.type || 'payment.succeeded');
        return { handled: true, eventType: `stripe.${type}`, summary: `Stripe event ${type} processed` };
      }
      case 'linear': {
        const action = String(payload.action || 'create');
        const type = String(payload.type || 'Issue');
        return { handled: true, eventType: `linear.${type}.${action}`, summary: `Linear ${type} ${action} processed` };
      }
      case 'discord': {
        const type = String(payload.type || 'interaction');
        return { handled: true, eventType: `discord.${type}`, summary: `Discord ${type} received` };
      }
      default:
        return { handled: false, eventType: 'unknown', summary: 'Unrecognized provider' };
    }
  }

  /**
   * Returns list of recorded dispatched events for audit purposes.
   * @returns Array of events.
   */
  public getDispatchedEvents(): WebhookEvent[] {
    return [...this.dispatchedEvents];
  }
}
