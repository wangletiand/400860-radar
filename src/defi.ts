import { cached } from './cache.js';
import { config } from './config.js';

const DEFILLAMA = 'https://api.llama.fi';
const YIELDS = 'https://yields.llama.fi';

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'api.400860.xyz/2.0 data-crawler' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  return res.json();
}

export type YieldPool = {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
  stablecoin: boolean;
  ilRisk: string;
  audits: string;
  url: string;
};

export type TvlEntry = {
  name: string;
  tvl: number;
  change1d: number | null;
  change7d: number | null;
  chains: string[];
  category: string;
};

export async function getYields(): Promise<YieldPool[]> {
  return cached('defi:yields', config.cacheTtl.defiYields, async () => {
    const raw = await fetchJson(`${YIELDS}/pools`) as { data: YieldPool[] };
    // Return top 200 pools by TVL, filtered for meaningful size
    return raw.data
      .filter(p => p.tvlUsd > 1_000_000 && p.apy > 0)
      .sort((a, b) => b.tvlUsd - a.tvlUsd)
      .slice(0, 200)
      .map(p => ({
        chain: p.chain,
        project: p.project,
        symbol: p.symbol,
        tvlUsd: Math.round(p.tvlUsd),
        apy: Math.round(p.apy * 100) / 100,
        apyBase: p.apyBase != null ? Math.round(p.apyBase * 100) / 100 : null,
        apyReward: p.apyReward != null ? Math.round(p.apyReward * 100) / 100 : null,
        stablecoin: p.stablecoin,
        ilRisk: p.ilRisk,
        audits: p.audits,
        url: p.url,
      }));
  });
}

export async function getTvl(): Promise<TvlEntry[]> {
  return cached('defi:tvl', config.cacheTtl.defiTvl, async () => {
    const raw = await fetchJson(`${DEFILLAMA}/protocols`) as Array<{
      name: string; tvl: number; change_1d: number | null;
      change_7d: number | null; chains: string[]; category: string;
    }>;
    return raw
      .filter(p => p.tvl > 10_000_000)
      .sort((a, b) => b.tvl - a.tvl)
      .slice(0, 100)
      .map(p => ({
        name: p.name,
        tvl: Math.round(p.tvl),
        change1d: p.change_1d != null ? Math.round(p.change_1d * 100) / 100 : null,
        change7d: p.change_7d != null ? Math.round(p.change_7d * 100) / 100 : null,
        chains: p.chains ?? [],
        category: p.category ?? 'Unknown',
      }));
  });
}
