/** GET a JSON endpoint for a query. Throws `failure` when the response is not ok. */
export async function fetchJson<T>(
  url: string,
  failure: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(failure);
  return (await response.json()) as T;
}
