import { type RoleCatalogItem, type RoleSlot } from '@/utils/api';

export function sumCounts(items: RoleCatalogItem[], counts: Record<string, number>) {
  return items.reduce((total, item) => total + (counts[item.id] ?? 0), 0);
}

export function fillRoleSlots(target: RoleSlot[], item: RoleCatalogItem, count: number) {
  for (let index = 0; index < count; index += 1) {
    target.push({ role: item.role, variant: item.variant });
  }
}

export function roleFaction(role: RoleSlot, mafiaRoles: RoleCatalogItem[], townRoles: RoleCatalogItem[]) {
  const item = [...mafiaRoles, ...townRoles].find(
    (candidate) => candidate.role === role.role && candidate.variant === role.variant,
  );
  return item?.faction ?? 'TOWN';
}

export function buildRoomRoles(
  playerCount: number,
  mafiaRoles: RoleCatalogItem[],
  townRoles: RoleCatalogItem[],
  counts: Record<string, number>,
) {
  const mafiaLimit = Math.floor(playerCount / 3);
  const roles: RoleSlot[] = [];
  mafiaRoles.forEach((item) => fillRoleSlots(roles, item, counts[item.id] ?? 0));
  townRoles.forEach((item) => fillRoleSlots(roles, item, counts[item.id] ?? 0));

  const defaultMafia = mafiaRoles.find((item) => item.defaultFillRole);
  const defaultTown = townRoles.find((item) => item.defaultFillRole);

  if (!defaultMafia || !defaultTown) {
    throw new Error('Default roles were not returned by the backend');
  }

  while (roles.filter((role) => roleFaction(role, mafiaRoles, townRoles) === 'MAFIA').length < mafiaLimit) {
    roles.push({ role: defaultMafia.role, variant: defaultMafia.variant });
  }

  while (roles.length < playerCount) {
    roles.push({ role: defaultTown.role, variant: defaultTown.variant });
  }

  return roles;
}
