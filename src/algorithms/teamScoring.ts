import type { Player } from '../types/player';
import type { TeamRoleSummary } from '../types/team';

export function isPaceBowler(player: Player): boolean {
  return (
    player.roles.some((r) => r === 'Pace Bowler' || r === 'Medium Pacer' || r === 'Strike Bowler') ||
    !!player.isStrikeBowler
  );
}

export function isSpinBowler(player: Player): boolean {
  return player.roles.some((r) => r === 'Spinner' || r === 'Leg Spinner');
}

export function isAllRounder(player: Player): boolean {
  return player.roles.includes('All-rounder');
}

export function isBatsman(player: Player): boolean {
  return (
    player.roles.includes('Batsman') ||
    player.roles.includes('Power Batter') ||
    player.roles.includes('All-rounder') ||
    !!player.isTopBatter
  );
}

export function isStrikeBowler(player: Player): boolean {
  return (
    !!player.isStrikeBowler ||
    player.roles.includes('Strike Bowler') ||
    (player.roles.includes('Pace Bowler') && player.roles.includes('All-rounder'))
  );
}

export function isTopBatter(player: Player): boolean {
  return (
    !!player.isTopBatter ||
    player.roles.includes('Power Batter') ||
    (player.roles.includes('Batsman') && player.roles.includes('Pace Bowler'))
  );
}

export function calculateTeamRoleSummary(players: Player[]): TeamRoleSummary {
  let paceCount = 0;
  let spinCount = 0;
  let allRounderCount = 0;
  let batsmanCount = 0;
  let strikeBowlerCount = 0;
  let topBatterCount = 0;

  for (const player of players) {
    if (isPaceBowler(player)) paceCount++;
    if (isSpinBowler(player)) spinCount++;
    if (isAllRounder(player)) allRounderCount++;
    if (isBatsman(player)) batsmanCount++;
    if (isStrikeBowler(player)) strikeBowlerCount++;
    if (isTopBatter(player)) topBatterCount++;
  }

  const strengthScore =
    strikeBowlerCount * 3.5 +
    paceCount * 2.5 +
    spinCount * 2.5 +
    topBatterCount * 3.5 +
    allRounderCount * 3.0 +
    batsmanCount * 1.5 +
    players.length * 1.0;

  return {
    paceCount,
    spinCount,
    allRounderCount,
    batsmanCount,
    strikeBowlerCount,
    topBatterCount,
    totalPlayers: players.length,
    strengthScore,
  };
}

export function calculateBalanceScore(
  summaryA: TeamRoleSummary,
  summaryB: TeamRoleSummary
): number {
  const sizeDiff = Math.abs(summaryA.totalPlayers - summaryB.totalPlayers);
  const strikeDiff = Math.abs((summaryA.strikeBowlerCount || 0) - (summaryB.strikeBowlerCount || 0));
  const topBatterDiff = Math.abs((summaryA.topBatterCount || 0) - (summaryB.topBatterCount || 0));
  const paceDiff = Math.abs(summaryA.paceCount - summaryB.paceCount);
  const spinDiff = Math.abs(summaryA.spinCount - summaryB.spinCount);
  const allRounderDiff = Math.abs(summaryA.allRounderCount - summaryB.allRounderCount);
  const batsmanDiff = Math.abs(summaryA.batsmanCount - summaryB.batsmanCount);
  const strengthDiff = Math.abs(summaryA.strengthScore - summaryB.strengthScore);

  const totalPenalty =
    sizeDiff * 30 +
    strikeDiff * 25 +
    topBatterDiff * 25 +
    paceDiff * 15 +
    spinDiff * 15 +
    allRounderDiff * 10 +
    batsmanDiff * 6 +
    strengthDiff * 5;

  return Math.max(0, Math.round(100 - totalPenalty));
}
