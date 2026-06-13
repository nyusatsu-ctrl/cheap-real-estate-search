export async function waitForRateLimit(source) {
  const delayMs = Number(source.rateLimitMs ?? source.rate_limit_ms ?? 0);
  if (!Number.isFinite(delayMs) || delayMs <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
