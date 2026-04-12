#!/usr/bin/env node
/**
 * Pre-compute framework embeddings using text-embedding-3-large.
 * Run this once, or whenever frameworks change.
 *
 * Usage: node scripts/compute-framework-embeddings.js
 *
 * Requires OPENAI_API_KEY in .env
 */

import 'dotenv/config';
import { computeFrameworkEmbeddings } from '../api/lib/frameworkMatcher.js';

// Import frameworks from the frontend data file
// Since it's ESM with no JSX, we can import directly
import { BUILDER_FRAMEWORKS } from '../src/lib/builderFrameworks.js';

const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey) {
  console.error('OPENAI_API_KEY not found in .env');
  process.exit(1);
}

console.log(`Found ${BUILDER_FRAMEWORKS.length} frameworks to embed.`);

try {
  const result = await computeFrameworkEmbeddings(openaiKey, BUILDER_FRAMEWORKS);
  console.log(`Done. ${result.count} embeddings computed and saved.`);
} catch (err) {
  console.error('Failed:', err.message);
  process.exit(1);
}
