// db/resilientFetch.js

const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch wrapper with timeout and exponential backoff retry logic per lab spec.
 * - Enforces timeout via AbortSignal.timeout(timeoutMs)
 * - Retries at most 2 times for 5xx and 429
 * - Exponential backoff delays (e.g. 200ms, then 400ms)
 * - Honors Retry-After headers for 429 rate limits
 * - NEVER retries unsafe writes (POST, PUT, DELETE) or 4xx client errors (400, 401, 404)
 */
async function fetchWithRetry(url, options = {}, config = {}) {
  const { timeoutMs = 1500, retries = 2, delayMs = 200 } = config;
  const method = (options.method || 'GET').toUpperCase();
  const maxRetries = method === 'GET' ? retries : 0; // Never retry writes per lab rubric

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let wait = delayMs * (2 ** attempt); // 200ms, then 400ms

    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs), // Part B: Timeout after 1.5s
      });

      // If response is successful, or it's a 4xx (client error), or we ran out of retries, return it
      if (!RETRY_STATUSES.has(res.status) || attempt >= maxRetries) {
        return res;
      }

      // If rate limited by partner (429), respect their Retry-After header
      const retryAfter = Number(res.headers.get('Retry-After'));
      if (res.status === 429 && retryAfter > 0) {
        wait = Math.min(retryAfter * 1000, 5000); // Wait as asked, up to 5s max
      }

      console.warn(`[resilientFetch] Attempt ${attempt + 1} returned ${res.status}, retrying in ${wait}ms...`);
    } catch (err) {
      if (attempt >= maxRetries) throw err; // Out of retries, bubble up error
      const reason = err.name === 'TimeoutError' ? 'timeout' : (err.cause?.code || err.message);
      console.warn(`[resilientFetch] Attempt ${attempt + 1} failed (${reason}), retrying in ${wait}ms...`);
    }

    await sleep(wait);
  }
}

module.exports = { fetchWithRetry };