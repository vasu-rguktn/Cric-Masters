import type { MatchSession } from '../types/match';
import { formatDateDisplay } from './dates';
import { calculatePlayerPerformance } from './performanceRating';
import { getAppSettings } from '../services/storageService';

export function getShortMatchUrl(match?: MatchSession): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    const origin = window.location.origin;
    const pathname = window.location.pathname.replace(/\/$/, '');
    const base = `${origin}${pathname}/`;
    if (match?.date) {
      return `${base}?d=${match.date}`;
    }
    return base;
  }
  return match?.date
    ? `https://vasu-rguktn.github.io/Cric-Masters/?d=${match.date}`
    : 'https://vasu-rguktn.github.io/Cric-Masters/';
}

export function encodeMatchToUrl(match: MatchSession): string {
  try {
    const compactPayload = {
      id: match.id,
      d: match.date,
      m: match.matchNumber || 1,
      p: match.availablePlayerIds,
      ta: match.teamA,
      tb: match.teamB,
      j: match.joker,
      l: match.limitations,
      lk: match.isLocked,
      tr: match.tossResult,
      w: match.winnerTeamId,
      sc: match.scorecard,
    };
    const jsonString = JSON.stringify(compactPayload);
    const base64 = btoa(encodeURIComponent(jsonString));
    const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
    return `${baseUrl}?m=${base64}`;
  } catch (e) {
    console.error('Failed to encode match to URL:', e);
    return '';
  }
}

export function decodeMatchFromUrl(urlParam: string): MatchSession | null {
  try {
    const jsonString = decodeURIComponent(atob(urlParam));
    const raw = JSON.parse(jsonString);
    if (!raw.ta || !raw.tb) return null;

    const match: MatchSession = {
      id: raw.id || `match-${Date.now()}`,
      date: raw.d || new Date().toISOString().slice(0, 10),
      matchNumber: raw.m || 1,
      availablePlayerIds: raw.p || [],
      teamA: raw.ta || null,
      teamB: raw.tb || null,
      joker: raw.j || null,
      limitations: raw.l || [],
      isLocked: !!raw.lk,
      tossResult: raw.tr || null,
      winnerTeamId: raw.w || null,
      scorecard: raw.sc || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return match;
  } catch (e) {
    console.error('Failed to decode match from URL parameter:', e);
    return null;
  }
}

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

  const settings = getAppSettings();
  const linkFormat = settings.shareLinkFormat || 'short';

  if (linkFormat === 'short') {
    const shortLink = getShortMatchUrl(match);
    text += `\n📲 Match Link: ${shortLink}\n`;
  } else if (linkFormat === 'full') {
    const directLink = encodeMatchToUrl(match);
    if (directLink) {
      text += `\n🔗 OPEN TEAMS ON LAPTOP / OTHER DEVICE:\n${directLink}\n`;
    }
  }

  text += `\nGenerated with Cric Masters App`;
  return text;
}

export async function copyMatchDirectLink(match: MatchSession, fullData: boolean = false): Promise<boolean> {
  const link = fullData ? encodeMatchToUrl(match) : getShortMatchUrl(match);
  if (!link) return false;
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    return false;
  }
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
