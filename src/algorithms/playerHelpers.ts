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

export function isAshok(player: Player): boolean {
  const name = player.name.toLowerCase().trim();
  return player.id === 'p-ashok' || name.includes('ashok');
}

export function isRanjit(player: Player): boolean {
  const name = player.name.toLowerCase().trim();
  return player.id === 'p-ranjit' || name.includes('ranjit') || name.includes('ranjith');
}

export function isRajarao(player: Player): boolean {
  const name = player.name.toLowerCase().trim();
  return player.id === 'p-rajarao' || name.includes('rajarao') || name.includes('raja rao');
}

/**
 * LK Sir, Ranjit Sir, Shiva Sir, Rajarao Sir, Ashok Sir are average/support players.
 * They must NEVER all be placed in the same team with no proper batsmen or strike bowlers.
 */
export function isSupportClusterPlayer(player: Player): boolean {
  return isLK(player) || isRanjit(player) || isShiva(player) || isRajarao(player) || isAshok(player);
}

