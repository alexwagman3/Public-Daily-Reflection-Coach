// Worker entry. Routes:
//   GET  /api/traits   → list available traits and the value-system metadata
//   POST /api/reflect  → multi-turn coaching turn (see reflect.js)
//   *                  → 404

import { handleReflect, getSystemMeta } from './reflect.js';

function cors(origin, allowedOrigin) {
  const allow = !allowedOrigin || allowedOrigin === '*'
    ? (origin || '*')
    : allowedOrigin;
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = cors(request.headers.get('Origin'), env.ALLOWED_ORIGIN);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname === '/api/traits' && request.method === 'GET') {
      return new Response(JSON.stringify(getSystemMeta()), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/api/reflect') {
      return handleReflect(request, env);
    }

    return new Response(JSON.stringify({ error: 'Not found.' }), {
      status: 404,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  },
};
