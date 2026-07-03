import 'dotenv/config';
import express from 'express';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { config } from './config.js';
import { getYields, getTvl } from './defi.js';
import { getAiPricing } from './ai-pricing.js';

const app = express();
app.set('trust proxy', true);
app.use(express.json());

app.use((_req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'content-type,x-payment,payment-signature');
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.set('Access-Control-Expose-Headers', 'Payment-Required,Payment-Response,X-Payment,X-Payment-Response');
  next();
});
app.options('*', (_req, res) => { res.sendStatus(204); });

// ── x402 setup ──────────────────────────────────────────────────────────────
const facilitatorClient = new HTTPFacilitatorClient({ url: config.facilitatorUrl });
const resourceServer = new x402ResourceServer(facilitatorClient);
resourceServer.register(config.network as `${string}:${string}`, new ExactEvmScheme());

function makeAccepts(price: string) {
  return [{
    scheme: 'exact',
    payTo: config.payTo,
    price: price as `$${number}`,
    network: config.network as `${string}:${string}`,
  }];
}

const paidRoutes = {
  '/v1/defi/yields':  { accepts: makeAccepts(config.prices.data) },
  '/v1/defi/tvl':     { accepts: makeAccepts(config.prices.data) },
  '/v1/ai/pricing':   { accepts: makeAccepts(config.prices.data) },
  'POST /v1/mcp/call':  { accepts: makeAccepts(config.prices.mcp) },
  'POST /v1/scrape/page':    { accepts: makeAccepts(config.prices.scrape) },
  'POST /v1/scrape/extract':  { accepts: makeAccepts(config.prices.scrapeExtract) },
  'POST /v1/scrape/stealth':  { accepts: makeAccepts(config.prices.scrapeStealthy) },
};

app.use(paymentMiddleware(paidRoutes, resourceServer));

// ── Free endpoints ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  res.json({
    name: '400860 Data API',
    version: '2.0.0',
    description: 'Real-time DeFi and AI pricing data. Pay-per-call via x402 on Base mainnet.',
    products: [
      { path: '/v1/defi/yields',     price: config.prices.data,          description: 'Top 200 DeFi yield pools from DeFiLlama, 5-min cache' },
      { path: '/v1/defi/tvl',        price: config.prices.data,          description: 'Top 100 protocols by TVL with 24h/7d delta, 10-min cache' },
      { path: '/v1/ai/pricing',      price: config.prices.data,          description: 'LLM API pricing across 8 providers, 1-hour cache' },
      { path: '/v1/mcp/call',        price: config.prices.mcp,           description: 'MCP tool call: get_defi_yields | get_defi_tvl | get_ai_pricing' },
      { path: '/v1/scrape/page',     price: config.prices.scrape,        description: 'Scrape any URL, returns clean text (Scrapling)' },
      { path: '/v1/scrape/extract',  price: config.prices.scrapeExtract, description: 'Scrape URL with CSS selector extraction (Scrapling)' },
      { path: '/v1/scrape/stealth',   price: config.prices.scrapeStealthy, description: 'Stealth scrape bypassing Cloudflare/anti-bot (Scrapling+Playwright)' },
    ],
  });
});

app.get('/mcp/tools', (_req, res) => {
  res.json({ tools: [
    { name: 'get_defi_yields',  description: 'Top DeFi yield pools from DeFiLlama. Params: chain, stableOnly, minApy, limit.' },
    { name: 'get_defi_tvl',     description: 'DeFi protocols by TVL with change deltas. Params: chain, category, limit.' },
    { name: 'get_ai_pricing',   description: 'LLM API pricing comparison across providers. Params: provider (optional filter).' },
  ]});
});

app.get('/.well-known/x402.json', (_req, res) => {
  res.json({
    version: '1',
    payTo: config.payTo,
    network: config.network,
    facilitator: config.facilitatorUrl,
    resources: [
      { path: '/v1/defi/yields', price: config.prices.data, method: 'GET', description: 'DeFi yield pools (DeFiLlama)' },
      { path: '/v1/defi/tvl',   price: config.prices.data, method: 'GET', description: 'Protocol TVL deltas (DeFiLlama)' },
      { path: '/v1/ai/pricing', price: config.prices.data, method: 'GET', description: 'LLM API pricing comparison' },
      { path: '/v1/mcp/call',         price: config.prices.mcp,           method: 'POST', description: 'MCP tool call' },
      { path: '/v1/scrape/page',     price: config.prices.scrape,        method: 'POST', description: 'Scrape any URL, clean text (Scrapling)' },
      { path: '/v1/scrape/extract',  price: config.prices.scrapeExtract, method: 'POST', description: 'Scrape URL with CSS selector (Scrapling)' },
      { path: '/v1/scrape/stealth',   price: config.prices.scrapeStealthy, method: 'POST', description: 'Stealth scrape bypassing Cloudflare/anti-bot (Scrapling+Playwright)' },
    ],
  });
});

// ── Paid data endpoints ─────────────────────────────────────────────────────
app.get('/v1/defi/yields', async (req, res) => {
  try {
    const chain = req.query.chain as string | undefined;
    const stableOnly = req.query.stableOnly === 'true';
    const minApy = parseFloat((req.query.minApy as string) ?? '0');
    const limit = Math.min(parseInt((req.query.limit as string) ?? '50', 10), 200);
    let pools = await getYields();
    if (chain) pools = pools.filter(p => p.chain.toLowerCase() === chain.toLowerCase());
    if (stableOnly) pools = pools.filter(p => p.stablecoin);
    if (minApy > 0) pools = pools.filter(p => p.apy >= minApy);
    res.json({ source: 'DeFiLlama', fetchedAt: new Date().toISOString(), count: pools.slice(0, limit).length, pools: pools.slice(0, limit) });
  } catch (e) {
    res.status(502).json({ error: 'upstream fetch failed', detail: String(e) });
  }
});

app.get('/v1/defi/tvl', async (req, res) => {
  try {
    const chain = req.query.chain as string | undefined;
    const category = req.query.category as string | undefined;
    const limit = Math.min(parseInt((req.query.limit as string) ?? '50', 10), 100);
    let protocols = await getTvl();
    if (chain) protocols = protocols.filter(p => p.chains.some(c => c.toLowerCase() === (chain as string).toLowerCase()));
    if (category) protocols = protocols.filter(p => p.category.toLowerCase() === (category as string).toLowerCase());
    res.json({ source: 'DeFiLlama', fetchedAt: new Date().toISOString(), count: protocols.slice(0, limit).length, protocols: protocols.slice(0, limit) });
  } catch (e) {
    res.status(502).json({ error: 'upstream fetch failed', detail: String(e) });
  }
});

app.get('/v1/ai/pricing', (_req, res) => {
  res.json(getAiPricing());
});

// ── MCP tool call (paid) ────────────────────────────────────────────────────
app.post('/v1/mcp/call', async (req, res) => {
  const { tool, params } = req.body as { tool?: string; params?: Record<string, unknown> };
  if (!tool) return res.status(400).json({ error: 'missing field: tool' });

  try {
    if (tool === 'get_defi_yields') {
      const chain = params?.chain as string | undefined;
      const stableOnly = params?.stableOnly === true;
      const minApy = parseFloat(String(params?.minApy ?? '0'));
      const limit = Math.min(parseInt(String(params?.limit ?? '50'), 10), 200);
      let pools = await getYields();
      if (chain) pools = pools.filter(p => p.chain.toLowerCase() === chain.toLowerCase());
      if (stableOnly) pools = pools.filter(p => p.stablecoin);
      if (minApy > 0) pools = pools.filter(p => p.apy >= minApy);
      return res.json({ tool, source: 'DeFiLlama', count: pools.slice(0, limit).length, result: pools.slice(0, limit) });
    }

    if (tool === 'get_defi_tvl') {
      const chain = params?.chain as string | undefined;
      const category = params?.category as string | undefined;
      const limit = Math.min(parseInt(String(params?.limit ?? '50'), 10), 100);
      let protocols = await getTvl();
      if (chain) protocols = protocols.filter(p => p.chains.some(c => c.toLowerCase() === (chain as string).toLowerCase()));
      if (category) protocols = protocols.filter(p => p.category.toLowerCase() === (category as string).toLowerCase());
      return res.json({ tool, source: 'DeFiLlama', count: protocols.slice(0, limit).length, result: protocols.slice(0, limit) });
    }

    if (tool === 'get_ai_pricing') {
      const pricing = getAiPricing();
      const provider = params?.provider as string | undefined;
      if (provider) pricing.models = pricing.models.filter(m => m.provider.toLowerCase().includes(provider.toLowerCase()));
      return res.json({ tool, result: pricing });
    }

    return res.status(400).json({
      error: `unknown tool: ${tool}`,
      availableTools: ['get_defi_yields', 'get_defi_tvl', 'get_ai_pricing'],
    });
  } catch (e) {
    return res.status(502).json({ error: 'tool execution failed', detail: String(e) });
  }
});


// ── Static manifests ────────────────────────────────────────────────────────
app.get('/server.json', (_req, res) => {
  res.sendFile('/root/400860-radar/server.json');
});

app.get('/openapi.json', (_req, res) => {
  res.json({
    openapi: '3.0.3',
    info: { title: '400860 Data API', version: '2.0.0' },
    servers: [{ url: 'https://api.400860.xyz' }],
    paths: {
      '/v1/defi/yields': { get: { summary: 'DeFi yield pools (paid /usr/bin/bash.001)', parameters: [
        { name: 'chain', in: 'query', schema: { type: 'string' } },
        { name: 'stableOnly', in: 'query', schema: { type: 'boolean' } },
        { name: 'minApy', in: 'query', schema: { type: 'number' } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
      ], responses: { '200': { description: 'Yield pool list' }, '402': { description: 'Payment required' } } } },
      '/v1/defi/tvl': { get: { summary: 'DeFi TVL deltas (paid /usr/bin/bash.001)', responses: { '200': { description: 'TVL list' }, '402': { description: 'Payment required' } } } },
      '/v1/ai/pricing': { get: { summary: 'LLM API pricing (paid /usr/bin/bash.001)', responses: { '200': { description: 'Pricing dataset' }, '402': { description: 'Payment required' } } } },
      '/v1/mcp/call': { post: { summary: 'MCP tool call (paid /usr/bin/bash.01)', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { tool: { type: 'string', enum: ['get_defi_yields', 'get_defi_tvl', 'get_ai_pricing'] }, params: { type: 'object' } }, required: ['tool'] } } } }, responses: { '200': { description: 'Tool result' }, '402': { description: 'Payment required' } } } },
    },
  });
});


// ── Scraping endpoints (paid, powered by Scrapling) ─────────────────────────
const SCRAPLING_URL = 'http://127.0.0.1:2053';

async function callScraper(url: string, selector?: string, maxLength?: number) {
  const res = await fetch(SCRAPLING_URL + '/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, selector, maxLength: maxLength ?? 8000 }),
    signal: AbortSignal.timeout(20000),
  });
  return res.json();
}

app.post('/v1/scrape/page', async (req, res) => {
  const { url, maxLength } = req.body as { url?: string; maxLength?: number };
  if (!url) return res.status(400).json({ error: 'missing field: url' });
  try {
    const result = await callScraper(url, undefined, maxLength);
    return res.json(result);
  } catch (e) {
    return res.status(502).json({ error: 'scraper unavailable', detail: String(e) });
  }
});

app.post('/v1/scrape/extract', async (req, res) => {
  const { url, selector, maxLength } = req.body as { url?: string; selector?: string; maxLength?: number };
  if (!url) return res.status(400).json({ error: 'missing field: url' });
  if (!selector) return res.status(400).json({ error: 'missing field: selector (CSS selector)' });
  try {
    const result = await callScraper(url, selector, maxLength);
    return res.json(result);
  } catch (e) {
    return res.status(502).json({ error: 'scraper unavailable', detail: String(e) });
  }
});


app.post('/v1/scrape/stealth', async (req, res) => {
  const { url, selector, maxLength } = req.body as { url?: string; selector?: string; maxLength?: number };
  if (!url) return res.status(400).json({ error: 'missing field: url' });
  try {
    const r = await fetch(SCRAPLING_URL + '/scrape/stealth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, selector, maxLength: maxLength ?? 8000 }),
      signal: AbortSignal.timeout(30000),
    });
    return res.json(await r.json());
  } catch (e) {
    return res.status(502).json({ error: 'stealth scraper unavailable', detail: String(e) });
  }
});

// ── MCP Registry auth challenge ──────────────────────────────────────────────
// Serves the ed25519 public key for mcp-publisher HTTP domain verification
app.get('/.well-known/mcp-registry-auth', (_req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('v=MCPv1; k=ed25519; p=Lb4bZCpB7LF3VAcQ4rojyYHZYRZSZn6y3PrOyEPCnzQ=');
});


// ── Free MCP JSON-RPC endpoint (for Smithery scanner) ───────────────────────
// Handles MCP protocol initialize + tools/list without payment requirement
const MCP_TOOLS = [
  {
    name: 'get_defi_yields',
    description: 'Return top DeFi yield pools from DeFiLlama. Params: chain (string), stableOnly (bool), minApy (number), limit (number, max 200). Paid via x402.',
    inputSchema: {
      type: 'object',
      properties: {
        chain:      { type: 'string',  description: 'e.g. Ethereum, Arbitrum, Base' },
        stableOnly: { type: 'boolean' },
        minApy:     { type: 'number'  },
        limit:      { type: 'integer', default: 50, maximum: 200 },
      },
    },
  },
  {
    name: 'get_defi_tvl',
    description: 'Return DeFi protocol TVL with 24h/7d change. Params: chain, category, limit. Paid via x402.',
    inputSchema: {
      type: 'object',
      properties: {
        chain:    { type: 'string' },
        category: { type: 'string', description: 'e.g. Dexes, Lending, Yield' },
        limit:    { type: 'integer', default: 50, maximum: 100 },
      },
    },
  },
  {
    name: 'get_ai_pricing',
    description: 'Return LLM API pricing across Anthropic, OpenAI, Google, DeepSeek, Mistral, xAI, Meta. Params: provider (optional). Paid via x402.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'Filter by provider name' },
      },
    },
  },
];

app.post('/mcp', (req, res) => {
  const body = req.body as { jsonrpc?: string; method?: string; id?: unknown; params?: unknown };
  const id = body.id ?? null;

  if (body.method === 'initialize') {
    return res.json({
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: '400860 Data API', version: '2.1.0' },
      },
    });
  }

  if (body.method === 'tools/list') {
    return res.json({ jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } });
  }

  if (body.method === 'tools/call') {
    // Redirect to paid endpoint instructions
    return res.json({
      jsonrpc: '2.0', id,
      result: {
        content: [{
          type: 'text',
          text: 'This tool requires x402 payment. Call POST https://api.400860.xyz/v1/mcp/call with x402 payment header. See https://api.400860.xyz/ for pricing.',
        }],
      },
    });
  }

  return res.status(400).json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`[400860-radar v2] port=${config.port} payTo=${config.payTo} network=${config.network}`);
});
