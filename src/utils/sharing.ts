import type { MatchSession } from '../types/match';
import { formatDateDisplay } from './dates';
import { calculatePlayerPerformance } from './performanceRating';

export function formatMatchShareText(match: MatchSession): string {
  if (!match.teamA || !match.teamB) {
    return 'CRIC MASTERS - Faculty Cricket Match';
  }

  const dateFormatted = formatDateDisplay(match.date);

  const teamAPlayers = match.teamA.players
    .map(
      (p, idx) =>
        `${idx + 1}. ${p.name}${p.id === match.teamA?.captainId ? ' (C)' : ''}`
    )
    .join('\n');

  const teamBPlayers = match.teamB.players
    .map(
      (p, idx) =>
        `${idx + 1}. ${p.name}${p.id === match.teamB?.captainId ? ' (C)' : ''}`
    )
    .join('\n');

  let text = `🏏 CRIC MASTERS 🏏\n📅 ${dateFormatted}\n\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `⚡ ${match.teamA.name}\n`;
  text += `${teamAPlayers}\n\n`;
  text += `🆚\n\n`;
  text += `⚡ ${match.teamB.name}\n`;
  text += `${teamBPlayers}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;

  if (match.joker) {
    text += `🃏 JOKER: ${match.joker.name}\n`;
  }

  if (match.tossResult) {
    text += `🪙 TOSS RESULT: ${match.tossResult}\n`;
  }

  if (match.scorecard) {
    const sc = match.scorecard;
    if (sc.teamAScore.runs > 0 || sc.teamBScore.runs > 0) {
      text += `\n📊 MATCH SCOREBOARD:\n`;
      text += `${match.teamA.name}: ${sc.teamAScore.runs}/${sc.teamAScore.wickets}\n`;
      text += `${match.teamB.name}: ${sc.teamBScore.runs}/${sc.teamBScore.wickets}\n`;
    }

    const playerStats = Object.values(sc.playerStats || {});
    if (playerStats.length > 0) {
      const topPerformers = playerStats
        .map((s) => ({ ...s, rating: calculatePlayerPerformance(s) }))
        .sort((a, b) => b.rating.impactScore - a.rating.impactScore)
        .slice(0, 3);

      text += `\n🏆 CERTIFIED TOP PERFORMERS:\n`;
      topPerformers.forEach((stat) => {
        const cert = stat.rating.certifications[0] || 'Top Performer';
        text += `• ${stat.playerName}: ${stat.runsScored}r, ${stat.wicketsTaken}w (${cert})\n`;
      });
    }
  }

  if (match.winnerTeamId) {
    const winnerName =
      match.winnerTeamId === 'teamA'
        ? match.teamA.name
        : match.winnerTeamId === 'teamB'
        ? match.teamB.name
        : 'MATCH TIED';
    text += `🏆 WINNER: ${winnerName}\n`;
  }

  text += `\nGenerated with Cric Masters App`;
  return text;
}

export async function shareOrCopyMatch(match: MatchSession): Promise<'shared' | 'copied' | 'failed'> {
  const shareText = formatMatchShareText(match);

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: 'Cric Masters Teams & Scorecard',
        text: shareText,
      });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'failed';
    }
  }

  try {
    await navigator.clipboard.writeText(shareText);
    return 'copied';
  } catch (err) {
    console.error('Copy to clipboard failed:', err);
    return 'failed';
  }
}
