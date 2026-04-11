/**
 * Actionable error message lookup for Flows.
 * Maps raw API error strings to human-readable messages with suggested fixes.
 */

const ERROR_PATTERNS = [
  // Rate limits
  { pattern: /rate.?limit/i, message: 'API rate limit hit.', action: 'Wait 30 seconds and retry, or switch to a different model.', severity: 'warning' },
  { pattern: /too many requests/i, message: 'Too many concurrent requests.', action: 'Reduce flow concurrency or add a Delay node before this step.', severity: 'warning' },
  { pattern: /quota/i, message: 'API credits exhausted.', action: 'Top up your FAL.ai or Wavespeed account, or switch to a cheaper model.', severity: 'error' },

  // Timeouts
  { pattern: /timed? ?out/i, message: 'Generation took too long.', action: 'Try a simpler prompt, shorter duration, or faster model (e.g., Nano Banana 2 for images, Kling 2.0 for video).', severity: 'warning' },
  { pattern: /ETIMEDOUT|ECONNRESET|ECONNREFUSED/i, message: 'Network connection failed.', action: 'Check your internet connection. The AI provider may be temporarily down — retry in a minute.', severity: 'warning' },

  // Auth
  { pattern: /401|unauthorized/i, message: 'API key is invalid or expired.', action: 'Go to Settings → API Keys and update your FAL.ai or OpenAI key.', severity: 'error' },
  { pattern: /403|forbidden/i, message: 'Access denied by the provider.', action: 'Your API key may lack permissions for this model. Check your provider dashboard.', severity: 'error' },
  { pattern: /invalid.?api.?key/i, message: 'Invalid API key format.', action: 'Double-check your API key in Settings. Make sure there are no extra spaces.', severity: 'error' },

  // Content safety
  { pattern: /nsfw|safety|content.?policy|moderation/i, message: 'Content flagged by safety filters.', action: 'Adjust your prompt to avoid restricted content. Remove references to violence, adult content, or real people.', severity: 'warning' },
  { pattern: /no_media_generated/i, message: 'Model couldn\'t generate media from this input.', action: 'Try a different prompt, remove brand names (Pixar, Disney, etc.), or switch models. Veo 3.1 is strict — Kling is more permissive.', severity: 'warning' },
  { pattern: /brand.?name|copyright|trademark/i, message: 'Prompt contains a brand name.', action: 'Remove brand names (Nike, Disney, Pixar, etc.) from the prompt. Veo 3.1 blocks these automatically.', severity: 'warning' },

  // Input validation
  { pattern: /422|unprocessable/i, message: 'Invalid input parameters.', action: 'Check the node config — a required field may be empty, or a value is out of range (e.g., duration must be 4s/6s/8s for Veo).', severity: 'error' },
  { pattern: /400|bad.?request/i, message: 'Malformed request to the AI provider.', action: 'Check all config fields. Make sure image URLs are valid and accessible.', severity: 'error' },
  { pattern: /image.?url.*invalid|invalid.*url/i, message: 'The image URL is invalid or expired.', action: 'FAL CDN URLs expire within hours. Re-generate the image or upload it to your library first.', severity: 'error' },
  { pattern: /file.?size|too.?large|payload.?too/i, message: 'File is too large for this model.', action: 'Reduce image size to under 10MB. Use the Upscale node after generation, not before.', severity: 'warning' },

  // Model-specific
  { pattern: /veo.*duration/i, message: 'Invalid Veo duration value.', action: 'Veo 3.1 only accepts 4s, 6s, or 8s durations. Other values cause errors.', severity: 'error' },
  { pattern: /generate_audio.*not supported/i, message: 'This model doesn\'t support audio generation.', action: 'Only Kling V3, Kling O3, Veo 3.1, Veo 3.1 Lite, PixVerse V6, and Grok support generate_audio.', severity: 'warning' },
  { pattern: /queue.?full|capacity/i, message: 'AI service is at capacity.', action: 'High demand on this model. Wait 1-2 minutes and retry, or switch to a less busy model.', severity: 'warning' },

  // OAuth / Publishing
  { pattern: /oauth|token.*expired|refresh.*failed/i, message: 'Publishing token expired.', action: 'Go to Settings → Connected Accounts and reconnect this platform.', severity: 'error' },
  { pattern: /youtube.*upload/i, message: 'YouTube upload failed.', action: 'Check your YouTube connection in Settings. Make sure your channel allows uploads.', severity: 'error' },
  { pattern: /instagram.*container/i, message: 'Instagram publishing failed.', action: 'Instagram requires a business/creator account connected via Meta. Check Settings → Connected Accounts.', severity: 'error' },

  // Network / Server
  { pattern: /500|internal.?server/i, message: 'Server error at the AI provider.', action: 'This is on the provider\'s end, not yours. Retry in 30 seconds. If persistent, try a different model.', severity: 'warning' },
  { pattern: /502|bad.?gateway/i, message: 'AI provider is temporarily unreachable.', action: 'The provider is likely restarting. Wait 60 seconds and retry.', severity: 'warning' },
  { pattern: /503|service.?unavailable/i, message: 'AI service is down for maintenance.', action: 'The provider is under maintenance. Try again in a few minutes or switch to a different provider.', severity: 'warning' },
  { pattern: /504|gateway.?timeout/i, message: 'Provider didn\'t respond in time.', action: 'Heavy load on the AI service. Retry, or try a faster/smaller model.', severity: 'warning' },

  // LoRA
  { pattern: /lora.*not.?found|safetensors/i, message: 'LoRA model not found.', action: 'The trained LoRA may have been deleted or the URL expired. Re-train or select a different LoRA.', severity: 'error' },

  // FFmpeg / Assembly
  { pattern: /ffmpeg|compose|assembly/i, message: 'Video assembly failed.', action: 'One or more video clips may be corrupted. Try regenerating the failing clip, then reassemble.', severity: 'warning' },

  // Generic fallbacks
  { pattern: /fetch.?failed|network.?error/i, message: 'Network request failed.', action: 'Check your internet connection and try again.', severity: 'warning' },
];

/**
 * Match a raw error string to an actionable message.
 * @param {string} rawError - The raw error message from the API/executor
 * @returns {{ message: string, action: string, severity: 'error'|'warning'|'info' }}
 */
export function getActionableError(rawError) {
  if (!rawError) return { message: 'Unknown error', action: 'Check the node config and try again.', severity: 'error' };

  const errorStr = typeof rawError === 'string' ? rawError : String(rawError);

  for (const { pattern, message, action, severity } of ERROR_PATTERNS) {
    if (pattern.test(errorStr)) {
      return { message, action, severity };
    }
  }

  // Fallback — return the raw error with generic advice
  return {
    message: errorStr.length > 100 ? errorStr.slice(0, 100) + '...' : errorStr,
    action: 'Check the node configuration and try again. If the error persists, try a different model.',
    severity: 'error'
  };
}
