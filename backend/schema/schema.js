import { z } from 'zod';

export const subscribeSchema = z.object({
  sessionToken: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  notificationsEnabled: z.boolean()
});

export const updateSchema = z.object({
  sessionToken: z.string().min(1),
  notificationsEnabled: z.boolean().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional()
});

export const deleteSchema = z.object({
  sessionToken: z.string().min(1)
});
