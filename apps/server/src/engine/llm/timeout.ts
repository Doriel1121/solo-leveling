/**
 * Live providers hang. A tap cannot wait on that. Each attempt is budgeted so
 * failover and the mock fallback still finish inside a single read-beat.
 */
export const LLM_BUDGET_MS = 2800;
export const LLM_FIRST_BYTE_MS = 2200;

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Yields an async string stream, but abandons it if the first token does not
 * arrive in time. Later chunks keep the original iterator; a hung provider is
 * treated as empty so failover can run.
 */
export async function* withFirstByteTimeout(
  source: AsyncIterable<string>,
  ms: number,
  label: string,
): AsyncGenerator<string> {
  const iterator = source[Symbol.asyncIterator]();
  let first: IteratorResult<string>;
  try {
    first = await withTimeout(iterator.next(), ms, label);
  } catch (error) {
    void iterator.return?.();
    throw error;
  }
  if (first.done) return;
  if (first.value) yield first.value;

  while (true) {
    const next = await iterator.next();
    if (next.done) return;
    if (next.value) yield next.value;
  }
}
