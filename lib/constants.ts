/** All amounts are whole Fleeca dollars (integer). */

export const VERIFY_AMOUNT = 25_000;
/** Total balance return on a winning coin flip (stake included). */
export const COINFLIP_WIN_RETURN_MULT = 1.4;
export const MIN_BET = 20_000;
export const MAX_BET = 500_000;
export const CROSSY_MAX_BET = 200_000;
export const DEPOSIT_MIN = 20_000;
export const DEPOSIT_MAX = 500_000;

/** Gross cashout request must be at least this; net to bank = gross − fee. */
export const MIN_CASHOUT_GROSS = 20_000;
/** Flat fee taken from the requested gross amount (disclosed in UI / house rules). */
export const CASHOUT_FEE_FLAT = 10_000;

export const CROSSY_WIN_MULT = 2.0;

/** Higher/Lower: cumulative bank multipliers after each winning guess (×1.45 steps, 2.8× cap). */
export const HIGHER_LOWER_CHAIN_PAYOUTS = [1.45, 2.1025, 2.8, 2.8] as const;

/** @deprecated Use HIGHER_LOWER_CHAIN_PAYOUTS — alias for API routes */
export const CHAIN_PAYOUTS = HIGHER_LOWER_CHAIN_PAYOUTS;
