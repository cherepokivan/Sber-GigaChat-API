import type { IncomingMessage, ServerResponse } from 'http';
import https from 'https';

/**
 * Vercel Serverless Function Proxy for GigaChat API
 * 
 * Proxies requests to https://api.giga.chat transparently:
 * - Solves CORS issues in browsers (adds standard CORS headers)
 * - Uses https.Agent with rejectUnauthorized: false to handle Russian Root CA certificates
 * - Never stores or logs user credentials
 * - Passes request body and authorization headers directly to GigaChat API
 */
export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Determine the target path on https://api.giga.chat
    let endpoint = '';

    if (typeof req.query?.endpoint === 'string') {
      endpoint = req.query.endpoint;
    } else if (Array.isArray(req.query?.endpoint)) {
      endpoint = req.query.endpoint.join('/');
    } else if (typeof req.query?.path === 'string') {
      endpoint = req.query.path;
    } else {
      // Extract from URL if not in query
      const urlPath = req.url?.split('?')[0] || '';
      endpoint = urlPath.replace(/^\/api\/gigachat\/?/, '');
    }

    if (!endpoint) {
      res.status(400).json({
        error: 'Missing endpoint path for GigaChat API proxy.',
      });
      return;
    }

    // Clean endpoint
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const targetUrl = new URL(`https://api.giga.chat/${cleanEndpoint}`);

    // Forward any other query params (excluding 'endpoint' and 'path')
    if (req.query && typeof req.query === 'object') {
      for (const [key, val] of Object.entries(req.query)) {
        if (key !== 'endpoint' && key !== 'path' && typeof val === 'string') {
          targetUrl.searchParams.set(key, val);
        }
      }
    }

    // Forward authorization and content headers
    const forwardHeaders: Record<string, string> = {
      'Accept': req.headers['accept'] || 'application/json',
    };

    if (req.headers['authorization']) {
      forwardHeaders['Authorization'] = req.headers['authorization'];
    }
    if (req.headers['content-type']) {
      forwardHeaders['Content-Type'] = req.headers['content-type'];
    }

    // Prepare body if POST
    let bodyData: Buffer | null = null;
    if (req.method === 'POST') {
      if (typeof req.body === 'object' && req.body !== null) {
        bodyData = Buffer.from(JSON.stringify(req.body));
        forwardHeaders['Content-Type'] = 'application/json';
        forwardHeaders['Content-Length'] = String(bodyData.length);
      } else if (typeof req.body === 'string') {
        bodyData = Buffer.from(req.body);
        forwardHeaders['Content-Length'] = String(bodyData.length);
      }
    }

    // Use https.Agent with rejectUnauthorized: false to accept Russian Root CA certificates
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
        // Forward content-type if present
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
      console.error('GigaChat proxy error:', err);
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
