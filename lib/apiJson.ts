import { NextResponse } from "next/server";

/** Every API route should return JSON via these helpers — never an empty body. */
export function apiSuccess(
  data: Record<string, unknown> = {},
  status = 200,
): NextResponse {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function apiError(
  error: string,
  status = 400,
  extra: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json({ success: false, error, ...extra }, { status });
}

export async function parseJsonBody<T extends Record<string, unknown>>(
  req: Request,
): Promise<{ ok: true; body: T } | { ok: false; response: NextResponse }> {
  try {
    const text = await req.text();
    if (!text.trim()) {
      return {
        ok: false,
        response: apiError("Request body required", 400),
      };
    }
    const body = JSON.parse(text) as T;
    return { ok: true, body };
  } catch {
    return {
      ok: false,
      response: apiError("Invalid JSON body", 400),
    };
  }
}
