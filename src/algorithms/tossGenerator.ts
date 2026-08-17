import type { TossOutcome, TossRecord } from '../types/match';

export function flipCoin(
  tossHistory: TossRecord[] = [],
  maxStreak: number = 2
): TossOutcome {
  let isHeads = false;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(1);
    window.crypto.getRandomValues(array);
    isHeads = array[0] % 2 === 0;
  } else {
    isHeads = Math.random() >= 0.5;
  }

  let candidate: TossOutcome = isHeads ? 'HEADS' : 'TAILS';

  if (tossHistory.length >= maxStreak) {
    const recent = tossHistory.slice(-maxStreak);
    const allSame = recent.every((t) => t.outcome === recent[0].outcome);
    if (allSame && candidate === recent[0].outcome) {
      candidate = candidate === 'HEADS' ? 'TAILS' : 'HEADS';
    }
  }

  return candidate;
}
