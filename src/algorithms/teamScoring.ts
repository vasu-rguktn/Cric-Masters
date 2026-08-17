import type { Player } from '../types/player';
import type { TeamRoleSummary } from '../types/team';

export function isPaceBowler(player: Player): boolean {
  return player.roles.some((r) => r === 'Pace Bowler' || r === 'Medium Pacer');
}

export function isSpinBowler(player: Player): boolean {
  return player.roles.some((r) => r === 'Spinner' || r === 'Leg Spinner');
}

export function isAllRounder(player: Player): boolean {
  return player.roles.includes('All-rounder');
}

export function isBatsman(player: Player): boolean {
  return player.roles.includes('Batsman') || player.roles.includes('All-rounder');
}

export function calculateTeamRoleSummary(players: Player[]): TeamRoleSummary {
  let paceCount = 0;
  let spinCount = 0;
  let allRounderCount = 0;
  let batsmanCount = 0;

  for (const player of players) {
    if (isPaceBowler(player)) paceCount++;
    if (isSpinBowler(player)) spinCount++;
    if (isAllRounder(player)) allRounderCount++;
    if (isBatsman(player)) batsmanCount++;
  }

  const strengthScore =
    paceCount * 2.5 +
    spinCount * 2.5 +
    allRounderCount * 3.0 +
    batsmanCount * 1.5 +
    players.length * 1.0;

  return {
    paceCount,
    spinCount,
    allRounderCount,
    batsmanCount,
    totalPlayers: players.length,
    strengthScore,
  };
}

export function calculateBalanceScore(
  summaryA: TeamRoleSummary,
  summaryB: TeamRoleSummary
): number {
  const sizeDiff = Math.abs(summaryA.totalPlayers - summaryB.totalPlayers);
  const strengthDiff = Math.abs(summaryA.strengthScore - summaryB.strengthScore);
  const paceDiff = Math.abs(summaryA.paceCount - summaryB.paceCount);
  const spinDiff = Math.abs(summaryA.spinCount - summaryB.spinCount);
  const allRounderDiff = Math.abs(summaryA.allRounderCount - summaryB.allRounderCount);
  const batsmanDiff = Math.abs(summaryA.batsmanCount - summaryB.batsmanCount);

  const totalPenalty =
    sizeDiff * 25 +
    strengthDiff * 8 +
    paceDiff * 12 +
    spinDiff * 12 +
    allRounderDiff * 10 +
    batsmanDiff * 6;

  return Math.max(0, Math.round(100 - totalPenalty));
}
