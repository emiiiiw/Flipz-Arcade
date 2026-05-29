/**
 * Safe JSON parse for fetch responses — avoids "Unexpected end of JSON input".
 */
export async function safeJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text };
  }
}

export function errorMessageFromBody(
  data: unknown,
  fallback: string,
): string {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (typeof o.error === "string" && o.error) return o.error;
    if (typeof o.message === "string" && o.message) return o.message;
  }
  if (typeof data === "string" && data) return data;
  return fallback;
}

export function isSuccessBody(data: unknown): boolean {
  return (
    data !== null &&
    typeof data === "object" &&
    (data as Record<string, unknown>).success === true
  );
}
