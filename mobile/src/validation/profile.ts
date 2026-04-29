import { z } from 'zod';

function isSupportedAvatarValue(value: string) {
  if (value === '') {
    return true;
  }

  return z.url().safeParse(value).success || /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
}

export const profileSchema = z.object({
  nickname: z.string().trim().min(2, 'Nickname is too short').max(32),
  avatarUrl: z.string().trim().refine(isSupportedAvatarValue, 'Avatar must be a valid image'),
  favoriteRoleIds: z.array(z.string()).max(3, 'Choose no more than 3 favorite roles'),
  dislikedRoleIds: z.array(z.string()).max(3, 'Choose no more than 3 disliked roles'),
}).refine((value) => value.favoriteRoleIds.every((roleId) => !value.dislikedRoleIds.includes(roleId)), {
  message: 'Favorite and disliked roles must be different',
  path: ['dislikedRoleIds'],
});
