import assert from "node:assert/strict";
import {
  ECONOMY_THRESHOLDS,
  getRewardEventSuccessRate,
  resolveRewardEvent,
} from "./EconomyManager.js";

assert.equal(getRewardEventSuccessRate(0), 0.35);
assert.equal(getRewardEventSuccessRate(99_999), 0.35);
assert.equal(getRewardEventSuccessRate(100_000), 0.1);
assert.equal(getRewardEventSuccessRate(500_000), 0.1);

assert.equal(resolveRewardEvent(50_000, () => 0.34), true);
assert.equal(resolveRewardEvent(50_000, () => 0.36), false);
assert.equal(resolveRewardEvent(200_000, () => 0.09), true);
assert.equal(resolveRewardEvent(200_000, () => 0.11), false);

assert.throws(() => getRewardEventSuccessRate(-1), RangeError);
assert.throws(() => getRewardEventSuccessRate(NaN), RangeError);

console.log("EconomyManager: all checks passed");
console.log("Thresholds:", ECONOMY_THRESHOLDS);
