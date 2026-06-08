import { z } from 'zod';

const MAX_AVATAR_DATA_URL_LENGTH = 1_000_000;
const MAX_AVATAR_REMOTE_URL_LENGTH = 2048;

function isSupportedAvatarValue(value: string) {
  if (value === '') {
    return true;
  }

  if (value.startsWith('data:')) {
    return value.length <= MAX_AVATAR_DATA_URL_LENGTH && /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=\r\n]+$/i.test(value);
  }

  if (value.length > MAX_AVATAR_REMOTE_URL_LENGTH || !z.url().safeParse(value).success) {
    return false;
  }

  return value.toLowerCase().startsWith('https://');
}

export const nicknameSchema = z.string().trim().min(2, 'Nickname is too short').max(32, 'Nickname is too long');

export const profileSchema = z.object({
  nickname: nicknameSchema,
  avatarUrl: z.string().trim().refine(isSupportedAvatarValue, 'Avatar must be a valid image'),
  favoriteRoleIds: z.array(z.string()).max(3, 'Choose no more than 3 favorite roles'),
  dislikedRoleIds: z.array(z.string()).max(3, 'Choose no more than 3 disliked roles'),
}).refine((value) => value.favoriteRoleIds.every((roleId) => !value.dislikedRoleIds.includes(roleId)), {
  message: 'Favorite and disliked roles must be different',
  path: ['dislikedRoleIds'],
});
