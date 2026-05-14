// Multi-turn reflection coach backed by DeepSeek's reasoning model
// (deepseek-reasoner) via the OpenAI-compatible chat completions endpoint.
//
// Request shape:
//   POST /api/reflect
//   { "trait": "<trait-key>", "messages": [{role, content}, ...] }
//
// If `messages` contains no user turn yet, a deterministic opener is returned
// without spending an API call.

import config from '../config/traits.json';
import { buildSystemPrompt, buildOpener } from './prompt.js';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-reasoner';
const MAX_TOKENS = 2000;

function corsHeadersFor(origin, allowedOrigin) {
  const allow = !allowedOrigin || allowedOrigin === '*'
    ? (origin || '*')
    : allowedOrigin;
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function jsonResponse(status, payload, cors) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

export async function handleReflect(request, env) {
  const cors = corsHeadersFor(request.headers.get('Origin'), env.ALLOWED_ORIGIN);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' }, cors);
  }

  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, { error: 'DEEPSEEK_API_KEY is not configured.' }, cors);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' }, cors);
  }

  const { trait: traitKey, messages } = body || {};
  const trait = traitKey && config.traits[traitKey];
  if (!trait) {
    return jsonResponse(400, {
      error: 'Unknown trait.',
      available: Object.keys(config.traits),
    }, cors);
  }
  if (!Array.isArray(messages)) {
    return jsonResponse(400, { error: 'messages must be an array.' }, cors);
  }

  const hasUserTurn = messages.some(
    (m) => m && m.role === 'user' && typeof m.content === 'string' && m.content.trim()
  );
  if (!hasUserTurn) {
    return jsonResponse(200, { result: buildOpener(trait) }, cors);
  }

  const cleanMessages = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content }));

  const payload = {
    model: MODEL,
    messages: [
      { role: 'system', content: buildSystemPrompt(config.system, trait) },
      ...cleanMessages,
    ],
    max_tokens: MAX_TOKENS,
  };

  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return jsonResponse(502, { error: `Upstream model error: ${response.status}` }, cors);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return jsonResponse(502, { error: 'Empty response from upstream model.' }, cors);

    return jsonResponse(200, { result: text }, cors);
  } catch {
    return jsonResponse(502, { error: 'Failed to reach upstream model.' }, cors);
  }
}

export function listTraits() {
  return Object.entries(config.traits).map(([key, t]) => ({
    key,
    name: t.name,
    descriptors: t.descriptors,
    framework: t.framework,
  }));
}

export function getSystemMeta() {
  return {
    name: config.system.name,
    description: config.system.description,
    traits: listTraits(),
  };
}
