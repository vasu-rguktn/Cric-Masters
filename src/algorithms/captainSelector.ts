import type { Player } from '../types/player';
import type { Team } from '../types/team';
import type { MatchSession } from '../types/match';

export function selectCaptains(
  teamAPlayers: Player[],
  teamBPlayers: Player[],
  history: MatchSession[] = []
): { captainA: Player; captainB: Player } {
  const getRecentCaptainCounts = (): Map<string, number> => {
    const counts = new Map<string, number>();
    const recent = history.slice(-5);
    for (const match of recent) {
      if (match.teamA?.captainId) {
        counts.set(match.teamA.captainId, (counts.get(match.teamA.captainId) || 0) + 1);
      }
      if (match.teamB?.captainId) {
        counts.set(match.teamB.captainId, (counts.get(match.teamB.captainId) || 0) + 1);
      }
    }
    return counts;
  };

  const recentCounts = getRecentCaptainCounts();

  const scoreCaptainCandidate = (player: Player): number => {
    let score = 0;
    if (player.isRegular) score += 10;
    if (player.roles.includes('All-rounder')) score += 5;
    if (player.roles.includes('Pace Bowler')) score += 3;
    if (player.roles.includes('Spinner') || player.roles.includes('Leg Spinner')) score += 3;

    const recentTimes = recentCounts.get(player.id) || 0;
    score -= recentTimes * 8;
    return score;
  };

  const sortedA = [...teamAPlayers].sort((a, b) => scoreCaptainCandidate(b) - scoreCaptainCandidate(a));
  const sortedB = [...teamBPlayers].sort((a, b) => scoreCaptainCandidate(b) - scoreCaptainCandidate(a));

  return {
    captainA: sortedA[0] || teamAPlayers[0],
    captainB: sortedB[0] || teamBPlayers[0],
  };
}

export function getCaptainReplacementCandidates(
  team: Team
): Player[] {
  const candidates = team.players.filter((p) => p.id !== team.captainId);
  return candidates.sort((a, b) => {
    const scoreA = (a.isRegular ? 5 : 0) + a.roles.length;
    const scoreB = (b.isRegular ? 5 : 0) + b.roles.length;
    return scoreB - scoreA;
  });
}

export function replaceCaptainInTeam(
  team: Team,
  newCaptainId: string
): Team {
  const newCaptain = team.players.find((p) => p.id === newCaptainId);
  if (!newCaptain) return team;

  const dynamicName = `${newCaptain.name.toUpperCase()}'S TEAM`;

  return {
    ...team,
    captainId: newCaptain.id,
    captainName: newCaptain.name,
    name: dynamicName,
  };
}
