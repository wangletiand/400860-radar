# 400860 Data API

Real-time DeFi yield data, AI model pricing, and web scraping. Pay-per-call via [x402](https://x402.org) on Base mainnet (USDC, no account needed).

## Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /v1/defi/yields` | $0.001 | Top 200 DeFi yield pools from DeFiLlama, 5-min cache |
| `GET /v1/defi/tvl` | $0.001 | Top 100 protocols by TVL with 24h/7d delta, 10-min cache |
| `GET /v1/ai/pricing` | $0.001 | LLM API pricing across Anthropic, OpenAI, Google, DeepSeek, Mistral, xAI, Meta |
| `POST /v1/mcp/call` | $0.01 | MCP tool call (see tools below) |
| `POST /v1/scrape/page` | $0.005 | Scrape any URL, returns clean text (Scrapling) |
| `POST /v1/scrape/extract` | $0.01 | Scrape URL with CSS selector extraction |
| `POST /v1/scrape/stealth` | $0.02 | Stealth scrape bypassing Cloudflare/anti-bot (Playwright) |

Base URL: **https://api.400860.xyz**

## MCP Tools

Connect via `https://api.400860.xyz/v1/mcp/call` (streamable-http, x402 gated):

```json
{
  tool: get_defi_yields,
  params: { chain: Ethereum, stableOnly: true, limit: 20 }
}
```

Available tools: `get_defi_yields` · `get_defi_tvl` · `get_ai_pricing`

Full tool manifest: https://api.400860.xyz/server.json

## Quick Start (curl)

```bash
# Free: discovery
curl https://api.400860.xyz/
curl https://api.400860.xyz/mcp/tools
curl https://api.400860.xyz/.well-known/x402.json

# Paid: requires x402 payment header (use an x402 client)
curl https://api.400860.xyz/v1/defi/yields?stableOnly=true&limit=10
```

## Payment

All paid endpoints use [x402 protocol](https://x402.org):
- Network: Base mainnet (`eip155:8453`)
- Asset: USDC
- Facilitator: https://facilitator.payai.network

Use any x402-compatible client ([@coinbase/x402](https://www.npmjs.com/package/@coinbase/x402), [x402.js](https://github.com/coinbase/x402)) or the Claude/Cursor MCP integration.

## Self-host

```bash
git clone https://github.com/wangletiand/400860-radar
cd 400860-radar
cp .env.example .env  # set PAY_TO and PUBLIC_BASE_URL
npm install && npm run build && npm start
```

Requires Node.js 20+. Scraping features require Python 3.10+ and Scrapling.

## License

MIT
