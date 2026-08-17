import type { MatchSession } from '../types/match';
import type { Player } from '../types/player';

export function calculateRepetitionPenalty(
  candidateTeam1: Player[],
  candidateTeam2: Player[],
  history: MatchSession[],
  windowSize: number = 5
): number {
  if (!history || history.length === 0) return 0;

  const recentMatches = history
    .filter((m) => m.teamA && m.teamB)
    .slice(-windowSize);

  if (recentMatches.length === 0) return 0;

  let totalPenalty = 0;

  for (const match of recentMatches) {
    if (!match.teamA || !match.teamB) continue;

    const histTeamAIds = new Set(match.teamA.players.map((p) => p.id));
    const histTeamBIds = new Set(match.teamB.players.map((p) => p.id));

    const cand1Ids = candidateTeam1.map((p) => p.id);
    const cand2Ids = candidateTeam2.map((p) => p.id);

    const overlap1A = cand1Ids.filter((id) => histTeamAIds.has(id)).length;
    const overlap1B = cand1Ids.filter((id) => histTeamBIds.has(id)).length;

    const overlap2A = cand2Ids.filter((id) => histTeamAIds.has(id)).length;
    const overlap2B = cand2Ids.filter((id) => histTeamBIds.has(id)).length;

    const maxOverlap = Math.max(overlap1A, overlap1B, overlap2A, overlap2B);
    if (maxOverlap >= 3) {
      totalPenalty += Math.pow(maxOverlap, 2) * 2;
    }
  }

  return totalPenalty;
}
