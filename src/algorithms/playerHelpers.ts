import type { Player } from '../types/player';

export function isVasu(player: Player): boolean {
  const name = player.name.toLowerCase().trim();
  return player.id === 'p-vasu' || name === 'vasu' || name.startsWith('vasu ') || name.includes('vasu');
}

export function isSrinivas(player: Player): boolean {
  const name = player.name.toLowerCase().trim();
  return player.id === 'p-srinivas' || name.includes('srinivas') || name.includes('srinu');
}

export function isShiva(player: Player): boolean {
  const name = player.name.toLowerCase().trim();
  return player.id === 'p-shiva' || name.includes('shiva') || name.includes('siva');
}

export function isRK(player: Player): boolean {
  const name = player.name.toLowerCase().trim();
  return player.id === 'p-rk' || name === 'rk' || name.startsWith('rk ') || name.includes('rk sir');
}

export function isLK(player: Player): boolean {
  const name = player.name.toLowerCase().trim();
  return (
    player.id === 'p-lk' ||
    name === 'lk' ||
    name.startsWith('lk ') ||
    name === 'l.k.' ||
    name.startsWith('l.k. ') ||
    name.includes('lk sir')
  );
}

export function isAnurupam(player: Player): boolean {
  const name = player.name.toLowerCase().trim();
  return player.id === 'p-anurupam' || name.includes('anurupam');
}

export function isSuresh(player: Player): boolean {
  const name = player.name.toLowerCase().trim();
  return player.id === 'p-suresh' || name.includes('suresh');
}

export function isKrishna(player: Player): boolean {
  const name = player.name.toLowerCase().trim();
  return player.id === 'p-krishna' || name.includes('krishna');
}

export function isVinod(player: Player): boolean {
  const name = player.name.toLowerCase().trim();
  return player.id === 'p-vinod' || name.includes('vinod') || name.includes('vinodh');
}

