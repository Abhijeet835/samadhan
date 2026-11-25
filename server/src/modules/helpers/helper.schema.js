import { z } from 'zod';

import { LOCAL_CATEGORIES, SEARCH_RADII_KM } from './helper.constants.js';

const phoneRegex = /^[6-9]\d{9}$/;

const serviceLocationSchema = z.object({
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  address: z.string().max(300).optional().default(''),
  city: z.string().max(100).optional().default(''),
  state: z.string().max(100).optional().default(''),
  pincode: z.string().regex(/^\d{6}$/).optional().or(z.literal('')).default(''),
});

export const registerHelperSchema = z.object({
  displayName: z.string().min(2).max(80).trim(),
  phone: z.string().regex(phoneRegex, 'Valid 10-digit Indian mobile required'),
  categories: z.array(z.enum(LOCAL_CATEGORIES)).min(1).max(4),
  experienceYears: z.coerce.number().int().min(0).max(60).optional().default(0),
  bio: z.string().min(20).max(600).trim(),
  priceHint: z.string().max(80).trim().optional().default(''),
  serviceLocation: serviceLocationSchema,
  radiusKm: z.coerce.number().int().min(1).max(25).optional().default(5),
  photoUrl: z.string().url().optional().or(z.literal('')).default(''),
});

export const updateHelperSchema = registerHelperSchema.partial().extend({
  isAvailable: z.boolean().optional(),
});

export const searchQuerySchema = z.object({
  category: z.enum(LOCAL_CATEGORIES).optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().int().refine((v) => SEARCH_RADII_KM.includes(v), 'radiusKm must be 2, 5 or 10').optional().default(5),
  sort: z.enum(['nearest', 'rating']).optional().default('nearest'),
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
  category: z.enum(LOCAL_CATEGORIES).optional(),
});

export const adminHelperPatchSchema = z.object({
  verificationStatus: z.enum(['VERIFIED', 'REJECTED']).optional(),
  rejectionReason: z.string().max(300).trim().optional(),
  isHidden: z.boolean().optional(),
});
