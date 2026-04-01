import { z } from 'zod';

export const profileSchema = z.object({
  nickname: z.string().trim().min(2, 'Nickname is too short').max(32),
  avatarUrl: z.union([z.url('Avatar URL must be valid'), z.literal('')]),
});
