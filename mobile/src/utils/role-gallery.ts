import type { PlayerRole, RoleCatalogItem, RoleVariant } from '@/utils/api';

export type RoleArtworkSpec = {
  top: string;
  bottom: string;
  glow: string;
  line: string;
  symbol: string;
  highlight: string;
  mist: string;
};

const ROLE_ORDER = [
  'MAFIA:DEFAULT',
  'NINJA:DEFAULT',
  'INTRIGUER:DEFAULT',
  'MANIAC:MANIAC_MAFIA',
  'CITIZEN:DEFAULT',
  'BODYGUARD:DEFAULT',
  'COMMISSIONER:DEFAULT',
  'SHERIFF:DEFAULT',
  'JOURNALIST:JOURNALIST_ROLE_REVEAL',
  'JOURNALIST:JOURNALIST_VISITOR_REPORT',
  'PROSTITUTE:PROSTITUTE_BLOCK_NIGHT',
  'PROSTITUTE:PROSTITUTE_MUTE_AND_VOTE_SHIELD',
  'PLAGUE_DOCTOR:DEFAULT',
  'MANIAC:MANIAC_NEUTRAL',
] as const;

const ROLE_ARTWORK: Record<string, RoleArtworkSpec> = {
  'MAFIA:DEFAULT': {
    top: '#26151a',
    bottom: '#5a2020',
    glow: '#d65a5a',
    line: '#f5d6c7',
    symbol: 'crown',
    highlight: '#f4b38d',
    mist: 'rgba(214, 90, 90, 0.20)',
  },
  'NINJA:DEFAULT': {
    top: '#111622',
    bottom: '#203756',
    glow: '#88d2ff',
    line: '#dff5ff',
    symbol: 'shuriken',
    highlight: '#a8dcff',
    mist: 'rgba(76, 144, 217, 0.24)',
  },
  'INTRIGUER:DEFAULT': {
    top: '#1d1326',
    bottom: '#57306a',
    glow: '#d395ff',
    line: '#f7e6ff',
    symbol: 'eye',
    highlight: '#e3b4ff',
    mist: 'rgba(156, 92, 214, 0.24)',
  },
  'MANIAC:MANIAC_MAFIA': {
    top: '#221516',
    bottom: '#7a2c20',
    glow: '#ff8f66',
    line: '#fff0dd',
    symbol: 'blade',
    highlight: '#ffc38a',
    mist: 'rgba(255, 143, 102, 0.24)',
  },
  'CITIZEN:DEFAULT': {
    top: '#17304d',
    bottom: '#5683ab',
    glow: '#f6d07d',
    line: '#f8f3e6',
    symbol: 'lantern',
    highlight: '#f0d89a',
    mist: 'rgba(240, 216, 154, 0.20)',
  },
  'BODYGUARD:DEFAULT': {
    top: '#143032',
    bottom: '#286f68',
    glow: '#9ef0cf',
    line: '#e9fff6',
    symbol: 'shield',
    highlight: '#bdf6de',
    mist: 'rgba(79, 176, 142, 0.22)',
  },
  'COMMISSIONER:DEFAULT': {
    top: '#2a2230',
    bottom: '#65557e',
    glow: '#ffd479',
    line: '#fff4d8',
    symbol: 'badge',
    highlight: '#ffe0a6',
    mist: 'rgba(255, 212, 121, 0.24)',
  },
  'SHERIFF:DEFAULT': {
    top: '#2e2416',
    bottom: '#7d5c2e',
    glow: '#ffd277',
    line: '#fff2d5',
    symbol: 'star',
    highlight: '#ffe4a5',
    mist: 'rgba(255, 210, 119, 0.22)',
  },
  'JOURNALIST:JOURNALIST_ROLE_REVEAL': {
    top: '#162c37',
    bottom: '#42748c',
    glow: '#c9f3ff',
    line: '#effdff',
    symbol: 'newspaper',
    highlight: '#dff8ff',
    mist: 'rgba(201, 243, 255, 0.20)',
  },
  'JOURNALIST:JOURNALIST_VISITOR_REPORT': {
    top: '#1a2536',
    bottom: '#4f6388',
    glow: '#8fd9ff',
    line: '#eefaff',
    symbol: 'tracks',
    highlight: '#b4ebff',
    mist: 'rgba(143, 217, 255, 0.20)',
  },
  'PROSTITUTE:PROSTITUTE_BLOCK_NIGHT': {
    top: '#2b1826',
    bottom: '#87456c',
    glow: '#ffb6d8',
    line: '#fff0f7',
    symbol: 'mask',
    highlight: '#ffd1e4',
    mist: 'rgba(255, 182, 216, 0.22)',
  },
  'PROSTITUTE:PROSTITUTE_MUTE_AND_VOTE_SHIELD': {
    top: '#24151f',
    bottom: '#6e3956',
    glow: '#ffc7de',
    line: '#fff4f8',
    symbol: 'veil',
    highlight: '#ffd7e8',
    mist: 'rgba(255, 199, 222, 0.22)',
  },
  'PLAGUE_DOCTOR:DEFAULT': {
    top: '#1f2518',
    bottom: '#5e6c3e',
    glow: '#d9f79b',
    line: '#f8ffe8',
    symbol: 'beak',
    highlight: '#ecffb3',
    mist: 'rgba(217, 247, 155, 0.22)',
  },
  'MANIAC:MANIAC_NEUTRAL': {
    top: '#20182f',
    bottom: '#4e3f88',
    glow: '#b9b2ff',
    line: '#f1eeff',
    symbol: 'crescent-blade',
    highlight: '#d6d0ff',
    mist: 'rgba(185, 178, 255, 0.22)',
  },
};

export function roleCatalogId(role: PlayerRole, variant: RoleVariant | null | undefined) {
  return `${role}:${variant ?? 'DEFAULT'}`;
}

export function mergeRoleCatalog(mafiaRoles: RoleCatalogItem[], townRoles: RoleCatalogItem[]) {
  const orderMap = new Map<string, number>(ROLE_ORDER.map((id, index) => [id, index]));

  return [...mafiaRoles, ...townRoles].sort((left, right) => {
    const leftOrder = orderMap.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = orderMap.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

export function findRoleCatalogItem(
  items: RoleCatalogItem[],
  role: PlayerRole | null,
  variant: RoleVariant | null,
) {
  if (!role) {
    return null;
  }

  const targetId = roleCatalogId(role, variant);
  return items.find((item) => item.id === targetId) ?? null;
}

export function roleArtworkSpec(item: Pick<RoleCatalogItem, 'id'>): RoleArtworkSpec {
  return ROLE_ARTWORK[item.id] ?? ROLE_ARTWORK['CITIZEN:DEFAULT'];
}

export function roleFactionLabel(faction: RoleCatalogItem['faction'], t?: (key: string) => string) {
  if (faction === 'MAFIA') {
    return t?.('roles.nightFaction') ?? 'Night faction';
  }
  if (faction === 'NEUTRAL') {
    return t?.('roles.independentFaction') ?? 'Independent faction';
  }
  return t?.('roles.townFaction') ?? 'Town faction';
}
