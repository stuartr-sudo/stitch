/**
 * Generic retry wrapper with exponential backoff + jitter.
 *
 * Usage:
 *   const result = await withRetry(
 *     () => generateImage(prompt, ratio, keys),
 *     { maxAttempts: 3, baseDelayMs: 2000 }
 *   );
 */

export async function withRetry(fn, {
  maxAttempts = 3,
  baseDelayMs = 2000,
  maxDelayMs = 30000,
  onRetry = null,
} = {}) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;

      if (attempt < maxAttempts) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        const jitter = delay * 0.2 * Math.random();
        const totalDelay = Math.round(delay + jitter);

        if (onRetry) {
          onRetry(attempt, err, totalDelay);
        } else {
          console.warn(`[retry] Attempt ${attempt}/${maxAttempts} failed: ${err.message}. Retrying in ${totalDelay}ms...`);
        }

        await new Promise(r => setTimeout(r, totalDelay));
      }
    }
  }

  throw lastError;
}
