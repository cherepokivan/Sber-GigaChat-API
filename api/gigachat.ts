import type { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import crypto from 'crypto';

/**
 * Vercel Serverless Function Proxy for GigaChat API & OAuth
 * 
 * Proxies requests to:
 * - https://api.giga.chat (Chat completions, Models, etc.)
 * - https://ngw.devices.sberbank.ru:9443/api/v2/oauth (Token exchange from Authorization Key)
 * 
 * Solves:
 * - CORS restrictions in browsers
 * - Russian National Root CA certificate validation
 * - Token whitespace/newlines normalization
 */
export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, RqUID'
  );

  // Handle preflight OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Determine the target path
    let endpoint = '';

    if (typeof req.query?.endpoint === 'string') {
      endpoint = req.query.endpoint;
    } else if (Array.isArray(req.query?.endpoint)) {
      endpoint = req.query.endpoint.join('/');
    } else if (typeof req.query?.path === 'string') {
      endpoint = req.query.path;
    } else {
      const urlPath = req.url?.split('?')[0] || '';
      endpoint = urlPath.replace(/^\/api\/gigachat\/?/, '');
    }

    if (!endpoint) {
      res.status(400).json({
        error: 'Missing endpoint path for GigaChat API proxy.',
      });
      return;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

    let targetUrl: URL;
    const isOAuth = cleanEndpoint === 'oauth' || cleanEndpoint === 'v2/oauth';

    if (isOAuth) {
      targetUrl = new URL('https://ngw.devices.sberbank.ru:9443/api/v2/oauth');
    } else {
      targetUrl = new URL(`https://api.giga.chat/${cleanEndpoint}`);
    }

    // Forward any other query params (excluding 'endpoint' and 'path')
    if (req.query && typeof req.query === 'object') {
      for (const [key, val] of Object.entries(req.query)) {
        if (key !== 'endpoint' && key !== 'path' && typeof val === 'string') {
          targetUrl.searchParams.set(key, val);
        }
      }
    }

    // Forward headers
    const forwardHeaders: Record<string, string> = {
      'Accept': req.headers['accept'] || 'application/json',
    };

    if (isOAuth) {
      forwardHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      forwardHeaders['RqUID'] = req.headers['rquid'] || crypto.randomUUID();
    } else if (req.headers['content-type']) {
      forwardHeaders['Content-Type'] = req.headers['content-type'];
    }

    if (req.headers['authorization']) {
      let authHeader = String(req.headers['authorization']).trim();
      // Normalize Bearer token (strip duplicate 'Bearer ', remove quotes and any whitespace/newlines from terminal wrap)
      if (authHeader.toLowerCase().startsWith('bearer ')) {
        let rawToken = authHeader.slice(7).trim();
        while (rawToken.toLowerCase().startsWith('bearer ')) {
          rawToken = rawToken.slice(7).trim();
        }
        rawToken = rawToken.replace(/["']/g, '').replace(/\s+/g, '');
        authHeader = `Bearer ${rawToken}`;
      } else if (authHeader.toLowerCase().startsWith('basic ')) {
        let rawKey = authHeader.slice(6).trim().replace(/["']/g, '').replace(/\s+/g, '');
        authHeader = `Basic ${rawKey}`;
      }
      forwardHeaders['Authorization'] = authHeader;
    }

    // Prepare body
    let bodyData: Buffer | null = null;
    if (req.method === 'POST') {
      if (isOAuth) {
        let formContent = 'scope=GIGACHAT_API_PERS';
        if (typeof req.body === 'string' && req.body.includes('scope=')) {
          formContent = req.body;
        } else if (typeof req.body === 'object' && req.body?.scope) {
          formContent = `scope=${encodeURIComponent(req.body.scope)}`;
        }
        bodyData = Buffer.from(formContent);
        forwardHeaders['Content-Length'] = String(bodyData.length);
      } else if (typeof req.body === 'object' && req.body !== null) {
        bodyData = Buffer.from(JSON.stringify(req.body));
        forwardHeaders['Content-Type'] = 'application/json';
        forwardHeaders['Content-Length'] = String(bodyData.length);
      } else if (typeof req.body === 'string') {
        bodyData = Buffer.from(req.body);
        forwardHeaders['Content-Length'] = String(bodyData.length);
      }
    }

    // Agent with rejectUnauthorized: false to accept Russian Root CA certificates
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });

    const proxyReq = https.request(
      targetUrl.toString(),
      {
        method: req.method,
        headers: forwardHeaders,
        agent,
      },
      proxyRes => {
        if (proxyRes.headers['content-type']) {
          res.setHeader('Content-Type', proxyRes.headers['content-type']);
        }

        const chunks: Buffer[] = [];
        proxyRes.on('data', chunk => {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        });

        proxyRes.on('end', () => {
          const fullBody = Buffer.concat(chunks);
          res.status(proxyRes.statusCode || 200);
          if (typeof res.send === 'function') {
            res.send(fullBody);
          } else {
            res.end(fullBody);
          }
        });
      }
    );

    proxyReq.on('error', err => {
      console.error('GigaChat proxy request error:', err);
      if (!res.headersSent) {
        res.status(502).json({
          error: 'Ошибка соединения с сервером GigaChat (502 Bad Gateway).',
          details: err.message,
        });
      }
    });

    if (bodyData) {
      proxyReq.write(bodyData);
    }

    proxyReq.end();
  } catch (error: any) {
    console.error('Handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Внутренняя ошибка прокси-обработчика GigaChat.',
        details: error?.message,
      });
    }
  }
}
