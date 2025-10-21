export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  iterator: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length) as any;
  let nextIndex = 0;
  const workers = new Array(Math.max(1, limit)).fill(0).map(async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) break;
      results[i] = await iterator(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

