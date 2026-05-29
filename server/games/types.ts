/** Sanitized payload returned to clients — never includes raw seeds before reveal */
export type SanitizedGamePayload = Record<string, unknown>;

export type EngineRoundResult = {
  outcome: "win" | "loss" | "push" | "banked";
  payout: number;
  houseProfit: number;
  multiplier?: number;
  seed: string;
  seedHash: string;
  clientPayload: SanitizedGamePayload;
  metadata?: Record<string, unknown>;
};
