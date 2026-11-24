import { z } from 'zod';

// Simulated top-up packs in integer paise: Rs 10 / 20 / 50 / 100.
export const TOPUP_PACKS_PAISE = [1000, 2000, 5000, 10000];

export const topupSchema = z.object({
  amountPaise: z
    .number()
    .int('amountPaise must be an integer')
    .refine((value) => TOPUP_PACKS_PAISE.includes(value), {
      message: 'amountPaise must be one of 1000, 2000, 5000, 10000',
    }),
  idempotencyKey: z
    .string()
    .min(8, 'idempotencyKey must be at least 8 characters')
    .max(100, 'idempotencyKey cannot exceed 100 characters')
    .trim(),
});

export const txnsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});