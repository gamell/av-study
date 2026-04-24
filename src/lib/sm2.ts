export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export interface SM2State {
  repetitions: number;
  easeFactor: number;
  interval: number;
}

export interface SM2Result extends SM2State {
  nextReviewAt: string;
}

/**
 * SM-2 spaced repetition algorithm.
 *
 * Quality scale (simplified to 4 buttons in the UI):
 *   0 = Again  (complete failure)
 *   2 = Hard   (recalled with serious difficulty)
 *   4 = Good   (correct after hesitation)
 *   5 = Easy   (perfect, instant recall)
 */
export function sm2(state: SM2State, quality: Quality): SM2Result {
  let { repetitions, easeFactor, interval } = state;

  // Update ease factor (always, regardless of pass/fail)
  easeFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  if (quality < 3) {
    // Failed: reset to beginning
    repetitions = 0;
    interval = 1;
  } else {
    // Passed
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.ceil(interval * easeFactor);
    }
    repetitions += 1;
  }

  const now = new Date();
  const next = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  return {
    repetitions,
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    nextReviewAt: next.toISOString(),
  };
}

/** Maps the 4-button UI to SM-2 quality scores */
export const QUALITY_MAP = {
  again: 0 as Quality,
  hard: 2 as Quality,
  good: 4 as Quality,
  easy: 5 as Quality,
};
