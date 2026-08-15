// Coin economy starter values (D5/D6). ALL tunable numbers live here in one place —
// they were set for the first challenge and are expected to be recalibrated with real
// data afterwards. Nothing else in the app should hardcode a coin amount.

export const COINS = {
  /** 签到 reward per day. */
  checkinPerDay: 5,
  /** Count-task check-in reward, per distinct checked-in day. */
  countPerCheckin: 10,
  /**
   * Timer reward tiers (D12, 2026-08-14). Per task per day, a day's total minutes M are
   * split across tiers by minute-band; each tier awards `ceil(portion / blockMinutes)`
   * coins (a STARTED block counts), capped at that tier's `maxCoins`. Bands are
   * (prevUpto, uptoMinutes]. The tier maxes sum to 22 → an inherent per-task-per-day cap.
   *   0–60:  1c / 5min  (max 12)
   *   60–120: 1c / 10min (max 6)
   *   120–180: 1c / 15min (max 4)
   * NOTE: the 22 cap is PER TASK PER DAY, not a daily total — two timer tasks maxed the
   * same day earn 22 each (D12).
   */
  timerTiers: [
    { uptoMinutes: 60, blockMinutes: 5, maxCoins: 12 },
    { uptoMinutes: 120, blockMinutes: 10, maxCoins: 6 },
    { uptoMinutes: 180, blockMinutes: 15, maxCoins: 4 },
  ],
  /** Reward for an individual challenge success (result = 'success'). */
  challengeSuccess: 500,
  /** Cost of a 补签到 (backfilled 签到). */
  backfillCheckinCost: 20,
} as const;
