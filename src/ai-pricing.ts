// Static dataset of LLM API pricing, updated manually.
// Sources: provider pricing pages as of 2026-07.
// Prices in USD per 1M tokens unless noted.

export type ModelPrice = {
  provider: string;
  model: string;
  inputPer1M: number;
  outputPer1M: number;
  contextK: number;
  notes: string;
  updatedAt: string;
};

export const AI_PRICING_DATASET: ModelPrice[] = [
  // Anthropic
  { provider: 'Anthropic', model: 'claude-opus-4-8', inputPer1M: 15, outputPer1M: 75, contextK: 1000, notes: '1M context window', updatedAt: '2026-07' },
  { provider: 'Anthropic', model: 'claude-sonnet-5', inputPer1M: 3, outputPer1M: 15, contextK: 200, notes: 'Balanced tier', updatedAt: '2026-07' },
  { provider: 'Anthropic', model: 'claude-haiku-4-5', inputPer1M: 0.8, outputPer1M: 4, contextK: 200, notes: 'Fast and cheap', updatedAt: '2026-07' },
  // OpenAI
  { provider: 'OpenAI', model: 'gpt-4o', inputPer1M: 2.5, outputPer1M: 10, contextK: 128, notes: 'Current flagship', updatedAt: '2026-07' },
  { provider: 'OpenAI', model: 'gpt-4o-mini', inputPer1M: 0.15, outputPer1M: 0.6, contextK: 128, notes: 'Budget tier', updatedAt: '2026-07' },
  { provider: 'OpenAI', model: 'o3', inputPer1M: 10, outputPer1M: 40, contextK: 200, notes: 'Reasoning model', updatedAt: '2026-07' },
  { provider: 'OpenAI', model: 'o4-mini', inputPer1M: 1.1, outputPer1M: 4.4, contextK: 200, notes: 'Cheap reasoning', updatedAt: '2026-07' },
  // Google
  { provider: 'Google', model: 'gemini-2.5-pro', inputPer1M: 1.25, outputPer1M: 10, contextK: 1000, notes: '1M context', updatedAt: '2026-07' },
  { provider: 'Google', model: 'gemini-2.5-flash', inputPer1M: 0.15, outputPer1M: 0.6, contextK: 1000, notes: 'Fast tier', updatedAt: '2026-07' },
  // Meta (via Groq/Together)
  { provider: 'Meta/Groq', model: 'llama-3.3-70b', inputPer1M: 0.59, outputPer1M: 0.79, contextK: 128, notes: 'Open source via Groq', updatedAt: '2026-07' },
  { provider: 'Meta/Together', model: 'llama-4-maverick', inputPer1M: 0.27, outputPer1M: 0.85, contextK: 128, notes: 'Via Together AI', updatedAt: '2026-07' },
  // Mistral
  { provider: 'Mistral', model: 'mistral-large-2', inputPer1M: 2, outputPer1M: 6, contextK: 128, notes: 'European provider', updatedAt: '2026-07' },
  { provider: 'Mistral', model: 'codestral-2501', inputPer1M: 0.3, outputPer1M: 0.9, contextK: 256, notes: 'Code-optimized', updatedAt: '2026-07' },
  // DeepSeek
  { provider: 'DeepSeek', model: 'deepseek-v3', inputPer1M: 0.27, outputPer1M: 1.1, contextK: 128, notes: 'Off-peak discount available', updatedAt: '2026-07' },
  { provider: 'DeepSeek', model: 'deepseek-r1', inputPer1M: 0.55, outputPer1M: 2.19, contextK: 128, notes: 'Reasoning model', updatedAt: '2026-07' },
  // xAI
  { provider: 'xAI', model: 'grok-3', inputPer1M: 3, outputPer1M: 15, contextK: 131, notes: '', updatedAt: '2026-07' },
  { provider: 'xAI', model: 'grok-3-mini', inputPer1M: 0.3, outputPer1M: 0.5, contextK: 131, notes: 'Budget reasoning', updatedAt: '2026-07' },
];

export function getAiPricing() {
  return {
    fetchedAt: new Date().toISOString(),
    note: 'Prices in USD per 1M tokens. Verify with provider before billing. Dataset updated monthly.',
    models: AI_PRICING_DATASET,
    summary: {
      cheapestInput: AI_PRICING_DATASET.reduce((a, b) => a.inputPer1M < b.inputPer1M ? a : b),
      cheapestOutput: AI_PRICING_DATASET.reduce((a, b) => a.outputPer1M < b.outputPer1M ? a : b),
      cheapestReasoning: AI_PRICING_DATASET
        .filter(m => m.notes.includes('reasoning') || m.model.includes('o3') || m.model.includes('r1'))
        .reduce((a, b) => a.inputPer1M < b.inputPer1M ? a : b),
    },
  };
}
