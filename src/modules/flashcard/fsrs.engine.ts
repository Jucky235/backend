// src/services/flashcard/fsrs.engine.ts

import { BoxLevel } from "@prisma/client";

/**
 * FSRS Rating Options matching standard spaced repetition inputs
 */
export enum FSRSRating {
  AGAIN = 1, // Forgot / Completely incorrect
  HARD = 2, // Correct with serious difficulty
  GOOD = 3, // Correct with moderate effort
  EASY = 4, // Mastered / Effortless recall
}

export interface FSRSState {
  stability: number; // Memory stability (in days)
  difficulty: number; // Card difficulty (1.0 - 10.0)
  repetitions: number; // Total successful review count
}

export interface FSRSOutput {
  nextReviewAt: Date;
  intervalDays: number;
  easeFactor: number; // Maps to 'difficulty' for schema compatibility
  repetitions: number;
  box: BoxLevel;
}

// Default FSRS v4 Parameters (Optimized baseline defaults)
const W = [
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05,
  0.34, 1.26, 0.29, 2.61,
];

// Target retention rate (90%)
const REQUESTED_RETENTION = 0.9;

export class FSRSEngine {
  /**
   * Calculates the next review parameters based on current state and user performance rating
   */
  public static calculateNextState(
    currentState: FSRSState,
    rating: FSRSRating,
    now: Date = new Date(),
  ): FSRSOutput {
    const { stability, difficulty, repetitions } = currentState;

    let nextStability: number;
    let nextDifficulty: number;
    let nextReps = repetitions;

    if (repetitions === 0) {
      // First review initialization
      nextStability = this.initStability(rating);
      nextDifficulty = this.initDifficulty(rating);
      nextReps = rating === FSRSRating.AGAIN ? 0 : 1;
    } else {
      // Subsequent review update
      const elapsedDays = Math.max(0.1, stability); // Days since last review
      const retrievability = Math.pow(1 + elapsedDays / (9 * stability), -1);

      nextDifficulty = this.nextDifficulty(difficulty, rating);

      if (rating === FSRSRating.AGAIN) {
        nextStability = this.nextForgetStability(
          nextDifficulty,
          stability,
          retrievability,
        );
        nextReps = 0; // Reset consecutive repetitions count on lapse
      } else {
        nextStability = this.nextRecallStability(
          nextDifficulty,
          stability,
          retrievability,
          rating,
        );
        nextReps += 1;
      }
    }

    // Interval formula: interval = S * 9 * (1/R - 1)
    const rawInterval = nextStability * 9 * (1 / REQUESTED_RETENTION - 1);
    const intervalDays = Math.max(1, Math.round(rawInterval));

    const nextReviewAt = new Date(
      now.getTime() + intervalDays * 24 * 60 * 60 * 1000,
    );
    const box = this.mapIntervalToBox(intervalDays, nextReps);

    return {
      nextReviewAt,
      intervalDays,
      easeFactor: Number(nextDifficulty.toFixed(2)), // Stored in easeFactor field
      repetitions: nextReps,
      box,
    };
  }

  // --- Initializers ---
  private static initStability(rating: FSRSRating): number {
    return Math.max(0.1, W[rating - 1]);
  }

  private static initDifficulty(rating: FSRSRating): number {
    const d = W[4] - (rating - 3) * W[5];
    return Math.min(Math.max(d, 1.0), 10.0);
  }

  // --- State Updates ---
  private static nextDifficulty(d: number, rating: FSRSRating): number {
    const nextD = d - W[6] * (rating - 3);
    const meanReversion = W[7] * (W[4] - d);
    return Math.min(Math.max(nextD + meanReversion, 1.0), 10.0);
  }

  private static nextRecallStability(
    d: number,
    s: number,
    r: number,
    rating: FSRSRating,
  ): number {
    const hardPenalty = rating === FSRSRating.HARD ? W[15] : 1;
    const easyBonus = rating === FSRSRating.EASY ? W[16] : 1;

    const newS =
      s *
      (1 +
        Math.exp(W[8]) *
          (11 - d) *
          Math.pow(s, -W[9]) *
          (Math.exp((1 - r) * W[10]) - 1) *
          hardPenalty *
          easyBonus);

    return Math.max(0.1, newS);
  }

  private static nextForgetStability(d: number, s: number, r: number): number {
    const newS =
      W[11] *
      Math.pow(d, -W[12]) *
      (Math.pow(s + 1, W[13]) - 1) *
      Math.exp((1 - r) * W[14]);

    return Math.min(s, Math.max(0.1, newS));
  }

  /**
   * Maps calculated FSRS intervals to your Prisma schema's BoxLevel Enum
   */
  private static mapIntervalToBox(
    intervalDays: number,
    repetitions: number,
  ): BoxLevel {
    if (repetitions === 0) return BoxLevel.BOX_1;
    if (intervalDays < 2) return BoxLevel.BOX_1;
    if (intervalDays < 4) return BoxLevel.BOX_2;
    if (intervalDays < 7) return BoxLevel.BOX_3;
    if (intervalDays < 15) return BoxLevel.BOX_4;
    if (intervalDays < 30) return BoxLevel.BOX_5;
    if (intervalDays < 60) return BoxLevel.BOX_6;
    return BoxLevel.BOX_7; // Fully mastered / long-term interval
  }
}
