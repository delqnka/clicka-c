export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry when response signals rate limit or transient server error. */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { attempts?: number; baseDelayMs?: number },
): Promise<Response> {
  const attempts = Math.max(1, options?.attempts ?? 4);
  const baseDelayMs = options?.baseDelayMs ?? 500;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await fetch(input, init);
    lastResponse = response;
    if (response.status !== 429 && response.status !== 503) {
      return response;
    }
    if (attempt === attempts - 1) return response;

    const retryAfterHeader = Number(response.headers.get('retry-after'));
    const delayMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
      ? retryAfterHeader * 1000
      : baseDelayMs * (attempt + 1);
    await sleep(delayMs);
  }

  return lastResponse!;
}
