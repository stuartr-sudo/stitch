/**
 * Framework Matcher — Embedding-based semantic matching.
 *
 * Pre-computes embeddings for all frameworks using text-embedding-3-large (3072 dims).
 * At runtime, embeds the selected topic and finds the best-matching framework
 * via cosine similarity. Pure math — no LLM guessing, no token waste.
 *
 * Usage:
 *   const { matchFramework } = await initFrameworkMatcher(openaiKey);
 *   const best = await matchFramework(topicText, niche);
 *   // best = { framework, score, allScores }
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EMBEDDINGS_PATH = path.join(__dirname, '../../data/framework-embeddings.json');
const EMBEDDING_MODEL = 'text-embedding-3-large';
const EMBEDDING_DIMENSIONS = 3072;

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Build the text to embed for a framework.
 * Concatenates all relevant fields into a single string for embedding.
 */
function buildFrameworkText(fw) {
  const parts = [
    fw.name,
    fw.description,
    fw.narrativeArc,
    fw.hookStrategy,
    fw.payoffStrategy,
    fw.emotionalProgression,
    fw.pacingStrategy,
    fw.voiceDirection,
  ].filter(Boolean);
  return parts.join(' | ');
}

/**
 * Load pre-computed embeddings from disk.
 * Returns null if file doesn't exist or is corrupt.
 */
function loadEmbeddings() {
  try {
    if (!fs.existsSync(EMBEDDINGS_PATH)) return null;
    const raw = fs.readFileSync(EMBEDDINGS_PATH, 'utf-8');
    const data = JSON.parse(raw);
    if (!data.embeddings || !Array.isArray(data.embeddings)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Save computed embeddings to disk.
 */
function saveEmbeddings(data) {
  const dir = path.dirname(EMBEDDINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(EMBEDDINGS_PATH, JSON.stringify(data, null, 2));
}

/**
 * Compute embeddings for all frameworks and save to disk.
 * Called once (or when frameworks change). Can be run as a script or on first request.
 *
 * @param {string} openaiKey
 * @param {Array} frameworks — array of framework objects from builderFrameworks.js
 */
export async function computeFrameworkEmbeddings(openaiKey, frameworks) {
  const openai = new OpenAI({ apiKey: openaiKey });

  console.log(`[framework-matcher] Computing embeddings for ${frameworks.length} frameworks...`);

  // Batch embed — OpenAI supports up to 2048 inputs per call
  const texts = frameworks.map(fw => buildFrameworkText(fw));

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    input: texts,
  });

  const embeddings = frameworks.map((fw, i) => ({
    id: fw.id,
    name: fw.name,
    category: fw.category,
    niches: fw.niches,
    embedding: response.data[i].embedding,
  }));

  const data = {
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    computed_at: new Date().toISOString(),
    count: embeddings.length,
    embeddings,
  };

  saveEmbeddings(data);
  console.log(`[framework-matcher] Saved ${embeddings.length} embeddings to ${EMBEDDINGS_PATH}`);
  return data;
}

/**
 * Match a topic to the best framework using cosine similarity.
 *
 * @param {string} topicText — the topic title + description/context
 * @param {string} niche — niche ID to filter frameworks (null = search all)
 * @param {string} openaiKey — for embedding the topic
 * @param {object} [embeddingsData] — pre-loaded embeddings (optional, loads from disk if not provided)
 * @returns {{ framework: object, score: number, allScores: Array<{id, name, score}> }}
 */
export async function matchFramework(topicText, niche, openaiKey, embeddingsData) {
  const openai = new OpenAI({ apiKey: openaiKey });

  // Load embeddings
  const data = embeddingsData || loadEmbeddings();
  if (!data || !data.embeddings?.length) {
    throw new Error('Framework embeddings not computed. Run computeFrameworkEmbeddings() first.');
  }

  // Embed the topic
  const topicResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    input: [topicText],
  });
  const topicEmbedding = topicResponse.data[0].embedding;

  // Filter to niche-relevant frameworks (universal + niche-specific)
  const candidates = data.embeddings.filter(e =>
    e.niches === null || (niche && e.niches?.includes(niche))
  );

  if (!candidates.length) {
    throw new Error(`No frameworks found for niche: ${niche}`);
  }

  // Score each candidate
  const scores = candidates.map(e => ({
    id: e.id,
    name: e.name,
    category: e.category,
    score: cosineSimilarity(topicEmbedding, e.embedding),
  }));

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  console.log(`[framework-matcher] Topic: "${topicText.substring(0, 60)}..." → Best: ${best.name} (${(best.score * 100).toFixed(1)}%)`);

  return {
    frameworkId: best.id,
    frameworkName: best.name,
    category: best.category,
    score: best.score,
    allScores: scores.slice(0, 5), // top 5 for debugging
  };
}
