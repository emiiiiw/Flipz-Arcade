/**
 * Dynamic Probability Engine — scales reward-event success inversely with stake size
 * to limit inflation at high input levels.
 */

/** @readonly */
export const ECONOMY_THRESHOLDS = Object.freeze({
  HIGH_VALUE_CUTOFF: 100_000,
  RATE_BELOW_CUTOFF: 0.35,
  RATE_AT_OR_ABOVE_CUTOFF: 0.1,
});

/**
 * @param {number} inputValue — stake / exposure for this reward event
 * @returns {number} success probability in [0, 1]
 */
export function getRewardEventSuccessRate(inputValue) {
  const value = Number(inputValue);
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError("inputValue must be a finite non-negative number");
  }
  return value < ECONOMY_THRESHOLDS.HIGH_VALUE_CUTOFF
    ? ECONOMY_THRESHOLDS.RATE_BELOW_CUTOFF
    : ECONOMY_THRESHOLDS.RATE_AT_OR_ABOVE_CUTOFF;
}

/**
 * @param {number} inputValue
 * @param {() => number} [rng] — returns uniform [0, 1); inject for tests
 * @returns {boolean} true if the reward event succeeds
 */
export function resolveRewardEvent(inputValue, rng = Math.random) {
  if (typeof rng !== "function") {
    throw new TypeError("rng must be a function");
  }
  const rate = getRewardEventSuccessRate(inputValue);
  return rng() < rate;
}

/** @deprecated Use resolveRewardEvent — alias for legacy callers */
export const calculateRewardEventSuccess = resolveRewardEvent;
