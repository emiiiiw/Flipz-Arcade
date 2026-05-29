import crypto from "crypto";

export const FLEECA_PAYMENT_URL = "https://banking.gta.world/api/v2/payment";
export const FLEECA_TRANSFERS_URL = "https://banking.gta.world/api/v2/transfers";

export class FleecaApiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "FleecaApiError";
  }
}

export function fleecaAuthHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.FLEECA_API_KEY ?? ""}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function fleecaMessageFromErrorBody(data: unknown): string {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const m = o.message ?? o.error ?? o.detail;
    if (typeof m === "string" && m.trim()) return m;
    if (Array.isArray(o.errors)) return JSON.stringify(o.errors);
  }
  if (typeof data === "string" && data.trim()) return data;
  try {
    return JSON.stringify(data);
  } catch {
    return "Unknown Fleeca error";
  }
}

function isFleecaMockMode(): boolean {
  return !process.env.FLEECA_API_KEY?.trim();
}

export type FleecaPaymentResponse = {
  payment_id?: string;
  payment_link?: string;
  id?: string;
  url?: string;
};

/**
 * POST /v2/payment — returns on HTTP 201 with payment_id + payment_link.
 * Throws FleecaApiError with API message on failure.
 */
export async function postFleecaPayment(body: Record<string, unknown>): Promise<{
  paymentId: string;
  paymentLink: string;
}> {
  if (isFleecaMockMode()) {
    const amount = Number(body.amount) || 0;
    const paymentId = `mock_${crypto.randomUUID()}`;
    const paymentLink = `${process.env.BASE_URL ?? "http://localhost:3000"}/api/mock-fleeca-pay?payment_id=${encodeURIComponent(
      paymentId,
    )}&amount=${encodeURIComponent(String(amount))}`;
    return { paymentId, paymentLink };
  }

  let res: Response;
  try {
    res = await fetch(FLEECA_PAYMENT_URL, {
      method: "POST",
      headers: fleecaAuthHeaders(),
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Fleeca] POST /v2/payment network error", e);
    throw new FleecaApiError(msg, 0, null);
  }

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  console.log("[Fleeca] POST /v2/payment", { status: res.status, body: data });

  if ((res.status === 201 || res.status === 200) && res.ok) {
    const d = data as FleecaPaymentResponse;
    const paymentId = String(d.payment_id ?? d.id ?? "");
    const paymentLink = String(d.payment_link ?? d.url ?? "");
    if (!paymentId || !paymentLink) {
      throw new FleecaApiError(
        "Fleeca response missing payment_id or payment_link",
        res.status,
        data,
      );
    }
    return { paymentId, paymentLink };
  }

  throw new FleecaApiError(fleecaMessageFromErrorBody(data), res.status, data);
}

/** @deprecated Prefer postFleecaPayment — kept for call sites using the old name */
export async function createPayment(body: {
  amount: number;
  mode: number;
  description: string;
  redirect_url?: string;
}): Promise<{ paymentId: string; paymentLink: string }> {
  const payload: Record<string, unknown> = {
    amount: body.amount,
    mode: body.mode,
    description: body.description,
  };
  if (body.redirect_url) payload.redirect_url = body.redirect_url;
  return postFleecaPayment(payload);
}

export type TransferRecipient = {
  routing: string;
  amount: number;
  description: string;
};

/**
 * POST /v2/transfers
 */
export async function postFleecaTransfers(
  recipients: TransferRecipient[],
): Promise<{ transferId: string; raw: unknown }> {
  if (isFleecaMockMode()) {
    return { transferId: `mock_xfer_${crypto.randomUUID()}`, raw: {} };
  }

  let res: Response;
  try {
    res = await fetch(FLEECA_TRANSFERS_URL, {
      method: "POST",
      headers: fleecaAuthHeaders(),
      body: JSON.stringify({ recipients }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Fleeca] POST /v2/transfers network error", e);
    throw new FleecaApiError(msg, 0, null);
  }

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  console.log("[Fleeca] POST /v2/transfers", { status: res.status, body: data });

  if (res.ok) {
    const d = data as { id?: string; transfer_id?: string };
    const transferId = String(d.transfer_id ?? d.id ?? `xfer_${crypto.randomUUID()}`);
    return { transferId, raw: data };
  }

  throw new FleecaApiError(fleecaMessageFromErrorBody(data), res.status, data);
}

export async function createTransfers(
  recipients: TransferRecipient[],
): Promise<{ transferId: string }> {
  const { transferId } = await postFleecaTransfers(recipients);
  return { transferId };
}
