// Coin economy starter values (D5/D6). ALL tunable numbers live here in one place —
// they were set for the first challenge and are expected to be recalibrated with real
// data afterwards. Nothing else in the app should hardcode a coin amount.

export const COINS = {
  /** 签到 reward per day. */
  checkinPerDay: 5,
  /** Count-task check-in reward, per distinct checked-in day. */
  countPerCheckin: 10,
  /** Timer reward per whole 10-minute block, per task per day. */
  timerPerBlock: 2,
  /** Timer block size in minutes (2 coins per this many minutes). */
  timerBlockMinutes: 10,
  /** Timer minutes counted for coins are capped at this per task per day. */
  timerDailyCapMinutes: 60,
  /** Reward for an individual challenge success (result = 'success'). */
  challengeSuccess: 500,
  /** Cost of a 补签到 (backfilled 签到). */
  backfillCheckinCost: 20,
} as const;
