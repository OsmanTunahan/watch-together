import { z } from 'zod';

/**
 * Validation schemas for the application
 * Centralizes all validation logic for better maintainability
 */

// Login validation schema
export const loginValidation = z.object({
  author: z.string().max(1000),
  room: z
    .string()
    .trim()
    .min(2, { message: 'Room name must be at least 2 characters' })
    .max(32, { message: 'Room name must be at most 32 characters' }),
  password: z
    .string()
    .trim()
    .min(2, { message: 'Room password must be at least 2 characters' })
    .max(32, { message: 'Room password must be at most 32 characters' }),
  anime: z.object({
    slug: z.string().min(1).max(500),
    season: z.number().int(),
    episode: z.number().int(),
  }),
});

// Message validation schema
export const messageValidation = z.object({
  message: z
    .string()
    .trim()
    .min(1, { message: 'Message cannot be empty' })
    .max(250, { message: 'Message must be at most 250 characters' }),
});

// Player state validation schema
export const playerStateValidation = z.object({
  playing: z.boolean(),
});

// Player timestamp validation schema
export const playerTimestampValidation = z.object({
  timestamp: z.number().min(0),
});

// Moderation target validation schema
export const moderationTargetValidation = z.object({
  target: z.string().min(1),
});

// Mod control validation schema
export const modControlValidation = z.object({
  enabled: z.boolean(),
});