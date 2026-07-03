import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  port: parseInt(process.env.PORT ?? '2052', 10),
  payTo: required('PAY_TO'),
  network: process.env.X402_NETWORK ?? 'eip155:8453',
  facilitatorUrl: process.env.FACILITATOR_URL ?? 'https://facilitator.payai.network',
  publicBaseUrl: required('PUBLIC_BASE_URL'),
  prices: {
    data:          process.env.DATA_PRICE           ?? '$0.001',
    mcp:           process.env.MCP_PRICE            ?? '$0.01',
    scrape:        process.env.SCRAPE_PRICE         ?? '$0.005',
    scrapeExtract: process.env.SCRAPE_EXTRACT_PRICE ?? '$0.01',
    scrapeStealthy:process.env.SCRAPE_STEALTH_PRICE ?? '$0.02',
  },
  cacheTtl: {
    defiYields: 5  * 60 * 1000,
    defiTvl:    10 * 60 * 1000,
    aiPricing:  60 * 60 * 1000,
  },
};
