import * as http from 'http';
import { URL } from 'url';
import { OmniBlocksUniverseExtension } from './omniblocks_extension';
import { CelestialBody, CelestialBodyType } from './types';

/**
 * Creates and starts a standalone HTTP REST API server exposing Universe Engine and OmniBlocks interfaces.
 *
 * @param extension - Optional pre-configured OmniBlocksUniverseExtension instance.
 * @param port - Optional port number (defaults to 3000).
 * @returns Configured Node.js http.Server instance.
 */
export function createUniverseServer(
  extension: OmniBlocksUniverseExtension = new OmniBlocksUniverseExtension(),
  port = 3000
): http.Server {
  const engine = extension.getEngine();

  const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    const parsedUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method ?? 'GET';

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const readBody = (): Promise<string> =>
      new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => resolve(body));
        req.on('error', (err) => reject(err));
      });

    const sendJson = (status: number, data: unknown) => {
      res.statusCode = status;
      res.end(JSON.stringify(data));
    };

    if (pathname === '/health' && method === 'GET') {
      sendJson(200, {
        status: 'ok',
        service: 'omniblocks-universe-engine',
        version: '1.0.0'
      });
      return;
    }

    if (pathname === '/extension/spec' && method === 'GET') {
      sendJson(200, extension.getInfo());
      return;
    }

    if (pathname === '/universe/state' && method === 'GET') {
      sendJson(200, engine.getState());
      return;
    }

    if (pathname === '/universe/init' && method === 'POST') {
      readBody().then((raw) => {
        try {
          const payload = raw ? JSON.parse(raw) : {};
          extension.initUniverse({
            H0: payload.hubbleConstant,
            OMEGA_L: payload.darkEnergyRatio,
            OMEGA_M: payload.matterRatio
          });
          sendJson(200, { success: true, state: engine.getState() });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Invalid JSON payload';
          sendJson(400, { error: msg });
        }
      });
      return;
    }

    if (pathname === '/universe/preset' && method === 'POST') {
      readBody().then((raw) => {
        try {
          const payload = raw ? JSON.parse(raw) : {};
          const preset = payload.preset ?? 'solar_system';
          extension.populatePreset({ PRESET: preset });
          sendJson(200, {
            success: true,
            preset,
            bodyCount: engine.getAllBodies().length
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Invalid JSON payload';
          sendJson(400, { error: msg });
        }
      });
      return;
    }

    if (pathname === '/universe/step/cosmic' && method === 'POST') {
      readBody().then((raw) => {
        try {
          const payload = raw ? JSON.parse(raw) : {};
          const years = Number(payload.years ?? 1.0e6);
          engine.stepCosmicTime(years);
          sendJson(200, { success: true, state: engine.getState() });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Invalid JSON payload';
          sendJson(400, { error: msg });
        }
      });
      return;
    }

    if (pathname === '/universe/step/orbit' && method === 'POST') {
      readBody().then((raw) => {
        try {
          const payload = raw ? JSON.parse(raw) : {};
          const seconds = Number(payload.seconds ?? 86400);
          const dt = Number(payload.dt ?? 3600);
          extension.stepOrbits({ SECONDS: seconds, DT: dt });
          sendJson(200, {
            success: true,
            bodies: engine.getAllBodies().map((b) => ({
              id: b.id,
              position: b.position,
              velocity: b.velocity
            }))
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Invalid JSON payload';
          sendJson(400, { error: msg });
        }
      });
      return;
    }

    if (pathname === '/universe/bodies' && method === 'GET') {
      const typeParam = parsedUrl.searchParams.get('type') as CelestialBodyType | null;
      const list = typeParam ? engine.getBodiesByType(typeParam) : engine.getAllBodies();
      sendJson(200, { bodies: list });
      return;
    }

    if (pathname === '/universe/bodies' && method === 'POST') {
      readBody().then((raw) => {
        try {
          const payload = JSON.parse(raw) as CelestialBody;
          if (!payload.id || !payload.name || !payload.type || payload.mass === undefined) {
            sendJson(400, { error: 'Missing required body attributes (id, name, type, mass)' });
            return;
          }
          engine.addBody(payload);
          sendJson(201, { success: true, body: engine.getBody(payload.id) });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Invalid JSON payload';
          sendJson(400, { error: msg });
        }
      });
      return;
    }

    if (pathname.startsWith('/universe/bodies/') && method === 'GET') {
      const id = pathname.replace('/universe/bodies/', '');
      const body = engine.getBody(id);
      if (!body) {
        sendJson(404, { error: `Celestial body ${id} not found` });
        return;
      }
      const relativistic = engine.getRelativisticInfo(id);
      sendJson(200, { body, relativistic });
      return;
    }

    if (pathname.startsWith('/universe/bodies/') && pathname.endsWith('/supernova') && method === 'POST') {
      const parts = pathname.split('/');
      const id = parts[3];
      const ok = engine.triggerSupernova(id);
      if (!ok) {
        sendJson(400, { error: `Failed to trigger supernova for star ${id}` });
        return;
      }
      sendJson(200, { success: true, body: engine.getBody(id) });
      return;
    }

    if (pathname.startsWith('/universe/bodies/') && method === 'DELETE') {
      const id = pathname.replace('/universe/bodies/', '');
      const ok = engine.removeBody(id);
      if (!ok) {
        sendJson(404, { error: `Celestial body ${id} not found` });
        return;
      }
      sendJson(200, { success: true, removedId: id });
      return;
    }

    sendJson(404, { error: 'Route not found' });
  });

  return server;
}
