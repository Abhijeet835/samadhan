import { z } from 'zod';

import {
  ALL_ACCEPTED_LOCAL_CATEGORIES,
  SEARCH_RADII_KM,
  normalizeLocalCategory,
} from './helper.constants.js';
import { normalizeIndianState } from '../../constants/indiaLocations.js';

const phoneRegex = /^[6-9]\d{9}$/;

const categoryField = z
  .enum(ALL_ACCEPTED_LOCAL_CATEGORIES)
  .transform(normalizeLocalCategory);

const serviceLocationSchema = z.object({
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  address: z.string().max(300).optional().default(''),
  city: z.string().max(100).optional().default(''),
  state: z.string().max(100).optional().default('').transform(normalizeIndianState),
  pincode: z.string().regex(/^\d{6}$/).optional().or(z.literal('')).default(''),
});

export const registerHelperSchema = z.object({
  displayName: z.string().min(2).max(80).trim(),
  phone: z.string().regex(phoneRegex, 'Valid 10-digit Indian mobile required'),
  categories: z.array(categoryField).min(1).max(4).transform((arr) => [...new Set(arr)]),
  experienceYears: z.coerce.number().int().min(0).max(60).optional().default(0),
  bio: z.string().min(20).max(600).trim(),
  priceHint: z.string().max(80).trim().optional().default(''),
  basePricePaise: z.coerce.number().int().min(100).max(5000000).optional().default(29900),
  serviceLocation: serviceLocationSchema,
  radiusKm: z.coerce.number().int().min(1).max(25).optional().default(5),
  photoUrl: z.string().url().optional().or(z.literal('')).default(''),
});

export const updateHelperSchema = registerHelperSchema.partial().extend({
  isAvailable: z.boolean().optional(),
});

export const searchQuerySchema = z.object({
  category: categoryField.optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  q: z.string().max(100).optional(),
  radiusKm: z.coerce
    .number()
    .int()
    .refine((v) => SEARCH_RADII_KM.includes(v), 'radiusKm must be 2, 5, 10 or 25')
    .optional()
    .default(5),
  sort: z.enum(['nearest', 'rating', 'price_asc', 'price_desc', 'bookings']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).trim().optional().default(''),
});

export const flagSchema = z.object({
  reason: z.string().min(5).max(300).trim(),
});

export const helperIdParamSchema = z.object({
  helperId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid helper id'),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export const adminHelperQuerySchema = paginationQuerySchema.extend({
  verificationStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
  isHidden: z.enum(['true', 'false']).optional(),
  category: categoryField.optional(),
});

export const adminHelperPatchSchema = z.object({
  verificationStatus: z.enum(['VERIFIED', 'REJECTED']).optional(),
  rejectionReason: z.string().max(300).trim().optional(),
  isHidden: z.boolean().optional(),
});
