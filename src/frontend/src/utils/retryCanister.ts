/**
 * Retries a canister call with exponential backoff.
 * Handles IC0508 (canister stopped), network errors, and any rejection.
 * Max 10 retries with delays up to 30s.
 */
export async function withCanisterRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 10,
  onRetry?: (attempt: number, total: number) => void,
): Promise<T> {
  const delays = [
    3000, 6000, 10000, 15000, 20000, 25000, 30000, 30000, 30000, 30000,
  ];
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) {
        onRetry?.(attempt + 1, maxRetries);
        const delayMs = delays[attempt] ?? 30000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}
