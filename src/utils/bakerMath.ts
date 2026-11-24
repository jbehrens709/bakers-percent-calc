/**
 * Baker's Percentage & Dough Hydration Calculator
 * Pure calculation logic — no side effects, no DOM access.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeightsInput {
  flourGrams: number;
  waterGrams: number;
  saltGrams: number;
  starterGrams?: number;
  starterHydrationPercent?: number;
  oilGrams?: number;
}

export interface WeightsResult {
  totalFlourGrams: number;
  totalWaterGrams: number;
  totalDoughWeightGrams: number;
  apparentHydrationPercent: number;
  trueHydrationPercent: number;
  flourPercent: number;
  waterPercent: number;
  saltPercent: number;
  starterPercent: number;
  oilPercent: number;
  starterFlourGrams: number;
  starterWaterGrams: number;
}

export type TargetMode = 'flour' | 'totalDough';

export interface PercentagesInput {
  targetMode: TargetMode;
  targetWeightGrams: number;
  waterPercent: number;
  saltPercent: number;
  starterPercent?: number;
  starterHydrationPercent?: number;
  oilPercent?: number;
}

export interface PercentagesResult {
  flourGrams: number;
  waterGrams: number;
  saltGrams: number;
  starterGrams: number;
  oilGrams: number;
  totalFlourGrams: number;
  totalWaterGrams: number;
  totalDoughWeightGrams: number;
  trueHydrationPercent: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Coerce any input to a finite, non-negative number.
 * Returns 0 for NaN, Infinity, -Infinity, negative values, or non-numeric input.
 */
function sanitize(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return fallback;
  }
  return n;
}

/**
 * Division that never returns NaN or Infinity.
 * Returns 0 when the denominator is 0 or non-finite.
 */
function safeDivide(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : 0;
}

/**
 * Round a number to a given number of decimal places (default 2).
 * Returns 0 for non-finite input.
 */
export function roundTo(value: number, decimals = 2): number {
  const n = sanitize(value);
  const factor = Math.pow(10, Math.max(0, Math.floor(decimals)));
  const rounded = Math.round(n * factor) / factor;
  return Number.isFinite(rounded) ? rounded : 0;
}



// ---------------------------------------------------------------------------
// Grams -> Baker's Percentages & Hydration
// ---------------------------------------------------------------------------

/**
 * Convert ingredient weights (grams) into baker's percentages and hydration.
 *
 * Baker's percentages are expressed relative to **base flour** (100%).
 * Starter is decomposed into its flour and water components, which are
 * included in the true hydration calculation.
 */
export function calculateFromWeights(input: WeightsInput): WeightsResult {
  const flourGrams = sanitize(input.flourGrams);
  const waterGrams = sanitize(input.waterGrams);
  const saltGrams = sanitize(input.saltGrams);
  const starterGrams = sanitize(input.starterGrams ?? 0);
  const starterHydrationPercent = sanitize(input.starterHydrationPercent ?? 100, 100);
  const oilGrams = sanitize(input.oilGrams ?? 0);

  // Decompose starter into flour and water.
  const starterFlourGrams = safeDivide(starterGrams, 1 + starterHydrationPercent / 100);
  const starterWaterGrams = Math.max(0, starterGrams - starterFlourGrams);

  // Totals.
  const totalFlourGrams = flourGrams + starterFlourGrams;
  const totalWaterGrams = waterGrams + starterWaterGrams;
  const totalDoughWeightGrams = flourGrams + waterGrams + saltGrams + starterGrams + oilGrams;

  // Hydration percentages.
  const apparentHydrationPercent = safeDivide(waterGrams, flourGrams) * 100;
  const trueHydrationPercent = safeDivide(totalWaterGrams, totalFlourGrams) * 100;

  // Baker's percentages relative to base flour (100% baseline).
  const flourPercent = flourGrams > 0 ? 100 : 0;
  const waterPercent = safeDivide(waterGrams, flourGrams) * 100;
  const saltPercent = safeDivide(saltGrams, flourGrams) * 100;
  const starterPercent = safeDivide(starterGrams, flourGrams) * 100;
  const oilPercent = safeDivide(oilGrams, flourGrams) * 100;

  return {
    totalFlourGrams: roundTo(totalFlourGrams),
    totalWaterGrams: roundTo(totalWaterGrams),
    totalDoughWeightGrams: roundTo(totalDoughWeightGrams),
    apparentHydrationPercent: roundTo(apparentHydrationPercent),
    trueHydrationPercent: roundTo(trueHydrationPercent),
    flourPercent: roundTo(flourPercent),
    waterPercent: roundTo(waterPercent),
    saltPercent: roundTo(saltPercent),
    starterPercent: roundTo(starterPercent),
    oilPercent: roundTo(oilPercent),
    starterFlourGrams: roundTo(starterFlourGrams),
    starterWaterGrams: roundTo(starterWaterGrams),
  };
}


// ---------------------------------------------------------------------------
// Baker's Percentages + Target Weight -> Grams
// ---------------------------------------------------------------------------

/**
 * Convert baker's percentages and a target weight into exact gram weights.
 *
 * - `targetMode: 'flour'` — `targetWeightGrams` is the base flour weight.
 * - `targetMode: 'totalDough'` — `targetWeightGrams` is the total dough
 *   weight; base flour is solved as
 *   `targetWeightGrams / (1 + (water + salt + starter + oil) / 100)`.
 */
export function calculateFromPercentages(input: PercentagesInput): PercentagesResult {
  const targetMode: TargetMode = input.targetMode === 'totalDough' ? 'totalDough' : 'flour';
  const targetWeightGrams = sanitize(input.targetWeightGrams);
  const waterPercent = sanitize(input.waterPercent);
  const saltPercent = sanitize(input.saltPercent);
  const starterPercent = sanitize(input.starterPercent ?? 0);
  const starterHydrationPercent = sanitize(input.starterHydrationPercent ?? 100, 100);
  const oilPercent = sanitize(input.oilPercent ?? 0);

  // Solve for base flour grams.
  let flourGrams: number;
  if (targetMode === 'totalDough') {
    const totalPercent = waterPercent + saltPercent + starterPercent + oilPercent;
    const denominator = 1 + totalPercent / 100;
    flourGrams = safeDivide(targetWeightGrams, denominator);
  } else {
    flourGrams = targetWeightGrams;
  }

  // Exact gram weights for each ingredient.
  const waterGrams = (flourGrams * waterPercent) / 100;
  const saltGrams = (flourGrams * saltPercent) / 100;
  const starterGrams = (flourGrams * starterPercent) / 100;
  const oilGrams = (flourGrams * oilPercent) / 100;

  // Decompose starter into flour and water for true hydration.
  const starterFlourGrams = safeDivide(starterGrams, 1 + starterHydrationPercent / 100);
  const starterWaterGrams = Math.max(0, starterGrams - starterFlourGrams);

  // Totals.
  const totalFlourGrams = flourGrams + starterFlourGrams;
  const totalWaterGrams = waterGrams + starterWaterGrams;
  const totalDoughWeightGrams = flourGrams + waterGrams + saltGrams + starterGrams + oilGrams;

  // True hydration.
  const trueHydrationPercent = safeDivide(totalWaterGrams, totalFlourGrams) * 100;

  return {
    flourGrams: roundTo(flourGrams),
    waterGrams: roundTo(waterGrams),
    saltGrams: roundTo(saltGrams),
    starterGrams: roundTo(starterGrams),
    oilGrams: roundTo(oilGrams),
    totalFlourGrams: roundTo(totalFlourGrams),
    totalWaterGrams: roundTo(totalWaterGrams),
    totalDoughWeightGrams: roundTo(totalDoughWeightGrams),
    trueHydrationPercent: roundTo(trueHydrationPercent),
  };
}
