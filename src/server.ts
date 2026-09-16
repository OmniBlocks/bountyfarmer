import * as http from 'http';
import { AddressInfo } from 'net';
import { BoxySaasService } from './review_service';

/**
 * Parses JSON request bodies asynchronously from incoming HTTP requests.
 * @param req Incoming HTTP message.
 * @returns Parsed JSON object.
 */
function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Malformed JSON payload'));
      }
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Sends a structured JSON response with appropriate headers and status code.
 * @param res Server response object.
 * @param statusCode HTTP status code.
 * @param data Response payload.
 */
function sendJson(res: http.ServerResponse, statusCode: number, data: unknown): void {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

/**
 * REST API HTTP Server exposing Boxy SaaS endpoints.
 */
export class BoxySaasServer {
  private service: BoxySaasService;
  private server: http.Server | null = null;

  /**
   * Initializes the server with the underlying service engine.
   * @param service Boxy SaaS service instance.
   */
  constructor(service: BoxySaasService) {
    this.service = service;
  }

  /**
   * Dispatches incoming HTTP requests to corresponding endpoint handlers.
   * @param req Incoming HTTP request.
   * @param res Server HTTP response.
   */
  public async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const method = req.method?.toUpperCase();

    try {
      if (method === 'GET' && pathname === '/health') {
        sendJson(res, 200, {
          status: 'ok',
          service: 'boxy-saas',
          version: '1.0.0',
          timestamp: Date.now(),
        });
        return;
      }

      if (method === 'POST' && pathname === '/v1/tenants') {
        const body = await readJsonBody(req);
        if (!body.name || typeof body.name !== 'string') {
          sendJson(res, 400, { error: 'Field "name" is required and must be a string' });
          return;
        }

        const tenant = this.service.getTenantManager().createTenant({
          name: body.name,
          slug: typeof body.slug === 'string' ? body.slug : undefined,
          tier: (body.tier as any) || 'free',
          contactEmail: typeof body.contactEmail === 'string' ? body.contactEmail : undefined,
        });

        sendJson(res, 201, { tenant });
        return;
      }

      if (method === 'GET' && pathname.startsWith('/v1/tenants/')) {
        const tenantId = pathname.slice('/v1/tenants/'.length);
        const tenant = this.service.getTenantManager().getTenant(tenantId);
        if (!tenant) {
          sendJson(res, 404, { error: `Tenant not found: ${tenantId}` });
          return;
        }
        sendJson(res, 200, { tenant });
        return;
      }

      if (method === 'POST' && pathname.match(/^\/v1\/tenants\/[^/]+\/keys$/)) {
        const parts = pathname.split('/');
        const tenantId = parts[3];
        const body = await readJsonBody(req);
        const keyName = typeof body.name === 'string' ? body.name : 'default';
        const permissions = Array.isArray(body.permissions) ? body.permissions : undefined;

        const result = this.service.getTenantManager().createApiKey(tenantId, keyName, permissions as any);
        sendJson(res, 201, result);
        return;
      }

      if (method === 'POST' && pathname === '/v1/reviews') {
        const authHeader = (req.headers.authorization || req.headers['x-api-key']) as string;
        if (!authHeader) {
          sendJson(res, 401, { error: 'Missing Authorization or X-API-Key header' });
          return;
        }

        const body = await readJsonBody(req);
        if (!body.repo || typeof body.repo !== 'string' || typeof body.prNumber !== 'number') {
          sendJson(res, 400, { error: 'Fields "repo" (string) and "prNumber" (number) are required' });
          return;
        }

        const reviewResult = await this.service.submitReview(authHeader, {
          repo: body.repo,
          prNumber: body.prNumber,
          author: typeof body.author === 'string' ? body.author : undefined,
          requestedModel: typeof body.requestedModel === 'string' ? body.requestedModel : undefined,
          diffContent: typeof body.diffContent === 'string' ? body.diffContent : undefined,
        });

        sendJson(res, 200, { review: reviewResult });
        return;
      }

      if (method === 'GET' && pathname === '/v1/billing/usage') {
        const authHeader = (req.headers.authorization || req.headers['x-api-key']) as string;
        if (!authHeader) {
          sendJson(res, 401, { error: 'Missing Authorization or X-API-Key header' });
          return;
        }

        const auth = this.service.getTenantManager().authenticateApiKey(authHeader);
        if (!auth) {
          sendJson(res, 401, { error: 'Invalid API key' });
          return;
        }

        const summary = this.service.getBillingEngine().getBillingSummary(auth.tenant);
        sendJson(res, 200, { billing: summary });
        return;
      }

      if (method === 'POST' && pathname === '/v1/webhooks') {
        const authHeader = (req.headers.authorization || req.headers['x-api-key']) as string;
        if (!authHeader) {
          sendJson(res, 401, { error: 'Missing Authorization or X-API-Key header' });
          return;
        }

        const auth = this.service.getTenantManager().authenticateApiKey(authHeader);
        if (!auth) {
          sendJson(res, 401, { error: 'Invalid API key' });
          return;
        }

        const body = await readJsonBody(req);
        if (!body.url || typeof body.url !== 'string') {
          sendJson(res, 400, { error: 'Field "url" is required' });
          return;
        }

        const endpoint = this.service.getWebhookManager().registerEndpoint(
          auth.tenant.id,
          body.url,
          Array.isArray(body.eventTypes) ? (body.eventTypes as string[]) : ['*'],
          typeof body.secret === 'string' ? body.secret : undefined
        );

        sendJson(res, 201, { webhook: endpoint });
        return;
      }

      if (method === 'POST' && pathname === '/v1/webhooks/incoming') {
        const body = await readJsonBody(req);
        const provider = (body.provider as 'github' | 'stripe' | 'linear' | 'discord') || 'github';
        const payload = (body.payload as Record<string, unknown>) || {};
        const signature = (req.headers['x-signature'] || body.signature) as string | undefined;

        const outcome = this.service.getWebhookManager().processInboundExternalEvent(provider, payload, signature);
        sendJson(res, 200, outcome);
        return;
      }

      sendJson(res, 404, { error: `Cannot ${method} ${pathname}` });
    } catch (error: any) {
      const message = error?.message || 'Internal server error';
      const statusCode = message.includes('quota exceeded')
        ? 429
        : message.includes('Unauthorized')
        ? 401
        : message.includes('Forbidden')
        ? 403
        : 400;

      sendJson(res, statusCode, { error: message });
    }
  }

  /**
   * Starts listening on the specified port or an ephemeral port.
   * @param port Preferred port number. Defaults to 0 (dynamic OS allocation).
   * @returns Port number and teardown shutdown function.
   */
  public start(port = 0): Promise<{ port: number; close: () => Promise<void> }> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(port, () => {
        const addr = this.server?.address() as AddressInfo;
        const allocatedPort = addr.port;
        resolve({
          port: allocatedPort,
          close: () =>
            new Promise<void>((resClose) => {
              if (this.server) {
                this.server.close(() => resClose());
              } else {
                resClose();
              }
            }),
        });
      });
    });
  }
}
