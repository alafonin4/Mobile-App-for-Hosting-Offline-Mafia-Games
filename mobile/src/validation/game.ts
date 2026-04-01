import { z } from 'zod';

export const createRoomSchema = z.object({
  name: z.string().trim().max(64).optional(),
  playerCount: z.number().int().min(4).max(20),
});

export const joinRoomSchema = z.object({
  roomId: z.string().trim().min(1, 'Room code is required'),
});
