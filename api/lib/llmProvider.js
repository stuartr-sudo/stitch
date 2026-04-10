/**
 * LLM Provider Dispatch — unified interface for OpenAI, Anthropic, and Google Gemini.
 *
 * Usage:
 *   import { callLlm } from './llmProvider.js';
 *   const { text, usage } = await callLlm('gpt-4.1-mini', 'You are helpful', 'Hello', config, apiKeys);
 */

import OpenAI from 'openai';

// ── Provider detection ──────────────────────────────────────────────────────

function getProvider(model) {
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('gemini-')) return 'google';
  return 'openai';
}

const REASONING_MODELS = new Set(['o3-mini', 'o3', 'o4-mini']);

// ── OpenAI ──────────────────────────────────────────────────────────────────

async function callOpenAI(model, systemPrompt, userPrompt, config, apiKeys, abortSignal) {
  if (!apiKeys.openaiKey) throw new Error('OpenAI API key not configured — go to Settings → API Keys');

  const openai = new OpenAI({ apiKey: apiKeys.openaiKey });
  const isReasoning = REASONING_MODELS.has(model);

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userPrompt });

  const params = {
    model,
    messages,
    max_completion_tokens: config.max_tokens || 4096,
  };

  // Reasoning models don't support temperature/top_p
  if (!isReasoning) {
    if (config.temperature != null) params.temperature = config.temperature;
    if (config.top_p != null) params.top_p = config.top_p;
  }

  if (config.frequency_penalty != null) params.frequency_penalty = config.frequency_penalty;
  if (config.presence_penalty != null) params.presence_penalty = config.presence_penalty;
  if (config.seed != null) params.seed = config.seed;

  if (config.response_format === 'json_object') {
    params.response_format = { type: 'json_object' };
  }

  const resp = await openai.chat.completions.create(params, {
    signal: abortSignal || undefined,
  });

  const text = resp.choices?.[0]?.message?.content || '';
  const usage = {
    input_tokens: resp.usage?.prompt_tokens || 0,
    output_tokens: resp.usage?.completion_tokens || 0,
  };

  return { text, usage };
}

// ── Anthropic ───────────────────────────────────────────────────────────────

async function callAnthropic(model, systemPrompt, userPrompt, config, apiKeys, abortSignal) {
  if (!apiKeys.anthropicKey) throw new Error('Anthropic API key not configured — go to Settings → API Keys');

  const body = {
    model,
    messages: [{ role: 'user', content: userPrompt }],
    max_tokens: config.max_tokens || 4096,
  };

  if (systemPrompt) body.system = systemPrompt;
  if (config.temperature != null) body.temperature = config.temperature;
  if (config.top_p != null) body.top_p = config.top_p;
  if (config.top_k != null) body.top_k = config.top_k;
  if (config.stop_sequences?.length) body.stop_sequences = config.stop_sequences;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKeys.anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: abortSignal || undefined,
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Anthropic API error (${resp.status}): ${err.error?.message || resp.statusText}`);
  }

  const data = await resp.json();
  const text = data.content?.[0]?.text || '';
  const usage = {
    input_tokens: data.usage?.input_tokens || 0,
    output_tokens: data.usage?.output_tokens || 0,
  };

  return { text, usage };
}

// ── Google Gemini ───────────────────────────────────────────────────────────

async function callGemini(model, systemPrompt, userPrompt, config, apiKeys, abortSignal) {
  if (!apiKeys.googleAiKey) throw new Error('Google AI API key not configured — go to Settings → API Keys');

  const body = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {},
  };

  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const gc = body.generationConfig;
  if (config.max_tokens) gc.maxOutputTokens = config.max_tokens;
  if (config.temperature != null) gc.temperature = config.temperature;
  if (config.top_p != null) gc.topP = config.top_p;
  if (config.top_k != null) gc.topK = config.top_k;
  if (config.stop_sequences?.length) gc.stopSequences = config.stop_sequences;
  if (config.responseMimeType) gc.responseMimeType = config.responseMimeType;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKeys.googleAiKey}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: abortSignal || undefined,
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Gemini API error (${resp.status}): ${err.error?.message || resp.statusText}`);
  }

  const data = await resp.json();

  const candidate = data.candidates?.[0];
  if (!candidate) {
    const blockReason = data.promptFeedback?.blockReason;
    throw new Error(blockReason ? `Gemini blocked request: ${blockReason}` : 'Gemini returned no candidates');
  }

  const text = candidate.content?.parts?.[0]?.text || '';
  const usage = {
    input_tokens: data.usageMetadata?.promptTokenCount || 0,
    output_tokens: data.usageMetadata?.candidatesTokenCount || 0,
  };

  return { text, usage };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Call an LLM and get a unified response.
 *
 * @param {string} model - Model ID (e.g. 'gpt-4.1-mini', 'claude-sonnet-4-6', 'gemini-2.5-flash')
 * @param {string} systemPrompt - System prompt (optional, can be empty string)
 * @param {string} userPrompt - User prompt (required)
 * @param {object} config - Provider-specific config (temperature, max_tokens, top_p, etc.)
 * @param {object} apiKeys - From getUserKeys() — must include openaiKey, anthropicKey, or googleAiKey
 * @param {AbortSignal} [abortSignal] - Optional abort signal for cancellation
 * @returns {{ text: string, usage: { input_tokens: number, output_tokens: number } }}
 */
export async function callLlm(model, systemPrompt, userPrompt, config, apiKeys, abortSignal) {
  const provider = getProvider(model);

  switch (provider) {
    case 'openai':
      return callOpenAI(model, systemPrompt, userPrompt, config, apiKeys, abortSignal);
    case 'anthropic':
      return callAnthropic(model, systemPrompt, userPrompt, config, apiKeys, abortSignal);
    case 'google':
      return callGemini(model, systemPrompt, userPrompt, config, apiKeys, abortSignal);
    default:
      throw new Error(`Unknown LLM provider for model: ${model}`);
  }
}
